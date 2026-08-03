import { BaseEdge, getBezierPath, Position, type EdgeProps } from '@xyflow/react'

// Gradient connector — a bezier fading from a neutral wash at the source into
// the target node's accent, finished with an accent arrowhead so every edge
// reads left-to-right at a glance.

// Rotation that points the arrow INTO a target handle on the given side.
const ARROW_ROTATION: Record<Position, number> = {
  [Position.Left]: 0,
  [Position.Right]: 180,
  [Position.Top]: 90,
  [Position.Bottom]: -90,
}

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

      {/* Arrowhead — accent-filled, tip resting against the target socket.
          (The endpoints themselves are covered by the DOM handles now.) */}
      <g transform={`rotate(${ARROW_ROTATION[targetPosition] ?? 0} ${targetX} ${targetY})`}>
        <path
          d={`M ${targetX - 16} ${targetY - 6} L ${targetX - 7} ${targetY} L ${targetX - 16} ${targetY + 6} Z`}
          style={{ fill: accent }}
          stroke="none"
        />
      </g>
    </>
  )
}
