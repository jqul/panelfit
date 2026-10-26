import { describe, it, expect } from 'vitest'
import { limpiarConsejos, nuevoConsejo, ejemplosPendientes, mover, CONSEJOS_EJEMPLO, MAX_CONSEJOS, MAX_TITULO, MAX_TEXTO } from './consejos'

describe('limpiarConsejos', () => {
  it('lo que no es una lista, o trae basura, da una lista vacía o solo lo válido', () => {
    expect(limpiarConsejos(undefined)).toEqual([])
    expect(limpiarConsejos('hola')).toEqual([])
    expect(limpiarConsejos({ titulo: 'x', texto: 'y' })).toEqual([])
    expect(limpiarConsejos([null, 3, 'x', { titulo: 1, texto: 'a' }, { titulo: 'a' }])).toEqual([])
  })

  it('recorta espacios y descarta los que no tienen título o texto', () => {
    expect(limpiarConsejos([
      { id: 'a', titulo: '  Dormir  ', texto: '  7 horas  ' },
      { id: 'b', titulo: '   ', texto: 'sin título' },
      { id: 'c', titulo: 'Sin texto', texto: '  ' },
    ])).toEqual([{ id: 'a', titulo: 'Dormir', texto: '7 horas' }])
  })

  it('pone id si falta, no repite ids y respeta los límites de longitud y de cantidad', () => {
    const l = limpiarConsejos([{ titulo: 'A', texto: 'a' }, { id: 'x', titulo: 'B', texto: 'b' }, { id: 'x', titulo: 'C', texto: 'c' }])
    expect(new Set(l.map(c => c.id)).size).toBe(3)
    const largo = limpiarConsejos([{ id: '1', titulo: 'T'.repeat(500), texto: 'x'.repeat(5000) }])[0]
    expect(largo.titulo.length).toBe(MAX_TITULO)
    expect(largo.texto.length).toBe(MAX_TEXTO)
    const muchos = limpiarConsejos(Array.from({ length: 50 }, (_, i) => ({ id: `i${i}`, titulo: `T${i}`, texto: 'x' })))
    expect(muchos).toHaveLength(MAX_CONSEJOS)
  })
})

describe('utilidades', () => {
  it('nuevoConsejo trae un id distinto cada vez', () => {
    expect(nuevoConsejo().id).not.toBe(nuevoConsejo().id)
  })

  it('ejemplosPendientes no repite los ya añadidos (sin mirar mayúsculas)', () => {
    expect(ejemplosPendientes([])).toHaveLength(CONSEJOS_EJEMPLO.length)
    expect(ejemplosPendientes([{ titulo: ' dormir BIEN ' }]).map(e => e.titulo)).not.toContain('Dormir bien')
  })

  it('mover cambia de sitio y no se sale de la lista', () => {
    expect(mover(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c'])
    expect(mover(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b'])
    const l = ['a', 'b']
    expect(mover(l, 0, -1)).toBe(l)
    expect(mover(l, 1, 1)).toBe(l)
  })

  it('los ejemplos son todos válidos', () => {
    expect(limpiarConsejos(CONSEJOS_EJEMPLO.map((e, i) => ({ id: `e${i}`, ...e })))).toHaveLength(CONSEJOS_EJEMPLO.length)
  })
})
