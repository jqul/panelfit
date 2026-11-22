// Estado del cuestionario de salud de un cliente: su nivel (lib/intakeQuestions) y si el entrenador ya lo ha revisado. Sin React ni red.
//
// Dónde vive: la ficha de admisión es una fila de `checkins` con tipo 'intake'; cuando el entrenador la revisa, deja otra con tipo 'parq_revisado' (sin respuestas).
// Así no hace falta una columna nueva en `clientes` (que obligaría a rehacer `get_client_by_token`). «Revisado» es lo posterior a la última ficha: si el cliente vuelve
// a rellenarla, hay que volver a revisarla.
//
// Qué hace el nivel `alarma` sin revisar: RETIENE el cuestionario de programación del cliente (ni se abre solo, ni sale en Hoy, ni en su pestaña) y le sale una
// fila al entrenador en «Decisión de hoy». Es una pauta de seguridad y de trato, no una barrera técnica: el cliente puede escribir en sus propias filas de `checkins`.
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
  /** Cuándo la revisó el entrenador (ms): la última marca posterior a la ficha. */
  revisadoEn: number | null
  revisado: boolean
  /** Hay algo que el entrenador debe mirar: nivel por encima de «ninguno» y sin revisar. */
  pendienteDeRevisar: boolean
  /** El cuestionario de programación queda en espera: nivel «alarma» sin revisar. */
  retenido: boolean
}

const ms = (v: number | string | null | undefined): number | null => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

export function estadoParq(filas: FilaAdmision[] | null | undefined): EstadoParq {
  const lista = Array.isArray(filas) ? filas : []
  const admisiones = lista.filter(f => f && f.tipo === 'intake').sort((a, b) => (ms(b.createdAt) ?? 0) - (ms(a.createdAt) ?? 0))
  const ultima = admisiones[0]
  if (!ultima) return { nivel: 'ninguno', admisionEn: null, revisadoEn: null, revisado: false, pendienteDeRevisar: false, retenido: false }
  const admisionEn = ms(ultima.createdAt)
  const nivel = nivelParqGuardado(ultima.respuestas)
  const revisiones = lista
    .filter(f => f && f.tipo === 'parq_revisado').map(f => ms(f.createdAt)).filter((t): t is number => t !== null && (admisionEn === null || t >= admisionEn))
    .sort((a, b) => b - a)
  const revisadoEn = revisiones[0] ?? null
  const revisado = revisadoEn !== null
  return { nivel, admisionEn, revisadoEn, revisado, pendienteDeRevisar: GRAVEDAD_PARQ[nivel] > 0 && !revisado, retenido: nivel === 'alarma' && !revisado }
}
