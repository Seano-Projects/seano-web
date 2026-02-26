import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import commonjs from 'vite-plugin-commonjs'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    commonjs({
      filter (id) {
        if (id.includes('react-flight-indicators')) {
          return true
        }
        return false
      }
    })
  ],
  server: {
    host: '0.0.0.0', // biar bisa diakses dari luar container/PC
    port: 5173, // port default vite
    strictPort: true, // kalau 5173 dipakai jangan auto ganti ke 5174
    allowedHosts: ['seano.cloud'],
    // Proxy API requests untuk hide actual API URL di development
    proxy: {
      '/api': {
        target: 'https://api.seano.cloud',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/api/, ''),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err)
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Forward auth headers
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization)
            }
          })
        }
      },
      '/ws': {
        target: 'wss://api.seano.cloud',
        ws: true,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/ws/, '')
      }
    }
  },
  optimizeDeps: {
    include: ['react-flight-indicators'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  assetsInclude: ['**/*.svg'],
  build: {
    // Simple build tanpa chunking untuk reliability
    minify: 'esbuild',
    // Keep CSS together
    cssCodeSplit: false,
    cssMinify: true,
    // Support different browsers
    target: ['es2015', 'chrome58', 'firefox57', 'safari11'],
    // Disable chunking completely
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    },
    // Remove console and debugger in production
    esbuildOptions: {
      drop: ['console', 'debugger']
    },
    // No source maps in production
    sourcemap: false
  }
})
