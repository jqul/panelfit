import { describe, it, expect } from 'vitest'
import { nuevoIdMensaje, esUuid } from './scheduledMessageId'

describe('id de los mensajes programados', () => {
  it('es un uuid válido, que es lo que acepta la columna programacion_mensajes.id', () => {
    expect(esUuid(nuevoIdMensaje())).toBe(true)
  })
  it('no se repite', () => {
    expect(nuevoIdMensaje()).not.toBe(nuevoIdMensaje())
  })
  it('el formato antiguo con prefijo no es un uuid (por eso fallaba el insert)', () => {
    expect(esUuid('sched_1793000000000_ab12')).toBe(false)
  })
})

// Guardia: scheduledMessages.ts debe generar el id con nuevoIdMensaje() y no a mano.
describe('scheduledMessages usa el generador de ids', () => {
  const fuentes = import.meta.glob('/src/lib/scheduledMessages.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  it('no construye ids con prefijo', () => {
    const txt = Object.values(fuentes)[0]
    expect(txt).toContain('nuevoIdMensaje()')
    expect(txt).not.toMatch(/sched_\$\{/)
  })
})
