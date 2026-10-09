import { describe, it, expect, vi } from 'vitest'

// planSnapshot importa el cliente de Supabase; aquí solo se prueba la parte pura.
vi.mock('./supabase', () => ({ supabase: {} }))
vi.mock('./errors', () => ({ logError: () => {} }))

import { hasPlanContent, buildHistoryRows, rowsToRestore, buildRestorePayload, snapshotNote, type PlanRowSnapshot } from './planSnapshot'

const plan = (n: number) => ({ P: { weeks: Array.from({ length: n }, () => ({})) } })
const row = (o: Partial<PlanRowSnapshot> = {}): PlanRowSnapshot => ({
  clientId: 'c1', plan: plan(3), plan_borrador: null, borrador_activo: false, borrador_started_at: null, ...o,
})

describe('hasPlanContent', () => {
  it('un plan con semanas tiene contenido; vacío o ausente no', () => {
    expect(hasPlanContent(plan(1))).toBe(true)
    expect(hasPlanContent(plan(0))).toBe(false)
    expect(hasPlanContent(null)).toBe(false)
    expect(hasPlanContent(undefined)).toBe(false)
    expect(hasPlanContent({})).toBe(false)
  })
})

describe('buildHistoryRows', () => {
  it('guarda el plan vivo con una nota que dice qué programa lo sustituye', () => {
    const rows = buildHistoryRows([row()], 'Fuerza 12 semanas')
    expect(rows).toHaveLength(1)
    expect(rows[0].note).toBe('Copia automática antes de asignar "Fuerza 12 semanas"')
    expect(rows[0].plan).toEqual(plan(3))
  })
  it('si había un borrador abierto lo guarda también, porque asignar lo descarta', () => {
    const rows = buildHistoryRows([row({ borrador_activo: true, plan_borrador: plan(5) })], 'X')
    expect(rows.map(r => r.note)).toEqual([snapshotNote('X'), snapshotNote('X', 'borrador')])
    expect(rows[1].plan).toEqual(plan(5))
  })
  it('un borrador marcado inactivo o vacío no se guarda', () => {
    expect(buildHistoryRows([row({ borrador_activo: false, plan_borrador: plan(5) })], 'X')).toHaveLength(1)
    expect(buildHistoryRows([row({ borrador_activo: true, plan_borrador: plan(0) })], 'X')).toHaveLength(1)
  })
  it('un cliente sin plan no genera entrada', () => {
    expect(buildHistoryRows([row({ plan: null })], 'X')).toEqual([])
  })
})

describe('rowsToRestore / buildRestorePayload', () => {
  it('solo se restauran los clientes que tenían algo que perder', () => {
    const rows = [row({ clientId: 'a' }), row({ clientId: 'b', plan: null }), row({ clientId: 'c', plan: plan(0), borrador_activo: true, plan_borrador: plan(2) })]
    expect(rowsToRestore(rows).map(r => r.clientId)).toEqual(['a', 'c'])
  })
  it('el payload devuelve plan y borrador tal cual estaban', () => {
    const r = row({ borrador_activo: true, plan_borrador: plan(2), borrador_started_at: '2026-10-01T10:00:00Z' })
    expect(buildRestorePayload(r, 123)).toEqual({
      clientId: 'c1', plan: plan(3), plan_borrador: plan(2), borrador_activo: true, borrador_started_at: '2026-10-01T10:00:00Z', updatedAt: 123,
    })
  })
  it('borrador_activo nulo se guarda como falso', () => {
    expect(buildRestorePayload(row({ borrador_activo: null }), 1).borrador_activo).toBe(false)
  })
})
