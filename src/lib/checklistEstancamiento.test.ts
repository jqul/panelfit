import { describe, it, expect } from 'vitest'
import { checklistEstancamiento, resumenChecklist, type EntradaChecklist } from './checklistEstancamiento'
import type { SesionEjercicio } from './historialEjercicio'

// Sesiones de la más reciente a la más antigua, con su 1RM estimado y las reps de la mejor serie
const ses = (e1rms: number[], reps = 5): SesionEjercicio[] => e1rms.map((e1rm, i) => ({
  date: `2026-11-${String(20 - i).padStart(2, '0')}`, series: [], mejor: { weight: 100, reps }, e1rm, volumen: 1000,
}))
const base: EntradaChecklist = {
  sesiones: ses([100, 100, 100, 100, 100]),
  sesionesConVideo: 0,
  esfuerzo: { rirMedio: null, objetivo: null },
  carga: { seriesPorSemana: null, sesionesPorSemana: null },
  recuperacion: { checkins: 0, checkinsBajos: 0, molestiasArticulares: 0 },
  ritmoPeso: null, hayPeso: false, adherenciaPct: null,
}
const paso = (e: EntradaChecklist, id: string) => checklistEstancamiento(e).find(p => p.id === id)!

describe('checklistEstancamiento', () => {
  it('¿es real?: con menos de 4 sesiones falta dato, con las 3 últimas sin superar lo mejor hay señal, y si sube no hay estancamiento', () => {
    expect(paso({ ...base, sesiones: ses([100, 100]) }, 'real')).toMatchObject({ estado: 'sin-datos' })
    expect(paso(base, 'real')).toMatchObject({ estado: 'senal' })
    expect(paso({ ...base, sesiones: ses([110, 100, 100, 100, 100]) }, 'real')).toMatchObject({ estado: 'normal' })
  })

  it('datos comparables: si las reps de la mejor serie saltan más de 3, el 1RM estimado no compara igual con igual', () => {
    const sesiones = ses([100, 100, 100, 100]).map((s, i) => ({ ...s, mejor: { weight: 100, reps: i === 0 ? 10 : 4 } }))
    expect(paso({ ...base, sesiones }, 'comparable')).toMatchObject({ estado: 'senal' })
    expect(paso(base, 'comparable')).toMatchObject({ estado: 'normal' })
  })

  it('técnica: sin vídeo no se puede comprobar, y se dice', () => {
    expect(paso(base, 'tecnica')).toMatchObject({ estado: 'sin-datos' })
    expect(paso({ ...base, sesionesConVideo: 2 }, 'tecnica').dato).toContain('2 sesiones con vídeo')
  })

  it('esfuerzo: más de un punto lejos o cerca del RIR previsto es señal; sin RIR falta dato; sin objetivo es solo dato', () => {
    const e = (rirMedio: number | null, objetivo: { min: number; max: number } | null) => paso({ ...base, esfuerzo: { rirMedio, objetivo } }, 'esfuerzo')
    expect(e(null, { min: 1, max: 2 })).toMatchObject({ estado: 'sin-datos' })
    expect(e(4, { min: 1, max: 2 })).toMatchObject({ estado: 'senal' })
    expect(e(4, { min: 1, max: 2 }).dato).toContain('más lejos del fallo')
    expect(e(0, { min: 2, max: 3 })).toMatchObject({ estado: 'senal' })
    expect(e(2, { min: 1, max: 2 })).toMatchObject({ estado: 'normal' })
    expect(e(2, null)).toMatchObject({ estado: 'normal' })
  })

  it('volumen y frecuencia son un dato, nunca una señal (más volumen no siempre es mejor)', () => {
    expect(paso({ ...base, carga: { seriesPorSemana: 9, sesionesPorSemana: 2 } }, 'volumen')).toMatchObject({ estado: 'normal', dato: '9 series por semana en 2 sesiones.' })
    expect(paso(base, 'volumen')).toMatchObject({ estado: 'sin-datos' })
  })

  it('recuperación: la mitad de check-ins con escala baja, o una molestia articular, son señal; sin check-ins falta dato', () => {
    const r = (checkins: number, checkinsBajos: number, molestiasArticulares = 0) => paso({ ...base, recuperacion: { checkins, checkinsBajos, molestiasArticulares } }, 'recuperacion')
    expect(r(0, 0)).toMatchObject({ estado: 'sin-datos' })
    expect(r(4, 1)).toMatchObject({ estado: 'normal' })
    expect(r(4, 2)).toMatchObject({ estado: 'senal' })
    expect(r(4, 0, 1)).toMatchObject({ estado: 'senal' })
    expect(r(0, 0, 1)).toMatchObject({ estado: 'senal' })
  })

  it('peso: el aviso de ritmo es señal; con pesajes y sin aviso, normal; sin pesajes, falta dato', () => {
    expect(paso({ ...base, hayPeso: true, ritmoPeso: { tipo: 'perdida-rapida', texto: 'Pierde rápido.' } }, 'peso')).toMatchObject({ estado: 'senal', dato: 'Pierde rápido.' })
    expect(paso({ ...base, hayPeso: true }, 'peso')).toMatchObject({ estado: 'normal' })
    expect(paso(base, 'peso')).toMatchObject({ estado: 'sin-datos' })
  })

  it('adherencia: por debajo del 70 % es señal; sin plan, falta dato', () => {
    expect(paso({ ...base, adherenciaPct: 55 }, 'adherencia')).toMatchObject({ estado: 'senal', dato: 'Cumple el 55 % de lo previsto.' })
    expect(paso({ ...base, adherenciaPct: 90 }, 'adherencia')).toMatchObject({ estado: 'normal' })
    expect(paso(base, 'adherencia')).toMatchObject({ estado: 'sin-datos' })
  })

  it('siempre salen los ocho pasos en el mismo orden', () => {
    expect(checklistEstancamiento(base).map(p => p.id)).toEqual(['real', 'comparable', 'tecnica', 'esfuerzo', 'volumen', 'recuperacion', 'peso', 'adherencia'])
  })
})

describe('resumenChecklist', () => {
  it('cuenta señales y datos que faltan, y nunca receta una causa', () => {
    const pasos = checklistEstancamiento({ ...base, adherenciaPct: 50, recuperacion: { checkins: 2, checkinsBajos: 2, molestiasArticulares: 0 } })
    const r = resumenChecklist(pasos)
    expect(r.senales).toBe(3) // real + recuperación + adherencia
    expect(r.texto).toContain('UNA intervención pequeña')
    expect(r.texto.toLowerCase()).not.toMatch(/sube el volumen|baja el volumen|aumenta|reduce/)
  })

  it('sin datos suficientes o sin estancamiento: el consejo es seguir observando', () => {
    expect(resumenChecklist(checklistEstancamiento({ ...base, sesiones: ses([100]) })).texto).toContain('seguir registrando')
    expect(resumenChecklist(checklistEstancamiento({ ...base, sesiones: ses([120, 100, 100, 100]) })).texto).toContain('no tocar nada')
  })

  it('un estancamiento con una sola señal o ninguna: antes de cambiar nada, completar lo que falta; mantener es opción', () => {
    expect(resumenChecklist(checklistEstancamiento(base)).texto).toContain('mantener también es una opción')
  })
})
