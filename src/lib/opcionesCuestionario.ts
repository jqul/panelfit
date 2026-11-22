// Los cuestionarios de programación que se pueden mandar al crear un cliente, solo con su id y su nombre: el desplegable del alta no necesita sus preguntas, y
// así el panel no carga cuatro cuestionarios enteros (las preguntas se cargan al crear el cliente: lib/programarCuestionario). Una prueba comprueba que esta
// lista y `MODELOS_PROGRAMACION` (lib/modelosProgramacion) son la misma.

export const OPCIONES_CUESTIONARIO = [
  { id: 'programacion-general', nombre: 'General' },
  { id: 'programacion-fuerza', nombre: 'Fuerza' },
  { id: 'programacion-composicion', nombre: 'Composición corporal' },
  { id: 'programacion-rehabilitacion', nombre: 'Rehabilitación' },
] as const

/** El que recibe por defecto un cliente nuevo. */
export const CUESTIONARIO_POR_DEFECTO = 'programacion-general'
