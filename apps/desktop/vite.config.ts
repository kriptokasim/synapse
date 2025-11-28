import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@synapse/settings': path.resolve(__dirname, '../../packages/settings/src/index.ts'),
    },
  },
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
      },
    ]),
    renderer(),
  ],
  optimizeDeps: {
    exclude: ['monaco-editor'],
  },
})
