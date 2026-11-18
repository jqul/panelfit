import { describe, it, expect } from 'vitest'
import { opcionesAnadir, type PestanaFicha } from './anadirFicha'

const ids = (tab: PestanaFicha) => opcionesAnadir(tab).flatMap(g => g.opciones.map(o => o.id))

describe('opcionesAnadir', () => {
  it('agrupa por tipo y cada opción aparece una sola vez en todas las pestañas', () => {
    const todas = ['workout', 'programa', 'sesion-libre', 'peso', 'foto', 'valoracion', 'recordatorio', 'mensaje', 'encuesta', 'etiqueta', 'cita', 'documento'].sort()
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

  it('cada opción lleva a un sitio de la ficha, abre algo aquí o sale a una pestaña del panel; nunca queda muerta ni hace dos cosas', () => {
    for (const g of opcionesAnadir('perfil')) for (const o of g.opciones) expect([o.destino, o.accion, o.panel].filter(Boolean)).toHaveLength(1)
  })

  it('cita, documento y encuesta salen al panel (Agenda, Documentos, Encuestas) y quedan en Gestión y Comunicación', () => {
    const todas = opcionesAnadir('perfil').flatMap(g => g.opciones.map(o => ({ ...o })))
    const por = (id: string) => todas.find(o => o.id === id)!
    expect(por('cita')).toMatchObject({ grupo: 'Gestión', panel: 'calendario' })
    expect(por('documento')).toMatchObject({ grupo: 'Gestión', panel: 'documentos' })
    expect(por('encuesta')).toMatchObject({ grupo: 'Comunicación', panel: 'encuestas' })
  })

  it('sin acceso al panel (p. ej. la demo) esas tres opciones no salen, y el resto sigue', () => {
    const sin = opcionesAnadir('perfil', { sinPanel: true }).flatMap(g => g.opciones.map(o => o.id))
    for (const id of ['cita', 'documento', 'encuesta']) expect(sin).not.toContain(id)
    expect(sin).toContain('mensaje')
    expect(sin).toContain('etiqueta')
  })
})
