import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Admin from './Admin'

const isAdmin = window.location.pathname === '/admin'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? <Admin /> : <App />}
  </StrictMode>
)

// Dismiss the loading screen once the app has mounted (with a short minimum
// so it doesn't just flash, and a hard fallback so it can never get stuck).
const loader = document.getElementById('loader')
if (loader) {
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
