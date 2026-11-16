import { describe, it, expect } from 'vitest'
import { semanasDePeso, avisoRitmo, mediaMovil, type Pesaje } from './ritmoPeso'

// Lunes 2026-10-19, 26-oct y 2-nov: tres semanas seguidas
const semana = (lunes: string, pesos: number[]): Pesaje[] =>
  pesos.map((weight, i) => { const d = new Date(lunes + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + i); return { date: d.toISOString().slice(0, 10).replace(/^/, ''), weight } })

describe('semanasDePeso', () => {
  it('media de cada semana (lunes a domingo) y cambio frente a la anterior en % del peso', () => {
    const r = semanasDePeso([...semana('2026-10-19', [81, 81, 81]), ...semana('2026-10-26', [80.2, 80.2, 80.2]), ...semana('2026-11-02', [79.4, 79.4, 79.4])])
    expect(r.map(s => s.media)).toEqual([81, 80.2, 79.4])
    expect(r[0].cambioPct).toBeNull()
    expect(r[1].cambioKg).toBeCloseTo(-0.8, 5)
    expect(r[1].cambioPct).toBeCloseTo(-0.9877, 3)
    expect(r[2].cambioPct).toBeCloseTo(-0.9975, 3)
  })

  it('un día suelto no mueve la media: lo que importa es la semana', () => {
    const r = semanasDePeso([...semana('2026-10-19', [80, 80, 80, 80, 80, 80, 80]), ...semana('2026-10-26', [80, 80, 81.4, 80, 80, 80, 80])])
    expect(r[1].cambioPct).toBeCloseTo(0.25, 2) // un +1,4 kg de agua = +0,2 kg en la media
  })

  it('sin la semana inmediatamente anterior no hay cambio (no se compara con un hueco)', () => {
    const r = semanasDePeso([...semana('2026-10-12', [80, 80, 80]), ...semana('2026-10-26', [79, 79, 79])])
    expect(r[1].cambioPct).toBeNull()
  })

  it('marca como poco fiable la semana con menos de 3 pesajes y descarta datos inválidos', () => {
    const r = semanasDePeso([{ date: '2026-10-19', weight: 80 }, { date: '2026-10-20', weight: 80 }, { date: '2026-10-21', weight: 0 }, { date: '', weight: 80 }, { date: '2026-10-22', weight: NaN }])
    expect(r).toHaveLength(1)
    expect(r[0].pesajes).toBe(2)
    expect(r[0].poco).toBe(true)
  })
})

describe('avisoRitmo', () => {
  const tres = (a: number, b: number, c: number) => semanasDePeso([...semana('2026-10-19', [a, a, a]), ...semana('2026-10-26', [b, b, b]), ...semana('2026-11-02', [c, c, c])])

  it('avisa si las dos últimas semanas seguidas pierden más del 0,75 %', () => {
    expect(avisoRitmo(tres(81, 80.2, 79.4))?.tipo).toBe('perdida-rapida')
  })
  it('no avisa con una sola semana rápida ni con un ritmo moderado', () => {
    expect(avisoRitmo(tres(81, 80.9, 80.0))).toBeNull()   // −0,1 % y −1,1 %
    expect(avisoRitmo(tres(81, 80.6, 80.2))).toBeNull()   // −0,5 % y −0,5 %
  })
  it('avisa de una ganancia rápida sostenida', () => {
    expect(avisoRitmo(tres(80, 80.5, 81))?.tipo).toBe('ganancia-rapida')
  })
  it('no avisa si a alguna semana le faltan pesajes', () => {
    const r = semanasDePeso([...semana('2026-10-19', [81, 81, 81]), ...semana('2026-10-26', [80.2, 80.2]), ...semana('2026-11-02', [79.4, 79.4, 79.4])])
    expect(avisoRitmo(r)).toBeNull()
  })
  it('el texto no concluye: habla de revisar, no de que algo esté mal', () => {
    const t = avisoRitmo(tres(81, 80.2, 79.4))!.texto
    expect(t).toContain('conviene revisar')
  })
})

describe('mediaMovil', () => {
  it('media de los últimos 7 días, solo con 2 o más pesajes en la ventana', () => {
    const m = mediaMovil([{ date: '2026-11-02', weight: 80 }, { date: '2026-11-03', weight: 79 }, { date: '2026-11-12', weight: 78 }])
    expect(m.get('2026-11-02')).toBeUndefined()
    expect(m.get('2026-11-03')).toBe(79.5)
    expect(m.get('2026-11-12')).toBeUndefined() // los anteriores quedan fuera de la ventana
  })
})
