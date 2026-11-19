import { describe, it, expect } from 'vitest'
import { recomendarSiguiente, exposicionesComparables, materialDe, POLITICA_PROGRESION, type PoliticaProgresion } from './recomendacionProgresion'
import { finCalibracion } from './calibracion'
import type { TrainingLogs, TrainingPlan } from '../types'

const hoy = (n: number) => { const d = new Date('2026-11-30T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10) }
const ex = (name: string, extra: Record<string, unknown> = {}) => ({ name, sets: '3x8-10', weight: '', comment: '', isMain: false, rir: '2-3', ...extra })
// Un plan con 6 semanas del mismo día, para poder registrar varias exposiciones del mismo ejercicio
const plan = (ejercicio = ex('Press banca'), extra: Record<string, unknown> = {}): TrainingPlan => ({
  clientId: 'c', type: 'hipertrofia', restMain: 120, restAcc: 60, restWarn: 15, createdAt: 0, updatedAt: 0,
  weeks: Array.from({ length: 6 }, (_, w) => ({ label: `S${w + 1}`, rpe: '8', isCurrent: w === 5, days: [{ title: 'A', focus: '', exercises: [ejercicio] }] })),
  ...extra,
} as unknown as TrainingPlan)
type S = { weight: string; reps: string; rir?: number; tipo?: string }
const log = (dateDone: string, sets: S[], extra: Record<string, unknown> = {}) => ({ done: true, dateDone, sets: Object.fromEntries(sets.map((s, i) => [i, s])), ...extra }) as unknown as TrainingLogs[string]
/** Exposiciones (de la más antigua a la más reciente) en la semana w: [días atrás, series] */
const logsDe = (...exp: [number, S[]][]): TrainingLogs => Object.fromEntries(exp.map(([d, sets], w) => [`ex_w${w}_d0_r0`, log(hoy(d), sets)]))
const serie = (kg: number, reps: number, rir?: number): S => ({ weight: String(kg), reps: String(reps), ...(rir !== undefined ? { rir } : {}) })
const tres = (kg: number, reps: number, rir: number): S[] => [serie(kg, reps, rir), serie(kg, reps, rir), serie(kg, reps, rir)]
// Fuera de calibración: la primera sesión es de hace 60 días y el entrenador ya confirmó
const sinCalibracion = (p: TrainingPlan) => ({ ...p, calibracion: { confirmadaEl: hoy(40) } }) as TrainingPlan

describe('recomendarSiguiente: qué recomienda', () => {
  const p = sinCalibracion(plan())
  it('datos insuficientes con menos de 3 exposiciones comparables, y lo dice', () => {
    const r = recomendarSiguiente(logsDe([21, tres(60, 10, 2)], [14, tres(60, 10, 2)]), p, 'Press banca')
    expect(r).toMatchObject({ tipo: 'datos-insuficientes', confianza: 'baja', provisional: true, totalComparables: 2, kgSugerido: null })
    expect(r.explicacion).toContain('hacen falta 3 exposiciones comparables y hay 2')
  })

  it('subir: todas las series en el tope del rango y el RIR no queda por debajo del previsto; sugiere el paso del material', () => {
    const logs = logsDe([21, tres(60, 8, 2)], [14, tres(60, 9, 2)], [7, tres(60, 10, 3)])
    const r = recomendarSiguiente(logs, p, 'Press banca')
    expect(r).toMatchObject({ tipo: 'subir', kgSugerido: 62.5, confianza: 'media', provisional: false })
    expect(r.explicacion).toContain('todas las series en 10 repeticiones')
    expect(recomendarSiguiente(logs, p, 'Press banca', { material: 'Mancuerna' }).kgSugerido).toBe(61) // mancuerna: 1 kg
  })

  it('mantener: dentro del rango, sin llegar al tope, y se dice qué buscar', () => {
    const r = recomendarSiguiente(logsDe([21, tres(60, 8, 2)], [14, tres(60, 8, 2)], [7, tres(60, 9, 2)]), p, 'Press banca')
    expect(r).toMatchObject({ tipo: 'mantener', kgSugerido: null })
    expect(r.explicacion).toContain('Mantén la carga')
  })

  it('subir NO si va más justo de lo previsto, aunque llegue al tope: mantiene', () => {
    const r = recomendarSiguiente(logsDe([21, tres(60, 10, 2)], [14, tres(60, 10, 2)], [7, tres(60, 10, 1)]), p, 'Press banca')
    expect(r.tipo).toBe('mantener')
  })

  it('bajar (revisar): no llega al rango y va mucho más justo de lo previsto', () => {
    const r = recomendarSiguiente(logsDe([21, tres(60, 8, 2)], [14, tres(60, 7, 1)], [7, tres(60, 6, 0)]), p, 'Press banca')
    expect(r).toMatchObject({ tipo: 'bajar', kgSugerido: null })
    expect(r.explicacion).toContain('Conviene revisar la carga')
  })

  it('observar: sin RIR registrado, sin rango de repeticiones o sin RIR previsto no se orienta, y se dice por qué', () => {
    const sinRir = logsDe([21, [serie(60, 10), serie(60, 10), serie(60, 10)]], [14, [serie(60, 10), serie(60, 10)]], [7, [serie(60, 10), serie(60, 10)]])
    expect(recomendarSiguiente(sinRir, p, 'Press banca')).toMatchObject({ tipo: 'observar' })
    expect(recomendarSiguiente(sinRir, p, 'Press banca').explicacion).toContain('no se registró el RIR')
    const sinRango = sinCalibracion(plan(ex('Press banca', { sets: 'al fallo' })))
    expect(recomendarSiguiente(logsDe([21, tres(60, 10, 2)], [14, tres(60, 10, 2)], [7, tres(60, 10, 2)]), sinRango, 'Press banca').explicacion).toContain('rango de repeticiones')
    const sinPrevisto = sinCalibracion(plan(ex('Press banca', { rir: undefined }), { }))
    ;(sinPrevisto.weeks as { rpe: string }[]).forEach(w => { w.rpe = '' })
    expect(recomendarSiguiente(logsDe([21, tres(60, 10, 2)], [14, tres(60, 10, 2)], [7, tres(60, 10, 2)]), sinPrevisto, 'Press banca').explicacion).toContain('RIR previsto')
  })
})

describe('recomendarSiguiente: lo que NO hace', () => {
  const p = sinCalibracion(plan())
  it('nunca habla de estancamiento, fatiga ni descarga (ni en caídas claras de rendimiento)', () => {
    const casos = [logsDe([21, tres(60, 10, 2)], [14, tres(60, 8, 2)], [7, tres(60, 6, 0)]), logsDe([21, tres(60, 10, 2)], [14, tres(60, 10, 2)], [7, tres(60, 10, 2)]), logsDe([21, tres(60, 8, 2)], [14, tres(60, 8, 2)], [7, tres(60, 8, 2)])]
    for (const logs of casos) expect(recomendarSiguiente(logs, p, 'Press banca').explicacion.toLowerCase()).not.toMatch(/estanc|fatiga|descarga|sobreentren/)
  })

  it('no mezcla calentamientos, dropsets ni series «al fallo»: solo series normales', () => {
    const conRuido = (kg: number, reps: number, rir: number): S[] => [
      { weight: '30', reps: '12', rir: 6, tipo: 'calentamiento' }, ...tres(kg, reps, rir),
      { weight: '40', reps: '15', rir: 0, tipo: 'dropset' }, { weight: '60', reps: '14', rir: 0, tipo: 'fallo' },
    ]
    const { exposiciones } = exposicionesComparables(logsDe([14, conRuido(60, 10, 2)], [7, conRuido(60, 10, 2)]), p, 'Press banca')
    expect(exposiciones.map(e => ({ kg: e.kg, reps: e.reps, rir: e.rirMedio }))).toEqual([{ kg: 60, reps: [10, 10, 10], rir: 2 }, { kg: 60, reps: [10, 10, 10], rir: 2 }])
  })

  it('no mezcla cargas distintas del mismo día: usa solo la carga de trabajo (la más repetida)', () => {
    const { exposiciones } = exposicionesComparables(logsDe([7, [serie(60, 10, 2), serie(60, 10, 2), serie(80, 3, 0)]]), p, 'Press banca')
    expect(exposiciones[0]).toMatchObject({ kg: 60, reps: [10, 10] })
  })

  it('un ejercicio sustituido, los registros sacados de las estadísticas y los de otra forma de apuntar el peso no cuentan', () => {
    const logs: TrainingLogs = {
      ex_w0_d0_r0: log(hoy(28), tres(60, 10, 2)),
      ex_w1_d0_r0: log(hoy(21), tres(60, 10, 2), { substituteName: 'Press con mancuernas' }),
      ex_w2_d0_r0: log(hoy(14), tres(60, 10, 2), { noContar: true }),
      ex_w3_d0_r0: log(hoy(7), tres(60, 10, 2)),
      ex_w4_d0_r0: log(hoy(3), tres(30, 10, 2), { porLado: true }),
    }
    const { exposiciones } = exposicionesComparables(logs, p, 'Press banca')
    // La más reciente es por lado: fija la forma de apuntar y el resto (en total) no se compara con ella
    expect(exposiciones).toHaveLength(1)
    expect(exposiciones[0]).toMatchObject({ fecha: hoy(3), kg: 30 })
  })

  it('no toca el plan ni los registros', () => {
    const logs = logsDe([21, tres(60, 8, 2)], [14, tres(60, 9, 2)], [7, tres(60, 10, 3)])
    const antes = JSON.stringify({ p, logs })
    recomendarSiguiente(logs, p, 'Press banca')
    expect(JSON.stringify({ p, logs })).toBe(antes)
  })
})

describe('calibración y confianza', () => {
  it('con exposiciones de la primera semana, la orientación es provisional y la confianza baja', () => {
    // Sin confirmar: la primera sesión es la más antigua (hace 21 días) y calibra 14 días → las dos primeras son de calibración
    const logs = logsDe([21, tres(60, 8, 2)], [14, tres(60, 9, 2)], [7, tres(60, 10, 3)], [3, tres(60, 10, 3)])
    expect(finCalibracion(logs, plan())).toBe(hoy(7))
    const r = recomendarSiguiente(logs, plan(), 'Press banca')
    expect(r.exposiciones.map(e => e.deCalibracion)).toEqual([false, true, true])
    expect(r).toMatchObject({ confianza: 'baja', provisional: true })
  })

  it('confirmada la calibración y con 5 exposiciones con RIR, confianza alta y no provisional', () => {
    const logs = logsDe([35, tres(60, 8, 2)], [28, tres(60, 8, 2)], [21, tres(60, 9, 2)], [14, tres(60, 9, 2)], [7, tres(60, 10, 3)])
    expect(recomendarSiguiente(logs, sinCalibracion(plan()), 'Press banca')).toMatchObject({ confianza: 'alta', provisional: false, tipo: 'subir' })
  })

  it('cada recomendación enseña lo que usó: las últimas exposiciones, la política y la confianza', () => {
    const r = recomendarSiguiente(logsDe([21, tres(60, 8, 2)], [14, tres(60, 9, 2)], [7, tres(60, 10, 3)]), sinCalibracion(plan()), 'Press banca')
    expect(r.ejercicio).toBe('Press banca')
    expect(r.politicaVersion).toBe(POLITICA_PROGRESION.version)
    expect(r.exposiciones).toHaveLength(3)
    expect(r.exposiciones[0]).toEqual({ fecha: hoy(7), kg: 60, reps: [10, 10, 10], rirMedio: 3, deCalibracion: false })
  })
})

describe('la política es parametrizable (un solo sitio)', () => {
  const logs = logsDe([21, tres(60, 8, 2)], [14, tres(60, 9, 2)], [7, tres(60, 10, 3)])
  const p = sinCalibracion(plan())
  it('cambiando la política cambia la recomendación, sin tocar la función', () => {
    const estricta: PoliticaProgresion = { ...POLITICA_PROGRESION, version: 'prueba', minExposiciones: 4 }
    expect(recomendarSiguiente(logs, p, 'Press banca', { politica: estricta })).toMatchObject({ tipo: 'datos-insuficientes', politicaVersion: 'prueba' })
    const pasoGrande: PoliticaProgresion = { ...POLITICA_PROGRESION, incrementoKg: { ...POLITICA_PROGRESION.incrementoKg, barra: 5 } }
    expect(recomendarSiguiente(logs, p, 'Press banca', { politica: pasoGrande, material: 'Barra' }).kgSugerido).toBe(65)
  })
  it('la política por defecto lleva versión y es provisional', () => {
    expect(POLITICA_PROGRESION.version).toContain('provisional')
  })
})

describe('materialDe', () => {
  it('lo de la biblioteca manda; si no, se deduce del nombre', () => {
    expect(materialDe('Press banca', 'Mancuerna')).toBe('mancuerna')
    expect(materialDe('Curl con mancuernas')).toBe('mancuerna')
    expect(materialDe('Prensa 45°')).toBe('maquina')
    expect(materialDe('Jalón en polea')).toBe('polea')
    expect(materialDe('Sentadilla con barra')).toBe('barra')
    expect(materialDe('Flexiones')).toBe('otro')
  })
})
