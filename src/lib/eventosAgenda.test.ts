import { describe, it, expect } from 'vitest'
import { EVENTOS, esEvento, finEvento } from './eventosAgenda'

describe('eventos de la agenda', () => {
  it('reunión y personal ocupan el hueco; el recordatorio no', () => {
    expect(EVENTOS.reunion.ocupa).toBe(true)
    expect(EVENTOS.personal.ocupa).toBe(true)
    expect(EVENTOS.recordatorio.ocupa).toBe(false)
  })
  it('reconoce los tipos válidos', () => {
    expect(esEvento('reunion')).toBe(true)
    expect(esEvento('fiesta')).toBe(false)
    expect(esEvento(null)).toBe(false)
  })
  it('un recordatorio no dura; lo demás, la duración elegida', () => {
    const ini = new Date('2026-11-10T09:00:00Z')
    expect(finEvento(ini, 45, 'recordatorio').toISOString()).toBe('2026-11-10T09:00:00.000Z')
    expect(finEvento(ini, 45, 'reunion').toISOString()).toBe('2026-11-10T09:45:00.000Z')
    expect(finEvento(ini, 45, null).toISOString()).toBe('2026-11-10T09:45:00.000Z')
  })
})
