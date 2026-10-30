import { describe, it, expect } from 'vitest'
import { mensajesAEnviar, sumarDias, MAX_POR_CLIENTE, type MensajePendiente } from '../../supabase/functions/enviar-mensajes-programados/seleccion'

const m = (id: string, clientId: string, fechaEnvio: string): MensajePendiente => ({ id, clientId, mensaje: `msg ${id}`, fechaEnvio })
const HOY = '2026-11-02'

describe('sumarDias', () => {
  it('suma y resta días sin pasar por la zona horaria, también al cambiar de mes y de año', () => {
    expect(sumarDias('2026-11-02', -3)).toBe('2026-10-30')
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('mensajesAEnviar', () => {
  it('envía los que tocan hoy o antes a clientes con push, y no los futuros', () => {
    const s = mensajesAEnviar([m('a', 'c1', HOY), m('b', 'c1', '2026-11-03')], new Set(['c1']), HOY)
    expect(s.enviar.map(x => x.id)).toEqual(['a'])
  })
  it('un cliente sin suscripción no recibe y no se pierde: se cuenta aparte', () => {
    const s = mensajesAEnviar([m('a', 'c1', HOY)], new Set(), HOY)
    expect(s.enviar).toEqual([])
    expect(s.sinSuscripcion).toBe(1)
  })
  it('lo demasiado atrasado no se envía', () => {
    const s = mensajesAEnviar([m('viejo', 'c1', '2026-10-29'), m('limite', 'c1', '2026-10-30')], new Set(['c1']), HOY)
    expect(s.enviar.map(x => x.id)).toEqual(['limite'])
    expect(s.atrasados).toBe(1)
  })
  it('con más mensajes que el tope manda los más recientes', () => {
    const msgs = ['2026-10-31', '2026-11-01', '2026-11-02', '2026-11-02'].map((f, i) => m(`m${i}`, 'c1', f))
    const s = mensajesAEnviar(msgs, new Set(['c1']), HOY)
    expect(s.enviar).toHaveLength(MAX_POR_CLIENTE)
    expect(s.enviar.map(x => x.id)).toEqual(['m1', 'm2', 'm3'])
  })
  it('el tope es por cliente', () => {
    const s = mensajesAEnviar([m('a', 'c1', HOY), m('b', 'c2', HOY)], new Set(['c1', 'c2']), HOY)
    expect(s.enviar.map(x => x.id).sort()).toEqual(['a', 'b'])
  })
})
