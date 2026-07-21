import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devApiTarget = env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:5000';
  const appBasePath = env.VITE_APP_BASE_PATH || '/';

  return {
    base: appBasePath,
    plugins: [react()],
    optimizeDeps: {
      include: [
        '@fortawesome/fontawesome-svg-core',
        '@fortawesome/react-fontawesome',
        '@fortawesome/free-solid-svg-icons',
      ],
    },
    server: {
      host: true,
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true,
        },
        '/auth': {
          target: devApiTarget,
          changeOrigin: true,
        },
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
})
