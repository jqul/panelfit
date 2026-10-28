import { describe, it, expect } from 'vitest'
import { TIPOS, nuevaPregunta, respondida, faltan, textoRespuesta, hojaImprimible, type Pregunta } from './cuestionarios'
import { summarizeSurvey } from './surveyResults'

describe('tipos de pregunta', () => {
  it('hay 8 tipos, y solo los de opciones nacen con opciones', () => {
    expect(TIPOS).toHaveLength(8)
    expect(nuevaPregunta('multi', 'x').options).toEqual(['Opción A', 'Opción B'])
    expect(nuevaPregunta('choice', 'x').options).toHaveLength(2)
    expect(nuevaPregunta('number', 'x').options).toBeUndefined()
  })

  it('cuenta como respondido el 0 y el "No"; no lo vacío ni una lista sin marcar', () => {
    expect(respondida(0)).toBe(true)
    expect(respondida(false)).toBe(true)
    expect(respondida('')).toBe(false)
    expect(respondida([])).toBe(false)
    expect(respondida(['A'])).toBe(true)
    expect(respondida(undefined)).toBe(false)
  })

  it('dice qué obligatorias faltan, en orden', () => {
    const ps: Pregunta[] = [
      { id: 'a', type: 'scale', label: 'A', required: true },
      { id: 'b', type: 'text', label: 'B' },
      { id: 'c', type: 'multi', label: 'C', required: true, options: ['x'] },
    ]
    expect(faltan(ps, {}).map(p => p.id)).toEqual(['a', 'c'])
    expect(faltan(ps, { a: 3, c: ['x'] })).toEqual([])
  })

  it('convierte cada respuesta en texto legible', () => {
    expect(textoRespuesta({ id: 'q', type: 'yesno', label: '' }, false)).toBe('No')
    expect(textoRespuesta({ id: 'q', type: 'scale', label: '' }, 7)).toBe('7 / 10')
    expect(textoRespuesta({ id: 'q', type: 'number', label: '', unit: 'kg' }, 72.5)).toBe('72,5 kg')
    expect(textoRespuesta({ id: 'q', type: 'multi', label: '' }, ['Dormir', 'Dieta'])).toBe('Dormir, Dieta')
    expect(textoRespuesta({ id: 'q', type: 'date', label: '' }, '2026-10-28')).toBe('28 de octubre de 2026')
    expect(textoRespuesta({ id: 'q', type: 'short', label: '' }, '')).toBe('—')
  })
})

describe('hoja para imprimir', () => {
  const ps: Pregunta[] = [{ id: 'q1', type: 'short', label: 'Objetivo' }, { id: 'q2', type: 'yesno', label: '¿Lesión?' }]

  it('lleva título, cliente y cada pregunta con su respuesta', () => {
    const html = hojaImprimible('Cuestionario inicial', ps, [{ cliente: 'Ana Ruiz', fecha: Date.UTC(2026, 9, 28, 10), answers: { q1: 'Correr 10K', q2: true } }])
    expect(html).toContain('<title>Cuestionario inicial</title>')
    expect(html).toContain('<h2>Ana Ruiz</h2>')
    expect(html).toContain('<dt>Objetivo</dt><dd>Correr 10K</dd>')
    expect(html).toContain('<dt>¿Lesión?</dt><dd>Sí</dd>')
  })

  it('escapa lo que escribe la gente (no se puede colar HTML)', () => {
    const html = hojaImprimible('<b>x</b>', ps, [{ cliente: '<img src=x onerror=alert(1)>', fecha: 0, answers: { q1: '</dd><script>alert(1)</script>' } }])
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('resultados con los tipos nuevos', () => {
  const ps = [
    { id: 'n', type: 'number' as const, label: 'Peso' },
    { id: 'm', type: 'multi' as const, label: 'Qué costó', options: ['Dormir', 'Dieta', 'Tiempo'] },
  ]
  const s = summarizeSurvey(ps, [
    { template_id: 't', completed_at: 1, answers: { n: 70, m: ['Dormir', 'Dieta'] } },
    { template_id: 't', completed_at: 2, answers: { n: 71, m: ['Dieta'] } },
  ])

  it('número: media', () => expect(s.questions[0].avg).toBe(70.5))
  it('varias opciones: cuenta cada opción marcada', () => {
    expect(s.questions[1].counts).toEqual([{ option: 'Dieta', n: 2 }, { option: 'Dormir', n: 1 }])
  })
})
