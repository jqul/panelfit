// Estado del cuestionario de salud de un cliente: su nivel (lib/intakeQuestions) y si el entrenador ya ha leído ESAS respuestas. Sin React ni red.
//
// Dónde vive: la ficha de admisión es una fila de `checkins` con tipo 'intake'; cuando el entrenador la lee y lo marca, deja otra con tipo 'parq_revisado'. Así no hace falta
// una columna nueva en `clientes` (que obligaría a rehacer `get_client_by_token`).
//
// «Revisado» significa: hay una revisión cuya HUELLA coincide con la de la ficha ACTUAL. La huella es un SHA-256 del contenido de la ficha (checkins.huella) y la calcula SIEMPRE
// el servidor (migración 20261122000020): la app no calcula ni manda ninguna, solo compara las que le llegan. La revisión se vincula a la versión exacta que se leyó: el entrenador
// solo indica el id de la ficha que tiene delante y el servidor escribe la revisión con la huella que esa ficha tiene en ese momento. Si el cliente vuelve a contestar y cambia algo
// (aunque sea una sola respuesta), la ficha cambia de huella y la revisión anterior deja de valer; si deja exactamente lo mismo, es el mismo contenido que se leyó y sigue valiendo.
// No se compara por fechas. Una ficha o una revisión SIN huella (por ejemplo, antes de aplicar la migración) no cuenta nunca como revisada: se cierra por el lado seguro.
//
// Quién puede dejar una revisión: solo el entrenador del cliente (o su equipo / un superadmin); lo impone la BASE DE DATOS con un trigger sobre `checkins`: el cliente puede escribir
// en sus filas de `checkins` por RLS, pero no las de tipo 'parq_revisado'. Lo que el cliente sí puede es cambiar SUS respuestas (la ficha es suya); la huella lo detecta.
//
// Qué hace el nivel `alarma` sin revisar: RETIENE el cuestionario de programación del cliente (ni se abre solo, ni sale en Hoy, ni en su pestaña) y le sale una
// fila al entrenador en «Decisión de hoy». Esa retención es SOLO de interfaz: la función `encuestas_pendientes()` sigue devolviendo la encuesta y el cliente podría
// rellenarla por otra vía. Vale como pauta de seguridad y de trato, no como bloqueo real; si algún día el estado de revisión condiciona decisiones importantes
// (por ejemplo, que la IA prepare un plan), habrá que comprobarlo también en servidor. Y «leído» no certifica que la persona pueda hacer cualquier entrenamiento:
// solo dice que el entrenador leyó esas respuestas.
// La clasificación por niveles (lib/intakeQuestions) es una decisión de producto provisional, no una validación clínica.
// Los niveles `revisar` y `aclarar` no retienen nada: el cuestionario de programación es justo donde cuenta los detalles; solo se le avisa al entrenador.

import { GRAVEDAD_PARQ, nivelParqGuardado, type NivelParq } from './intakeQuestions'

export interface FilaAdmision {
  /** Id de la fila de `checkins` (el de una ficha es el que se indica al revisarla). */
  id?: string
  tipo: string
  createdAt: number | string | null
  respuestas?: { pregunta: string; respuesta: string }[] | null
  /** SHA-256 que pone el servidor: el del contenido de la ficha, o el de la ficha que revisó una revisión. Ausente si la migración aún no está aplicada. */
  huella?: string | null
}

export interface EstadoParq {
  nivel: NivelParq
  /** Cuándo rellenó la ficha (ms), o null si no hay ficha. */
  admisionEn: number | null
  /** Id de la ficha actual (la que se revisa), o null si no hay ficha. */
  admisionId: string | null
  /** Huella de la ficha actual (null si no hay ficha o aún no la tiene): es la que una revisión debe llevar para valer. */
  huella: string | null
  /** Cuándo la leyó el entrenador (ms): la revisión cuya huella coincide con la ficha actual. */
  revisadoEn: number | null
  revisado: boolean
  /** Hay algo que el entrenador debe mirar: nivel por encima de «ninguno» y sin revisar. */
  pendienteDeRevisar: boolean
  /** El cuestionario de programación queda en espera: nivel «alarma» sin revisar. */
  retenido: boolean
}

/** Etiqueta de la pregunta que lleva el id de la ficha en la fila de revisión. */
export const PREGUNTA_ADMISION = 'admision'

/** Lo que se manda al revisar: SOLO el id de la ficha que se tiene delante. La huella y el resto del contenido los escribe el servidor. */
export const respuestasDeRevision = (admisionId: string): { pregunta: string; respuesta: string }[] => [{ pregunta: PREGUNTA_ADMISION, respuesta: admisionId }]

const ms = (v: number | string | null | undefined): number | null => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}
const huellaValida = (h: unknown): h is string => typeof h === 'string' && h.length > 0

export function estadoParq(filas: FilaAdmision[] | null | undefined): EstadoParq {
  const lista = Array.isArray(filas) ? filas : []
  const admisiones = lista.filter(f => f && f.tipo === 'intake').sort((a, b) => (ms(b.createdAt) ?? 0) - (ms(a.createdAt) ?? 0))
  const ultima = admisiones[0]
  if (!ultima) return { nivel: 'ninguno', admisionEn: null, admisionId: null, huella: null, revisadoEn: null, revisado: false, pendienteDeRevisar: false, retenido: false }
  const huella = huellaValida(ultima.huella) ? ultima.huella : null
  const nivel = nivelParqGuardado(ultima.respuestas)
  const revisiones = huella === null ? [] : lista
    .filter(f => f && f.tipo === 'parq_revisado' && f.huella === huella)
    .map(f => ms(f.createdAt) ?? 0)
    .sort((a, b) => b - a)
  const revisadoEn = revisiones.length ? revisiones[0] : null
  const revisado = revisadoEn !== null
  return { nivel, admisionEn: ms(ultima.createdAt), admisionId: ultima.id ?? null, huella, revisadoEn, revisado, pendienteDeRevisar: GRAVEDAD_PARQ[nivel] > 0 && !revisado, retenido: nivel === 'alarma' && !revisado }
}
