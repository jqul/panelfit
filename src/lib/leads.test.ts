import { describe, it, expect } from 'vitest'
import { whatsappDe, contactoDe, ordenarLeads, haceCuanto, saludoParaLead, type Lead } from './leads'

const lead = (id: string, status: string, created_at: number): Lead => ({ id, name: id, email: null, phone: null, message: null, status, created_at, referred_by_client_id: null })

describe('whatsappDe', () => {
  it('un móvil español de 9 cifras recibe el prefijo +34; con prefijo, se respeta', () => {
    expect(whatsappDe('622 11 22 33')).toBe('https://wa.me/34622112233')
    expect(whatsappDe('+34 622 11 22 33')).toBe('https://wa.me/34622112233')
    expect(whatsappDe('0034622112233')).toBe('https://wa.me/34622112233')
    expect(whatsappDe('+44 7700 900123')).toBe('https://wa.me/447700900123')
  })

  it('sin teléfono o con algo que no lo es, no hay enlace', () => {
    expect(whatsappDe(null)).toBeNull()
    expect(whatsappDe('  ')).toBeNull()
    expect(whatsappDe('abc')).toBeNull()
    expect(whatsappDe('12345')).toBeNull()
  })

  it('el texto va codificado', () => {
    expect(whatsappDe('622112233', 'Hola María & Co')).toBe('https://wa.me/34622112233?text=Hola%20Mar%C3%ADa%20%26%20Co')
  })
})

describe('contactoDe y ordenarLeads', () => {
  it('une lo que haya y queda vacío si no hay nada', () => {
    expect(contactoDe({ email: 'a@b.es', phone: '600' })).toBe('a@b.es · 600')
    expect(contactoDe({ email: null, phone: '600' })).toBe('600')
    expect(contactoDe({ email: null, phone: null })).toBe('')
  })

  it('los nuevos primero, luego contactados y descartados, y en cada grupo el más reciente arriba', () => {
    const l = [lead('d1', 'descartado', 50), lead('n1', 'nuevo', 10), lead('c1', 'contactado', 40), lead('n2', 'nuevo', 30)]
    expect(ordenarLeads(l).map(x => x.id)).toEqual(['n2', 'n1', 'c1', 'd1'])
  })
})

describe('haceCuanto', () => {
  const ahora = new Date('2026-10-28T12:00:00').getTime()
  it('minutos, horas, ayer y días', () => {
    expect(haceCuanto(ahora - 30_000, ahora)).toBe('ahora mismo')
    expect(haceCuanto(ahora - 25 * 60_000, ahora)).toBe('hace 25 min')
    expect(haceCuanto(ahora - 5 * 3600_000, ahora)).toBe('hace 5 h')
    expect(haceCuanto(ahora - 26 * 3600_000, ahora)).toBe('ayer')
    expect(haceCuanto(ahora - 4 * 86400_000, ahora)).toBe('hace 4 días')
  })
})

describe('saludoParaLead', () => {
  it('usa el nombre de pila del contacto', () => {
    expect(saludoParaLead('Paula Navarro', 'Javier')).toContain('Hola Paula, soy Javier.')
    expect(saludoParaLead('Paula')).toContain('soy tu entrenador')
  })
})
