import { describe, it, expect, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))

import { evaluateConsent } from './consent'
import { CONSENT_VERSION } from './privacyTexts'

const fila = (over: Partial<{ version: string; salud: boolean; fotos: boolean }> = {}) =>
  ({ version: CONSENT_VERSION, salud: true, fotos: false, accepted_at: '2026-10-23T10:00:00Z', ...over })

describe('evaluateConsent', () => {
  it('sin consentimiento hay que pedirlo', () => {
    expect(evaluateConsent(null)).toEqual({ status: 'needed', fotos: false })
  })
  it('consentimiento vigente: pasa, y las fotos solo si las autorizó', () => {
    expect(evaluateConsent(fila())).toEqual({ status: 'ok', fotos: false })
    expect(evaluateConsent(fila({ fotos: true }))).toEqual({ status: 'ok', fotos: true })
  })
  it('si cambia la versión de los textos se vuelve a pedir', () => {
    expect(evaluateConsent(fila({ version: '2020-01' })).status).toBe('needed')
  })
  it('retirado: no se guardan datos de salud ni fotos', () => {
    expect(evaluateConsent(fila({ salud: false, fotos: true }))).toEqual({ status: 'withdrawn', fotos: false })
  })
})
