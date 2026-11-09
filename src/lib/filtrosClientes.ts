// Filtros de la lista de Clientes que se recuerdan entre visitas (por entrenador, en este dispositivo): el estado, la
// etiqueta, el profesional y el orden. Lo guardado se valida al leerlo: un valor raro vuelve al de por defecto.

export const FILTROS_ESTADO = ['all', 'active', 'no-plan', 'no-activity', 'at-risk', 'revisar', 'nuevos', 'high-acwr', 'jump-drop', 'sin-entrar', 'empieza', 'termina', 'terminado'] as const
export type ClientFilter = typeof FILTROS_ESTADO[number]
const ORDENES = ['attention', 'name', 'last', 'adherence', 'recent'] as const
export type OrdenClientes = typeof ORDENES[number]

export interface FiltrosClientes { estado: ClientFilter; etiqueta: string | null; profesional: string | null; orden: OrdenClientes }
export const FILTROS_POR_DEFECTO: FiltrosClientes = { estado: 'all', etiqueta: null, profesional: null, orden: 'attention' }

/** Días que cuenta un alta como "nueva". */
export const DIAS_NUEVO = 30

export function esNuevo(createdAt: number | undefined, ahora: number = Date.now()): boolean {
  return typeof createdAt === 'number' && createdAt > 0 && ahora - createdAt <= DIAS_NUEVO * 86400000
}

const clave = (uid: string) => `pf_filtros_clientes_${uid}`

export function limpiarFiltros(raw: unknown): FiltrosClientes {
  const o = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const texto = (v: unknown) => (typeof v === 'string' ? v.slice(0, 64) : null)
  return {
    estado: (FILTROS_ESTADO as readonly string[]).includes(o.estado as string) ? o.estado as ClientFilter : 'all',
    etiqueta: texto(o.etiqueta) || null,
    profesional: texto(o.profesional), // '' = sin asignar
    orden: (ORDENES as readonly string[]).includes(o.orden as string) ? o.orden as OrdenClientes : 'attention',
  }
}

export function leerFiltros(uid: string): FiltrosClientes {
  try { return limpiarFiltros(JSON.parse(localStorage.getItem(clave(uid)) || '{}')) } catch { return FILTROS_POR_DEFECTO }
}

export function guardarFiltros(uid: string, f: FiltrosClientes) {
  try { localStorage.setItem(clave(uid), JSON.stringify(f)) } catch {}
}
