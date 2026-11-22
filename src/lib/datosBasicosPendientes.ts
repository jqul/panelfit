// Si al registrarse no se pudieron guardar los datos básicos (sin red, o la función de la base de datos aún no está), se guardan en el dispositivo para reintentarlo
// desde Hoy sin que el cliente tenga que volver a escribirlos. Reintentar es seguro: la función de la base de datos es idempotente (no duplica el primer pesaje y
// solo rellena lo vacío). Se borra en cuanto se guardan. Sin React ni red: el almacenamiento se inyecta (así se prueba).

export interface ValoresBasicos { genero: 'h' | 'm' | null; nacimiento: string; altura: number; peso: number }
export interface AlmacenLocal { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

export const claveBasicosPendientes = (clientId: string) => `pf_datos_basicos_pendientes_${clientId}`

export function guardarPendientes(a: AlmacenLocal, clientId: string, v: ValoresBasicos): boolean {
  try { a.setItem(claveBasicosPendientes(clientId), JSON.stringify(v)); return true } catch { return false }
}
export function borrarPendientes(a: AlmacenLocal, clientId: string): void {
  try { a.removeItem(claveBasicosPendientes(clientId)) } catch { /* nada que borrar */ }
}
/** Lo pendiente de guardar, o null si no hay nada (o está corrupto: no se reintenta algo que no se entiende). */
export function leerPendientes(a: AlmacenLocal, clientId: string): ValoresBasicos | null {
  try {
    const t = a.getItem(claveBasicosPendientes(clientId))
    const v = t ? JSON.parse(t) : null
    if (!v || typeof v !== 'object') return null
    const okGenero = v.genero === null || v.genero === 'h' || v.genero === 'm'
    if (!okGenero || typeof v.nacimiento !== 'string' || typeof v.altura !== 'number' || typeof v.peso !== 'number') return null
    return { genero: v.genero, nacimiento: v.nacimiento, altura: v.altura, peso: v.peso }
  } catch { return null }
}
