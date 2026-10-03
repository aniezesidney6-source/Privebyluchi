import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// No production source maps (don't ship original source); Admin is already
// route-split in main.jsx so the public bundle stays light.
export default defineConfig({
  plugins: [react()],
  build: { sourcemap: false },
})
