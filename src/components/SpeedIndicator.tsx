import { useId } from 'react';
import { indicatorForDial, indicatorSegments, type SegmentState } from '../lib/constants';
import { formatLitSegments, formatSpeedDetail } from '../lib/format';

/**
 * §7.5 *Speed: show what the mixer shows* (MESSAGE-29). The Halo Core has no
 * number display — speed shows as lit segments on a ring around the knob — so
 * the chip leads with that ring, drawn, then the count in words, then the dial
 * and RPM, smaller.
 *
 * Drawn to match the real one (Dave, 25 Sep 2026): think of twelve 30°
 * positions round the knob with the bottom two missing — a gap centred at
 * 6 o'clock — and the first segment is the one just left of the gap (7–8
 * o'clock), filling clockwise to the tenth at 4–5 o'clock. Bright segments on a
 * dark panel around a metal knob. A half step is the next segment DIMMED, not
 * half-filled. (A first reading of his photo put the gap at the lower left,
 * one position counterclockwise of this; he corrected it.) Deliberately no setting number: a segment
 * count and a dial-click count differ by 2×, and at the 40% ceiling a 2×
 * misread is 80%.
 */

/** Clock-face degrees (0 = 12 o'clock, clockwise) of segment 1's centre: 7:30, just left of the gap. */
const FIRST_SEGMENT_DEG = 225;
/** One of twelve positions. Ten of them put the last at 4:30, leaving 5–7 o'clock empty. */
const PITCH_DEG = 360 / 12;
/** Each segment's own arc; the rest of the pitch is the gap between them. */
const SEGMENT_DEG = 22;

const CENTRE = 100;
const RING_R = 84;

function point(deg: number, r: number): string {
  const rad = (deg * Math.PI) / 180;
  return `${(CENTRE + r * Math.sin(rad)).toFixed(2)} ${(CENTRE - r * Math.cos(rad)).toFixed(2)}`;
}

/** A clockwise arc of the ring, centred on `deg`. */
function segmentPath(deg: number): string {
  const from = deg - SEGMENT_DEG / 2;
  const to = deg + SEGMENT_DEG / 2;
  return `M ${point(from, RING_R)} A ${RING_R} ${RING_R} 0 0 1 ${point(to, RING_R)}`;
}

/**
 * Lit, dim and off have to be told apart at arm's length. Off is near the
 * panel, as on the real ring, where unlit segments barely show; dim sits
 * clearly between the two. A first pass at 38% dim over a lighter off read as
 * two unlit segments at phone size.
 */
const SEGMENT_STYLE: Record<SegmentState, { stroke: string; opacity: number; glow: boolean }> = {
  lit: { stroke: '#fafaf9', opacity: 1, glow: true },
  dim: { stroke: '#fafaf9', opacity: 0.5, glow: false },
  off: { stroke: '#3b3734', opacity: 1, glow: false },
};

export function SpeedIndicator({ dial, rpm }: { dial: number; rpm: number }) {
  const { full, half, total } = indicatorForDial(dial);
  const segments = indicatorSegments(dial);
  // Eight of these render on a split batch; their gradient and filter ids must not collide.
  const uid = useId();
  const knobId = `${uid}-knob`;
  const glowId = `${uid}-glow`;
  const words = formatLitSegments(full, half);

  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg bg-stone-100 p-3 dark:bg-stone-800">
      <svg
        viewBox="0 0 200 200"
        role="img"
        aria-label={`Mixer indicator: ${words} of ${total}`}
        className="size-32 shrink-0"
      >
        <defs>
          <radialGradient id={knobId} cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#e7e5e4" />
            <stop offset="60%" stopColor="#a8a29e" />
            <stop offset="100%" stopColor="#78716c" />
          </radialGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* The mixer's dark panel, whatever the page theme. */}
        <rect x="0" y="0" width="200" height="200" rx="20" fill="#262322" />
        <circle cx={CENTRE} cy={CENTRE} r="60" fill={`url(#${knobId})`} stroke="#1c1917" strokeWidth="3" />
        {segments.map((state, i) => {
          const style = SEGMENT_STYLE[state];
          return (
            <path
              key={i}
              d={segmentPath(FIRST_SEGMENT_DEG + i * PITCH_DEG)}
              fill="none"
              stroke={style.stroke}
              strokeOpacity={style.opacity}
              strokeWidth="11"
              filter={style.glow ? `url(#${glowId})` : undefined}
            />
          );
        })}
      </svg>
      <div className="min-w-0">
        <p className="text-xl font-semibold tabular">{words}</p>
        <p className="mt-1 text-sm text-stone-600 tabular dark:text-stone-400">
          {formatSpeedDetail(dial, rpm)}
        </p>
      </div>
    </div>
  );
}
