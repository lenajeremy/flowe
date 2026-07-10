import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { LandingPage } from '@/pages/LandingPage'
import { HomePage } from '@/pages/HomePage'
import { WorkflowEditorPage } from '@/pages/WorkflowEditorPage'
import { WebhookTriggerPage } from '@/pages/WebhookTriggerPage'
import { RunDetailPage } from '@/pages/RunDetailPage'

function App() {
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
  }, [])

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
        <Route path="/workflows" element={<HomePage />} />
        <Route path="/workflow/:id" element={<WorkflowEditorPage />} />
        <Route path="/trigger/:token" element={<WebhookTriggerPage />} />
        <Route path="/run/:runId" element={<RunDetailPage />} />
      </Routes>
    </>
  )
}

export default App
