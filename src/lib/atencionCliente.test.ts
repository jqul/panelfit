import { describe, it, expect } from 'vitest'
import { construirAtencion, diasDesde, type EntradaAtencion } from './atencionCliente'

const nada: EntradaAtencion = { dolor: [], checkin: null, videosPendientes: 0, diasSinEntrenar: null, recordatorios: { pendientes: 0, vencidos: 0 } }

describe('construirAtencion', () => {
  it('si no hay nada accionable, no devuelve nada (y la tarjeta no se pinta)', () => {
    expect(construirAtencion(nada)).toEqual([])
    expect(construirAtencion({ ...nada, checkin: { sleep: 4, soreness: 4, motivation: 5 }, diasSinEntrenar: 3 })).toEqual([])
  })

  it('molestia articular: la más fuerte, con el sitio donde verla; las agujetas y lo leve no cuentan', () => {
    const r = construirAtencion({ ...nada, dolor: [{ zona: 'Hombro', intensidad: 5, tipo: 'articular' }, { zona: 'Rodilla', intensidad: 8, tipo: 'articular' }, { zona: 'Cuádriceps', intensidad: 9, tipo: 'doms' }, { zona: 'Codo', intensidad: 2 }] })
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ kind: 'dolor', texto: 'Molestia en Rodilla (8/10) y 1 más', urgente: true, destino: { tab: 'progreso', seccion: 'dolor' } })
    expect(construirAtencion({ ...nada, dolor: [{ zona: 'Hombro', intensidad: 5 }] })[0].urgente).toBe(false)
    expect(construirAtencion({ ...nada, dolor: [{ zona: 'Cuádriceps', intensidad: 9, tipo: 'doms' }, { zona: 'Codo', intensidad: 2 }] })).toEqual([])
  })

  it('check-in bajo: dice qué escalas están bajas', () => {
    const r = construirAtencion({ ...nada, checkin: { sleep: 1, soreness: 4, motivation: 2 } })
    expect(r[0]).toMatchObject({ kind: 'checkin', destino: { tab: 'progreso', seccion: 'fatiga' } })
    expect(r[0].texto).toContain('sueño 1/5')
    expect(r[0].texto).toContain('energía 2/5')
  })

  it('vídeos, sesiones sin hacer y recordatorios, cada uno con su destino', () => {
    const r = construirAtencion({ ...nada, videosPendientes: 2, diasSinEntrenar: 9, recordatorios: { pendientes: 3, vencidos: 1 } })
    expect(r.map(i => i.kind)).toEqual(['video', 'sesion', 'recordatorio'])
    expect(r[0]).toMatchObject({ texto: '2 vídeos esperan tu feedback', destino: { tab: 'progreso', seccion: 'videos' } })
    expect(r[1]).toMatchObject({ texto: 'Lleva 9 días sin entrenar', destino: { tab: 'entrenos' } })
    expect(r[2]).toMatchObject({ texto: '3 recordatorios pendientes (1 vencido)', destino: { tab: 'perfil', seccion: 'recordatorios' }, urgente: true })
  })

  it('el singular se escribe bien y 7 días justos ya cuentan, 6 no', () => {
    expect(construirAtencion({ ...nada, videosPendientes: 1 })[0].texto).toBe('1 vídeo espera tu feedback')
    expect(construirAtencion({ ...nada, recordatorios: { pendientes: 1, vencidos: 0 } })[0].texto).toBe('1 recordatorio pendiente')
    expect(construirAtencion({ ...nada, diasSinEntrenar: 7 })).toHaveLength(1)
    expect(construirAtencion({ ...nada, diasSinEntrenar: 6 })).toHaveLength(0)
  })

  it('sin plan o sin haber entrenado nunca (null) no hay «sesión perdida»', () => {
    expect(construirAtencion({ ...nada, diasSinEntrenar: null })).toEqual([])
  })
})

describe('diasDesde', () => {
  it('días enteros hasta hoy, y null si no hay última', () => {
    expect(diasDesde('2026-11-08', '2026-11-17')).toBe(9)
    expect(diasDesde('2026-11-17', '2026-11-17')).toBe(0)
    expect(diasDesde(null, '2026-11-17')).toBeNull()
  })
})
