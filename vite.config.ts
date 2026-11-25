import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          rapier: ['@dimforge/rapier3d-compat']
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat']
  }
});
