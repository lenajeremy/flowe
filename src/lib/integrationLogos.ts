import type { NodeType } from '@/types/workflow'

/**
 * Real brand logos for the integration nodes, replacing the hand-drawn stroke
 * glyphs. Two sources, because one doesn't cover Google:
 *
 *   • logo.dev — everything with its own domain.
 *   • gstatic  — Google's own product logos. logo.dev only knows google.com, so
 *     Docs/Sheets/Drive/Calendar/Gmail would all collapse to the same "G".
 *   • inline   — Atlassian's Jira and Confluence, whose marks ship as SVG paths
 *     (see INLINE_LOGOS). No network round-trip and no fallback state.
 *
 * Non-integration nodes (llm, branch, data, triggers…) keep the stroke glyph
 * set: they're Fernary's own vocabulary, not third-party brands.
 */

// Publishable key (pk_), designed to be sent from the browser — logo.dev's
// image endpoint is a public CDN. Overridable per-deploy without a rebuild.
const LOGO_DEV_TOKEN = import.meta.env.VITE_LOGO_DEV_TOKEN ?? 'pk_bwQZ2hriQH-NLxzpSokHVg'

// Google product slug, as it appears twice in the gstatic path.
const GOOGLE_PRODUCTS: Partial<Record<NodeType, string>> = {
  gmail:          'gmail',
  googlecalendar: 'calendar',
  googledrive:    'drive',
  googledocs:     'docs',
  googlesheets:   'sheets',
  googlemeet:     'meet',
  googleslides:   'slides',
  googleforms:    'forms',
  googletasks:    'tasks',
  googlechat:     'chat',
  googlekeep:     'keep',
}

// Domain logo.dev resolves the mark from. Marketing domains, not app
// subdomains — logo.dev keys off the registered domain.
const LOGO_DOMAINS: Partial<Record<NodeType, string>> = {
  slack:   'slack.com',
  outlook: 'outlook.com',
  notion:  'notion.so',
  linear:  'linear.app',
  github:  'github.com',
  gitlab:  'gitlab.com',
  stripe:  'stripe.com',
  shopify: 'shopify.com',
  bitbucket: 'bitbucket.com',
  granola:   'granola.ai',
  resend:    'resend.com',
  sendgrid:  'sendgrid.com',
}

/**
 * Atlassian's product marks, drawn rather than fetched. Both sit on the same
 * rounded-square tile, which is also the shape of the node icon chip, so the
 * tile path doubles as the chip's own background.
 */
const ATLASSIAN_TILE =
  'M0 6a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6z'

export interface InlineLogo {
  /** 24×24 rounded-square background. */
  tile: string
  tileColor: string
  /** The mark itself, drawn in white on top of the tile. */
  mark: string
}

export const INLINE_LOGOS: Partial<Record<NodeType, InlineLogo>> = {
  jira: {
    tile: ATLASSIAN_TILE,
    tileColor: '#1868db',
    mark: 'M9.051 15.434H7.734c-1.988 0-3.413-1.218-3.413-3h7.085c.367 0 .605.26.605.63v7.13c-1.772 0-2.96-1.435-2.96-3.434zm3.5-3.543h-1.318c-1.987 0-3.413-1.196-3.413-2.978h7.085c.367 0 .627.239.627.608v7.13c-1.772 0-2.981-1.435-2.981-3.434zm3.52-3.522h-1.317c-1.987 0-3.413-1.217-3.413-3h7.085c.367 0 .605.262.605.61v7.129c-1.771 0-2.96-1.435-2.96-3.434z',
  },
  confluence: {
    tile: ATLASSIAN_TILE,
    tileColor: '#1868db',
    mark: 'M17.888 14.461c-4.039-1.953-5.219-2.245-6.92-2.245-1.997 0-3.699.831-5.219 3.165l-.25.382c-.204.314-.249.426-.249.561s.068.247.318.404l2.564 1.594c.136.09.25.135.363.135.136 0 .226-.068.363-.27l.408-.628c.635-.966 1.203-1.28 1.928-1.28.636 0 1.385.18 2.315.629l2.677 1.257c.272.134.567.067.704-.247l1.27-2.783c.136-.315.046-.517-.272-.674M6.112 9.545c4.039 1.953 5.219 2.245 6.92 2.245 1.997 0 3.699-.83 5.219-3.165l.25-.381c.204-.315.249-.427.249-.562 0-.134-.068-.247-.318-.404L15.87 5.685c-.137-.09-.25-.135-.364-.135-.136 0-.226.067-.363.27l-.408.628c-.635.965-1.203 1.28-1.928 1.28-.636 0-1.385-.18-2.315-.63L7.814 5.843c-.272-.135-.567-.068-.703.247L5.84 8.872c-.136.314-.045.516.272.673',
  },
}

/**
 * Marks that are solid near-black on transparent, with no background tile of
 * their own, so they disappear on the dark canvas. Inverting yields the white
 * mark each brand prescribes for dark backgrounds. Measured mean luminance over
 * opaque pixels: github 23/255, resend 22/255. Every other logo either carries
 * its own tile or is coloured brightly enough to read on both themes.
 */
export const INVERT_ON_DARK: ReadonlySet<NodeType> = new Set<NodeType>(['github'])

export function isIntegration(type: NodeType): boolean {
  return type in GOOGLE_PRODUCTS || type in LOGO_DOMAINS || type in INLINE_LOGOS
}

/**
 * URL for a node's brand logo, or null when the node isn't an integration.
 * Rendered small (16–32px), so both sources are asked for 128px and downscaled
 * — cheap, and crisp on 2× displays.
 */
export function integrationLogoUrl(type: NodeType): string | null {
  if (type in INLINE_LOGOS) return null
  const product = GOOGLE_PRODUCTS[type]
  if (product) {
    return `https://www.gstatic.com/images/branding/productlogos/${product}_2026/v2/web-64dp/` +
      `logo_${product}_2026_color_2x_web_64dp.png`
  }
  const domain = LOGO_DOMAINS[type]
  if (!domain) return null
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=128&format=png&retina=true`
}
