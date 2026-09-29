import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from '@/app/router'
import './index.css'

// Automatically recover from stale Vite chunk hashes after Netlify/production deployments
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  window.location.reload()
})

window.addEventListener('error', (event) => {
  if (
    event.message?.includes('Failed to fetch dynamically imported module') ||
    event.message?.includes('Importing a module script failed')
  ) {
    event.preventDefault()
    window.location.reload()
  }
})

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
)
