import { defineConfig } from '@playwright/test'

// Pruebas end-to-end de los flujos críticos. Usan el Chrome instalado en el ordenador (no se
// descarga ningún navegador) y un Supabase simulado en memoria (e2e/support/fakeSupabase.ts):
// nunca tocan la base de datos real.
//   npm run test:e2e
const PORT = Number(process.env.E2E_PORT ?? 5180) // E2E_PORT permite lanzar las pruebas de varios worktrees a la vez sin pisarse

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: 'chrome',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    // El service worker se prueba aparte (src/lib/serviceWorker.test.ts) y aquí estorbaría a la red simulada.
    serviceWorkers: 'block',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx vite --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { VITE_SUPABASE_URL: 'https://e2e-supabase.test', VITE_SUPABASE_ANON_KEY: 'e2e-anon-key', VITE_VAPID_PUBLIC_KEY: 'BDummyClaveDePruebaE2E' }, // con clave, la app ofrece los avisos (solo se usa si se pulsa Activar)
  },
})
