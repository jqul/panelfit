// Consejos cortos del entrenador para sus clientes (sueño, descanso, qué hacer un día que no se puede entrenar...).
// Se guardan dentro del perfil del entrenador (`entrenadores.profile.consejos`), que el cliente ya lee para ver la
// marca: sin tablas nuevas. Lo que llega del servidor se limpia siempre antes de pintarlo.

export interface Consejo { id: string; titulo: string; texto: string }

export const MAX_CONSEJOS = 20
export const MAX_TITULO = 80
export const MAX_TEXTO = 1500

/** Limpia lo que venga del perfil (puede estar vacío, a medias o ser de una versión vieja). Los sin título o sin texto se descartan. */
export function limpiarConsejos(raw: unknown): Consejo[] {
  if (!Array.isArray(raw)) return []
  const vistos = new Set<string>()
  const out: Consejo[] = []
  for (const c of raw) {
    if (!c || typeof c !== 'object') continue
    const { id, titulo, texto } = c as Record<string, unknown>
    if (typeof titulo !== 'string' || typeof texto !== 'string') continue
    const t = titulo.trim().slice(0, MAX_TITULO)
    const x = texto.trim().slice(0, MAX_TEXTO)
    if (!t || !x) continue
    let cid = typeof id === 'string' && id.trim() ? id.trim().slice(0, 40) : `c_${out.length}`
    while (vistos.has(cid)) cid += '_'
    vistos.add(cid)
    out.push({ id: cid, titulo: t, texto: x })
    if (out.length >= MAX_CONSEJOS) break
  }
  return out
}

export function nuevoConsejo(titulo = '', texto = ''): Consejo {
  return { id: `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, titulo, texto }
}

/** Puntos de partida generales y sin pretensiones médicas; cada entrenador los cambia con su voz. */
export const CONSEJOS_EJEMPLO: { titulo: string; texto: string }[] = [
  { titulo: 'Dormir bien', texto: 'Intenta dormir entre 7 y 9 horas y acostarte a una hora parecida cada día. Es cuando mejor se recupera el cuerpo de lo que entrenas.' },
  { titulo: 'Los días de descanso', texto: 'Un día sin entrenar no es un día perdido: es cuando el cuerpo asimila el trabajo. Camina un rato, estira suave y come bien.' },
  { titulo: 'Beber agua', texto: 'Bebe a lo largo del día y no solo durante el entreno. Si tienes sed o la orina es muy oscura, bebe un poco más.' },
  { titulo: 'Si un día no puedes entrenar', texto: 'Haz lo principal de la sesión y avísame. Mejor una sesión corta que ninguna, y si no llegas a nada, no pasa nada: seguimos mañana.' },
]

/** Ejemplos que aún no están añadidos (se compara por título). */
export function ejemplosPendientes(actuales: Pick<Consejo, 'titulo'>[]): typeof CONSEJOS_EJEMPLO {
  const usados = new Set(actuales.map(c => c.titulo.trim().toLowerCase()))
  return CONSEJOS_EJEMPLO.filter(e => !usados.has(e.titulo.toLowerCase()))
}

/** Mueve el elemento `i` una posición (-1 arriba, +1 abajo); no hace nada en los extremos. */
export function mover<T>(lista: T[], i: number, delta: -1 | 1): T[] {
  const j = i + delta
  if (i < 0 || i >= lista.length || j < 0 || j >= lista.length) return lista
  const copia = [...lista]
  ;[copia[i], copia[j]] = [copia[j], copia[i]]
  return copia
}
