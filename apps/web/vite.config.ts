import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const root = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Local app alias
      '@': path.resolve(__dirname, './src'),
      // Workspace packages — map package names to their source directories
      // so Vite can resolve them without a build step.
      '@archflow/types': path.resolve(root, 'packages/types/src/index.ts'),
      '@archflow/sdl': path.resolve(root, 'packages/sdl/src/index.ts'),
      // Sub-path export for SDLParser (Yjs-aware, web only)
      '@archflow/sdl/SDLParser': path.resolve(root, 'packages/sdl/src/SDLParser.ts'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});
