import { describe, it, expect } from 'vitest'
import { avisoFinSesion } from './avisoEntrenador'

describe('avisoFinSesion', () => {
  it('con récords, el aviso es de récord (aunque no lo haya hecho todo)', () => {
    expect(avisoFinSesion({ nombre: 'Ana', dia: 'Día A', completa: false, records: [{ name: 'Press banca', best: 85 }, { name: 'Remo', best: 72.5 }] }))
      .toEqual({ titulo: '🏆 Ana ha batido 2 récords', cuerpo: 'Press banca 85 kg · Remo 72,5 kg' })
    expect(avisoFinSesion({ nombre: 'Ana', dia: 'Día A', completa: true, records: [{ name: 'Sentadilla', best: 120 }] })!.titulo).toBe('🏆 Ana ha batido un récord')
  })
  it('más de tres récords: los tres primeros y cuántos más', () => {
    const r = [1, 2, 3, 4, 5].map(i => ({ name: `E${i}`, best: i * 10 }))
    expect(avisoFinSesion({ nombre: 'Ana', dia: 'Día A', completa: true, records: r })!.cuerpo).toBe('E1 10 kg · E2 20 kg · E3 30 kg y 2 más')
  })
  it('sin récords: sesión completada con el nombre, o nada si no la terminó entera', () => {
    expect(avisoFinSesion({ nombre: 'Ana', dia: 'Día A', completa: true, records: [] })).toEqual({ titulo: 'Sesión completada 💪', cuerpo: 'Ana: Día A terminado' })
    expect(avisoFinSesion({ dia: 'Día A', completa: true, records: [] })!.cuerpo).toBe('Tu cliente: Día A terminado')
    expect(avisoFinSesion({ nombre: 'Ana', dia: 'Día A', completa: false, records: [] })).toBeNull()
  })
})
