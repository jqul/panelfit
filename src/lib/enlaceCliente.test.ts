import { describe, it, expect } from 'vitest'
import { caducaEn, estadoEnlace, describirEstado, opcionActual, pantallaDeEnlace, CADUCIDADES } from './enlaceCliente'

const AHORA = new Date('2026-10-24T10:00:00Z')

describe('caducidad del enlace', () => {
  it('sin días no caduca; con días cae exactamente tantos días después', () => {
    expect(caducaEn(null, AHORA)).toBeNull()
    expect(caducaEn(30, AHORA)).toBe('2026-11-23T10:00:00.000Z')
    expect(caducaEn(7, AHORA)).toBe('2026-10-31T10:00:00.000Z')
  })

  it('distingue sin caducidad, vigente y caducado', () => {
    expect(estadoEnlace(null, AHORA).estado).toBe('sin-caducidad')
    expect(estadoEnlace(undefined, AHORA).estado).toBe('sin-caducidad')
    expect(estadoEnlace('basura', AHORA).estado).toBe('sin-caducidad')
    expect(estadoEnlace('2026-10-31T10:00:00Z', AHORA)).toMatchObject({ estado: 'vigente', diasRestantes: 7 })
    expect(estadoEnlace('2026-10-24T09:59:59Z', AHORA).estado).toBe('caducado')
    expect(estadoEnlace('2026-10-24T10:00:00Z', AHORA).estado).toBe('caducado') // en el instante exacto ya no vale, como en el servidor (> now())
  })

  it('un día parcial cuenta como un día más, no como cero', () => {
    expect(estadoEnlace('2026-10-24T10:00:01Z', AHORA)).toMatchObject({ estado: 'vigente', diasRestantes: 1 })
  })

  it('describe cada estado en una frase', () => {
    expect(describirEstado({ estado: 'sin-caducidad' })).toBe('El enlace no caduca.')
    expect(describirEstado(estadoEnlace('2026-10-25T09:00:00Z', AHORA))).toMatch(/queda 1 día/)
    expect(describirEstado(estadoEnlace('2026-11-23T10:00:00Z', AHORA))).toMatch(/quedan 30 días/)
    expect(describirEstado(estadoEnlace('2026-10-01T10:00:00Z', AHORA))).toMatch(/caducó el .* no puede abrirlo/)
  })

  it('el selector marca la opción más parecida a lo guardado, y ninguna si ya caducó', () => {
    expect(opcionActual(null, AHORA)).toBe('nunca')
    expect(opcionActual(caducaEn(30, AHORA), AHORA)).toBe('30')
    expect(opcionActual(caducaEn(88, AHORA), AHORA)).toBe('90')
    expect(opcionActual('2026-10-01T10:00:00Z', AHORA)).toBe('')
    expect(CADUCIDADES.map(c => c.id)).toContain(opcionActual(caducaEn(7, AHORA), AHORA))
  })

  it('"expired" es caducado, "archived" es acceso pausado; todo lo demás es un enlace que no existe', () => {
    expect(pantallaDeEnlace('expired')).toBe('caducado')
    expect(pantallaDeEnlace('archived')).toBe('pausado')
    expect(pantallaDeEnlace('ok')).toBe('no-existe') // el servidor dice que va bien pero no devolvió cliente: no inventar un motivo
    expect(pantallaDeEnlace(null)).toBe('no-existe')
    expect(pantallaDeEnlace(undefined)).toBe('no-existe')
  })
})
