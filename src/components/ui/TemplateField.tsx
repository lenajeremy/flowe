import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { availableTokens, latestOutputs, outputFor, type TokenOption } from '@/lib/nodeInputs'

// A template-aware text field built on a contenteditable div. The value keeps
// raw {{nodeId.output.field}} tokens (the form the executor resolves), but the
// DOM renders each one as an atomic contenteditable=false chip labelled with
// the node's *name* — "{{Summarizer.output}}" — so UUIDs never reach the user.
// Chips behave as single characters (Backspace removes the whole token), and
// all caret math converts between DOM points and offsets in the value string.
// Typing "{{" opens an autocomplete of the selected node's upstream inputs;
// chips dragged from the Input panel drop in as tokens.

const TOKEN_RE = /\{\{([\w-]+)(\.output(?:\.[\w-]+)*)\}\}/g

interface Props {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
  rows?: number
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// toHTML renders the value with each token as a chip whose visible text uses
// the node label while data-tok keeps the raw token for round-tripping.
function toHTML(text: string, labelOf: (id: string) => string): string {
  if (!text) return ''
  let html = ''
  let last = 0
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(text)) !== null) {
    html += escapeHtml(text.slice(last, m.index))
    const display = `{{${labelOf(m[1])}${m[2]}}}`
    html += `<span data-tok="${escapeHtml(m[0])}" contenteditable="false" style="color:var(--color-accent);font-weight:500">${escapeHtml(display)}</span>`
    last = m.index + m[0].length
  }
  html += escapeHtml(text.slice(last))
  return html
}

// domValue reconstructs the raw value: text nodes contribute their text, chips
// contribute their stored token (not their label display).
function domValue(root: Node): string {
  let out = ''
  root.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) out += n.textContent ?? ''
    else if (n instanceof HTMLElement) {
      if (n.dataset.tok) out += n.dataset.tok
      else if (n.tagName === 'BR') out += '\n'
      else out += domValue(n)
    }
  })
  return out
}

function chipAround(node: Node | null): HTMLElement | null {
  const el = node instanceof HTMLElement ? node : (node?.parentElement ?? null)
  return el?.closest?.('[data-tok]') ?? null
}

// valueOffsetOf converts a DOM point to an offset in the value string. Points
// inside a chip snap to just after it — the caret can never sit inside one.
function valueOffsetOf(root: HTMLElement, container: Node, offset: number): number {
  const chip = chipAround(container)
  let acc = 0
  let done = false

  function measure(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) acc += (node.textContent ?? '').length
    else if (node instanceof HTMLElement && node.dataset.tok) acc += node.dataset.tok.length
    else node.childNodes.forEach(measure)
  }

  function walk(node: Node): void {
    if (done) return
    if (chip && node === chip) {
      acc += chip.dataset.tok?.length ?? 0
      done = true
      return
    }
    if (node === container) {
      if (node.nodeType === Node.TEXT_NODE) acc += offset
      else Array.from(node.childNodes).slice(0, offset).forEach(measure)
      done = true
      return
    }
    if (node.nodeType === Node.TEXT_NODE) {
      acc += (node.textContent ?? '').length
      return
    }
    if (node instanceof HTMLElement && node.dataset.tok) {
      acc += node.dataset.tok.length
      return
    }
    node.childNodes.forEach(walk)
  }
  walk(root)
  return acc
}

function valueSelection(root: HTMLElement): [number, number] {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return [0, 0]
  const r = sel.getRangeAt(0)
  if (!root.contains(r.startContainer) || !root.contains(r.endContainer)) return [0, 0]
  const start = valueOffsetOf(root, r.startContainer, r.startOffset)
  const end = r.collapsed ? start : valueOffsetOf(root, r.endContainer, r.endOffset)
  return [Math.min(start, end), Math.max(start, end)]
}

function setValueCaret(root: HTMLElement, target: number) {
  const sel = window.getSelection()
  if (!sel) return
  const range = document.createRange()
  let remaining = target
  let placed = false

  function walk(node: Node): void {
    if (placed) return
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent ?? '').length
      if (remaining <= len) {
        range.setStart(node, remaining)
        placed = true
        return
      }
      remaining -= len
      return
    }
    if (node instanceof HTMLElement && node.dataset.tok) {
      const len = node.dataset.tok.length
      if (remaining === 0) {
        range.setStartBefore(node)
        placed = true
        return
      }
      if (remaining <= len) {
        range.setStartAfter(node)
        placed = true
        return
      }
      remaining -= len
      return
    }
    node.childNodes.forEach(walk)
  }
  Array.from(root.childNodes).forEach(walk)

  if (!placed) {
    range.selectNodeContents(root)
    range.collapse(false)
  } else {
    range.collapse(true)
  }
  sel.removeAllRanges()
  sel.addRange(range)
}

function detectTrigger(text: string, caret: number): { from: number; query: string } | null {
  const open = text.lastIndexOf('{{', caret - 1)
  if (open === -1) return null
  const between = text.slice(open + 2, caret)
  if (/[\s}]/.test(between) || between.includes('{{') || between.includes('}}')) return null
  return { from: open, query: between }
}

export function TemplateField({ id, value, onChange, placeholder, multiline = false, rows = 3 }: Props) {
  const elRef = useRef<HTMLDivElement>(null)
  const composing = useRef(false)

  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId)
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const executionLog = useWorkflowStore((s) => s.executionLog)

  const labelById = useMemo(() => new Map(nodes.map((n) => [n.id, n.data.label])), [nodes])
  const labelOf = useCallback((nid: string) => labelById.get(nid) || nid, [labelById])

  const tokens = useMemo(
    () => availableTokens(selectedNodeId, nodes, edges, executionLog),
    [selectedNodeId, nodes, edges, executionLog],
  )

  const [menu, setMenu] = useState<{ open: boolean; from: number; query: string; index: number }>({
    open: false, from: 0, query: '', index: 0,
  })

  // ── Hover popover: resolved value of the chip under the cursor ──
  const [hover, setHover] = useState<{ tok: string; top: number } | null>(null)
  const outputs = useMemo(() => latestOutputs(executionLog), [executionLog])

  const hoverInfo = useMemo(() => {
    if (!hover) return null
    const m = /^\{\{([\w-]+)(\.output(?:\.[\w-]+)*)\}\}$/.exec(hover.tok)
    if (!m) return null
    const [, nid, pathStr] = m
    const title = `{{${labelOf(nid)}${pathStr}}}`
    const node = nodes.find((n) => n.id === nid)
    const raw = node ? outputFor(node, outputs) : outputs.get(nid)
    if (raw === undefined) return { title, state: 'norun' as const, text: '' }
    const path = pathStr.split('.').slice(2) // drop leading '' and 'output'
    if (path.length === 0) return { title, state: 'value' as const, text: raw }
    try {
      let cur: unknown = JSON.parse(raw)
      for (const key of path) {
        if (cur !== null && typeof cur === 'object' && !Array.isArray(cur) && key in (cur as Record<string, unknown>)) {
          cur = (cur as Record<string, unknown>)[key]
        } else {
          return { title, state: 'nofield' as const, text: '' }
        }
      }
      return { title, state: 'value' as const, text: typeof cur === 'string' ? cur : JSON.stringify(cur) }
    } catch {
      return { title, state: 'nofield' as const, text: '' }
    }
  }, [hover, nodes, outputs, labelOf])

  function handleMouseOver(e: React.MouseEvent<HTMLDivElement>) {
    const chip = (e.target as HTMLElement).closest?.('[data-tok]') as HTMLElement | null
    if (!chip?.dataset.tok || !elRef.current?.parentElement) return
    const wrapTop = elRef.current.parentElement.getBoundingClientRect().top
    setHover({ tok: chip.dataset.tok, top: chip.getBoundingClientRect().bottom - wrapTop + 4 })
  }

  function handleMouseOut(e: React.MouseEvent<HTMLDivElement>) {
    const to = e.relatedTarget as HTMLElement | null
    if (to?.closest?.('[data-tok]')) return
    setHover(null)
  }

  const options = useMemo(() => {
    if (!menu.open) return []
    const q = menu.query.toLowerCase()
    return tokens
      .filter((t) => t.label.toLowerCase().includes(q) || t.nodeLabel.toLowerCase().includes(q))
      .slice(0, 8)
  }, [menu.open, menu.query, tokens])

  // Sync the DOM when the value changes from outside, or when node labels
  // change; skipped while the user is typing in this field (the DOM already
  // matches after our own commits, and a rebuild would clobber the caret).
  useEffect(() => {
    const el = elRef.current
    if (!el) return
    if (domValue(el) === value && document.activeElement === el) return
    el.innerHTML = toHTML(value, labelOf)
  }, [value, labelOf])

  function commit(text: string, caret: number) {
    const el = elRef.current
    if (!el) return
    setHover(null) // the hovered chip may have just been removed or moved
    onChange(text)
    el.innerHTML = toHTML(text, labelOf)
    setValueCaret(el, caret)
  }

  function handleInput() {
    const el = elRef.current
    if (!el || composing.current) return
    const text = domValue(el)
    const [, caret] = valueSelection(el)
    commit(text, caret)
    const trig = tokens.length > 0 ? detectTrigger(text, caret) : null
    if (trig) setMenu({ open: true, from: trig.from, query: trig.query, index: 0 })
    else setMenu((m) => (m.open ? { ...m, open: false } : m))
  }

  function applyToken(opt: TokenOption) {
    const el = elRef.current
    if (!el) return
    const text = domValue(el)
    const [, caret] = valueSelection(el)
    const next = text.slice(0, menu.from) + opt.token + text.slice(caret)
    commit(next, menu.from + opt.token.length)
    setMenu((m) => ({ ...m, open: false }))
    el.focus()
  }

  function insertText(insert: string) {
    const el = elRef.current
    if (!el) return
    const text = domValue(el)
    const [start, end] = valueSelection(el)
    const next = text.slice(0, start) + insert + text.slice(end)
    commit(next, start + insert.length)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (menu.open && options.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenu((m) => ({ ...m, index: (m.index + 1) % options.length })); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMenu((m) => ({ ...m, index: (m.index - 1 + options.length) % options.length })); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyToken(options[menu.index]); return }
      if (e.key === 'Escape') { e.preventDefault(); setMenu((m) => ({ ...m, open: false })); return }
    }
    if (e.key === 'Enter') {
      // Own newline handling so the browser can't inject <div>/<br> and corrupt
      // our plain-text model.
      e.preventDefault()
      if (multiline) insertText('\n')
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    insertText(multiline ? text : text.replace(/\r?\n/g, ' '))
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    const token = e.dataTransfer.getData('text/plain')
    if (!token) return
    e.preventDefault()
    const el = elRef.current
    if (!el) return
    const text = domValue(el)
    // Insert at the drop point when the browser can resolve it, else the caret.
    let at = valueSelection(el)[1]
    const r = document.caretRangeFromPoint?.(e.clientX, e.clientY)
    if (r && el.contains(r.startContainer)) at = valueOffsetOf(el, r.startContainer, r.startOffset)
    el.focus()
    commit(text.slice(0, at) + token + text.slice(at), at + token.length)
  }

  const shared = 'px-2.5 py-1.5 font-[var(--font-mono)] text-xs leading-relaxed'

  return (
    <div className="relative">
      <div
        ref={elRef}
        id={id}
        role="textbox"
        aria-multiline={multiline}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        onCompositionStart={() => { composing.current = true }}
        onCompositionEnd={() => { composing.current = false; handleInput() }}
        onBlur={() => setTimeout(() => setMenu((m) => ({ ...m, open: false })), 120)}
        spellCheck={false}
        className={`tmpl-field w-full overflow-auto rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface2)] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)] ${shared} ${multiline ? 'whitespace-pre-wrap break-words' : 'whitespace-nowrap'}`}
        style={multiline ? { minHeight: `${rows * 1.7 + 0.4}em` } : undefined}
      />

      {hover && hoverInfo && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-2.5 py-2 shadow-xl"
          style={{ top: hover.top }}
        >
          <p className="micro mb-1 truncate text-[var(--color-subtle)]">{hoverInfo.title}</p>
          {hoverInfo.state === 'value' ? (
            <pre className="max-h-36 overflow-hidden whitespace-pre-wrap break-words font-[var(--font-mono)] text-[11px] leading-relaxed text-[var(--color-text)]">
              {hoverInfo.text.length > 400 ? hoverInfo.text.slice(0, 400) + '…' : hoverInfo.text}
            </pre>
          ) : (
            <p className="text-[11px] italic text-[var(--color-muted)]">
              {hoverInfo.state === 'nofield'
                ? 'No value for this field in the last run.'
                : 'Run the workflow to view values.'}
            </p>
          )}
        </div>
      )}

      {menu.open && options.length > 0 && (
        <ul className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] py-1 shadow-xl">
          {options.map((opt, i) => (
            <li key={opt.token}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyToken(opt) }}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${i === menu.index ? 'bg-[var(--color-surface2)]' : ''} hover:bg-[var(--color-surface2)]`}
              >
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: opt.accent }} />
                <span className="text-[11px] font-medium text-[var(--color-text)]">{opt.label}</span>
                <span className="truncate text-[10px] text-[var(--color-subtle)]">{opt.nodeLabel}</span>
                <code className="ml-auto max-w-[130px] flex-shrink-0 truncate font-[var(--font-mono)] text-[10px]" style={{ color: 'var(--color-accent)' }}>
                  {opt.display}
                </code>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
