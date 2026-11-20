import { describe, it, expect } from 'vitest'
import { evidenciaDescarga, POLITICA_DESCARGA, type EntradaDescarga, type PoliticaDescarga } from './evidenciaDescarga'
import type { Decision } from './diarioDecisiones'
import type { TrainingLogs, TrainingPlan } from '../types'

// Hoy: viernes 2026-11-20 (semana en curso desde el lunes 16)
const HOY = '2026-11-20'
const dia = (n: number) => { const d = new Date(HOY + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10) }
const ex = (name: string, extra: Record<string, unknown> = {}) => ({ name, sets: '3x8-10', weight: '', comment: '', isMain: false, rir: '2-3', ...extra })
// 8 semanas de plan que empezó el lunes 5 oct: 3 días por semana, con dos ejercicios
const plan = (descargaEn: number[] = [], extra: Record<string, unknown> = {}): TrainingPlan => ({
  clientId: 'c', type: 'hipertrofia', restMain: 120, restAcc: 60, restWarn: 15, createdAt: 0, updatedAt: 0, fechaInicio: '2026-10-05', calibracion: { confirmadaEl: '2026-10-01' },
  weeks: Array.from({ length: 8 }, (_, w) => ({ label: `S${w + 1}`, rpe: '8', isCurrent: false, isDeload: descargaEn.includes(w), days: [0, 1, 2].map(d => ({ title: `D${d}`, focus: '', exercises: [ex('Press banca'), ex('Remo con barra')] })) })),
  ...extra,
} as unknown as TrainingPlan)
type S = { weight: string; reps: string; rir?: number }
const tres = (kg: number, reps: number, rir: number): S[] => [0, 1, 2].map(() => ({ weight: String(kg), reps: String(reps), rir }))
/** Una semana de entrenos (lunes + 0, 2 y 4 días) en la semana w del plan, con los dos ejercicios. */
function semana(logs: TrainingLogs, w: number, kgPress: number, rir: number, dias = [0, 2, 4]): void {
  dias.forEach((off, i) => {
    const d = new Date('2026-10-05T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 7 * w + off)
    const fecha = d.toISOString().slice(0, 10)
    // Press banca y remo en la posición 0 y 1 del día; la clave lleva la semana del plan y el día
    logs[`ex_w${w}_d${i}_r0`] = { done: true, dateDone: fecha, sets: Object.fromEntries(tres(kgPress, 8, rir).map((s, k) => [k, s])) } as unknown as TrainingLogs[string]
    logs[`ex_w${w}_d${i}_r1`] = { done: true, dateDone: fecha, sets: Object.fromEntries(tres(kgPress - 20, 8, rir).map((s, k) => [k, s])) } as unknown as TrainingLogs[string]
  })
}
const base = (extra: Partial<EntradaDescarga> = {}): EntradaDescarga => ({ hoy: HOY, plan: plan(), logs: {}, checkins: [], dolor: [], ausencias: [], decisiones: [], ...extra })
const checks = (...bajos: boolean[]) => bajos.map((b, i) => ({ date: dia(i * 2), sleep: b ? 1 : 4, soreness: 4, motivation: 4 }))
// Seis semanas completas (semanas 0-5 del plan: 5 oct → 15 nov), el rendimiento baja y el RIR va más justo desde la cuarta
function seisSemanasCayendo(): TrainingLogs {
  const l: TrainingLogs = {}
  // La comparación es última contra previas (2 frente a 3 exposiciones): la caída tiene que verse en esa ventana
  ;[[0, 60, 3], [1, 60, 3], [2, 60, 3], [3, 60, 3], [4, 58, 2], [5, 52, 0]].forEach(([w, kg, rir]) => semana(l, w, kg, rir))
  return l
}

describe('las tres cajas', () => {
  it('sin entrenos: datos insuficientes, sin señales ni evidencia inventada, y dice qué falta', () => {
    const r = evidenciaDescarga(base())
    expect(r.resumen).toBe('Datos insuficientes para valorar.')
    expect(r.confianza).toBe('baja')
    expect(r.senales).toEqual([])
    expect(r.datosInsuficientes.map(x => x.id)).toEqual(['historial', 'comparables', 'checkins'])
    expect(r.falta.join(' | ')).toContain('semanas más de historial')
    expect(r.falta.join(' | ')).toContain('Check-ins (3 o más en 14 días)')
  })

  it('con seis semanas, rendimiento y RIR bajando, carga seguida y check-ins bajos: señales a observar, con datos y sin veredicto', () => {
    const r = evidenciaDescarga(base({ logs: seisSemanasCayendo(), checkins: checks(true, true, false, true) }))
    expect(r.datosInsuficientes).toEqual([])
    expect(r.senales.map(s => s.id)).toEqual(['carga', 'rendimiento', 'rir', 'checkins'])
    expect(r.senales[0].texto).toBe('6 semanas seguidas de carga sin una semana de descarga marcada.')
    expect(r.senales[1].texto).toContain('en 2 ejercicios comparables: Press banca, Remo con barra')
    expect(r.senales[3].texto).toBe('3 de 4 check-ins con alguna escala baja (sueño, agujetas o ánimo).')
    expect(r.resumen).toBe('4 señales a observar. Es evidencia, no un veredicto.')
    expect(r.confianza).toBe('alta')
    expect(r.evidencia.map(x => x.id)).toContain('adherencia')
  })

  it('cada caja usa su sitio: los datos que faltan no se mezclan con las señales', () => {
    const r = evidenciaDescarga(base({ logs: seisSemanasCayendo() })) // sin check-ins
    expect(r.datosInsuficientes.map(x => x.id)).toEqual(['checkins'])
    expect(r.senales.map(s => s.id)).toEqual(['carga', 'rendimiento', 'rir'])
    expect(r.confianza).toBe('media')
  })

  it('una molestia articular cuenta aunque falte todo lo demás; las agujetas y lo leve no', () => {
    const conMolestia = evidenciaDescarga(base({ dolor: [{ date: dia(2), zona: 'Rodilla', intensidad: 6, tipo: 'articular' }, { date: dia(1), zona: 'Cuádriceps', intensidad: 9, tipo: 'doms' }, { date: dia(1), zona: 'Codo', intensidad: 2 }] }))
    expect(conMolestia.senales.map(s => s.texto)).toEqual(['Molestia articular: Rodilla (6/10).'])
    expect(conMolestia.resumen).toBe('Datos insuficientes para valorar.') // y aun así no se da por válido el resto
  })
})

describe('no confunde adherencia, ausencia ni calibración con cansancio', () => {
  it('con poca adherencia: la caída de rendimiento, el RIR y la carga NO se interpretan, y se explica', () => {
    const logs: TrainingLogs = {}
    ;[[0, 60, 3], [1, 60, 3], [2, 60, 3]].forEach(([w, kg, rir]) => semana(logs, w, kg, rir))
    ;[[3, 57, 1], [4, 56, 1], [5, 55, 0]].forEach(([w, kg, rir]) => semana(logs, w, kg, rir, [0])) // 1 de 3 sesiones: 33 %
    const r = evidenciaDescarga(base({ logs, checkins: checks(false, false, false) }))
    expect(r.contextoAtipico[0]).toContain('Adherencia baja (33 % de lo previsto)')
    expect(r.contextoAtipico[0]).toContain('menos sesiones no es lo mismo que más cansancio')
    expect(r.senales.map(s => s.id)).not.toEqual(expect.arrayContaining(['rendimiento']))
    expect(r.senales.map(s => s.id)).not.toContain('carga')
    expect(r.senales.map(s => s.id)).not.toContain('rir')
    expect(r.confianza).toBe('baja')
    expect(r.evidencia.some(x => x.texto.startsWith('Contexto atípico'))).toBe(true)
    expect(r.falta.join(' ')).toContain('Que pase el contexto atípico')
  })

  it('con una ausencia reciente, lo mismo; y la semana con ausencia no cuenta contra su adherencia', () => {
    const logs = seisSemanasCayendo()
    const r = evidenciaDescarga(base({ logs, ausencias: [{ desde: dia(12), hasta: dia(8) }] })) // 5 días fuera, hace 1-2 semanas
    expect(r.contextoAtipico[0]).toContain('Ausencia reciente (5 días en las últimas 3 semanas)')
    expect(r.senales.map(s => s.id)).toEqual([])
    expect(r.semanas.some(s => s.diasAusencia >= 3)).toBe(true)
  })

  it('en la primera semana de calibración no se interpreta nada', () => {
    const logs: TrainingLogs = {}
    semana(logs, 5, 60, 3)
    const r = evidenciaDescarga(base({ logs, plan: plan([], { calibracion: undefined }) }))
    expect(r.datosInsuficientes.map(x => x.id)).toContain('calibracion')
    expect(r.contextoAtipico.join(' ')).toContain('Primera semana de calibración')
    expect(r.senales).toEqual([])
  })

  it('una semana de descarga marcada en el plan corta la cuenta de semanas seguidas de carga', () => {
    const logs: TrainingLogs = {}
    ;[0, 1, 2, 3, 4, 5].forEach(w => semana(logs, w, 60, 3))
    const r = evidenciaDescarga(base({ logs, plan: plan([3]) }))
    expect(r.semanas.find(s => s.descarga)).toBeTruthy()
    expect(r.evidencia.find(x => x.id === 'semanas')!.texto).toContain('2 semanas seguidas de carga')
    expect(r.senales.map(s => s.id)).not.toContain('carga')
    expect(r.evidencia.map(x => x.id)).toContain('descarga-previa')
  })
})

describe('decisiones previas y lenguaje', () => {
  const dec = (id: string, extra: Partial<Decision>): Decision => ({ id, fecha: dia(20), ejercicio: null, hipotesis: '', tipo: 'mantener', intervencion: '', revisar_el: null, revisada_el: null, resultado: null, ...extra })
  it('enseña las decisiones relacionadas con volumen, intensidad o descarga (y no otras), con si se revisaron', () => {
    const r = evidenciaDescarga(base({ decisiones: [
      dec('a', { tipo: 'bajar', intervencion: 'Quitar una serie', revisada_el: dia(5) }),
      dec('b', { tipo: 'mantener', hipotesis: 'Probar una descarga si sigue igual' }),
      dec('c', { tipo: 'sustituir', intervencion: 'Cambiar de variante' }),
    ] }))
    expect(r.decisionesPrevias.map(d => d.id).sort()).toEqual(['a', 'b'])
    expect(r.decisionesPrevias.find(d => d.id === 'a')).toMatchObject({ texto: 'Quitar una serie', revisada: true })
  })

  it('nunca dice «toca descarga», «sobreentrenado» ni da órdenes, en ningún caso', () => {
    const casos = [base(), base({ logs: seisSemanasCayendo(), checkins: checks(true, true, true, true), dolor: [{ date: dia(1), zona: 'Lumbar', intensidad: 8, tipo: 'articular' }] }), base({ ausencias: [{ desde: dia(6), hasta: dia(1) }], logs: seisSemanasCayendo() })]
    for (const c of casos) {
      const r = evidenciaDescarga(c)
      const todo = [r.resumen, ...r.datosInsuficientes.map(x => x.texto), ...r.senales.map(x => x.texto), ...r.evidencia.map(x => x.texto), ...r.contextoAtipico, ...r.falta].join(' ').toLowerCase()
      expect(todo).not.toMatch(/toca (una )?descarga|sobreentren|debes|deberías|tienes que|hay que descargar|descarga ya/)
    }
  })

  it('no crea ni sugiere un plan: el resultado no trae acciones ni cambios', () => {
    const r = evidenciaDescarga(base({ logs: seisSemanasCayendo() }))
    expect(Object.keys(r).sort()).toEqual(['confianza', 'contextoAtipico', 'datosInsuficientes', 'decisionesPrevias', 'evidencia', 'falta', 'politicaVersion', 'resumen', 'semanas', 'senales'])
  })
})

describe('la política es parametrizable y versionada', () => {
  it('cambiando la política cambia lo que se señala, sin tocar la función', () => {
    const logs = seisSemanasCayendo()
    expect(evidenciaDescarga(base({ logs, checkins: checks(false, false, false) })).senales.map(s => s.id)).toContain('carga')
    const exigente: PoliticaDescarga = { ...POLITICA_DESCARGA, version: 'prueba', semanasCargaConsecutivas: 8 }
    const r = evidenciaDescarga(base({ logs, checkins: checks(false, false, false) }), exigente)
    expect(r.politicaVersion).toBe('prueba')
    expect(r.senales.map(s => s.id)).not.toContain('carga')
  })
  it('la política por defecto es provisional y lleva versión', () => {
    expect(POLITICA_DESCARGA.version).toContain('provisional')
  })
})
