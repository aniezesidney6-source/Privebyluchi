import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import NotFound from './sections/NotFound'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const isAdmin = path === '/admin'
const isHome = path === '/' || path === '/index.html'
const isDecember = path === '/december'
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
  // Keep the private dashboard out of search indexes.
  document.title = 'Admin · Privé by Luchi'
  const noindex = document.createElement('meta')
  noindex.name = 'robots'
  noindex.content = 'noindex, nofollow'
  document.head.appendChild(noindex)
  // Admin pulls in the chart library — load it only here so the public site stays light.
  import('./Admin').then(({ default: Admin }) => {
    root.render(<StrictMode><Admin /></StrictMode>)
    dismissLoader()
  })
} else if (isDecember) {
  import('./sections/December').then(({ default: December }) => {
    root.render(<StrictMode><December /></StrictMode>)
    dismissLoader()
  })
} else if (isHome) {
  root.render(<StrictMode><App /></StrictMode>)
  dismissLoader()
} else {
  // Unknown route → custom 404 (noindex, with a path home).
  root.render(<StrictMode><NotFound /></StrictMode>)
  dismissLoader()
}
