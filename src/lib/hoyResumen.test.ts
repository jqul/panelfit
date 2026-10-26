import { describe, it, expect } from 'vitest'
import { semanaResumen, fraseSemana, fraseRacha, fraseAdherencia, tendenciaFuerza, nombreDePila } from './hoyResumen'
import type { TrainingLogs } from '../types'

const ej = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `E${i}`, sets: '3x5', weight: '', isMain: false, comment: '' }))
const plan = { weeks: [{ label: 'Semana 1', rpe: '', isCurrent: true, days: [
  { title: 'LUNES', focus: '', exercises: ej(2) },
  { title: 'MARTES — sin sesión', focus: '', exercises: [] }, // vacío a propósito: no cuenta
  { title: 'JUEVES', focus: '', exercises: ej(2) },
  { title: 'VIERNES', focus: '', exercises: ej(1) },
] }] }
const hecho = (...claves: string[]): TrainingLogs => Object.fromEntries(claves.map(k => [k, { sets: {}, done: true }]))

describe('resumen de la semana', () => {
  it('cuenta las sesiones previstas (sin los días vacíos) y las cerradas', () => {
    expect(semanaResumen(plan, {}, 0)).toEqual({ hechas: 0, previstas: 3 })
    expect(semanaResumen(plan, hecho('ex_w0_d0_r0', 'ex_w0_d0_r1'), 0)).toEqual({ hechas: 1, previstas: 3 })
    expect(semanaResumen(plan, hecho('ex_w0_d0_r0'), 0).hechas).toBe(0) // a medias no cuenta
  })

  it('una sesión dada por terminada con ejercicios sin hacer cuenta como cerrada', () => {
    const logs: TrainingLogs = { ...hecho('ex_w0_d0_r0'), finished_w0_d0: { sets: {}, done: false, sessionFinished: true } }
    expect(semanaResumen(plan, logs, 0).hechas).toBe(1)
  })

  it('una semana que no existe no rompe nada', () => {
    expect(semanaResumen(plan, {}, 7)).toEqual({ hechas: 0, previstas: 0 })
    expect(semanaResumen({ weeks: [] }, {}, 0)).toEqual({ hechas: 0, previstas: 0 })
  })

  it('la frase anima y nunca reprocha', () => {
    expect(fraseSemana(0, 0)).toBeNull()
    expect(fraseSemana(3, 3)).toEqual({ texto: 'Semana completada. Buen trabajo.', tono: 'ok' })
    expect(fraseSemana(4, 3)?.tono).toBe('ok')
    expect(fraseSemana(2, 3)?.texto).toBe('Has hecho 2 de 3. Te falta 1 para cerrar la semana.')
    expect(fraseSemana(1, 4)?.texto).toBe('Has hecho 1 de 4 esta semana')
    expect(fraseSemana(0, 4)?.texto).toBe('4 sesiones esta semana')
    expect(fraseSemana(0, 1)?.texto).toBe('Una sesión esta semana')
  })
})

describe('frases de las métricas', () => {
  it('racha', () => {
    expect(fraseRacha(0).texto).toBe('Empieza hoy')
    expect(fraseRacha(1).texto).toBe('1 día')
    expect(fraseRacha(2)).toEqual({ texto: '2 días seguidos', tono: 'neutro' })
    expect(fraseRacha(4)).toEqual({ texto: '4 días seguidos', tono: 'ok' })
  })

  it('adherencia, de menos a más, con un tono de ánimo', () => {
    expect(fraseAdherencia(null).texto).toBe('Aún sin datos')
    expect(fraseAdherencia(100)).toEqual({ texto: 'Muy bien', tono: 'ok' })
    expect(fraseAdherencia(85).texto).toBe('Muy bien')
    expect(fraseAdherencia(84).texto).toBe('Bien')
    expect(fraseAdherencia(60).texto).toBe('Bien')
    expect(fraseAdherencia(59)).toEqual({ texto: 'A mejorar', tono: 'atencion' })
    expect(fraseAdherencia(29).texto).toBe('Vamos a por ello')
    expect(fraseAdherencia(0).texto).toBe('Vamos a por ello')
  })

  it('fuerza: flecha y palabra', () => {
    expect(tendenciaFuerza(null).flecha).toBe('↔')
    expect(tendenciaFuerza(0.4)).toEqual({ flecha: '↔', texto: 'Estable', tono: 'neutro' })
    expect(tendenciaFuerza(-0.9).flecha).toBe('↔')
    expect(tendenciaFuerza(6)).toEqual({ flecha: '↑', texto: 'Subiendo', tono: 'ok' })
    expect(tendenciaFuerza(-3)).toEqual({ flecha: '↓', texto: 'Bajando', tono: 'atencion' })
  })

  it('nombre de pila', () => {
    expect(nombreDePila('Javier Quiñones')).toBe('Javier')
    expect(nombreDePila('  Ana  ')).toBe('Ana')
    expect(nombreDePila('')).toBe('')
    expect(nombreDePila(undefined)).toBe('')
  })
})
