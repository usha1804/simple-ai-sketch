
// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     port: 5173,
//     proxy: {
//       '/api/ws': {
//         target: 'ws://127.0.0.1:8002',
//         ws: true,
//         changeOrigin: true
//       },
//       '/api': {
//         target: 'http://127.0.0.1:8002',
//         changeOrigin: true
//       }
//     }
//   }
// })



// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     port: 5173,
//     proxy: {
//       '/api/ws': {
//         target: 'ws://127.0.0.1:8002',
//         ws: true,
//         changeOrigin: true
//       },
//       '/api/video/stream': {
//         target: 'ws://127.0.0.1:8002',
//         ws: true,
//         changeOrigin: true
//       },
//       '/api/video/animate': {
//         target: 'ws://127.0.0.1:8002',
//         ws: true,
//         changeOrigin: true
//       },
//       '/api': {
//         target: 'http://127.0.0.1:8002',
//         changeOrigin: true
//       }
//     }
//   }
// })







import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy ALL /api HTTP requests to FastAPI backend
      '/api': {
        target: 'http://127.0.0.1:8002',
        changeOrigin: true,
        // Critical: enable WebSocket proxying for /api/ws and /api/text2sketch/ws
        ws: true,
      },
    },
  },
})