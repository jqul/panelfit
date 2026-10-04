import { describe, it, expect } from 'vitest'
import { rankByQuery } from './exerciseSearch'
import { fetchAllPages } from './fetchAllPages'

const ex = (name: string) => ({ name })

describe('rankByQuery', () => {
  const lib = [
    'Sentadilla búlgara con banda y pausa', 'Sentadilla con barra (back squat)', 'Sentadilla', 'Media sentadilla',
    'Remo en polea baja (seated cable row)', 'Remo con barra', 'Press banca', 'Press de banca con pausa',
  ].map(ex)

  it('pone el básico antes que las variantes', () => {
    expect(rankByQuery(lib, 'sentadilla')[0].name).toBe('Sentadilla')
  })

  it('ignora tildes y mayúsculas', () => {
    const names = rankByQuery(lib, 'BULGARA').map(e => e.name)
    expect(names).toEqual(['Sentadilla búlgara con banda y pausa'])
  })

  it('exige todos los términos, en cualquier orden', () => {
    expect(rankByQuery(lib, 'polea remo').map(e => e.name)).toEqual(['Remo en polea baja (seated cable row)'])
  })

  it('lo que empieza por el texto va antes que lo que solo lo contiene', () => {
    const names = rankByQuery(lib, 'sentadilla').map(e => e.name)
    expect(names.indexOf('Media sentadilla')).toBeGreaterThan(names.indexOf('Sentadilla con barra (back squat)'))
  })

  it('sin texto devuelve todo, con los básicos primero y no los nombres más cortos', () => {
    const r = rankByQuery([...lib, ex('Otis'), ex('Butt')], '')
    expect(r).toHaveLength(lib.length + 2)
    expect(r[0].name).toBe('Sentadilla')
    const top = r.slice(0, 5).map(e => e.name)
    expect(top).toContain('Press banca')
    expect(top).not.toContain('Butt')
    expect(top).not.toContain('Otis')
  })
})

describe('fetchAllPages', () => {
  it('sigue pidiendo páginas hasta agotar los datos (PostgREST corta a 1000)', async () => {
    const all = Array.from({ length: 2500 }, (_, i) => i)
    const calls: number[] = []
    const { rows, error } = await fetchAllPages<number>(async (from, to) => {
      calls.push(from)
      return { data: all.slice(from, to + 1), error: null }
    })
    expect(error).toBeNull()
    expect(rows).toHaveLength(2500)
    expect(calls).toEqual([0, 1000, 2000])
  })

  it('devuelve lo ya leído y el error si una página falla', async () => {
    let n = 0
    const { rows, error } = await fetchAllPages<number>(async () =>
      n++ === 0 ? { data: Array.from({ length: 1000 }, (_, i) => i), error: null } : { data: null, error: 'boom' })
    expect(rows).toHaveLength(1000)
    expect(error).toBe('boom')
  })
})
