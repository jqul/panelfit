import { describe, it, expect } from 'vitest'
import { archivadosSolos, limpiarAutoArchivar } from './autoArchivar'

describe('limpiarAutoArchivar', () => {
  it('apagado por defecto; días entre 1 y 90', () => {
    expect(limpiarAutoArchivar(undefined)).toEqual({ activo: false, dias: 14 })
    expect(limpiarAutoArchivar({ activo: true, dias: 400 })).toEqual({ activo: true, dias: 90 })
    expect(limpiarAutoArchivar({ activo: 'sí', dias: 'mucho' })).toEqual({ activo: false, dias: 14 })
  })
})

describe('archivadosSolos', () => {
  const ahora = Date.UTC(2026, 10, 14)
  it('solo los archivados solos y recientes, el último primero', () => {
    const lista = [
      { id: 'a', archivedAt: ahora - 2 * 86400000, archivadoMotivo: 'plan_terminado' },
      { id: 'b', archivedAt: ahora - 1 * 86400000, archivadoMotivo: 'plan_terminado' },
      { id: 'c', archivedAt: ahora - 1 * 86400000 },                                    // lo archivó el entrenador
      { id: 'd', archivedAt: ahora - 20 * 86400000, archivadoMotivo: 'plan_terminado' }, // hace mucho
    ]
    expect(archivadosSolos(lista, ahora).map(c => c.id)).toEqual(['b', 'a'])
  })
})
