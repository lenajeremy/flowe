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

const ARROW_LEN = 11 // tip to base
const ARROW_HALF = 5 // half the base width
const SOCKET_GAP = 8 // clearance so the tip butts against the target socket

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

  // The arrow has to sit ON the curve, so take its heading from the curve's
  // own tangent at the end rather than from which side the handle is on — a
  // bezier between vertically offset nodes arrives at a steep angle, and a
  // fixed horizontal arrow visibly detaches from the line.
  const arrowPoints = useMemo(() => {
    let angle = FALLBACK_ANGLE[targetPosition] ?? 0
    try {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      el.setAttribute('d', path)
      const total = el.getTotalLength()
      if (total > 2) {
        // Sample a short chord just before the endpoint: its direction is the
        // tangent the eye reads as "where the line is heading".
        const back = el.getPointAtLength(Math.max(0, total - 12))
        const end = el.getPointAtLength(total)
        if (end.x !== back.x || end.y !== back.y) {
          angle = Math.atan2(end.y - back.y, end.x - back.x)
        }
      }
    } catch {
      /* no SVG geometry available — keep the by-side fallback */
    }

    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    // Perpendicular, for the two base corners.
    const px = -dy
    const py = dx

    const tipX = targetX - dx * SOCKET_GAP
    const tipY = targetY - dy * SOCKET_GAP
    const baseX = tipX - dx * ARROW_LEN
    const baseY = tipY - dy * ARROW_LEN

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
