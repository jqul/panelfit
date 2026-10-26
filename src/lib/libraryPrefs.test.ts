import { describe, it, expect } from 'vitest'
import { mergePrefs, parsePrefKey, prefKey, sanitizePref, type PrefsSide } from './libraryPrefs'

const lado = (valores: PrefsSide['valores'], ts: PrefsSide['ts']): PrefsSide => ({ valores, ts })

describe('preferencias de la biblioteca: qué copia gana', () => {
  it('reconoce las claves de cada lista y nada más', () => {
    expect(parsePrefKey(prefKey('fav', 'u1'))).toEqual({ field: 'fav', uid: 'u1' })
    expect(parsePrefKey('pf_cats_abc-123')).toEqual({ field: 'cats', uid: 'abc-123' })
    expect(parsePrefKey('pf_tags_')).toBeNull()
    expect(parsePrefKey('pf_quick_note')).toBeNull()
    expect(parsePrefKey('pf_templates_u1')).toBeNull()
  })

  it('un dispositivo nuevo (vacío) adopta todo lo que hay en el servidor', () => {
    const r = mergePrefs(lado({}, {}), lado({ fav: ['e1'], cats: ['Pecho', 'Mi grupo'] }, { fav: 10, cats: 10 }))
    expect(r.adopt).toEqual({ fav: ['e1'], cats: ['Pecho', 'Mi grupo'] })
    expect(r.adoptStamps).toEqual({ fav: 10, cats: 10 })
    expect(r.upload).toBe(false)
  })

  it('sin nada en el servidor, lo que ya había en este dispositivo se sube (migración)', () => {
    const r = mergePrefs(lado({ fav: ['e1', 'e2'], tags: [{ id: 't', label: 'Rehab', emoji: '🩹' }] }, { fav: 50 }), null)
    expect(r.adopt).toEqual({})
    expect(r.upload).toBe(true)
    expect(r.merged.valores.fav).toEqual(['e1', 'e2'])
    expect(r.merged.ts.fav).toBe(50)
    expect(r.merged.ts.tags).toBe(1) // sin marca propia: el más antiguo posible, para no pisar nada más reciente
  })

  it('gana la más reciente, lista a lista: favoritos del móvil y etiquetas del ordenador no se pisan', () => {
    const local = lado({ fav: ['movil'], tags: [{ id: 't1', label: 'Viejo', emoji: '' }] }, { fav: 200, tags: 100 })
    const server = lado({ fav: ['ordenador'], tags: [{ id: 't2', label: 'Nuevo', emoji: '' }] }, { fav: 150, tags: 300 })
    const r = mergePrefs(local, server)
    expect(r.adopt.tags).toEqual([{ id: 't2', label: 'Nuevo', emoji: '' }]) // el servidor es más reciente en etiquetas
    expect(r.adopt.fav).toBeUndefined() // y el local en favoritos
    expect(r.upload).toBe(true)
    expect(r.merged.valores.fav).toEqual(['movil'])
    expect(r.merged.valores.tags).toEqual([{ id: 't2', label: 'Nuevo', emoji: '' }])
  })

  it('si ya coinciden no hay nada que adoptar ni que subir', () => {
    const a = lado({ fav: ['e1'] }, { fav: 10 })
    const r = mergePrefs(a, a)
    expect(r.adopt).toEqual({})
    expect(r.upload).toBe(false)
  })

  it('subir lo local no borra lo que solo tiene el servidor', () => {
    const r = mergePrefs(lado({ fav: ['nuevo'] }, { fav: 500 }), lado({ fav: ['viejo'], cats: ['Solo en el servidor'] }, { fav: 100, cats: 100 }))
    expect(r.upload).toBe(true)
    expect(r.merged.valores).toEqual({ fav: ['nuevo'], cats: ['Solo en el servidor'] })
    expect(r.adopt.cats).toEqual(['Solo en el servidor']) // y este dispositivo también la recibe
  })

  it('una lista vacía es un valor como cualquier otro (quitar todos los favoritos se sincroniza)', () => {
    const r = mergePrefs(lado({ fav: [] }, { fav: 900 }), lado({ fav: ['e1'] }, { fav: 100 }))
    expect(r.merged.valores.fav).toEqual([])
    expect(r.upload).toBe(true)
  })

  it('lo que llega mal formado se ignora, no rompe nada', () => {
    expect(sanitizePref('fav', 'no es una lista')).toBeUndefined()
    expect(sanitizePref('fav', [1, 2])).toBeUndefined()
    expect(sanitizePref('tags', [{ id: 'x' }])).toBeUndefined()
    expect(sanitizePref('tags', [{ id: 'x', label: 'ok' }])).toEqual([{ id: 'x', label: 'ok' }])
    expect(sanitizePref('cats', Array(501).fill('x'))).toBeUndefined()
    const r = mergePrefs(lado({ fav: ['e1'] }, { fav: 10 }), lado({ fav: { rara: true } as unknown as string[] }, { fav: 999 }))
    expect(r.adopt).toEqual({})
    expect(r.merged.valores.fav).toEqual(['e1']) // se queda lo local, que está bien formado
  })

  it('marcas de tiempo raras (texto, negativas, infinitas) cuentan como "sin marca"', () => {
    const r = mergePrefs(lado({ fav: ['l'] }, { fav: 'ayer' as unknown as number }), lado({ fav: ['s'] }, { fav: -5 }))
    expect(r.merged.ts.fav).toBeGreaterThan(0)
    expect(r.adopt).toEqual({}) // empate entre dos "sin marca": no se pisa nada
  })
})
