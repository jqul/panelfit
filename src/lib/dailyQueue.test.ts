import { describe, it, expect } from 'vitest'
import { buildQueue, nextMonday, tomorrow, isSnoozed, type QueueItem } from './dailyQueue'

const HOY = '2026-10-26' // lunes
const item = (over: Partial<QueueItem> & Pick<QueueItem, 'key' | 'clientId' | 'kind' | 'tier' | 'score'>): QueueItem =>
  ({ clientName: over.clientId.toUpperCase(), date: '2026-10-25', detail: over.kind, ...over })
const sinNada = { reviewed: new Set<string>(), snoozed: {}, today: HOY }

describe('buildQueue', () => {
  it('convierte decenas de avisos en una fila por cliente', () => {
    const items: QueueItem[] = []
    for (let d = 1; d <= 6; d++) items.push(item({ key: `r${d}`, clientId: 'a', kind: 'readiness', tier: 'luego', score: 10, date: `2026-10-${String(10 + d)}`, detail: `check-in ${d}` }))
    items.push(item({ key: 'dolor1', clientId: 'a', kind: 'dolor', tier: 'urgente', score: 108, detail: 'Molestia articular en lumbar (8/10)' }))
    items.push(item({ key: 'b1', clientId: 'b', kind: 'borrador', tier: 'hoy', score: 45 }))
    const q = buildQueue(items, sinNada)
    expect(q.pending.map(r => r.clientId)).toEqual(['a', 'b'])
    // seis check-ins son una razón ("+5 más"), y la fila del cliente A tiene dos razones, no siete
    const a = q.pending[0]
    expect(a.reasons).toHaveLength(2)
    expect(a.reasons[0]).toMatchObject({ kind: 'dolor', count: 1 })
    expect(a.reasons[1]).toMatchObject({ kind: 'readiness', count: 6 })
    expect(a.reasons[1].detail).toContain('+5 más')
    expect(a.keys).toHaveLength(7)
  })

  it('ordena por nivel (urgente, hoy, luego) y dentro del nivel por puntuación', () => {
    const q = buildQueue([
      item({ key: '1', clientId: 'luego', kind: 'readiness', tier: 'luego', score: 10 }),
      item({ key: '2', clientId: 'hoy-bajo', kind: 'revision', tier: 'hoy', score: 35 }),
      item({ key: '3', clientId: 'urgente', kind: 'video', tier: 'urgente', score: 80 }),
      item({ key: '4', clientId: 'hoy-alto', kind: 'riesgo', tier: 'hoy', score: 70 }),
    ], sinNada)
    expect(q.pending.map(r => r.clientId)).toEqual(['urgente', 'hoy-alto', 'hoy-bajo', 'luego'])
    expect(q.counts).toEqual({ urgente: 1, hoy: 2, luego: 1 })
  })

  it('el globo cuenta urgente y hoy, no lo de "cuando puedas"', () => {
    const q = buildQueue([
      item({ key: '1', clientId: 'a', kind: 'readiness', tier: 'luego', score: 10 }),
      item({ key: '2', clientId: 'b', kind: 'riesgo', tier: 'hoy', score: 60 }),
      item({ key: '3', clientId: 'c', kind: 'dolor', tier: 'urgente', score: 100 }),
    ], sinNada)
    expect(q.badge).toBe(2)
  })

  it('un cliente con varias razones sube algo, pero nunca de nivel', () => {
    const q = buildQueue([
      item({ key: '1', clientId: 'a', kind: 'borrador', tier: 'hoy', score: 45 }),
      item({ key: '2', clientId: 'a', kind: 'revision', tier: 'hoy', score: 35 }),
      item({ key: '3', clientId: 'a', kind: 'readiness', tier: 'luego', score: 10 }),
    ], sinNada)
    expect(q.pending[0].tier).toBe('hoy')
    expect(q.pending[0].score).toBe(45 + 6)
  })

  it('las sesiones completadas no son tareas: van a la actividad reciente, una línea por cliente y día', () => {
    const q = buildQueue([
      item({ key: 's1', clientId: 'a', kind: 'sesion', tier: 'actividad', score: 0, date: '2026-10-25' }),
      item({ key: 's2', clientId: 'a', kind: 'sesion', tier: 'actividad', score: 0, date: '2026-10-25' }),
      item({ key: 's3', clientId: 'b', kind: 'sesion', tier: 'actividad', score: 0, date: '2026-10-24' }),
    ], sinNada)
    expect(q.pending).toEqual([])
    expect(q.activity.map(a => `${a.clientId}:${a.date}`)).toEqual(['a:2026-10-25', 'b:2026-10-24'])
    expect(q.badge).toBe(0)
  })

  it('"hecho" saca los avisos marcados; reaparece solo lo nuevo', () => {
    const items = [
      item({ key: 'dolor:1', clientId: 'a', kind: 'dolor', tier: 'urgente', score: 100 }),
      item({ key: 'borrador:a', clientId: 'a', kind: 'borrador', tier: 'hoy', score: 45 }),
    ]
    const revisados = new Set(['dolor:1'])
    const q = buildQueue(items, { ...sinNada, reviewed: revisados })
    expect(q.pending).toHaveLength(1)
    expect(q.pending[0].tier).toBe('hoy') // ya no es urgente: el dolor está revisado
    expect(q.pending[0].reasons.map(r => r.kind)).toEqual(['borrador'])
    // todo revisado → la fila va a "hecho", y se puede recuperar
    const todo = buildQueue(items, { ...sinNada, reviewed: new Set(['dolor:1', 'borrador:a']) })
    expect(todo.pending).toEqual([])
    expect(todo.parked).toMatchObject([{ why: 'hecho' }])
    // aparece un aviso nuevo (otra molestia) → vuelve a la cola
    const nuevo = buildQueue([...items, item({ key: 'dolor:2', clientId: 'a', kind: 'dolor', tier: 'urgente', score: 100 })], { ...sinNada, reviewed: new Set(['dolor:1', 'borrador:a']) })
    expect(nuevo.pending.map(r => r.keys)).toEqual([['dolor:2']])
  })

  it('posponer oculta una fila hasta la fecha, pero lo urgente no se pospone', () => {
    const normal = [item({ key: 'b', clientId: 'a', kind: 'borrador', tier: 'hoy', score: 45 })]
    const q = buildQueue(normal, { ...sinNada, snoozed: { a: tomorrow(HOY) } })
    expect(q.pending).toEqual([])
    expect(q.parked).toMatchObject([{ why: 'pospuesto', until: '2026-10-27' }])
    // al llegar el día, vuelve
    expect(buildQueue(normal, { ...sinNada, today: '2026-10-27', snoozed: { a: tomorrow(HOY) } }).pending).toHaveLength(1)
    // si se pospuso y luego aparece algo urgente, vuelve aunque siga "pospuesta"
    const conUrgente = [...normal, item({ key: 'd', clientId: 'a', kind: 'dolor', tier: 'urgente', score: 100 })]
    const q2 = buildQueue(conUrgente, { ...sinNada, snoozed: { a: nextMonday(HOY) } })
    expect(q2.pending).toHaveLength(1)
    expect(q2.pending[0].snoozable).toBe(false)
  })
})

describe('fechas de posponer', () => {
  it('mañana y el próximo lunes', () => {
    expect(tomorrow('2026-10-31')).toBe('2026-11-01')
    expect(nextMonday('2026-10-26')).toBe('2026-11-02') // un lunes → el siguiente
    expect(nextMonday('2026-10-28')).toBe('2026-11-02')
    expect(nextMonday('2026-11-01')).toBe('2026-11-02') // domingo
  })
  it('isSnoozed: oculta mientras hoy sea anterior a la fecha', () => {
    expect(isSnoozed('2026-10-27', '2026-10-26')).toBe(true)
    expect(isSnoozed('2026-10-27', '2026-10-27')).toBe(false)
    expect(isSnoozed(undefined, '2026-10-27')).toBe(false)
  })
})
