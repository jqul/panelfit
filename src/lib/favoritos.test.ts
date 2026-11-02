import { describe, it, expect, beforeEach } from 'vitest'
import { leerFavoritos, alternarFavorito, esFavorito } from './favoritos'

describe('favoritos', () => {
  const mem: Record<string, string> = {}
  beforeEach(() => {
    for (const k of Object.keys(mem)) delete mem[k]
    ;(globalThis as { localStorage?: Storage }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v } } as Storage
  })
  it('marcar, desmarcar y recordarlo (sin distinguir mayúsculas)', () => {
    let f = alternarFavorito(leerFavoritos(), 'Press banca')
    f = alternarFavorito(f, 'Sentadilla')
    expect(leerFavoritos()).toEqual(['Press banca', 'Sentadilla'])
    expect(esFavorito(f, 'press BANCA ')).toBe(true)
    f = alternarFavorito(f, 'PRESS banca')
    expect(leerFavoritos()).toEqual(['Sentadilla'])
  })
  it('un valor roto se ignora', () => {
    mem['pf_ejercicios_favoritos'] = '{no es json'
    expect(leerFavoritos()).toEqual([])
  })
})
