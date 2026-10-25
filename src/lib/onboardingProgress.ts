// Progreso del onboarding del entrenador: de "tour de pantallas" a tres resultados que se comprueban con
// datos reales. Qué paso está hecho se deduce de lo que existe (clientes, planes, si el cliente abrió el
// enlace), no de lo que el entrenador marcó; solo "enlace enviado" no tiene señal en el servidor, y se
// recuerda en este dispositivo. Todo es puro y se prueba aparte (sin React ni red).

export type OnboardingStepId = 'cliente' | 'plan' | 'acceso'

/** Lo mínimo que hace falta saber de cada cliente. */
export interface OnboardingClient {
  id: string
  hasPlan?: boolean
  /** Fecha en que el cliente abrió su plan por primera vez (clientes.plan_last_opened_at). */
  openedAt?: string | null
}

export interface OnboardingStep {
  id: OnboardingStepId
  title: string
  desc: string
  cta: string
  done: boolean
}

export interface OnboardingProgress {
  steps: OnboardingStep[]
  done: number
  total: number
  percent: number
  /** Primer paso sin hacer; null si está todo. */
  next: OnboardingStep | null
  complete: boolean
  /** Cliente al que se refiere el siguiente paso (el que no tiene plan / al que falta enviar el enlace). */
  focusClientId: string | null
  /** Clientes que ya abrieron su enlace: la prueba de que el resultado llegó. */
  openedCount: number
}

export function computeProgress(clients: OnboardingClient[], sentIds: ReadonlySet<string>): OnboardingProgress {
  const hasClient = clients.length > 0
  const withPlan = clients.filter(c => c.hasPlan)
  const reached = clients.filter(c => !!c.openedAt || sentIds.has(c.id))
  const steps: OnboardingStep[] = [
    { id: 'cliente', title: 'Crea tu primer cliente', desc: 'Nombre y listo: el resto se completa después.', cta: 'Crear cliente', done: hasClient },
    { id: 'plan', title: 'Asígnale un workout', desc: 'Elige una plantilla de arranque o una tuya.', cta: 'Elegir workout', done: withPlan.length > 0 },
    { id: 'acceso', title: 'Envíale el acceso', desc: 'Un enlace por WhatsApp, sin instalar nada.', cta: 'Enviar enlace', done: reached.length > 0 },
  ]
  const done = steps.filter(s => s.done).length
  const next = steps.find(s => !s.done) ?? null

  let focusClientId: string | null = null
  if (next?.id === 'plan') focusClientId = clients.find(c => !c.hasPlan)?.id ?? null
  else if (next?.id === 'acceso') focusClientId = (withPlan.find(c => !c.openedAt && !sentIds.has(c.id)) ?? clients[0])?.id ?? null

  return {
    steps, done, total: steps.length, percent: Math.round((done / steps.length) * 100),
    next, complete: next === null, focusClientId, openedCount: clients.filter(c => !!c.openedAt).length,
  }
}

// ── Lo que se recuerda en este dispositivo ──────────────────────────────────────────────────────────
// Se recibe el `Storage` para poder probarlo; cada acceso va en try/catch (modo privado, cuota...).

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const sentKey = (uid: string) => `pf_onb_sent_${uid}`
const hiddenKey = (uid: string) => `pf_onb_hidden_${uid}`

export function loadSent(store: Store, uid: string): Set<string> {
  try {
    const raw = JSON.parse(store.getItem(sentKey(uid)) || '[]')
    return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [])
  } catch { return new Set() }
}

export function markSent(store: Store, uid: string, clientId: string): Set<string> {
  const next = loadSent(store, uid)
  next.add(clientId)
  try { store.setItem(sentKey(uid), JSON.stringify([...next])) } catch { /* sin almacenamiento: se pierde solo la marca */ }
  return next
}

export function isHidden(store: Store, uid: string): boolean {
  try { return store.getItem(hiddenKey(uid)) === '1' } catch { return false }
}

export function setHidden(store: Store, uid: string, hidden: boolean): void {
  try { if (hidden) store.setItem(hiddenKey(uid), '1'); else store.removeItem(hiddenKey(uid)) } catch { /* idem */ }
}

/** ¿Hay que enseñar la tarjeta en "Hoy"? Oculta por el entrenador o ya completa (salvo que la reabra) → no. */
export function shouldShowChecklist(p: OnboardingProgress, hidden: boolean, forced: boolean): boolean {
  if (forced) return true
  return !hidden && !p.complete
}
