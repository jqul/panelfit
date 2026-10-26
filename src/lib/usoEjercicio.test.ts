import { describe, it, expect } from 'vitest'
import { clientesConEjercicio, fraseUso, type FilaPlan } from './usoEjercicio'

const plan = (...nombres: string[]): FilaPlan['plan'] => ({ P: { weeks: [{ label: 'S1', rpe: '', isCurrent: true, days: [
  { title: 'A', focus: '', exercises: nombres.map(name => ({ name, sets: '3x5', weight: '', isMain: false, comment: '' })) },
] }] } })

const clientes = [
  { id: 'c1', name: 'María', surname: 'García' },
  { id: 'c2', name: 'Luis' },
  { id: 'c3', name: 'Ana', surname: 'Ruiz' },
]

describe('clientesConEjercicio', () => {
  it('devuelve ordenados los clientes cuyo plan lleva el ejercicio, sin distinguir mayúsculas ni tildes', () => {
    const filas: FilaPlan[] = [
      { clientId: 'c1', plan: plan('Press banca', 'Sentadilla') },
      { clientId: 'c2', plan: plan('Remo con barra') },
      { clientId: 'c3', plan: plan('PRESS BANCA') },
    ]
    expect(clientesConEjercicio('press banca', filas, clientes)).toEqual(['Ana Ruiz', 'María García'])
    expect(clientesConEjercicio('Remo con barra', filas, clientes)).toEqual(['Luis'])
  })

  it('cuenta a cada cliente una vez aunque lo lleve en varias semanas, e ignora planes vacíos y clientes desconocidos', () => {
    const dosSemanas = { P: { weeks: [
      { label: 'S1', rpe: '', isCurrent: true, days: [{ title: 'A', focus: '', exercises: plan('Dominadas')!.P!.weeks[0].days[0].exercises }] },
      { label: 'S2', rpe: '', isCurrent: false, days: [{ title: 'A', focus: '', exercises: plan('Dominadas')!.P!.weeks[0].days[0].exercises }] },
    ] } }
    const filas: FilaPlan[] = [
      { clientId: 'c1', plan: dosSemanas },
      { clientId: 'c2', plan: null },
      { clientId: 'otro', plan: plan('Dominadas') },
    ]
    expect(clientesConEjercicio('Dominadas', filas, clientes)).toEqual(['María García'])
    expect(clientesConEjercicio('', filas, clientes)).toEqual([])
  })
})

describe('fraseUso', () => {
  it('dice a quién afecta, o que a nadie', () => {
    expect(fraseUso([])).toBe('Ningún cliente lo lleva ahora en su plan')
    expect(fraseUso(['Ana'])).toBe('En el plan de 1 cliente: Ana')
    expect(fraseUso(['Ana', 'Luis', 'María'])).toBe('En el plan de 3 clientes: Ana, Luis y María')
    expect(fraseUso(['A', 'B', 'C', 'D', 'E', 'F', 'G'])).toBe('En el plan de 7 clientes: A, B, C, D, E y 2 más')
  })
})
