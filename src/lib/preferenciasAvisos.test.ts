import { describe, it, expect } from 'vitest'
import { escalasBajas, limpiarPreferencias, quiereAviso } from './preferenciasAvisos'

describe('limpiarPreferencias', () => {
  it('sin nada guardado, todo activo', () => {
    expect(Object.values(limpiarPreferencias(undefined)).every(Boolean)).toBe(true)
  })
  it('solo apaga lo que está en false', () => {
    const p = limpiarPreferencias({ sesion: false, record: 'no', otro: false })
    expect(p.sesion).toBe(false)
    expect(p.record).toBe(true)
    expect('otro' in p).toBe(false)
  })
})

describe('quiereAviso', () => {
  it('respeta el tipo apagado; sin tipo o con uno desconocido, se manda', () => {
    expect(quiereAviso({ reserva: false }, 'reserva')).toBe(false)
    expect(quiereAviso({ reserva: false }, 'sesion')).toBe(true)
    expect(quiereAviso({ reserva: false }, undefined)).toBe(true)
    expect(quiereAviso({ reserva: false }, 'raro')).toBe(true)
  })
})

describe('escalasBajas', () => {
  it('las que valen 1 o 2', () => {
    expect(escalasBajas([{ label: 'Energía', valor: 2 }, { label: 'Sueño', valor: 4 }, { label: 'Estrés', valor: 1 }]))
      .toEqual(['Energía 2/5', 'Estrés 1/5'])
  })
})
