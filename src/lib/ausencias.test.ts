import { describe, it, expect } from 'vitest'
import { ausenciaActiva, ausenciasPendientes, enAusencia, rangoTexto, eventoClave, cuentaAtras, diasHasta, Ausencia, EventoCliente } from './ausencias'

const aus = (desde: string, hasta: string, motivo: Ausencia['motivo'] = 'viaje'): Ausencia =>
  ({ id: desde, client_id: 'c', desde, hasta, tipo: 'no_puedo', motivo, nota: '', creado_por: 'cliente' })
const ev = (fecha: string, prioridad: EventoCliente['prioridad'], nombre = fecha): EventoCliente =>
  ({ id: fecha, client_id: 'c', fecha, nombre, prioridad, nota: '' })

describe('ausencias', () => {
  const lista = [aus('2026-11-14', '2026-11-18'), aus('2026-10-20', '2026-10-30', 'lesion'), aus('2026-10-01', '2026-10-03')]

  it('la activa es la que cubre hoy', () => {
    expect(ausenciaActiva(lista, '2026-10-27')?.motivo).toBe('lesion')
    expect(ausenciaActiva(lista, '2026-11-05')).toBeNull()
    expect(ausenciaActiva(lista, '2026-11-18')?.motivo).toBe('viaje') // el último día cuenta
  })

  it('pendientes: las que no han terminado, por orden', () => {
    expect(ausenciasPendientes(lista, '2026-10-27').map(a => a.desde)).toEqual(['2026-10-20', '2026-11-14'])
  })

  it('una fecha dentro de una ausencia', () => {
    expect(enAusencia(lista, '2026-11-15')).toBe(true)
    expect(enAusencia(lista, '2026-11-19')).toBe(false)
  })

  it('rango legible', () => {
    expect(rangoTexto(aus('2026-11-14', '2026-11-18'))).toBe('Del 14 al 18 nov')
    expect(rangoTexto(aus('2026-11-14', '2026-11-14'))).toBe('14 nov')
    expect(rangoTexto(aus('2026-11-30', '2026-12-02'))).toBe('Del 30 nov al 2 dic')
  })
})

describe('eventos y cuenta atrás', () => {
  it('el evento clave es el A más cercano; si no hay A, el más cercano', () => {
    const hoy = '2026-10-27'
    expect(eventoClave([ev('2026-11-10', 'C'), ev('2026-12-06', 'A'), ev('2027-04-01', 'A')], hoy)?.fecha).toBe('2026-12-06')
    expect(eventoClave([ev('2026-11-10', 'C'), ev('2026-11-20', 'B')], hoy)?.fecha).toBe('2026-11-10')
    expect(eventoClave([ev('2026-10-01', 'A')], hoy)).toBeNull() // ya pasó
  })

  it('cuenta atrás en días y, desde 3 semanas, en semanas', () => {
    const hoy = '2026-10-27'
    expect(diasHasta('2026-10-28', hoy)).toBe(1)
    expect(cuentaAtras('2026-10-27', hoy)).toBe('¡Es hoy!')
    expect(cuentaAtras('2026-10-28', hoy)).toBe('Mañana')
    expect(cuentaAtras('2026-11-01', hoy)).toBe('Faltan 5 días')
    expect(cuentaAtras('2026-12-08', hoy)).toBe('Faltan 6 semanas')
  })
})
