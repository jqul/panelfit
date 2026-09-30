import { describe, it, expect } from 'vitest'
import { roundToIncrement, generateWendlerCycle } from './wendler531'

describe('roundToIncrement', () => {
  it('rounds to the nearest 2.5kg by default', () => {
    expect(roundToIncrement(101)).toBe(100)
    expect(roundToIncrement(102)).toBe(102.5)
  })

  it('supports a custom increment', () => {
    expect(roundToIncrement(103, 5)).toBe(105)
  })
})

describe('generateWendlerCycle', () => {
  it('returns nothing when there are no valid lifts', () => {
    expect(generateWendlerCycle([])).toEqual([])
    expect(generateWendlerCycle([{ name: '', trainingMax: 100 }])).toEqual([])
    expect(generateWendlerCycle([{ name: 'Sentadilla', trainingMax: 0 }])).toEqual([])
  })

  it('generates 4 weeks for a single lift', () => {
    const weeks = generateWendlerCycle([{ name: 'Sentadilla', trainingMax: 100 }])
    expect(weeks).toHaveLength(4)
    expect(weeks[3].isDeload).toBe(true)
    expect(weeks[0].isDeload).toBe(false)
  })

  it('computes weights as a percentage of training max, rounded to 2.5kg', () => {
    const weeks = generateWendlerCycle([{ name: 'Sentadilla', trainingMax: 100 }])
    const week1Sets = weeks[0].days[0].exercises
    expect(week1Sets).toHaveLength(3) // 65/75/85%
    expect(week1Sets[0].weight).toBe('65kg')
    expect(week1Sets[2].weight).toBe('85kg')
    expect(week1Sets[2].isMain).toBe(true) // último set (AMRAP) marcado como principal
  })

  it('includes every valid lift in each week, skipping invalid ones', () => {
    const weeks = generateWendlerCycle([
      { name: 'Sentadilla', trainingMax: 100 },
      { name: 'Press banca', trainingMax: 60 },
      { name: '', trainingMax: 50 },
    ])
    expect(weeks[0].days[0].exercises).toHaveLength(6) // 2 lifts x 3 sets
  })
})
