import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: !!process.env.PORT,
  },
  test: {
    // Solo las pruebas del propio repositorio: las copias de trabajo de Claude (.claude/worktrees/*) traen
    // las suyas y se ejecutarían de nuevo (o con otra versión del código) al lanzar `npm test` desde la raíz.
    // Las e2e las lanza Playwright, no vitest.
    exclude: [...configDefaults.exclude, '.claude/**', 'e2e/**'],
  },
})
