// Contactos que llegan por la página pública del entrenador (tabla `leads`): lo que se enseña de cada uno y cómo
// responderle. Sin React ni red: se puede probar.

export type EstadoLead = 'nuevo' | 'contactado' | 'descartado'
export const ESTADOS_LEAD: { id: EstadoLead; label: string }[] = [
  { id: 'nuevo', label: 'Nuevos' },
  { id: 'contactado', label: 'Contactados' },
  { id: 'descartado', label: 'Descartados' },
]

export interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  message: string | null
  status: string
  created_at: number
  referred_by_client_id: string | null
  referrerName?: string
}

/** Enlace de WhatsApp para un teléfono escrito a mano. Sin prefijo de país, un móvil de 9 cifras se toma como español (+34). */
export function whatsappDe(phone: string | null | undefined, texto?: string): string | null {
  const solo = (phone ?? '').trim()
  if (!solo) return null
  let digitos = solo.replace(/\D/g, '')
  if (solo.startsWith('00')) digitos = digitos.slice(2)
  else if (digitos.length === 9) digitos = '34' + digitos
  if (digitos.length < 8 || digitos.length > 15) return null
  return `https://wa.me/${digitos}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`
}

/** El correo o el teléfono, lo que haya; vacío si solo dejó el nombre. */
export const contactoDe = (l: Pick<Lead, 'email' | 'phone'>) => [l.email, l.phone].filter(Boolean).join(' · ')

export const esNuevo = (l: Pick<Lead, 'status'>) => l.status === 'nuevo'

/** Los nuevos primero y, dentro de cada estado, el más reciente arriba. */
export function ordenarLeads(leads: Lead[]): Lead[] {
  const rango = (l: Lead) => (esNuevo(l) ? 0 : l.status === 'contactado' ? 1 : 2)
  return [...leads].sort((a, b) => rango(a) - rango(b) || b.created_at - a.created_at)
}

/** "hace 5 h", "ayer", "hace 3 días": lo suficiente para saber si un contacto lleva días esperando. */
export function haceCuanto(ts: number, ahora = Date.now()): string {
  const min = Math.max(0, Math.round((ahora - ts) / 60000))
  if (min < 2) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  if (d === 1) return 'ayer'
  if (d < 30) return `hace ${d} días`
  return new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

/** Texto de WhatsApp para contestar a un contacto nuevo. */
export const saludoParaLead = (nombre: string, miNombre?: string) =>
  `Hola ${nombre.split(/\s+/)[0]}, soy ${miNombre || 'tu entrenador'}. Vi que me escribiste desde mi página. ¿Hablamos?`
