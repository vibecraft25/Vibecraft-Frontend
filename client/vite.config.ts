import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_CLIENT_PORT) || 5173,
      host: env.VITE_CLIENT_HOST || 'localhost'
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  }
})