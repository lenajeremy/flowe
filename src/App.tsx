import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
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
import { LoginPage } from '@/pages/LoginPage'
import { AuthVerifyPage } from '@/pages/AuthVerifyPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { PricingPage } from '@/pages/PricingPage'
import { BillingPage } from '@/pages/BillingPage'
import { UsagePage } from '@/pages/UsagePage'
import { InvitePage } from '@/pages/InvitePage'
import { useAuthStore } from '@/store/authStore'
import { initTheme, useTheme } from '@/lib/theme'

function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap)
  const { resolved } = useTheme()

  useEffect(() => {
    initTheme()
    void bootstrap()
  }, [bootstrap])

  return (
    <>
      {/* richColors gives success/warning/error their own palette, which is what
          lets a plan limit read as amber guidance rather than a red failure.
          Background, border and text colour are deliberately NOT set here: an
          inline style lands on every toast and overrides the per-type colours,
          which had richColors switched on and doing nothing. Only the shadow is
          ours, since it carries no meaning. */}
      <Toaster
        richColors
        theme={resolved}
        position="top-right"
        toastOptions={{
          style: { boxShadow: 'var(--pop-shadow)' },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/verify" element={<AuthVerifyPage />} />
        <Route path="/workflows" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/data" element={<ProtectedRoute><DataPage /></ProtectedRoute>} />
        <Route path="/connections" element={<ProtectedRoute><ConnectionsPage /></ProtectedRoute>} />
        <Route path="/build" element={<ProtectedRoute><BuildPage /></ProtectedRoute>} />
        <Route path="/workflow/:id" element={<ProtectedRoute><WorkflowEditorPage /></ProtectedRoute>} />
        <Route path="/workflow/:id/chat" element={<ProtectedRoute><WorkflowChatPage /></ProtectedRoute>} />
        <Route path="/trigger/:token" element={<WebhookTriggerPage />} />
        <Route path="/run/:runId" element={<RunDetailPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        {/* Public: the page explains the invitation before asking you to sign in. */}
        <Route path="/invite" element={<InvitePage />} />
        <Route path="/settings/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
        <Route path="/settings/usage" element={<ProtectedRoute><UsagePage /></ProtectedRoute>} />
        <Route path="/terms" element={<LegalPage doc="terms" />} />
        <Route path="/privacy" element={<LegalPage doc="privacy" />} />
      </Routes>
    </>
  )
}

export default App
