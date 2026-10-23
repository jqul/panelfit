import { describe, it, expect } from 'vitest'
import { sinParametrosSensibles } from './analyticsUrl'

describe('sinParametrosSensibles', () => {
  it('quita el token del enlace de cliente', () => {
    expect(sinParametrosSensibles('https://panelfit.app/?c=abc123')).toBe('https://panelfit.app/')
  })
  it('conserva el resto de parámetros y el hash', () => {
    expect(sinParametrosSensibles('https://panelfit.app/?utm_source=x&c=abc123#top'))
      .toBe('https://panelfit.app/?utm_source=x#top')
  })
  it('no toca URLs sin token', () => {
    expect(sinParametrosSensibles('https://panelfit.app/blog')).toBe('https://panelfit.app/blog')
  })
  it('si la URL no se puede interpretar, descarta la query entera', () => {
    expect(sinParametrosSensibles('/?c=abc123')).toBe('/')
  })
})
