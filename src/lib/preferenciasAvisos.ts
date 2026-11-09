// Qué avisos push le llegan al entrenador. Se guardan en su perfil (`profile.avisos`, un mapa tipo → activo) y los
// respeta la función send-push (y notify-lead para los contactos): un tipo apagado no se envía. Lo que no está en el
// mapa está activo, así que nadie deja de recibir nada por no haberlo configurado. La Bandeja no cambia: esto solo
// decide qué suena en el móvil.

export type TipoAviso = 'sesion' | 'record' | 'reserva' | 'checkin_bajo' | 'molestia' | 'contacto'

export const TIPOS_AVISO: { id: TipoAviso; emoji: string; label: string; detalle: string }[] = [
  { id: 'sesion', emoji: '💪', label: 'Sesión completada', detalle: 'Cuando un cliente termina el entreno del día' },
  { id: 'record', emoji: '🏆', label: 'Récords', detalle: 'Cuando un cliente bate su mejor marca' },
  { id: 'reserva', emoji: '📅', label: 'Reservas', detalle: 'Citas reservadas o pedidas y plazas en clases' },
  { id: 'checkin_bajo', emoji: '📉', label: 'Check-in bajo', detalle: 'Cuando alguien marca 1 o 2 en una escala del check-in' },
  { id: 'molestia', emoji: '⚠️', label: 'Molestias', detalle: 'Dolor articular o fuerte que reporta un cliente' },
  { id: 'contacto', emoji: '✉️', label: 'Contactos de tu página', detalle: 'Alguien te escribe desde tu página pública' },
]

export type PreferenciasAvisos = Record<TipoAviso, boolean>

const esTipo = (t: unknown): t is TipoAviso => TIPOS_AVISO.some(x => x.id === t)

/** Lo guardado en el perfil, con todo lo que falte (o no sea booleano) activo. */
export function limpiarPreferencias(raw: unknown): PreferenciasAvisos {
  const o = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  return Object.fromEntries(TIPOS_AVISO.map(t => [t.id, o[t.id] !== false])) as PreferenciasAvisos
}

/** ¿Se manda este tipo de aviso? Sin tipo (o uno desconocido), sí. */
export function quiereAviso(raw: unknown, tipo?: unknown): boolean {
  if (!esTipo(tipo)) return true
  return limpiarPreferencias(raw)[tipo]
}

/** Las escalas del check-in que salen bajas (1 o 2 sobre 5), para el aviso al entrenador. */
export function escalasBajas(respuestas: { label: string; valor: number }[]): string[] {
  return respuestas.filter(r => r.valor <= 2).map(r => `${r.label} ${r.valor}/5`)
}
