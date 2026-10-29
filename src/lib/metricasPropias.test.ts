import { describe, it, expect } from 'vitest'
import { limpiarMetricas, nuevaMetrica, limpiarValores, evolucionMetrica } from './metricasPropias'

describe('limpiarMetricas', () => {
  it('se queda con lo válido, sin repetir', () => {
    expect(limpiarMetricas([
      { id: 'm_a', nombre: ' FC  en reposo ', unidad: 'lpm' },
      { id: 'm_a', nombre: 'Repetida', unidad: '' },
      { id: 'malo', nombre: 'Id raro', unidad: '' },
      { id: 'm_b', nombre: '', unidad: 'cm' },
      'basura', null,
    ])).toEqual([{ id: 'm_a', nombre: 'FC en reposo', unidad: 'lpm' }])
    expect(limpiarMetricas(undefined)).toEqual([])
  })
  it('como mucho 12', () => {
    expect(limpiarMetricas(Array.from({ length: 20 }, (_, i) => ({ id: `m_${i}`, nombre: `M${i}`, unidad: '' })))).toHaveLength(12)
  })
  it('una nueva tiene un id válido', () => {
    const m = nuevaMetrica('Cuello', 'cm')
    expect(limpiarMetricas([m])).toEqual([m])
  })
})

describe('valores y evolución', () => {
  const metricas = [{ id: 'm_a', nombre: 'FC', unidad: 'lpm' }]
  it('solo números de métricas que existen', () => {
    expect(limpiarValores({ m_a: 58, m_x: 3, m_b: 'x' } as any, metricas)).toEqual({ m_a: 58 })
  })
  it('de la primera a la última medida, por fecha', () => {
    const vals = [{ fecha: '2026-10-01', extra: { m_a: 62 } }, { fecha: '2026-09-01', extra: { m_a: 66 } }, { fecha: '2026-10-20', extra: {} }]
    expect(evolucionMetrica(vals, 'm_a')).toEqual({ primera: 66, ultima: 62, diferencia: -4, desde: '2026-09-01' })
    expect(evolucionMetrica([vals[0]], 'm_a')).toBeNull()
  })
})
