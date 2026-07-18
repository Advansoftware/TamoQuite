import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
  // JSX via esbuild (automatic runtime) — no @vitejs/plugin-react needed for our tests.
  esbuild: { jsx: 'automatic' },
  // Don't load the project's Tailwind PostCSS config during tests.
  css: { postcss: { plugins: [] } },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
