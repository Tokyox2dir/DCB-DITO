import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const lanSpaFallback: Plugin = {
  name: 'lan-spa-fallback',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const pathname = request.url?.split('?')[0] || ''
      const isPageRequest = request.method === 'GET' && request.headers.accept?.includes('text/html')
      const isAppRoute = !pathname.includes('.') && !pathname.startsWith('/api')

      if (isPageRequest && isAppRoute) {
        request.url = '/index.html'
      }
      next()
    })
  },
}

export default defineConfig({
  plugins: [lanSpaFallback, react()],
  server: {
    host: '0.0.0.0',
    port: 43127,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://new-payment.redision.com:4000/',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  assetsInclude: ['**/*.ttf'],
})
