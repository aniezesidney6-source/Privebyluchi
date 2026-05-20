import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PriveBooking from './PriveBooking'
import Admin from './Admin'

const isAdmin = window.location.pathname === '/admin'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? <Admin /> : <PriveBooking />}
  </StrictMode>
)
