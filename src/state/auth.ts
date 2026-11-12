/**
 * This device's sign-in — WEBSITE-SPEC §14.3 (APP-10, MESSAGE-75).
 *
 * The sign-in itself is an HttpOnly cookie the page's script can't read; the
 * Worker (`worker/app.ts`) sets it, renews it and ends it. What the page keeps
 * is one flag, so it can say "signed in" before the Worker has answered and
 * while it's offline. The flag is never trusted: the first answer from the
 * Worker replaces it, and a 401 from the sync clears it.
 *
 * `fetch` and the two WebAuthn calls are passed in, so every path here is
 * tested in Node (`tests/auth.test.ts`).
 */

import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser';
import type { StorageLike } from './storage';

export const SIGNED_IN_KEY = 'biga-calculator:signed-in:v1';

export function loadSignedIn(storage: StorageLike | null): boolean {
  try {
    return storage?.getItem(SIGNED_IN_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveSignedIn(storage: StorageLike | null, signedIn: boolean): void {
  if (!storage) return;
  try {
    if (signedIn) storage.setItem(SIGNED_IN_KEY, '1');
    else storage.removeItem?.(SIGNED_IN_KEY);
  } catch {
    // The flag just won't survive a reload; the Worker's answer decides anyway.
  }
}

/** The slice of `fetch` the sign-in uses. */
export type AuthFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string; cache?: 'no-store' },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; headers?: { get(name: string): string | null } }>;

export interface WebAuthnCalls {
  startRegistration(args: { optionsJSON: PublicKeyCredentialCreationOptionsJSON }): Promise<RegistrationResponseJSON>;
  startAuthentication(args: { optionsJSON: PublicKeyCredentialRequestOptionsJSON }): Promise<AuthenticationResponseJSON>;
}

export type AuthOutcome = { ok: true } | { ok: false; message: string };

/** §14.3's rendered copy for what can go wrong, in the order a baker meets it. */
export const AUTH_MESSAGES = {
  offline: "Couldn't reach the app's server. Check the connection and try again.",
  noPasskeys: "This browser can't use passkeys.",
  cancelled: 'The passkey request was cancelled or timed out.',
  alreadyHere: 'This device already has a passkey for this app. Sign in instead.',
  wrongCode: "That setup code isn't right.",
  noSetupCode: "The app's server has no setup code set, so it can't make a passkey.",
  unknownPasskey: "The app's server doesn't know that passkey. Create one with the setup code.",
  refused: "The app's server didn't accept that passkey.",
  signOutFailed: "Couldn't reach the app's server, so this device is still signed in.",
  /** At the limit: the wait comes from the Worker's Retry-After, in minutes. */
  tooManyTries: (minutes: number) =>
    `Too many wrong setup codes. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`,
} as const;

async function post(fetchFn: AuthFetch, url: string, body?: unknown) {
  return fetchFn(url, {
    method: 'POST',
    cache: 'no-store',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

async function errorCode(res: { json(): Promise<unknown> }): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    return typeof body.error === 'string' ? body.error : '';
  } catch {
    return '';
  }
}

/** What a failed WebAuthn call in the browser means for the baker. */
function browserFailure(e: unknown): AuthOutcome {
  const name = e instanceof Error ? e.name : '';
  if (name === 'InvalidStateError') return { ok: false, message: AUTH_MESSAGES.alreadyHere };
  if (name === 'NotSupportedError' || name === 'SecurityError') return { ok: false, message: AUTH_MESSAGES.noPasskeys };
  if (e instanceof Error && /does not support WebAuthn/i.test(e.message)) {
    return { ok: false, message: AUTH_MESSAGES.noPasskeys };
  }
  return { ok: false, message: AUTH_MESSAGES.cancelled };
}

/** The server's answer to a verify call. */
async function verifyOutcome(res: Awaited<ReturnType<AuthFetch>>): Promise<AuthOutcome> {
  if (res.ok) return { ok: true };
  const code = await errorCode(res);
  if (code === 'unknown_passkey') return { ok: false, message: AUTH_MESSAGES.unknownPasskey };
  return { ok: false, message: AUTH_MESSAGES.refused };
}

/**
 * Whether the Worker counts this device as signed in: true or false from its
 * answer, null when it couldn't be asked (offline, or no Worker at all, as
 * under `npm run dev`).
 */
export async function checkSession(fetchFn: AuthFetch): Promise<boolean | null> {
  try {
    const res = await fetchFn('/api/session', { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const body = (await res.json()) as { signedIn?: unknown };
    return typeof body.signedIn === 'boolean' ? body.signedIn : null;
  } catch {
    return null;
  }
}

/** §14.3 Sign in: asks for the passkey and nothing else. */
export async function signInWithPasskey(fetchFn: AuthFetch, webauthn: WebAuthnCalls): Promise<AuthOutcome> {
  let options;
  try {
    const res = await post(fetchFn, '/api/passkey/login/options');
    if (!res.ok) return { ok: false, message: AUTH_MESSAGES.offline };
    options = (await res.json()) as PublicKeyCredentialRequestOptionsJSON;
  } catch {
    return { ok: false, message: AUTH_MESSAGES.offline };
  }
  let response;
  try {
    response = await webauthn.startAuthentication({ optionsJSON: options });
  } catch (e) {
    return browserFailure(e);
  }
  try {
    return await verifyOutcome(await post(fetchFn, '/api/passkey/login/verify', { response }));
  } catch {
    return { ok: false, message: AUTH_MESSAGES.offline };
  }
}

/** §14.3 Create a passkey: the setup code first, then the passkey. Signs this device in. */
export async function createPasskey(
  fetchFn: AuthFetch,
  webauthn: WebAuthnCalls,
  setupCode: string,
): Promise<AuthOutcome> {
  let options;
  try {
    const res = await post(fetchFn, '/api/passkey/register/options', { setupCode });
    if (res.status === 403) return { ok: false, message: AUTH_MESSAGES.wrongCode };
    if (res.status === 429) {
      const seconds = Number(res.headers?.get('Retry-After') ?? '');
      const minutes = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds / 60) : 10;
      return { ok: false, message: AUTH_MESSAGES.tooManyTries(minutes) };
    }
    if (res.status === 503) return { ok: false, message: AUTH_MESSAGES.noSetupCode };
    if (!res.ok) return { ok: false, message: AUTH_MESSAGES.offline };
    options = (await res.json()) as PublicKeyCredentialCreationOptionsJSON;
  } catch {
    return { ok: false, message: AUTH_MESSAGES.offline };
  }
  let response;
  try {
    response = await webauthn.startRegistration({ optionsJSON: options });
  } catch (e) {
    return browserFailure(e);
  }
  try {
    return await verifyOutcome(await post(fetchFn, '/api/passkey/register/verify', { response }));
  } catch {
    return { ok: false, message: AUTH_MESSAGES.offline };
  }
}

/**
 * §14.3 Sign out: ends the session on the Worker, which also clears the
 * cookie. The page can't clear an HttpOnly cookie itself, so without an
 * answer this device stays signed in, and says so.
 */
export async function signOutOfWorker(fetchFn: AuthFetch): Promise<AuthOutcome> {
  try {
    const res = await post(fetchFn, '/api/sign-out');
    return res.ok ? { ok: true } : { ok: false, message: AUTH_MESSAGES.signOutFailed };
  } catch {
    return { ok: false, message: AUTH_MESSAGES.signOutFailed };
  }
}
