import { describe, it, expect } from 'vitest'
import { prescribedWeight } from './FocusWorkout'

describe('prescribedWeight', () => {
  it('lee pesos fijos del plan', () => {
    expect(prescribedWeight('97.5kg')).toBe('97.5')
    expect(prescribedWeight('100')).toBe('100')
    expect(prescribedWeight(' 62,5 kg ')).toBe('62.5')
  })
  it('no precarga porcentajes, rangos ni texto libre', () => {
    for (const w of ['70%', '75-80kg', 'RPE 8', 'Peso corporal', '', undefined]) expect(prescribedWeight(w)).toBeNull()
  })
})
