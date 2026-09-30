import { WeekPlan, DayPlan, Exercise } from '../types'

// Generador de ciclos Wendler 5/3/1: 4 semanas (3 de progresión + 1 de
// descarga), porcentajes sobre el Training Max (TM) de cada levantamiento.
// TM se usa en vez del 1RM real (normalmente ~90% del 1RM) para dejar
// margen de progresión y evitar fallar series.

export interface WendlerLift {
  name: string
  trainingMax: number // kg
}

interface WendlerSetSpec { pct: number; reps: string }

interface WendlerWeekSpec { label: string; isDeload: boolean; sets: WendlerSetSpec[] }

const WENDLER_WEEKS: WendlerWeekSpec[] = [
  { label: 'Semana 1 (5s)', isDeload: false, sets: [{ pct: 0.65, reps: '5' }, { pct: 0.75, reps: '5' }, { pct: 0.85, reps: '5+' }] },
  { label: 'Semana 2 (3s)', isDeload: false, sets: [{ pct: 0.70, reps: '3' }, { pct: 0.80, reps: '3' }, { pct: 0.90, reps: '3+' }] },
  { label: 'Semana 3 (1s)', isDeload: false, sets: [{ pct: 0.75, reps: '5' }, { pct: 0.85, reps: '3' }, { pct: 0.95, reps: '1+' }] },
  { label: 'Semana 4 (descarga)', isDeload: true, sets: [{ pct: 0.40, reps: '5' }, { pct: 0.50, reps: '5' }, { pct: 0.60, reps: '5' }] },
]

/** Redondea al incremento de disco más práctico (por defecto 2.5kg). */
export function roundToIncrement(kg: number, increment = 2.5): number {
  return Math.round(kg / increment) * increment
}

/** Genera las 4 semanas de un ciclo 5/3/1 para los levantamientos indicados. */
export function generateWendlerCycle(lifts: WendlerLift[]): WeekPlan[] {
  const validLifts = lifts.filter(l => l.name.trim() && l.trainingMax > 0)
  if (!validLifts.length) return []

  return WENDLER_WEEKS.map((week): WeekPlan => {
    const exercises: Exercise[] = []
    validLifts.forEach(lift => {
      week.sets.forEach((set, si) => {
        const weight = roundToIncrement(lift.trainingMax * set.pct)
        exercises.push({
          name: `${lift.name} (${Math.round(set.pct * 100)}%)`,
          sets: `1×${set.reps}`,
          weight: `${weight}kg`,
          isMain: si === week.sets.length - 1, // el último set (AMRAP) es el principal
          comment: '',
        })
      })
    })
    const day: DayPlan = { title: `Día 1 — ${week.label}`, focus: '5/3/1', exercises }
    return {
      label: `5/3/1 — ${week.label}`,
      rpe: week.isDeload ? '@6' : '@8',
      isCurrent: false,
      isDeload: week.isDeload,
      days: [day],
    }
  })
}
