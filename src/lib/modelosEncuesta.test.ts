import { describe, it, expect } from 'vitest'
import { MODELOS_ENCUESTA, MODELO_PROGRAMACION_INICIAL } from './modelosEncuesta'
import { TIPO, conOpciones, faltan } from './cuestionarios'

describe('modelos de encuesta', () => {
  it('cada modelo es válido: ids únicos, tipos conocidos, opciones donde hacen falta y sin textos vacíos', () => {
    for (const m of MODELOS_ENCUESTA) {
      expect(m.name.trim()).not.toBe('')
      const ids = m.questions.map(x => x.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const p of m.questions) {
        expect(TIPO[p.type], `tipo de ${p.id}`).toBeDefined()
        expect(p.label.trim(), `texto de ${p.id}`).not.toBe('')
        if (conOpciones(p.type)) expect((p.options ?? []).length, `opciones de ${p.id}`).toBeGreaterThanOrEqual(2)
        else expect(p.options, `${p.id} no lleva opciones`).toBeUndefined()
      }
    }
  })

  it('«Programación inicial» pide lo imprescindible (objetivo, experiencia, días, duración y material) y nada más es obligatorio', () => {
    const obligatorias = MODELO_PROGRAMACION_INICIAL.questions.filter(x => x.required).map(x => x.id)
    expect(obligatorias).toEqual(['objetivo', 'experiencia', 'dias', 'duracion', 'material'])
  })

  it('cubre lo que cambia el programa: lesiones, ejercicios que rechaza, marcas, sueño, estrés, cardio, prioridades y barreras', () => {
    const ids = MODELO_PROGRAMACION_INICIAL.questions.map(x => x.id)
    for (const id of ['molestias', 'molestias_detalle', 'rechaza', 'marcas', 'sueno', 'estres', 'cardio', 'prioridad', 'barreras', 'pasos', 'fase']) expect(ids).toContain(id)
  })

  it('con solo lo obligatorio contestado no falta nada', () => {
    const respuestas = { objetivo: 'Ganar músculo', experiencia: 'Menos de 6 meses', dias: '3', duracion: '45-60 min', material: ['Mancuernas'] }
    expect(faltan(MODELO_PROGRAMACION_INICIAL.questions, respuestas)).toEqual([])
    expect(faltan(MODELO_PROGRAMACION_INICIAL.questions, {}).map(x => x.id)).toEqual(['objetivo', 'experiencia', 'dias', 'duracion', 'material'])
  })

  it('no pide datos de salud sensibles que no cambien el programa (eso va en el PAR-Q del alta)', () => {
    const texto = MODELO_PROGRAMACION_INICIAL.questions.map(x => x.label.toLowerCase()).join(' ')
    for (const palabra of ['medicación', 'diagnóstico', 'enfermedad', 'embarazo', 'menstru']) expect(texto).not.toContain(palabra)
  })
})
