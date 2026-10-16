import { describe, it, expect } from 'vitest'
import { clientStatus, daysSince, sortClients } from './clientStatus'

const now = new Date(2026, 9, 5, 12) // 5 oct 2026
const ago = (n: number) => {
  const d = new Date(2026, 9, 5 - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('daysSince', () => {
  it('cuenta días naturales y devuelve null sin fecha', () => {
    expect(daysSince(ago(0), now)).toBe(0)
    expect(daysSince(ago(6), now)).toBe(6)
    expect(daysSince(undefined, now)).toBeNull()
  })
})

describe('clientStatus', () => {
  it('sin plan manda sobre todo lo demás', () => {
    expect(clientStatus({ hasPlan: false, lastActive: ago(30) }, now).level).toBe('no-plan')
  })
  it('al día: entrenó hace poco y sin alertas', () => {
    const s = clientStatus({ hasPlan: true, lastActive: ago(2) }, now)
    expect(s).toMatchObject({ level: 'ok', label: 'Al día', reasons: [] })
  })
  it('entrenó hoy', () => {
    expect(clientStatus({ hasPlan: true, doneToday: true, lastActive: ago(0) }, now).label).toBe('Entrenó hoy')
  })
  it('revisar a partir de 4 días sin entrenar', () => {
    const s = clientStatus({ hasPlan: true, lastActive: ago(5) }, now)
    expect(s.level).toBe('review')
    expect(s.reasons).toEqual(['5 días sin entrenar'])
  })
  it('en riesgo con 14 días o más, o si nunca ha entrenado', () => {
    expect(clientStatus({ hasPlan: true, lastActive: ago(14) }, now).level).toBe('risk')
    expect(clientStatus({ hasPlan: true }, now)).toMatchObject({ level: 'risk', reasons: ['Aún no ha entrenado'] })
  })
  it('respeta el flag atRisk del cálculo existente', () => {
    expect(clientStatus({ hasPlan: true, lastActive: ago(1), atRisk: true }, now).level).toBe('risk')
  })
  it('carga alta, salto y plan a punto de acabar piden revisión con su motivo', () => {
    const s = clientStatus({ hasPlan: true, lastActive: ago(1), highAcwr: true, acwrRatio: 1.62, highJumpDrop: true, jumpDropPct: -12, planEndingSoon: true }, now)
    expect(s.level).toBe('review')
    expect(s.reasons).toEqual(['Carga alta (ACWR 1,62)', 'Caída de salto 12%', 'El plan termina pronto'])
  })
})

describe('sortClients', () => {
  const list = [
    { name: 'Zoe', hasPlan: true, lastActive: ago(1), weeklyDays: 4 },
    { name: 'Ana', hasPlan: true, lastActive: ago(20), weeklyDays: 0 },
    { name: 'Beto', hasPlan: false },
    { name: 'Carla', hasPlan: true, lastActive: ago(5), weeklyDays: 2 },
  ]
  const names = (l: typeof list) => l.map(c => c.name)

  it('atención: riesgo, revisar, sin plan y al día, con nombre como desempate', () => {
    expect(names(sortClients(list, 'attention', now))).toEqual(['Ana', 'Carla', 'Beto', 'Zoe'])
  })
  it('nombre: alfabético', () => {
    expect(names(sortClients(list, 'name', now))).toEqual(['Ana', 'Beto', 'Carla', 'Zoe'])
  })
  it('último entreno: quien lleva más sin entrenar primero, nunca cuenta como lo más antiguo', () => {
    expect(names(sortClients(list, 'last', now))).toEqual(['Beto', 'Ana', 'Carla', 'Zoe'])
  })
  it('adherencia: la más baja primero y sin plan al final', () => {
    expect(names(sortClients(list, 'adherence', now))).toEqual(['Ana', 'Carla', 'Zoe', 'Beto'])
  })
  it('no modifica la lista original', () => {
    const before = names(list)
    sortClients(list, 'attention', now)
    expect(names(list)).toEqual(before)
  })
})
