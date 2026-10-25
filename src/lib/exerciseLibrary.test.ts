import { describe, it, expect } from 'vitest'
import {
  exerciseOrigin, inferMaterial, materialOf, huecos, estadoFicha, filtrar, recomendados, resumen, materialCounts, nombreDeCopia, esPendiente,
  porRelevancia, type LibEx,
} from './exerciseLibrary'

const ex = (id: string, name: string, extra: Partial<LibEx> = {}): LibEx => ({ id, name, ...extra })
const FULL = { description: 'Espalda neutra', videos: [{ url: 'https://youtu.be/aaaaaaaaaaa' }] }

describe('origen', () => {
  it('lo sembrado es Base PanelFit y lo demás, Personal', () => {
    expect(exerciseOrigin({ id: 'ex_default_1699_3' })).toBe('base')
    expect(exerciseOrigin({ id: 'ex_demo_12' })).toBe('base')
    expect(exerciseOrigin({ id: 'ex_1699999999' })).toBe('personal')
    expect(exerciseOrigin({ id: 'ex_import_1_0' })).toBe('personal')
  })
})

describe('material', () => {
  it('se deduce del nombre sin tildes ni mayúsculas', () => {
    expect(inferMaterial('Press banca con barra')).toBe('Barra')
    expect(inferMaterial('Remo con MANCUERNA')).toBe('Mancuerna')
    expect(inferMaterial('Prensa de piernas')).toBe('Máquina')
    expect(inferMaterial('Jalón al pecho')).toBe('Polea')
    expect(inferMaterial('Swing con kettlebell')).toBe('Kettlebell')
    expect(inferMaterial('Dominadas')).toBe('Peso corporal')
    expect(inferMaterial('Algo raro')).toBe('')
  })
  it('lo que escribe el entrenador manda sobre lo deducido', () => {
    expect(materialOf(ex('1', 'Press banca con barra', { material: 'Máquina' }))).toBe('Máquina')
    expect(materialOf(ex('1', 'Press banca con barra', { material: '  ' }))).toBe('Barra')
  })
})

describe('calidad de la ficha', () => {
  it('completa si tiene vídeo e indicaciones', () => {
    expect(estadoFicha(ex('1', 'A', FULL))).toEqual({ completo: true, label: 'Completo', huecos: [] })
  })
  it('dice el hueco más importante: vídeo, luego indicaciones', () => {
    expect(estadoFicha(ex('1', 'A', { description: 'x' })).label).toBe('Falta vídeo')
    expect(estadoFicha(ex('1', 'A', { videos: FULL.videos })).label).toBe('Faltan indicaciones')
    expect(huecos(ex('1', 'A'))).toEqual(['video', 'indicaciones'])
  })
  it('la alternativa solo se pide a los muy usados (3 o más veces)', () => {
    expect(huecos(ex('1', 'A', { ...FULL, useCount: 2 }))).toEqual([])
    expect(huecos(ex('1', 'A', { ...FULL, useCount: 3 }))).toEqual(['alternativa'])
    expect(huecos(ex('1', 'A', { ...FULL, useCount: 9, alternativas: ['B'] }))).toEqual([])
  })
})

describe('filtros', () => {
  const lista: LibEx[] = [
    ex('1', 'Sentadilla trasera', { ...FULL, category: 'Piernas', useCount: 28 }),
    ex('2', 'Press banca con barra', { category: 'Pecho', useCount: 32, description: 'x' }),
    ex('3', 'Remo con mancuerna', { category: 'Espalda', useCount: 0 }),
    ex('4', 'Peso muerto rumano', { category: 'Glúteos', archivedAt: 1 }),
    ex('5', 'Curl de bíceps', { category: 'Bíceps', ...FULL }),
  ]
  const favs = new Set(['3'])
  const ids = (f: Parameters<typeof filtrar>[1]) => filtrar(lista, { favs, ...f }).map(e => e.id)

  it('por defecto oculta los archivados; el chip Archivados solo enseña esos', () => {
    expect(ids({})).toEqual(['1', '2', '3', '5'])
    expect(ids({ chip: 'archivados' })).toEqual(['4'])
  })
  it('busca por nombre, grupo o material, sin tildes y en cualquier orden', () => {
    expect(ids({ query: 'SENTADILLA' })).toEqual(['1'])
    expect(ids({ query: 'barra press' })).toEqual(['2'])
    expect(ids({ query: 'biceps' })).toEqual(['5'])
    expect(ids({ query: 'mancuerna' })).toEqual(['3']) // material deducido del nombre
    expect(ids({ query: 'espalda' })).toEqual(['3'])  // grupo
  })
  it('chips: más usados, sin vídeo, favoritos y pendientes', () => {
    expect(ids({ chip: 'usados' })).toEqual(['1', '2'])
    expect(ids({ chip: 'sin-video' })).toEqual(['2', '3'])
    expect(ids({ chip: 'favoritos' })).toEqual(['3'])
    // Pendientes = usados o favoritos con huecos: el 1 está completo salvo la alternativa (muy usado), el 2 y el 3 tienen huecos
    expect(ids({ chip: 'pendientes' })).toEqual(['1', '2', '3'])
    expect(esPendiente(lista[4], favs)).toBe(false) // completo y sin uso: no pendiente
  })
  it('combina grupo y material', () => {
    expect(ids({ category: 'Pecho', material: 'Barra' })).toEqual(['2'])
    expect(ids({ category: 'Pecho', material: 'Mancuerna' })).toEqual([])
  })
})

describe('recomendados y resumen', () => {
  const lista: LibEx[] = [
    ex('a', 'A', { useCount: 5 }), ex('b', 'B', { useCount: 30 }), ex('c', 'C', { useCount: 5 }), ex('d', 'D'), ex('e', 'E', { useCount: 1, archivedAt: 9 }),
  ]
  it('los más usados primero; a igualdad, favoritos', () => {
    expect(porRelevancia(lista.slice(0, 3), new Set(['c'])).map(e => e.id)).toEqual(['b', 'c', 'a'])
    expect(recomendados(lista.filter(e => !e.archivedAt), new Set(), 2).map(e => e.id)).toEqual(['b', 'a'])
  })
  it('sin uso todavía, recomienda los favoritos', () => {
    expect(recomendados([ex('x', 'X'), ex('y', 'Y')], new Set(['y'])).map(e => e.id)).toEqual(['y'])
    expect(recomendados([ex('x', 'X')], new Set())).toEqual([])
  })
  it('cuenta huecos de contenido solo entre los muy usados', () => {
    const r = resumen([ex('1', 'A', { useCount: 10, ...FULL }), ex('2', 'B', { useCount: 10 }), ex('3', 'C'), ex('4', 'D', { archivedAt: 1 })], new Set(['3']))
    expect(r).toMatchObject({ total: 3, usados: 2, sinVideo: 2, favoritos: 1, archivados: 1, muyUsadosSinVideo: 1, muyUsadosSinAlternativa: 2 })
  })
  it('cuenta ejercicios por material, de más a menos', () => {
    expect(materialCounts([ex('1', 'Press con barra'), ex('2', 'Peso muerto'), ex('3', 'Curl mancuerna'), ex('4', 'Cosa')]))
      .toEqual([{ material: 'Barra', n: 2 }, { material: 'Mancuerna', n: 1 }])
  })
})

describe('duplicar', () => {
  it('añade (copia) y numera si ya existe, sin distinguir tildes ni mayúsculas', () => {
    expect(nombreDeCopia('Press militar', ['Press militar'])).toBe('Press militar (copia)')
    expect(nombreDeCopia('Press militar', ['Press militar', 'press MILITAR (copia)'])).toBe('Press militar (copia 2)')
    expect(nombreDeCopia('Press militar (copia)', ['Press militar', 'Press militar (copia)'])).toBe('Press militar (copia 2)')
    expect(nombreDeCopia('Jalón', [])).toBe('Jalón (copia)')
  })
})
