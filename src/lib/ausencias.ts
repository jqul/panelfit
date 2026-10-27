import { localDateKey } from './dates'
import { MOTIVO_LABEL, ausenciaActiva, type MotivoAusencia } from './ausenciaHoy'

export { ausenciaActiva, type MotivoAusencia }

// Ausencias ("no puedo entrenar del 14 al 18, viaje") y eventos con fecha ("Media maratón, 6 dic, A"),
// como la disponibilidad y los eventos de TrainingPeaks. Tablas `ausencias` y `eventos_cliente`.

export type PrioridadEvento = 'A' | 'B' | 'C'

export interface Ausencia {
  id: string
  client_id: string
  desde: string
  hasta: string
  tipo: 'no_puedo' | 'limitada'
  motivo: MotivoAusencia
  nota: string
  creado_por: 'cliente' | 'entrenador'
}

export interface EventoCliente {
  id: string
  client_id: string
  fecha: string
  nombre: string
  prioridad: PrioridadEvento
  nota: string
}

export const MOTIVOS: { id: MotivoAusencia; label: string; emoji: string }[] = [
  { id: 'viaje', label: MOTIVO_LABEL.viaje, emoji: '✈️' },
  { id: 'trabajo', label: MOTIVO_LABEL.trabajo, emoji: '💼' },
  { id: 'enfermedad', label: MOTIVO_LABEL.enfermedad, emoji: '🤒' },
  { id: 'lesion', label: MOTIVO_LABEL.lesion, emoji: '🩹' },
  { id: 'otro', label: MOTIVO_LABEL.otro, emoji: '📅' },
]

export const PRIORIDADES: { id: PrioridadEvento; label: string }[] = [
  { id: 'A', label: 'A — el objetivo de la temporada' },
  { id: 'B', label: 'B — importante' },
  { id: 'C', label: 'C — de preparación' },
]

export const motivoDe = (id: MotivoAusencia) => MOTIVOS.find(m => m.id === id) ?? MOTIVOS[MOTIVOS.length - 1]

const fechaCorta = (f: string) => new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

/** Ausencias que aún no han terminado, de la más próxima a la más lejana. */
export function ausenciasPendientes(ausencias: Ausencia[], hoy: string = localDateKey()): Ausencia[] {
  return ausencias.filter(a => a.hasta >= hoy).sort((a, b) => a.desde.localeCompare(b.desde))
}

/** ¿Cae esta fecha dentro de alguna ausencia? (para no dar por fallado un día de viaje) */
export function enAusencia(ausencias: Ausencia[], fecha: string): boolean {
  return ausencias.some(a => a.desde <= fecha && a.hasta >= fecha)
}

/** "Del 14 al 18 nov", "14 nov" o "Del 30 nov al 2 dic". */
export function rangoTexto(a: Pick<Ausencia, 'desde' | 'hasta'>): string {
  if (a.desde === a.hasta) return fechaCorta(a.desde)
  const [d1, m1] = fechaCorta(a.desde).split(' ')
  const fin = fechaCorta(a.hasta)
  return m1 && fin.endsWith(m1) ? `Del ${d1} al ${fin}` : `Del ${fechaCorta(a.desde)} al ${fin}`
}

/** El próximo evento que importa: el A más cercano; si no hay A, el más cercano de cualquier prioridad. */
export function eventoClave(eventos: EventoCliente[], hoy: string = localDateKey()): EventoCliente | null {
  const futuros = eventos.filter(e => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))
  return futuros.find(e => e.prioridad === 'A') ?? futuros[0] ?? null
}

/** Días naturales entre hoy y la fecha (0 = hoy). */
export function diasHasta(fecha: string, hoy: string = localDateKey()): number {
  return Math.round((new Date(fecha + 'T12:00:00').getTime() - new Date(hoy + 'T12:00:00').getTime()) / 86400000)
}

/** "¡Es hoy!", "Mañana", "Faltan 5 días", "Faltan 6 semanas" (en semanas a partir de 3 semanas). */
export function cuentaAtras(fecha: string, hoy: string = localDateKey()): string {
  const d = diasHasta(fecha, hoy)
  if (d <= 0) return '¡Es hoy!'
  if (d === 1) return 'Mañana'
  if (d < 21) return `Faltan ${d} días`
  return `Faltan ${Math.floor(d / 7)} semanas`
}
