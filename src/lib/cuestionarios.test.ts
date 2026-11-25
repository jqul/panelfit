import { describe, it, expect } from 'vitest'
import { TIPOS, nuevaPregunta, respondida, faltan, visibles, incoherentes, respuestasActivas, respuestasSinPregunta, textoSuelto, PREGUNTAS_RETIRADAS, textoRespuesta, hojaImprimible, type Pregunta } from './cuestionarios'
import { summarizeSurvey } from './surveyResults'

describe('tipos de pregunta', () => {
  it('hay 8 tipos, y solo los de opciones nacen con opciones', () => {
    expect(TIPOS).toHaveLength(8)
    expect(nuevaPregunta('multi', 'x').options).toEqual(['Opción A', 'Opción B'])
    expect(nuevaPregunta('choice', 'x').options).toHaveLength(2)
    expect(nuevaPregunta('number', 'x').options).toBeUndefined()
  })

  it('cuenta como respondido el 0 y el "No"; no lo vacío ni una lista sin marcar', () => {
    expect(respondida(0)).toBe(true)
    expect(respondida(false)).toBe(true)
    expect(respondida('')).toBe(false)
    expect(respondida([])).toBe(false)
    expect(respondida(['A'])).toBe(true)
    expect(respondida(undefined)).toBe(false)
  })

  it('dice qué obligatorias faltan, en orden', () => {
    const ps: Pregunta[] = [
      { id: 'a', type: 'scale', label: 'A', required: true },
      { id: 'b', type: 'text', label: 'B' },
      { id: 'c', type: 'multi', label: 'C', required: true, options: ['x'] },
    ]
    expect(faltan(ps, {}).map(p => p.id)).toEqual(['a', 'c'])
    expect(faltan(ps, { a: 3, c: ['x'] })).toEqual([])
  })

  it('convierte cada respuesta en texto legible', () => {
    expect(textoRespuesta({ id: 'q', type: 'yesno', label: '' }, false)).toBe('No')
    expect(textoRespuesta({ id: 'q', type: 'scale', label: '' }, 7)).toBe('7 / 10')
    expect(textoRespuesta({ id: 'q', type: 'number', label: '', unit: 'kg' }, 72.5)).toBe('72,5 kg')
    expect(textoRespuesta({ id: 'q', type: 'multi', label: '' }, ['Dormir', 'Dieta'])).toBe('Dormir, Dieta')
    expect(textoRespuesta({ id: 'q', type: 'date', label: '' }, '2026-10-28')).toBe('28 de octubre de 2026')
    expect(textoRespuesta({ id: 'q', type: 'short', label: '' }, '')).toBe('—')
  })
})

describe('preguntas de seguimiento (mostrarSi)', () => {
  // «¿Tienes alguna molestia?» (Sí/No, obligatoria) → solo si Sí: «¿dónde y desde cuándo?» (obligatoria aquí, para probar que una escondida no se exige)
  const ps: Pregunta[] = [
    { id: 'nombre', type: 'short', label: 'Nombre', required: true },
    { id: 'molestias', type: 'yesno', label: '¿Tienes alguna molestia?', required: true },
    { id: 'detalle', type: 'text', label: '¿Dónde y desde cuándo?', required: true, mostrarSi: { id: 'molestias', es: true } },
    { id: 'otra', type: 'text', label: 'Otra cosa' },
  ]
  const ids = (qs: Pregunta[]) => qs.map(q => q.id)

  it('con «Sí» aparece el seguimiento, justo donde está en el cuestionario', () => {
    expect(ids(visibles(ps, { molestias: true }))).toEqual(['nombre', 'molestias', 'detalle', 'otra'])
  })

  it('con «No» NO aparece, y tampoco mientras no se contesta', () => {
    expect(ids(visibles(ps, { molestias: false }))).toEqual(['nombre', 'molestias', 'otra'])
    expect(ids(visibles(ps, {}))).toEqual(['nombre', 'molestias', 'otra'])
  })

  it('entiende el Sí/No como se guarda: true/false, «true»/«false» y «Sí»/«No»', () => {
    expect(visibles(ps, { molestias: 'Sí' })).toHaveLength(4)
    expect(visibles(ps, { molestias: 'true' })).toHaveLength(4)
    expect(visibles(ps, { molestias: 'No' })).toHaveLength(3)
    expect(visibles(ps, { molestias: 'false' })).toHaveLength(3)
    expect(visibles(ps, { molestias: 'quizá' })).toHaveLength(3) // algo que no es Sí ni No no la enseña
  })

  it('una obligatoria escondida no se exige; en cuanto aparece, sí', () => {
    expect(ids(faltan(ps, { nombre: 'Ana', molestias: false }))).toEqual([])
    expect(ids(faltan(ps, { nombre: 'Ana', molestias: true }))).toEqual(['detalle'])
    expect(ids(faltan(ps, { nombre: 'Ana', molestias: true, detalle: 'Hombro, hace dos semanas' }))).toEqual([])
    expect(ids(faltan(ps, {}))).toEqual(['nombre', 'molestias'])
  })

  it('de «Sí» a «No»: lo que se escribió en el seguimiento deja de contar y no se envía', () => {
    const escrito = { nombre: 'Ana', molestias: true, detalle: 'Hombro, hace dos semanas' }
    expect(respuestasActivas(ps, escrito)).toEqual(escrito)
    // Cambia de idea: contesta «No». El texto sigue en el borrador, pero no es una respuesta válida
    expect(respuestasActivas(ps, { ...escrito, molestias: false })).toEqual({ nombre: 'Ana', molestias: false })
    expect(ids(faltan(ps, { ...escrito, molestias: false }))).toEqual([])
    // Y si vuelve a «Sí», el texto reaparece y cuenta otra vez
    expect(respuestasActivas(ps, { ...escrito, molestias: true })).toEqual(escrito)
  })

  it('al enviar solo van las contestadas (0 y «No» cuentan), las vacías no', () => {
    expect(respuestasActivas(ps, { nombre: 'Ana', molestias: false, otra: '' })).toEqual({ nombre: 'Ana', molestias: false })
    expect(respuestasActivas(ps, { nombre: '', molestias: true, detalle: 'x' })).toEqual({ molestias: true, detalle: 'x' })
  })

  it('lo que no corresponde a ninguna pregunta del cuestionario se conserva como hasta ahora', () => {
    expect(respuestasActivas(ps, { nombre: 'Ana', molestias: false, suelta: 'dato' })).toEqual({ nombre: 'Ana', molestias: false, suelta: 'dato' })
  })

  it('se encadena: una pregunta que depende de un seguimiento escondido también se esconde', () => {
    const cadena: Pregunta[] = [
      { id: 'a', type: 'yesno', label: 'A' },
      { id: 'b', type: 'yesno', label: 'B', mostrarSi: { id: 'a', es: true } },
      { id: 'c', type: 'text', label: 'C', required: true, mostrarSi: { id: 'b', es: true } },
    ]
    expect(ids(visibles(cadena, { a: false, b: true }))).toEqual(['a']) // b escondida: su «Sí» antiguo no cuenta
    expect(ids(visibles(cadena, { a: true, b: false }))).toEqual(['a', 'b'])
    expect(ids(visibles(cadena, { a: true, b: true }))).toEqual(['a', 'b', 'c'])
    expect(ids(faltan(cadena, { a: false, b: true }))).toEqual([])
  })

  it('una condición también puede esperar un «No»', () => {
    const inversa: Pregunta[] = [
      { id: 'a', type: 'yesno', label: 'A' },
      { id: 'b', type: 'text', label: '¿Por qué no?', mostrarSi: { id: 'a', es: false } },
    ]
    expect(ids(visibles(inversa, { a: false }))).toEqual(['a', 'b'])
    expect(ids(visibles(inversa, { a: true }))).toEqual(['a'])
  })

  it('referencias rotas: si la pregunta de la que depende no existe o no es Sí/No, no se esconde nada', () => {
    const rotas: Pregunta[] = [
      { id: 'texto', type: 'short', label: 'Texto' },
      { id: 'x', type: 'text', label: 'X', mostrarSi: { id: 'no-existe', es: true } },
      { id: 'y', type: 'text', label: 'Y', mostrarSi: { id: 'texto', es: true } },
      { id: 'z', type: 'text', label: 'Z', mostrarSi: { id: 'z', es: true } },
    ]
    expect(ids(visibles(rotas, {}))).toEqual(['texto', 'x', 'y', 'z'])
  })

  it('dos condiciones que se citan entre sí no cuelgan nada ni esconden nada', () => {
    const ciclo: Pregunta[] = [
      { id: 'a', type: 'yesno', label: 'A', mostrarSi: { id: 'b', es: true } },
      { id: 'b', type: 'yesno', label: 'B', mostrarSi: { id: 'a', es: true } },
    ]
    expect(ids(visibles(ciclo, {}))).toEqual(['a', 'b'])
  })

  it('un cuestionario sin condiciones (como todos los de antes) se comporta exactamente igual', () => {
    const antiguo: Pregunta[] = [
      { id: 'molestias', type: 'yesno', label: '¿Molestias?', required: true },
      { id: 'molestias_detalle', type: 'text', label: 'Si has contestado que sí: ¿dónde?' },
    ]
    expect(ids(visibles(antiguo, {}))).toEqual(['molestias', 'molestias_detalle'])
    expect(ids(visibles(antiguo, { molestias: false }))).toEqual(['molestias', 'molestias_detalle'])
    expect(respuestasActivas(antiguo, { molestias: false, molestias_detalle: 'ya lo escribió' })).toEqual({ molestias: false, molestias_detalle: 'ya lo escribió' })
    expect(ids(faltan(antiguo, {}))).toEqual(['molestias'])
  })
})

describe('regla entre dos preguntas (noMenorQue)', () => {
  // La franja de días: el máximo no puede ser menor que el mínimo (las dos de elección entre '1' y '7', que se guardan como texto)
  const dias = ['1', '2', '3', '4', '5', '6', '7']
  const franja: Pregunta[] = [
    { id: 'min', type: 'choice', label: 'Mínimo de días', required: true, options: dias },
    { id: 'max', type: 'choice', label: 'Máximo de días', required: true, options: dias, noMenorQue: { id: 'min', mensaje: 'El máximo no puede ser menor que el mínimo' } },
  ]
  const ids = (xs: { pregunta: Pregunta }[]) => xs.map(x => x.pregunta.id)

  it('máximo menor que el mínimo: incoherente, con su mensaje', () => {
    const r = incoherentes(franja, { min: '4', max: '3' })
    expect(ids(r)).toEqual(['max'])
    expect(r[0].mensaje).toBe('El máximo no puede ser menor que el mínimo')
  })

  it('máximo igual o mayor que el mínimo: coherente (también en los extremos 1 y 7)', () => {
    for (const [min, max] of [['3', '3'], ['3', '4'], ['1', '7'], ['1', '1'], ['7', '7'], ['2', '7']]) expect(incoherentes(franja, { min, max }), `${min}-${max}`).toEqual([])
  })

  it('compara como NÚMEROS, no como texto («10» no es menor que «9»)', () => {
    const amplia: Pregunta[] = [
      { id: 'a', type: 'choice', label: 'A', options: ['9', '10'] },
      { id: 'b', type: 'choice', label: 'B', options: ['9', '10'], noMenorQue: { id: 'a', mensaje: 'no' } },
    ]
    expect(incoherentes(amplia, { a: '9', b: '10' })).toEqual([])
    expect(ids(incoherentes(amplia, { a: '10', b: '9' }))).toEqual(['b'])
  })

  it('con una sin contestar no hay incoherencia (eso lo pide faltan), y números de verdad o con coma también valen', () => {
    expect(incoherentes(franja, {})).toEqual([])
    expect(incoherentes(franja, { min: '5' })).toEqual([])
    expect(incoherentes(franja, { max: '2' })).toEqual([])
    expect(faltan(franja, { min: '5' }).map(p => p.id)).toEqual(['max'])
    const numeros: Pregunta[] = [{ id: 'a', type: 'number', label: 'A' }, { id: 'b', type: 'number', label: 'B', noMenorQue: { id: 'a', mensaje: 'no' } }]
    expect(ids(incoherentes(numeros, { a: 5, b: 3 }))).toEqual(['b'])
    expect(ids(incoherentes(numeros, { a: '5,5', b: '5,4' }))).toEqual(['b'])
    expect(incoherentes(numeros, { a: 0, b: 0 })).toEqual([])
  })

  it('una respuesta que no es un número no se compara (no inventa un error)', () => {
    expect(incoherentes(franja, { min: 'muchos', max: '2' })).toEqual([])
    expect(incoherentes(franja, { min: true, max: '2' })).toEqual([])
    expect(incoherentes(franja, { min: '4', max: [] })).toEqual([])
  })

  it('si la pregunta de la que depende no existe o no se ve, la regla no se aplica', () => {
    const rota: Pregunta[] = [{ id: 'max', type: 'choice', label: 'Máx', options: dias, noMenorQue: { id: 'no-existe', mensaje: 'x' } }]
    expect(incoherentes(rota, { max: '1' })).toEqual([])
    const escondida: Pregunta[] = [
      { id: 'sino', type: 'yesno', label: '¿Entrenas?' },
      { id: 'min', type: 'choice', label: 'Mín', options: dias, mostrarSi: { id: 'sino', es: true } },
      { id: 'max', type: 'choice', label: 'Máx', options: dias, noMenorQue: { id: 'min', mensaje: 'x' } },
    ]
    expect(incoherentes(escondida, { sino: false, min: '6', max: '2' })).toEqual([]) // el mínimo está escondido: no cuenta
    expect(ids(incoherentes(escondida, { sino: true, min: '6', max: '2' }))).toEqual(['max'])
  })

  it('un cuestionario sin reglas (como todos los de antes) no tiene nunca incoherencias', () => {
    expect(incoherentes([{ id: 'a', type: 'choice', label: 'A', options: ['1', '2'] }, { id: 'b', type: 'choice', label: 'B', options: ['1', '2'] }], { a: '2', b: '1' })).toEqual([])
  })
})

describe('hoja para imprimir', () => {
  const ps: Pregunta[] = [{ id: 'q1', type: 'short', label: 'Objetivo' }, { id: 'q2', type: 'yesno', label: '¿Lesión?' }]

  it('lleva título, cliente y cada pregunta con su respuesta', () => {
    const html = hojaImprimible('Cuestionario inicial', ps, [{ cliente: 'Ana Ruiz', fecha: Date.UTC(2026, 9, 28, 10), answers: { q1: 'Correr 10K', q2: true } }])
    expect(html).toContain('<title>Cuestionario inicial</title>')
    expect(html).toContain('<h2>Ana Ruiz</h2>')
    expect(html).toContain('<dt>Objetivo</dt><dd>Correr 10K</dd>')
    expect(html).toContain('<dt>¿Lesión?</dt><dd>Sí</dd>')
  })

  it('escapa lo que escribe la gente (no se puede colar HTML)', () => {
    const html = hojaImprimible('<b>x</b>', ps, [{ cliente: '<img src=x onerror=alert(1)>', fecha: 0, answers: { q1: '</dd><script>alert(1)</script>' } }])
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('respuestas de preguntas que ya no están en la plantilla', () => {
  const ps: Pregunta[] = [{ id: 'dias_min', type: 'choice', label: 'Mínimo', options: ['1', '2'] }, { id: 'obj', type: 'short', label: 'Objetivo' }]

  it('devuelve las contestadas que no tienen pregunta, con su enunciado de entonces si se conoce y si no con su clave', () => {
    const r = respuestasSinPregunta(ps, { dias_min: '2', obj: 'x', dias: '4', rara: 'algo' })
    expect(r.map(s => s.id)).toEqual(['dias', 'rara'])
    expect(r[0].etiqueta).toBe(PREGUNTAS_RETIRADAS.dias)
    expect(r[0].valor).toBe('4')
    expect(r[1].etiqueta).toBe('rara')
  })

  it('no devuelve las vacías ni las que sí tienen pregunta, y aguanta answers vacío o nulo', () => {
    expect(respuestasSinPregunta(ps, { dias: '', otra: [], mas: null, dias_min: '1' })).toEqual([])
    expect(respuestasSinPregunta(ps, null)).toEqual([])
    expect(respuestasSinPregunta(ps, undefined)).toEqual([])
    expect(respuestasSinPregunta(ps, {})).toEqual([])
  })

  it('una respuesta Sí/No «No» (false) o un 0 sí cuentan: son una respuesta', () => {
    expect(respuestasSinPregunta(ps, { a: false, b: 0 }).map(s => s.id)).toEqual(['a', 'b'])
  })

  it('textoSuelto: listas con comas, Sí/No y el resto tal cual', () => {
    expect(textoSuelto(['a', 'b'])).toBe('a, b')
    expect(textoSuelto(true)).toBe('Sí')
    expect(textoSuelto(false)).toBe('No')
    expect(textoSuelto('4')).toBe('4')
    expect(textoSuelto(7)).toBe('7')
  })

  it('la hoja impresa las incluye (escapadas) y sin ellas queda igual que antes', () => {
    const conHuerfana = hojaImprimible('Cuestionario', ps, [{ cliente: 'Ana', fecha: 0, answers: { dias_min: '2', dias: '4', rara: '<b>x</b>' } }])
    expect(conHuerfana).toContain(`<dt>${PREGUNTAS_RETIRADAS.dias}</dt><dd>4</dd>`)
    expect(conHuerfana).toContain('<dt>rara</dt><dd>&lt;b&gt;x&lt;/b&gt;</dd>')
    expect(conHuerfana).not.toContain('<b>x</b>')
    const sin = hojaImprimible('Cuestionario', ps, [{ cliente: 'Ana', fecha: 0, answers: { dias_min: '2' } }])
    expect(sin).toContain('<dt>Mínimo</dt><dd>2</dd>')
    expect(sin).not.toContain('PREGUNTAS_RETIRADAS')
    expect(sin.match(/<dt>/g)!.length).toBe(ps.length)
  })
})

describe('resultados con los tipos nuevos', () => {
  const ps = [
    { id: 'n', type: 'number' as const, label: 'Peso' },
    { id: 'm', type: 'multi' as const, label: 'Qué costó', options: ['Dormir', 'Dieta', 'Tiempo'] },
  ]
  const s = summarizeSurvey(ps, [
    { template_id: 't', completed_at: 1, answers: { n: 70, m: ['Dormir', 'Dieta'] } },
    { template_id: 't', completed_at: 2, answers: { n: 71, m: ['Dieta'] } },
  ])

  it('número: media', () => expect(s.questions[0].avg).toBe(70.5))
  it('varias opciones: cuenta cada opción marcada', () => {
    expect(s.questions[1].counts).toEqual([{ option: 'Dieta', n: 2 }, { option: 'Dormir', n: 1 }])
  })
})
