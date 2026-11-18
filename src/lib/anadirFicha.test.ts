import { describe, it, expect } from 'vitest'
import { opcionesAnadir, type PestanaFicha } from './anadirFicha'

const ids = (tab: PestanaFicha) => opcionesAnadir(tab).flatMap(g => g.opciones.map(o => o.id))

describe('opcionesAnadir', () => {
  it('agrupa por tipo y cada opción aparece una sola vez en todas las pestañas', () => {
    const todas = ['workout', 'programa', 'sesion-libre', 'peso', 'foto', 'valoracion', 'recordatorio', 'mensaje', 'etiqueta'].sort()
    for (const tab of ['perfil', 'plan', 'dieta', 'vista', 'entrenos', 'progreso'] as const) expect([...ids(tab)].sort()).toEqual(todas)
    expect(opcionesAnadir('perfil').map(g => g.grupo).sort()).toEqual(['Comunicación', 'Entrenamiento', 'Gestión', 'Seguimiento'])
  })

  it('lo relevante primero según la pestaña: en Plan, Entrenamiento y asignar workout; en Progreso, Seguimiento y peso', () => {
    const plan = opcionesAnadir('plan')
    expect(plan[0].grupo).toBe('Entrenamiento')
    expect(plan[0].opciones[0].id).toBe('workout')
    const progreso = opcionesAnadir('progreso')
    expect(progreso[0].grupo).toBe('Seguimiento')
    expect(progreso[0].opciones.map(o => o.id).slice(0, 2)).toEqual(['peso', 'foto'])
    expect(opcionesAnadir('perfil')[0].opciones[0].id).toBe('recordatorio')
  })

  it('cada opción lleva a un sitio o abre algo aquí; nunca queda muerta', () => {
    for (const g of opcionesAnadir('perfil')) for (const o of g.opciones) expect(Boolean(o.destino) !== Boolean(o.accion)).toBe(true)
  })
})
