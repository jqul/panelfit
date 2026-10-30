import { describe, it, expect } from 'vitest'
import { estadoBono, usadasPorBono, ordenarBonos } from './bonos'

const HOY = '2026-10-30'
const b = (id: string, sesiones: number, caduca: string | null = null) => ({ id, nombre: id, sesiones, caduca })

describe('bonos', () => {
  it('cuenta las citas no canceladas de cada bono', () => {
    expect(usadasPorBono([{ bono_id: 'a', status: 'confirmada' }, { bono_id: 'a', status: 'cancelada' }, { bono_id: 'a', status: 'completada' }, { bono_id: null, status: 'confirmada' }]))
      .toEqual({ a: 2 })
  })
  it('activo, agotado o caducado', () => {
    expect(estadoBono(b('a', 10), 4, HOY)).toEqual({ usadas: 4, quedan: 6, estado: 'activo' })
    expect(estadoBono(b('a', 10), 10, HOY).estado).toBe('agotado')
    expect(estadoBono(b('a', 10, '2026-10-29'), 2, HOY).estado).toBe('caducado')
    expect(estadoBono(b('a', 10, HOY), 2, HOY).estado).toBe('activo') // el día que caduca todavía vale
  })
  it('los activos primero, el que caduca antes delante', () => {
    const lista = [b('sin', 10), b('viejo', 5, '2026-01-01'), b('pronto', 5, '2026-11-15'), b('lleno', 5)]
    expect(ordenarBonos(lista, { lleno: 5 }, HOY).map(x => x.id)).toEqual(['pronto', 'sin', 'lleno', 'viejo'])
  })
})
