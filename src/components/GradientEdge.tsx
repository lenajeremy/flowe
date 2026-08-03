import { useMemo } from 'react'
import { BaseEdge, getBezierPath, Position, type EdgeProps } from '@xyflow/react'

// Gradient connector — a bezier fading from a neutral wash at the source into
// the target node's accent, finished with an accent arrowhead.

// Fallback heading (radians) pointing INTO a handle on the given side, used
// only if the path can't be measured.
const FALLBACK_ANGLE: Record<Position, number> = {
  [Position.Left]: 0,
  [Position.Right]: Math.PI,
  [Position.Top]: Math.PI / 2,
  [Position.Bottom]: -Math.PI / 2,
}

const ARROW_LEN = 10 // tip to base
const ARROW_HALF = 4.5 // half the base width
const SOCKET_GAP = 5 // clearance so the tip butts against the target socket

export function GradientEdge(props: EdgeProps) {
  const {
    id,
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    selected,
    data,
  } = props

  const accent = typeof data?.accent === 'string' ? data.accent : '#70f17b'

  const [path] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const gradId = `edge-grad-${id}`

  // The arrow is a chord of the curve, not a glyph parked near it: both its tip
  // and the midpoint of its base are sampled at their own arc lengths along the
  // path. Taking the heading from the endpoint instead and extrapolating
  // backwards along a straight ray puts the base off a bending curve — the
  // angle looks right while the body sits visibly beside the line.
  const arrowPoints = useMemo(() => {
    let tipX = targetX
    let tipY = targetY
    let baseX = targetX
    let baseY = targetY
    let measured = false

    try {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      el.setAttribute('d', path)
      const total = el.getTotalLength()
      if (total > SOCKET_GAP + 2) {
        const tipAt = total - SOCKET_GAP
        // Keep the full arrow length when there's room; on a very short edge
        // shrink it rather than letting the base run off the start of the path.
        const baseAt = Math.max(0, tipAt - Math.min(ARROW_LEN, tipAt))
        const tip = el.getPointAtLength(tipAt)
        const base = el.getPointAtLength(baseAt)
        if (tip.x !== base.x || tip.y !== base.y) {
          tipX = tip.x; tipY = tip.y
          baseX = base.x; baseY = base.y
          measured = true
        }
      }
    } catch {
      /* no SVG geometry available — fall back to the by-side heading below */
    }

    if (!measured) {
      const angle = FALLBACK_ANGLE[targetPosition] ?? 0
      const dx = Math.cos(angle)
      const dy = Math.sin(angle)
      tipX = targetX - dx * SOCKET_GAP
      tipY = targetY - dy * SOCKET_GAP
      baseX = tipX - dx * ARROW_LEN
      baseY = tipY - dy * ARROW_LEN
    }

    // Unit perpendicular to the tip→base chord, for the two base corners.
    const vx = tipX - baseX
    const vy = tipY - baseY
    const len = Math.hypot(vx, vy) || 1
    const px = -vy / len
    const py = vx / len

    return [
      `${tipX},${tipY}`,
      `${baseX + px * ARROW_HALF},${baseY + py * ARROW_HALF}`,
      `${baseX - px * ARROW_HALF},${baseY - py * ARROW_HALF}`,
    ].join(' ')
  }, [path, targetX, targetY, targetPosition])

  return (
    <>
      <defs>
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1={sourceX} y1={sourceY}
          x2={targetX} y2={targetY}
        >
          {/* var() only resolves via style, not SVG presentation attributes */}
          <stop offset="0%" style={{ stopColor: 'var(--color-hover2)' }} />
          <stop offset="100%" style={{ stopColor: accent }} />
        </linearGradient>
      </defs>

      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: `url(#${gradId})`,
          strokeWidth: selected ? 4 : 3,
        }}
      />

      {/* Arrowhead, aligned to the curve's tangent at the target socket. */}
      <polygon points={arrowPoints} style={{ fill: accent }} stroke="none" />
    </>
  )
}
