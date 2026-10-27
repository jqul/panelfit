import { describe, it, expect, beforeAll, vi } from 'vitest'
import { avisarCambioHoy, alCambiarHoy, estadoHoy } from './hoyEventos'

// Las pruebas corren en Node: basta un EventTarget como `window` para los avisos entre bloques.
beforeAll(() => { (globalThis as any).window = new EventTarget() })

describe('estado de Hoy compartido entre bloques', () => {
  it('cada aviso se suma a lo que ya se sabía, sin borrar lo de otros bloques', () => {
    avisarCambioHoy('c1', { checkinHecho: false })
    avisarCambioHoy('c1', { habitos: { hechos: 1, total: 4 } })
    expect(estadoHoy('c1')).toEqual({ checkinHecho: false, habitos: { hechos: 1, total: 4 } })
    avisarCambioHoy('c1', { checkinHecho: true })
    expect(estadoHoy('c1').checkinHecho).toBe(true)
    expect(estadoHoy('c1').habitos).toEqual({ hechos: 1, total: 4 })
  })

  it('solo se entera quien escucha a ese cliente, y deja de enterarse al soltarlo', () => {
    const fn = vi.fn()
    const soltar = alCambiarHoy('c2', fn)
    avisarCambioHoy('otro', { citaHoy: '10:00' })
    expect(fn).not.toHaveBeenCalled()
    avisarCambioHoy('c2', { citaHoy: '09:00' })
    expect(fn).toHaveBeenCalledWith({ citaHoy: '09:00' })
    soltar()
    avisarCambioHoy('c2', { citaHoy: null })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('un cliente sin avisos no tiene nada que enseñar', () => {
    expect(estadoHoy('nadie')).toEqual({})
  })
})
