// Cola diaria del entrenador: de la lista plana de avisos (decenas de líneas, una por suceso) a una lista
// corta de CLIENTES que atender hoy, ordenada por urgencia. Todo se deriva de los avisos que ya existen
// (hooks/useInboxItems); no se guarda nada nuevo salvo lo que el entrenador marca como hecho o pospone.
//
//  · Una fila por cliente (antes una línea por suceso: 114 avisos pasan a unas pocas filas).
//  · Tres niveles: urgente (dolor articular o fuerte, carga alta, vídeo esperando), hoy y cuando puedas.
//  · Las sesiones completadas no son tareas: van aparte como actividad reciente.
//  · "Hecho" y "Posponer" sacan la fila de la cola sin perder nada (se recuperan). Lo urgente no se pospone.

export type QueueTier = 'urgente' | 'hoy' | 'luego'
export type QueueKind = 'sesion' | 'readiness' | 'dolor' | 'video' | 'borrador' | 'riesgo' | 'revision' | 'sustitucion' | 'duda'

/** Lo que el entrenador puede resolver desde la propia fila, sin abrir la ficha. */
export interface QueueAccion { tipo: 'aceptar-alternativa'; clientId: string; ejercicio: string; alternativa: string; exerciseId?: string }

/** Aviso tal como lo genera useInboxItems, ya con su prioridad. */
export interface QueueItem {
  key: string
  clientId: string
  clientName: string
  date: string
  kind: QueueKind
  detail: string
  /** 'actividad' = no es una tarea (sesión completada). */
  tier: QueueTier | 'actividad'
  /** Dentro de un nivel, mayor = antes. */
  score: number
  accion?: QueueAccion
}

export interface QueueReason {
  kind: QueueKind; detail: string; score: number; keys: string[]; count: number
  /** Avisos de esta razón que se pueden resolver desde la fila (cada uno con su texto, porque no se pueden resumir en uno). */
  acciones?: { key: string; detail: string; accion: QueueAccion }[]
}

export interface QueueRow {
  clientId: string
  clientName: string
  tier: QueueTier
  score: number
  /** Una razón por tipo de aviso; la primera es la más urgente. */
  reasons: QueueReason[]
  /** Todas las claves de avisos pendientes de la fila (para marcarlos como hechos de una vez). */
  keys: string[]
  /** Lo urgente no se pospone: se atiende o se marca como hecho. */
  snoozable: boolean
}

export interface ParkedRow { row: QueueRow; why: 'hecho' | 'pospuesto'; until?: string }

export interface ActivityRow { clientId: string; clientName: string; date: string; detail: string }

export interface DailyQueue {
  pending: QueueRow[]
  parked: ParkedRow[]
  activity: ActivityRow[]
  counts: Record<QueueTier, number>
  /** Lo que merece el globo de la barra: urgente + hoy (lo de "cuando puedas" no cuenta). */
  badge: number
}

const TIER_RANK: Record<QueueTier, number> = { urgente: 0, hoy: 1, luego: 2 }

export const isSnoozed = (until: string | undefined, today: string) => !!until && until > today

/** Primer lunes posterior a `from` (AAAA-MM-DD), para "posponer hasta el lunes". */
export function nextMonday(from: string): string {
  const [y, m, d] = from.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const add = ((8 - date.getDay()) % 7) || 7
  date.setDate(date.getDate() + add)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function tomorrow(from: string): string {
  const [y, m, d] = from.split('-').map(Number)
  const date = new Date(y, m - 1, d + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function buildRow(clientId: string, items: QueueItem[]): QueueRow {
  // Varios avisos del mismo tipo de un cliente (p. ej. cinco check-ins) son UNA razón.
  const byKind = new Map<QueueKind, QueueItem[]>()
  for (const it of items) (byKind.get(it.kind) ?? byKind.set(it.kind, []).get(it.kind)!).push(it)
  const reasons: QueueReason[] = [...byKind.entries()].map(([kind, list]) => {
    const top = [...list].sort((a, b) => b.score - a.score || b.date.localeCompare(a.date))[0]
    const acciones = list.filter(i => i.accion).map(i => ({ key: i.key, detail: i.detail, accion: i.accion! }))
    return { kind, detail: list.length > 1 ? `${top.detail} (+${list.length - 1} más)` : top.detail, score: top.score, keys: list.map(i => i.key), count: list.length, ...(acciones.length ? { acciones } : {}) }
  }).sort((a, b) => b.score - a.score)

  const tier = items.reduce<QueueTier>((t, i) => (i.tier !== 'actividad' && TIER_RANK[i.tier] < TIER_RANK[t] ? i.tier : t), 'luego')
  // Un cliente con varias razones sube un poco, sin saltarse de nivel.
  const score = reasons[0].score + Math.min(15, 3 * (reasons.length - 1))
  return { clientId, clientName: items[0].clientName, tier, score, reasons, keys: items.map(i => i.key), snoozable: tier !== 'urgente' }
}

const byUrgency = (a: QueueRow, b: QueueRow) =>
  TIER_RANK[a.tier] - TIER_RANK[b.tier] || b.score - a.score || a.clientName.localeCompare(b.clientName, 'es')

export function buildQueue(items: QueueItem[], opts: { reviewed: ReadonlySet<string>; snoozed: Record<string, string>; today: string }): DailyQueue {
  const tasks = items.filter(i => i.tier !== 'actividad')
  const byClient = new Map<string, QueueItem[]>()
  for (const it of tasks) (byClient.get(it.clientId) ?? byClient.set(it.clientId, []).get(it.clientId)!).push(it)

  const pending: QueueRow[] = []
  const parked: ParkedRow[] = []
  for (const [clientId, list] of byClient) {
    const open = list.filter(i => !opts.reviewed.has(i.key))
    if (open.length === 0) { parked.push({ row: buildRow(clientId, list), why: 'hecho' }); continue }
    const row = buildRow(clientId, open)
    const until = opts.snoozed[clientId]
    // Lo urgente no se pospone, aunque la fila se hubiera pospuesto antes de volverse urgente.
    if (isSnoozed(until, opts.today) && row.snoozable) parked.push({ row, why: 'pospuesto', until })
    else pending.push(row)
  }
  pending.sort(byUrgency)
  parked.sort((a, b) => byUrgency(a.row, b.row))

  // Actividad reciente: una línea por cliente y día, lo más reciente primero.
  const sesiones = new Map<string, ActivityRow>()
  for (const it of items) {
    if (it.tier !== 'actividad') continue
    sesiones.set(`${it.clientId}:${it.date}`, { clientId: it.clientId, clientName: it.clientName, date: it.date, detail: it.detail })
  }
  const activity = [...sesiones.values()].sort((a, b) => b.date.localeCompare(a.date) || a.clientName.localeCompare(b.clientName, 'es'))

  const counts: Record<QueueTier, number> = { urgente: 0, hoy: 0, luego: 0 }
  for (const r of pending) counts[r.tier]++
  return { pending, parked, activity, counts, badge: counts.urgente + counts.hoy }
}
