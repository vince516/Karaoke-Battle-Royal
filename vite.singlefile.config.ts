import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Build one self-contained index.html (all JS + CSS inlined) that opens
// straight off the filesystem — no server. HashRouter keeps routing working
// under file://. Output goes to dist-single/.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: {
    outDir: 'dist-single',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
})
