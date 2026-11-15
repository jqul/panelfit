import { describe, it, expect } from 'vitest'
import { datosHistoria, textoHistoria } from './historiaExito'
import type { TrainingLogs } from '../types'

const log = (fecha: string, nombre: string, kg: number) => ({ done: true, dateDone: fecha, substituteName: nombre, sets: { 0: { weight: String(kg), reps: '5' } } })

describe('historia de éxito', () => {
  const logs: TrainingLogs = {
    a: log('2026-08-03', 'Sentadilla', 60), b: log('2026-11-02', 'Sentadilla', 90),
    c: log('2026-08-05', 'Press banca', 40), d: log('2026-11-04', 'Press banca', 50),
    e: log('2026-08-07', 'Remo', 50), f: log('2026-11-06', 'Remo', 45), // baja: no sale
  }
  it('semanas, sesiones, las mejoras (de más a menos %) y el peso', () => {
    const d = datosHistoria(logs, null, [{ date: '2026-08-01', weight: 72 }, { date: '2026-11-01', weight: 68.4 }], '2026-11-09')!
    expect(d).toMatchObject({ semanas: 14, sesiones: 6, peso: { antes: 72, ahora: 68.4 } })
    expect(d.mejoras.map(m => m.name)).toEqual(['Sentadilla', 'Press banca'])
    expect(d.mejoras[0]).toEqual({ name: 'Sentadilla', antes: 70, ahora: 105 })
  })
  it('sin entrenos, nada; con un cambio de peso mínimo, sin peso', () => {
    expect(datosHistoria({}, null, [], '2026-11-09')).toBeNull()
    expect(datosHistoria(logs, null, [{ date: '2026-08-01', weight: 70 }, { date: '2026-11-01', weight: 70.2 }], '2026-11-09')!.peso).toBeNull()
  })
  it('texto para compartir', () => {
    const d = datosHistoria(logs, null, [], '2026-11-09')!
    expect(textoHistoria(d, 'María', 'DURISIMO')).toBe('⭐ María: 14 semanas y 6 entrenos\n📈 Sentadilla: 70 → 105 kg (+50 %)\n📈 Press banca: 46,7 → 58,3 kg (+25 %)\nEntrena con DURISIMO')
  })
})
