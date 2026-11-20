import { describe, it, expect } from 'vitest'
import { revisionDecision, POLITICA_REVISION, AVISO_REVISION, type EntradaRevision, type PoliticaRevision } from './revisionDecision'
import { POLITICA_DESCARGA, sumarDias } from './evidenciaDescarga'
import { esDecisionDeCarga, type Decision } from './diarioDecisiones'
import type { TrainingLogs, TrainingPlan } from '../types'

// Plan desde el lunes 2026-09-07; hoy es el viernes 2026-11-20 y la decisión se tomó el 2026-10-23 (28 días antes de hoy)
const INICIO = '2026-09-07'
const HOY = '2026-11-20'
const FECHA = '2026-10-23'
const ex = (name: string) => ({ name, sets: '3x8-10', weight: '', comment: '', isMain: false, rir: '2-3' })
const plan = (extra: Record<string, unknown> = {}): TrainingPlan => ({
  clientId: 'c', type: 'hipertrofia', restMain: 120, restAcc: 60, restWarn: 15, createdAt: 0, updatedAt: 0, fechaInicio: INICIO, calibracion: { confirmadaEl: '2026-09-08' },
  weeks: Array.from({ length: 12 }, (_, w) => ({ label: `S${w + 1}`, rpe: '8', isCurrent: false, isDeload: false, days: [0, 1, 2].map(d => ({ title: `D${d}`, focus: '', exercises: [ex('Press banca'), ex('Remo con barra')] })) })),
  ...extra,
} as unknown as TrainingPlan)

const sets = (kg: number, reps: number, rir: number) => Object.fromEntries([0, 1, 2].map(k => [k, { weight: String(kg), reps: String(reps), rir }]))
/** Una semana del plan: sesiones (lunes+0, +2, +4 por defecto) con press banca (pos 0) y remo (pos 1). */
function semana(logs: TrainingLogs, w: number, kg: number, rir: number, dias = [0, 2, 4]): void {
  dias.forEach((off, i) => {
    const fecha = sumarDias(INICIO, 7 * w + off)
    logs[`ex_w${w}_d${i}_r0`] = { done: true, dateDone: fecha, sets: sets(kg, 8, rir) } as unknown as TrainingLogs[string]
    logs[`ex_w${w}_d${i}_r1`] = { done: true, dateDone: fecha, sets: sets(kg - 20, 8, rir) } as unknown as TrainingLogs[string]
  })
}
/** Semanas 2-5 (antes de la decisión) a `kgAntes`, y 7-10 (después) a `kgDespues`; la 6 es la de la decisión (2026-10-19 a 25). */
function historia(kgAntes: number, kgDespues: number, rirAntes = 2, rirDespues = 2, diasDespues = [0, 2, 4]): TrainingLogs {
  const l: TrainingLogs = {}
  ;[2, 3, 4, 5, 6].forEach(w => semana(l, w, kgAntes, rirAntes))
  ;[7, 8, 9, 10].forEach(w => semana(l, w, kgDespues, rirDespues, diasDespues))
  return l
}
const dec = (extra: Partial<Decision> = {}): Decision => ({ id: 'd1', fecha: FECHA, ejercicio: null, hipotesis: 'Lleva demasiado volumen', tipo: 'bajar', intervencion: 'Quitar una serie', revisar_el: '2026-11-20', revisada_el: null, resultado: null, ...extra })
const entrada = (logs: TrainingLogs, extra: Partial<EntradaRevision> = {}): EntradaRevision => ({ hoy: HOY, decision: dec(), plan: plan(), logs, checkins: [], dolor: [], ausencias: [], ...extra })

describe('describe qué pasó, sin causa', () => {
  it('rendimiento que sube: «mejoró», con los ejercicios comparables, el RIR y el récord', () => {
    const r = revisionDecision(entrada(historia(60, 66)))
    expect(r.periodoCorto).toBe(false)
    expect(r.rendimiento.interpretado).toBe(true)
    expect(r.conclusion).toBe('mejoro')
    expect(r.rendimiento.ejercicios.map(x => x.nombre)).toEqual(['Press banca', 'Remo con barra'])
    expect(r.rendimiento.ejercicios[0]).toMatchObject({ veredicto: 'mejoro', rirAntes: 2, rirDespues: 2 })
    expect(r.rendimiento.ejercicios[0].cambioPct).toBeGreaterThan(3)
    expect(r.records.map(x => x.ejercicio)).toEqual(['Press banca', 'Remo con barra'])
    expect(r.adherencia).toBe('se-mantuvo')
    expect(r.resumen.join(' ')).toContain('Rendimiento: mejoró (2 ejercicios comparables).')
  })

  it('rendimiento que baja: «empeoró»; sin cambio: «se mantuvo»', () => {
    expect(revisionDecision(entrada(historia(60, 54))).conclusion).toBe('empeoro')
    expect(revisionDecision(entrada(historia(60, 60))).conclusion).toBe('se-mantuvo')
    expect(revisionDecision(entrada(historia(60, 60))).records).toEqual([])
  })

  it('el periodo es el mismo antes y después, y cuenta las sesiones realizadas', () => {
    const r = revisionDecision(entrada(historia(60, 60)))
    expect(r.despues).toMatchObject({ desde: '2026-10-24', hasta: HOY, dias: 28, sesiones: 12 })
    expect(r.antes).toMatchObject({ hasta: FECHA, dias: 28 })
    expect(r.antes.sesiones).toBe(12) // incluye la del propio día de la decisión (el «antes» llega hasta ese día)
    expect(r.despues.adherenciaPct).toBe(100)
  })

  it('con la revisión ya cerrada, el periodo termina el día del cierre y no hoy', () => {
    const r = revisionDecision(entrada(historia(60, 60), { decision: dec({ revisada_el: '2026-11-10' }) }))
    expect(r.despues.hasta).toBe('2026-11-10')
    expect(r.despues.dias).toBe(18)
  })

  it('nunca atribuye causa ni recomienda, en ningún caso, y siempre dice que describe', () => {
    const casos = [historia(60, 66), historia(60, 54), historia(60, 60), historia(60, 60, 2, 2, [0])]
    for (const logs of casos) {
      const r = revisionDecision(entrada(logs, { checkins: [{ date: '2026-11-01', sleep: 1, soreness: 2, motivation: 2 }] }))
      const todo = [...r.resumen, ...r.falta, ...r.excluido].join(' ').toLowerCase()
      expect(todo).not.toMatch(/caus[óo]|gracias a|provoc|por la decisión|debes|deberías|tienes que|revert|repetir|sigue así/)
    }
    expect(AVISO_REVISION).toContain('no demuestra que la decisión lo causara')
  })
})

describe('datos insuficientes y exclusiones', () => {
  it('con menos de 14 días desde la decisión no se dice nada, y se cuenta cuánto falta', () => {
    const r = revisionDecision(entrada(historia(60, 66), { decision: dec({ fecha: sumarDias(HOY, -5) }) }))
    expect(r.periodoCorto).toBe(true)
    expect(r.conclusion).toBe('datos-insuficientes')
    expect(r.rendimiento.interpretado).toBe(false)
    expect(r.falta[0]).toBe('Esperar 9 días más desde la decisión (hacen falta 14)')
    expect(r.adherencia).toBe('datos-insuficientes')
  })

  it('con poca adherencia después, el rendimiento y el RIR NO se interpretan y se dice por qué; la adherencia sí se cuenta', () => {
    const r = revisionDecision(entrada(historia(60, 66, 2, 2, [0]))) // 1 de 3 sesiones previstas
    expect(r.despues.adherenciaPct).toBe(33)
    expect(r.excluido).toEqual(['Después: adherencia baja (33 % de lo previsto)'])
    expect(r.rendimiento).toMatchObject({ interpretado: false, veredicto: 'datos-insuficientes', ejercicios: [] })
    expect(r.conclusion).toBe('datos-insuficientes')
    expect(r.adherencia).toBe('empeoro')
    expect(r.resumen.join(' ')).toContain('Adherencia: 100 % antes y 33 % después')
    expect(r.falta.join(' ')).toContain('ausencia relevante ni baja adherencia')
  })

  it('con una ausencia relevante tampoco se interpreta el rendimiento', () => {
    const r = revisionDecision(entrada(historia(60, 66), { ausencias: [{ desde: '2026-11-02', hasta: '2026-11-06' }] }))
    expect(r.despues.diasAusencia).toBe(5)
    expect(r.excluido[0]).toBe('Después: 5 días de ausencia')
    expect(r.conclusion).toBe('datos-insuficientes')
    expect(r.despues.sesiones).toBe(12)
  })

  it('la calibración queda fuera del antes: con exposiciones sobrantes se sigue, con pocas no', () => {
    const sigue = revisionDecision(entrada(historia(60, 66), { plan: plan({ calibracion: { confirmadaEl: '2026-10-05' } }) }))
    expect(sigue.excluido.some(x => x.startsWith('Se deja fuera la calibración (hasta el 2026-10-05)'))).toBe(true)
    expect(sigue.conclusion).toBe('mejoro')
    const noSigue = revisionDecision(entrada(historia(60, 66), { plan: plan({ calibracion: { confirmadaEl: '2026-10-22' } }) }))
    expect(noSigue.conclusion).toBe('datos-insuficientes')
    expect(noSigue.falta.join(' ')).toContain('exposiciones comparables')
  })

  it('una decisión sobre un ejercicio mira solo ese ejercicio; sin sus exposiciones, no hay conclusión', () => {
    const r = revisionDecision(entrada(historia(60, 66), { decision: dec({ ejercicio: 'Press banca' }) }))
    expect(r.rendimiento.ejercicios.map(x => x.nombre)).toEqual(['Press banca'])
    expect(r.conclusion).toBe('mejoro')
    const otro = revisionDecision(entrada(historia(60, 66), { decision: dec({ ejercicio: 'Sentadilla' }) }))
    expect(otro.conclusion).toBe('datos-insuficientes')
    expect(otro.falta.join(' ')).toContain('Sentadilla')
  })

  it('sin ejercicio concreto, un solo ejercicio comparable no basta (mismo mínimo que la lectura de descarga)', () => {
    const logs = historia(60, 66)
    for (const k of Object.keys(logs)) if (k.endsWith('_r1')) delete logs[k]
    const r = revisionDecision(entrada(logs))
    expect(POLITICA_DESCARGA.ejerciciosComparablesMin).toBe(2)
    expect(r.rendimiento.ejercicios).toHaveLength(1)
    expect(r.conclusion).toBe('datos-insuficientes')
  })
})

describe('el resto de la evidencia', () => {
  it('cuenta check-ins bajos y molestias articulares antes y después (las agujetas no)', () => {
    const r = revisionDecision(entrada(historia(60, 60), {
      checkins: [{ date: '2026-10-10', sleep: 4, soreness: 4, motivation: 4 }, { date: '2026-11-03', sleep: 1, soreness: 2, motivation: 2 }, { date: '2026-11-05', sleep: 4, soreness: 4, motivation: 4 }],
      dolor: [{ date: '2026-10-12', zona: 'Rodilla', intensidad: 5, tipo: 'articular' }, { date: '2026-11-04', zona: 'Cuádriceps', intensidad: 8, tipo: 'doms' }, { date: '2026-11-08', zona: 'Hombro', intensidad: 6 }],
    }))
    expect(r.antes).toMatchObject({ checkins: 1, checkinsBajos: 0, molestias: 1 })
    expect(r.despues).toMatchObject({ checkins: 2, checkinsBajos: 1, molestias: 1 })
    expect(r.falta.join(' ')).toContain('Check-ins')
  })
})

describe('la política y a qué decisiones se aplica', () => {
  it('reutiliza los umbrales de la política de descarga y es parametrizable', () => {
    expect(POLITICA_REVISION.base).toBe(POLITICA_DESCARGA)
    expect(POLITICA_REVISION.version).toContain('provisional')
    const larga: PoliticaRevision = { ...POLITICA_REVISION, version: 'prueba', diasMinimosObservados: 40 }
    const r = revisionDecision(entrada(historia(60, 66)), larga)
    expect(r.politicaVersion).toBe('prueba')
    expect(r.periodoCorto).toBe(true)
  })

  it('esDecisionDeCarga: subir, bajar, redistribuir o que el texto hable de volumen, intensidad o descarga', () => {
    expect(esDecisionDeCarga({ tipo: 'bajar', hipotesis: '', intervencion: '' })).toBe(true)
    expect(esDecisionDeCarga({ tipo: 'mantener', hipotesis: 'Probar una descarga', intervencion: '' })).toBe(true)
    expect(esDecisionDeCarga({ tipo: 'sustituir', hipotesis: 'Le duele el codo', intervencion: 'Cambiar de variante' })).toBe(false)
    expect(esDecisionDeCarga({ tipo: 'no-intervenir', hipotesis: 'Esperar', intervencion: '' })).toBe(false)
  })
})
