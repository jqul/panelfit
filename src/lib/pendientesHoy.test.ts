import { describe, it, expect } from 'vitest'
import { pendientesDeHoy, textoAviso, fechaSesion as fechaSesionFn, tocaEl as tocaElFn, type TareaLite } from '../../supabase/functions/recordatorio-diario/pendientes'
import { fechaSesion } from './fechasPlan'
import { tocaEl } from './tareas'

// El aviso de las 18:00 se calcula en una función de borde (Deno) con una copia de las reglas de fechas del plan y de
// las tareas. Aquí se comprueba que la copia da lo mismo que src/ y que el aviso dice lo que toca.

const ex = [{ name: 'Sentadilla' }]
const dia = (title: string) => ({ title, focus: '', exercises: ex })
// Semana 1 = lunes 26 oct; el cliente entrena lunes, miércoles y viernes.
const plan = {
  fechaInicio: '2026-10-26', diasElegidos: [0, 2, 4],
  weeks: [{ label: 'S1', rpe: '', isCurrent: true, days: [dia('Día A'), dia('Día B'), dia('Día C')] },
          { label: 'S2', rpe: '', isCurrent: false, days: [dia('Lunes — pierna'), dia('Jueves — torso')] }],
} as any
const HOY = '2026-10-28' // miércoles: toca el Día B
const tarea = (t: Partial<TareaLite>): TareaLite => ({ id: 't1', titulo: 'Caminar', fecha: '2026-10-01', repetir: 'diaria', dias: [], hasta: null, ...t })

describe('la copia de la función de borde coincide con src/', () => {
  it('fecha de cada sesión', () => {
    const conMovida = { ...plan, fechasSesion: { w0_d2: '2026-11-01' } }
    for (const p of [plan, conMovida, { ...plan, diasElegidos: undefined }, { ...plan, fechaInicio: undefined }]) {
      for (let w = 0; w < 2; w++) for (let d = 0; d < 3; d++) expect(fechaSesionFn(p, w, d)).toBe(fechaSesion(p, w, d))
    }
  })

  it('qué días toca una tarea', () => {
    const casos = [tarea({ repetir: 'una', fecha: '2026-10-28' }), tarea({ repetir: 'semanal', dias: [2, 4] }), tarea({ hasta: '2026-10-27' })]
    for (const t of casos) for (const f of ['2026-10-26', '2026-10-28', '2026-10-30', '2026-11-01']) expect(tocaElFn(t, f)).toBe(tocaEl(t as any, f))
  })
})

describe('pendientesDeHoy', () => {
  it('la sesión de hoy sin hacer', () => {
    expect(pendientesDeHoy(plan, {}, [], new Set(), HOY)).toEqual({ sesion: 'Día B', tareas: [] })
  })

  it('hecha (cerrada o con todas las series), ya no', () => {
    expect(pendientesDeHoy(plan, { finished_w0_d1: { sessionFinished: true } }, [], new Set(), HOY).sesion).toBeNull()
    expect(pendientesDeHoy(plan, { ex_w0_d1_r0: { done: true } }, [], new Set(), HOY).sesion).toBeNull()
  })

  it('movida a otro día, ya no es de hoy; movida a hoy, sí', () => {
    expect(pendientesDeHoy({ ...plan, fechasSesion: { w0_d1: '2026-10-29' } }, {}, [], new Set(), HOY).sesion).toBeNull()
    // (con la de hoy ya hecha, la que se trajo a hoy es la que queda)
    expect(pendientesDeHoy({ ...plan, fechasSesion: { w1_d1: HOY } }, { finished_w0_d1: { sessionFinished: true } }, [], new Set(), HOY).sesion).toBe('Jueves — torso')
  })

  it('sin saber qué día cae, no molesta', () => {
    expect(pendientesDeHoy({ ...plan, diasElegidos: undefined }, {}, [], new Set(), HOY).sesion).toBeNull()
  })

  it('un plan que aún no ha empezado no avisa', () => {
    expect(pendientesDeHoy({ ...plan, fechaInicio: '2026-11-02' }, {}, [], new Set(), HOY).sesion).toBeNull()
  })

  it('tareas de hoy sin marcar', () => {
    const tareas = [tarea({ id: 'a', titulo: 'Caminar' }), tarea({ id: 'b', titulo: 'Movilidad', repetir: 'semanal', dias: [0] }), tarea({ id: 'c', titulo: 'Estirar' })]
    expect(pendientesDeHoy(null, null, tareas, new Set(['c']), HOY)).toEqual({ sesion: null, tareas: ['Caminar'] })
  })
})

describe('textoAviso', () => {
  it('nada pendiente, nada que decir', () => {
    expect(textoAviso({ sesion: null, tareas: [] })).toBeNull()
  })
  it('sesión, con o sin tareas', () => {
    expect(textoAviso({ sesion: 'Día B', tareas: [] })).toEqual({ title: 'Te queda el entreno de hoy', body: 'Día B' })
    expect(textoAviso({ sesion: 'Día B', tareas: ['Caminar', 'Estirar'] })?.body).toBe('Día B · y 2 tareas')
  })
  it('solo tareas', () => {
    expect(textoAviso({ sesion: null, tareas: ['Caminar'] })).toEqual({ title: 'Te queda una tarea de hoy', body: 'Caminar' })
    expect(textoAviso({ sesion: null, tareas: ['a', 'b', 'c', 'd'] })).toEqual({ title: 'Te quedan 4 tareas de hoy', body: 'a · b · c…' })
  })
})
