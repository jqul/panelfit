import type { TrainingLogs, TrainingPlan } from '../types'
import { historialPorEjercicio, type SesionEjercicio } from './historialEjercicio'
import { finDelPlan } from './finPlan'

// Revisión del bloque: al acabar un plan (o en su última semana), qué ejercicios subieron, cuáles se estancaron y cuánto
// se cumplió, para decidir el siguiente bloque con datos. Solo cuenta lo registrado en las semanas de ESTE plan y desde
// su fecha de inicio. Puro, para probarlo.

export interface RevisionEjercicio { name: string; inicio: number; fin: number; cambioPct: number; sesiones: number; estancado: boolean }
export interface RevisionBloque {
  terminado: boolean
  diasRestantes: number
  sesionesHechas: number
  sesionesPrevistas: number
  cumplimientoPct: number | null
  ejercicios: RevisionEjercicio[]   // con 1RM estimado en 2 sesiones o más; de más a menos mejora
  suben: RevisionEjercicio[]
  estancados: RevisionEjercicio[]
}

const CLAVE = /^ex_w(\d+)_d(\d+)_r(\d+)$/

/** Estancado: con 3 sesiones o más, las 3 últimas no superan lo mejor de antes. */
export function estaEstancado(sesiones: SesionEjercicio[]): boolean {
  const cronologico = [...sesiones].reverse().filter(s => s.e1rm > 0)
  if (cronologico.length < 4) return false
  const antes = Math.max(...cronologico.slice(0, -3).map(s => s.e1rm))
  return Math.max(...cronologico.slice(-3).map(s => s.e1rm)) <= antes
}

export function revisionBloque(plan: TrainingPlan | null | undefined, logs: TrainingLogs, hoy: string): RevisionBloque | null {
  if (!plan?.weeks?.length || !plan.fechaInicio) return null
  const fin = finDelPlan(plan)
  if (!fin) return null
  const nSemanas = plan.weeks.length

  // Solo lo de este plan: sus semanas y desde que empezó (claves viejas de otro plan no cuentan)
  const delPlan: TrainingLogs = {}
  const dias = new Set<string>()
  for (const [k, l] of Object.entries(logs || {})) {
    const m = k.match(CLAVE)
    if (!m || +m[1] >= nSemanas || !l?.done || !l.dateDone || l.dateDone < plan.fechaInicio) continue
    delPlan[k] = l
    dias.add(`${m[1]}_${m[2]}`)
  }
  const sesionesPrevistas = plan.weeks.reduce((s, w) => s + (w.days || []).filter(d => d.exercises?.some(e => e.kind !== 'libre') || d.exercises?.length).length, 0)

  const ejercicios: RevisionEjercicio[] = historialPorEjercicio(delPlan, plan)
    .map(h => {
      const conPeso = [...h.sesiones].reverse().filter(s => s.e1rm > 0)
      if (conPeso.length < 2) return null
      const inicio = conPeso[0].e1rm, final = Math.max(...conPeso.slice(-2).map(s => s.e1rm))
      return { name: h.name, inicio, fin: final, cambioPct: Math.round(((final - inicio) / inicio) * 100), sesiones: conPeso.length, estancado: estaEstancado(h.sesiones) }
    })
    .filter((e): e is RevisionEjercicio => !!e)
    .sort((a, b) => b.cambioPct - a.cambioPct)

  const ms = (s: string) => new Date(s + 'T12:00:00').getTime()
  return {
    terminado: hoy >= fin,
    diasRestantes: Math.max(0, Math.round((ms(fin) - ms(hoy)) / 86400000)),
    sesionesHechas: dias.size,
    sesionesPrevistas,
    cumplimientoPct: sesionesPrevistas ? Math.min(100, Math.round((dias.size / sesionesPrevistas) * 100)) : null,
    ejercicios,
    suben: ejercicios.filter(e => e.cambioPct >= 2),
    estancados: ejercicios.filter(e => e.estancado || e.cambioPct < 0),
  }
}

/** Se enseña en su última semana y cuando ya ha terminado. */
export const tocaRevisar = (r: RevisionBloque | null) => !!r && (r.terminado || r.diasRestantes <= 7)
