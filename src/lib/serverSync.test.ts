import { describe, it, expect, vi, beforeEach } from 'vitest'

// Base de datos falsa con la semántica que usa serverSync: lectura, insert (con error de duplicado)
// y update condicionado a la versión (updatedAt), que devuelve las filas que cambió.
const db = vi.hoisted(() => ({
  row: null as { logs: Record<string, any>; updatedAt: number | null } | null,
  plan: null as { plan: any; plan_borrador?: any; updatedAt: number | null } | null,
  beforeWrite: null as null | (() => void),
}))

vi.mock('./supabase', () => {
  const table = (name: 'registros' | 'planes') => {
    const get = () => (name === 'registros' ? db.row : db.plan) as any
    const set = (v: any) => { if (name === 'registros') db.row = v; else db.plan = v }
    const col = name === 'registros' ? 'logs' : 'plan'
    return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: get() ? { [col]: get()[col], plan_borrador: get().plan_borrador ?? null, updatedAt: get().updatedAt } : null, error: null }) }) }),
      insert: async (v: any) => {
        if (get()) return { error: { code: '23505', message: 'duplicado' } }
        set({ [col]: v[col], updatedAt: v.updatedAt }); return { error: null }
      },
      update: (v: any) => {
        const filters: Record<string, unknown> = {}
        const q: any = {
          eq: (c: string, val: unknown) => { filters[c] = val; return q },
          is: (c: string, val: unknown) => { filters[c] = val; return q },
          select: async () => {
            db.beforeWrite?.(); db.beforeWrite = null
            const cur = get()
            if (cur && cur.updatedAt === filters.updatedAt) { set({ [col]: v[col], ...('plan_borrador' in v ? { plan_borrador: v.plan_borrador } : { plan_borrador: cur.plan_borrador }), updatedAt: v.updatedAt }); return { data: [{ clientId: 'c' }], error: null } }
            return { data: [], error: null }
          },
        }
        return q
      },
    }
  }
  return { supabase: { from: (n: 'registros' | 'planes') => table(n) } }
})

import { diffKeys, mergeLogs, adoptRemote, casUpdate, saveLogsMerged, savePlanDiasMerged, addPlanAlternative } from './serverSync'

const e = (done: boolean, peso = '100') => ({ done, sets: { 0: { weight: peso, reps: '5' } } }) as any

beforeEach(() => { db.row = null; db.plan = null; db.beforeWrite = null })

describe('diffKeys / mergeLogs / adoptRemote', () => {
  it('diffKeys devuelve solo las claves nuevas o cambiadas', () => {
    const prev = { a: e(true), b: e(false) }
    const next = { a: e(true), b: e(true), c: e(false) }
    expect(diffKeys(prev, next).sort()).toEqual(['b', 'c'])
  })

  it('mergeLogs conserva lo del servidor en lo no tocado y aplica lo tocado aquí', () => {
    const server = { a: e(true, '90'), x: e(true, '50') }          // x: lo escribió otro dispositivo o el entrenador
    const local = { a: e(true, '95'), b: e(true) }
    expect(mergeLogs(server, local, ['a', 'b'])).toEqual({ a: local.a, b: local.b, x: server.x })
  })

  it('mergeLogs no inventa claves que no están en local', () => {
    expect(mergeLogs({}, { a: e(true) }, ['zzz'])).toEqual({})
  })

  it('adoptRemote trae lo del servidor en ejercicios no tocados y respeta lo marcado entretanto', () => {
    const snapshot = { a: e(true), b: e(false) }
    const merged = { a: e(true), b: e(false), x: e(true, '50') }
    // mientras subía, el cliente marcó "b": su valor actual ya no es el del snapshot
    const current = { ...snapshot, b: e(true, '120') }
    const next = adoptRemote(current, snapshot, merged)
    expect(next.x).toEqual(merged.x)
    expect(next.b).toBe(current.b)
  })

  it('adoptRemote devuelve el mismo objeto si no hay nada que adoptar', () => {
    const snapshot = { a: e(true) }
    expect(adoptRemote(snapshot, snapshot, { a: e(true) })).toBe(snapshot)
  })
})

describe('casUpdate', () => {
  it('reintenta cuando alguien escribió entre la lectura y la escritura', async () => {
    let lecturas = 0, escrituras = 0
    const res = await casUpdate<number>({
      read: async () => ({ value: ++lecturas, version: lecturas, exists: true }),
      merge: v => (v ?? 0) * 10,
      write: async () => (++escrituras < 3 ? 'conflict' : 'ok'),
    })
    expect(res).toEqual({ ok: true, merged: 30 })
    expect(lecturas).toBe(3)
  })

  it('se rinde tras los intentos y no repite si la escritura da error', async () => {
    let n = 0
    expect(await casUpdate<number>({ read: async () => ({ value: 1, version: 1, exists: true }), merge: v => v!, write: async () => { n++; return 'conflict' }, tries: 3 })).toEqual({ ok: false })
    expect(n).toBe(3)
    n = 0
    expect(await casUpdate<number>({ read: async () => ({ value: 1, version: 1, exists: true }), merge: v => v!, write: async () => { n++; return 'error' } })).toEqual({ ok: false })
    expect(n).toBe(1)
  })

  it('si no puede leer, no escribe', async () => {
    let escribio = false
    expect(await casUpdate<number>({ read: async () => null, merge: () => 1, write: async () => { escribio = true; return 'ok' } })).toEqual({ ok: false })
    expect(escribio).toBe(false)
  })
})

describe('saveLogsMerged', () => {
  it('no pisa lo que el entrenador escribió en otros ejercicios (el caso de "editan a la vez")', async () => {
    db.row = { logs: { x: e(true, '50') }, updatedAt: 1000 }   // el entrenador registró "x"
    const res = await saveLogsMerged('c', { a: e(true) }, ['a']) // el cliente, que no lo sabe, sube "a"
    expect(res.ok).toBe(true)
    expect(Object.keys(db.row!.logs).sort()).toEqual(['a', 'x'])
    expect(db.row!.updatedAt!).toBeGreaterThan(1000)
  })

  it('si alguien escribe justo entre la lectura y la escritura, reintenta y no pierde nada', async () => {
    db.row = { logs: { x: e(true) }, updatedAt: 1000 }
    db.beforeWrite = () => { db.row = { logs: { ...db.row!.logs, y: e(true, '70') }, updatedAt: 2000 } } // otro dispositivo
    const res = await saveLogsMerged('c', { a: e(true) }, ['a'])
    expect(res.ok).toBe(true)
    expect(Object.keys(db.row!.logs).sort()).toEqual(['a', 'x', 'y'])
  })

  it('crea la fila si todavía no existe (primer entreno)', async () => {
    const res = await saveLogsMerged('c', { a: e(true) }, ['a'])
    expect(res.ok).toBe(true)
    expect(db.row!.logs).toEqual({ a: e(true) })
  })

  it('si dos escriben el MISMO ejercicio a la vez, gana el último en subir', async () => {
    db.row = { logs: { a: e(true, '90') }, updatedAt: 1000 }
    const res = await saveLogsMerged('c', { a: e(true, '95') }, ['a'])
    expect(res.ok).toBe(true)
    expect(db.row!.logs.a.sets[0].weight).toBe('95')
  })

  it('con la versión nula (filas antiguas) también escribe', async () => {
    db.row = { logs: { x: e(true) }, updatedAt: null }
    expect((await saveLogsMerged('c', { a: e(true) }, ['a'])).ok).toBe(true)
    expect(Object.keys(db.row!.logs).sort()).toEqual(['a', 'x'])
  })
})

describe('savePlanDiasMerged', () => {
  it('cambia solo diasElegidos y conserva lo que el entrenador publicó después', async () => {
    // El cliente abrió la app con el plan v1; el entrenador publicó v2 (con pesos nuevos) después.
    db.plan = { plan: { P: { weeks: ['semana publicada por el entrenador'], programId: 'p2' } }, updatedAt: 5000 }
    const res = await savePlanDiasMerged('c', [0, 2, 4])
    expect(res.ok).toBe(true)
    expect(db.plan!.plan.P.weeks).toEqual(['semana publicada por el entrenador'])
    expect(db.plan!.plan.P.programId).toBe('p2')
    expect(db.plan!.plan.P.diasElegidos).toEqual([0, 2, 4])
    expect(db.plan!.updatedAt!).toBeGreaterThan(5000)
  })

  it('si el entrenador publica justo mientras tanto, reintenta sobre su versión', async () => {
    db.plan = { plan: { P: { weeks: ['v1'] } }, updatedAt: 5000 }
    db.beforeWrite = () => { db.plan = { plan: { P: { weeks: ['v2'] } }, updatedAt: 6000 } }
    expect((await savePlanDiasMerged('c', [1])).ok).toBe(true)
    expect(db.plan!.plan.P.weeks).toEqual(['v2'])
    expect(db.plan!.plan.P.diasElegidos).toEqual([1])
  })

  it('sin plan en el servidor no escribe nada', async () => {
    expect((await savePlanDiasMerged('c', [1])).ok).toBe(false)
  })
})

describe('addPlanAlternative', () => {
  const ejercicio = (name: string, extra: object = {}) => ({ name, sets: '3x10', weight: '', isMain: false, comment: '', ...extra })
  const planConPress = (extra: object = {}) => ({ P: { weeks: [0, 1].map(i => ({ label: 'S' + i, rpe: '', isCurrent: false, days: [{ title: 'A', focus: '', exercises: [ejercicio('Press banca', extra), ejercicio('Remo')] }] })) } })

  it('añade la alternativa al ejercicio en todas las semanas y sube la versión', async () => {
    db.plan = { plan: planConPress(), updatedAt: 5000 }
    const res = await addPlanAlternative('c', 'Press banca', { name: 'Press mancuernas' })
    expect(res).toEqual({ ok: true, changed: true })
    for (const w of db.plan!.plan.P.weeks) {
      expect(w.days[0].exercises[0].alternativas).toEqual([{ name: 'Press mancuernas' }])
      expect(w.days[0].exercises[1].alternativas).toBeUndefined()
    }
    expect(db.plan!.updatedAt!).toBeGreaterThan(5000)
  })

  it('si ya estaba no escribe nada (la versión no cambia)', async () => {
    db.plan = { plan: planConPress({ alternativas: [{ name: 'Press mancuernas' }] }), updatedAt: 5000 }
    expect(await addPlanAlternative('c', 'Press banca', { name: 'press MANCUERNAS' })).toEqual({ ok: true, changed: false })
    expect(db.plan!.updatedAt).toBe(5000)
  })

  it('también lo añade al borrador si hay uno, y lo deja como estaba si no', async () => {
    db.plan = { plan: planConPress(), plan_borrador: planConPress({ comment: 'borrador' }), updatedAt: 5000 }
    await addPlanAlternative('c', 'Press banca', { name: 'Flexiones' })
    expect(db.plan!.plan_borrador.P.weeks[0].days[0].exercises[0].alternativas).toEqual([{ name: 'Flexiones' }])
    db.plan = { plan: planConPress(), updatedAt: 5000 }
    await addPlanAlternative('c', 'Press banca', { name: 'Flexiones' })
    expect(db.plan!.plan_borrador ?? null).toBeNull() // sin borrador no se inventa uno
    expect(db.plan!.plan.P.weeks[0].days[0].exercises[0].alternativas).toEqual([{ name: 'Flexiones' }])
  })

  it('si el entrenador publica justo mientras tanto, reintenta sobre su versión sin perderla', async () => {
    db.plan = { plan: planConPress(), updatedAt: 5000 }
    db.beforeWrite = () => { db.plan = { plan: planConPress({ comment: 'publicado entre medias' }), updatedAt: 6000 } }
    expect((await addPlanAlternative('c', 'Press banca', { name: 'Flexiones' })).ok).toBe(true)
    const ex = db.plan!.plan.P.weeks[0].days[0].exercises[0]
    expect(ex.comment).toBe('publicado entre medias')
    expect(ex.alternativas).toEqual([{ name: 'Flexiones' }])
  })

  it('sin plan en el servidor no escribe nada', async () => {
    expect((await addPlanAlternative('c', 'Press banca', { name: 'Flexiones' })).ok).toBe(false)
  })
})
