import { describe, expect, it } from 'vitest'
import { ETIQUETA_COACH_IA, OBJETIVO_DE_SOLICITUD, datosClienteDeSolicitud, esEtiquetaCoachIa, listaRellenados } from './clienteDeSolicitud'
import { MODELO_PROGRAMACION_INICIAL } from './modelosEncuesta'

const sol = (respuestas: Record<string, unknown>, consentimiento_salud = true) => ({ consentimiento_salud, respuestas })

describe('datosClienteDeSolicitud: qué se rellena al convertir una solicitud en cliente', () => {
  it('objetivo, altura y peso; y la edad solo como pista', () => {
    const d = datosClienteDeSolicitud(sol({ objetivo: 'Ganar músculo', altura: 178, peso: 78.5, edad: 29 }))
    expect(d.campos).toEqual({ objetivo: 'hipertrofia', altura: '178', peso: '78.5' })
    expect(d.rellenados).toEqual(['objetivo', 'altura', 'peso'])
    expect(d.edad).toBe(29)
  })

  it('todas las opciones de objetivo del cuestionario tienen traducción, y a un objetivo que existe en la ficha', () => {
    const opciones = MODELO_PROGRAMACION_INICIAL.questions.find(q => q.id === 'objetivo')!.options!
    for (const o of opciones) expect(OBJETIVO_DE_SOLICITUD[o], o).toBeTruthy()
    const validos = ['hipertrofia', 'fuerza', 'perdida_grasa', 'resistencia', 'rehabilitacion', 'rendimiento', 'general']
    for (const v of Object.values(OBJETIVO_DE_SOLICITUD)) expect(validos).toContain(v)
  })

  it('sin consentimiento de salud no pasa ni altura, ni peso, ni edad (pero el objetivo sí: no es de salud)', () => {
    const d = datosClienteDeSolicitud(sol({ objetivo: 'Perder grasa', altura: 170, peso: 70, edad: 30 }, false))
    expect(d.campos).toEqual({ objetivo: 'perdida_grasa' })
    expect(d.edad).toBeNull()
  })

  it('no inventa: lo que no está, no se rellena; y no se toca el género ni la fecha de nacimiento', () => {
    expect(datosClienteDeSolicitud(sol({}))).toEqual({ campos: {}, rellenados: [], edad: null })
    const d = datosClienteDeSolicitud(sol({ objetivo: 'Ganar fuerza', genero: 'h', fechanacimiento: '1990-01-01', fecha_nacimiento: '1990-01-01' }))
    expect(Object.keys(d.campos)).toEqual(['objetivo'])
  })

  it('valores fuera de rango, no numéricos o raros se ignoran', () => {
    const d = datosClienteDeSolicitud(sol({ objetivo: 'inventado', altura: 20, peso: 9999, edad: 12 }))
    expect(d).toEqual({ campos: {}, rellenados: [], edad: null })
    expect(datosClienteDeSolicitud(sol({ altura: 'alto', peso: '', edad: null }))).toEqual({ campos: {}, rellenados: [], edad: null })
  })

  it('acepta números como texto (con coma) y redondea a un decimal', () => {
    expect(datosClienteDeSolicitud(sol({ altura: '178,4', peso: '78.54' })).campos).toEqual({ altura: '178.4', peso: '78.5' })
  })

  it('nunca lanza con formas raras', () => {
    for (const raro of [null, undefined, {}, { respuestas: null }, { respuestas: 'x' }, { consentimiento_salud: true, respuestas: [] }]) {
      expect(() => datosClienteDeSolicitud(raro as never)).not.toThrow()
    }
  })

  it('no pasa nada más: ni molestias, ni sueño, ni estrés, ni lo que prefiere evitar', () => {
    const d = datosClienteDeSolicitud(sol({ objetivo: 'Ganar músculo', molestias: true, molestias_detalle: 'Hombro', rechaza: 'Dominadas', sueno: 5, estres: 8, fase: 'Déficit' }))
    expect(JSON.stringify(d)).not.toMatch(/Hombro|Dominadas|sueno|estres|fase|Déficit/)
  })
})

describe('lista de lo rellenado y etiqueta de Coach IA', () => {
  it('lo dice en claro', () => {
    expect(listaRellenados(['objetivo', 'altura', 'peso'])).toBe('objetivo, altura y peso')
    expect(listaRellenados(['objetivo', 'altura'])).toBe('objetivo y altura')
    expect(listaRellenados(['objetivo'])).toBe('objetivo')
    expect(listaRellenados([])).toBe('')
  })
  it('la etiqueta se reconoce por nombre, sin mayúsculas ni espacios de más', () => {
    for (const n of ['Coach IA', 'coach ia', '  COACH   IA ']) expect(esEtiquetaCoachIa(n)).toBe(true)
    for (const n of ['Coach', 'IA', 'Coach IA 2', 'Powerlifting']) expect(esEtiquetaCoachIa(n)).toBe(false)
    expect(esEtiquetaCoachIa(ETIQUETA_COACH_IA.name)).toBe(true)
  })
})
