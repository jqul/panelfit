import { describe, it, expect } from 'vitest'
import { rpeDeSerie, cuboDe, resumirEsfuerzo, juntarResumenes, cambioRpe } from './esfuerzoPorTipo'

describe('rpeDeSerie', () => {
  it('el RPE es 10 − RIR', () => {
    expect(rpeDeSerie({ rir: 2 })).toBe(8)
    expect(rpeDeSerie({ rir: 0 })).toBe(10)
    expect(rpeDeSerie({ rir: 3.5 })).toBe(6.5)
  })
  it('sin RIR no hay dato, salvo «al fallo», que es RPE 10; el calentamiento nunca cuenta', () => {
    expect(rpeDeSerie({})).toBeNull()
    expect(rpeDeSerie({ tipo: 'fallo' })).toBe(10)
    expect(rpeDeSerie({ tipo: 'calentamiento', rir: 4 })).toBeNull()
    expect(rpeDeSerie({ tipo: 'dropset', rir: 1 })).toBe(9)
  })
  it('acota a 1-10 un RIR fuera de rango', () => {
    expect(rpeDeSerie({ rir: 12 })).toBe(1)
    expect(rpeDeSerie({ rir: -1 })).toBeNull()
  })
})

describe('cuboDe', () => {
  it('agrupa por RPE: hasta 6, 7, 8, 9 y 10', () => {
    expect([4, 6, 6.5, 7, 8, 9, 10].map(cuboDe)).toEqual(['hasta6', 'hasta6', '7', '7', '8', '9', '10']) // el 6,5 redondea a 7
  })
})

describe('resumirEsfuerzo', () => {
  it('media, máximo y distribución solo de las series con dato', () => {
    const r = resumirEsfuerzo([{ rir: 2 }, { rir: 2 }, { rir: 1 }, {}, { tipo: 'calentamiento', rir: 5 }])
    expect(r.conEsfuerzo).toBe(3)
    expect(r.rpeMedio).toBeCloseTo(8.33, 2)
    expect(r.rpeMax).toBe(9)
    expect(r.distribucion).toEqual({ hasta6: 0, '7': 0, '8': 2, '9': 1, '10': 0 })
  })
  it('sin datos no inventa una media', () => {
    const r = resumirEsfuerzo([{}, {}])
    expect(r.conEsfuerzo).toBe(0)
    expect(r.rpeMedio).toBeNull()
    expect(r.desvioMedio).toBeNull()
  })
  it('mide la desviación respecto al RPE previsto en las series que tenían RIR objetivo', () => {
    // RIR objetivo 2-3 ⇒ RPE previsto 7,5. Real: RPE 9 (+1,5) y RPE 8 (+0,5) → +1
    const obj = { min: 2, max: 3 }
    const r = resumirEsfuerzo([{ rir: 1, objetivo: obj }, { rir: 2, objetivo: obj }, { rir: 2 }])
    expect(r.conObjetivo).toBe(2)
    expect(r.desvioMedio).toBeCloseTo(1, 5)
  })
  it('un single pesado no se mezcla con la media si se resumen por separado', () => {
    const pesado = resumirEsfuerzo([{ rir: 0 }])
    const volumen = resumirEsfuerzo([{ rir: 3 }, { rir: 3 }, { rir: 2 }, { rir: 2 }])
    expect(pesado.rpeMedio).toBe(10)
    expect(volumen.rpeMedio).toBe(7.5)
  })
})

describe('juntarResumenes y cambioRpe', () => {
  it('junta semanas ponderando por número de series', () => {
    const a = resumirEsfuerzo([{ rir: 2 }, { rir: 2 }, { rir: 2 }])      // 3 series, RPE 8
    const b = resumirEsfuerzo([{ rir: 0 }])                              // 1 serie, RPE 10
    const j = juntarResumenes([a, b])
    expect(j.conEsfuerzo).toBe(4)
    expect(j.rpeMedio).toBeCloseTo(8.5, 5)
    expect(j.rpeMax).toBe(10)
    expect(j.distribucion).toEqual({ hasta6: 0, '7': 0, '8': 3, '9': 0, '10': 1 })
  })
  it('el cambio entre bloques es actual − anterior, o null sin datos en alguno', () => {
    const antes = resumirEsfuerzo([{ rir: 3 }, { rir: 3 }])
    const ahora = resumirEsfuerzo([{ rir: 1 }, { rir: 1 }])
    expect(cambioRpe(ahora, antes)).toBe(2)
    expect(cambioRpe(ahora, resumirEsfuerzo([]))).toBeNull()
  })
})
