import type { ReactNode } from 'react'
import type { NodeType } from '@/types/workflow'
import { NODE_ICON_PATHS } from '@/lib/nodeColors'

/**
 * The Flowe node icon set — one stroke-glyph language generated from
 * NODE_ICON_PATHS. Icons inherit their color (set `color` on any wrapper,
 * typically the node accent variable), so the same glyph is pastel-neon on
 * dark and deep-ink on light with zero baked-in values. The dark theme adds
 * a soft self-glow via the .node-ico filter; light disables it.
 */
function icon(type: NodeType): ReactNode {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="node-ico"
      style={{ overflow: 'visible' }}
    >
      <path
        d={NODE_ICON_PATHS[type]}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const NODE_ICONS: Record<NodeType, ReactNode> = {
  textInput:        icon('textInput'),
  imageInput:       icon('imageInput'),
  llm:              icon('llm'),
  branch:           icon('branch'),
  loop:             icon('loop'),
  textOutput:       icon('textOutput'),
  httpRequest:      icon('httpRequest'),
  emailSend:        icon('emailSend'),
  humanApproval:    icon('humanApproval'),
  webhookTrigger:   icon('webhookTrigger'),
  scheduledTrigger: icon('scheduledTrigger'),
  notion:           icon('notion'),
  linear:           icon('linear'),
  github:           icon('github'),
  gitlab:           icon('gitlab'),
  gmail:            icon('gmail'),
  stripe:           icon('stripe'),
  shopify:          icon('shopify'),
  googlecalendar:   icon('googlecalendar'),
  outlook:          icon('outlook'),
  slack:            icon('slack'),
  googledrive:      icon('googledrive'),
  googledocs:       icon('googledocs'),
  googlesheets:     icon('googlesheets'),
}
