import { describe, it, expect } from 'vitest'
import { contarMotivos, etiquetaMotivo } from './motivosBaja'

describe('motivos de baja', () => {
  it('reparto desde una fecha, de más a menos', () => {
    const r = contarMotivos([
      { archivedAt: 100, archivadoMotivo: 'precio' },
      { archivedAt: 200, archivadoMotivo: 'precio' },
      { archivedAt: 300, archivadoMotivo: 'plan_terminado' },
      { archivedAt: 400 },
      { archivedAt: 10, archivadoMotivo: 'tiempo' }, // antes de la fecha
    ], 50)
    expect(r.map(x => [x.id, x.n, x.pct])).toEqual([['precio', 2, 50], ['plan_terminado', 1, 25], ['sin', 1, 25]])
  })
  it('etiquetas', () => {
    expect(etiquetaMotivo('lesion')).toBe('🩹 Lesión o salud')
    expect(etiquetaMotivo(undefined)).toBe('Sin motivo')
  })
})
