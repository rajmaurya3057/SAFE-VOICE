import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || 'AIzaSyBvRUqiG8f2jXrPVbxuSMY9vu3ZiJ-bszc'),
      'process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY': JSON.stringify(env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || env.API_KEY || 'AIzaSyBvRUqiG8f2jXrPVbxuSMY9vu3ZiJ-bszc'),
      'process.env.TWILIO_ACCOUNT_SID': JSON.stringify(env.TWILIO_ACCOUNT_SID),
      'process.env.TWILIO_AUTH_TOKEN': JSON.stringify(env.TWILIO_AUTH_TOKEN),
      'process.env.TWILIO_SMS_FROM': JSON.stringify(env.TWILIO_SMS_FROM),
      'process.env.APP_URL': JSON.stringify(env.APP_URL)
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      emptyOutDir: true,
    }
  };
});