import { describe, it, expect } from 'vitest'
import { workoutStats, templateTypes, filterTemplates, updatedLabel, plural, matchesQuery, contenidoQueSePublica, copiaDeWorkout, carpetasDe, nombreCarpeta } from './workoutList'
import { WeekPlan } from '../types'

const ex = (n: string) => ({ name: n, sets: '3×10', weight: '', isMain: false, comment: '' })
const weeks = [
  { label: 'S1', rpe: '', isCurrent: true, days: [{ title: 'A', focus: '', exercises: [ex('a'), ex('b')] }, { title: 'B', focus: '', exercises: [ex('c')] }] },
  { label: 'S2', rpe: '', isCurrent: false, days: [{ title: 'A', focus: '', exercises: [ex('a'), ex('b'), ex('z')] }] },
] as unknown as WeekPlan[]

describe('workoutStats', () => {
  it('resume la primera semana y cuenta las semanas', () => {
    expect(workoutStats({ weeks })).toEqual({ weeks: 2, days: 2, exercises: 3 })
  })
  it('tolera plantillas vacías', () => {
    expect(workoutStats({})).toEqual({ weeks: 0, days: 0, exercises: 0 })
    expect(workoutStats({ weeks: [{ label: 'S1', rpe: '', isCurrent: true, days: [] } as unknown as WeekPlan] }).exercises).toBe(0)
  })
})

describe('templateTypes', () => {
  it('del más usado al menos, sin vacíos ni repetidos', () => {
    expect(templateTypes([{ type: 'Fuerza' }, { type: 'Hipertrofia' }, { type: 'Fuerza' }, { type: '' }, { type: 'General' }])).toEqual(['Fuerza', 'General', 'Hipertrofia'])
  })
})

describe('filterTemplates', () => {
  const list = [
    { name: 'Empuje A', type: 'Fuerza', label_ids: ['l1'] },
    { name: 'Tirón B', type: 'Hipertrofia', label_ids: [] },
    { name: 'Pierna', type: 'Fuerza' },
  ]
  it('busca sin tildes ni mayúsculas', () => {
    expect(filterTemplates(list, { query: 'tiron' }).map(t => t.name)).toEqual(['Tirón B'])
    expect(filterTemplates(list, { query: ' EMPUJE ' }).map(t => t.name)).toEqual(['Empuje A'])
  })
  it('combina texto, tipo y etiqueta', () => {
    expect(filterTemplates(list, { type: 'Fuerza' }).map(t => t.name)).toEqual(['Empuje A', 'Pierna'])
    expect(filterTemplates(list, { type: 'Fuerza', labelId: 'l1' }).map(t => t.name)).toEqual(['Empuje A'])
    expect(filterTemplates(list, { query: 'x', type: 'Fuerza' })).toEqual([])
  })
  it('sin filtros devuelve todo', () => {
    expect(filterTemplates(list, {})).toHaveLength(3)
  })
})

describe('updatedLabel', () => {
  const now = new Date(2026, 9, 6, 12)
  it('hoy, ayer, hace N días y fecha', () => {
    expect(updatedLabel(new Date(2026, 9, 6, 1).getTime(), now)).toBe('actualizado hoy')
    expect(updatedLabel(new Date(2026, 9, 5, 23).getTime(), now)).toBe('actualizado ayer')
    expect(updatedLabel(new Date(2026, 9, 2).getTime(), now)).toBe('actualizado hace 4 días')
    expect(updatedLabel(new Date(2026, 8, 20).getTime(), now)).toMatch(/^actualizado el 20 sept/)
  })
  it('null sin fecha', () => {
    expect(updatedLabel(undefined, now)).toBeNull()
  })
})

describe('plural', () => {
  it('singular y plural', () => {
    expect(plural(1, 'ejercicio', 'ejercicios')).toBe('1 ejercicio')
    expect(plural(6, 'ejercicio', 'ejercicios')).toBe('6 ejercicios')
  })
})

describe('matchesQuery', () => {
  it('ignora tildes, mayúsculas y espacios de los bordes', () => {
    expect(matchesQuery('Definición 12 semanas', ' definicion ')).toBe(true)
    expect(matchesQuery('Definición 12 semanas', 'fuerza')).toBe(false)
  })
  it('una búsqueda vacía acepta todo', () => {
    expect(matchesQuery('Lo que sea', '')).toBe(true)
    expect(matchesQuery('Lo que sea', '   ')).toBe(true)
  })
})

describe('contenidoQueSePublica', () => {
  const ej = (name: string, comment = '', weight = '') => ({ name, sets: '3x5', weight, comment, isMain: false })
  const semanas = [
    { label: 'S1', rpe: '', isCurrent: false, days: [{ title: 'A', focus: '', exercises: [ej('Sentadilla', '🎯 Semana 1: 90 kg x 5 a RIR 3. Última vez: 85 x 5', '90kg'), ej('Press', '', ''), ej('Remo', '', '-')], warmupExercises: [ej('Movilidad', 'Sin dolor', '')] }] },
    { label: 'S2', rpe: '', isCurrent: false, days: [{ title: 'A', focus: '', exercises: [ej('Sentadilla', '', '92.5kg')] }] },
  ]

  it('cuenta en todas las semanas, con el calentamiento, los comentarios y las cargas que se verían', () => {
    expect(contenidoQueSePublica({ weeks: semanas, description: '' })).toEqual({ ejercicios: 5, comentarios: 2, cargas: 2, descripcion: false })
  })

  it('un guion o un espacio no cuentan como carga ni como comentario, y la descripción se avisa', () => {
    expect(contenidoQueSePublica({ weeks: [{ ...semanas[0], days: [{ title: 'A', focus: '', exercises: [ej('Remo', '  ', '-')] }] }], description: 'Plan de Javier' }))
      .toEqual({ ejercicios: 1, comentarios: 0, cargas: 0, descripcion: true })
  })

  it('sin semanas no rompe', () => {
    expect(contenidoQueSePublica({})).toEqual({ ejercicios: 0, comentarios: 0, cargas: 0, descripcion: false })
  })
})

describe('carpetas', () => {
  const lista = [{ name: 'A', carpeta: 'Fuerza' }, { name: 'B', carpeta: ' fuerza ' }, { name: 'C', carpeta: 'Fuerza ' }, { name: 'D' }, { name: 'E', carpeta: 'Online' }] as any[]
  it('lista las carpetas con cuántos tiene cada una', () => {
    expect(carpetasDe(lista)).toEqual([{ nombre: 'fuerza', n: 1 }, { nombre: 'Fuerza', n: 2 }, { nombre: 'Online', n: 1 }])
    expect(nombreCarpeta('  Fuerza   2026 ')).toBe('Fuerza 2026')
  })
  it('filtra: todas, una carpeta o las que no están en ninguna', () => {
    expect(filterTemplates(lista, { carpeta: null })).toHaveLength(5)
    expect(filterTemplates(lista, { carpeta: 'Fuerza' }).map(t => t.name)).toEqual(['A', 'C'])
    expect(filterTemplates(lista, { carpeta: '' }).map(t => t.name)).toEqual(['D'])
  })
})

describe('copiaDeWorkout', () => {
  it('la copia de un workout público nace privada, con id y fechas nuevos', () => {
    const original = { id: 'a', name: 'Fuerza', isPublic: true, createdAt: 1, updatedAt: 2, weeks: [{ label: 'S1' }] }
    const copia = copiaDeWorkout(original, 'b', 99)
    expect(copia).toMatchObject({ id: 'b', name: 'Fuerza (copia)', isPublic: false, createdAt: 99, updatedAt: 99, weeks: [{ label: 'S1' }] })
    expect(original.isPublic).toBe(true) // no toca el original
  })
})
