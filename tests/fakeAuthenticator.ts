/**
 * A software passkey for the Worker's tests (§14.3): it makes and uses an
 * ES256 key the way a platform authenticator does, attestation "none", user
 * verified, so `@simplewebauthn/server` checks real signatures. WebKit can't
 * make a passkey in the suite, and this is how the sign-in is tested instead.
 */

import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { isoBase64URL, isoCBOR } from '@simplewebauthn/server/helpers';

const UP = 0x01;
const UV = 0x04;
const AT = 0x40;

async function sha256(bytes: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>));
}

const utf8 = (s: string) => new TextEncoder().encode(s);

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function u32(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

/** WebCrypto signs ECDSA as r‖s; WebAuthn carries it as DER. */
function derSignature(raw: Uint8Array): Uint8Array {
  const int = (b: Uint8Array) => {
    let i = 0;
    while (i < b.length - 1 && b[i] === 0) i++;
    let v = b.slice(i);
    if (v[0]! & 0x80) v = concat(new Uint8Array([0]), v);
    return concat(new Uint8Array([0x02, v.length]), v);
  };
  const body = concat(int(raw.slice(0, 32)), int(raw.slice(32)));
  return concat(new Uint8Array([0x30, body.length]), body);
}

const b64u = (bytes: Uint8Array) => isoBase64URL.fromBuffer(bytes as Uint8Array<ArrayBuffer>);

export class FakeAuthenticator {
  private keys: CryptoKeyPair | null = null;
  readonly credentialId = crypto.getRandomValues(new Uint8Array(16));
  private counter = 0;
  private userHandle = new Uint8Array();
  /** Set false to answer as an authenticator that skipped user verification. */
  verifiesUser = true;

  get id(): string {
    return b64u(this.credentialId);
  }

  private flags(extra = 0) {
    return UP | (this.verifiesUser ? UV : 0) | extra;
  }

  async create(options: PublicKeyCredentialCreationOptionsJSON, origin: string): Promise<RegistrationResponseJSON> {
    this.keys = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair;
    this.userHandle = isoBase64URL.toBuffer(options.user.id);
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', this.keys.publicKey));
    const coseKey = isoCBOR.encode(
      new Map<number, number | Uint8Array>([
        [1, 2],
        [3, -7],
        [-1, 1],
        [-2, raw.slice(1, 33)],
        [-3, raw.slice(33, 65)],
      ]) as never,
    );
    const authData = concat(
      await sha256(utf8(options.rp.id!)),
      new Uint8Array([this.flags(AT)]),
      u32(this.counter),
      new Uint8Array(16),
      new Uint8Array([0, this.credentialId.length]),
      this.credentialId,
      coseKey,
    );
    const clientDataJSON = utf8(
      JSON.stringify({ type: 'webauthn.create', challenge: options.challenge, origin, crossOrigin: false }),
    );
    const attestationObject = isoCBOR.encode(
      new Map<string, unknown>([
        ['fmt', 'none'],
        ['attStmt', new Map()],
        ['authData', authData],
      ]) as never,
    );
    return {
      id: this.id,
      rawId: this.id,
      type: 'public-key',
      response: {
        clientDataJSON: b64u(clientDataJSON),
        attestationObject: b64u(attestationObject),
        transports: ['internal'],
      },
      clientExtensionResults: {},
    };
  }

  /**
   * Answers a sign-in. `rpID` and `origin` default to the ones the request
   * names; a test passes others to answer as a page somewhere else would.
   */
  async get(
    options: PublicKeyCredentialRequestOptionsJSON,
    origin: string,
    rpID: string = options.rpId!,
  ): Promise<AuthenticationResponseJSON> {
    if (!this.keys) throw new Error('No passkey made yet');
    this.counter += 1;
    const authData = concat(await sha256(utf8(rpID)), new Uint8Array([this.flags()]), u32(this.counter));
    const clientDataJSON = utf8(
      JSON.stringify({ type: 'webauthn.get', challenge: options.challenge, origin, crossOrigin: false }),
    );
    const signed = concat(authData, await sha256(clientDataJSON));
    const raw = new Uint8Array(
      await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, this.keys.privateKey, signed as Uint8Array<ArrayBuffer>),
    );
    return {
      id: this.id,
      rawId: this.id,
      type: 'public-key',
      response: {
        clientDataJSON: b64u(clientDataJSON),
        authenticatorData: b64u(authData),
        signature: b64u(derSignature(raw)),
        userHandle: b64u(this.userHandle),
      },
      clientExtensionResults: {},
    };
  }
}
