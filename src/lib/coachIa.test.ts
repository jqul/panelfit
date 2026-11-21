import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  MOTIVOS, MOTIVOS_CLINICOS, POLITICA_COACH_IA, RESPUESTAS_PARA_IA, TEXTO_MOTIVO, estadoCasoIa, motivoRevision, resumenPropuesta, textoDatosEntregados, totalEjercicios,
} from './coachIa'
import { CONSENT_ASISTENTE_PROGRAMACION, IDS_SALUD, PREGUNTAS_PROGRAMACION } from './solicitudProgramacion'

const limpio = {
  client_id: null as string | null, consentimiento_salud: true, consentimiento_asistente: true, parq_alarma: false,
  parq: [false, false, false, false, false, false, false] as (boolean | null)[] | null,
  respuestas: { molestias: false, edad: 30 } as Record<string, unknown>,
}

describe('motivoRevision (reflejo de coach_ia_motivo_revision)', () => {
  it('un caso limpio es apto', () => expect(motivoRevision(limpio)).toBeNull())
  it('ya es cliente, sin consentimientos', () => {
    expect(motivoRevision({ ...limpio, client_id: 'c1' })).toBe('ya_es_cliente')
    expect(motivoRevision({ ...limpio, consentimiento_salud: false })).toBe('sin_consentimiento_salud')
    expect(motivoRevision({ ...limpio, consentimiento_asistente: false })).toBe('sin_consentimiento_asistente')
  })
  it('la alarma del PAR-Q manda sobre un «sí» cualquiera', () => {
    expect(motivoRevision({ ...limpio, parq_alarma: true, parq: [false, true, false, false, false, false, false] })).toBe('alarma_parq')
  })
  it('cualquier «sí» del PAR-Q (también articular, medicación u otra razón) lo ve una persona', () => {
    for (let i = 0; i < 7; i++) {
      const parq = Array.from({ length: 7 }, (_, j) => j === i)
      expect(motivoRevision({ ...limpio, parq })).toBe('parq_con_si')
    }
  })
  it('PAR-Q ausente o incompleto: datos incompletos', () => {
    expect(motivoRevision({ ...limpio, parq: null })).toBe('datos_incompletos')
    expect(motivoRevision({ ...limpio, parq: [false, false] })).toBe('datos_incompletos')
  })
  it('molestias sin contestar, con molestias, o contradictorias', () => {
    expect(motivoRevision({ ...limpio, respuestas: { edad: 30 } })).toBe('datos_incompletos')
    expect(motivoRevision({ ...limpio, respuestas: { molestias: true, edad: 30 } })).toBe('molestias')
    expect(motivoRevision({ ...limpio, respuestas: { molestias: false, molestias_detalle: 'Rodilla', edad: 30 } })).toBe('datos_contradictorios')
    expect(motivoRevision({ ...limpio, respuestas: { molestias: false, molestias_detalle: '   ', edad: 30 } })).toBeNull()
  })
  it('menor de 18 o sin edad', () => {
    expect(motivoRevision({ ...limpio, respuestas: { molestias: false, edad: 17 } })).toBe('edad')
    expect(motivoRevision({ ...limpio, respuestas: { molestias: false } })).toBe('edad')
    expect(motivoRevision({ ...limpio, respuestas: { molestias: false, edad: 18 } })).toBeNull()
  })
  it('todos los motivos tienen texto y los clínicos son un subconjunto', () => {
    for (const m of MOTIVOS) expect(TEXTO_MOTIVO[m].length).toBeGreaterThan(10)
    for (const m of MOTIVOS_CLINICOS) expect(MOTIVOS).toContain(m)
  })
})

describe('estadoCasoIa', () => {
  const base = { ...limpio, borrador_estado: 'sin_generar' as const }
  it('apto sin borrador: listo para preparar', () => expect(estadoCasoIa(base)).toEqual({ tipo: 'listo_para_preparar' }))
  it('un motivo clínico es «requiere revisión» y uno administrativo, «sin caso»', () => {
    expect(estadoCasoIa({ ...base, parq: [true, false, false, false, false, false, false], parq_alarma: true })).toEqual({ tipo: 'requiere_revision', motivo: 'alarma_parq' })
    expect(estadoCasoIa({ ...base, consentimiento_asistente: false })).toEqual({ tipo: 'sin_caso', motivo: 'sin_consentimiento_asistente' })
    expect(estadoCasoIa({ ...base, client_id: 'c1' })).toEqual({ tipo: 'sin_caso', motivo: 'ya_es_cliente' })
  })
  it('el estado del borrador manda: listo y aprobado se enseñan tal cual', () => {
    expect(estadoCasoIa({ ...base, borrador_estado: 'listo_para_revisar' })).toEqual({ tipo: 'borrador_listo' })
    expect(estadoCasoIa({ ...base, borrador_estado: 'aprobado' })).toEqual({ tipo: 'aprobado' })
  })
  it('descartado y todavía apto: se puede volver a preparar', () => expect(estadoCasoIa({ ...base, borrador_estado: 'descartado' })).toEqual({ tipo: 'descartado' }))
})

describe('resumenPropuesta', () => {
  it('resume semanas, días y ejercicios', () => {
    const s = resumenPropuesta({ weeks: [{ label: 'Semana 1', days: [{ title: 'Día 1', focus: 'Full-body', exercises: [{ name: 'Sentadilla goblet', sets: '3x8', weight: '16 kg', rir: '3' }, { name: 'Remo', sets: '3x10' }] }] }] })
    expect(s).toEqual([{ etiqueta: 'Semana 1', dias: [{ titulo: 'Día 1 · Full-body', ejercicios: [
      { nombre: 'Sentadilla goblet', series: '3x8', peso: '16 kg', rir: '3' }, { nombre: 'Remo', series: '3x10', peso: '', rir: '' }] }] }])
    expect(totalEjercicios(s)).toBe(2)
  })
  it('nunca lanza con formas raras', () => {
    for (const raro of [null, undefined, 3, 'x', [], {}, { weeks: 'no' }, { weeks: [null, 1, { days: [null, { exercises: [null, { name: 3 }] }] }] }]) {
      expect(() => resumenPropuesta(raro)).not.toThrow()
    }
    expect(totalEjercicios(resumenPropuesta({ weeks: [null, { days: [{ exercises: [{ name: 3 }] }] }] }))).toBe(0)
  })
})

describe('textoDatosEntregados', () => {
  it('lo dice en claro y sin molestias ni PAR-Q', () => {
    const t = textoDatosEntregados(['nombre', 'objetivo', 'rutina_actual', 'criterios'])
    expect(t).toBe('nombre de pila, objetivo, rutina actual, tus criterios')
    expect(textoDatosEntregados(null)).toBe('')
    expect(textoDatosEntregados([])).toBe('')
  })
})

// La base de datos es la autoridad: si cambia un motivo o un tope allí, esta prueba obliga a reflejarlo aquí.
describe('coincide con la migración 20261121000010_coach_ia_puente.sql', () => {
  const sql = readFileSync('supabase/migrations/20261121000010_coach_ia_puente.sql', 'utf8')
  it('cada motivo existe en el SQL', () => {
    for (const m of MOTIVOS) expect(sql, m).toContain(`'${m}'`)
  })
  it('los topes son los mismos', () => {
    expect(sql).toContain(`>= ${POLITICA_COACH_IA.maxCasosPendientes}`)
    expect(sql).toContain(`not between 1 and ${POLITICA_COACH_IA.maxSemanas}`)
    expect(sql).toContain(`not between 1 and ${POLITICA_COACH_IA.maxDiasSemana}`)
    expect(sql).toContain(`not between 1 and ${POLITICA_COACH_IA.maxEjerciciosDia}`)
    expect(sql).toContain(`not between 1 and ${POLITICA_COACH_IA.maxRazones}`)
    expect(sql).toContain(`'max_semanas', ${POLITICA_COACH_IA.maxSemanas}`)
    expect(sql).toContain(POLITICA_COACH_IA.version)
  })
  it('la edad mínima es la de la solicitud pública', () => expect(sql).toContain('v_edad < 18'))
})

// Corrección de alcance tras la revisión de #214 (migración 20261121000020): lista de habilitados, paquete sin salud y sin coachNotes.
describe('coincide con la migración 20261121000020_coach_ia_alcance.sql', () => {
  const sql = readFileSync('supabase/migrations/20261121000020_coach_ia_alcance.sql', 'utf8')
  const lista = (nombre: string) => {
    const m = sql.match(new RegExp(`${nombre}[^:]*:= array\\[([^\\]]*)\\]`))
    expect(m, nombre).not.toBeNull()
    return [...m![1].matchAll(/'([^']+)'/g)].map(x => x[1])
  }

  it('el paquete es una lista blanca igual a las preguntas que NO son de salud', () => {
    const permitidas = lista('v_permitidas')
    expect([...permitidas].sort()).toEqual([...RESPUESTAS_PARA_IA].sort())
    for (const id of IDS_SALUD) expect(permitidas, id).not.toContain(id)
    // y cubre justo las preguntas del cuestionario que no son de salud
    expect(RESPUESTAS_PARA_IA.length).toBe(PREGUNTAS_PROGRAMACION.length - IDS_SALUD.filter(id => PREGUNTAS_PROGRAMACION.some(q => q.id === id)).length)
  })
  it('en lugar de la edad se entrega solo «mayor_de_edad»', () => {
    expect(sql).toContain("'mayor_de_edad', true")
    expect(sql).not.toMatch(/'edad',\s*s\.respuestas/)
  })
  it('las tres funciones comprueban la lista de habilitados en el servidor', () => {
    for (const f of ['coach_ia_casos_pendientes', 'coach_ia_paquete', 'coach_ia_guardar_borrador']) {
      const cuerpo = sql.slice(sql.indexOf(`function public.${f}(`)).split('revoke execute')[0]
      expect(cuerpo, f).toContain('coach_ia_habilitado(')
    }
  })
  it('la lista nace vacía: ningún uid de persona en el repositorio', () => {
    expect(sql).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)
  })
  it('coachNotes ya no se acepta en la propuesta', () => {
    expect(lista('claves_plan')).toEqual(['type', 'restMain', 'restAcc', 'restWarn', 'programName', 'weeks'])
    expect(lista('claves_plan')).not.toContain('coachNotes')
  })
  it('el consentimiento dice qué respuestas llegan a la herramienta y pide no escribir salud en los textos libres', () => {
    expect(CONSENT_ASISTENTE_PROGRAMACION).toContain('nunca con mis respuestas de salud')
    expect(CONSENT_ASISTENTE_PROGRAMACION).toMatch(/no escribas problemas de salud en los campos de texto libre/)
  })
})
