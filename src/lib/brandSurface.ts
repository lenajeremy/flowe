// The dark brand surface, shared by the landing and pricing pages.
//
// Lives outside both so either can import it: exporting a plain constant from a
// component file breaks React fast refresh, which is what eslint's
// react-refresh/only-export-components is protecting.

/** The hairline divider used between sections on the dark surface. */
export const RULE = { borderTop: '1px solid rgba(255,255,255,0.06)' } as const
