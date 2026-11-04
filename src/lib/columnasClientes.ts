import { estadoPlan } from './estadoPlan'

// Columnas de la lista de clientes que el entrenador elige ver (Harbiz: "columnas configurables"). Las cuatro de
// siempre se pueden ocultar y hay tres más: en qué punto está su plan, sus etiquetas y cuándo se dio de alta. La
// elección es una preferencia de este dispositivo (localStorage, por entrenador): en el móvil quizá se quieran menos.

export type Columna = 'estado' | 'ultimo' | 'semana' | 'alertas' | 'plan' | 'etiquetas' | 'alta'

export const COLUMNAS: { id: Columna; label: string; ancho: string }[] = [
  { id: 'estado', label: 'Estado', ancho: 'minmax(0,1fr)' },
  { id: 'ultimo', label: 'Último entreno', ancho: 'minmax(0,1fr)' },
  { id: 'semana', label: 'Esta semana', ancho: 'minmax(0,1.2fr)' },
  { id: 'plan', label: 'Plan', ancho: 'minmax(0,1.2fr)' },
  { id: 'etiquetas', label: 'Etiquetas', ancho: 'minmax(0,1.2fr)' },
  { id: 'alta', label: 'Alta', ancho: 'minmax(0,0.8fr)' },
  { id: 'alertas', label: 'Alertas', ancho: 'minmax(0,2fr)' },
]
export const POR_DEFECTO: Columna[] = ['estado', 'ultimo', 'semana', 'alertas']

const clave = (trainerId: string) => `pf_columnas_clientes_${trainerId}`

/** Las elegidas, en el orden de la tabla. Lo que no se entienda (o nada guardado) da las de siempre. */
export function limpiarColumnas(raw: unknown): Columna[] {
  if (!Array.isArray(raw)) return [...POR_DEFECTO]
  return COLUMNAS.map(c => c.id).filter(id => raw.includes(id))
}

export function leerColumnas(trainerId: string): Columna[] {
  try { const v = localStorage.getItem(clave(trainerId)); return v ? limpiarColumnas(JSON.parse(v)) : [...POR_DEFECTO] } catch { return [...POR_DEFECTO] }
}
export function guardarColumnas(trainerId: string, cols: Columna[]) {
  try { localStorage.setItem(clave(trainerId), JSON.stringify(cols)) } catch { /* sin almacenamiento: dura lo que la visita */ }
}

/** Marca o desmarca una columna, conservando el orden de la tabla. */
export const alternarColumna = (cols: Columna[], id: Columna): Columna[] =>
  limpiarColumnas(cols.includes(id) ? cols.filter(c => c !== id) : [...cols, id])

/** grid-template-columns: el cliente, las elegidas y los botones. */
export const plantillaColumnas = (cols: Columna[]) =>
  ['minmax(0,2.2fr)', ...COLUMNAS.filter(c => cols.includes(c.id)).map(c => c.ancho), 'auto'].join(' ')

const corta = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

/** "Empieza el 9 nov", "Acaba el 30 nov", "Terminado"... `planEndDate` es el día siguiente al último del plan. */
export function textoPlan(c: { hasPlan?: boolean; planStartDate?: string; planEndDate?: string }, hoy: Date = new Date()): string {
  const e = estadoPlan(c, hoy)
  if (e === 'sin-plan') return 'Sin plan'
  if (e === 'empieza' && c.planStartDate) return `Empieza el ${corta(c.planStartDate)}`
  if (e === 'terminado') return 'Terminado'
  if (!c.planEndDate) return 'En curso'
  const ultimo = new Date(c.planEndDate + 'T00:00:00'); ultimo.setDate(ultimo.getDate() - 1)
  const d = `${ultimo.getFullYear()}-${String(ultimo.getMonth() + 1).padStart(2, '0')}-${String(ultimo.getDate()).padStart(2, '0')}`
  return e === 'termina' ? `Termina el ${corta(d)}` : `Hasta el ${corta(d)}`
}

/** Fecha de alta corta ("3 oct 2026"); vacío si no se sabe. */
export function textoAlta(createdAt?: number | string): string {
  const t = typeof createdAt === 'string' ? Date.parse(createdAt) : createdAt
  if (!t || !Number.isFinite(t)) return '—'
  return new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}
