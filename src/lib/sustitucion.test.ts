import { describe, it, expect, vi } from 'vitest'
import type { Exercise, TrainingPlan, TrainingLogs } from '../types'

// exerciseAlternatives → painWarning → clientPain importa el cliente de Supabase, que sin variables de entorno no se crea.
vi.mock('./supabase', () => ({ supabase: {} }))
import {
  opcionesPorMaterial, decisionPorDolor, construirSustitucion, esAlternativaConocida, conAlternativa, conPlanB,
  resumenSeries, avisosDeEjercicios, normNombre, INTENSIDAD_PARAR,
} from './sustitucion'

const ex = (name: string, extra: Partial<Exercise> = {}): Exercise => ({ name, sets: '3x10', weight: '', isMain: false, comment: '', ...extra })
const BIBLIOTECA = [
  { id: 'l1', name: 'Press banca con barra', category: 'Pecho' },
  { id: 'l2', name: 'Press banca con mancuernas', category: 'Pecho' },
  { id: 'l3', name: 'Chest press en máquina', category: 'Pecho' },
  { id: 'l4', name: 'Flexiones', category: 'Pecho' },
  { id: 'l5', name: 'Aperturas con mancuernas', category: 'Pecho' },
  { id: 'l6', name: 'Sentadilla', category: 'Piernas' },
  { id: 'l7', name: 'Press militar', category: 'Hombros' },
]
const plan = (exercises: Exercise[], semanas = 2): TrainingPlan => ({
  clientId: 'c', type: 'x', restMain: 1, restAcc: 1, restWarn: 1,
  weeks: Array.from({ length: semanas }, (_, i) => ({ label: `S${i + 1}`, rpe: '', isCurrent: false, days: [{ title: 'A', focus: '', exercises }] })),
})

describe('material ocupado', () => {
  it('con plan B enseña solo lo que el entrenador aprobó (máximo 3), con su id de biblioteca', () => {
    const e = ex('Press banca con barra', { alternativas: [{ name: 'Press banca con mancuernas' }, { name: 'Chest press en máquina', exerciseId: 'x9' }, { name: 'Flexiones' }, { name: 'Aperturas con mancuernas' }] })
    const o = opcionesPorMaterial(e, BIBLIOTECA)
    expect(o.map(x => x.name)).toEqual(['Press banca con mancuernas', 'Chest press en máquina', 'Flexiones'])
    expect(o.every(x => x.origen === 'plan-b')).toBe(true)
    expect(o[0].exerciseId).toBe('l2')  // lo encuentra en la biblioteca por nombre
    expect(o[1].exerciseId).toBe('x9')  // y respeta el id que ya traía
  })

  it('sin plan B cae al mismo grupo muscular, lo más parecido de nombre primero, sin el propio ejercicio', () => {
    const o = opcionesPorMaterial(ex('Press banca con barra'), BIBLIOTECA)
    expect(o).toHaveLength(3)
    expect(o[0]).toMatchObject({ name: 'Press banca con mancuernas', origen: 'sugerida' })
    expect(o.map(x => x.name)).not.toContain('Press banca con barra')
    expect(o.map(x => x.name)).not.toContain('Sentadilla') // otro grupo
  })

  it('un plan B que se nombra a sí mismo no cuenta', () => {
    const o = opcionesPorMaterial(ex('Press banca con barra', { alternativas: [{ name: 'press BANCA con barra' }] }), BIBLIOTECA)
    expect(o.every(x => x.origen === 'sugerida')).toBe(true)
  })
})

describe('me molesta', () => {
  it('con dolor fuerte recomienda parar, sin proponer nada', () => {
    const d = decisionPorDolor(ex('Press banca con barra', { alternativas: [{ name: 'Flexiones' }] }), 'Hombro', INTENSIDAD_PARAR, BIBLIOTECA)
    expect(d).toEqual({ accion: 'parar', opciones: [] })
  })

  it('si el entrenador marcó "no sustituir por dolor", solo avisa', () => {
    const d = decisionPorDolor(ex('Press banca con barra', { dolorSinSustituir: true, alternativas: [{ name: 'Flexiones' }] }), 'Hombro', 4, BIBLIOTECA)
    expect(d).toEqual({ accion: 'avisar', opciones: [] })
  })

  it('propone solo alternativas que no cargan la zona (también las del plan B)', () => {
    const e = ex('Chest press en máquina', { alternativas: [{ name: 'Press banca con mancuernas' }, { name: 'Aperturas con mancuernas' }] })
    const d = decisionPorDolor(e, 'Hombro', 3, BIBLIOTECA)
    expect(d.accion).toBe('proponer')
    expect(d.opciones.map(o => o.name)).toEqual(['Aperturas con mancuernas']) // todo "press" carga el hombro
    expect(d.opciones[0].origen).toBe('plan-b')
  })

  it('con molestia de hombro no propone thruster ni remo erguido (cargan el hombro aunque no se llamen press)', () => {
    const lib = [{ id: '1', name: 'Press militar', category: 'Hombros' }, { id: '2', name: 'Thruster con barra', category: 'Hombros' }, { id: '3', name: 'Remo erguido con barra', category: 'Hombros' }, { id: '4', name: 'Elevaciones laterales', category: 'Hombros' }]
    const d = decisionPorDolor(ex('Press militar'), 'Hombro', 3, lib)
    expect(d.opciones.map(o => o.name)).toEqual(['Elevaciones laterales'])
  })

  it('sin nada seguro, avisa en vez de inventar', () => {
    const d = decisionPorDolor(ex('Press militar'), 'Hombro', 3, [{ id: 'l7', name: 'Press militar', category: 'Hombros' }, { id: 'l8', name: 'Press Arnold', category: 'Hombros' }])
    expect(d).toEqual({ accion: 'avisar', opciones: [] })
  })
})

describe('quién aprueba la sustitución', () => {
  const base = { ex: ex('Press banca con barra', { alternativas: [{ name: 'Flexiones' }] }), fecha: '2026-10-24' }
  it('plan B → entrenador; libre → pendiente de revisar; sugerida → automática', () => {
    expect(construirSustitucion({ ...base, performedName: 'Flexiones', reason: 'material', origen: 'plan-b' }).approvedBy).toBe('entrenador')
    expect(construirSustitucion({ ...base, performedName: 'Cosa rara', reason: 'preferencia', origen: 'libre' }).approvedBy).toBe('pendiente')
    expect(construirSustitucion({ ...base, performedName: 'Chest press en máquina', reason: 'material', origen: 'sugerida' }).approvedBy).toBe('automatico')
  })
  it('lo escrito a mano que coincide con el plan B ya está aprobado', () => {
    expect(construirSustitucion({ ...base, performedName: ' flexiones ', reason: 'material', origen: 'libre' }).approvedBy).toBe('entrenador')
  })
  it('guarda id, zona e intensidad solo si los hay', () => {
    const s = construirSustitucion({ ...base, performedName: 'Aperturas', performedExerciseId: 'l5', reason: 'dolor', origen: 'sugerida', zona: 'Hombro', intensidad: 4 })
    expect(s).toEqual({ performedName: 'Aperturas', performedExerciseId: 'l5', reason: 'dolor', approvedBy: 'automatico', zona: 'Hombro', intensidad: 4, fecha: '2026-10-24' })
    expect(Object.keys(construirSustitucion({ ...base, performedName: 'Flexiones', reason: 'material', origen: 'plan-b' }))).not.toContain('zona')
  })
})

describe('cambios en el plan B', () => {
  it('aceptar una alternativa la añade en todas las semanas donde aparece el ejercicio, sin duplicar', () => {
    const p = plan([ex('Press banca con barra'), ex('Remo con barra')])
    const r = conAlternativa(p.weeks, 'press banca CON barra', { name: 'Press banca con mancuernas', exerciseId: 'l2' })
    expect(r.changed).toBe(true)
    for (const w of r.weeks) {
      expect(w.days[0].exercises[0].alternativas).toEqual([{ name: 'Press banca con mancuernas', exerciseId: 'l2' }])
      expect(w.days[0].exercises[1].alternativas).toBeUndefined() // el otro ejercicio no se toca
    }
    const otra = conAlternativa(r.weeks, 'Press banca con barra', { name: 'Press banca con mancuernas' })
    expect(otra.changed).toBe(false)
    expect(otra.weeks).toBe(r.weeks)
  })
  it('no añade el propio ejercicio ni un nombre vacío', () => {
    const p = plan([ex('Press banca con barra')])
    expect(conAlternativa(p.weeks, 'Press banca con barra', { name: 'Press banca con barra' }).changed).toBe(false)
    expect(conAlternativa(p.weeks, 'Press banca con barra', { name: '  ' }).changed).toBe(false)
  })
  it('no modifica el plan original (devuelve copias)', () => {
    const p = plan([ex('Press banca con barra')])
    const antes = JSON.stringify(p)
    conAlternativa(p.weeks, 'Press banca con barra', { name: 'Flexiones' })
    expect(JSON.stringify(p)).toBe(antes)
  })
  it('conPlanB fija y quita alternativas y la regla de dolor', () => {
    const p = plan([ex('Press banca con barra')], 1)
    const a = conPlanB(p.weeks, 'Press banca con barra', { alternativas: [{ name: 'Flexiones' }], dolorSinSustituir: true })
    expect(a.weeks[0].days[0].exercises[0]).toMatchObject({ alternativas: [{ name: 'Flexiones' }], dolorSinSustituir: true })
    const b = conPlanB(a.weeks, 'Press banca con barra', { alternativas: [], dolorSinSustituir: false })
    expect(b.weeks[0].days[0].exercises[0]).not.toHaveProperty('alternativas')
    expect(b.weeks[0].days[0].exercises[0]).not.toHaveProperty('dolorSinSustituir')
    expect(conPlanB(b.weeks, 'Press banca con barra', { alternativas: [] }).changed).toBe(false) // nada que cambiar
  })
  it('esAlternativaConocida compara sin tildes ni mayúsculas', () => {
    expect(esAlternativaConocida(ex('X', { alternativas: [{ name: 'Sentadilla búlgara' }] }), 'sentadilla BULGARA')).toBe(true)
    expect(esAlternativaConocida(undefined, 'x')).toBe(false)
    expect(normNombre('  Remo   Polea ')).toBe('remo polea')
  })
})

describe('resumen de series', () => {
  it('cuenta series, repeticiones y el peso más alto', () => {
    expect(resumenSeries({ sets: { 0: { weight: '20', reps: '10' }, 1: { weight: '22,5', reps: '10' }, 2: { weight: '20', reps: '9' } } })).toBe('3×10 con 22,5 kg')
  })
  it('sin peso o sin series', () => {
    expect(resumenSeries({ sets: { 0: { weight: '', reps: '12' } } })).toBe('1×12')
    expect(resumenSeries({ sets: {} })).toBe('')
    expect(resumenSeries(undefined)).toBe('')
  })
})

describe('avisos para el entrenador', () => {
  const p = plan([ex('Press banca con barra', { alternativas: [{ name: 'Flexiones' }] }), ex('Sentadilla')], 2)
  const log = (extra: object) => ({ sets: { 0: { weight: '20', reps: '10' } }, done: true, dateDone: '2026-10-24', ...extra }) as TrainingLogs[string]

  it('lee el ejercicio prescrito del plan por la posición de la clave', () => {
    const logs: TrainingLogs = { ex_w1_d0_r0: log({ substituteName: 'Press con mancuernas', sustitucion: { performedName: 'Press con mancuernas', reason: 'material', approvedBy: 'pendiente', fecha: '2026-10-24' } }) }
    const { sustituciones } = avisosDeEjercicios(logs, p, '2026-10-10')
    expect(sustituciones).toEqual([{ key: 'ex_w1_d0_r0', prescrita: 'Press banca con barra', hecha: 'Press con mancuernas', exerciseId: undefined, reason: 'material', conocida: false, fecha: '2026-10-24', detalle: '1×10 con 20 kg' }])
  })
  it('está "conocida" si el entrenador la aprobó o ya está en su plan B', () => {
    const logs: TrainingLogs = {
      ex_w0_d0_r0: log({ sustitucion: { performedName: 'Flexiones', reason: 'material', approvedBy: 'pendiente', fecha: '2026-10-24' } }),
      ex_w1_d0_r0: log({ sustitucion: { performedName: 'Chest press', reason: 'material', approvedBy: 'entrenador', fecha: '2026-10-24' } }),
    }
    expect(avisosDeEjercicios(logs, p, '2026-10-10').sustituciones.map(s => s.conocida)).toEqual([true, true])
  })
  it('las de dolor no salen (las cubre el aviso de dolor) y las viejas tampoco', () => {
    const logs: TrainingLogs = {
      ex_w0_d0_r0: log({ sustitucion: { performedName: 'Flexiones', reason: 'dolor', approvedBy: 'automatico', fecha: '2026-10-24' } }),
      ex_w0_d0_r1: log({ sustitucion: { performedName: 'Prensa', reason: 'material', approvedBy: 'pendiente', fecha: '2026-09-01' }, dateDone: '2026-09-01' }),
    }
    expect(avisosDeEjercicios(logs, p, '2026-10-10').sustituciones).toEqual([])
  })
  it('una sustitución antigua (solo substituteName) cuenta como pendiente de revisar', () => {
    const logs: TrainingLogs = { ex_w0_d0_r1: log({ substituteName: 'Prensa' }) }
    expect(avisosDeEjercicios(logs, p, '2026-10-10').sustituciones[0]).toMatchObject({ prescrita: 'Sentadilla', hecha: 'Prensa', conocida: false })
  })
  it('recoge las dudas de técnica y se salta claves que no son de ejercicio o no existen en el plan', () => {
    const logs: TrainingLogs = {
      ex_w0_d0_r1: log({ duda: '2026-10-24T09:30:00.000Z' }),
      ex_w9_d0_r0: log({ duda: '2026-10-24T09:30:00.000Z' }),
      finished_w0_d0: { sets: {}, done: false, sessionFinished: true },
    }
    expect(avisosDeEjercicios(logs, p, '2026-10-10').dudas).toEqual([{ key: 'ex_w0_d0_r1', ejercicio: 'Sentadilla', fecha: '2026-10-24' }])
  })
  it('sin plan no inventa nada', () => {
    expect(avisosDeEjercicios({ ex_w0_d0_r0: log({ duda: '2026-10-24T09:30:00.000Z' }) }, null, '2026-10-10')).toEqual({ sustituciones: [], dudas: [] })
  })
})
