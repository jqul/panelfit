import { describe, it, expect } from 'vitest'
import { ejerciciosDeSerieQueFaltan, TANDAS_DE_SERIE, VERSION_DE_SERIE } from './bibliotecaDeSerie'
import { DEFAULT_EXERCISE_LIBRARY } from './defaultExerciseLibrary'

const nombres = DEFAULT_EXERCISE_LIBRARY.map(e => e.name)
const faltan = (cuenta: string[]) => ejerciciosDeSerieQueFaltan(DEFAULT_EXERCISE_LIBRARY, cuenta)

describe('ampliación de la biblioteca de serie', () => {
  it('las tandas declaradas suman la biblioteca entera (un ejercicio nuevo necesita su tanda)', () => {
    expect(TANDAS_DE_SERIE.reduce((a, b) => a + b, 0)).toBe(DEFAULT_EXERCISE_LIBRARY.length)
    expect(VERSION_DE_SERIE).toBe(8)
  })

  it('con todo entregado no añade nada, aunque haya ejercicios renombrados en cada tanda', () => {
    expect(faltan(nombres)).toEqual([])
    const inicios = TANDAS_DE_SERIE.map((_, i) => TANDAS_DE_SERIE.slice(0, i).reduce((a, b) => a + b, 0))
    const cuenta = nombres.map((n, i) => (inicios.includes(i) ? `${n} (el mío)` : n))
    expect(faltan(cuenta)).toEqual([])
  })

  it('compara sin distinguir mayúsculas', () => {
    expect(faltan(nombres.map(n => n.toUpperCase()))).toEqual([])
  })

  it('entrega entera la tanda que la cuenta no tiene, y solo esa', () => {
    expect(faltan(nombres.slice(0, 1717))).toEqual(DEFAULT_EXERCISE_LIBRARY.slice(1717))
    expect(faltan(nombres.slice(0, 1504))).toEqual(DEFAULT_EXERCISE_LIBRARY.slice(1504))
  })

  it('a una cuenta que solo tiene ejercicios propios le llega todo', () => {
    expect(faltan(['Mi ejercicio'])).toHaveLength(DEFAULT_EXERCISE_LIBRARY.length)
  })

  it('si ya tiene alguno de una tanda nueva creado a mano, recibe el resto sin repetirlo', () => {
    const suyo = DEFAULT_EXERCISE_LIBRARY[1717].name
    const nuevos = faltan([...nombres.slice(0, 1717), suyo])
    expect(nuevos).toHaveLength(164)
    expect(nuevos.map(e => e.name)).not.toContain(suyo)
  })

  it('da por recibida una tanda si conserva al menos la mitad', () => {
    const serie = ['a', 'b', 'c', 'd'].map(name => ({ name, category: 'Core' }))
    expect(ejerciciosDeSerieQueFaltan(serie, ['a', 'b'], [4])).toEqual([])
    expect(ejerciciosDeSerieQueFaltan(serie, ['a'], [4]).map(e => e.name)).toEqual(['b', 'c', 'd'])
  })
})
