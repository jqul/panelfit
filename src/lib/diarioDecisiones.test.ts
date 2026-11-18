import { describe, it, expect } from 'vitest'
import { estaPorRevisar, ordenarDecisiones, validarBorrador, decisionDesdeBorrador, fechaRevision, etiquetaTipo, type Decision, type BorradorDecision } from './diarioDecisiones'

const d = (id: string, fecha: string, extra: Partial<Decision> = {}): Decision => ({ id, fecha, ejercicio: null, hipotesis: 'h', tipo: 'mantener', intervencion: '', revisar_el: null, revisada_el: null, resultado: null, ...extra })
const borrador = (extra: Partial<BorradorDecision> = {}): BorradorDecision => ({ hipotesis: 'Duerme poco', tipo: 'no-intervenir', intervencion: '', semanasRevision: 4, ...extra })

describe('fechaRevision', () => {
  it('suma semanas a la fecha de la decisión', () => {
    expect(fechaRevision('2026-11-18', 4)).toBe('2026-12-16')
    expect(fechaRevision('2026-12-20', 2)).toBe('2027-01-03')
  })
})

describe('estaPorRevisar', () => {
  it('solo con plazo cumplido y sin revisar; sin plazo, nunca (no hay fechas rígidas)', () => {
    expect(estaPorRevisar({ revisar_el: '2026-11-17', revisada_el: null }, '2026-11-18')).toBe(true)
    expect(estaPorRevisar({ revisar_el: '2026-11-18', revisada_el: null }, '2026-11-18')).toBe(true)
    expect(estaPorRevisar({ revisar_el: '2026-11-19', revisada_el: null }, '2026-11-18')).toBe(false)
    expect(estaPorRevisar({ revisar_el: '2026-11-01', revisada_el: '2026-11-10' }, '2026-11-18')).toBe(false)
    expect(estaPorRevisar({ revisar_el: null, revisada_el: null }, '2026-11-18')).toBe(false)
  })
})

describe('ordenarDecisiones', () => {
  it('primero las que toca revisar (la más atrasada arriba) y después las demás, de la más reciente a la más antigua', () => {
    const hoy = '2026-11-18'
    const r = ordenarDecisiones([
      d('a', '2026-10-01'),
      d('b', '2026-11-10', { revisar_el: '2026-11-17' }),
      d('c', '2026-11-15'),
      d('e', '2026-10-20', { revisar_el: '2026-11-05' }),
      d('f', '2026-10-25', { revisar_el: '2026-11-01', revisada_el: '2026-11-02' }),
    ], hoy)
    expect(r.map(x => x.id)).toEqual(['e', 'b', 'c', 'f', 'a'])
  })
})

describe('validarBorrador', () => {
  it('pide qué se decide y la hipótesis', () => {
    expect(validarBorrador(borrador({ tipo: '' }))).toBe('Elige qué decides')
    expect(validarBorrador(borrador({ hipotesis: ' a ' }))).toContain('hipótesis')
    expect(validarBorrador(borrador())).toBeNull()
  })
  it('«no intervenir» y «mantener» no exigen describir un cambio; subir, bajar, redistribuir y sustituir, sí', () => {
    expect(validarBorrador(borrador({ tipo: 'mantener' }))).toBeNull()
    for (const tipo of ['subir', 'bajar', 'redistribuir', 'sustituir'] as const) {
      expect(validarBorrador(borrador({ tipo }))).toContain('qué vas a cambiar')
      expect(validarBorrador(borrador({ tipo, intervencion: '+1 serie' }))).toBeNull()
    }
  })
  it('límite de longitud, el mismo que la base de datos', () => {
    expect(validarBorrador(borrador({ hipotesis: 'x'.repeat(1001) }))).toContain('1000')
  })
})

describe('decisionDesdeBorrador', () => {
  it('recorta los textos, calcula la fecha de revisión y deja sin plazo si no se pide', () => {
    const r = decisionDesdeBorrador(borrador({ ejercicio: ' Sentadilla ', hipotesis: ' Duerme poco ', semanasRevision: 3 }), '2026-11-18')
    expect(r).toMatchObject({ fecha: '2026-11-18', ejercicio: 'Sentadilla', hipotesis: 'Duerme poco', revisar_el: '2026-12-09', revisada_el: null, resultado: null })
    expect(decisionDesdeBorrador(borrador({ semanasRevision: null }), '2026-11-18').revisar_el).toBeNull()
    expect(decisionDesdeBorrador(borrador({ ejercicio: '  ' }), '2026-11-18').ejercicio).toBeNull()
  })
})

describe('etiquetaTipo', () => {
  it('nombre legible de cada tipo', () => {
    expect(etiquetaTipo('no-intervenir')).toBe('No intervenir todavía')
    expect(etiquetaTipo('sustituir')).toBe('Sustituir el ejercicio')
  })
})
