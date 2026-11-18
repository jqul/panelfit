// Botón «Añadir» de la cabecera de la ficha: en vez de un menú plano, las cosas que se pueden añadir agrupadas por lo que son
// (Entrenamiento / Seguimiento / Comunicación / Gestión) y con lo relevante primero según la pestaña en la que estés.
// Cada opción lleva al sitio donde ya se hace (no duplica formularios). Sin React ni red.

import type { Destino } from './atencionCliente'

export type PestanaFicha = 'perfil' | 'plan' | 'dieta' | 'vista' | 'entrenos' | 'progreso'
export type GrupoAnadir = 'Entrenamiento' | 'Seguimiento' | 'Comunicación' | 'Gestión'
export type IdOpcion = 'workout' | 'programa' | 'sesion-libre' | 'peso' | 'foto' | 'valoracion' | 'recordatorio' | 'mensaje' | 'etiqueta'

export interface OpcionAnadir {
  id: IdOpcion
  label: string
  grupo: GrupoAnadir
  /** A dónde lleva (pestaña, sección de Progreso o ancla del Resumen, y qué plegable abrir). */
  destino?: Destino
  /** Lo que se abre aquí mismo, sin cambiar de pestaña. */
  accion?: 'asignar-workout'
}

const OPCIONES: OpcionAnadir[] = [
  { id: 'workout', label: 'Asignar workout', grupo: 'Entrenamiento', accion: 'asignar-workout' },
  { id: 'programa', label: 'Programa', grupo: 'Entrenamiento', destino: { tab: 'plan', abrir: 'ajustes-plan' } },
  { id: 'sesion-libre', label: 'Sesión libre', grupo: 'Entrenamiento', destino: { tab: 'plan' } },
  { id: 'peso', label: 'Peso', grupo: 'Seguimiento', destino: { tab: 'progreso', seccion: 'peso' } },
  { id: 'foto', label: 'Foto de progreso', grupo: 'Seguimiento', destino: { tab: 'progreso', seccion: 'fotos' } },
  { id: 'valoracion', label: 'Valoración', grupo: 'Seguimiento', destino: { tab: 'perfil', seccion: 'ficha-valoracion', abrir: 'valoracion' } },
  { id: 'recordatorio', label: 'Recordatorio', grupo: 'Seguimiento', destino: { tab: 'perfil', seccion: 'recordatorios' } },
  { id: 'mensaje', label: 'Mensaje', grupo: 'Comunicación', destino: { tab: 'perfil', seccion: 'mensajes' } },
  { id: 'etiqueta', label: 'Etiqueta', grupo: 'Gestión', destino: { tab: 'perfil', seccion: 'etiquetas' } },
]

// Por pestaña: qué grupos primero y qué opciones de cabeza (lo que más probablemente quieres ahí). Lo demás sigue, en su orden.
const RELEVANTE: Record<PestanaFicha, { grupos: GrupoAnadir[]; primeras: IdOpcion[] }> = {
  perfil:   { grupos: ['Seguimiento', 'Comunicación', 'Gestión', 'Entrenamiento'], primeras: ['recordatorio', 'valoracion', 'mensaje'] },
  plan:     { grupos: ['Entrenamiento', 'Comunicación', 'Seguimiento', 'Gestión'], primeras: ['workout', 'programa', 'sesion-libre'] },
  dieta:    { grupos: ['Seguimiento', 'Comunicación', 'Entrenamiento', 'Gestión'], primeras: ['peso', 'mensaje'] },
  vista:    { grupos: ['Comunicación', 'Entrenamiento', 'Seguimiento', 'Gestión'], primeras: ['mensaje'] },
  entrenos: { grupos: ['Entrenamiento', 'Seguimiento', 'Comunicación', 'Gestión'], primeras: ['sesion-libre', 'workout'] },
  progreso: { grupos: ['Seguimiento', 'Comunicación', 'Entrenamiento', 'Gestión'], primeras: ['peso', 'foto', 'valoracion'] },
}

/** Los grupos con sus opciones, en el orden que toca para esta pestaña; un grupo sin opciones no sale. */
export function opcionesAnadir(tab: PestanaFicha): { grupo: GrupoAnadir; opciones: OpcionAnadir[] }[] {
  const { grupos, primeras } = RELEVANTE[tab]
  const rango = (o: OpcionAnadir) => { const i = primeras.indexOf(o.id); return i === -1 ? primeras.length : i }
  return grupos
    .map(grupo => ({ grupo, opciones: OPCIONES.filter(o => o.grupo === grupo).sort((a, b) => rango(a) - rango(b)) }))
    .filter(g => g.opciones.length > 0)
}

/** Orden de abrir un plegable desde fuera: `n` cambia en cada orden, para que pedir lo mismo dos veces vuelva a abrirlo. */
export interface AbrirPlegable { id: NonNullable<Destino['abrir']>; n: number }
