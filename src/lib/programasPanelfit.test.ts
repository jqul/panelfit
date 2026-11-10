import { describe, it, expect } from 'vitest'
import { PROGRAMAS_PANELFIT, STARTER_TEMPLATES, filtrarProgramas } from './starterTemplates'

describe('programas de PanelFit', () => {
  it('el asistente sigue con sus tres de arranque; la galería tiene todos, cada uno con días, nivel y objetivo', () => {
    expect(STARTER_TEMPLATES.map(p => p.key)).toEqual(['fullbody', 'torso-pierna', 'empuje-tiron-pierna'])
    expect(PROGRAMAS_PANELFIT.length).toBe(16)
    for (const p of PROGRAMAS_PANELFIT) {
      expect(p.dias).toBe(p.weeks[0].days.length)
      expect(p.nivel).toBeTruthy()
      expect(p.objetivo).toBeTruthy()
    }
    expect(new Set(PROGRAMAS_PANELFIT.map(p => p.key)).size).toBe(16)
  })

  it('filtra por días, nivel y objetivo, de menos a más días', () => {
    expect(filtrarProgramas(PROGRAMAS_PANELFIT, { dias: 3 }).map(p => p.key)).toEqual(['fullbody', 'empuje-tiron-pierna', 'casa-3', 'gluteo-pierna-3', 'fuerza-empezar-3', 'casa-sin-material-3', 'fullbody-hipertrofia-3', 'powerlifting-3'])
    expect(filtrarProgramas(PROGRAMAS_PANELFIT, { nivel: 'avanzado' }).map(p => p.key)).toEqual(['fuerza-4', 'dividida-5', 'empuje-tiron-pierna-6'])
    expect(filtrarProgramas(PROGRAMAS_PANELFIT, { objetivo: 'fuerza', nivel: 'intermedio' }).map(p => p.key)).toEqual(['empuje-tiron-pierna', 'powerlifting-3', 'powerbuilding-4'])
    // Los clásicos nuevos llevan rango de reps en los accesorios (para la doble progresión)
    expect(PROGRAMAS_PANELFIT.find(p => p.key === 'fullbody-hipertrofia-3')!.weeks[0].days[0].exercises[2].sets).toBe('3x8-12')
    expect(filtrarProgramas(PROGRAMAS_PANELFIT, { dias: 5, nivel: 'principiante' })).toEqual([])
    expect(filtrarProgramas(PROGRAMAS_PANELFIT, {})[0].dias).toBe(2)
  })
})
