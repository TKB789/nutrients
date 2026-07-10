import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' makes the build work on GitHub Pages project sites
// (https://username.github.io/repo-name/) without extra configuration.
export default defineConfig({
  plugins: [react()],
  base: './',
})
