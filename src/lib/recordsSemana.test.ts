import { describe, it, expect } from 'vitest'
import { lunesDe, recordsDeLaSemana } from './recordsSemana'

const log = (fecha: string, nombre: string, kg: number) => ({ done: true, dateDone: fecha, substituteName: nombre, sets: { 0: { weight: String(kg), reps: '5' } } })

describe('récords de la semana', () => {
  it('lunes de la semana', () => {
    expect(lunesDe('2026-11-14')).toBe('2026-11-09') // sábado → lunes
    expect(lunesDe('2026-11-09')).toBe('2026-11-09')
  })
  it('solo los de esta semana que superan lo de antes, de más a menos %', () => {
    const logsMap = {
      a: { x1: log('2026-11-02', 'Sentadilla', 100), x2: log('2026-11-11', 'Sentadilla', 110), x3: log('2026-11-12', 'Peso muerto', 150) }, // PM: primera vez
      b: { y1: log('2026-11-03', 'Press banca', 60), y2: log('2026-11-10', 'Press banca', 70), y3: log('2026-11-04', 'Remo', 70), y4: log('2026-11-10', 'Remo', 65) },
    }
    const r = recordsDeLaSemana([{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Beto', surname: 'Ruiz' }], logsMap, {}, '2026-11-14')
    expect(r.map(x => [x.nombre, x.ejercicio, x.fecha])).toEqual([['Beto Ruiz', 'Press banca', '2026-11-10'], ['Ana', 'Sentadilla', '2026-11-11']])
    expect(r[1]).toMatchObject({ antes: 116.7, ahora: 128.3 })
  })
})
