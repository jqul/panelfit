// Lógica de la función `archivos-limpieza` (docs/archivos-cuestionarios.md), separada de Deno y de Supabase para poder probarla con dobles (src/lib/archivosLimpieza.test.ts).
// La decide la base de datos (qué toca borrar, cuándo, a quién se avisa: funciones archivos_* de la migración 20261125000010, probadas con reloj simulado); aquí solo se borran los
// objetos con la Storage API (borrar de `storage.objects` por SQL dejaría el archivo físico huérfano) y se cierra lo que salió bien.

export interface Deps {
  /** Avisa a los entrenadores de lo que va a caducar. Devuelve a cuántos clientes. */
  avisar(): Promise<number>
  /** Reclama lo que toca borrar (queda «borrando»). */
  reclamar(): Promise<{ id: string; ruta: string }[]>
  /** Cierra lo ya borrado (la fila desaparece o queda como «caducado»). */
  finalizar(ids: string[]): Promise<number>
  /** Objetos del depósito sin fila (de más de 24 h). */
  huerfanos(): Promise<string[]>
  /** Borra objetos con la Storage API. Devuelve false si falló (se reintenta al día siguiente). */
  borrar(rutas: string[]): Promise<boolean>
}

export interface Resumen { avisados: number; reclamados: number; borrados: number; pendientes: number; huerfanos: number; huerfanosBorrados: number; errores: string[] }

const TROZO = 100
const trozos = <T>(xs: T[]): T[][] => { const o: T[][] = []; for (let i = 0; i < xs.length; i += TROZO) o.push(xs.slice(i, i + TROZO)); return o }

export async function limpiar(d: Deps): Promise<Resumen> {
  const r: Resumen = { avisados: 0, reclamados: 0, borrados: 0, pendientes: 0, huerfanos: 0, huerfanosBorrados: 0, errores: [] }
  // Cada paso va por separado: que falle el aviso no impide borrar, y al revés
  try { r.avisados = await d.avisar() } catch (e) { r.errores.push(`avisar: ${(e as Error).message}`) }

  try {
    const filas = await d.reclamar()
    r.reclamados = filas.length
    for (const t of trozos(filas)) {
      // Si Storage falla con este trozo, sus filas se quedan «borrando» y se reintentan mañana; los demás trozos siguen
      if (await d.borrar(t.map(f => f.ruta))) r.borrados += await d.finalizar(t.map(f => f.id))
      else r.pendientes += t.length
    }
  } catch (e) { r.errores.push(`limpiar: ${(e as Error).message}`) }

  try {
    const nombres = await d.huerfanos()
    r.huerfanos = nombres.length
    for (const t of trozos(nombres)) if (await d.borrar(t)) r.huerfanosBorrados += t.length
  } catch (e) { r.errores.push(`huérfanos: ${(e as Error).message}`) }
  return r
}

/** Comparación en tiempo constante (el secreto interno no se compara con atajos). */
export function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}
