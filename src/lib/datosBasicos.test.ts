import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { DATOS_BASICOS_VACIOS, LIMITES_BASICOS, OPCIONES_GENERO, edadEn, validarDatosBasicos, type DatosBasicos } from './datosBasicos'

const hoy = new Date(2026, 10, 22) // 22 nov 2026
const ok: DatosBasicos = { genero: 'm', nacimiento: '1995-03-10', altura: '168,5', peso: '64.2' }

describe('validarDatosBasicos', () => {
  it('datos correctos: acepta coma o punto y devuelve los valores listos para enviar', () => {
    const r = validarDatosBasicos(ok, hoy)
    expect(r.ok).toBe(true)
    expect(r.valores).toEqual({ genero: 'm', nacimiento: '1995-03-10', altura: 168.5, peso: 64.2 })
  })

  it('el género es opcional: «prefiero no decirlo» se envía como vacío', () => {
    expect(validarDatosBasicos({ ...ok, genero: '' }, hoy).valores?.genero).toBeNull()
    expect(OPCIONES_GENERO.map(o => o.v)).toEqual(['', 'h', 'm'])
  })

  it('nacimiento, altura y peso son obligatorios y dicen qué falta', () => {
    const r = validarDatosBasicos(DATOS_BASICOS_VACIOS, hoy)
    expect(r.ok).toBe(false)
    expect(r.errores).toEqual({ nacimiento: 'Indica tu fecha de nacimiento', altura: 'Indica tu altura', peso: 'Indica tu peso' })
  })

  it('altura y peso fuera de rango o no numéricos se rechazan, con el rango en el mensaje', () => {
    for (const altura of ['20', '300', 'alto', '99.9', '250.1']) expect(validarDatosBasicos({ ...ok, altura }, hoy).errores.altura, altura).toContain('entre 100 y 250 cm')
    for (const peso of ['5', '500', 'mucho', '19.9']) expect(validarDatosBasicos({ ...ok, peso }, hoy).errores.peso, peso).toContain('entre 20 y 400 kg')
    expect(validarDatosBasicos({ ...ok, altura: '100', peso: '20' }, hoy).ok).toBe(true)
    expect(validarDatosBasicos({ ...ok, altura: '250', peso: '400' }, hoy).ok).toBe(true)
  })

  it('la fecha debe existir y dar entre 10 y 100 años', () => {
    for (const nacimiento of ['2026-11-23', '2030-01-01', '1800-01-01', '2020-01-01', '1990-02-31', '10/03/1995', 'ayer']) {
      expect(validarDatosBasicos({ ...ok, nacimiento }, hoy).errores.nacimiento, nacimiento).toBe('La fecha de nacimiento no es válida')
    }
    expect(validarDatosBasicos({ ...ok, nacimiento: '2016-11-22' }, hoy).ok).toBe(true)   // justo 10 años
    expect(validarDatosBasicos({ ...ok, nacimiento: '2016-11-23' }, hoy).ok).toBe(false)  // un día antes de cumplir 10
    expect(validarDatosBasicos({ ...ok, nacimiento: '1926-11-22' }, hoy).ok).toBe(true)   // 100 años
    expect(validarDatosBasicos({ ...ok, nacimiento: '1926-11-21' }, hoy).ok).toBe(false)  // 100 años y un día
  })

  it('la edad cuenta los cumpleaños que ya han pasado', () => {
    expect(edadEn(new Date(1995, 10, 22), hoy)).toBe(31)
    expect(edadEn(new Date(1995, 10, 23), hoy)).toBe(30)
    expect(edadEn(new Date(1995, 0, 1), hoy)).toBe(31)
  })

  it('nunca lanza con texto raro', () => {
    for (const x of ['', ' ', 'NaN', 'Infinity', '1e999', '--', '<script>']) expect(() => validarDatosBasicos({ genero: '', nacimiento: x, altura: x, peso: x }, hoy)).not.toThrow()
  })
})

// La base de datos es la autoridad: si cambia un límite allí, esta prueba obliga a reflejarlo aquí.
describe('coincide con la migración 20261122000010_cliente_datos_basicos.sql', () => {
  const sql = readFileSync('supabase/migrations/20261122000010_cliente_datos_basicos.sql', 'utf8')
  it('los mismos límites', () => {
    expect(sql).toContain(`p_altura < ${LIMITES_BASICOS.alturaMin} or p_altura > ${LIMITES_BASICOS.alturaMax}`)
    expect(sql).toContain(`p_peso < ${LIMITES_BASICOS.pesoMin} or p_peso > ${LIMITES_BASICOS.pesoMax}`)
    expect(sql).toContain(`interval '${LIMITES_BASICOS.edadMin} years'`)
    expect(sql).toContain(`interval '${LIMITES_BASICOS.edadMax} years'`)
    expect(sql).toContain("p_genero not in ('h', 'm')")
  })
  it('solo para el cliente con sesión y nunca anon', () => {
    expect(sql).toContain('auth.uid()')
    expect(sql).toMatch(/revoke execute on function public\.cliente_guardar_datos_basicos\(text, date, numeric, numeric\) from public, anon;/)
    expect(sql).toMatch(/grant execute on function public\.cliente_guardar_datos_basicos\(text, date, numeric, numeric\) to authenticated;/)
  })
  it('solo rellena lo vacío (no pisa lo del entrenador)', () => {
    expect(sql).toContain("coalesce(nullif(btrim(genero), ''), p_genero)")
    expect(sql).toContain('coalesce(altura, 0) = 0')
    expect(sql).toContain('coalesce(weight, 0) = 0')
  })
})
