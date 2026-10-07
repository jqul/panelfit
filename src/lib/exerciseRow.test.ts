import { describe, it, expect } from 'vitest'
import { exerciseSubtitle, categoryCounts } from './exerciseRow'

const label = (id: string) => ({ pl: 'Powerlifting', hip: 'Hipertrofia', rh: 'Rehabilitación' } as Record<string, string>)[id]

describe('exerciseSubtitle', () => {
  it('grupo, especialidad y vídeos en una línea', () => {
    expect(exerciseSubtitle({ category: 'Pecho', especialidades: ['pl'], videos: [{ url: 'a' }, { url: 'b' }] }, label)).toBe('Pecho · Powerlifting · 2 vídeos')
  })
  it('sin categoría ni especialidad solo dice si hay vídeo', () => {
    expect(exerciseSubtitle({}, label)).toBe('Sin vídeo')
    expect(exerciseSubtitle({ videos: [{ url: 'a' }] }, label)).toBe('1 vídeo')
  })
  it('recorta las especialidades y resume el resto', () => {
    expect(exerciseSubtitle({ category: 'Pierna', especialidades: ['pl', 'hip', 'rh'] }, label)).toBe('Pierna · Powerlifting, Hipertrofia +1 · Sin vídeo')
  })
  it('ignora especialidades desconocidas', () => {
    expect(exerciseSubtitle({ category: 'Core', especialidades: ['zzz'] }, label)).toBe('Core · Sin vídeo')
  })
})

describe('categoryCounts', () => {
  it('cuenta por grupo, de más a menos, sin vacíos', () => {
    expect(categoryCounts([{ category: 'Pecho' }, { category: 'Espalda' }, { category: 'Pecho' }, {}, { category: '' }]))
      .toEqual([{ category: 'Pecho', n: 2 }, { category: 'Espalda', n: 1 }])
  })
  it('empata por nombre', () => {
    expect(categoryCounts([{ category: 'Hombro' }, { category: 'Core' }]).map(c => c.category)).toEqual(['Core', 'Hombro'])
  })
})
