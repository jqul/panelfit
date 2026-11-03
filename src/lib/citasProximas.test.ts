import { describe, it, expect } from 'vitest'
import { citasProximas, type CitaLite } from './citasProximas'

const AHORA = new Date(2026, 10, 3, 12, 0) // 3 nov 2026, 12:00 local
const cita = (id: string, dia: number, h: number, status = 'confirmada', min = 60): CitaLite => {
  const ini = new Date(2026, 10, dia, h, 0)
  return { id, client_id: 'c', title: 'Sesión', start_at: ini.toISOString(), end_at: new Date(ini.getTime() + min * 60000).toISOString(), status }
}

describe('citasProximas', () => {
  it('las de hoy desde ahora (con la que está en curso) y las de mañana, en orden', () => {
    const r = citasProximas([
      cita('manana-9', 4, 9), cita('hoy-18', 3, 18), cita('hoy-9', 3, 9), cita('en-curso', 3, 11, 'confirmada', 90),
      cita('pasado-manana', 5, 10), cita('ayer', 2, 18),
    ], AHORA)
    expect(r.map(c => c.id)).toEqual(['en-curso', 'hoy-18', 'manana-9'])
    expect(r.map(c => c.dia)).toEqual(['hoy', 'hoy', 'manana'])
    expect(r[1].hora).toBe('18:00')
  })
  it('sin canceladas ni completadas; las pendientes sí', () => {
    const r = citasProximas([cita('c', 3, 15, 'cancelada'), cita('h', 3, 16, 'completada'), cita('p', 3, 17, 'pendiente')], AHORA)
    expect(r.map(c => c.id)).toEqual(['p'])
  })
})
