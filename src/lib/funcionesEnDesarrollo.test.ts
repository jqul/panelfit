import { describe, it, expect, afterEach, vi } from 'vitest'
import { relojActivo } from './funcionesEnDesarrollo'

describe('funciones en desarrollo', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('el reloj está apagado por defecto', () => {
    vi.stubGlobal('localStorage', { getItem: () => null })
    expect(relojActivo()).toBe(false)
  })
  it('se enciende con la marca del navegador (desarrollo y pruebas)', () => {
    vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'pf_reloj' ? '1' : null) })
    expect(relojActivo()).toBe(true)
  })
  it('cualquier otro valor lo deja apagado', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'true' })
    expect(relojActivo()).toBe(false)
  })
  it('sin almacenamiento disponible no falla: apagado', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('bloqueado') } })
    expect(relojActivo()).toBe(false)
  })
})
