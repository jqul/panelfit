import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MODELO_PROGRAMACION_INICIAL } from './modelosEncuesta'
import { DATOS_DEL_REGISTRO, MODELOS_PROGRAMACION, NUCLEO_PROGRAMACION, TODOS_LOS_MODELOS, nombreCorto } from './modelosProgramacion'
import { CUESTIONARIO_POR_DEFECTO, OPCIONES_CUESTIONARIO } from './opcionesCuestionario'
import { TIPO, conOpciones, faltan } from './cuestionarios'

describe('cuestionarios de programación del cliente', () => {
  it('están en el editor de encuestas, con nombre único y distinto del modelo del enlace público', () => {
    expect(TODOS_LOS_MODELOS).toEqual([MODELO_PROGRAMACION_INICIAL, ...MODELOS_PROGRAMACION])
    const nombres = TODOS_LOS_MODELOS.map(m => m.name)
    expect(new Set(nombres).size).toBe(nombres.length)
    for (const m of MODELOS_PROGRAMACION) expect(m.name).not.toBe(MODELO_PROGRAMACION_INICIAL.name)
    expect(MODELOS_PROGRAMACION.map(m => m.id).sort()).toEqual(['programacion-composicion', 'programacion-fuerza', 'programacion-general', 'programacion-rehabilitacion'])
  })

  it('cada uno es válido para el editor: tipos conocidos, opciones donde hacen falta y sin textos vacíos', () => {
    for (const m of MODELOS_PROGRAMACION) {
      for (const p of m.questions) {
        expect(TIPO[p.type], `${m.id} ${p.id}`).toBeDefined()
        expect(p.label.trim(), `${m.id} ${p.id}`).not.toBe('')
        if (conOpciones(p.type)) expect((p.options ?? []).length, `${m.id} ${p.id}`).toBeGreaterThanOrEqual(2)
        else expect(p.options, `${m.id} ${p.id}`).toBeUndefined()
        if (conOpciones(p.type)) expect(new Set(p.options).size, `${m.id} ${p.id} sin opciones repetidas`).toBe(p.options!.length)
      }
    }
  })

  it('todos empiezan por el mismo núcleo, en el mismo orden (es lo que lee quien prepara el borrador)', () => {
    const ids = NUCLEO_PROGRAMACION.map(p => p.id)
    for (const m of MODELOS_PROGRAMACION) expect(m.questions.slice(0, ids.length).map(p => p.id), m.id).toEqual(ids)
  })

  it('los ids de un cuestionario no se repiten, y el bloque de cada enfoque no pisa al núcleo', () => {
    for (const m of MODELOS_PROGRAMACION) {
      const ids = m.questions.map(p => p.id)
      expect(new Set(ids).size, m.id).toBe(ids.length)
    }
  })

  it('el núcleo pide lo necesario para programar: objetivo, experiencia, tiempo, lugar, material, molestias y peso objetivo', () => {
    const obligatorias = NUCLEO_PROGRAMACION.filter(p => p.required).map(p => p.id)
    expect(obligatorias).toEqual(['objetivo', 'experiencia', 'dias_min', 'dias_max', 'duracion', 'lugar', 'material', 'molestias', 'cambio_peso'])
  })

  it('los días por semana son una FRANJA: mínimo y máximo, de 1 a 7, obligatorios, y el máximo no puede ser menor que el mínimo', () => {
    for (const m of MODELOS_PROGRAMACION) {
      const min = m.questions.find(p => p.id === 'dias_min'), max = m.questions.find(p => p.id === 'dias_max')
      expect(min, m.id).toBeDefined(); expect(max, m.id).toBeDefined()
      expect(m.questions.some(p => p.id === 'dias'), `${m.id}: ya no hay una cifra fija`).toBe(false)
      for (const p of [min!, max!]) { expect(p.type).toBe('choice'); expect(p.required).toBe(true); expect(p.options).toEqual(['1', '2', '3', '4', '5', '6', '7']) }
      expect(max!.noMenorQue).toMatchObject({ id: 'dias_min' })
      expect(max!.noMenorQue!.mensaje.length).toBeGreaterThan(10)
      // el mínimo va antes que el máximo (se contesta en ese orden) y justo después vienen los días concretos
      expect(m.questions.findIndex(p => p.id === 'dias_min')).toBeLessThan(m.questions.findIndex(p => p.id === 'dias_max'))
    }
  })

  it('cubre lo mínimo para plantear macros orientativas y no se pasa de largo con lo obligatorio', () => {
    const ids = NUCLEO_PROGRAMACION.map(p => p.id)
    for (const id of ['cambio_peso', 'comidas', 'control_comida', 'dieta_tipo', 'alergias', 'cocina', 'macros', 'pasos', 'trabajo', 'sueno']) expect(ids, id).toContain(id)
    // Tope de obligatorias por modelo: 11 (eran 10; la franja de días son DOS obligatorias, mínimo y máximo, en vez de una; el enfoque de rehabilitación añade las suyas)
    for (const m of MODELOS_PROGRAMACION) expect(m.questions.filter(p => p.required).length, m.id).toBeLessThanOrEqual(11)
  })

  it('no repite lo que recoge el registro (género, nacimiento, altura y peso)', () => {
    for (const m of MODELOS_PROGRAMACION) for (const id of DATOS_DEL_REGISTRO) expect(m.questions.map(p => p.id), `${m.id} ${id}`).not.toContain(id)
    // «peso_objetivo» es otra cosa: lo que quiere llegar a pesar
    expect(NUCLEO_PROGRAMACION.map(p => p.id)).toContain('peso_objetivo')
  })

  it('el de rehabilitación exige saber si puede entrenar y de qué zona', () => {
    const rehab = MODELOS_PROGRAMACION.find(m => m.id === 'programacion-rehabilitacion')!
    const obligatorias = rehab.questions.filter(p => p.required).map(p => p.id)
    expect(obligatorias).toContain('rehab_alta')
    expect(obligatorias).toContain('rehab_zona')
    // y no diagnostica ni promete nada
    expect(rehab.descripcion).toMatch(/no es un diagn[oó]stico/i)
  })

  it('el de fuerza recoge las marcas y la técnica de los tres básicos, y el de composición, fase, ritmo y hambre', () => {
    const ids = (id: string) => MODELOS_PROGRAMACION.find(m => m.id === id)!.questions.map(p => p.id)
    expect(ids('programacion-fuerza')).toEqual(expect.arrayContaining(['marcas_sbd', 'estilo_sentadilla', 'estilo_muerto', 'puntos_debiles', 'compite']))
    expect(ids('programacion-composicion')).toEqual(expect.arrayContaining(['fase_actual', 'ritmo', 'hambre', 'historial_dietas']))
  })

  it('son contestables: de una persona que responde lo obligatorio no falta nada, y vacío faltan justo las obligatorias', () => {
    for (const m of MODELOS_PROGRAMACION) {
      const respuestas: Record<string, unknown> = {}
      for (const p of m.questions.filter(x => x.required)) respuestas[p.id] = p.type === 'yesno' ? false : p.type === 'multi' ? [p.options![0]] : p.options?.[0] ?? 'x'
      expect(faltan(m.questions, respuestas), m.id).toEqual([])
      expect(faltan(m.questions, {}).map(p => p.id), m.id).toEqual(m.questions.filter(p => p.required).map(p => p.id))
    }
  })

  it('las preguntas son cortas y claras: sin textos enormes ni listas interminables', () => {
    for (const m of MODELOS_PROGRAMACION) {
      expect(m.questions.length, m.id).toBeLessThanOrEqual(50)
      for (const p of m.questions) {
        expect(p.label.length, `${m.id} ${p.id}`).toBeLessThanOrEqual(220)
        expect((p.options ?? []).length, `${m.id} ${p.id}`).toBeLessThanOrEqual(12)
        for (const o of p.options ?? []) expect(o.length, `${m.id} ${p.id} ${o}`).toBeLessThanOrEqual(80)
      }
    }
  })
})

describe('lista corta del alta de cliente (opcionesCuestionario)', () => {
  it('es la misma que los modelos: mismos ids, mismo orden y su nombre corto', () => {
    expect(OPCIONES_CUESTIONARIO.map(o => o.id)).toEqual(MODELOS_PROGRAMACION.map(m => m.id))
    expect(OPCIONES_CUESTIONARIO.map(o => o.nombre)).toEqual(MODELOS_PROGRAMACION.map(nombreCorto))
  })
  it('el de por defecto existe y es el general', () => {
    expect(OPCIONES_CUESTIONARIO.map(o => o.id)).toContain(CUESTIONARIO_POR_DEFECTO)
    expect(CUESTIONARIO_POR_DEFECTO).toBe('programacion-general')
  })
})

describe('migración de la franja de días', () => {
  // La migración 20261124000020 copia a mano las dos preguntas nuevas en las plantillas que ya existen: si el modelo cambia y la migración no, las copias divergen sin avisar.
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20261124000020_cuestionario_franja_dias.sql'), 'utf8')
  const modelo = MODELOS_PROGRAMACION[0]
  const min = modelo.questions.find(p => p.id === 'dias_min')!, max = modelo.questions.find(p => p.id === 'dias_max')!

  it('lleva exactamente los enunciados, las opciones y la regla del modelo', () => {
    expect(sql).toContain(`'label', '${min.label}'`)
    expect(sql).toContain(`'label', '${max.label}'`)
    expect(sql).toContain(`'options', '${JSON.stringify(min.options)}'::jsonb`)
    expect(sql).toContain(`'noMenorQue', jsonb_build_object('id', '${max.noMenorQue!.id}', 'mensaje', '${max.noMenorQue!.mensaje}')`)
  })

  it('el modelo es el mismo en todos los enfoques (la migración no distingue entre ellos)', () => {
    for (const m of MODELOS_PROGRAMACION) {
      expect(m.questions.find(p => p.id === 'dias_min')).toEqual(min)
      expect(m.questions.find(p => p.id === 'dias_max')).toEqual(max)
    }
  })

  it('solo sustituye la pregunta antigua tal como salió del modelo anterior (2-6, obligatoria)', () => {
    expect(sql).toContain(`'["2","3","4","5","6"]'::jsonb`)
    expect(sql).toContain('¿Cuántos días por semana puedes entrenar de verdad?')
  })
})
