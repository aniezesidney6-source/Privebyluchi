import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const isAdmin = window.location.pathname === '/admin'
const root = createRoot(document.getElementById('root'))

// Dismiss the loading screen once the app has mounted (with a short minimum
// so it doesn't just flash, and a hard fallback so it can never get stuck).
function dismissLoader() {
  const loader = document.getElementById('loader')
  if (!loader) return
  const start = performance.now()
  const hide = () => {
    loader.classList.add('loaded')
    setTimeout(() => loader.remove(), 600)
  }
  const finish = () => setTimeout(hide, Math.max(0, 750 - (performance.now() - start)))
  if (document.readyState === 'complete') finish()
  else window.addEventListener('load', finish, { once: true })
  setTimeout(hide, 3500) // safety net
}

if (isAdmin) {
  // Admin pulls in the chart library — load it only here so the public site stays light.
  import('./Admin').then(({ default: Admin }) => {
    root.render(<StrictMode><Admin /></StrictMode>)
    dismissLoader()
  })
} else {
  root.render(<StrictMode><App /></StrictMode>)
  dismissLoader()
}
