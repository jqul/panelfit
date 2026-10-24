// Caducidad del enlace de acceso de un cliente. El servidor es quien la aplica (token_expires_at en
// clientes; ver supabase/migrations/20261024000001_enlace_caducidad.sql): aquí solo se calculan las
// fechas del selector del entrenador y cómo se describe el estado.

export const CADUCIDADES: { id: string; label: string; dias: number | null }[] = [
  { id: 'nunca', label: 'Sin caducidad', dias: null },
  { id: '7', label: '7 días', dias: 7 },
  { id: '30', label: '30 días', dias: 30 },
  { id: '90', label: '90 días', dias: 90 },
]

/** Fecha ISO en la que caducará un enlace que se programa hoy, o null si no caduca. */
export function caducaEn(dias: number | null, ahora = new Date()): string | null {
  if (dias === null) return null
  return new Date(ahora.getTime() + dias * 86_400_000).toISOString()
}

export type EstadoEnlace =
  | { estado: 'sin-caducidad' }
  | { estado: 'vigente'; diasRestantes: number; fecha: string }
  | { estado: 'caducado'; fecha: string }

const fechaCorta = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

export function estadoEnlace(expiresAt: string | null | undefined, ahora = new Date()): EstadoEnlace {
  if (!expiresAt) return { estado: 'sin-caducidad' }
  const fin = new Date(expiresAt)
  if (Number.isNaN(fin.getTime())) return { estado: 'sin-caducidad' }
  if (fin.getTime() <= ahora.getTime()) return { estado: 'caducado', fecha: fechaCorta(fin) }
  return { estado: 'vigente', diasRestantes: Math.ceil((fin.getTime() - ahora.getTime()) / 86_400_000), fecha: fechaCorta(fin) }
}

/** Frase para el entrenador. */
export function describirEstado(e: EstadoEnlace): string {
  if (e.estado === 'sin-caducidad') return 'El enlace no caduca.'
  if (e.estado === 'caducado') return `El enlace caducó el ${e.fecha}: tu cliente no puede abrirlo. Elige una caducidad nueva para reactivarlo.`
  return `El enlace caduca el ${e.fecha} (${e.diasRestantes === 1 ? 'queda 1 día' : `quedan ${e.diasRestantes} días`}).`
}

/** Opción del selector que corresponde a la caducidad guardada (la más cercana por duración restante). */
export function opcionActual(expiresAt: string | null | undefined, ahora = new Date()): string {
  const e = estadoEnlace(expiresAt, ahora)
  if (e.estado === 'sin-caducidad') return 'nunca'
  if (e.estado === 'caducado') return ''
  const candidatas = CADUCIDADES.filter(c => c.dias !== null)
  return candidatas.reduce((mejor, c) => Math.abs(c.dias! - e.diasRestantes) < Math.abs(mejor.dias! - e.diasRestantes) ? c : mejor).id
}

/** Lo que el servidor contesta a get_client_link_status → qué pantalla enseñar al cliente. */
export function pantallaDeEnlace(estado: unknown): 'caducado' | 'no-existe' {
  return estado === 'expired' ? 'caducado' : 'no-existe'
}
