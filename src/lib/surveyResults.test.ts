import { describe, it, expect } from 'vitest'
import { summarizeSurvey, describeSchedule, SurveyQuestion } from './surveyResults'

const questions: SurveyQuestion[] = [
  { id: 'q1', type: 'scale', label: 'Energía' },
  { id: 'q2', type: 'yesno', label: 'Dieta' },
  { id: 'q3', type: 'choice', label: 'Día', options: ['Lun', 'Mar'] },
  { id: 'q4', type: 'text', label: 'Comentario' },
]
const resp = (t: number, answers: Record<string, any>) => ({ template_id: 't', completed_at: t, answers })

describe('summarizeSurvey', () => {
  const r = [
    resp(100, { q1: 8, q2: true, q3: 'Lun', q4: 'bien' }),
    resp(300, { q1: 6, q2: false, q3: 'Mar' }),
    resp(200, { q1: 7, q2: true, q3: 'Lun' }),
  ]
  const s = summarizeSurvey(questions, r)
  const q = (id: string) => s.questions.find(x => x.id === id)!

  it('cuenta respuestas y recuerda la última', () => {
    expect(s.responses).toBe(3)
    expect(s.lastAt).toBe(300)
  })
  it('escala: media con un decimal', () => {
    expect(q('q1')).toMatchObject({ answered: 3, avg: 7 })
  })
  it('sí/no: porcentaje de síes', () => {
    expect(q('q2').yesPct).toBe(67)
  })
  it('opción múltiple: más elegida primero', () => {
    expect(q('q3').counts).toEqual([{ option: 'Lun', n: 2 }, { option: 'Mar', n: 1 }])
  })
  it('texto: solo cuántos respondieron', () => {
    expect(q('q4')).toMatchObject({ answered: 1 })
    expect(q('q4').avg).toBeUndefined()
  })
  it('ignora respuestas vacías y no numéricas en la escala', () => {
    const x = summarizeSurvey(questions, [resp(1, { q1: '' }), resp(2, { q1: 'abc' }), resp(3, { q1: 9 })])
    expect(x.questions[0]).toMatchObject({ answered: 1, avg: 9 })
  })
  it('sin respuestas no inventa medias', () => {
    const x = summarizeSurvey(questions, [])
    expect(x.responses).toBe(0)
    expect(x.lastAt).toBeNull()
    expect(x.questions[0].avg).toBeUndefined()
    expect(x.questions[1].yesPct).toBeUndefined()
  })
})

describe('describeSchedule', () => {
  it('incluye el día solo en semanal y quincenal', () => {
    expect(describeSchedule({ frequency: 'weekly', day_of_week: 1 })).toBe('Semanal · lunes')
    expect(describeSchedule({ frequency: 'biweekly', day_of_week: 5 })).toBe('Quincenal · viernes')
    expect(describeSchedule({ frequency: 'monthly', day_of_week: 1 })).toBe('Mensual')
    expect(describeSchedule({ frequency: 'once', day_of_week: 3 })).toBe('Una vez')
  })
})
