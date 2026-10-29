import { describe, it, expect } from 'vitest'
import { whatsappDe, contactoDe, ordenarLeads, haceCuanto, saludoParaLead, partirNombre, notasDeLead, validarContacto, llevaEsperando, textoEspera, type Lead } from './leads'

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

  it('los nuevos primero, luego contactados, clientes y descartados, y en cada grupo el más reciente arriba', () => {
    const l = [lead('d1', 'descartado', 50), lead('v1', 'convertido', 45), lead('n1', 'nuevo', 10), lead('c1', 'contactado', 40), lead('n2', 'nuevo', 30)]
    expect(ordenarLeads(l).map(x => x.id)).toEqual(['n2', 'n1', 'c1', 'v1', 'd1'])
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

describe('alta de cliente desde un contacto', () => {
  it('parte el nombre en nombre y apellido', () => {
    expect(partirNombre('Paula Navarro Ruiz')).toEqual({ name: 'Paula', surname: 'Navarro Ruiz' })
    expect(partirNombre('  Paula ')).toEqual({ name: 'Paula', surname: '' })
    expect(partirNombre('')).toEqual({ name: '', surname: '' })
  })

  it('las notas llevan el correo, el teléfono, quién lo refirió y lo que escribió, solo lo que haya', () => {
    const n = notasDeLead({ email: 'p@x.es', phone: '622', message: 'Quiero fuerza', created_at: new Date('2026-10-28T10:00:00').getTime(), referrerName: 'Carlos López' })
    expect(n).toContain('Contacto desde la página pública (28 de octubre de 2026).')
    expect(n).toContain('Correo: p@x.es')
    expect(n).toContain('Teléfono: 622')
    expect(n).toContain('Referido por Carlos López.')
    expect(n).toContain('Mensaje: «Quiero fuerza»')
    const minimo = notasDeLead({ email: null, phone: null, message: null, created_at: Date.now() })
    expect(minimo.split('\n')).toHaveLength(1)
  })
})

describe('validarContacto', () => {
  it('un correo o un teléfono válidos pasan (el correo en minúsculas)', () => {
    expect(validarContacto(' Paula@Example.COM ')).toEqual({ ok: true, email: 'paula@example.com', phone: null })
    expect(validarContacto('+34 622 11 22 33')).toEqual({ ok: true, email: null, phone: '+34 622 11 22 33' })
    expect(validarContacto('622112233')).toEqual({ ok: true, email: null, phone: '622112233' })
  })

  it('vacío o con basura no pasa, y dice por qué', () => {
    expect(validarContacto('')).toMatchObject({ ok: false, error: expect.stringContaining('correo o un teléfono') })
    expect(validarContacto('paula@')).toMatchObject({ ok: false, error: 'El correo no parece válido' })
    expect(validarContacto('a b@c.es')).toMatchObject({ ok: false, error: 'El correo no parece válido' })
    expect(validarContacto('123')).toMatchObject({ ok: false, error: 'El teléfono no parece válido' })
    expect(validarContacto('hola que tal')).toMatchObject({ ok: false, error: 'El teléfono no parece válido' })
    expect(validarContacto('1234567890123456789')).toMatchObject({ ok: false }) // demasiadas cifras
  })
})

describe('contactos que llevan esperando', () => {
  const ahora = new Date('2026-10-29T12:00:00').getTime()
  const h = (horas: number, status = 'nuevo') => ({ status, created_at: ahora - horas * 3600000 })

  it('solo un contacto nuevo con más de 24 h cuenta como "esperando"', () => {
    expect(llevaEsperando(h(23), ahora)).toBe(false)
    expect(llevaEsperando(h(25), ahora)).toBe(true)
    expect(llevaEsperando(h(100, 'contactado'), ahora)).toBe(false)
    expect(llevaEsperando(h(100, 'descartado'), ahora)).toBe(false)
  })

  it('el texto dice cuánto lleva, y nada si aún no toca', () => {
    expect(textoEspera(h(5), ahora)).toBe('')
    expect(textoEspera(h(30), ahora)).toBe('Lleva más de un día sin contestar')
    expect(textoEspera(h(80), ahora)).toBe('Lleva 3 días sin contestar')
  })
})
