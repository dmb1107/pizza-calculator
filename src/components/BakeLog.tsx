import { useState, type ReactNode } from 'react';
import { Drawer } from './Drawer';
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
import { formatBallsPerMix, formatCoefficient, formatTempF, roundTo } from '../lib/format';
import { describeSpec, formatElapsed } from '../lib/timers';
import { formatTimeOfDay } from '../lib/timeline';
import { BOUNDS } from '../state/defaults';
import { parseRepoName } from '../state/bakeLogStore';
import { runningPhases } from '../state/sessionBake';
import type { AppState } from '../state/useAppState';

/**
 * The bake log — WEBSITE-SPEC-biga-calculator.md §10, with §6 Panel 3's rule
 * for turning it into the FF in use.
 *
 * Captures sit in the steps where each reading is taken: the poured water in
 * Phase A, the final temperature at the end of each mix. The card after the
 * last mix shows what the log will record and saves it. The drawer holds the
 * history, Dave's switch for each mix, and this device's sync settings.
 */

const REASON: Record<NotCountedReason, string> = {
  final: 'no final dough temperature',
  water: 'no water poured',
  bowl: 'the bowl is a prefill, not a reading',
  phases: 'a phase time is missing',
  formula: 'mixed under another formula or other speeds',
  excluded: 'you left it out',
};

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

/** Phase A: the water temperature actually poured, for the log (§10). */
export function WaterPouredCapture({ state, mixIndex }: { state: AppState; mixIndex: number }) {
  const { inputs, result, commitReading, pourAtTarget } = state;
  const i = mixIndex - 1;
  const target = result.mixes[i]?.waterTempF ?? result.waterTempF;
  const poured = inputs.waterUsedF[i] ?? null;
  const many = result.capacity.nMix > 1;

  return (
    <div className="mt-4 rounded-lg border border-stone-300 p-3 dark:border-stone-700">
      <NumberField
        label={many ? `Water temperature poured — mix ${mixIndex}` : 'Water temperature poured'}
        unit="°F"
        value={poured ?? roundTo(target, 1)}
        onCommit={(v) => commitReading('waterUsedF', v, i)}
        min={BOUNDS.waterUsedF.min}
        max={BOUNDS.waterUsedF.max}
        step={BOUNDS.waterUsedF.step}
        // One wording before and after, so nothing above the button moves
        // when it is tapped.
        hint={`Read it in the jug as you pour. The target is ${formatTempF(target)} °F.`}
      />
      {/* The same height either way, so nothing below the tap moves up or down. */}
      <div className="mt-2 flex min-h-touch items-center">
        {poured != null ? (
          <span className="text-sm text-stone-600 dark:text-stone-400">The log records this reading.</span>
        ) : (
          <button type="button" onClick={() => pourAtTarget(i, target)} className={smallButtonClass}>
            Poured at the target
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The end of each mix: its final dough temperature. §4.8 times the ball rise
 * from the mean of the mixes, a mix not yet read counting at DDT, and the log
 * solves each mix's FF from its own reading.
 */
export function FinalTempCapture({ state, mixIndex }: { state: AppState; mixIndex: number }) {
  const { inputs, result, commitReading, clearReading } = state;
  const i = mixIndex - 1;
  const measured = inputs.finalDoughTempF[i] ?? null;
  const many = result.capacity.nMix > 1;
  const rise = Math.round(result.ballRoomMinutes);

  let hint: string;
  if (!many) {
    hint =
      measured === null
        ? `Not measured yet — planning at DDT ${formatTempF(result.ddtF)} °F, which gives ${rise} min at room temperature.`
        : `The balls now get ${rise} min at room temperature, adjusted for this reading. Every later stage moves with it.`;
  } else {
    hint =
      measured === null
        ? `Not measured yet. Until it is, this mix counts at DDT ${formatTempF(result.ddtF)} °F in the average the ball rise is timed from.`
        : `The balls get ${rise} min at room temperature, timed from the average of the mixes, ${formatTempF(result.effectiveFinalTempF)} °F. Every later stage moves with it.`;
  }

  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
      <NumberField
        label={many ? `Final dough temperature — mix ${mixIndex}` : 'Final dough temperature'}
        unit="°F"
        value={measured ?? result.ddtF}
        onCommit={(v) => commitReading('finalDoughTempF', v, i)}
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
  const { sessionDraft: draft, sessionBakeId, saveConflict: conflict, saveSessionBake, pourAtTarget, result, log, timers, sync, github } =
    state;
  const saved = !conflict && log.bakes.some((b) => b.bake_id === sessionBakeId);
  const nMix = draft.n_mix;

  return (
    <div className="rounded-xl border border-stone-300 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
      <h4 className="text-lg font-semibold">Log this bake</h4>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
        Saving records every reading below as it stands, defaults included. A mix feeds the friction factor when it
        has a final dough temperature and a water poured, its bowl was measured, and all four phase times were
        captured. The four timers tagged Logged capture them when you stop them or tick the step. A phase run to its cue can fall
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
        const i = mix.mix_index - 1;
        const status = mixStatus(draft, mix);
        const running = runningPhases(timers, mix.mix_index, nMix);
        const target = result.mixes[i]?.waterTempF ?? result.waterTempF;
        return (
          <div key={mix.mix_index} className="mt-3">
            {nMix > 1 && <h5 className="text-sm font-semibold">{`Mix ${mix.mix_index}`}</h5>}
            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
              <ReadingRow label="Biga" value={`${formatTempF(mix.biga_temp_at_mix_f)} °F`} status={null} />
              <ReadingRow
                label="Bowl"
                value={`${formatTempF(mix.bowl_temp_f)} °F`}
                status={mix.bowl_prefilled ? <Note>A prefill: measure it in Today’s temperatures</Note> : null}
              />
              <ReadingRow
                label="Water poured"
                value={tempOrDash(mix.water_temp_used_f)}
                status={
                  mix.water_temp_used_f == null ? (
                    <button type="button" onClick={() => pourAtTarget(i, target)} className={smallButtonClass}>
                      Poured at the target
                    </button>
                  ) : null
                }
              />
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
            {`The bake from ${conflict.date} is saved already, and the page hasn’t been reset since. Save this one as a new bake, or replace that one?`}
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
          {github
            ? sync.state === 'error'
              ? `Saved on this device. The sync failed: ${sync.message}`
              : 'Saved. It syncs to your repository in the background.'
            : 'Saved in this browser. Add a repository in the bake log to share it with your other devices.'}
        </p>
      )}
    </div>
  );
}

function MixOutcome({ status }: { status: ReturnType<typeof mixStatus> }) {
  const why = status.reasons.map((r) => REASON[r]).join('; ');
  if (status.ff == null) return <p className="mt-1 text-sm text-amber-900 dark:text-amber-200">{`Not solved yet: ${why}.`}</p>;
  const solved = `solves to ${formatTempF(status.ff)} °F`;
  const nominal = status.ffNominal == null ? '' : `, ${formatTempF(status.ffNominal)} °F at the middle of every phase range`;
  return status.counted ? (
    <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">{`Counts. This mix ${solved}${nominal}.`}</p>
  ) : (
    <p className="mt-1 text-sm text-amber-900 dark:text-amber-200">{`Won't count: ${why}. It ${solved}${nominal}.`}</p>
  );
}

// ---------------------------------------------------------------------------
// The drawer
// ---------------------------------------------------------------------------

export function BakeLogDrawer({ open, onClose, state }: { open: boolean; onClose: () => void; state: AppState }) {
  return (
    <Drawer open={open} title="Bake log" onClose={onClose}>
      <div className="grid gap-6">
        <SizesSection state={state} />
        <BakesSection state={state} />
        <SyncSection state={state} />
      </div>
    </Drawer>
  );
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
          No counted bakes yet. Until the first, the calculator uses bake 1’s figure at every mix size, corrected for
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
        {pending && state.github ? ' Waiting to sync.' : ''}
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

function SyncSection({ state }: { state: AppState }) {
  const { github, setGitHub, sync, syncNow, log } = state;
  const [repoText, setRepoText] = useState(github ? `${github.owner}/${github.repo}` : '');
  const [token, setToken] = useState('');
  const repo = parseRepoName(repoText);
  const waiting = log.dirty.length + log.deleted.length;

  return (
    <section className="min-w-0">
      <h3 className="mb-2 text-lg font-semibold">Sync between devices</h3>
      {github ? (
        <>
          <p className="text-stone-700 dark:text-stone-300">
            {sync.state === 'syncing'
              ? `Syncing with ${github.owner}/${github.repo}…`
              : sync.state === 'error'
                ? `Couldn't sync with ${github.owner}/${github.repo}. ${sync.message}`
                : waiting > 0
                  ? `${waiting} ${waiting === 1 ? 'change' : 'changes'} waiting to sync with ${github.owner}/${github.repo}.`
                  : `Synced with ${github.owner}/${github.repo}${log.lastSyncedAt ? ` at ${formatTimeOfDay(new Date(log.lastSyncedAt))}` : ''}.`}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button type="button" onClick={syncNow} className={buttonClass}>
              Sync now
            </button>
            <button type="button" onClick={() => setGitHub(null)} className={buttonClass}>
              Forget the token on this device
            </button>
          </div>
        </>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (repo && token.trim()) {
              setGitHub({ ...repo, token: token.trim() });
              setToken('');
            }
          }}
        >
          <p className="text-sm text-stone-600 dark:text-stone-400">
            The log is in this browser only. To share it with your other devices, make a private GitHub repository
            and a fine-grained token that can reach only that repository, with Contents set to read and write. Paste
            both here on each device. The token stays in this browser’s storage.
          </p>
          <label className="grid gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
            Repository
            <input
              value={repoText}
              onChange={(e) => setRepoText(e.target.value)}
              placeholder="owner/name"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="min-h-touch rounded-lg border border-stone-300 bg-white px-3 text-base text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
            Token
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
              className="min-h-touch rounded-lg border border-stone-300 bg-white px-3 text-base text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
            />
          </label>
          <button type="submit" disabled={!repo || !token.trim()} className={`${buttonClass} disabled:opacity-50`}>
            Save and sync
          </button>
        </form>
      )}
    </section>
  );
}
