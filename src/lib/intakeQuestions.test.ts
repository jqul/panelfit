import { describe, it, expect } from 'vitest'
import { respuestasDeAdmision, PARQ_QUESTIONS, INTAKE_FREE_QUESTIONS } from './intakeQuestions'

const etiqueta = (key: string) => INTAKE_FREE_QUESTIONS.find(q => q.key === key)!.label

describe('respuestasDeAdmision', () => {
  it('las preguntas de siempre se guardan aunque estén en blanco, como «Sin responder»', () => {
    const r = respuestasDeAdmision({}, {})
    expect(r.filter(x => x.respuesta === 'Sin responder').map(x => x.pregunta)).toEqual([
      ...PARQ_QUESTIONS, etiqueta('lesiones'), etiqueta('objetivos'), etiqueta('disponibilidad'),
    ])
  })

  it('las opcionales nuevas no aparecen si no se contestan (ni con solo espacios)', () => {
    const r = respuestasDeAdmision({}, { experiencia: '   ', marcas: '' })
    const preguntas = r.map(x => x.pregunta)
    expect(preguntas).not.toContain(etiqueta('experiencia'))
    expect(preguntas).not.toContain(etiqueta('marcas'))
    expect(preguntas).not.toContain(etiqueta('sueno'))
  })

  it('las contestadas se guardan sin espacios sobrantes, detrás de las de siempre', () => {
    const r = respuestasDeAdmision({ 0: false, 4: true }, { marcas: ' Sentadilla 100 kg ', sueno: '6' })
    expect(r.slice(0, PARQ_QUESTIONS.length).map(x => x.respuesta)).toEqual(['No', 'Sin responder', 'Sin responder', 'Sin responder', 'Sí', 'Sin responder', 'Sin responder'])
    expect(r.slice(-2)).toEqual([
      { pregunta: etiqueta('marcas'), respuesta: 'Sentadilla 100 kg' },
      { pregunta: etiqueta('sueno'), respuesta: '6' },
    ])
  })

  it('un «No» a una pregunta de salud no se confunde con no contestada (null)', () => {
    const r = respuestasDeAdmision({ 1: null, 2: false }, {})
    expect(r[1].respuesta).toBe('Sin responder')
    expect(r[2].respuesta).toBe('No')
  })
})
