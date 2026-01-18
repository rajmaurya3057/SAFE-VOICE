import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Inject the API key from the environment. 
    // We use a fallback to empty string to avoid "process is not defined" errors in the browser.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true,
  }
});