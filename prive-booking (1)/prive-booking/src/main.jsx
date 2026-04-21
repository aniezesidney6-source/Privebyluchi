import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PriveBooking from './PriveBooking'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PriveBooking />
  </StrictMode>
)
