import { supabase } from './supabase'
import { logError } from './errors'
import { BUCKET_ARCHIVOS, mensajeReserva, problemaArchivo, type ArchivoRef } from './archivos'

// Llamadas a Supabase de los archivos de los cuestionarios (la lógica pura está en archivos.ts y el diseño en docs/archivos-cuestionarios.md).
// Subir un archivo son tres pasos, todos comprobados por el servidor: 1) reservar la ruta (archivo_reservar: formato, tamaño, topes y que la pregunta sea de archivos de SU
// entrenador), 2) subirlo a esa ruta (el depósito no deja subir a otra) y 3) pedirle a la función de borde que lo compruebe de verdad (bytes y estructura).

export interface Contexto { templateId: string; questionId: string }
export type Fase = 'preparando' | 'subiendo' | 'comprobando'
export type ResultadoSubida = { ok: true; archivo: ArchivoRef } | { ok: false; error: string }

type RespuestaFuncion = { ok?: boolean; codigo?: string; motivo?: string; archivo?: ArchivoRef; borrado?: boolean; borrados?: number }

/** Llama a la función de borde; `rechazo` es true cuando la función contestó y dijo que el archivo no vale (no un fallo de red). */
async function llamar(cuerpo: Record<string, unknown>): Promise<{ ok: boolean; rechazo: boolean; datos: RespuestaFuncion | null }> {
  const { data, error } = await supabase.functions.invoke('archivos-cliente', { body: cuerpo })
  if (error) { logError('archivos:funcion', error as unknown as Parameters<typeof logError>[1]); return { ok: false, rechazo: false, datos: null } }
  const datos = (data ?? null) as RespuestaFuncion | null
  return { ok: datos?.ok === true, rechazo: datos?.ok === false && !!datos.motivo, datos }
}

const ERROR_SUBIDA = 'No se pudo subir el archivo. Comprueba tu conexión e inténtalo de nuevo'
const ERROR_COMPROBAR = 'No se pudo comprobar el archivo. Inténtalo de nuevo'

/** Quita un archivo que aún no se ha enviado (el objeto y la fila). Devuelve si se pudo. */
export async function descartarArchivo(id: string): Promise<boolean> {
  const r = await llamar({ accion: 'descartar', id })
  return r.ok
}

export async function subirArchivo(ctx: Contexto, file: File, alFase?: (f: Fase) => void): Promise<ResultadoSubida> {
  // Primer filtro, en el móvil (ahorra una subida inútil); el servidor lo vuelve a comprobar todo
  const problema = problemaArchivo(file)
  if (problema) return { ok: false, error: problema }

  alFase?.('preparando')
  const { data, error } = await supabase.rpc('archivo_reservar', { p_template_id: ctx.templateId, p_question_id: ctx.questionId, p_nombre: file.name, p_tamano: file.size })
  const reserva = data as { ok?: boolean; codigo?: string; id?: string; ruta?: string; tipo?: string } | null
  if (error) logError('archivos:reservar', error)
  if (error || !reserva?.ok || !reserva.id || !reserva.ruta || !reserva.tipo) return { ok: false, error: mensajeReserva(error ? undefined : reserva?.codigo) }

  alFase?.('subiendo')
  // supabase-js sube un archivo como formulario y el tipo que recibe el depósito es el del propio archivo según el navegador, no el `contentType` de las opciones: un .heic llega sin tipo
  // y un .csv de Windows como «application/vnd.ms-excel», y el depósito (que solo deja pasar los tipos admitidos) los rechazaría. Se vuelve a envolver con el tipo que fijó el servidor.
  const cuerpo = new Blob([file], { type: reserva.tipo })
  const { error: errSubir } = await supabase.storage.from(BUCKET_ARCHIVOS).upload(reserva.ruta, cuerpo, { contentType: reserva.tipo, upsert: false })
  if (errSubir) { console.error('[archivos:subir]', errSubir.message); await descartarArchivo(reserva.id); return { ok: false, error: ERROR_SUBIDA } }

  alFase?.('comprobando')
  const v = await llamar({ accion: 'verificar', id: reserva.id })
  if (v.ok && v.datos?.archivo) return { ok: true, archivo: v.datos.archivo }
  // Si la función dijo que no vale, ya lo ha borrado; si falló por otra causa, se intenta quitar
  if (v.rechazo) return { ok: false, error: v.datos?.motivo ?? ERROR_COMPROBAR }
  await descartarArchivo(reserva.id)
  return { ok: false, error: ERROR_COMPROBAR }
}

/** Los archivos que este cliente ya subió y comprobó a esta pregunta pero aún no ha enviado (por ejemplo, desde otro dispositivo). null si no se pudo consultar. */
export async function archivosPendientes(ctx: Contexto): Promise<ArchivoRef[] | null> {
  const { data, error } = await supabase.from('archivos_cliente').select('id, nombre, tamano, tipo')
    .eq('template_id', ctx.templateId).eq('question_id', ctx.questionId).eq('estado', 'verificado').is('response_id', null).order('created_at')
  if (error) { logError('archivos:pendientes', error); return null }
  return (data ?? []) as ArchivoRef[]
}

// ── Lado del entrenador ──

export interface ArchivoFila extends ArchivoRef { ruta: string; estado: string }

/** Los datos de unos archivos (las reglas de la base de datos solo dejan ver los del entrenador de ese cliente). */
export async function archivosPorIds(ids: string[]): Promise<ArchivoFila[]> {
  if (!ids.length) return []
  const { data, error } = await supabase.from('archivos_cliente').select('id, nombre, tamano, tipo, ruta, estado').in('id', ids)
  if (error) { logError('archivos:por-ids', error); return [] }
  return (data ?? []) as ArchivoFila[]
}

/** Enlace firmado de 5 minutos para descargar (siempre como adjunto, nunca se abre dentro de la app). null si no se pudo. */
export async function urlDescarga(ruta: string, nombre: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET_ARCHIVOS).createSignedUrl(ruta, 300, { download: nombre })
  if (error || !data?.signedUrl) { console.error('[archivos:descarga]', error?.message); return null }
  return data.signedUrl
}

// ── RGPD ──

/**
 * Antes de borrar a un cliente: borra con la Storage API todos sus archivos de cuestionarios (los que tienen fila y los que no), con la función de borde.
 * Solo se llama si tiene archivos (o si no se pudo saber), para que el borrado de clientes sin ellos no dependa de la función. Devuelve un error con texto si algo falló:
 * quien llama NO debe seguir con el borrado de datos.
 */
export async function borrarArchivosDelCliente(clientId: string): Promise<{ ok: true; borrados: number } | { ok: false; error: string }> {
  const { count, error } = await supabase.from('archivos_cliente').select('id', { count: 'exact', head: true }).eq('client_id', clientId)
  if (!error && count === 0) return { ok: true, borrados: 0 }
  // Si la tabla todavía no existe (la app se desplegó antes que la migración), no hay archivos que borrar: el borrado del cliente no se bloquea
  if (error && (error.code === '42P01' || error.code === 'PGRST205')) return { ok: true, borrados: 0 }
  const r = await llamar({ accion: 'borrar-cliente', client_id: clientId })
  if (r.ok) return { ok: true, borrados: r.datos?.borrados ?? 0 }
  return { ok: false, error: 'No se pudieron borrar los archivos de sus cuestionarios' }
}
