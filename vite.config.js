import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration.
 *
 * - `base: './'` produces relative asset URLs, so the very same build works
 *   on GitHub Pages and inside the Capacitor WebView (https://localhost).
 * - `build.outDir` stays `build` so that the Capacitor `webDir` and the
 *   GitHub Pages deployment do not have to change.
 * - `build.target` keeps the output compatible with the WebViews of old
 *   Android versions (Android 7 shipped with Chromium 51).
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'build',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2015'
  },
  server: {
    host: true,
    port: 3000
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{js,jsx,ts,tsx}']
  }
});
