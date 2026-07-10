import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { LandingPage } from '@/pages/LandingPage'
import { HomePage } from '@/pages/HomePage'
import { WorkflowEditorPage } from '@/pages/WorkflowEditorPage'
import { WebhookTriggerPage } from '@/pages/WebhookTriggerPage'
import { RunDetailPage } from '@/pages/RunDetailPage'
import { LoginPage } from '@/pages/LoginPage'
import { AuthVerifyPage } from '@/pages/AuthVerifyPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuthStore } from '@/store/authStore'

function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap)

  // Apply saved / system theme once on mount so all pages see correct CSS vars
  useEffect(() => {
    const saved = localStorage.getItem('workflow-ai-theme')
    const theme =
      saved === 'dark' || saved === 'light'
        ? saved
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
    document.documentElement.dataset.theme = theme
    void bootstrap()
  }, [bootstrap])

  return (
    <>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1B1B1D',
            border: '1px solid #2A2A3E',
            color: '#fff',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/verify" element={<AuthVerifyPage />} />
        <Route path="/workflows" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/workflow/:id" element={<ProtectedRoute><WorkflowEditorPage /></ProtectedRoute>} />
        <Route path="/trigger/:token" element={<WebhookTriggerPage />} />
        <Route path="/run/:runId" element={<RunDetailPage />} />
      </Routes>
    </>
  )
}

export default App
