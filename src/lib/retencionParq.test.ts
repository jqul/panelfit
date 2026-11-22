import { describe, expect, it } from 'vitest'
import { GRAVEDAD_PARQ, PARQ_INDICES_ACLARAR, PARQ_INDICES_ALARMA, PARQ_INDICES_REVISAR, PARQ_QUESTIONS, TEXTO_NIVEL_PARQ, nivelParq, nivelParqGuardado, respuestasDeAdmision } from './intakeQuestions'
import { PARQ_ALARMA_INDICES } from './solicitudProgramacion'
import { estadoParq, type FilaAdmision } from './retencionParq'
import { borrarPendientes, claveBasicosPendientes, guardarPendientes, leerPendientes, type AlmacenLocal } from './datosBasicosPendientes'

const si = (...idx: number[]) => Object.fromEntries(PARQ_QUESTIONS.map((_, i) => [i, idx.includes(i)])) as Record<number, boolean>
const admision = (idx: number[], createdAt = 1000): FilaAdmision => ({ tipo: 'intake', createdAt, respuestas: respuestasDeAdmision(si(...idx), {}) })
const revisado = (createdAt: number): FilaAdmision => ({ tipo: 'parq_revisado', createdAt, respuestas: [] })

describe('niveles del cuestionario de salud: no todos los «sí» pesan igual', () => {
  it('alarma: cardíaco, dolor en el pecho (esfuerzo y reposo) y mareo; es lo mismo que ya paraba el borrador de la solicitud pública', () => {
    expect(PARQ_INDICES_ALARMA).toEqual(PARQ_ALARMA_INDICES)
    for (const i of PARQ_INDICES_ALARMA) expect(nivelParq(si(i)), String(i)).toBe('alarma')
  })
  it('revisar: problema articular y medicación; aclarar: otra razón', () => {
    for (const i of PARQ_INDICES_REVISAR) expect(nivelParq(si(i)), String(i)).toBe('revisar')
    for (const i of PARQ_INDICES_ACLARAR) expect(nivelParq(si(i)), String(i)).toBe('aclarar')
  })
  it('sin ningún «sí» (o sin contestar) no hay nivel; con varios manda el más grave', () => {
    expect(nivelParq(si())).toBe('ninguno')
    expect(nivelParq({})).toBe('ninguno')
    expect(nivelParq(si(6, 4))).toBe('revisar')
    expect(nivelParq(si(6, 4, 1))).toBe('alarma')
  })
  it('cubre las siete preguntas, sin solaparse', () => {
    const todas = [...PARQ_INDICES_ALARMA, ...PARQ_INDICES_REVISAR, ...PARQ_INDICES_ACLARAR].sort()
    expect(todas).toEqual(PARQ_QUESTIONS.map((_, i) => i))
  })
  it('lo guardado en la ficha da el mismo nivel que lo contestado', () => {
    for (let i = 0; i < PARQ_QUESTIONS.length; i++) expect(nivelParqGuardado(respuestasDeAdmision(si(i), {})), String(i)).toBe(nivelParq(si(i)))
    expect(nivelParqGuardado(null)).toBe('ninguno')
    expect(nivelParqGuardado([])).toBe('ninguno')
  })
  it('un «Sí» en una respuesta libre no cuenta (solo las siete del PAR-Q)', () => {
    expect(nivelParqGuardado([{ pregunta: 'Lesiones o condiciones médicas relevantes', respuesta: 'Sí' }])).toBe('ninguno')
  })
  it('los textos no diagnostican: hablan de valoración y de revisar, no de enfermedades', () => {
    for (const t of Object.values(TEXTO_NIVEL_PARQ)) expect(t).not.toMatch(/infarto|cardiopat|enfermedad|diagn[oó]stic/i)
    expect(GRAVEDAD_PARQ.alarma).toBeGreaterThan(GRAVEDAD_PARQ.revisar)
    expect(GRAVEDAD_PARQ.revisar).toBeGreaterThan(GRAVEDAD_PARQ.aclarar)
  })
})

describe('estadoParq: qué hay que mirar y qué queda en espera', () => {
  it('sin ficha de admisión no hay nada que retener ni revisar', () => {
    for (const filas of [null, undefined, [], [revisado(5)]]) expect(estadoParq(filas)).toMatchObject({ nivel: 'ninguno', retenido: false, pendienteDeRevisar: false, admisionEn: null })
  })
  it('alarma sin revisar: retiene el cuestionario de programación y pide revisión', () => {
    expect(estadoParq([admision([1])])).toMatchObject({ nivel: 'alarma', retenido: true, pendienteDeRevisar: true, revisado: false })
  })
  it('revisar o aclarar sin revisar: piden revisión pero NO retienen', () => {
    expect(estadoParq([admision([4])])).toMatchObject({ nivel: 'revisar', retenido: false, pendienteDeRevisar: true })
    expect(estadoParq([admision([6])])).toMatchObject({ nivel: 'aclarar', retenido: false, pendienteDeRevisar: true })
  })
  it('sin ningún «sí»: nada', () => {
    expect(estadoParq([admision([])])).toMatchObject({ nivel: 'ninguno', retenido: false, pendienteDeRevisar: false })
  })
  it('al revisarla, deja de retener y de pedir revisión', () => {
    expect(estadoParq([admision([1], 1000), revisado(2000)])).toMatchObject({ nivel: 'alarma', revisado: true, revisadoEn: 2000, retenido: false, pendienteDeRevisar: false })
    expect(estadoParq([revisado(2000), admision([1], 1000)])).toMatchObject({ retenido: false }) // el orden de las filas da igual
  })
  it('una revisión anterior a la ficha no vale: si vuelve a rellenarla, hay que volver a revisarla', () => {
    expect(estadoParq([admision([1], 3000), revisado(2000)])).toMatchObject({ revisado: false, retenido: true })
    expect(estadoParq([admision([], 1000), admision([1], 3000), revisado(2000)])).toMatchObject({ nivel: 'alarma', retenido: true, admisionEn: 3000 })
  })
  it('las fechas pueden llegar como texto y las filas raras no rompen nada', () => {
    expect(estadoParq([{ ...admision([1]), createdAt: '1000' }, { tipo: 'parq_revisado', createdAt: '2000' }])).toMatchObject({ retenido: false })
    expect(() => estadoParq([null as never, { tipo: 'intake', createdAt: null, respuestas: null }, { tipo: 'x', createdAt: 'no' }])).not.toThrow()
  })
})

describe('datos básicos pendientes de guardar', () => {
  const almacen = (): AlmacenLocal & { datos: Record<string, string> } => {
    const datos: Record<string, string> = {}
    return { datos, getItem: k => datos[k] ?? null, setItem: (k, v) => { datos[k] = v }, removeItem: k => { delete datos[k] } }
  }
  const v = { genero: 'm' as const, nacimiento: '1995-03-10', altura: 168.5, peso: 64.2 }

  it('se guardan por cliente, se leen y se borran', () => {
    const a = almacen()
    expect(leerPendientes(a, 'c1')).toBeNull()
    expect(guardarPendientes(a, 'c1', v)).toBe(true)
    expect(leerPendientes(a, 'c1')).toEqual(v)
    expect(leerPendientes(a, 'c2')).toBeNull()
    borrarPendientes(a, 'c1')
    expect(leerPendientes(a, 'c1')).toBeNull()
  })
  it('lo corrupto o raro no se reintenta', () => {
    const a = almacen()
    for (const raro of ['no es json', '{}', '[]', 'null', '{"genero":"x","nacimiento":"a","altura":1,"peso":1}', '{"genero":null,"nacimiento":3,"altura":1,"peso":1}']) {
      a.datos[claveBasicosPendientes('c1')] = raro
      expect(leerPendientes(a, 'c1'), raro).toBeNull()
    }
  })
  it('sin almacenamiento disponible no lanza', () => {
    const roto: AlmacenLocal = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') }, removeItem: () => { throw new Error('x') } }
    expect(guardarPendientes(roto, 'c1', v)).toBe(false)
    expect(leerPendientes(roto, 'c1')).toBeNull()
    expect(() => borrarPendientes(roto, 'c1')).not.toThrow()
  })
})
