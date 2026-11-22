import { describe, expect, it } from 'vitest'
import { GRAVEDAD_PARQ, PARQ_INDICES_ACLARAR, PARQ_INDICES_ALARMA, PARQ_INDICES_REVISAR, PARQ_QUESTIONS, TEXTO_NIVEL_PARQ, nivelParq, nivelParqGuardado, respuestasDeAdmision } from './intakeQuestions'
import { PARQ_ALARMA_INDICES } from './solicitudProgramacion'
import { estadoParq, respuestasDeRevision, type FilaAdmision } from './retencionParq'
import { DIAS_PENDIENTES, borrarPendientes, claveBasicosPendientes, guardarPendientes, leerPendientes, type AlmacenLocal } from './datosBasicosPendientes'

const si = (...idx: number[]) => Object.fromEntries(PARQ_QUESTIONS.map((_, i) => [i, idx.includes(i)])) as Record<number, boolean>
// La huella la pone el SERVIDOR (SHA-256, checkins.huella): aquí solo se prueba cómo se comparan, así que basta una huella de mentira que dependa del contenido.
// Que el servidor la calcule bien (normalización, reordenaciones, nulos, equivalentes) lo prueban los vectores de huella_vectores.json (PGlite y e2e/huella-servidor).
const huellaDe = (respuestas: FilaAdmision['respuestas']) => 'h:' + JSON.stringify(respuestas)
let n = 0
const admision = (idx: number[], createdAt = 1000): FilaAdmision => { const respuestas = respuestasDeAdmision(si(...idx), {}); return { id: `i${++n}`, tipo: 'intake', createdAt, respuestas, huella: huellaDe(respuestas) } }
// La revisión del entrenador: indica la ficha que leyó y el servidor le pone la huella que esa ficha tenía entonces
const revisado = (de: FilaAdmision, createdAt: number): FilaAdmision => ({ id: `r${++n}`, tipo: 'parq_revisado', createdAt, respuestas: respuestasDeRevision(de.id as string), huella: de.huella })

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
    for (const filas of [null, undefined, [], [revisado(admision([1]), 5)]]) expect(estadoParq(filas)).toMatchObject({ nivel: 'ninguno', retenido: false, pendienteDeRevisar: false, admisionEn: null, admisionId: null, huella: null })
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
    const a = admision([1], 1000)
    expect(estadoParq([a, revisado(a, 2000)])).toMatchObject({ nivel: 'alarma', revisado: true, revisadoEn: 2000, retenido: false, pendienteDeRevisar: false })
    expect(estadoParq([revisado(a, 2000), a])).toMatchObject({ retenido: false }) // el orden de las filas da igual
  })

  // La secuencia pedida en la revisión del PR: la revisión queda atada al CONTENIDO que se revisó
  it('SECUENCIA: alarma → revisada → el cliente cambia sus respuestas → vuelve a pendiente → la revisión anterior no vale para las nuevas', () => {
    // 1. El cliente responde que sí a una pregunta de alarma
    const primera = admision([1], 1000)
    expect(estadoParq([primera])).toMatchObject({ nivel: 'alarma', revisado: false, pendienteDeRevisar: true, retenido: true })
    // 2. El entrenador la marca como revisada
    const revision = revisado(primera, 2000)
    expect(estadoParq([primera, revision])).toMatchObject({ revisado: true, pendienteDeRevisar: false, retenido: false })
    // 3. El cliente vuelve a modificar sus respuestas (otra ficha, posterior, con un «sí» más)
    const segunda = admision([1, 4], 3000)
    // 4. La admisión vuelve a aparecer como pendiente…
    const despues = estadoParq([primera, revision, segunda])
    expect(despues).toMatchObject({ nivel: 'alarma', revisado: false, revisadoEn: null, pendienteDeRevisar: true, retenido: true, admisionEn: 3000 })
    // 5. …y la revisión anterior no sirve para las nuevas respuestas (ni siquiera si su fecha fuese posterior a la ficha nueva)
    expect(segunda.huella).not.toBe(primera.huella)
    expect(estadoParq([primera, segunda, { ...revision, createdAt: 9000 }])).toMatchObject({ revisado: false, retenido: true })
  })
  it('la misma ficha reenviada (misma huella) sigue valiendo lo revisado; otra huella, no', () => {
    const a = admision([1], 1000)
    const igual: FilaAdmision = { ...admision([1], 5000), huella: a.huella } // el servidor da la misma huella al mismo contenido
    expect(estadoParq([a, revisado(a, 2000), igual])).toMatchObject({ revisado: true, retenido: false, admisionId: igual.id })
    const otra: FilaAdmision = { ...igual, huella: 'h:otra' }
    expect(estadoParq([a, revisado(a, 2000), otra])).toMatchObject({ revisado: false, retenido: true })
  })
  it('una revisión sin huella, con otra o mal formada no cuenta nunca', () => {
    const a = admision([1], 1000)
    const base = { tipo: 'parq_revisado', createdAt: 9000, respuestas: respuestasDeRevision(a.id as string) }
    for (const huella of [undefined, null, '', 'h:otra']) {
      expect(estadoParq([a, { ...base, huella }]), String(huella)).toMatchObject({ revisado: false, retenido: true })
    }
    // Ni siquiera con lo que parezca una huella dentro de las respuestas: solo vale la columna que pone el servidor
    expect(estadoParq([a, { ...base, huella: null, respuestas: [{ pregunta: 'huella', respuesta: a.huella as string }] }])).toMatchObject({ revisado: false })
  })
  it('una ficha SIN huella (migración sin aplicar, o fila antigua) nunca cuenta como revisada: cierra por el lado seguro', () => {
    const sin: FilaAdmision = { ...admision([1], 1000), huella: undefined }
    expect(estadoParq([sin, { tipo: 'parq_revisado', createdAt: 2000, respuestas: respuestasDeRevision(sin.id as string), huella: undefined }])).toMatchObject({ huella: null, revisado: false, retenido: true, pendienteDeRevisar: true })
    expect(estadoParq([{ ...sin, huella: null }, { tipo: 'parq_revisado', createdAt: 2000, huella: null }])).toMatchObject({ revisado: false, retenido: true })
  })
  it('lo que se manda al revisar es solo el id de la ficha: la app no calcula ni envía ninguna huella', () => {
    expect(respuestasDeRevision('abc')).toEqual([{ pregunta: 'admision', respuesta: 'abc' }])
  })
  it('las fechas pueden llegar como texto y las filas raras no rompen nada', () => {
    const a = { ...admision([1]), createdAt: '1000' }
    expect(estadoParq([a, { ...revisado(a, 0), createdAt: '2000' }])).toMatchObject({ retenido: false, revisadoEn: 2000 })
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
  it('caducan a los 7 días (DIAS_PENDIENTES): se borran solos y no se reintentan; antes de eso siguen ahí', () => {
    const a = almacen()
    const t0 = 1_700_000_000_000
    const dia = 24 * 60 * 60 * 1000
    expect(DIAS_PENDIENTES).toBe(7)
    guardarPendientes(a, 'c1', v, t0)
    expect(leerPendientes(a, 'c1', t0 + 1000)).toEqual(v)
    expect(leerPendientes(a, 'c1', t0 + (DIAS_PENDIENTES - 1) * dia)).toEqual(v)
    expect(leerPendientes(a, 'c1', t0 + DIAS_PENDIENTES * dia + 1)).toBeNull()
    expect(a.datos[claveBasicosPendientes('c1')]).toBeUndefined() // y no queda nada en el dispositivo
  })
  it('lo guardado sin fecha, o con una fecha imposible, no se conserva', () => {
    const a = almacen()
    a.datos[claveBasicosPendientes('c1')] = JSON.stringify(v) // formato sin fecha
    expect(leerPendientes(a, 'c1')).toBeNull()
    expect(a.datos[claveBasicosPendientes('c1')]).toBeUndefined()
    a.datos[claveBasicosPendientes('c1')] = JSON.stringify({ ...v, guardadoEn: Date.now() + 400 * 24 * 60 * 60 * 1000 })
    expect(leerPendientes(a, 'c1')).toBeNull()
  })
  it('leer no consume: un reintento fallido no borra nada, solo borrarPendientes (tras guardarse) lo quita', () => {
    const a = almacen()
    guardarPendientes(a, 'c1', v)
    for (let i = 0; i < 3; i++) expect(leerPendientes(a, 'c1')).toEqual(v)
    borrarPendientes(a, 'c1')
    expect(a.datos[claveBasicosPendientes('c1')]).toBeUndefined()
  })
  it('sin almacenamiento disponible no lanza', () => {
    const roto: AlmacenLocal = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') }, removeItem: () => { throw new Error('x') } }
    expect(guardarPendientes(roto, 'c1', v)).toBe(false)
    expect(leerPendientes(roto, 'c1')).toBeNull()
    expect(() => borrarPendientes(roto, 'c1')).not.toThrow()
  })
})
