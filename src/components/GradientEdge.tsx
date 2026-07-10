import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'

// Gradient connector — Figma frames 161-168: 1px bezier fading from
// rgba(255,255,255,0.1) at the source into the target node's accent color,
// with 8px translucent dots at both endpoints.

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
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.1)" />
          <stop offset="100%" stopColor={accent} />
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

      {/* Endpoint dots — source: white 20%, target: accent 20% */}
      <circle cx={sourceX} cy={sourceY} r={4} fill="rgba(255, 255, 255, 0.2)" />
      <circle cx={targetX} cy={targetY} r={4} fill={accent} opacity={0.35} />
    </>
  )
}
