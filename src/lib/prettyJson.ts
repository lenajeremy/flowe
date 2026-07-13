// Plain-text pretty form of a JSON string (no markup) — for popovers and
// tooltips. Non-JSON (and bare scalars) pass through unchanged.
export function prettyJson(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return raw
    return JSON.stringify(parsed, null, 2)
  } catch {
    return raw
  }
}
