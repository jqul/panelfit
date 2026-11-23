import { describe, it, expect } from 'vitest'
import { respuestasDeAdmision, resumenParq, PARQ_QUESTIONS, INTAKE_FREE_QUESTIONS } from './intakeQuestions'

const etiqueta = (key: string) => INTAKE_FREE_QUESTIONS.find(q => q.key === key)!.label

describe('respuestasDeAdmision', () => {
  it('las preguntas de siempre se guardan aunque estén en blanco, como «Sin responder»', () => {
    const r = respuestasDeAdmision({}, {})
    expect(r.filter(x => x.respuesta === 'Sin responder').map(x => x.pregunta)).toEqual([
      ...PARQ_QUESTIONS, etiqueta('lesiones'), etiqueta('objetivos'), etiqueta('disponibilidad'),
    ])
  })

  it('la opcional no aparece si no se contesta (ni con solo espacios)', () => {
    const r = respuestasDeAdmision({}, { experiencia: '   ' })
    expect(r.map(x => x.pregunta)).not.toContain(etiqueta('experiencia'))
  })

  it('la contestada se guarda sin espacios sobrantes, detrás de las de siempre', () => {
    const r = respuestasDeAdmision({ 0: false, 4: true }, { experiencia: ' 2 años con pesas ' })
    expect(r.slice(0, PARQ_QUESTIONS.length).map(x => x.respuesta)).toEqual(['No', 'Sin responder', 'Sin responder', 'Sin responder', 'Sí', 'Sin responder', 'Sin responder'])
    expect(r.slice(-1)).toEqual([{ pregunta: etiqueta('experiencia'), respuesta: '2 años con pesas' }])
  })

  it('el registro ya no pregunta por las marcas ni por las horas de sueño (las recoge el cuestionario de programación), aunque llegaran en las respuestas', () => {
    expect(INTAKE_FREE_QUESTIONS.map(q => q.key)).toEqual(['lesiones', 'objetivos', 'disponibilidad', 'experiencia'])
    const preguntas = respuestasDeAdmision({}, { experiencia: 'x', marcas: 'Sentadilla 100 kg', sueno: '6' }).map(x => x.pregunta)
    expect(preguntas.some(p => /Marcas o pesos actuales|Cuántas horas duermes/.test(p))).toBe(false)
  })

  it('un «No» a una pregunta de salud no se confunde con no contestada (null)', () => {
    const r = respuestasDeAdmision({ 1: null, 2: false }, {})
    expect(r[1].respuesta).toBe('Sin responder')
    expect(r[2].respuesta).toBe('No')
  })
})

describe('resumenParq', () => {
  const r = (parq: Record<number, boolean | null>, libres: Record<string, string> = {}) => respuestasDeAdmision(parq, libres)
  const todasNo = Object.fromEntries(PARQ_QUESTIONS.map((_, i) => [i, false]))

  it('un «Sí» se anuncia en el título, con el singular y el plural bien escritos', () => {
    expect(resumenParq(r({ ...todasNo, 4: true }))).toMatchObject({ requierenAtencion: 1, atencion: true, texto: 'PAR-Q · 1 respuesta requiere atención' })
    expect(resumenParq(r({ ...todasNo, 1: true, 4: true })).texto).toBe('PAR-Q · 2 respuestas requieren atención')
  })

  it('todo «No»: sin respuestas de riesgo y sin alerta', () => {
    expect(resumenParq(r(todasNo))).toMatchObject({ requierenAtencion: 0, atencion: false, texto: 'PAR-Q · sin respuestas de riesgo' })
  })

  it('lo no contestado no se da por «No»: se dice que falta', () => {
    expect(resumenParq(r({ 0: false })).texto).toBe('PAR-Q · 6 sin responder')
    expect(resumenParq(r({ ...todasNo, 2: null })).texto).toBe('PAR-Q · 1 sin responder')
  })

  it('un «Sí» sigue mandando aunque haya otras sin responder; y un «Sí» en una respuesta libre no cuenta', () => {
    expect(resumenParq(r({ 4: true })).atencion).toBe(true)
    expect(resumenParq(r(todasNo, { lesiones: 'Sí' })).atencion).toBe(false)
  })
})
