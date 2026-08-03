import type { NodeType } from '@/types/workflow'

/**
 * Real brand logos for the integration nodes, replacing the hand-drawn stroke
 * glyphs. Two sources, because one doesn't cover Google:
 *
 *   • logo.dev — everything with its own domain.
 *   • gstatic  — Google's own product logos. logo.dev only knows google.com, so
 *     Docs/Sheets/Drive/Calendar/Gmail would all collapse to the same "G".
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
}

/**
 * GitHub's mark is solid near-black on transparent (measured: 23/255 mean
 * luminance, no background of its own), so it disappears on the dark canvas.
 * Inverting it yields the white mark GitHub's own brand guidelines prescribe
 * for dark backgrounds. Every other logo either carries its own background
 * tile or is coloured brightly enough to read on both themes.
 */
export const INVERT_ON_DARK: ReadonlySet<NodeType> = new Set<NodeType>(['github'])

export function isIntegration(type: NodeType): boolean {
  return type in GOOGLE_PRODUCTS || type in LOGO_DOMAINS
}

/**
 * URL for a node's brand logo, or null when the node isn't an integration.
 * Rendered small (16–32px), so both sources are asked for 128px and downscaled
 * — cheap, and crisp on 2× displays.
 */
export function integrationLogoUrl(type: NodeType): string | null {
  const product = GOOGLE_PRODUCTS[type]
  if (product) {
    return `https://www.gstatic.com/images/branding/productlogos/${product}_2026/v2/web-64dp/` +
      `logo_${product}_2026_color_2x_web_64dp.png`
  }
  const domain = LOGO_DOMAINS[type]
  if (!domain) return null
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=128&format=png&retina=true`
}
