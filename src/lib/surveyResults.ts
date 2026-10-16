// Resultados de una encuesta de seguimiento: lo que importa al abrirla no es la
// lista de respuestas sueltas sino la conclusión (cuánto de media, qué % dice
// que sí, qué opción gana). Todo puro, para poder probarlo.

export interface SurveyQuestion {
  id: string
  type: 'scale' | 'text' | 'yesno' | 'choice'
  label: string
  options?: string[]
}

export interface SurveyAnswerSet {
  template_id: string
  completed_at: number
  answers: Record<string, any>
}

export interface QuestionSummary {
  id: string
  label: string
  type: SurveyQuestion['type']
  answered: number
  /** Escala: media de las respuestas numéricas, con un decimal. */
  avg?: number
  /** Sí/No: porcentaje de síes, redondeado. */
  yesPct?: number
  /** Opción múltiple: veces que se eligió cada opción, de más a menos. */
  counts?: { option: string; n: number }[]
}

export interface SurveySummary {
  responses: number
  lastAt: number | null
  questions: QuestionSummary[]
}

const has = (v: unknown) => v !== undefined && v !== null && v !== ''

export function summarizeSurvey(questions: SurveyQuestion[], responses: SurveyAnswerSet[]): SurveySummary {
  const lastAt = responses.length ? Math.max(...responses.map(r => r.completed_at)) : null
  const summaries = questions.map((q): QuestionSummary => {
    const given = responses.map(r => r.answers?.[q.id]).filter(has)
    const base: QuestionSummary = { id: q.id, label: q.label, type: q.type, answered: given.length }
    if (q.type === 'scale') {
      const nums = given.map(Number).filter(n => !isNaN(n))
      base.answered = nums.length
      if (nums.length) base.avg = Math.round((nums.reduce((a, n) => a + n, 0) / nums.length) * 10) / 10
    } else if (q.type === 'yesno') {
      if (given.length) base.yesPct = Math.round((given.filter(v => v === true || v === 'true' || v === 'Sí').length / given.length) * 100)
    } else if (q.type === 'choice') {
      const tally = new Map<string, number>()
      given.forEach(v => tally.set(String(v), (tally.get(String(v)) || 0) + 1))
      base.counts = [...tally.entries()].map(([option, n]) => ({ option, n })).sort((a, b) => b.n - a.n || a.option.localeCompare(b.option, 'es'))
    }
    return base
  })
  return { responses: responses.length, lastAt, questions: summaries }
}

const FREQ: Record<string, string> = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual', once: 'Una vez' }
const DAYS = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

// "Semanal · lunes" / "Mensual" / "Una vez". El día solo importa si hay uno semanal o quincenal.
export function describeSchedule(s: { frequency: string; day_of_week: number }): string {
  const f = FREQ[s.frequency] || s.frequency
  const withDay = (s.frequency === 'weekly' || s.frequency === 'biweekly') && DAYS[s.day_of_week]
  return withDay ? `${f} · ${DAYS[s.day_of_week]}` : f
}

// Junta los envíos idénticos (misma frecuencia, día y estado) para no repetir
// la misma línea: "Una vez (en pausa) ×2" en vez de dos líneas iguales.
export function groupSchedules(list: { id: string; frequency: string; day_of_week: number; active: boolean }[]): { key: string; text: string; active: boolean; n: number }[] {
  const groups = new Map<string, { key: string; text: string; active: boolean; n: number }>()
  for (const s of list) {
    const text = describeSchedule(s)
    const key = `${text}|${s.active}`
    const g = groups.get(key)
    if (g) g.n++
    else groups.set(key, { key, text, active: s.active, n: 1 })
  }
  return [...groups.values()]
}
