import { indicatorForDial } from '../lib/constants';
import { formatLitSegments } from '../lib/format';

/**
 * §7.5 *Speed: show what the mixer shows* (MESSAGE-29). The Halo Core has no
 * number display — its LED indicator shows speed in segments, a fully lit one
 * 10% and a half-lit one 5% — so the chip leads with that indicator, drawn,
 * then the count in words, then the dial and RPM, smaller.
 *
 * Drawn as a straight row of ten until Dave confirms the real geometry at the
 * mixer (MESSAGE-29: "row or ring" is open). Deliberately no setting number:
 * a segment count and a dial-click count differ by 2×, and at the 40% ceiling
 * a 2× misread is 80%.
 */
export function SpeedIndicator({
  dial,
  rpm,
  minutes,
}: {
  dial: number;
  rpm: number;
  minutes: readonly [number, number];
}) {
  const { full, half, total } = indicatorForDial(dial);
  const words = formatLitSegments(full, half);
  const duration = minutes[0] === minutes[1] ? `~${minutes[0]} min` : `${minutes[0]}–${minutes[1]} min`;

  return (
    <div className="mt-3 rounded-lg bg-stone-100 p-3 dark:bg-stone-800">
      <div role="img" aria-label={`Mixer indicator: ${words} of ${total}`} className="flex gap-1">
        {Array.from({ length: total }, (_, i) => {
          const fill = i < full ? 'full' : i === full && half ? 'half' : 'empty';
          return (
            <span
              key={i}
              aria-hidden="true"
              className={`h-8 flex-1 rounded-sm border-2 ${
                fill === 'empty'
                  ? 'border-stone-300 dark:border-stone-600'
                  : 'border-amber-600 dark:border-amber-500'
              } ${fill === 'full' ? 'bg-amber-500' : ''}`}
              // Half-lit: the left half filled, which is how a half segment reads.
              style={
                fill === 'half'
                  ? { background: 'linear-gradient(to right, var(--color-amber-500) 50%, transparent 50%)' }
                  : undefined
              }
            />
          );
        })}
      </div>
      <p className="mt-2 text-xl font-semibold tabular">{words}</p>
      <p className="text-sm text-stone-600 tabular dark:text-stone-400">
        {dial}% · {rpm} RPM · {duration}
      </p>
    </div>
  );
}
