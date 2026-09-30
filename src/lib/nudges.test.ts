import { describe, it, expect } from 'vitest'
import { getNudge, getConsejo, OBJETIVOS, Objetivo } from './nudges'

const ctx = { clientName: 'Marta', diasSinEntrenar: 5, racha: 3, adherencia: 80, url: 'https://panelfit.app/x' }

describe('getNudge', () => {
  it('fills in the template placeholders for every objetivo/tipo combination', () => {
    const objetivos = OBJETIVOS.map(o => o.value)
    for (const objetivo of objetivos) {
      for (const tipo of ['recordatorio', 'felicitacion', 'checkin'] as const) {
        const msg = getNudge(tipo, objetivo, ctx)
        expect(msg).toContain('Marta')
        expect(msg).not.toMatch(/\{(name|dias|racha|url)\}/)
      }
    }
  })

  it('includes the dias count for recordatorio messages', () => {
    const msg = getNudge('recordatorio', 'fuerza', ctx)
    expect(msg).toContain('5')
  })
})

describe('getConsejo', () => {
  it('returns a non-empty tip for every objetivo', () => {
    const objetivos: Objetivo[] = OBJETIVOS.map(o => o.value)
    for (const objetivo of objetivos) {
      expect(getConsejo(objetivo).length).toBeGreaterThan(0)
    }
  })
})
