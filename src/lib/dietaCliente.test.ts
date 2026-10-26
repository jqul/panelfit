import { describe, it, expect } from 'vitest'
import { dietaConContenido } from './dietaCliente'

describe('dietaConContenido', () => {
  it('sin fila o con una dieta vacía no hay dieta', () => {
    expect(dietaConContenido(null)).toBe(false)
    expect(dietaConContenido(undefined)).toBe(false)
    expect(dietaConContenido({})).toBe(false)
    expect(dietaConContenido({ kcal: 0, protein: 0, carbs: 0, fats: 0, meals: [], advice: '' })).toBe(false)
  })

  it('con comidas o con algún objetivo de macros, sí', () => {
    expect(dietaConContenido({ kcal: 0, meals: [{ id: 'm1' }] })).toBe(true)
    expect(dietaConContenido({ kcal: 2400, meals: [] })).toBe(true)
    expect(dietaConContenido({ protein: 160 })).toBe(true)
  })

  it('ignora datos con forma rara en vez de romper', () => {
    expect(dietaConContenido('texto')).toBe(false)
    expect(dietaConContenido({ meals: 'no', kcal: '2400' })).toBe(false)
  })
})
