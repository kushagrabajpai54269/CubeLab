import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Mirrors tsconfig's "@/*": ["./*"] — needed now that Phase B code/tests
  // use the "@/" alias (Phase A's tests were all relative-import only, so
  // this gap wasn't visible until now).
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
