import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  },
  test: {
    // telegram-bot is a standalone service with its own node:test suite.
    exclude: ['**/node_modules/**', '**/dist/**', 'telegram-bot/**']
  }
});
