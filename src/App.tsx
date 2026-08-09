import { useEffect } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from 'sonner'
import { LandingPage } from '@/pages/LandingPage'
import { HomePage } from '@/pages/HomePage'
import { DataPage } from '@/pages/DataPage'
import { BuildPage } from '@/pages/BuildPage'
import { WorkflowEditorPage } from '@/pages/WorkflowEditorPage'
import { WorkflowChatPage } from '@/pages/WorkflowChatPage'
import { WebhookTriggerPage } from '@/pages/WebhookTriggerPage'
import { RunDetailPage } from '@/pages/RunDetailPage'
import { LegalPage } from '@/pages/LegalPage'
import { ConnectionsPage } from '@/pages/ConnectionsPage'
import { AgentsPage } from '@/pages/AgentsPage'
import { AgentDetailPage } from '@/pages/AgentDetailPage'
import { LoginPage } from '@/pages/LoginPage'
import { AuthVerifyPage } from '@/pages/AuthVerifyPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/AppShell'
import { PricingPage } from '@/pages/PricingPage'
import { BillingPage } from '@/pages/BillingPage'
import { UsagePage } from '@/pages/UsagePage'
import { InvitePage } from '@/pages/InvitePage'
import { useAuthStore } from '@/store/authStore'
import { initTheme, useTheme } from '@/lib/theme'

/**
 * Carries a bookmarked /workflow/:id (singular) to its /workflows/:id home.
 * Navigate can't interpolate a param on its own, hence the component.
 */
function LegacyWorkflowRedirect({ chat = false }: { chat?: boolean }) {
  const { id } = useParams()
  return <Navigate to={`/workflows/${id}${chat ? '/chat' : ''}`} replace />
}

function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap)
  const { resolved } = useTheme()

  useEffect(() => {
    initTheme()
    void bootstrap()
  }, [bootstrap])

  return (
    <>
      {/* No toastOptions at all. Anything set there lands as an inline style on
          every toast and overrides the per-type palette richColors exists to
          provide — which is how richColors was switched on and doing nothing. */}
      <Toaster richColors theme={resolved} position="top-right" />
      <Routes>
        {/* ── Public: marketing and auth ────────────────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Emailed magic link. Do not move — the server builds this URL. */}
        <Route path="/auth/verify" element={<AuthVerifyPage />} />
        {/* Public: the page explains the invitation before asking you to sign in. */}
        <Route path="/invite" element={<InvitePage />} />
        <Route path="/terms" element={<LegalPage doc="terms" />} />
        <Route path="/privacy" element={<LegalPage doc="privacy" />} />

        {/* ── Capability URLs ───────────────────────────────────────
            Unguessable ids stand in for a session, because approval emails
            link non-users straight here. The server builds /run/:runId, so
            neither path may move. */}
        <Route path="/trigger/:token" element={<WebhookTriggerPage />} />
        <Route path="/run/:runId" element={<RunDetailPage />} />

        {/* ── The signed-in app ─────────────────────────────────────
            One layout route, so the guard and the navigation are each declared
            once instead of per page. */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/workflows" element={<HomePage />} />
          <Route path="/workflows/new" element={<BuildPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/agents/:id" element={<AgentDetailPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          {/* Settings is two pages, so its index goes straight to the first one
              rather than to a menu of two links. */}
          <Route path="/settings" element={<Navigate to="/settings/billing" replace />} />
          {/* Stripe returns to /settings/billing?checkout=… — do not move. */}
          <Route path="/settings/billing" element={<BillingPage />} />
          <Route path="/settings/usage" element={<UsagePage />} />
        </Route>

        {/* ── Full-canvas pages ─────────────────────────────────────
            Outside the shell on purpose: both already carry their own bar, and
            a second one would cost canvas height to repeat what the breadcrumb
            in their own bar says. */}
        <Route path="/workflows/:id" element={<ProtectedRoute><WorkflowEditorPage /></ProtectedRoute>} />
        <Route path="/workflows/:id/chat" element={<ProtectedRoute><WorkflowChatPage /></ProtectedRoute>} />

        {/* ── Paths that moved, kept working for bookmarks and history ── */}
        <Route path="/workflow/:id" element={<LegacyWorkflowRedirect />} />
        <Route path="/workflow/:id/chat" element={<LegacyWorkflowRedirect chat />} />
        <Route path="/build" element={<Navigate to="/workflows/new" replace />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
