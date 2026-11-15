import { describe, it, expect } from 'vitest'
import { getVolumeStatus, VOLUME_LANDMARKS } from './helpers'

describe('getVolumeStatus', () => {
  const l = VOLUME_LANDMARKS['Pecho'] // mev 8, mav 16, mrv 22

  it('describe el volumen frente a un rango habitual, sin decir nunca que algo está mal', () => {
    expect(getVolumeStatus('Pecho', l.mev - 1)?.label).toBe('Por debajo del rango')
    expect(getVolumeStatus('Pecho', l.mev)?.label).toBe('Dentro del rango')
    expect(getVolumeStatus('Pecho', l.mav)?.label).toBe('Dentro del rango')
    expect(getVolumeStatus('Pecho', l.mav + 1)?.label).toBe('Por encima del rango')
    expect(getVolumeStatus('Pecho', l.mrv)?.label).toBe('Por encima del rango')
    expect(getVolumeStatus('Pecho', l.mrv + 1)?.label).toBe('Muy por encima del rango')
  })

  it('ningún tramo es rojo ni se llama «excesivo»: pasarse del rango no es un error si el cliente progresa', () => {
    for (const sets of [0, l.mev, l.mav + 1, l.mrv + 10]) {
      const s = getVolumeStatus('Pecho', sets)!
      expect(s.label.toLowerCase()).not.toContain('excesivo')
      expect(s.color.toLowerCase()).not.toBe('#dc2626')
    }
  })

  it('un grupo sin rango (Otros) no tiene estado', () => {
    expect(getVolumeStatus('Otros', 12)).toBeNull()
  })
})
