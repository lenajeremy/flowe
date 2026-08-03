import type { ReactNode } from 'react'
import type { NodeType } from '@/types/workflow'
import { NODE_ICON_PATHS } from '@/lib/nodeColors'
import { IntegrationLogo } from '@/components/IntegrationLogo'

/**
 * The Fernary node icon set, in two voices:
 *
 *  • Fernary's own nodes (inputs, llm, branch, triggers, data…) use the
 *    stroke-glyph language generated from NODE_ICON_PATHS. They inherit their
 *    color (set `color` on any wrapper, typically the node accent variable),
 *    so the same glyph is pastel-neon on dark and deep-ink on light with zero
 *    baked-in values. The dark theme adds a soft self-glow via .node-ico.
 *
 *  • Third-party integrations use the real brand logo (see integrationLogos).
 *    A drawn approximation of someone else's mark is worse than their mark:
 *    users scan for the logo they already know. These don't take the accent
 *    colour — a brand logo has its own.
 *
 * Both are exported through the same NODE_ICONS map, so every consumer (node
 * cards, palette, chat, panels) picks up logos without touching a call site.
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

const logo = (type: NodeType): ReactNode => <IntegrationLogo type={type} />

export const NODE_ICONS: Record<NodeType, ReactNode> = {
  // Fernary's own vocabulary — stroke glyphs, accent-coloured
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
  data:             icon('data'),

  // Third-party services — their own logos
  notion:           logo('notion'),
  linear:           logo('linear'),
  github:           logo('github'),
  gitlab:           logo('gitlab'),
  gmail:            logo('gmail'),
  stripe:           logo('stripe'),
  shopify:          logo('shopify'),
  googlecalendar:   logo('googlecalendar'),
  outlook:          logo('outlook'),
  slack:            logo('slack'),
  googledrive:      logo('googledrive'),
  googledocs:       logo('googledocs'),
  googlesheets:     logo('googlesheets'),
}
