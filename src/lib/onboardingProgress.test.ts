import { describe, it, expect } from 'vitest'
import { computeProgress, loadSent, markSent, isHidden, setHidden, shouldShowChecklist, type OnboardingClient } from './onboardingProgress'
import { STARTER_TEMPLATES, starterToTemplate, buildPlanFromTemplate } from './starterTemplates'

const mem = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}
const none = new Set<string>()
const c = (id: string, o: Partial<OnboardingClient> = {}): OnboardingClient => ({ id, ...o })

describe('progreso del onboarding', () => {
  it('sin clientes: nada hecho y el siguiente paso es crear el primero', () => {
    const p = computeProgress([], none)
    expect(p.done).toBe(0); expect(p.percent).toBe(0); expect(p.complete).toBe(false)
    expect(p.next?.id).toBe('cliente'); expect(p.focusClientId).toBeNull()
  })

  it('con un cliente sin plan, el siguiente paso es el workout y apunta a ese cliente', () => {
    const p = computeProgress([c('a')], none)
    expect(p.steps.map(s => s.done)).toEqual([true, false, false])
    expect(p.next?.id).toBe('plan'); expect(p.focusClientId).toBe('a'); expect(p.percent).toBe(33)
  })

  it('con varios clientes sin plan apunta al primero', () => {
    expect(computeProgress([c('a'), c('b')], none).focusClientId).toBe('a')
  })

  it('en cuanto UN cliente tiene plan, el paso del workout está hecho aunque haya otros sin plan', () => {
    const p = computeProgress([c('a', { hasPlan: true }), c('b')], none)
    expect(p.steps[1].done).toBe(true); expect(p.next?.id).toBe('acceso'); expect(p.focusClientId).toBe('a')
  })

  it('con plan, falta el acceso: apunta al cliente con plan al que aún no se le ha enviado', () => {
    const p = computeProgress([c('a'), c('b', { hasPlan: true })], none)
    expect(p.next?.id).toBe('acceso'); expect(p.focusClientId).toBe('b')
  })

  it('el acceso cuenta como hecho si se envió el enlace o si el cliente ya lo abrió', () => {
    expect(computeProgress([c('a', { hasPlan: true })], new Set(['a'])).complete).toBe(true)
    const abierto = computeProgress([c('a', { hasPlan: true, openedAt: '2026-10-24T10:00:00Z' })], none)
    expect(abierto.complete).toBe(true); expect(abierto.openedCount).toBe(1); expect(abierto.next).toBeNull()
  })

  it('un clientes antiguo ya abierto sin marca local también completa el paso (no depende de localStorage)', () => {
    expect(computeProgress([c('a', { hasPlan: true, openedAt: '2026-01-01T00:00:00Z' })], none).percent).toBe(100)
  })
})

describe('lo que se recuerda en el dispositivo', () => {
  it('guarda a quién se envió el enlace, por entrenador', () => {
    const s = mem()
    expect([...markSent(s, 'u1', 'a')]).toEqual(['a'])
    markSent(s, 'u1', 'b')
    expect([...loadSent(s, 'u1')].sort()).toEqual(['a', 'b'])
    expect(loadSent(s, 'u2').size).toBe(0)
  })

  it('un valor corrupto se ignora', () => {
    const s = mem(); s.setItem('pf_onb_sent_u1', '{no es json'); expect(loadSent(s, 'u1').size).toBe(0)
    s.setItem('pf_onb_sent_u1', '{"a":1}'); expect(loadSent(s, 'u1').size).toBe(0)
    s.setItem('pf_onb_sent_u1', '["a",3,null]'); expect([...loadSent(s, 'u1')]).toEqual(['a'])
  })

  it('si el almacenamiento falla no rompe nada', () => {
    const roto = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') }, removeItem: () => { throw new Error('x') } }
    expect(loadSent(roto, 'u').size).toBe(0)
    expect(() => markSent(roto, 'u', 'a')).not.toThrow()
    expect(isHidden(roto, 'u')).toBe(false)
    expect(() => setHidden(roto, 'u', true)).not.toThrow()
  })

  it('ocultar y reabrir la tarjeta', () => {
    const s = mem()
    expect(isHidden(s, 'u')).toBe(false)
    setHidden(s, 'u', true); expect(isHidden(s, 'u')).toBe(true)
    setHidden(s, 'u', false); expect(isHidden(s, 'u')).toBe(false)
  })

  it('la tarjeta se enseña mientras falte algo y no esté oculta; reabierta, siempre', () => {
    const incompleto = computeProgress([c('a')], none)
    const completo = computeProgress([c('a', { hasPlan: true, openedAt: 'x' })], none)
    expect(shouldShowChecklist(incompleto, false, false)).toBe(true)
    expect(shouldShowChecklist(incompleto, true, false)).toBe(false)
    expect(shouldShowChecklist(completo, false, false)).toBe(false) // un entrenador veterano no ve la tarjeta
    expect(shouldShowChecklist(completo, true, true)).toBe(true)    // pero puede reabrirla
  })
})

describe('plantillas de arranque', () => {
  it('son tres, con ejercicios y un principal por día', () => {
    expect(STARTER_TEMPLATES).toHaveLength(3)
    for (const t of STARTER_TEMPLATES) {
      expect(t.weeks[0].days.length).toBeGreaterThanOrEqual(3)
      for (const d of t.weeks[0].days) {
        expect(d.exercises.length).toBeGreaterThanOrEqual(4)
        expect(d.exercises.filter(e => e.isMain)).toHaveLength(1)
      }
      expect(t.resumen).toMatch(/^\d+ días · \d+ ejercicios$/)
    }
  })

  it('al guardarlas en la librería son copias independientes con id propio', () => {
    const a = starterToTemplate(STARTER_TEMPLATES[0], 'u1', 1)
    const b = starterToTemplate(STARTER_TEMPLATES[0], 'u1', 2)
    expect(a.id).not.toBe(b.id)
    a.weeks[0].days[0].exercises[0].name = 'cambiado'
    expect(STARTER_TEMPLATES[0].weeks[0].days[0].exercises[0].name).not.toBe('cambiado')
  })

  it('el plan del cliente copia las semanas y marca la actual según la fecha de inicio', () => {
    const hoy = new Date(); const f = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
    const plan = buildPlanFromTemplate(STARTER_TEMPLATES[1], 'cli-1', f)
    expect(plan).toMatchObject({ clientId: 'cli-1', type: 'Hipertrofia', fechaInicio: f })
    expect(plan.weeks[0].isCurrent).toBe(true)
    plan.weeks[0].days[0].exercises[0].name = 'x'
    expect(STARTER_TEMPLATES[1].weeks[0].days[0].exercises[0].name).not.toBe('x')
  })
})
