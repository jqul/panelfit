import { describe, it, expect, vi } from 'vitest'
vi.mock('./supabase', () => ({ supabase: {} }))
import { estadoParaCliente, mensajeError, puedeCancelar, resumenPlazas, type ClaseCliente } from './clasesGrupo'

const clase = (o: Partial<ClaseCliente> = {}): ClaseCliente => ({
  id: 'k', titulo: 'Funcional', start_at: '2026-11-10T18:00:00Z', end_at: '2026-11-10T19:00:00Z', notas: '',
  aforo: 10, ocupadas: 3, en_espera: 0, mi_estado: null, mi_puesto: null, cancelar_horas: 0, ...o,
})

describe('resumenPlazas', () => {
  it('ocupadas de aforo y la espera si la hay', () => {
    expect(resumenPlazas({ aforo: 10, ocupadas: 3, en_espera: 0 })).toBe('3 de 10 plazas')
    expect(resumenPlazas({ aforo: 1, ocupadas: 1, en_espera: 2 })).toBe('1 de 1 plaza · 2 en espera')
  })
})

describe('estadoParaCliente', () => {
  it('su plaza, su puesto en la espera, o cuántas quedan', () => {
    expect(estadoParaCliente(clase({ mi_estado: 'reservada' }))).toBe('Tienes plaza')
    expect(estadoParaCliente(clase({ mi_estado: 'espera', mi_puesto: 2 }))).toBe('En lista de espera (2º)')
    expect(estadoParaCliente(clase())).toBe('Quedan 7 plazas')
    expect(estadoParaCliente(clase({ ocupadas: 9 }))).toBe('Queda 1 plaza')
    expect(estadoParaCliente(clase({ ocupadas: 10, en_espera: 3 }))).toBe('Completa · 3 en espera')
  })
})

describe('puedeCancelar', () => {
  const ahora = new Date('2026-11-10T00:00:00Z')
  it('con plazo, solo hasta esas horas antes; sin plazo o en espera, siempre', () => {
    expect(puedeCancelar(clase({ mi_estado: 'reservada', cancelar_horas: 12 }), ahora)).toBe(true) // 18 h antes
    expect(puedeCancelar(clase({ mi_estado: 'reservada', cancelar_horas: 24 }), ahora)).toBe(false)
    expect(puedeCancelar(clase({ mi_estado: 'espera', cancelar_horas: 24 }), ahora)).toBe(true)
    expect(puedeCancelar(clase({ mi_estado: 'reservada', cancelar_horas: 0 }), ahora)).toBe(true)
  })
})

describe('mensajeError', () => {
  it('traduce los errores de la base de datos', () => {
    expect(mensajeError({ message: 'plazo_cancelacion', hint: 'Se puede cancelar hasta 24 h antes' })).toBe('Se puede cancelar hasta 24 h antes: habla con tu entrenador')
    expect(mensajeError({ message: 'demasiado_lejos' })).toMatch(/tan adelante/)
    expect(mensajeError(null)).toMatch(/inténtalo/)
  })
})
