import { describe, it, expect } from 'vitest'
import { limpiarCriterios, guardarCriterios, criteriosVacios } from './criteriosProgramacion'

describe('criterios de programación inicial', () => {
  it('sin nada guardado, todo vacío y versión 0', () => {
    const c = limpiarCriterios(undefined)
    expect(c.version).toBe(0)
    expect(criteriosVacios(c)).toBe(true)
  })
  it('lo que no es texto se ignora y los textos largos se recortan', () => {
    const c = limpiarCriterios({ metodologia: 5, material: 'x'.repeat(5000), version: -3 })
    expect(c.metodologia).toBe('')
    expect(c.material).toHaveLength(2000)
    expect(c.version).toBe(0)
  })
  it('cada guardado con cambios sube la versión; sin cambios, se queda', () => {
    const v0 = limpiarCriterios(undefined)
    const v1 = guardarCriterios(v0, { ...v0, maxDias: '4' }, 1000)
    expect(v1.version).toBe(1)
    expect(v1.maxDias).toBe('4')
    expect(v1.updatedAt).toBe(1000)
    expect(guardarCriterios(v1, { ...v1, maxDias: ' 4 ' }, 2000)).toBe(v1)
    expect(guardarCriterios(v1, { ...v1, limitesClinicos: 'Dolor torácico: parar' }, 3000).version).toBe(2)
  })
})
