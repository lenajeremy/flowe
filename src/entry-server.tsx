import { StrictMode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
// v7 exports StaticRouter from the package root; the /server subpath is v6-only.
import { StaticRouter } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
import { LegalPage } from '@/pages/LegalPage'

// Renders the public routes to HTML at build time so a crawler that does not run
// JavaScript still receives the real page.
//
// Deliberately narrow: this imports the two public pages, not App, so the editor
// route tree — react-flow, CodeMirror, the WebGL canvas — never enters the SSR
// bundle. The client still boots with createRoot and replaces this markup, so the
// two trees do not need to match and there is no hydration to break.
export function render(route: string): string {
  const page =
    route === '/privacy' ? <LegalPage doc="privacy" /> :
    route === '/terms'   ? <LegalPage doc="terms" /> :
    <LandingPage />

  return renderToStaticMarkup(
    <StrictMode>
      <StaticRouter location={route}>{page}</StaticRouter>
    </StrictMode>,
  )
}

export const ROUTES = ['/', '/privacy', '/terms'] as const
