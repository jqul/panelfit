// Estado del cuestionario de salud de un cliente: su nivel (lib/intakeQuestions) y si el entrenador ya ha revisado ESAS respuestas. Sin React ni red.
//
// Dónde vive: la ficha de admisión es una fila de `checkins` con tipo 'intake'; cuando el entrenador la revisa, deja otra con tipo 'parq_revisado' cuyas
// `respuestas` llevan la HUELLA del contenido que revisó (`[{ pregunta: 'huella', respuesta: '<huella>' }]`). Así no hace falta una columna nueva en `clientes`
// (que obligaría a rehacer `get_client_by_token`).
//
// «Revisado» significa: hay una revisión cuya huella coincide con la de la ficha ACTUAL. No se compara por fechas: si el cliente vuelve a contestar y cambia algo
// (aunque sea una sola respuesta), la huella cambia y la revisión anterior deja de valer; si la reenvía idéntica, es lo mismo que ya se revisó y sigue valiendo.
// Una revisión sin huella (o con otra) no cuenta nunca.
//
// Quién puede dejar una revisión: solo el entrenador del cliente (o su equipo / un superadmin), y eso lo impone la BASE DE DATOS con un trigger sobre `checkins`
// (migración 20261122000020): el cliente puede escribir en sus filas de `checkins` por RLS, pero no las de tipo 'parq_revisado'. La huella NO es una firma ni
// protege nada por sí sola (no es criptográfica): sirve para que la revisión quede atada a lo que se leyó.
//
// Qué hace el nivel `alarma` sin revisar: RETIENE el cuestionario de programación del cliente (ni se abre solo, ni sale en Hoy, ni en su pestaña) y le sale una
// fila al entrenador en «Decisión de hoy». Esa retención es SOLO de interfaz: la función `encuestas_pendientes()` sigue devolviendo la encuesta y el cliente podría
// rellenarla por otra vía. Vale como pauta de seguridad y de trato, no como bloqueo real; si algún día el estado de revisión condiciona decisiones importantes
// (por ejemplo, que la IA prepare un plan), habrá que comprobarlo también en servidor. Y «revisado» no certifica que la persona pueda hacer cualquier entrenamiento:
// solo dice que el entrenador leyó esas respuestas.
// La clasificación por niveles (lib/intakeQuestions) es una decisión de producto provisional, no una validación clínica.
// Los niveles `revisar` y `aclarar` no retienen nada: el cuestionario de programación es justo donde cuenta los detalles; solo se le avisa al entrenador.

import { GRAVEDAD_PARQ, nivelParqGuardado, type NivelParq } from './intakeQuestions'

export interface FilaAdmision {
  tipo: string
  createdAt: number | string | null
  respuestas?: { pregunta: string; respuesta: string }[] | null
}

export interface EstadoParq {
  nivel: NivelParq
  /** Cuándo rellenó la ficha (ms), o null si no hay ficha. */
  admisionEn: number | null
  /** Huella del contenido de la ficha actual (null si no hay ficha): es lo que una revisión debe llevar para valer. */
  huella: string | null
  /** Cuándo la revisó el entrenador (ms): la revisión cuya huella coincide con la ficha actual. */
  revisadoEn: number | null
  revisado: boolean
  /** Hay algo que el entrenador debe mirar: nivel por encima de «ninguno» y sin revisar. */
  pendienteDeRevisar: boolean
  /** El cuestionario de programación queda en espera: nivel «alarma» sin revisar. */
  retenido: boolean
}

/** Etiqueta de la pregunta que lleva la huella en la fila de revisión. */
export const PREGUNTA_HUELLA = 'huella'

const ms = (v: number | string | null | undefined): number | null => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

/**
 * Huella del contenido de una ficha: depende de cada pregunta y respuesta, en orden. Mismas respuestas, misma huella; cualquier cambio, otra.
 * (cyrb53, determinista y sin dependencias; no es criptográfica ni hace falta que lo sea: ver la cabecera.)
 */
export function huellaAdmision(respuestas: { pregunta: string; respuesta: string }[] | null | undefined): string {
  const texto = JSON.stringify((Array.isArray(respuestas) ? respuestas : []).map(r => [String(r?.pregunta ?? ''), String(r?.respuesta ?? '')]))
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}

/** Las `respuestas` de la fila de revisión para una huella dada. */
export const respuestasDeRevision = (huella: string): { pregunta: string; respuesta: string }[] => [{ pregunta: PREGUNTA_HUELLA, respuesta: huella }]

const huellaDeRevision = (f: FilaAdmision): string | null => {
  const r = Array.isArray(f.respuestas) ? f.respuestas.find(x => x && x.pregunta === PREGUNTA_HUELLA) : undefined
  return r && typeof r.respuesta === 'string' && r.respuesta ? r.respuesta : null
}

export function estadoParq(filas: FilaAdmision[] | null | undefined): EstadoParq {
  const lista = Array.isArray(filas) ? filas : []
  const admisiones = lista.filter(f => f && f.tipo === 'intake').sort((a, b) => (ms(b.createdAt) ?? 0) - (ms(a.createdAt) ?? 0))
  const ultima = admisiones[0]
  if (!ultima) return { nivel: 'ninguno', admisionEn: null, huella: null, revisadoEn: null, revisado: false, pendienteDeRevisar: false, retenido: false }
  const huella = huellaAdmision(ultima.respuestas)
  const nivel = nivelParqGuardado(ultima.respuestas)
  const revisiones = lista
    .filter(f => f && f.tipo === 'parq_revisado' && huellaDeRevision(f) === huella)
    .map(f => ms(f.createdAt) ?? 0)
    .sort((a, b) => b - a)
  const revisadoEn = revisiones.length ? revisiones[0] : null
  const revisado = revisadoEn !== null
  return { nivel, admisionEn: ms(ultima.createdAt), huella, revisadoEn, revisado, pendienteDeRevisar: GRAVEDAD_PARQ[nivel] > 0 && !revisado, retenido: nivel === 'alarma' && !revisado }
}
