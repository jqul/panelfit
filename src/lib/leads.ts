// Contactos que llegan por la página pública del entrenador (tabla `leads`): lo que se enseña de cada uno y cómo
// responderle. Sin React ni red: se puede probar.

export type EstadoLead = 'nuevo' | 'contactado' | 'convertido' | 'descartado'
export const ESTADOS_LEAD: { id: EstadoLead; label: string }[] = [
  { id: 'nuevo', label: 'Nuevos' },
  { id: 'contactado', label: 'Contactados' },
  { id: 'convertido', label: 'Clientes' },
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
  const rango = (l: Lead) => (esNuevo(l) ? 0 : l.status === 'contactado' ? 1 : l.status === 'convertido' ? 2 : 3)
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

/** Nombre y apellido para el alta de cliente: la primera palabra es el nombre y el resto el apellido. */
export function partirNombre(nombre: string): { name: string; surname: string } {
  const [name = '', ...resto] = nombre.trim().split(/\s+/)
  return { name, surname: resto.join(' ') }
}

/** Lo que se guarda en las notas privadas del cliente al convertir un contacto: de dónde viene y qué dijo. */
export function notasDeLead(l: Pick<Lead, 'email' | 'phone' | 'message' | 'created_at' | 'referrerName'>): string {
  const dia = new Date(l.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  return [
    `Contacto desde la página pública (${dia}).`,
    l.email && `Correo: ${l.email}`,
    l.phone && `Teléfono: ${l.phone}`,
    l.referrerName && `Referido por ${l.referrerName}.`,
    l.message && `Mensaje: «${l.message}»`,
  ].filter(Boolean).join('\n')
}

export type ContactoValidado = { ok: true; email: string | null; phone: string | null } | { ok: false; error: string }

/** El campo único "correo o teléfono" del formulario de la página pública. Mismas reglas que la función de la base de datos. */
export function validarContacto(texto: string): ContactoValidado {
  const t = texto.trim()
  if (!t) return { ok: false, error: 'Déjame un correo o un teléfono para poder contestarte' }
  if (t.includes('@')) {
    const e = t.toLowerCase()
    return e.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? { ok: true, email: e, phone: null } : { ok: false, error: 'El correo no parece válido' }
  }
  const digitos = t.replace(/\D/g, '').length
  return /^[0-9+().\-\s]{8,25}$/.test(t) && digitos >= 8 && digitos <= 15 ? { ok: true, email: null, phone: t } : { ok: false, error: 'El teléfono no parece válido' }
}
