import { describe, it, expect } from 'vitest'
import {
  toggleId, toggleAll, pruneSelection, summarizeResult, emptyResult, hasActiveDraft, partitionByDraft,
  buildWorkoutPlan, applyLabelChange, waUrl, formatPhone, buildMessages, buildSurveyMessages,
} from './bulkActions'
import type { TrainingPlan, WeekPlan } from '../types'

describe('selección', () => {
  it('toggleId añade y quita sin mutar el original', () => {
    const a = new Set(['1'])
    const b = toggleId(a, '2')
    expect([...a]).toEqual(['1'])
    expect([...b].sort()).toEqual(['1', '2'])
    expect([...toggleId(b, '1')]).toEqual(['2'])
  })

  it('toggleAll selecciona los visibles y, si ya lo estaban todos, los quita', () => {
    expect([...toggleAll(new Set(['1']), ['1', '2', '3'])].sort()).toEqual(['1', '2', '3'])
    expect(toggleAll(new Set(['1', '2', '3']), ['1', '2', '3']).size).toBe(0)
    expect(toggleAll(new Set(), []).size).toBe(0) // sin visibles no selecciona nada
  })

  it('pruneSelection descarta lo que ya no se ve, y no crea un Set nuevo si no cambia nada', () => {
    const sel = new Set(['1', '2', '9'])
    expect([...pruneSelection(sel, ['1', '2', '3'])].sort()).toEqual(['1', '2'])
    const same = new Set(['1', '2'])
    expect(pruneSelection(same, ['1', '2', '3'])).toBe(same) // misma referencia: evita renders de más
  })
})

describe('resumen del resultado', () => {
  it('ok solo si todo salió bien', () => {
    const r = { ...emptyResult(), ok: ['a', 'b'] }
    expect(summarizeResult(r, 'Asignado')).toEqual({ tone: 'ok', headline: 'Asignado en 2 de 2 clientes', detail: [] })
  })
  it('cualquier fallo u omisión cambia el tono y se cuenta', () => {
    const r = { ok: ['a'], failed: [{ id: 'b', reason: 'x' }, { id: 'c', reason: 'x' }], skipped: [{ id: 'd', reason: 'y' }] }
    const s = summarizeResult(r, 'Asignado')
    expect(s.tone).toBe('warn')
    expect(s.headline).toBe('Asignado en 1 de 4 clientes')
    expect(s.detail).toEqual(['2 fallaron', '1 omitido'])
  })
  it('singular cuando es uno', () => {
    expect(summarizeResult({ ok: ['a'], failed: [], skipped: [] }, 'Hecho').headline).toBe('Hecho en 1 de 1 cliente')
  })
})

describe('borradores', () => {
  const conBorrador = { clientId: 'a', plan: { P: {} }, plan_borrador: { P: { weeks: [] } }, borrador_activo: true }
  it('hay borrador solo si está activo y tiene plan dentro', () => {
    expect(hasActiveDraft(conBorrador)).toBe(true)
    expect(hasActiveDraft({ clientId: 'a', borrador_activo: true, plan_borrador: null })).toBe(false)
    expect(hasActiveDraft({ clientId: 'a', borrador_activo: false, plan_borrador: { P: {} } })).toBe(false) // descartado
    expect(hasActiveDraft(undefined)).toBe(false)
  })
  it('separa a los que tienen borrador; quien no tiene fila de plan sí se puede asignar', () => {
    const rows = [conBorrador, { clientId: 'b', plan: { P: {} }, borrador_activo: false }]
    expect(partitionByDraft(['a', 'b', 'c'], rows)).toEqual({ assignable: ['b', 'c'], withDraft: ['a'] })
  })
})

describe('buildWorkoutPlan', () => {
  const ex = (name: string) => ({ name, sets: '3x5', weight: '', comment: '', isMain: false })
  const weeks = (): WeekPlan[] => [
    { label: 'S1', rpe: '', isCurrent: false, days: [{ title: 'A', focus: '', exercises: [ex('Sentadilla'), ex('Press'), ex('Remo')] }] },
    { label: 'S2', rpe: '', isCurrent: true, days: [{ title: 'A', focus: '', exercises: [ex('Sentadilla')] }] },
  ] as WeekPlan[]

  it('sin plan previo crea uno con descansos por defecto', () => {
    const p = buildWorkoutPlan('c1', { type: 'fuerza', weeks: weeks() }, null, '2026-10-24')
    expect(p).toMatchObject({ clientId: 'c1', type: 'fuerza', restMain: 180, restAcc: 90, restWarn: 30, fechaInicio: '2026-10-24' })
  })

  it('no reordena ni pierde ejercicios (los registros son por posición)', () => {
    const p = buildWorkoutPlan('c1', { type: 'fuerza', weeks: weeks() }, null, '2026-10-24')
    expect(p.weeks[0].days[0].exercises.map(e => e.name)).toEqual(['Sentadilla', 'Press', 'Remo'])
    expect(p.weeks.map(w => w.label)).toEqual(['S1', 'S2'])
  })

  it('la primera semana pasa a ser la actual', () => {
    const p = buildWorkoutPlan('c1', { type: 'x', weeks: weeks() }, null, '2026-10-24')
    expect(p.weeks.map(w => w.isCurrent)).toEqual([true, false])
  })

  it('copia el workout: cambiar el plan no toca la plantilla', () => {
    const w = weeks()
    const p = buildWorkoutPlan('c1', { type: 'x', weeks: w }, null, '2026-10-24')
    p.weeks[0].days[0].exercises[0].name = 'otro'
    expect(w[0].days[0].exercises[0].name).toBe('Sentadilla')
  })

  it('conserva lo ya configurado y deja de ser "de un programa"', () => {
    const existing = { clientId: 'c1', type: 'viejo', restMain: 120, restAcc: 60, restWarn: 15, weeks: [], coachNotes: 'ojo hombro', diasSemana: 3, autoCheckin: true, programId: 'prog1', programName: 'Programa 1' } as TrainingPlan
    const p = buildWorkoutPlan('c1', { type: 'nuevo', weeks: weeks() }, existing, '2026-10-24')
    expect(p).toMatchObject({ type: 'nuevo', restMain: 120, coachNotes: 'ojo hombro', diasSemana: 3, autoCheckin: true })
    expect(p.programId).toBeUndefined()
    expect(p.programName).toBeUndefined()
    expect(existing.programId).toBe('prog1') // no muta el original
  })
})

describe('etiquetas', () => {
  it('añade sin duplicar y quita, conservando el orden', () => {
    expect(applyLabelChange(['a', 'b'], ['b', 'c'], [])).toEqual({ next: ['a', 'b', 'c'], changed: true })
    expect(applyLabelChange(['a', 'b', 'c'], [], ['b'])).toEqual({ next: ['a', 'c'], changed: true })
  })
  it('avisa de que no cambia nada, para no escribir de más', () => {
    expect(applyLabelChange(['a', 'b'], ['a'], ['z'])).toEqual({ next: ['a', 'b'], changed: false })
    expect(applyLabelChange(undefined, [], ['z'])).toEqual({ next: [], changed: false })
    expect(applyLabelChange(null, ['a'], [])).toEqual({ next: ['a'], changed: true })
  })
  it('una etiqueta pedida a la vez para añadir y quitar se quita', () => {
    expect(applyLabelChange(['a'], ['b'], ['b'])).toEqual({ next: ['a'], changed: false })
  })
})

describe('mensajes por WhatsApp', () => {
  const c = (id: string, name: string, phone?: string) => ({ id, name, surname: 'López', phone, token: `tok${id}` })

  it('normaliza el teléfono y escapa el texto', () => {
    expect(formatPhone('+34 600 11-22 33')).toBe('34600112233')
    expect(formatPhone('0034 600')).toBe('34600')
    expect(waUrl('+34 600 111 222', 'Hola & adiós')).toBe('https://wa.me/34600111222?text=Hola%20%26%20adi%C3%B3s')
    expect(waUrl('', 'x')).toBeNull()
    expect(waUrl(undefined, 'x')).toBeNull()
  })

  it('personaliza {{cliente}} y añade el enlace solo si se pide', () => {
    const sin = buildMessages([c('1', 'Ana', '600')], 'Hola {{cliente}}', { origin: 'https://app', includeLink: false })
    expect(sin[0].text).toBe('Hola Ana')
    const con = buildMessages([c('1', 'Ana', '600')], 'Hola {{cliente}}', { origin: 'https://app', includeLink: true })
    expect(con[0].text).toBe('Hola Ana\n\nhttps://app?c=tok1')
  })

  it('un cliente sin teléfono sale marcado (url null) en vez de quedar fuera en silencio', () => {
    const m = buildMessages([c('1', 'Ana', '600'), c('2', 'Luis')], 'Hola', { origin: 'o', includeLink: false })
    expect(m.map(x => x.url !== null)).toEqual([true, false])
    expect(m[1].phone).toBeNull()
    expect(m.map(x => x.name)).toEqual(['Ana López', 'Luis López'])
  })

  it('la encuesta lleva el enlace de cada cliente con ?encuesta=1', () => {
    const m = buildSurveyMessages([c('1', 'Ana', '600'), c('2', 'Luis', '700')], 'Check-in semanal', 'https://app')
    expect(m[0].text).toContain('https://app?c=tok1&encuesta=1')
    expect(m[1].text).toContain('https://app?c=tok2&encuesta=1')
    expect(m[0].text).toContain('*Check-in semanal*')
  })
})
