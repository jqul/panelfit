import type { TrainingPlan, TrainingLogs } from '../types'
import { getEffectiveWeekIdx } from './planWeek'
import { localDateKey } from './dates'
import { diaDelTitulo } from './fechasPlan'

// La sesión que el cliente ve en Hoy.
export function getTodaySession(plan: TrainingPlan, logs: TrainingLogs, now: Date = new Date()) {
  const weekIdx = getEffectiveWeekIdx(plan, logs, now)
  const isDone = (w: number, di: number) => {
    if (logs[`finished_w${w}_d${di}`]?.sessionFinished) return true
    const dayExs = plan.weeks[w]?.days[di]?.exercises || []
    if (!dayExs.length) return true
    return dayExs.every((_, ri) => logs[`ex_w${w}_d${di}_r${ri}`]?.done)
  }

  // 0) El entrenador ha movido una sesión a hoy (desde el calendario del plan): esa manda, sea de la semana que sea.
  //    Y las de esta semana que ha movido a otro día no se ofrecen hoy.
  const hoy = localDateKey(now)
  const movidas = plan.fechasSesion || {}
  for (const [clave, fecha] of Object.entries(movidas)) {
    const m = clave.match(/^w(\d+)_d(\d+)$/)
    if (fecha !== hoy || !m) continue
    const w = +m[1], di = +m[2]
    const day = plan.weeks?.[w]?.days?.[di]
    if (day && !isDone(w, di)) return { day, weekIdx: w, dayIdx: di, dayKey: `w${w}_d${di}` }
  }
  // Plan que aún no ha empezado (se asignó con fecha de inicio futura): nada que entrenar todavía.
  if (plan.fechaInicio && plan.fechaInicio > hoy) return null
  const movidaAOtroDia = (di: number) => { const f = movidas[`w${weekIdx}_d${di}`]; return !!f && f !== hoy }

  const currentWeek = plan.weeks?.[weekIdx]
  if (!currentWeek?.days?.length) return null
  const isDayDone = (di: number) => isDone(weekIdx, di)

  // 1) Si los títulos de los días llevan el nombre del día de la semana (p. ej.
  //    "LUNES — EMPUJE", "JUEVES — BANCA"...), usar ESE como el de hoy siempre
  //    que coincida con el día real — es como el propio cliente lo entiende, y
  //    no depende de qué se haya entrenado antes.
  const todayWeekday = (() => { const d = now.getDay(); return d === 0 ? 6 : d - 1 })()
  const weekdayMatchIdx = currentWeek.days.findIndex((d, di) => !movidaAOtroDia(di) && diaDelTitulo(d.title) === todayWeekday)

  // 2) Si no hay nombres de día (p. ej. "Día A/B/C"), no hay forma de saber a
  //    qué día del calendario corresponde cada uno — en su lugar, "hoy" es el
  //    siguiente día sin terminar de la semana actual, por orden, volviendo a
  //    empezar por el primero si ya se completaron todos. ANTES se usaba el
  //    índice del día de la semana natural directo sobre el array de días,
  //    asumiendo 7 días exactos (uno por día del calendario) — con un split de
  //    3-4 días eso se salía del hueco real (p. ej. un jueves con un plan de 4
  //    días mostraba days[3] "Viernes" en vez del día que tocaba).
  let dayIdx = weekdayMatchIdx
  if (dayIdx === -1) {
    dayIdx = currentWeek.days.findIndex((_, di) => !isDayDone(di) && !movidaAOtroDia(di))
    if (dayIdx === -1) dayIdx = 0
  }
  // 3) Hoy ya has entrenado, pero otra sesión del plan (p. ej. la del jueves un viernes): esa es la de hoy, hecha. Sin esto
  //    seguía pidiendo entrenar "lo del viernes" a quien ya había entrenado hoy.
  if (!isDayDone(dayIdx)) {
    const entrenadoHoy = (di: number) => (currentWeek.days[di]?.exercises || []).some((_, ri) => {
      const l = logs[`ex_w${weekIdx}_d${di}_r${ri}`]
      return !!l?.done && l.dateDone === hoy
    })
    const hechaHoy = currentWeek.days.findIndex((_, di) => di !== dayIdx && isDayDone(di) && entrenadoHoy(di))
    if (hechaHoy !== -1) dayIdx = hechaHoy
  }
  const day = currentWeek.days[dayIdx]
  if (!day) return null
  return { day, weekIdx, dayIdx, dayKey: `w${weekIdx}_d${dayIdx}` }
}
