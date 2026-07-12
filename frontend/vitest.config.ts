import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react'; // wait, do we have plugin-react? Yes, Next.js or standard Vite react plugin can be used, but since we are using next/swc, we can just use standard vitest configurations.
import path from 'path';

export default defineConfig({
  plugins: [], // we can leave plugins empty or use simple configuration
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
