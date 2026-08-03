import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FloweIcon } from '@/components/FloweIcon'
import terms from '../../legal/terms-of-service.md?raw'
import privacy from '../../legal/privacy-policy.md?raw'

// The markdown files in /legal are the source of truth — they're what gets
// reviewed and what a customer's lawyer asks for. Importing them raw means the
// page can never drift from the document, which is the failure mode when legal
// copy gets re-typed into JSX.
const DOCS = {
  terms:   { body: terms,   title: 'Terms of Service' },
  privacy: { body: privacy, title: 'Privacy Policy' },
} as const

export function LegalPage({ doc }: { doc: keyof typeof DOCS }) {
  const { body, title } = DOCS[doc]

  useEffect(() => {
    document.title = `${title} · Fernary`
    window.scrollTo(0, 0)
  }, [title])

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)]">
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)]"
        style={{ backdropFilter:'blur(20px) saturate(160%)', background:'color-mix(in srgb, var(--color-canvas) 78%, transparent)' }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <FloweIcon size={20} />
            <span className="text-[15px] font-semibold" style={{ letterSpacing:'-0.01em' }}>Fernary</span>
          </Link>
          <nav className="flex items-center gap-5 text-[13px]">
            <Link to="/terms"
              className={doc === 'terms' ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'}>
              Terms
            </Link>
            <Link to="/privacy"
              className={doc === 'privacy' ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'}>
              Privacy
            </Link>
          </nav>
        </div>
      </header>

      <main className="legal-prose mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
      </main>

      <footer className="border-t border-[var(--color-border)]">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11.5px] text-[var(--color-subtle)]">© 2026 Fernary · fernary.com</p>
          <Link to="/" className="text-[13px] text-[var(--color-muted)] hover:text-[var(--color-text)]">
            Back to fernary.com
          </Link>
        </div>
      </footer>
    </div>
  )
}
