import type { TrainingLogs, TrainingPlan } from '../types'

// Mejores marcas por ejercicio: las tres mejores sesiones (por peso, y a igual peso por repeticiones), con 🥇🥈🥉.
// Se cuentan por sesión (el mejor set de cada día), así el podio no son tres series del mismo día. `desde` limita
// a un periodo ("este año"). Las carreras no cuentan (van en Cardio).

export interface Marca { peso: number; reps: number; fecha: string }
export interface MarcasEjercicio { nombre: string; podio: Marca[] }

const mejor = (a: Marca, b: Marca) => b.peso - a.peso || b.reps - a.reps || a.fecha.localeCompare(b.fecha)

export function mejoresMarcas(logs: TrainingLogs, plan: TrainingPlan | null | undefined, desde?: string): MarcasEjercicio[] {
  const porEjercicio = new Map<string, Map<string, Marca>>() // nombre → fecha → mejor set de ese día
  for (const [clave, log] of Object.entries(logs || {})) {
    const m = clave.match(/^ex_w(\d+)_d(\d+)_r(\d+)$/)
    if (!m || !log?.dateDone || (desde && log.dateDone < desde)) continue
    const ex = plan?.weeks?.[+m[1]]?.days?.[+m[2]]?.exercises?.[+m[3]]
    if (!ex || ex.kind === 'run') continue
    const nombre = (log.substituteName || ex.name || '').trim()
    if (!nombre) continue
    for (const s of Object.values(log.sets || {})) {
      const peso = parseFloat(String(s?.weight ?? '').replace(',', '.')) || 0
      const reps = parseInt(String(s?.reps ?? ''), 10) || 0
      if (peso <= 0) continue
      const dias = porEjercicio.get(nombre) ?? new Map<string, Marca>()
      porEjercicio.set(nombre, dias)
      const actual = dias.get(log.dateDone)
      const nueva = { peso, reps, fecha: log.dateDone }
      if (!actual || mejor(nueva, actual) < 0) dias.set(log.dateDone, nueva)
    }
  }
  return [...porEjercicio.entries()]
    .map(([nombre, dias]) => ({ nombre, podio: [...dias.values()].sort(mejor).slice(0, 3) }))
    .sort((a, b) => b.podio[0].peso - a.podio[0].peso || a.nombre.localeCompare(b.nombre, 'es'))
}
