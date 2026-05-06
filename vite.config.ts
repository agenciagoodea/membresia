import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-recharts': ['recharts'],
              'vendor-lucide': ['lucide-react'],
              'vendor-framer': ['framer-motion'],
              'vendor-supabase': ['@supabase/supabase-js'],
            }
          }
        },
        chunkSizeWarningLimit: 1000,
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
