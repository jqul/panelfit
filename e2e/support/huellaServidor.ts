import { createHash } from 'node:crypto'

// La huella SHA-256 de una ficha de admisión tal como la calcula la BASE DE DATOS (función `huella_admision` de la migración 20261122000020) y la normalización que usa.
// Solo para el simulador de las pruebas e2e (fakeSupabase) y sus semillas: la app NUNCA calcula ni manda una huella, la pone el servidor. Que esta copia no se desvíe de la
// función SQL lo comprueban los mismos vectores (supabase/hardening/tests/huella_vectores.json) en las dos: e2e/huella-servidor.e2e.ts aquí y el runner PGlite allí.

const ESPACIOS = /[ \t\n\r\f\v]+/g
const limpiar = (v: unknown): string => (v === null || v === undefined ? '' : typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v)).replace(ESPACIOS, ' ').trim().normalize('NFC')

/** Texto canónico de una lista de respuestas: líneas «pregunta<TAB>respuesta», sin las de respuesta vacía, ordenadas por bytes UTF-8 (collate "C") y unidas con saltos de línea. */
export function textoCanonico(respuestas: unknown): string {
  const lista = Array.isArray(respuestas) ? respuestas : []
  const lineas = lista
    .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null && !Array.isArray(e))
    .map(e => ({ p: limpiar(e.pregunta), r: limpiar(e.respuesta) }))
    .filter(x => x.r !== '')
    .map(x => `${x.p}\t${x.r}`)
  return lineas.sort((a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))).join('\n')
}

export const huellaAdmision = (respuestas: unknown): string => createHash('sha256').update(textoCanonico(respuestas), 'utf8').digest('hex')
