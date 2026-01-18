import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Inject the user-provided API key.
    'process.env.API_KEY': JSON.stringify('AIzaSyBvRUqiG8f2jXrPVbxuSMY9vu3ZiJ-bszc'),
    'process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY': JSON.stringify('AIzaSyBvRUqiG8f2jXrPVbxuSMY9vu3ZiJ-bszc')
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