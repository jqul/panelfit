import { describe, it, expect } from 'vitest'
import { recomendarProgramas } from './recomendarPrograma'

const claves = (r: ReturnType<typeof recomendarProgramas>) => r.map(x => x.programa.key)

describe('recomendarProgramas', () => {
  it('intermedio, 4 días, hipertrofia: torso/pierna primero, con el porqué', () => {
    const r = recomendarProgramas({ dias: 4, nivel: 'intermedio', objetivo: 'hipertrofia', lugar: 'gimnasio' })
    expect(r[0].programa.key).toBe('torso-pierna')
    expect(r[0].motivos).toEqual(['4 días, los que puede entrenar', 'pensado para hipertrofia', 'nivel intermedio'])
  })
  it('nunca propone más días de los que puede entrenar', () => {
    const r = recomendarProgramas({ dias: 3, nivel: 'avanzado', objetivo: 'hipertrofia', lugar: 'gimnasio' })
    expect(r.every(x => x.programa.dias <= 3)).toBe(true)
  })
  it('principiante con 2 días: cuerpo completo 2 días, y nada de avanzado', () => {
    const r = recomendarProgramas({ dias: 2, nivel: 'principiante', objetivo: 'general', lugar: 'gimnasio' })
    expect(claves(r)).toEqual(['fullbody-2'])
  })
  it('en casa, solo el programa sin máquinas', () => {
    const r = recomendarProgramas({ dias: 3, nivel: 'principiante', objetivo: 'general', lugar: 'casa' })
    expect(claves(r)).toEqual(['casa-3'])
    expect(r[0].motivos).toContain('sin máquinas, con mancuernas')
  })
  it('glúteo y pierna, 3 días, intermedio', () => {
    expect(recomendarProgramas({ dias: 3, nivel: 'intermedio', objetivo: 'gluteo', lugar: 'gimnasio' })[0].programa.key).toBe('gluteo-pierna-3')
  })
})
