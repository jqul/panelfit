// Contribución muscular de un ejercicio: qué grupos trabaja y cuánto cuenta una serie para cada uno.
//   · Peso 1 = trabajo DIRECTO: el grupo es el objetivo del ejercicio (el que da la biblioteca o el nombre).
//   · Peso entre 0 y 1 = trabajo INDIRECTO: el grupo ayuda (el tríceps en un press) y una serie cuenta esa fracción.
// Los pesos son una ESTIMACIÓN para repartir el volumen, no una medida fisiológica: depende de la técnica, del recorrido,
// del esfuerzo y de qué músculo limita la serie. Por eso hay unos valores de partida prudentes y el entrenador puede
// cambiarlos por ejercicio (se guardan en su perfil). No se confunde con el PAPEL del ejercicio (lib/papelEjercicio):
// una sentadilla de competición es trabajo específico de sentadilla y a la vez contribuye a piernas y glúteos.

export interface Contribucion { grupo: string; peso: number }
/** Lo que el entrenador cambió, por nombre de ejercicio normalizado. Sin entrada = valores de partida. */
export type ContribucionesPropias = Record<string, Contribucion[]>

export const PESOS_POSIBLES = [0, 0.25, 0.5, 0.75, 1] as const
export const PESO_INDIRECTO_POR_DEFECTO = 0.5

const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
export const claveEjercicio = normalizar

const tiene = (t: string, ps: string[]) => ps.some(p => t.includes(p))

// Valores de partida: solo lo claro y conocido. Lo que no se reconoce no recibe indirecto (mejor quedarse corto que
// inventar). Cada regla dice qué grupos ayudan además del principal.
const INDIRECTOS_POR_NOMBRE: { si: string[]; no?: string[]; grupos: string[] }[] = [
  { si: ['press banca', 'bench', 'press inclinado', 'press declinado', 'fondos', 'flexiones'], no: ['aperturas'], grupos: ['Tríceps', 'Hombros'] },
  { si: ['press militar', 'press hombro', 'press de hombro', 'arnold', 'military'], grupos: ['Tríceps'] },
  { si: ['remo', 'jalon', 'dominada', 'pull-up', 'pullup', 'pulldown'], no: ['curl'], grupos: ['Bíceps'] },
  { si: ['peso muerto', 'rumano'], grupos: ['Glúteos', 'Espalda'] },
  { si: ['sentadilla', 'squat', 'prensa', 'hack', 'zancada', 'bulgara', 'lunge'], no: ['sissy'], grupos: ['Glúteos'] },
]

/**
 * Qué grupos cuenta un ejercicio. `principal` es el grupo que ya se le asigna (biblioteca o nombre): peso 1. Si el
 * entrenador cambió las contribuciones de ese ejercicio, mandan; si no, se añaden los indirectos de partida.
 */
export function contribucionesDe(nombre: string, principal: string, propias?: ContribucionesPropias | null): Contribucion[] {
  const t = normalizar(nombre)
  const mias = propias?.[t]
  if (mias?.length) return mias
  const lista: Contribucion[] = [{ grupo: principal, peso: 1 }]
  const regla = INDIRECTOS_POR_NOMBRE.find(r => tiene(t, r.si) && !(r.no && tiene(t, r.no)))
  if (regla) for (const g of regla.grupos) if (g !== principal) lista.push({ grupo: g, peso: PESO_INDIRECTO_POR_DEFECTO })
  return lista
}

/** Valida lo que llega del perfil (o de otro dispositivo): nombres con listas de grupos y pesos entre 0 y 1. */
export function limpiarContribuciones(raw: unknown): ContribucionesPropias {
  const out: ContribucionesPropias = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [clave, lista] of Object.entries(raw as Record<string, unknown>).slice(0, 500)) {
    if (!Array.isArray(lista)) continue
    const limpia: Contribucion[] = []
    for (const c of lista.slice(0, 12)) {
      const g = (c as { grupo?: unknown })?.grupo, p = (c as { peso?: unknown })?.peso
      if (typeof g !== 'string' || !g.trim() || g.length > 40 || typeof p !== 'number' || !Number.isFinite(p)) continue
      if (limpia.some(x => x.grupo === g.trim())) continue
      limpia.push({ grupo: g.trim(), peso: Math.min(1, Math.max(0, Math.round(p * 100) / 100)) })
    }
    if (limpia.length) out[claveEjercicio(clave)] = limpia
  }
  return out
}

export interface VolumenGrupo { directas: number; indirectas: number }

/** Suma `series` de un ejercicio al acumulado por grupo: lo de peso 1 va a directas, lo demás a indirectas (ponderado). */
export function sumarSeries(acum: Record<string, VolumenGrupo>, contribs: Contribucion[], series: number): void {
  if (series <= 0) return
  for (const c of contribs) {
    if (c.peso <= 0) continue
    const v = acum[c.grupo] ?? (acum[c.grupo] = { directas: 0, indirectas: 0 })
    if (c.peso >= 1) v.directas += series
    else v.indirectas += series * c.peso
  }
}

/** Para enseñar: una cifra con como mucho un decimal («4,5»). */
export const redondear = (n: number) => Math.round(n * 10) / 10
