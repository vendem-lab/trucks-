import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  },
  test: {
    // Standalone services and emulator specs use their own runners.
    exclude: ['**/node_modules/**', '**/dist/**', 'telegram-bot/**', 'test/**']
  }
});
