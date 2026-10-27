// Estado de los bloques de Hoy para la lista "Para hoy". Cada bloque (check-in, hábitos, citas) ya
// carga sus datos: al cargar y al cambiar anuncia aquí cómo está, y la lista lo escucha. Así no se
// repite ninguna consulta y funciona igual en la demo, donde no se escribe en la base de datos.
export interface EstadoHoy {
  checkinHecho?: boolean
  habitos?: { hechos: number; total: number }
  /** Hora ("09:00") de la primera cita de hoy, o null si no hay. */
  citaHoy?: string | null
}

const EVENTO = 'pf:hoy-cambio'
const estados = new Map<string, EstadoHoy>()

export function estadoHoy(clientId: string): EstadoHoy {
  return estados.get(clientId) ?? {}
}

export function avisarCambioHoy(clientId: string, parcial: EstadoHoy): void {
  estados.set(clientId, { ...estadoHoy(clientId), ...parcial })
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: clientId }))
}

export function alCambiarHoy(clientId: string, fn: (estado: EstadoHoy) => void): () => void {
  const handler = (e: Event) => { if ((e as CustomEvent).detail === clientId) fn(estadoHoy(clientId)) }
  window.addEventListener(EVENTO, handler)
  return () => window.removeEventListener(EVENTO, handler)
}

/** Lleva la vista al bloque de Hoy que corresponde a una fila de "Para hoy". */
export function irABloqueHoy(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
