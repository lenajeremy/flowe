import { useState } from 'react'
import type { NodeType } from '@/types/workflow'
import { NODE_LABELS, NODE_ICON_PATHS } from '@/lib/nodeColors'
import { integrationLogoUrl, INVERT_ON_DARK } from '@/lib/integrationLogos'

/**
 * A third-party brand logo, sized to fill whatever box it's given.
 *
 * The logos come from a CDN, so failure is a real state, not a theoretical
 * one: on error we fall back to the node's original stroke glyph rather than
 * leaving a broken-image box. The glyph paths stay in the codebase for exactly
 * this reason.
 */
interface Props {
  type: NodeType
  size?: number
  /**
   * Set on surfaces that are dark regardless of the app theme — the landing
   * page. Without it a dark-marked logo keys off data-theme and disappears for
   * anyone whose theme preference is light.
   */
  onDark?: boolean
}

export function IntegrationLogo({ type, size, onDark }: Props) {
  const [failed, setFailed] = useState(false)
  const url = integrationLogoUrl(type)

  if (!url || failed) {
    // currentColor so the fallback still picks up the node accent from its wrapper.
    return (
      <svg
        viewBox="0 0 16 16" fill="none" className="node-ico"
        width={size} height={size}
        style={size ? undefined : { width: '100%', height: '100%' }}
      >
        <path d={NODE_ICON_PATHS[type]} stroke="currentColor" strokeWidth="1.4"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <img
      src={url}
      alt={`${NODE_LABELS[type]} logo`}
      width={size} height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={
        INVERT_ON_DARK.has(type)
          ? (onDark ? 'logo-invert' : 'logo-invert-on-dark')
          : undefined
      }
      style={{
        width: size ?? '100%',
        height: size ?? '100%',
        objectFit: 'contain',
        // Logos that ship their own square tile (Notion, Linear, GitLab,
        // Shopify, Outlook) get the corner softened so they sit in the node's
        // rounded icon chip instead of fighting it. Unsized means "fill the
        // chip", which is a radius-8 well inset by 2 — so 6 nests exactly.
        borderRadius: size ? Math.max(2, Math.round(size * 0.22)) : 6,
      }}
    />
  )
}
