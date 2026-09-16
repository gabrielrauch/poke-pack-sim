import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/fredoka/500.css'
import '@fontsource/fredoka/700.css'
import './styles.css'
import { loadSession } from '../domains/auth/session'
import { App } from './App'
import { ErrorBoundary } from './ErrorBoundary'
import { createQueryClient } from './query'

registerSW({ immediate: true })
loadSession()

const queryClient = createQueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
