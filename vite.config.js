import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@paddleocr') || id.includes('@techstark') || id.includes('onnxruntime') || id.includes('clipper-lib')) {
                return 'vendor-paddleocr'
              }
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react'
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase'
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons'
              }
              return 'vendor-libs'
            }
        },
      },
    },
  },
})
