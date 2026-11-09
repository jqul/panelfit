// Eventos propios del entrenador en la agenda (citas.evento, sin cliente): reuniones, ratos personales y recordatorios.
// Reunión y personal ocupan el hueco (el cliente no puede reservar encima); un recordatorio es una nota a una hora y no
// ocupa nada. Ver migrations/20261110000001_eventos_agenda.sql.

export type EventoAgenda = 'reunion' | 'personal' | 'recordatorio'

export const EVENTOS: Record<EventoAgenda, { emoji: string; label: string; ocupa: boolean; conEnlace: boolean; ayuda: string }> = {
  reunion: { emoji: '🤝', label: 'Reunión', ocupa: true, conEnlace: true, ayuda: 'Ocupa el hueco: nadie puede reservar a esa hora' },
  personal: { emoji: '🧘', label: 'Personal', ocupa: true, conEnlace: false, ayuda: 'Tiempo tuyo: ocupa el hueco, sin cliente' },
  recordatorio: { emoji: '🔔', label: 'Recordatorio', ocupa: false, conEnlace: false, ayuda: 'Una nota a una hora: no ocupa el hueco' },
}

export const ORDEN_EVENTOS: EventoAgenda[] = ['reunion', 'personal', 'recordatorio']

export const esEvento = (v: unknown): v is EventoAgenda => typeof v === 'string' && v in EVENTOS

/** Fin del evento: un recordatorio no dura (empieza y acaba a la misma hora); lo demás, la duración elegida. */
export function finEvento(inicio: Date, duracionMin: number, evento?: EventoAgenda | null): Date {
  return evento === 'recordatorio' ? new Date(inicio) : new Date(inicio.getTime() + duracionMin * 60000)
}
