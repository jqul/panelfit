import { describe, it, expect, vi } from 'vitest'
vi.mock('./supabase', () => ({ supabase: {} }))
import { vueltaLimpia } from './strava'

describe('vueltaLimpia', () => {
  it('vuelve a la misma pantalla, sin restos de una vuelta anterior y marcada como de Strava', () => {
    expect(vueltaLimpia('https://panelfit.vercel.app/?c=tok&code=viejo&state=x&scope=read')).toBe('https://panelfit.vercel.app/?c=tok&strava=1')
    expect(vueltaLimpia('https://panelfit.vercel.app/')).toBe('https://panelfit.vercel.app/?strava=1')
  })
})
