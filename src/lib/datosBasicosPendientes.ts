// Si al registrarse no se pudieron guardar los datos básicos (sin red, o la función de la base de datos aún no está), se guardan en el dispositivo para reintentarlo
// desde Hoy sin que el cliente tenga que volver a escribirlos. Reintentar es seguro: la función de la base de datos es idempotente (no duplica el primer pesaje y
// solo rellena lo vacío). Se borra en cuanto se guardan, y también si pasan más de `DIAS_PENDIENTES` días sin conseguirlo: son datos de salud de una persona y en un
// dispositivo compartido no deben quedarse indefinidamente. (La retención es solo del navegador del cliente: no hay copia en ningún servidor.)
// Sin React ni red: el almacenamiento y el reloj se inyectan (así se prueba).

export interface ValoresBasicos { genero: 'h' | 'm' | null; nacimiento: string; altura: number; peso: number }
export interface AlmacenLocal { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

/** Cuánto se conservan sin guardarse antes de borrarse solos. */
export const DIAS_PENDIENTES = 7
const MS_DIA = 24 * 60 * 60 * 1000

export const claveBasicosPendientes = (clientId: string) => `pf_datos_basicos_pendientes_${clientId}`

export function guardarPendientes(a: AlmacenLocal, clientId: string, v: ValoresBasicos, ahora: number = Date.now()): boolean {
  try { a.setItem(claveBasicosPendientes(clientId), JSON.stringify({ ...v, guardadoEn: ahora })); return true } catch { return false }
}
export function borrarPendientes(a: AlmacenLocal, clientId: string): void {
  try { a.removeItem(claveBasicosPendientes(clientId)) } catch { /* nada que borrar */ }
}
/** Lo pendiente de guardar, o null si no hay nada, está corrupto (no se reintenta algo que no se entiende) o caducó (en ese caso se borra). */
export function leerPendientes(a: AlmacenLocal, clientId: string, ahora: number = Date.now()): ValoresBasicos | null {
  try {
    const t = a.getItem(claveBasicosPendientes(clientId))
    const v = t ? JSON.parse(t) : null
    if (!v || typeof v !== 'object') return null
    const okGenero = v.genero === null || v.genero === 'h' || v.genero === 'm'
    if (!okGenero || typeof v.nacimiento !== 'string' || typeof v.altura !== 'number' || typeof v.peso !== 'number') return null
    // Sin fecha de guardado (o de un futuro imposible) o pasada de plazo: caduca y se borra
    if (typeof v.guardadoEn !== 'number' || v.guardadoEn > ahora + MS_DIA || ahora - v.guardadoEn > DIAS_PENDIENTES * MS_DIA) { borrarPendientes(a, clientId); return null }
    return { genero: v.genero, nacimiento: v.nacimiento, altura: v.altura, peso: v.peso }
  } catch { return null }
}
