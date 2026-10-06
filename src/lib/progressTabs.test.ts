import { describe, it, expect } from 'vitest'
import { buildGroups, groupOf, leafForGroup } from './progressTabs'

const ALL = ['resumen', 'historial', 'records', 'peso', 'dolor', 'fotos', 'feedback', 'metricas']

describe('buildGroups', () => {
  it('con todo disponible deja cinco grupos y ninguna vista fuera', () => {
    const g = buildGroups(ALL)
    expect(g.map(x => x.label)).toEqual(['Resumen', 'Entrenos', 'Fuerza', 'Cuerpo', 'Más'])
    expect(g.flatMap(x => x.leaves.map(l => l.id)).sort()).toEqual([...ALL].sort())
  })
  it('oculta las vistas no disponibles y los grupos que se quedan vacíos', () => {
    const g = buildGroups(['resumen', 'historial', 'peso'])
    expect(g.map(x => x.id)).toEqual(['resumen', 'entrenos', 'cuerpo'])
    expect(g.find(x => x.id === 'cuerpo')!.leaves.map(l => l.id)).toEqual(['peso'])
  })
  it('ignora ids desconocidos', () => {
    expect(buildGroups(['resumen', 'otra']).flatMap(g => g.leaves.map(l => l.id))).toEqual(['resumen'])
  })
})

describe('groupOf y leafForGroup', () => {
  const g = buildGroups(ALL)
  it('encuentra el grupo de una vista', () => {
    expect(groupOf(g, 'fotos')?.id).toBe('cuerpo')
    expect(groupOf(g, 'dolor')?.id).toBe('mas')
    expect(groupOf(g, 'nada')).toBeUndefined()
  })
  it('vuelve a la última vista usada del grupo, o a la primera', () => {
    const cuerpo = g.find(x => x.id === 'cuerpo')!
    expect(leafForGroup(cuerpo, 'fotos')).toBe('fotos')
    expect(leafForGroup(cuerpo)).toBe('peso')
    expect(leafForGroup(cuerpo, 'records')).toBe('peso')
  })
})
