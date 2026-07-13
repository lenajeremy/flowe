import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { linter } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'
import { useTheme } from '@/lib/theme'

// Lightweight JSON editor (CodeMirror 6, not Monaco): syntax highlighting,
// bracket matching, and inline parse errors, themed on the app tokens.
// Replaces the raw <textarea> everywhere users type JSON.

function appTheme(dark: boolean) {
  return EditorView.theme(
    {
      '&': {
        fontSize: '12.5px',
        backgroundColor: 'var(--color-surface2)',
        color: 'var(--color-text)',
        borderRadius: '12px',
      },
      '.cm-content': {
        fontFamily: 'var(--font-mono)',
        padding: '10px 4px',
        caretColor: 'var(--color-accent)',
      },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        color: 'var(--color-subtle)',
        border: 'none',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
      },
      '.cm-activeLine': { backgroundColor: 'var(--color-hover)' },
      '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--color-muted)' },
      '&.cm-focused': { outline: 'none' },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: 'color-mix(in srgb, var(--color-accent) 22%, transparent) !important',
      },
      '.cm-cursor': { borderLeftColor: 'var(--color-accent)' },
      '.cm-lintRange-error': { textDecoration: 'underline wavy var(--color-fail)' },
      '.cm-tooltip': {
        backgroundColor: 'var(--color-elevated)',
        color: 'var(--color-text)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        fontFamily: 'var(--font-sans)',
        fontSize: '11px',
      },
      // JSON token colors — same --syn-* language as rendered output
      '.cm-propertyName, .ͼc': { color: 'var(--syn-key)' },
      '.cm-string, .ͼe': { color: 'var(--syn-str)' },
      '.cm-number, .ͼd': { color: 'var(--syn-num)' },
      '.cm-bool, .ͼb': { color: 'var(--syn-bool)' },
      '.cm-null': { color: 'var(--syn-null)' },
    },
    { dark },
  )
}

export function JsonEditor({ value, onChange, height = '180px', disabled, autoFocus }: {
  value: string
  onChange: (v: string) => void
  height?: string
  disabled?: boolean
  autoFocus?: boolean
}) {
  const { resolved } = useTheme()
  const extensions = useMemo(
    () => [json(), linter(jsonParseLinter()), appTheme(resolved === 'dark'), EditorView.lineWrapping],
    [resolved],
  )

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] transition-colors focus-within:border-[var(--color-accent)]">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        height={height}
        editable={!disabled}
        autoFocus={autoFocus}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          autocompletion: false,
          searchKeymap: false,
        }}
        // CodeMirror injects its own theme classes; this keeps our background
        theme="none"
      />
    </div>
  )
}
