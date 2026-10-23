import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SyncIndicator } from './misc'

const html = (p: Parameters<typeof SyncIndicator>[0]) => renderToStaticMarkup(<SyncIndicator {...p} />)

describe('SyncIndicator', () => {
  it('no enseña nada si todo está subido', () => {
    expect(html({ syncState: 'idle', pendingCount: 0 })).toBe('')
  })
  it('sigue visible con ejercicios sin subir aunque ya haya conexión, y deja reintentar', () => {
    const h = html({ syncState: 'idle', pendingCount: 2, onRetry: () => {} })
    expect(h).toContain('2 ejercicios sin subir')
    expect(h).toContain('Reintentar')
  })
  it('sin conexión dice cuántos hay pendientes y no ofrece reintentar', () => {
    const h = html({ syncState: 'offline', pendingCount: 1, onRetry: () => {} })
    expect(h).toContain('Sin conexión')
    expect(h).toContain('1 ejercicio sin subir')
    expect(h).not.toContain('Reintentar')
  })
  it('con error cuenta lo pendiente y ofrece reintentar', () => {
    const h = html({ syncState: 'error', pendingCount: 3, onRetry: () => {} })
    expect(h).toContain('No se pudo guardar')
    expect(h).toContain('Reintentar')
  })
  it('sin pendientes los estados puntuales se enseñan como siempre', () => {
    expect(html({ syncState: 'saved' })).toContain('Guardado')
    expect(html({ syncState: 'saving' })).toContain('Guardando')
    expect(html({ syncState: 'offline', pendingCount: 0 })).toContain('guardado en este dispositivo')
  })
})
