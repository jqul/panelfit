import { describe, it, expect } from 'vitest'
import { mapCliente, mapClientes } from './mappers'

describe('mapCliente', () => {
  it('maps a row with the canonical (English) field names', () => {
    const row = { id: '1', name: 'Ana', surname: 'García', weight: 60, trainerId: 't1', token: 'tok', createdAt: 100, isActive: false }
    expect(mapCliente(row)).toEqual({
      id: '1', name: 'Ana', surname: 'García', weight: 60, fatPercentage: 0, muscleMass: 0,
      totalLifted: 0, planDescription: '', trainerId: 't1', token: 'tok', createdAt: 100, isActive: false,
    })
  })

  it('falls back to the legacy (Spanish) field names', () => {
    const row = { id: '2', nombre: 'Luis', apellido: 'Pérez', entrenador_id: 't2', activo: false }
    const mapped = mapCliente(row)
    expect(mapped.name).toBe('Luis')
    expect(mapped.surname).toBe('Pérez')
    expect(mapped.trainerId).toBe('t2')
    expect(mapped.isActive).toBe(false)
  })

  it('defaults isActive to true and derives createdAt from created_at when missing', () => {
    const row = { id: '3', created_at: '2024-01-01T00:00:00Z' }
    const mapped = mapCliente(row)
    expect(mapped.isActive).toBe(true)
    expect(mapped.createdAt).toBe(new Date('2024-01-01T00:00:00Z').getTime())
  })
})

describe('mapClientes', () => {
  it('maps an array of rows', () => {
    expect(mapClientes([{ id: '1' }, { id: '2' }])).toHaveLength(2)
  })

  it('returns an empty array for null/undefined input', () => {
    expect(mapClientes(undefined as any)).toEqual([])
  })
})
