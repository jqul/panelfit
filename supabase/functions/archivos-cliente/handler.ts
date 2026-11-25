// Lógica de la función `archivos-cliente` (docs/archivos-cuestionarios.md), separada de Deno y de Supabase para poder probarla con dobles (src/lib/archivosCliente.handler.test.ts).
// Todo lo que toca la base de datos o Storage entra por `Deps`; aquí solo están las REGLAS: quién puede qué y en qué orden. La función corre con la clave de servicio (se salta
// RLS), así que cada acción empieza comprobando que quien llama es dueño de lo que pide.
//
// Acciones (POST, con la sesión de quien llama):
//   { accion: 'verificar', id }          el cliente que subió el archivo: lo lee de Storage y comprueba bytes y estructura. Válido → «verificado». No válido → se borra el objeto.
//   { accion: 'descartar', id }          el cliente quita un archivo que aún no ha enviado: se borra el objeto y la fila.
//   { accion: 'borrar-cliente', client_id }   quien puede gestionar al cliente (RGPD): borra TODOS los objetos de su carpeta, tengan fila o no.
import { validarArchivo } from './validar.ts'

export interface Fila { id: string; client_id: string; ruta: string; nombre: string; ext: string; tipo: string; tamano: number; estado: string; response_id: string | null }

export interface Deps {
  /** El uid de la sesión (null si el token no vale). */
  usuario(jwt: string): Promise<string | null>
  /** El id del cliente cuya cuenta de acceso es ese uid. */
  clienteDe(uid: string): Promise<string | null>
  /** ¿Puede esa sesión gestionar a ese cliente? (la misma regla que export_client_data y delete_client_data). */
  puedeGestionar(jwt: string, clientId: string): Promise<boolean>
  fila(id: string): Promise<Fila | null>
  filasDeCliente(clientId: string): Promise<{ ruta: string }[]>
  /** Solo si sigue «reservado». Devuelve si cambió algo. */
  marcarVerificado(id: string, tamano: number, tipo: string): Promise<boolean>
  marcarRechazado(id: string, motivo: string): Promise<boolean>
  /** Solo si está reservado, verificado o rechazado y sin respuesta. */
  marcarBorrando(id: string): Promise<boolean>
  /** Borra la fila si está en ese estado (cuando su objeto ya se borró). */
  borrarFila(id: string, estado: 'borrando' | 'rechazado'): Promise<void>
  descargar(ruta: string): Promise<Uint8Array | null>
  /** Borra los objetos con la Storage API. false si algo falló. */
  borrar(rutas: string[]): Promise<boolean>
  /** Las rutas de todos los objetos de la carpeta de ese cliente. */
  listarCarpeta(clientId: string): Promise<string[]>
}

export interface Peticion { metodo: string; jwt: string; cuerpo: unknown }
export interface Respuesta { status: number; cuerpo: Record<string, unknown> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const r = (status: number, cuerpo: Record<string, unknown>): Respuesta => ({ status, cuerpo })
// No se distingue «no existe» de «es de otro»: no se le dice a un cliente qué archivos existen
const NO_EXISTE = r(404, { ok: false, codigo: 'no_existe' })

export async function manejar(p: Peticion, d: Deps): Promise<Respuesta> {
  if (p.metodo !== 'POST') return r(405, { ok: false, codigo: 'metodo' })
  if (!p.jwt) return r(401, { ok: false, codigo: 'sin_sesion' })
  const uid = await d.usuario(p.jwt)
  if (!uid) return r(401, { ok: false, codigo: 'sin_sesion' })
  const c = p.cuerpo && typeof p.cuerpo === 'object' ? p.cuerpo as Record<string, unknown> : {}

  switch (c.accion) {
    case 'verificar': return verificar(uid, c.id, d)
    case 'descartar': return descartar(uid, c.id, d)
    case 'borrar-cliente': return borrarCliente(p.jwt, c.client_id, d)
    default: return r(400, { ok: false, codigo: 'accion' })
  }
}

/** La fila, solo si es de un archivo del cliente de esa sesión. */
async function suyo(uid: string, id: unknown, d: Deps): Promise<Fila | null> {
  if (typeof id !== 'string' || !UUID.test(id)) return null
  const fila = await d.fila(id)
  if (!fila) return null
  const cliente = await d.clienteDe(uid)
  return cliente && cliente === fila.client_id ? fila : null
}

async function verificar(uid: string, id: unknown, d: Deps): Promise<Respuesta> {
  const fila = await suyo(uid, id, d)
  if (!fila) return NO_EXISTE
  // Reintento tras un corte: ya estaba comprobado
  if (fila.estado === 'verificado') return r(200, { ok: true, archivo: { id: fila.id, nombre: fila.nombre, tamano: fila.tamano, tipo: fila.tipo } })
  if (fila.estado !== 'reservado') return r(409, { ok: false, codigo: 'estado', estado: fila.estado })

  const bytes = await d.descargar(fila.ruta)
  if (!bytes) return r(409, { ok: false, codigo: 'no_subido' })

  // La extensión que se mira es la que fijó el servidor al reservar, no una que mande quien llama
  const v = validarArchivo(bytes, `archivo.${fila.ext}`)
  if (!v.ok) {
    await d.marcarRechazado(fila.id, v.motivo)
    // Se borra el objeto ya; si Storage falla, la fila queda «rechazada» y la limpieza diaria lo reintenta
    if (await d.borrar([fila.ruta])) await d.borrarFila(fila.id, 'rechazado')
    return r(200, { ok: false, codigo: v.codigo, motivo: v.motivo })
  }
  if (!(await d.marcarVerificado(fila.id, bytes.length, v.mime))) return r(409, { ok: false, codigo: 'estado' })
  return r(200, { ok: true, archivo: { id: fila.id, nombre: fila.nombre, tamano: bytes.length, tipo: v.mime } })
}

async function descartar(uid: string, id: unknown, d: Deps): Promise<Respuesta> {
  const fila = await suyo(uid, id, d)
  if (!fila) return NO_EXISTE
  if (fila.response_id || !['reservado', 'verificado', 'rechazado'].includes(fila.estado)) return r(409, { ok: false, codigo: 'estado', estado: fila.estado })
  if (!(await d.marcarBorrando(fila.id))) return r(409, { ok: false, codigo: 'estado' })
  const borrado = await d.borrar([fila.ruta])
  if (borrado) await d.borrarFila(fila.id, 'borrando')
  // Si Storage falla, la fila queda «borrando» (nadie puede usarla) y la limpieza diaria lo reintenta
  return r(200, { ok: true, borrado })
}

async function borrarCliente(jwt: string, clientId: unknown, d: Deps): Promise<Respuesta> {
  if (typeof clientId !== 'string' || !UUID.test(clientId)) return r(400, { ok: false, codigo: 'cliente' })
  if (!(await d.puedeGestionar(jwt, clientId))) return r(403, { ok: false, codigo: 'no_autorizado' })
  const rutas = [...new Set([...(await d.filasDeCliente(clientId)).map(f => f.ruta), ...(await d.listarCarpeta(clientId))])]
  if (rutas.length === 0) return r(200, { ok: true, borrados: 0 })
  if (!(await d.borrar(rutas))) return r(500, { ok: false, codigo: 'storage' })
  return r(200, { ok: true, borrados: rutas.length })
}
