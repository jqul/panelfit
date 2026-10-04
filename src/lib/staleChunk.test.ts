import { describe, it, expect, vi } from 'vitest'
import { isStaleChunkError, reloadOnceForNewVersion } from './staleChunk'

const memStore = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

describe('isStaleChunkError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x/assets/ProgresoTab-abc.js',
    'error loading dynamically imported module',
    'Importing a module script failed.',
    'Loading chunk 12 failed.',
  ])('reconoce "%s"', msg => {
    expect(isStaleChunkError(new Error(msg))).toBe(true)
  })

  it('no confunde errores normales con un despliegue nuevo', () => {
    expect(isStaleChunkError(new Error("Cannot read properties of undefined (reading 'name')"))).toBe(false)
    expect(isStaleChunkError(null)).toBe(false)
  })
})

describe('reloadOnceForNewVersion', () => {
  it('recarga la primera vez', () => {
    const reload = vi.fn()
    expect(reloadOnceForNewVersion(1_000_000, memStore(), reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('no recarga otra vez dentro de la ventana (evita bucles)', () => {
    const store = memStore(), reload = vi.fn()
    reloadOnceForNewVersion(1_000_000, store, reload)
    expect(reloadOnceForNewVersion(1_010_000, store, reload)).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('vuelve a poder recargar pasada la ventana', () => {
    const store = memStore(), reload = vi.fn()
    reloadOnceForNewVersion(1_000_000, store, reload)
    expect(reloadOnceForNewVersion(1_040_000, store, reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('sin sessionStorage utilizable no recarga (no se puede frenar el bucle)', () => {
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } }
    const reload = vi.fn()
    expect(reloadOnceForNewVersion(1, broken, reload)).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})
