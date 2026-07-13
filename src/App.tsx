import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { LandingPage } from '@/pages/LandingPage'
import { HomePage } from '@/pages/HomePage'
import { BuildPage } from '@/pages/BuildPage'
import { WorkflowEditorPage } from '@/pages/WorkflowEditorPage'
import { WebhookTriggerPage } from '@/pages/WebhookTriggerPage'
import { RunDetailPage } from '@/pages/RunDetailPage'
import { LoginPage } from '@/pages/LoginPage'
import { AuthVerifyPage } from '@/pages/AuthVerifyPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
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
      <Toaster
        theme={resolved}
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--color-elevated)',
            border: '1px solid var(--color-border2)',
            color: 'var(--color-text)',
            boxShadow: 'var(--pop-shadow)',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/verify" element={<AuthVerifyPage />} />
        <Route path="/workflows" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/build" element={<ProtectedRoute><BuildPage /></ProtectedRoute>} />
        <Route path="/workflow/:id" element={<ProtectedRoute><WorkflowEditorPage /></ProtectedRoute>} />
        <Route path="/trigger/:token" element={<WebhookTriggerPage />} />
        <Route path="/run/:runId" element={<RunDetailPage />} />
      </Routes>
    </>
  )
}

export default App
