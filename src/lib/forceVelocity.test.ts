import { describe, it, expect } from 'vitest'
import { computeTrialFV, fitFVProfileFromPoints, fitForceVelocityProfile, relativePower, G } from './forceVelocity'

describe('computeTrialFV', () => {
  it('computes force/velocity/power by hand for a known trial', () => {
    // M=70kg, h=0.30m, Dpo=0.40m
    // v = √(g·h/2) = √(9.81·0.30/2) ≈ 1.2131 m/s
    // F = M·g·(h/Dpo+1) = 70·9.81·1.75 = 1201.725 N
    const p = computeTrialFV({ totalMassKg: 70, jumpHeightM: 0.30, pushoffDistanceM: 0.40 })
    expect(p).not.toBeNull()
    expect(p!.velocity).toBeCloseTo(1.21, 2)
    expect(p!.force).toBeCloseTo(1201.7, 1)
    expect(p!.power).toBeCloseTo(1201.725 * Math.sqrt(G * 0.30 / 2), 0)
  })

  it('refuses to compute without height, push-off distance or mass', () => {
    expect(computeTrialFV({ totalMassKg: 0, jumpHeightM: 0.3, pushoffDistanceM: 0.4 })).toBeNull()
    expect(computeTrialFV({ totalMassKg: 70, jumpHeightM: 0, pushoffDistanceM: 0.4 })).toBeNull()
    expect(computeTrialFV({ totalMassKg: 70, jumpHeightM: 0.3, pushoffDistanceM: 0 })).toBeNull()
  })

  it('a heavier load or a lower jump means less velocity, more force', () => {
    const light = computeTrialFV({ totalMassKg: 70, jumpHeightM: 0.35, pushoffDistanceM: 0.40 })!
    const heavy = computeTrialFV({ totalMassKg: 90, jumpHeightM: 0.20, pushoffDistanceM: 0.40 })!
    expect(heavy.velocity).toBeLessThan(light.velocity)
    expect(heavy.force).toBeGreaterThan(light.force)
  })
})

describe('fitFVProfileFromPoints', () => {
  it('recovers a known line exactly: F = 2000 - 400·v', () => {
    // v=1 → F=1600 · v=3 → F=800 → F0=2000, Sfv=-400, V0=F0/-Sfv=5, Pmax=F0·V0/4=2500
    const profile = fitFVProfileFromPoints([
      { velocity: 1, force: 1600 },
      { velocity: 3, force: 800 },
    ])
    expect(profile.F0).toBeCloseTo(2000, 0)
    expect(profile.Sfv).toBeCloseTo(-400, 0)
    expect(profile.V0).toBeCloseTo(5, 1)
    expect(profile.Pmax).toBeCloseTo(2500, 0)
    expect(profile.loads).toBe(2)
  })

  it('refuses to fit with a single point', () => {
    const profile = fitFVProfileFromPoints([{ velocity: 1, force: 1600 }])
    expect(profile.F0).toBeNull()
    expect(profile.loads).toBe(1)
  })

  it('refuses a nonsensical fit (positive slope) rather than returning a wrong profile', () => {
    // Fuerza que SUBE con la velocidad — no tiene sentido fisiológico, no debe extrapolar nada
    const profile = fitFVProfileFromPoints([
      { velocity: 1, force: 800 },
      { velocity: 3, force: 1600 },
    ])
    expect(profile.F0).toBeNull()
    expect(profile.V0).toBeNull()
  })
})

describe('fitForceVelocityProfile', () => {
  it('builds a self-consistent profile from realistic multi-load trials', () => {
    const trials = [
      { loadKg: 0, totalMassKg: 75, jumpHeightM: 0.38, pushoffDistanceM: 0.40 },
      { loadKg: 20, totalMassKg: 95, jumpHeightM: 0.24, pushoffDistanceM: 0.40 },
      { loadKg: 40, totalMassKg: 115, jumpHeightM: 0.14, pushoffDistanceM: 0.40 },
    ]
    const profile = fitForceVelocityProfile(trials)
    expect(profile.loads).toBe(3)
    expect(profile.F0).not.toBeNull()
    expect(profile.V0).not.toBeNull()
    // Pmax debe ser F0·V0/4 — coherencia interna de la extrapolación (con
    // margen por el redondeo a 1/2 decimales de F0/V0 antes de esta comprobación)
    expect(profile.Pmax).toBeCloseTo((profile.F0! * profile.V0!) / 4, -1)
    // La fuerza al despegue con carga tiene que superar el peso corporal
    expect(profile.F0!).toBeGreaterThan(75 * G)
  })

  it('averages repeated jumps at the same load into a single point', () => {
    const trials = [
      { loadKg: 0, totalMassKg: 75, jumpHeightM: 0.36, pushoffDistanceM: 0.40 },
      { loadKg: 0, totalMassKg: 75, jumpHeightM: 0.38, pushoffDistanceM: 0.40 }, // misma carga, otro intento
      { loadKg: 30, totalMassKg: 105, jumpHeightM: 0.18, pushoffDistanceM: 0.40 },
    ]
    const profile = fitForceVelocityProfile(trials)
    expect(profile.loads).toBe(2)
  })

  it('refuses to fit with only one distinct load', () => {
    const profile = fitForceVelocityProfile([
      { loadKg: 0, totalMassKg: 75, jumpHeightM: 0.36, pushoffDistanceM: 0.40 },
      { loadKg: 0, totalMassKg: 75, jumpHeightM: 0.37, pushoffDistanceM: 0.40 },
    ])
    expect(profile.F0).toBeNull()
    expect(profile.loads).toBe(1)
  })
})

describe('relativePower', () => {
  it('divides Pmax by body mass', () => {
    expect(relativePower(2500, 100)).toBe(25)
  })

  it('returns null without a valid Pmax or body mass', () => {
    expect(relativePower(null, 100)).toBeNull()
    expect(relativePower(2500, 0)).toBeNull()
  })
})
