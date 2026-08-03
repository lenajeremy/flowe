import { useId } from 'react'

// The Fernary mark — a four-leaflet frond in rotational symmetry (a fernery
// tending itself). Four brand hues + a gentle pinwheel lean read as growth,
// coordination and quiet motion; the negative-space core is a small spark.
// Kept exported as FloweIcon so every call site keeps working post-rename.

const LEAF =
  'M50 50 C 37 47, 30 36, 32 24 C 33 17, 39 12, 44 16 C 47 18, 48 21, 50 24 C 52 21, 53 18, 56 16 C 61 12, 67 17, 68 24 C 70 36, 63 47, 50 50 Z'

// stop pairs per leaflet, ordered top → right → bottom → left
const STOPS: Array<[string, string]> = [
  ['#9AE06A', '#68C63E'], // lime
  ['#22CE8E', '#0FA36F'], // emerald
  ['#15B8B2', '#0A8E96'], // teal
  ['#FFC94E', '#F5A524'], // amber
]

export function FloweIcon({
  size = 20,
  className = '',
  mono,
}: {
  size?: number
  className?: string
  /** Render as a single flat color (favicons, stamps, dark UI). */
  mono?: string
}) {
  const uid = useId().replace(/:/g, '')

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Fernary"
    >
      {!mono && (
        <defs>
          {STOPS.map(([a, b], i) => (
            <linearGradient key={i} id={`${uid}-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={a} />
              <stop offset="1" stopColor={b} />
            </linearGradient>
          ))}
        </defs>
      )}
      {STOPS.map((_, i) => (
        <g key={i} transform={`rotate(${i * 90} 50 50)`}>
          <g transform="rotate(13 50 50)">
            <path
              d={LEAF}
              transform="translate(0 -4)"
              fill={mono ?? `url(#${uid}-${i})`}
            />
          </g>
        </g>
      ))}
    </svg>
  )
}
