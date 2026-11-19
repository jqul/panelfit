import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  estadoEnlace, textoUsos, textoCaducidad, hayAlarmaParq, filasParq, slugDeRuta, urlProgramacion, respuestasParaEnvio, filasRespuestas,
  planBorradorDe, notasDeSolicitud, MENSAJE_RECIBIDA, MENSAJE_REVISAR, CONSENT_ASISTENTE_PROGRAMACION, CONSENT_SALUD_PROGRAMACION, AVISO_NO_MEDICO,
  PREGUNTAS_PROGRAMACION, type EnlaceProgramacion,
} from './solicitudProgramacion'
import { esNuevo, ordenarLeads, type Lead } from './leads'

const ahora = new Date('2026-11-20T10:00:00Z').getTime()
const enlace = (o: Partial<EnlaceProgramacion> = {}) => ({ activo: true, caduca_en: null, usos: 0, un_solo_uso: false, max_usos: null, ...o })

describe('estadoEnlace', () => {
  it('activo, revocado, caducado y agotado (igual que la base de datos)', () => {
    expect(estadoEnlace(enlace(), ahora)).toBe('activo')
    expect(estadoEnlace(enlace({ activo: false }), ahora)).toBe('revocado')
    expect(estadoEnlace(enlace({ caduca_en: '2026-11-20T09:59:00Z' }), ahora)).toBe('caducado')
    expect(estadoEnlace(enlace({ caduca_en: '2026-11-25T00:00:00Z' }), ahora)).toBe('activo')
    expect(estadoEnlace(enlace({ max_usos: 3, usos: 3 }), ahora)).toBe('agotado')
    expect(estadoEnlace(enlace({ max_usos: 3, usos: 2 }), ahora)).toBe('activo')
    expect(estadoEnlace(enlace({ un_solo_uso: true, usos: 1 }), ahora)).toBe('agotado')
  })
  it('revocado manda sobre lo demás', () => {
    expect(estadoEnlace(enlace({ activo: false, usos: 9, max_usos: 3, caduca_en: '2020-01-01T00:00:00Z' }), ahora)).toBe('revocado')
  })
  it('los textos de usos y caducidad', () => {
    expect(textoUsos(enlace({ usos: 1 }))).toBe('1 uso')
    expect(textoUsos(enlace({ usos: 3, max_usos: 10 }))).toBe('3 de 10 usos')
    expect(textoUsos(enlace({ usos: 0, un_solo_uso: true }))).toBe('0 de 1 uso')
    expect(textoCaducidad({ caduca_en: null }, ahora)).toBe('Sin caducidad')
    expect(textoCaducidad({ caduca_en: '2026-12-04T10:00:00Z' }, ahora)).toBe('Caduca en 14 días')
  })
})

describe('la URL del enlace', () => {
  const slug = 'a'.repeat(32)
  it('solo una ruta con 32 hexadecimales consulta algo', () => {
    expect(slugDeRuta(`/programacion/${slug}`)).toBe(slug)
    expect(slugDeRuta(`/programacion/${slug}/`)).toBe(slug)
    expect(slugDeRuta('/programacion/hola')).toBeNull()
    expect(slugDeRuta(`/programacion/${slug.toUpperCase()}`)).toBeNull()
    expect(slugDeRuta(`/programacion/${slug}x`)).toBeNull()
    expect(urlProgramacion('https://panelfit.app', slug)).toBe(`https://panelfit.app/programacion/${slug}`)
  })
})

describe('PAR-Q', () => {
  const parq = (...si: number[]) => Array.from({ length: 7 }, (_, i) => si.includes(i))
  it('las cuatro primeras preguntas son alarma; las demás las lee el entrenador pero no paran', () => {
    for (const i of [0, 1, 2, 3]) expect(hayAlarmaParq(parq(i))).toBe(true)
    for (const i of [4, 5, 6]) expect(hayAlarmaParq(parq(i))).toBe(false)
    expect(hayAlarmaParq(parq())).toBe(false)
    expect(hayAlarmaParq(null)).toBe(false)
  })
  it('las filas marcan solo las de alarma contestadas que sí', () => {
    const f = filasParq(parq(1, 5))
    expect(f).toHaveLength(7)
    expect(f.filter(x => x.alarma).map(x => x.pregunta)).toEqual([f[1].pregunta])
    expect(f[5].respuesta).toBe('Sí')
    expect(filasParq(null)).toEqual([])
  })
})

describe('textos públicos', () => {
  it('no prometen IA, automatismos ni plazos', () => {
    for (const t of [MENSAJE_RECIBIDA, MENSAJE_REVISAR, CONSENT_ASISTENTE_PROGRAMACION, CONSENT_SALUD_PROGRAMACION, AVISO_NO_MEDICO]) {
      expect(t).not.toMatch(/\bIA\b|inteligencia|autom[aá]tic|horas|d[ií]as/i)
    }
    expect(MENSAJE_RECIBIDA).toBe('Tu entrenador revisará tu solicitud y preparará una propuesta personalizada.')
    expect(MENSAJE_REVISAR).toBe('Tu solicitud necesita revisión personal del entrenador antes de programar.')
  })
})

describe('respuestas', () => {
  it('se envía solo lo contestado y del modelo (el 0 y el «No» cuentan)', () => {
    const r = respuestasParaEnvio({ objetivo: 'Ganar músculo', molestias: false, estres: 0, extra: '', material: [], inventada: 'x' })
    expect(r).toEqual({ objetivo: 'Ganar músculo', molestias: false, estres: 0 })
  })
  it('las filas salen legibles y en el orden del modelo', () => {
    const f = filasRespuestas({ dias: '3', objetivo: 'Ganar fuerza', peso: 78.5, molestias: true })
    expect(f.map(x => x.respuesta)).toEqual(['Ganar fuerza', '3', 'Sí', '78,5 kg'])
  })
})

describe('el modelo y la base de datos hablan de las mismas preguntas', () => {
  // La función SQL limpiar_respuestas_programacion lista las preguntas: si cambias el modelo, cambia la migración (y al revés).
  const sql = readFileSync('supabase/migrations/20261118000020_solicitud_programacion_inicial.sql', 'utf8')
  const filas = [...sql.matchAll(/\('([a-z_]+)',\s+'(choice|text|multi|yesno|number|scale)',\s+(true|false),\s+(true|false),/g)].map(m => ({ id: m[1], tipo: m[2], obligatoria: m[4] === 'true' }))
  it('mismos ids, mismo tipo y mismas obligatorias', () => {
    expect(filas.map(f => f.id)).toEqual(PREGUNTAS_PROGRAMACION.map(q => q.id))
    expect(filas.map(f => f.tipo)).toEqual(PREGUNTAS_PROGRAMACION.map(q => q.type))
    expect(filas.filter(f => f.obligatoria).map(f => f.id)).toEqual(PREGUNTAS_PROGRAMACION.filter(q => q.required).map(q => q.id))
  })
})

describe('borrador y conversión', () => {
  it('solo un borrador aprobado y con semanas se convierte en plan del cliente', () => {
    const propuesta = { weeks: [{ days: [] }] }
    expect(planBorradorDe({ borrador_estado: 'aprobado', propuesta }, 'c1')).toEqual({ weeks: [{ days: [] }], clientId: 'c1' })
    expect(planBorradorDe({ borrador_estado: 'listo_para_revisar', propuesta }, 'c1')).toBeNull()
    expect(planBorradorDe({ borrador_estado: 'sin_generar', propuesta: null }, 'c1')).toBeNull()
    expect(planBorradorDe({ borrador_estado: 'aprobado', propuesta: { weeks: [] } }, 'c1')).toBeNull()
    expect(planBorradorDe(null, 'c1')).toBeNull()
  })
  it('a las notas del cliente solo pasa el contacto y de dónde viene: nada de salud ni del mensaje interno', () => {
    const n = notasDeSolicitud({ email: 'a@b.es', phone: '600 11 22 33', created_at: ahora })
    expect(n).toContain('Solicitud de programación inicial')
    expect(n).toContain('a@b.es')
    expect(n).not.toMatch(/revisi[oó]n|PAR-Q|salud/i)
  })
})

describe('estados del lead en la bandeja', () => {
  const lead = (id: string, status: string, created_at: number): Lead => ({ id, name: id, email: null, phone: null, message: null, status, created_at, referred_by_client_id: null })
  it('«a revisar» cuenta como esperando y va el primero', () => {
    expect(esNuevo(lead('a', 'revisar', 1))).toBe(true)
    expect(esNuevo(lead('a', 'borrador_listo', 1))).toBe(false)
    const orden = ordenarLeads([lead('conv', 'convertido', 9), lead('nuevo', 'nuevo', 5), lead('rev', 'revisar', 1), lead('borr', 'borrador_listo', 3)])
    expect(orden.map(l => l.id)).toEqual(['rev', 'nuevo', 'borr', 'conv'])
  })
})
