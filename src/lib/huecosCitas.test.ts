import { describe, it, expect } from 'vitest'
import { huecosLibres, limpiarFranjas, type HorarioCitas } from './huecosCitas'

// Lunes 2 nov 2026; horario: lunes 9:00–12:00 y miércoles 16:00–18:00, citas de 60 min
const base: HorarioCitas = { franjas: [{ dia: 0, desde: '09:00', hasta: '12:00' }, { dia: 2, desde: '16:00', hasta: '18:00' }], duracion_min: 60, margen_min: 0, antelacion_horas: 0 }
const antes = new Date(2026, 10, 1, 10) // domingo 1 nov, 10:00
const horas = (h: ReturnType<typeof huecosLibres>) => h.map(x => `${x.fecha} ${x.hora}`)

describe('huecosLibres', () => {
  it('un hueco cada duración dentro de cada franja, en sus días', () => {
    expect(horas(huecosLibres(base, [], '2026-11-02', 7, antes))).toEqual([
      '2026-11-02 09:00', '2026-11-02 10:00', '2026-11-02 11:00', '2026-11-04 16:00', '2026-11-04 17:00',
    ])
  })

  it('con margen entre citas, el siguiente empieza después del margen; lo que no cabe entero no sale', () => {
    expect(horas(huecosLibres({ ...base, margen_min: 30 }, [], '2026-11-02', 1, antes))).toEqual(['2026-11-02 09:00', '2026-11-02 10:30'])
  })

  it('lo ocupado (con su margen) no se ofrece', () => {
    const ocupado = [{ inicio: new Date(2026, 10, 2, 10).toISOString(), fin: new Date(2026, 10, 2, 11).toISOString() }]
    expect(horas(huecosLibres(base, ocupado, '2026-11-02', 1, antes))).toEqual(['2026-11-02 09:00', '2026-11-02 11:00'])
    expect(horas(huecosLibres({ ...base, margen_min: 15 }, ocupado, '2026-11-02', 1, antes))).toEqual([])
  })

  it('respeta la antelación mínima', () => {
    const ahora = new Date(2026, 10, 2, 8, 30)
    expect(horas(huecosLibres({ ...base, antelacion_horas: 2 }, [], '2026-11-02', 1, ahora))).toEqual(['2026-11-02 11:00'])
  })
})

describe('limpiarFranjas', () => {
  it('solo franjas bien escritas, ordenadas', () => {
    expect(limpiarFranjas([{ dia: 2, desde: '16:00', hasta: '18:00' }, { dia: 0, desde: '09:00', hasta: '08:00' }, { dia: 7, desde: '09:00', hasta: '10:00' }, { dia: 0, desde: '9:00', hasta: '10:00' }, { dia: 0, desde: '09:00', hasta: '12:00' }]))
      .toEqual([{ dia: 0, desde: '09:00', hasta: '12:00' }, { dia: 2, desde: '16:00', hasta: '18:00' }])
  })
})
