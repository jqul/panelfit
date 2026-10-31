import { describe, it, expect } from 'vitest'
import { equilibrio } from './equilibrio'

describe('equilibrio', () => {
  it('reparte los grupos en empuje, tirón y pierna (core y otros no cuentan)', () => {
    const e = equilibrio({ 'Pecho': 6, 'Hombros': 3, 'Tríceps': 3, 'Espalda': 8, 'Bíceps': 4, 'Piernas': 9, 'Glúteos': 3, 'Core': 6, 'Otros': 2 })!
    expect(e.series).toEqual({ empuje: 12, tiron: 12, pierna: 12 })
    expect(e.ratio).toBe(1)
    expect(e.avisos).toEqual([])
  })
  it('avisa de mucho más empuje que tirón y de poca pierna', () => {
    const e = equilibrio({ 'Pecho': 12, 'Hombros': 6, 'Espalda': 8, 'Piernas': 4 })!
    expect(e.ratio).toBe(2.3)
    expect(e.avisos[0]).toContain('Mucho más empuje que tirón (2,3:1)')
    expect(e.avisos[1]).toContain('Poca pierna: 13 %')
  })
  it('avisa del caso contrario y de no tener nada de tirón', () => {
    expect(equilibrio({ 'Pecho': 4, 'Espalda': 10, 'Piernas': 8 })!.avisos[0]).toContain('Mucho más tirón que empuje (1:2,5)')
    expect(equilibrio({ 'Pecho': 8, 'Piernas': 8 })!.avisos[0]).toContain('nada de tirón')
  })
  it('con pocas series no opina', () => {
    expect(equilibrio({ 'Pecho': 3, 'Espalda': 3 })).toBeNull()
  })
})
