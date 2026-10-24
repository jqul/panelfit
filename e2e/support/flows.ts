import { expect, type Page } from '@playwright/test'
import { TOKEN, TRAINER_LOGIN, CLIENT_LOGIN, ids } from './seed'

/** El entrenador entra con su email y contraseña (sin el recorrido de bienvenida, que tapa la pantalla). */
export async function entrarComoEntrenador(page: Page) {
  await page.addInitScript(id => localStorage.setItem(`pf_onboarding_done_${id}`, '1'), ids.trainer)
  await page.goto('/')
  await page.getByRole('button', { name: /Entrar/ }).first().click()
  await page.getByPlaceholder('tu@email.com').fill(TRAINER_LOGIN.email)
  await page.getByPlaceholder('••••••••').fill(TRAINER_LOGIN.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByText('Resumen').first()).toBeVisible()
}

/** El entrenador abre la ficha de su cliente desde la lista del resumen. */
export async function abrirFichaDelCliente(page: Page) {
  await page.getByRole('button', { name: /María García.*Nunca/ }).click()
  await expect(page.getByRole('button', { name: /^Configuración/ })).toBeVisible() // la ficha ya está abierta
}

/** El cliente (que ya tiene cuenta) entra con su enlace y su contraseña. */
export async function entrarComoCliente(page: Page) {
  await page.goto(`/?c=${TOKEN}`)
  await page.getByPlaceholder('tu@email.com').fill(CLIENT_LOGIN.email)
  await page.getByPlaceholder('Mínimo 6 caracteres').fill(CLIENT_LOGIN.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page.getByRole('button', { name: 'Empezar entrenamiento' })).toBeVisible()
}

/** El cliente abre su pestaña Entreno y despliega el día para ver sus ejercicios. */
export async function verEjerciciosDelDia(page: Page) {
  await page.getByRole('button', { name: 'Entreno', exact: true }).click()
  await page.getByText('DÍA A — EMPUJE').click()
}
