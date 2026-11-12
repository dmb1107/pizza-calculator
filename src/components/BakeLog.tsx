import { useState, type ReactNode } from 'react';
import { Badge, NumberField, ToggleField } from './fields';
import {
  MIX_PHASES,
  type MixPhase,
  bakeFrictionFactorF,
  bakeMixSize,
  ffInUse,
  frictionBadge,
  mixSizeValue,
  mixStatus,
  roomSlope,
  sizeHistories,
  type LoggedBake,
  type LoggedMix,
  type NotCountedReason,
  type PhaseKey,
} from '../lib/bakeLog';
import { formatBallsPerMix, formatCoefficient, formatTempF, formatWholeMinutes } from '../lib/format';
import { describeSpec, formatElapsed } from '../lib/timers';
import { formatTimeOfDay } from '../lib/timeline';
import { BOUNDS } from '../state/defaults';
import { runningPhases } from '../state/sessionBake';
import { STEPS } from '../content/steps';
import type { AppState, SyncState } from '../state/useAppState';
import type { ToppingsState } from '../state/useToppings';

/**
 * The bake log — WEBSITE-SPEC-biga-calculator.md §10, with §6 Panel 2's rule
 * for turning it into the FF in use.
 *
 * Captures sit in the steps where each reading is taken: the poured water in
 * Phase A, the final temperature at the end of each mix. The card after the
 * last mix shows what the log will record and saves it. The Bake log tab
 * (§13.1) holds the history, Dave's switch for each mix, and this device's
 * sign-in (§14.3), which the topping ideas' sync shares (§13.3).
 */

const REASON: Record<NotCountedReason, string> = {
  final: 'no final dough temperature',
  // Only a bake saved before MESSAGE-56, when the water poured was typed.
  water: 'no water reading',
  waterRange: 'the water target was out of blending range',
  bowl: 'the bowl is a prefill, not a reading',
  phases: 'a phase time is missing',
  formula: 'mixed under another formula or other speeds',
  excluded: 'you left it out',
};

/** Where the bowl is read (§6): the prep step, by its title rather than a copy of it. */
const PREP_STEP_TITLE = STEPS.find((s) => s.id === 'mix-1')!.title;

/** A temperature that may be absent, as the card and the log print it. */
const tempOrDash = (t: number | null) => (t == null ? '–' : `${formatTempF(t)} °F`);

const phaseName = (k: PhaseKey) => `Phase ${k.toUpperCase()}`;

const buttonClass =
  'min-h-touch rounded-lg border border-stone-300 px-4 font-medium active:bg-stone-100 dark:border-stone-600 dark:active:bg-stone-800';
const smallButtonClass =
  'min-h-touch shrink-0 self-start rounded-lg border border-stone-300 px-3 text-sm font-medium active:bg-stone-100 dark:border-stone-600 dark:active:bg-stone-800';

// ---------------------------------------------------------------------------
// Captures in the steps
// ---------------------------------------------------------------------------

/**
 * The end of each mix: its final dough temperature. §4.8 times each dough's
 * ball rise from its own reading, a dough not yet read planning at DDT
 * (MESSAGE-61), and the log solves each mix's FF from its own reading.
 */
export function FinalTempCapture({ state, mixIndex }: { state: AppState; mixIndex: number }) {
  const { inputs, result, commitReading, clearReading } = state;
  const i = mixIndex - 1;
  const measured = inputs.finalDoughTempF[i] ?? null;
  const many = result.capacity.nMix > 1;
  // This dough's own rise (§4.8, MESSAGE-61).
  const rise = formatWholeMinutes(result.roomMinutesByDough[i]!);
  const last = mixIndex === result.capacity.nMix;

  let hint: string;
  if (!many) {
    hint =
      measured === null
        ? `Not measured yet — planning at DDT ${formatTempF(result.ddtF)} °F, which gives ${rise} min at room temperature.`
        : `The balls now get ${rise} min at room temperature, adjusted for this reading. Every later stage moves with it.`;
  } else {
    // The timeline runs from the last dough, so only its reading moves the
    // later stages; an earlier dough's moves its own times beside them.
    hint =
      measured === null
        ? `Not measured yet — dough ${mixIndex} plans at DDT ${formatTempF(result.ddtF)} °F, which gives ${rise} min at room temperature.`
        : `Dough ${mixIndex}'s balls now get ${rise} min at room temperature, adjusted for this reading. ${
            last ? 'Every later stage moves with it.' : 'Its times beside the timeline move with it.'
          }`;
  }

  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
      <NumberField
        label={many ? `Final dough temperature — mix ${mixIndex}` : 'Final dough temperature'}
        unit="°F"
        value={measured ?? result.ddtF}
        onCommit={(v) => commitReading('finalDoughTempF', v, i)}
        // §6 (MESSAGE-58): a dough finished on DDT is a reading of DDT.
        recordsReading
        min={BOUNDS.finalDoughTempF.min}
        max={BOUNDS.finalDoughTempF.max}
        step={BOUNDS.finalDoughTempF.step}
        hint={hint}
      />
      {measured !== null && (
        <button
          type="button"
          onClick={() => clearReading('finalDoughTempF', i)}
          className="mt-2 min-h-touch text-sm font-medium text-amber-800 underline underline-offset-2 dark:text-amber-400"
        >
          {many ? 'Clear this reading' : 'Clear and plan at DDT'}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The card after the last mix
// ---------------------------------------------------------------------------

function ReadingRow({ label, value, status }: { label: string; value: string; status: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5">
      <span className="min-w-0">
        <span className="text-stone-600 dark:text-stone-400">{label}</span>{' '}
        <span className="font-medium tabular">{value}</span>
      </span>
      {status}
    </li>
  );
}

const Note = ({ children }: { children: ReactNode }) => (
  <span className="text-sm text-amber-900 dark:text-amber-200">{children}</span>
);

/** A phase time beside its printed range (§10), flagged when it falls outside. */
function PhaseRow({ phase, seconds, running }: { phase: MixPhase; seconds: number | null; running: boolean }) {
  const range = describeSpec({ minMinutes: phase.rangeMin[0], maxMinutes: phase.rangeMin[1], isWindow: true });
  const minutes = seconds == null ? null : seconds / 60;
  const outside = minutes != null && (minutes < phase.rangeMin[0] || minutes > phase.rangeMin[1]);
  return (
    <ReadingRow
      label={phaseName(phase.key)}
      value={seconds == null ? '–' : formatElapsed(seconds * 1000)}
      status={
        running ? (
          <Note>Still running: stop it when the phase ends</Note>
        ) : seconds == null ? (
          <Note>No time: start its timer as the phase starts</Note>
        ) : outside ? (
          <Note>{`Outside ${range}`}</Note>
        ) : (
          <span className="text-sm text-stone-600 dark:text-stone-400">{range}</span>
        )
      }
    />
  );
}

/** What the log will record, and the button that saves it (§10). */
export function BakeLogCard({ state, onOpenLog }: { state: AppState; onOpenLog: () => void }) {
  const { sessionDraft: draft, sessionBakeId, saveConflict: conflict, saveSessionBake, log, timers, sync, signedIn } =
    state;
  const saved = !conflict && log.bakes.some((b) => b.bake_id === sessionBakeId);
  const nMix = draft.n_mix;

  return (
    <div className="rounded-xl border border-stone-300 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
      <h4 className="text-lg font-semibold">Log this bake</h4>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
        Saving records every reading below as it stands, defaults included, and each mix&apos;s water target as the
        water used. A mix feeds the friction factor when it has a final dough temperature, its water target is
        inside blending range, its bowl was measured, and all four phase times were captured. The four timers tagged Logged capture them when you stop them or tick the step. A phase run to its cue can fall
        outside its range, and the log corrects for that. If a timer ran on after its phase ended, leave that mix out
        in the bake log.
      </p>

      <ul className="mt-2 divide-y divide-stone-200 dark:divide-stone-800">
        <ReadingRow label="Room" value={`${formatTempF(draft.room_temp_f)} °F`} status={null} />
        {!draft.flour_follows_room && (
          <ReadingRow label="Flour" value={`${formatTempF(draft.flour_temp_f)} °F`} status={null} />
        )}
      </ul>

      {draft.mixes.map((mix) => {
        const status = mixStatus(draft, mix);
        const running = runningPhases(timers, mix.mix_index, nMix);
        return (
          <div key={mix.mix_index} className="mt-3">
            {nMix > 1 && <h5 className="text-sm font-semibold">{`Mix ${mix.mix_index}`}</h5>}
            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
              <ReadingRow label="Biga" value={`${formatTempF(mix.biga_temp_at_mix_f)} °F`} status={null} />
              <ReadingRow
                label="Bowl"
                value={`${formatTempF(mix.bowl_temp_f)} °F`}
                status={mix.bowl_prefilled ? <Note>{`A prefill: read it in “${PREP_STEP_TITLE}”`}</Note> : null}
              />
              {/* §10 (MESSAGE-56): the target, as Save records it. No button. */}
              <ReadingRow label="Water target" value={tempOrDash(mix.water_temp_used_f)} status={null} />
              <ReadingRow
                label="Final dough"
                value={tempOrDash(mix.final_dough_temp_f)}
                status={
                  mix.final_dough_temp_f == null ? (
                    <Note>{nMix > 1 ? `Type it at the end of mix ${mix.mix_index}` : 'Type it at the end of the mix'}</Note>
                  ) : null
                }
              />
              {MIX_PHASES.map((p) => (
                <PhaseRow key={p.key} phase={p} seconds={mix.phase_seconds[p.key]} running={running.includes(p.key)} />
              ))}
            </ul>
            <MixOutcome status={status} />
          </div>
        );
      })}

      {conflict ? (
        // §10: saving over a bake from an earlier date asks first, so a
        // forgotten reset can't overwrite a finished bake. Asked up front,
        // in place of the button, so nothing appears above a tap.
        <div className="mt-3 rounded-lg border border-amber-400 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/40">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            {`The bake from ${conflict.date} is saved already, and the page hasn't been reset since. Save this one as a new bake, or replace that one?`}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => saveSessionBake('new')}
              className="min-h-touch rounded-lg bg-amber-700 px-4 font-medium text-white active:bg-amber-800 dark:bg-amber-600"
            >
              Save as a new bake
            </button>
            <button type="button" onClick={() => saveSessionBake('replace')} className={buttonClass}>
              {`Replace the bake from ${conflict.date}`}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => saveSessionBake('replace')}
            className="min-h-touch rounded-lg bg-amber-700 px-4 font-medium text-white active:bg-amber-800 dark:bg-amber-600"
          >
            {saved ? 'Update the saved bake' : 'Save to the bake log'}
          </button>
          <button type="button" onClick={onOpenLog} className={buttonClass}>
            Open the bake log
          </button>
        </div>
      )}
      {saved && (
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          {signedIn
            ? sync.state === 'error'
              ? `Saved on this device. The sync failed: ${sync.message}`
              : 'Saved. It syncs to your other devices in the background.'
            : 'Saved in this browser. Sign in on the Bake log tab to sync it with your other devices.'}
        </p>
      )}
    </div>
  );
}

function MixOutcome({ status }: { status: ReturnType<typeof mixStatus> }) {
  const why = status.reasons.map((r) => REASON[r]).join('; ');
  if (status.ff == null) return <p className="mt-1 text-sm text-amber-900 dark:text-amber-200">{`Not solved yet: ${why}.`}</p>;
  const solved = `solves to ${formatTempF(status.ff)} °F`;
  const nominal = status.ffNominal == null ? '' : `, ${formatTempF(status.ffNominal)} °F with Phase C at the middle of its range`;
  return status.counted ? (
    <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">{`Counts. This mix ${solved}${nominal}.`}</p>
  ) : (
    <p className="mt-1 text-sm text-amber-900 dark:text-amber-200">{`Won't count: ${why}. It ${solved}${nominal}.`}</p>
  );
}

// ---------------------------------------------------------------------------
// The Bake log tab
// ---------------------------------------------------------------------------

/** §10, §13.1: the log is the Bake log tab. */
export function BakeLogPage({ state, toppings }: { state: AppState; toppings: ToppingsState }) {
  return (
    <div className="grid min-w-0 gap-6">
      <SizesSection state={state} />
      <BakesSection state={state} />
      <SyncSection state={state} toppings={toppings} />
    </div>
  );
}

/**
 * Where one store's sync stands, in a sentence: the log's or the topping
 * ideas' (§13.3), each named, since they sync apart and either can fail alone.
 */
export function syncStatusText(sync: SyncState, waiting: number, lastSyncedAt: string, what: string): string {
  if (sync.state === 'syncing') return `Syncing ${what}…`;
  if (sync.state === 'error') return `Couldn't sync ${what}. ${sync.message}`;
  if (waiting > 0) return `${waiting} ${waiting === 1 ? 'change' : 'changes'} to ${what} waiting to sync.`;
  return `Synced ${what}${lastSyncedAt ? ` at ${formatTimeOfDay(new Date(lastSyncedAt))}` : ''}.`;
}

function SizesSection({ state }: { state: AppState }) {
  const { log, mixSizeKey, friction } = state;
  const histories = sizeHistories(log.bakes).sort((a, b) => mixSizeValue(a.size) - mixSizeValue(b.size));
  return (
    <section className="min-w-0">
      <h3 className="mb-2 text-lg font-semibold">Friction factor by mix size</h3>
      <p className="text-stone-700 dark:text-stone-300">
        {`This batch, ${formatBallsPerMix(mixSizeValue(mixSizeKey))} balls per mix: ${formatTempF(friction.ff)} °F`}{' '}
        <Badge tone={friction.badge.tone}>{friction.badge.text}</Badge>
      </p>
      {histories.length === 0 ? (
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          No counted bakes yet. Until the first, the calculator uses bake 1's figure at every mix size, corrected for
          its long Phase C.
        </p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {histories.map((h) => {
            const inUse = ffInUse(log.bakes, h.size);
            const slope = roomSlope(log.bakes, h.size);
            return (
              <li key={`${h.size.balls}/${h.size.nMix}`} className="rounded-lg border border-stone-200 p-3 dark:border-stone-800">
                <p className="font-medium">
                  {`${formatBallsPerMix(mixSizeValue(h.size))} balls per mix: ${formatTempF(h.ff)} °F`}
                </p>
                <p className="text-sm text-stone-600 dark:text-stone-400">{frictionBadge(inUse).text}</p>
                {slope && (
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                    {`Room slope: ${formatCoefficient(slope.b, 2)} °F of friction factor per °F of room, over ${slope.bakes} bakes from ${formatTempF(slope.roomMinF)} to ${formatTempF(slope.roomMaxF)} °F. Reported only: the calculator doesn't apply it.`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function BakesSection({ state }: { state: AppState }) {
  const bakes = [...state.log.bakes].sort((a, b) => (a.bake_id < b.bake_id ? 1 : -1));
  return (
    <section className="min-w-0">
      <h3 className="mb-2 text-lg font-semibold">Bakes</h3>
      {bakes.length === 0 ? (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Nothing logged yet. Save a bake from the card after the last mix.
        </p>
      ) : (
        <ul className="grid gap-3">
          {bakes.map((bake) => (
            <BakeItem key={bake.bake_id} bake={bake} state={state} />
          ))}
        </ul>
      )}
    </section>
  );
}

function BakeItem({ bake, state }: { bake: LoggedBake; state: AppState }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const ff = bakeFrictionFactorF(bake);
  const pending = state.log.dirty.includes(bake.bake_id);
  return (
    <li className="rounded-lg border border-stone-200 p-3 dark:border-stone-800">
      <p className="font-medium">
        {`${bake.date} · ${bake.balls} × ${bake.ball_g} g · ${formatBallsPerMix(mixSizeValue(bakeMixSize(bake)))} balls per mix`}
      </p>
      <p className="text-sm text-stone-600 dark:text-stone-400">
        {ff == null ? 'No mix counts.' : `Friction factor ${formatTempF(ff)} °F.`}
        {pending && state.signedIn ? ' Waiting to sync.' : ''}
      </p>
      <ul className="mt-2 grid gap-2">
        {bake.mixes.map((mix) => (
          <MixItem key={mix.mix_index} bake={bake} mix={mix} state={state} />
        ))}
      </ul>
      <div className="mt-2 flex min-h-touch flex-wrap items-center gap-3">
        {confirmingDelete ? (
          <>
            <span className="text-sm">Delete this bake from every device?</span>
            <button type="button" onClick={() => state.deleteBake(bake.bake_id)} className={smallButtonClass}>
              Delete
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)} className={smallButtonClass}>
              Keep
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmingDelete(true)} className={smallButtonClass}>
            Delete…
          </button>
        )}
      </div>
    </li>
  );
}

function MixItem({ bake, mix, state }: { bake: LoggedBake; mix: LoggedMix; state: AppState }) {
  const status = mixStatus(bake, mix);
  const times = MIX_PHASES.map((p) => {
    const s = mix.phase_seconds[p.key];
    return `${p.key.toUpperCase()} ${s == null ? '–' : formatElapsed(s * 1000)}`;
  }).join(' · ');
  return (
    <li className="text-sm">
      {bake.n_mix > 1 && <p className="font-medium">{`Mix ${mix.mix_index}`}</p>}
      <p className="text-stone-600 dark:text-stone-400">
        {`Biga ${formatTempF(mix.biga_temp_at_mix_f)} °F · bowl ${formatTempF(mix.bowl_temp_f)} °F${mix.bowl_prefilled ? ' (prefill)' : ''} · water ${tempOrDash(mix.water_temp_used_f)} · final ${tempOrDash(mix.final_dough_temp_f)} · ${times}`}
      </p>
      <MixOutcome status={status} />
      <ToggleField
        label="Leave this mix out"
        checked={mix.excluded}
        onChange={(v) => state.setMixExcluded(bake.bake_id, mix.mix_index, v)}
      />
    </li>
  );
}

/**
 * §14.3: this device's sign-in, where the log and the ideas sync from.
 * Signed out, both stay in this browser. Signing in asks for the passkey and
 * nothing else; creating one asks for the setup code first.
 */
function SyncSection({ state, toppings }: { state: AppState; toppings: ToppingsState }) {
  const { signedIn, signIn, createPasskey, signOut, sync, syncNow, log } = state;
  const [setupCode, setSetupCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const waiting = log.dirty.length + log.deleted.length;

  const run = async (action: () => Promise<{ ok: true } | { ok: false; message: string }>, after?: () => void) => {
    setBusy(true);
    setMessage('');
    const outcome = await action();
    setBusy(false);
    if (outcome.ok) after?.();
    else setMessage(outcome.message);
  };

  return (
    <section className="min-w-0">
      <h3 className="mb-2 text-lg font-semibold">Sync between devices</h3>
      {signedIn ? (
        <>
          <p className="text-stone-700 dark:text-stone-300">
            {syncStatusText(sync, waiting, log.lastSyncedAt, 'the log')}
          </p>
          {/* §13.3: the ideas sync on their own, so their state is their own line. */}
          <p className="mt-1 text-stone-700 dark:text-stone-300">
            {syncStatusText(toppings.sync, toppings.waiting, toppings.store.lastSyncedAt, 'the topping ideas')}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                syncNow();
                toppings.syncNow();
              }}
              className={buttonClass}
            >
              Sync now
            </button>
            <button type="button" disabled={busy} onClick={() => void run(signOut)} className={`${buttonClass} disabled:opacity-50`}>
              Sign out
            </button>
          </div>
        </>
      ) : (
        <div className="grid gap-3">
          <p className="text-stone-700 dark:text-stone-300">
            This device is signed out, so the log and the topping ideas are kept in this browser only. Sign in with
            your passkey to sync them with your other devices.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(signIn)}
            className={`${buttonClass} justify-self-start disabled:opacity-50`}
          >
            Sign in
          </button>
          <form
            className="grid gap-3 border-t border-stone-200 pt-3 dark:border-stone-800"
            onSubmit={(e) => {
              e.preventDefault();
              const code = setupCode;
              void run(() => createPasskey(code), () => setSetupCode(''));
            }}
          >
            <p className="text-sm text-stone-600 dark:text-stone-400">
              No passkey for this app yet? Creating one takes the setup code set in the app's server.
            </p>
            <label className="grid gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
              Setup code
              <input
                type="password"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="min-h-touch rounded-lg border border-stone-300 bg-white px-3 text-base text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
              />
            </label>
            <button
              type="submit"
              disabled={busy || setupCode === ''}
              className={`${buttonClass} justify-self-start disabled:opacity-50`}
            >
              Create a passkey
            </button>
          </form>
        </div>
      )}
      {/* Below the buttons, so nothing moves above the tap. */}
      <p role="status" className="mt-2 min-h-6 text-sm text-stone-700 dark:text-stone-300">
        {busy ? 'Waiting for the passkey…' : message}
      </p>
    </section>
  );
}
