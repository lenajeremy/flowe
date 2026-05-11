import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
import { HomePage } from '@/pages/HomePage'
import { WorkflowEditorPage } from '@/pages/WorkflowEditorPage'
import { WebhookTriggerPage } from '@/pages/WebhookTriggerPage'

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
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/workflows" element={<HomePage />} />
      <Route path="/workflow/:id" element={<WorkflowEditorPage />} />
      <Route path="/trigger/:token" element={<WebhookTriggerPage />} />
    </Routes>
  )
}

export default App
