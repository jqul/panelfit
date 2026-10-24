import { describe, it, expect } from 'vitest'
import { searchAll, scoreItem, norm, type Searchable } from './globalSearch'

const cliente = (id: string, title: string, keywords = ''): Searchable => ({ id, kind: 'cliente', title, keywords })
const ITEMS: Searchable[] = [
  cliente('c1', 'María García', '600111222 hipertrofia'),
  cliente('c2', 'Mario Gómez', '600333444'),
  cliente('c3', 'Lucas Vega', '600555666 rodilla'),
  { id: 'a1', kind: 'accion', title: 'Nuevo cliente', keywords: 'añadir crear alta' },
  { id: 'a2', kind: 'accion', title: 'Ir a la Bandeja', keywords: 'avisos cola pendientes' },
  { id: 't1', kind: 'plantilla', title: 'Empuje pecho y hombro' },
  { id: 'p1', kind: 'programa', title: 'Fuerza 12 semanas' },
  { id: 'e1', kind: 'ejercicio', title: 'Sentadilla' },
  { id: 'e2', kind: 'ejercicio', title: 'Sentadilla búlgara con mancuernas' },
  { id: 'e3', kind: 'ejercicio', title: 'Remo con polea' },
]

const ids = (q: string) => searchAll(ITEMS, q).flatMap(g => g.results.map(r => r.id))

describe('búsqueda global', () => {
  it('no distingue tildes ni mayúsculas', () => {
    expect(norm('María  GARCÍA')).toBe('maria garcia')
    expect(ids('maria')).toContain('c1')
    expect(ids('GARCIA')).toContain('c1')
  })

  it('exige todos los términos, en cualquier orden', () => {
    expect(ids('garcia maria')).toEqual(['c1'])
    expect(ids('remo polea')).toEqual(['e3'])
    expect(ids('remo banca')).toEqual([])
  })

  it('primero lo exacto, luego lo que empieza por lo escrito, luego palabra suelta, luego el resto', () => {
    expect(scoreItem(ITEMS[7], 'sentadilla')).toBe(0)
    expect(scoreItem(ITEMS[8], 'sentadilla')).toBe(1)
    expect(scoreItem(ITEMS[8], 'mancuernas')).toBe(2)
    expect(scoreItem(ITEMS[8], 'ancuerna')).toBe(3)
    expect(scoreItem(ITEMS[0], 'hipertrofia')).toBe(4) // solo en palabras clave
    // dentro del grupo de ejercicios, el básico antes que la variante
    expect(searchAll(ITEMS, 'sentadilla').find(g => g.kind === 'ejercicio')!.results.map(r => r.id)).toEqual(['e1', 'e2'])
  })

  it('encuentra por teléfono, objetivo y sinónimos de una acción', () => {
    expect(ids('600333')).toEqual(['c2'])
    expect(ids('rodilla')).toEqual(['c3'])
    expect(ids('crear')).toEqual(['a1'])
    expect(ids('pendientes')).toEqual(['a2'])
  })

  it('agrupa por tipo en un orden fijo y limita cada grupo', () => {
    const muchos: Searchable[] = Array.from({ length: 20 }, (_, i) => cliente(`m${i}`, `Marta ${i}`))
    const grupos = searchAll([...muchos, ...ITEMS], 'm')
    expect(grupos.map(g => g.kind)).toEqual(['cliente', 'accion', 'plantilla', 'programa', 'ejercicio'].filter(k => grupos.some(g => g.kind === k)))
    expect(grupos[0].results).toHaveLength(6) // máximo de clientes
  })

  it('sin texto solo ofrece acciones, como lanzador', () => {
    const grupos = searchAll(ITEMS, '')
    expect(grupos.map(g => g.kind)).toEqual(['accion'])
    expect(grupos[0].results.map(r => r.id)).toEqual(['a1', 'a2']) // en el orden dado, sin reordenar
  })

  it('sin coincidencias devuelve vacío', () => {
    expect(searchAll(ITEMS, 'zzzz')).toEqual([])
  })
})
