// Shared JSON output renderer: valid JSON pretty-prints with syntax
// highlighting (the --syn-* tokens); anything else falls back to plain
// preformatted text. One component so every output surface matches.

function tryParseJson(str: string): unknown | null {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

function syntaxHighlight(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'color:var(--syn-num)'
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'color:var(--syn-key)' : 'color:var(--syn-str)'
        } else if (/true|false/.test(match)) {
          cls = 'color:var(--syn-bool)'
        } else if (/null/.test(match)) {
          cls = 'color:var(--syn-null)'
        }
        return `<span style="${cls}">${match}</span>`
      },
    )
}

/** Pretty-prints raw as highlighted JSON when it parses; plain text otherwise. */
export function JsonView({ raw, className = '' }: { raw: string; className?: string }) {
  const base = `whitespace-pre-wrap break-words font-[var(--font-mono)] ${className}`
  const parsed = tryParseJson(raw)
  // Bare strings/numbers pretty-print to themselves — skip the highlight pass.
  if (parsed === null || typeof parsed !== 'object') {
    return <pre className={base}>{raw}</pre>
  }
  const pretty = JSON.stringify(parsed, null, 2)
  return <pre className={base} dangerouslySetInnerHTML={{ __html: syntaxHighlight(pretty) }} />
}
