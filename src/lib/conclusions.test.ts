import { describe, it, expect } from 'vitest'
import { buildConclusions, rankAdherence, ConclusionRow } from './conclusions'

const row = (o: Partial<ConclusionRow> & { id: string }): ConclusionRow => ({
  name: o.id, adherencia7: 50, diasSinEntrenar: 1, racha: 0, mejora: 0, esNuevo: false, ...o,
})

describe('buildConclusions', () => {
  it('agrupa a los que llevan más de 7 días y usa singular/plural', () => {
    const c = buildConclusions([row({ id: 'Ana', diasSinEntrenar: 9 }), row({ id: 'Luis', diasSinEntrenar: 12 }), row({ id: 'Eva' })])
    expect(c[0].tone).toBe('bad')
    expect(c[0].text).toBe('2 clientes llevan más de 7 días sin entrenar')
    expect(c[0].names).toEqual(['Luis', 'Ana'])
    expect(buildConclusions([row({ id: 'Ana', diasSinEntrenar: 9 })])[0].text).toBe('1 cliente lleva más de 7 días sin entrenar')
  })

  it('un cliente solo aparece en la conclusión más grave', () => {
    const c = buildConclusions([row({ id: 'Ana', diasSinEntrenar: 9, mejora: -3 })])
    expect(c.filter(x => x.names.includes('Ana'))).toHaveLength(1)
  })

  it('separa 3-6 días de la caída de cumplimiento', () => {
    const c = buildConclusions([row({ id: 'A', diasSinEntrenar: 4 }), row({ id: 'B', mejora: -2 })])
    expect(c.map(x => x.text)).toEqual([
      '1 cliente lleva entre 3 y 6 días sin entrenar',
      '1 cliente ha entrenado bastante menos que la semana pasada',
    ])
  })

  it('los clientes nuevos no cuentan como inactivos', () => {
    const c = buildConclusions([row({ id: 'Nuevo', diasSinEntrenar: 999, esNuevo: true })])
    expect(c.some(x => x.tone === 'bad' || x.tone === 'warn')).toBe(false)
  })

  it('sin problemas dice que todo está al día', () => {
    const c = buildConclusions([row({ id: 'A', racha: 4 }), row({ id: 'B' })])
    expect(c[0].text).toBe('Todos tus clientes van al día')
    expect(c.some(x => x.text.includes('en racha'))).toBe(true)
  })

  it('recorta los nombres y cuenta los que sobran', () => {
    const rows = Array.from({ length: 7 }, (_, i) => row({ id: `C${i}`, diasSinEntrenar: 8 + i }))
    const c = buildConclusions(rows)[0]
    expect(c.names).toHaveLength(4)
    expect(c.extra).toBe(3)
  })
})

describe('rankAdherence', () => {
  const rows = [
    row({ id: 'Top', adherencia7: 100, racha: 5 }), row({ id: 'Bien', adherencia7: 80 }),
    row({ id: 'Parado', adherencia7: 0, diasSinEntrenar: 10 }), row({ id: 'Flojo', adherencia7: 20, diasSinEntrenar: 4 }),
    row({ id: 'Nuevo', adherencia7: 0, diasSinEntrenar: 999, esNuevo: true }),
  ]
  it('calcula la media y separa mejores de los que necesitan atención', () => {
    const r = rankAdherence(rows)
    expect(r.media).toBe(40)
    expect(r.mejores.map(x => x.id)).toEqual(['Top', 'Bien'])
    expect(r.atencion.map(x => x.id)).toEqual(['Parado', 'Flojo'])
  })
  it('quien necesita atención no sale entre los mejores aunque no quepa en el top', () => {
    const muchos = [
      ...Array.from({ length: 4 }, (_, i) => row({ id: `P${i}`, adherencia7: 40, diasSinEntrenar: 10 + i })),
      row({ id: 'Bien', adherencia7: 90 }),
    ]
    const r = rankAdherence(muchos, 3)
    expect(r.atencion).toHaveLength(3)
    expect(r.mejores.map(x => x.id)).toEqual(['Bien'])
  })
  it('sin clientes no rompe', () => {
    expect(rankAdherence([])).toEqual({ mejores: [], atencion: [], media: 0 })
  })
})
