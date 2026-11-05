import { describe, it, expect } from 'vitest'
import { limpiarEnlace, plataforma, problemaEnlace, puedeUnirse } from './sesionOnline'

describe('limpiarEnlace y problemaEnlace', () => {
  it('solo https, con dominio y sin espacios', () => {
    expect(limpiarEnlace(' https://meet.google.com/abc-defg-hij ')).toBe('https://meet.google.com/abc-defg-hij')
    expect(limpiarEnlace('http://zoom.us/j/1')).toBeNull()
    expect(limpiarEnlace('https://zoom.us/j/1 ?pwd=a')).toBeNull()
    expect(limpiarEnlace('meet.google.com/abc')).toBeNull()
    expect(limpiarEnlace('https://localhost/x')).toBeNull()
    expect(limpiarEnlace('')).toBeNull()
  })
  it('vacío no es un problema; uno mal, sí', () => {
    expect(problemaEnlace('')).toBeNull()
    expect(problemaEnlace('zoom')).toMatch(/https/)
  })
})

describe('plataforma', () => {
  it('reconoce las habituales', () => {
    expect(plataforma('https://meet.google.com/abc')).toBe('Google Meet')
    expect(plataforma('https://us02web.zoom.us/j/123')).toBe('Zoom')
    expect(plataforma('https://teams.microsoft.com/l/meetup-join/x')).toBe('Teams')
    expect(plataforma('https://mi-sala.example.com/x')).toBe('videollamada')
  })
})

describe('puedeUnirse', () => {
  const ini = '2026-11-05T18:00:00Z', fin = '2026-11-05T19:00:00Z'
  it('desde 15 minutos antes hasta que acaba', () => {
    expect(puedeUnirse(ini, fin, new Date('2026-11-05T17:40:00Z'))).toBe(false)
    expect(puedeUnirse(ini, fin, new Date('2026-11-05T17:46:00Z'))).toBe(true)
    expect(puedeUnirse(ini, fin, new Date('2026-11-05T18:30:00Z'))).toBe(true)
    expect(puedeUnirse(ini, fin, new Date('2026-11-05T19:01:00Z'))).toBe(false)
  })
})
