import { describe, it, expect } from 'vitest'
import { e1rmDeSerie, referenciaE1RM, exposicionPorSemana, lunesDeISO, type SesionLevantamiento } from './exposicionCargas'

const ses = (fecha: string, series: [number, number, number?][], papel: SesionLevantamiento['papel'] = 'competicion'): SesionLevantamiento =>
  ({ fecha, papel, series: series.map(([weight, reps, rir]) => ({ weight, reps, rir })) })

describe('e1rmDeSerie', () => {
  it('un single es su propio peso y las repeticiones se estiman con Epley', () => {
    expect(e1rmDeSerie({ weight: 180, reps: 1 })).toBe(180)
    expect(e1rmDeSerie({ weight: 100, reps: 5 })).toBeCloseTo(116.67, 1)
  })
  it('el RIR suma a las repeticiones hasta el fallo', () => {
    // 100 × 8 con RIR 1 equivale a 9 repeticiones hasta el fallo
    expect(e1rmDeSerie({ weight: 100, reps: 8, rir: 1 })).toBeCloseTo(130, 5)
  })
  it('pasadas ~10 repeticiones hasta el fallo ya no es fiable', () => {
    expect(e1rmDeSerie({ weight: 60, reps: 12 })).toBe(0)
    expect(e1rmDeSerie({ weight: 60, reps: 10, rir: 1 })).toBe(0)
  })
  it('sin peso o sin repeticiones no estima nada', () => {
    expect(e1rmDeSerie({ weight: 0, reps: 5 })).toBe(0)
    expect(e1rmDeSerie({ weight: 100, reps: 0 })).toBe(0)
  })
})

describe('referenciaE1RM', () => {
  it('es el mejor 1RM de las 8 semanas anteriores, sin contar la propia sesión', () => {
    const s = [ses('2026-09-01', [[170, 1]]), ses('2026-10-20', [[160, 1]]), ses('2026-11-10', [[175, 1]])]
    // Para el 10-nov: la del 1-sep queda fuera (más de 56 días) y la propia no cuenta → 160
    expect(referenciaE1RM(s, '2026-11-10')).toEqual({ kg: 160, propia: false })
  })
  it('usa lo de competición y solo si no hay recurre a las variantes', () => {
    const s = [ses('2026-11-01', [[150, 1]], 'variante'), ses('2026-11-03', [[170, 1]]), ses('2026-11-10', [[100, 1]])]
    expect(referenciaE1RM(s, '2026-11-10')?.kg).toBe(170)
    expect(referenciaE1RM([ses('2026-11-01', [[150, 1]], 'variante'), ses('2026-11-10', [[100, 1]])], '2026-11-10')?.kg).toBe(150)
  })
  it('sin nada anterior, la propia sesión se compara consigo misma y se avisa', () => {
    expect(referenciaE1RM([ses('2026-11-10', [[120, 1], [100, 5]])], '2026-11-10')).toEqual({ kg: 120, propia: true })
  })
  it('sin ninguna serie fiable no hay referencia', () => {
    expect(referenciaE1RM([ses('2026-11-10', [[60, 15]])], '2026-11-10')).toBeNull()
  })
})

describe('exposicionPorSemana', () => {
  it('cuenta las repeticiones por encima de cada umbral con el 1RM de referencia de cada sesión', () => {
    const s = [
      ses('2026-10-26', [[180, 1]]),                       // semana del 26-oct: single de referencia (propia)
      ses('2026-11-03', [[165, 3], [145, 5], [125, 8]]),   // ref 180: 91,7 % · 80,6 % · 69,4 %
    ]
    const r = exposicionPorSemana(s)
    const sem = r['2026-11-02'].competicion
    expect(sem.reps).toBe(16)
    expect(sem.porUmbral).toEqual({ 70: 8, 80: 8, 90: 3 })
  })

  it('no aplica el 1RM de hoy a sesiones antiguas', () => {
    const s = [ses('2026-06-01', [[100, 1]]), ses('2026-06-08', [[95, 3]]), ses('2026-11-09', [[200, 1]])]
    const r = exposicionPorSemana(s)
    // En junio la referencia era 100 (95 = 95 %); el single de 200 de noviembre no la cambia
    expect(r['2026-06-08'].competicion.porUmbral[90]).toBe(3)
  })

  it('separa competición y variantes, y avisa de la referencia propia', () => {
    const r = exposicionPorSemana([ses('2026-11-03', [[170, 1]]), ses('2026-11-04', [[140, 5]], 'variante')])
    const s = r['2026-11-02']
    expect(s.competicion.reps).toBe(1)
    expect(s.variante.reps).toBe(5)
    expect(s.competicion.conReferenciaPropia).toBe(1)
    expect(s.variante.conReferenciaPropia).toBe(0) // la del 3-nov (170) ya es anterior a la variante del 4-nov
    expect(s.variante.porUmbral[80]).toBe(5)       // 140 / 170 = 82 %
  })

  it('las series sin referencia fiable cuentan como repeticiones pero no pasan ningún umbral', () => {
    const r = exposicionPorSemana([ses('2026-11-10', [[60, 15]])])
    expect(r['2026-11-09'].competicion).toMatchObject({ reps: 15, sinReferencia: 15, porUmbral: { 70: 0, 80: 0, 90: 0 } })
  })
})

describe('lunesDeISO', () => {
  it('devuelve el lunes de la semana', () => {
    expect(lunesDeISO('2026-11-14')).toBe('2026-11-09') // sábado
    expect(lunesDeISO('2026-11-15')).toBe('2026-11-09') // domingo
    expect(lunesDeISO('2026-11-09')).toBe('2026-11-09')
  })
})
