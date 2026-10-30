// La columna `programacion_mensajes.id` es de tipo uuid (por defecto gen_random_uuid()). Con un id
// con prefijo ("sched_173…") la base de datos lo rechazaba, así que programar un mensaje desde la
// app fallaba siempre sin que el entrenador lo supiera (la tabla estaba vacía en producción).
export const nuevoIdMensaje = (): string => crypto.randomUUID()

export const esUuid = (s: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
