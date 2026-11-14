import { describe, it, expect } from 'vitest'
import { clasificarLevantamiento, papelDe, levantamientoDe, semanaVacia, sumarTrabajo, totalesPorPapel, trabajoDeSeries } from './papelEjercicio'

describe('clasificarLevantamiento', () => {
  it('reconoce los tres levantamientos de competición', () => {
    expect(clasificarLevantamiento('Sentadilla')).toEqual({ levantamiento: 'sentadilla', papel: 'competicion' })
    expect(clasificarLevantamiento('Sentadilla high bar')).toEqual({ levantamiento: 'sentadilla', papel: 'competicion' })
    expect(clasificarLevantamiento('Press banca')).toEqual({ levantamiento: 'banca', papel: 'competicion' })
    expect(clasificarLevantamiento('Press de banca con barra')).toEqual({ levantamiento: 'banca', papel: 'competicion' })
    expect(clasificarLevantamiento('Peso muerto sumo')).toEqual({ levantamiento: 'peso_muerto', papel: 'competicion' })
    expect(clasificarLevantamiento('Peso muerto convencional')).toEqual({ levantamiento: 'peso_muerto', papel: 'competicion' })
  })

  it('las variantes siguen siendo el levantamiento, pero como variante', () => {
    expect(clasificarLevantamiento('Sentadilla con pausa')).toEqual({ levantamiento: 'sentadilla', papel: 'variante' })
    expect(clasificarLevantamiento('Sentadilla frontal')).toEqual({ levantamiento: 'sentadilla', papel: 'variante' })
    expect(clasificarLevantamiento('Press banca agarre cerrado')).toEqual({ levantamiento: 'banca', papel: 'variante' })
    expect(clasificarLevantamiento('Spoto press banca')).toEqual({ levantamiento: 'banca', papel: 'variante' })
    expect(clasificarLevantamiento('Peso muerto con déficit')).toEqual({ levantamiento: 'peso_muerto', papel: 'variante' })
    expect(clasificarLevantamiento('Peso muerto con pausa')).toEqual({ levantamiento: 'peso_muerto', papel: 'variante' })
    expect(clasificarLevantamiento('Rack pull')).toEqual({ levantamiento: 'peso_muerto', papel: 'variante' })
  })

  it('la pausa en banca es la reglamentaria: cuenta como competición; la pausa larga, no', () => {
    expect(clasificarLevantamiento('Press de banca con pausa')).toEqual({ levantamiento: 'banca', papel: 'competicion' })
    expect(clasificarLevantamiento('Press banca pausa larga')).toEqual({ levantamiento: 'banca', papel: 'variante' })
  })

  it('lo que se parece pero no es el levantamiento no se clasifica', () => {
    for (const n of ['Prensa de piernas', 'Sentadilla hack', 'Sentadilla búlgara', 'Sentadilla goblet', 'Press inclinado con mancuernas',
      'Press de banca con mancuernas', 'Peso muerto rumano', 'Curl femoral', 'Remo con barra', 'Press militar', '']) {
      expect(clasificarLevantamiento(n)).toBeNull()
    }
  })

  it('ignora acentos y mayúsculas', () => {
    expect(clasificarLevantamiento('SENTADILLA CON PAUSA')?.papel).toBe('variante')
    expect(clasificarLevantamiento('peso muerto con DÉFICIT')?.papel).toBe('variante')
  })
})

describe('papelDe', () => {
  it('lo que marca el entrenador manda sobre lo que se deduce del nombre', () => {
    expect(papelDe({ name: 'Sentadilla', papel: 'accesorio' })).toBe('accesorio')
    expect(papelDe({ name: 'Prensa de piernas', papel: 'variante' })).toBe('variante')
  })
  it('sin marca, se deduce del nombre; si no se parece a nada, es accesorio', () => {
    expect(papelDe({ name: 'Sentadilla con pausa' })).toBe('variante')
    expect(papelDe({ name: 'Press banca' })).toBe('competicion')
    expect(papelDe({ name: 'Curl de bíceps' })).toBe('accesorio')
  })
  it('un valor raro guardado no rompe nada', () => {
    expect(papelDe({ name: 'Sentadilla', papel: 'otra cosa' as never })).toBe('competicion')
  })
})

describe('levantamientoDe', () => {
  it('devuelve el levantamiento por el nombre', () => {
    expect(levantamientoDe('Sentadilla con pausa')).toBe('sentadilla')
    expect(levantamientoDe('Curl')).toBeNull()
  })
})

describe('trabajoDeSeries', () => {
  it('cuenta series y repeticiones hechas, sin calentamiento ni series vacías', () => {
    expect(trabajoDeSeries([
      { weight: '60', reps: '5', tipo: 'calentamiento' },
      { weight: '100', reps: '5' },
      { weight: '100', reps: '4' },
      { weight: '', reps: '' },
    ])).toEqual({ series: 2, reps: 9 })
  })
  it('una serie con peso pero sin repeticiones apuntadas cuenta como serie', () => {
    expect(trabajoDeSeries([{ weight: '120' }])).toEqual({ series: 1, reps: 0 })
  })
})

describe('trabajo de la semana', () => {
  it('reparte las series por levantamiento y papel, y deja los accesorios aparte', () => {
    const s = semanaVacia()
    sumarTrabajo(s, { name: 'Sentadilla' }, 4, 10)
    sumarTrabajo(s, { name: 'Sentadilla con pausa' }, 3, 9)
    sumarTrabajo(s, { name: 'Press banca' }, 5, 13)
    sumarTrabajo(s, { name: 'Prensa de piernas' }, 3, 30)
    expect(s.porLevantamiento.sentadilla.competicion).toEqual({ series: 4, reps: 10 })
    expect(s.porLevantamiento.sentadilla.variante).toEqual({ series: 3, reps: 9 })
    expect(s.porLevantamiento.banca.competicion).toEqual({ series: 5, reps: 13 })
    expect(s.porLevantamiento.peso_muerto.competicion).toEqual({ series: 0, reps: 0 })
    expect(s.accesorio).toEqual({ series: 3, reps: 30 })
  })

  it('una variante marcada sobre un ejercicio sin levantamiento va a accesorios para no perderla', () => {
    const s = semanaVacia()
    sumarTrabajo(s, { name: 'Press militar', papel: 'variante' }, 3, 24)
    expect(s.accesorio).toEqual({ series: 3, reps: 24 })
    expect(totalesPorPapel(s).variante.series).toBe(0)
  })

  it('no suma series vacías y los totales por papel cuadran', () => {
    const s = semanaVacia()
    sumarTrabajo(s, { name: 'Peso muerto' }, 0, 0)
    sumarTrabajo(s, { name: 'Peso muerto' }, 3, 6)
    sumarTrabajo(s, { name: 'Rack pull' }, 2, 6)
    sumarTrabajo(s, { name: 'Remo' }, 4, 40)
    const t = totalesPorPapel(s)
    expect(t.competicion).toEqual({ series: 3, reps: 6 })
    expect(t.variante).toEqual({ series: 2, reps: 6 })
    expect(t.accesorio).toEqual({ series: 4, reps: 40 })
  })
})
