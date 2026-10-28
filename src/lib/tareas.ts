// Tareas sueltas con fecha y repetición (tabla `tareas_cliente`): qué días toca cada una y textos para enseñarla.
// Todo puro, para poder probarlo. Las fechas son 'YYYY-MM-DD' locales; los días, 0 = lunes … 6 = domingo.

export type TipoTarea = 'tarea' | 'cardio' | 'movilidad' | 'video' | 'foto'
export type Repetir = 'una' | 'diaria' | 'semanal'

export interface Tarea {
  id: string
  client_id: string
  titulo: string
  tipo: TipoTarea
  nota: string
  enlace: string
  fecha: string
  repetir: Repetir
  dias: number[]
  hasta: string | null
}

export const TIPOS_TAREA: { id: TipoTarea; icono: string; nombre: string }[] = [
  { id: 'tarea', icono: '✅', nombre: 'Tarea' },
  { id: 'cardio', icono: '🏃', nombre: 'Cardio' },
  { id: 'movilidad', icono: '🧘', nombre: 'Movilidad' },
  { id: 'video', icono: '▶️', nombre: 'Vídeo' },
  { id: 'foto', icono: '📸', nombre: 'Foto de progreso' },
]
export const ICONO_TAREA = Object.fromEntries(TIPOS_TAREA.map(t => [t.id, t.icono])) as Record<TipoTarea, string>

const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos']

/** 0 = lunes … 6 = domingo. */
export function diaSemanaDe(fecha: string): number {
  const d = new Date(fecha + 'T12:00:00').getDay()
  return (d + 6) % 7
}

/** ¿Toca la tarea ese día? */
export function tocaEl(t: Pick<Tarea, 'fecha' | 'repetir' | 'dias' | 'hasta'>, fecha: string): boolean {
  if (fecha < t.fecha || (t.hasta && fecha > t.hasta)) return false
  if (t.repetir === 'una') return fecha === t.fecha
  if (t.repetir === 'diaria') return true
  return t.dias.includes(diaSemanaDe(fecha))
}

/** Las tareas que tocan ese día, en el orden en que llegan. */
export function tareasDelDia<T extends Pick<Tarea, 'fecha' | 'repetir' | 'dias' | 'hasta'>>(tareas: T[], fecha: string): T[] {
  return tareas.filter(t => tocaEl(t, fecha))
}

/** "Una vez" / "Cada día" / "Cada martes y jueves" / "L, X y V" (+ "hasta el 30 nov"). */
export function describirRepeticion(t: Pick<Tarea, 'repetir' | 'dias' | 'hasta'>, corto = false): string {
  let base = t.repetir === 'una' ? 'Una vez' : t.repetir === 'diaria' ? 'Cada día' : ''
  if (t.repetir === 'semanal') {
    const dias = [...t.dias].sort((a, b) => a - b)
    const nombres = dias.map(d => (corto ? DIAS_CORTOS : DIAS_LARGOS)[d])
    const lista = nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0] || ''
    base = dias.length === 7 ? 'Cada día' : corto ? lista : `Los ${lista}`
  }
  if (t.repetir !== 'una' && t.hasta) {
    base += ` hasta el ${new Date(t.hasta + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
  }
  return base
}

/** El día antes (para "terminar la serie aquí": la tarea deja de tocar desde ese día). */
export function diaAnterior(fecha: string): string {
  const d = new Date(fecha + 'T12:00:00'); d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
