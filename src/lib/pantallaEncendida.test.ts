import { describe, it, expect, vi } from 'vitest'
import { mantenerPantallaEncendida } from './pantallaEncendida'

const esperar = () => new Promise(r => setTimeout(r, 0))

function montaje(estado: 'visible' | 'hidden' = 'visible') {
  const oyentes = new Map<string, () => void>()
  const candados: { release: ReturnType<typeof vi.fn> }[] = []
  const request = vi.fn(async () => { const c = { release: vi.fn(async () => {}) }; candados.push(c); return c })
  const doc = {
    visibilityState: estado as string,
    addEventListener: (t: 'visibilitychange', f: () => void) => { oyentes.set(t, f) },
    removeEventListener: (t: 'visibilitychange') => { oyentes.delete(t) },
  }
  return { nav: { wakeLock: { request } }, doc, request, candados, oyentes }
}

describe('mantenerPantallaEncendida', () => {
  it('pide el bloqueo al empezar y lo suelta al salir', async () => {
    const m = montaje()
    const soltar = mantenerPantallaEncendida(m.nav, m.doc)
    await esperar()
    expect(m.request).toHaveBeenCalledTimes(1)
    soltar()
    await esperar()
    expect(m.candados[0].release).toHaveBeenCalledTimes(1)
    expect(m.oyentes.size).toBe(0)
  })

  it('no pide nada si la pantalla no está visible, y lo pide al volver', async () => {
    const m = montaje('hidden')
    mantenerPantallaEncendida(m.nav, m.doc)
    await esperar()
    expect(m.request).not.toHaveBeenCalled()
    m.doc.visibilityState = 'visible'
    m.oyentes.get('visibilitychange')!()
    await esperar()
    expect(m.request).toHaveBeenCalledTimes(1)
  })

  it('no pide un segundo bloqueo si ya tiene uno', async () => {
    const m = montaje()
    mantenerPantallaEncendida(m.nav, m.doc)
    await esperar()
    m.oyentes.get('visibilitychange')!()
    await esperar()
    expect(m.request).toHaveBeenCalledTimes(1)
  })

  it('si se sale mientras se estaba pidiendo, el bloqueo que llega se suelta', async () => {
    const m = montaje()
    const soltar = mantenerPantallaEncendida(m.nav, m.doc)
    soltar() // antes de que llegue la respuesta
    await esperar()
    expect(m.candados[0].release).toHaveBeenCalledTimes(1)
  })

  it('sin la API, o si el navegador la rechaza, no rompe nada', async () => {
    expect(() => mantenerPantallaEncendida({}, montaje().doc)()).not.toThrow()
    const m = montaje()
    m.request.mockRejectedValueOnce(new Error('NotAllowedError'))
    const soltar = mantenerPantallaEncendida(m.nav, m.doc)
    await esperar()
    expect(() => soltar()).not.toThrow()
  })
})
