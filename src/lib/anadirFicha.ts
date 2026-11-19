// Botón «Añadir» de la cabecera de la ficha: en vez de un menú plano, las cosas que se pueden añadir agrupadas por lo que son
// (Entrenamiento / Seguimiento / Comunicación / Gestión) y con lo relevante primero según la pestaña en la que estés.
// Cada opción lleva al sitio donde ya se hace (no duplica formularios). Sin React ni red.

import type { Destino } from './atencionCliente'

export type PestanaFicha = 'perfil' | 'plan' | 'dieta' | 'vista' | 'entrenos' | 'progreso'
export type GrupoAnadir = 'Entrenamiento' | 'Seguimiento' | 'Comunicación' | 'Gestión'
export type IdOpcion = 'workout' | 'programa' | 'sesion-libre' | 'peso' | 'foto' | 'valoracion' | 'recordatorio' | 'mensaje' | 'encuesta' | 'etiqueta' | 'cita' | 'documento'
/** Pestañas del panel del entrenador a las que lleva «Añadir» (cita, documento, encuesta): viven fuera de la ficha. */
export type DestinoPanel = 'calendario' | 'documentos' | 'encuestas'

export interface OpcionAnadir {
  id: IdOpcion
  label: string
  grupo: GrupoAnadir
  /** A dónde lleva (pestaña, sección de Progreso o ancla del Resumen, y qué plegable abrir). */
  destino?: Destino
  /** Lo que se abre aquí mismo, sin cambiar de pestaña. */
  accion?: 'asignar-workout'
  /** Sale de la ficha a una pestaña del panel con este cliente ya elegido. */
  panel?: DestinoPanel
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
  { id: 'encuesta', label: 'Encuesta', grupo: 'Comunicación', panel: 'encuestas' },
  { id: 'etiqueta', label: 'Etiqueta', grupo: 'Gestión', destino: { tab: 'perfil', seccion: 'etiquetas' } },
  { id: 'cita', label: 'Cita', grupo: 'Gestión', panel: 'calendario' },
  { id: 'documento', label: 'Documento', grupo: 'Gestión', panel: 'documentos' },
]

// Por pestaña: qué grupos primero y qué opciones de cabeza (lo que más probablemente quieres ahí). Lo demás sigue, en su orden.
const RELEVANTE: Record<PestanaFicha, { grupos: GrupoAnadir[]; primeras: IdOpcion[] }> = {
  perfil:   { grupos: ['Seguimiento', 'Comunicación', 'Gestión', 'Entrenamiento'], primeras: ['recordatorio', 'valoracion', 'mensaje', 'encuesta'] },
  plan:     { grupos: ['Entrenamiento', 'Comunicación', 'Seguimiento', 'Gestión'], primeras: ['workout', 'programa', 'sesion-libre'] },
  dieta:    { grupos: ['Seguimiento', 'Comunicación', 'Entrenamiento', 'Gestión'], primeras: ['peso', 'mensaje'] },
  vista:    { grupos: ['Comunicación', 'Entrenamiento', 'Seguimiento', 'Gestión'], primeras: ['mensaje', 'encuesta'] },
  entrenos: { grupos: ['Entrenamiento', 'Seguimiento', 'Comunicación', 'Gestión'], primeras: ['sesion-libre', 'workout'] },
  progreso: { grupos: ['Seguimiento', 'Comunicación', 'Entrenamiento', 'Gestión'], primeras: ['peso', 'foto', 'valoracion'] },
}

/** Los grupos con sus opciones, en el orden que toca para esta pestaña; un grupo sin opciones no sale. Con `sinPanel` (la ficha
 *  no puede salir al panel, p. ej. en la demo) se quitan las que llevan a otra pestaña del panel. */
export function opcionesAnadir(tab: PestanaFicha, opts: { sinPanel?: boolean } = {}): { grupo: GrupoAnadir; opciones: OpcionAnadir[] }[] {
  const { grupos, primeras } = RELEVANTE[tab]
  const rango = (o: OpcionAnadir) => { const i = primeras.indexOf(o.id); return i === -1 ? primeras.length : i }
  return grupos
    .map(grupo => ({ grupo, opciones: OPCIONES.filter(o => o.grupo === grupo && !(opts.sinPanel && o.panel)).sort((a, b) => rango(a) - rango(b)) }))
    .filter(g => g.opciones.length > 0)
}

/** Orden de abrir un plegable desde fuera: `n` cambia en cada orden, para que pedir lo mismo dos veces vuelva a abrirlo. */
export interface AbrirPlegable { id: NonNullable<Destino['abrir']>; n: number }

/** «Ir al panel con este cliente»: a qué pestaña salir y de quién se trata. `nonce` distingue una orden de la siguiente. */
export interface IntentoPanel { tab: DestinoPanel; clientId: string; nonce: number }
