// Solicitud de programación inicial por enlace público: lo que comparten la página pública, la lista de enlaces del entrenador y
// el detalle de la solicitud. Sin React ni red: se puede probar. La lógica de verdad (límites, alarma del PAR-Q, consentimiento)
// vive en la base de datos (migración 20261118000020); aquí solo se refleja para enseñarla.

import { PARQ_QUESTIONS } from './intakeQuestions'
import { MODELO_PROGRAMACION_INICIAL } from './modelosEncuesta'
import { respondida, textoRespuesta, type Pregunta } from './cuestionarios'

/** 32 caracteres hexadecimales: lo que genera la base de datos. Cualquier otra cosa en la URL no consulta nada. */
export const SLUG_PROGRAMACION = /^[0-9a-f]{32}$/
export const rutaProgramacion = (slug: string) => `/programacion/${slug}`
export const urlProgramacion = (origen: string, slug: string) => `${origen}${rutaProgramacion(slug)}`
/** El slug de una ruta `/programacion/<slug>`, o null si no tiene esa forma. */
export function slugDeRuta(pathname: string): string | null {
  const m = pathname.match(/^\/programacion\/([0-9a-f]{32})\/?$/)
  return m ? m[1] : null
}

// ── Enlaces ──
export interface EnlaceProgramacion {
  id: string; trainer_id: string; nombre: string; slug: string
  caduca_en: string | null; max_usos: number | null; un_solo_uso: boolean; mostrar_foto: boolean
  activo: boolean; usos: number; ultimo_uso_en: string | null; creado_en: string
  revocado_en: string | null; revocado_por: string | null
}
export type EstadoEnlace = 'activo' | 'revocado' | 'caducado' | 'agotado'

/** Cuántos usos admite: uno si es de un solo uso; si no, el límite (o ninguno). Igual que la base de datos. */
export const usosMaximos = (e: Pick<EnlaceProgramacion, 'un_solo_uso' | 'max_usos'>): number | null => (e.un_solo_uso ? 1 : e.max_usos)

/** Revocado, caducado o agotado: no acepta envíos ni enseña nada. */
export function estadoEnlace(e: Pick<EnlaceProgramacion, 'activo' | 'caduca_en' | 'usos' | 'un_solo_uso' | 'max_usos'>, ahora = Date.now()): EstadoEnlace {
  if (!e.activo) return 'revocado'
  if (e.caduca_en && new Date(e.caduca_en).getTime() <= ahora) return 'caducado'
  const max = usosMaximos(e)
  if (max !== null && e.usos >= max) return 'agotado'
  return 'activo'
}
export const ETIQUETA_ESTADO_ENLACE: Record<EstadoEnlace, string> = { activo: 'Activo', revocado: 'Revocado', caducado: 'Caducado', agotado: 'Agotado' }

export function textoUsos(e: Pick<EnlaceProgramacion, 'usos' | 'un_solo_uso' | 'max_usos'>): string {
  const max = usosMaximos(e)
  return max === null ? `${e.usos} ${e.usos === 1 ? 'uso' : 'usos'}` : `${e.usos} de ${max} ${max === 1 ? 'uso' : 'usos'}`
}

export function textoCaducidad(e: Pick<EnlaceProgramacion, 'caduca_en'>, ahora = Date.now()): string {
  if (!e.caduca_en) return 'Sin caducidad'
  const t = new Date(e.caduca_en).getTime()
  const dias = Math.ceil((t - ahora) / 86400000)
  if (t <= ahora) return `Caducó el ${new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
  return dias <= 1 ? 'Caduca hoy o mañana' : `Caduca en ${dias} días`
}

// ── PAR-Q ──
/** Preguntas del PAR-Q que paran el borrador: problema cardiaco, dolor torácico (al hacer ejercicio y en reposo) y mareo con pérdida de conocimiento. */
export const PARQ_ALARMA_INDICES = [0, 1, 2, 3]
export const hayAlarmaParq = (parq: (boolean | null)[] | null | undefined) => !!parq && PARQ_ALARMA_INDICES.some(i => parq[i] === true)

/** El PAR-Q guardado, pregunta por pregunta, con las de alarma marcadas. */
export function filasParq(parq: (boolean | null)[] | null | undefined): { pregunta: string; respuesta: 'Sí' | 'No'; alarma: boolean }[] {
  if (!parq) return []
  return PARQ_QUESTIONS.map((pregunta, i) => ({ pregunta, respuesta: parq[i] === true ? 'Sí' : 'No', alarma: PARQ_ALARMA_INDICES.includes(i) && parq[i] === true }))
}

// ── Textos públicos (no hablan de IA, de automatismos ni de plazos) ──
// Subir la versión con cualquier cambio de fondo en los textos de consentimiento (2026-11-2: se añade el plazo de 60 días)
export const CONSENT_PROGRAMACION_VERSION = 'prog-2026-11-2'
/** Cuánto se conserva una solicitud que no llega a cliente (la tarea semanal de la base de datos la borra; el entrenador puede autorizar seguimiento). */
export const DIAS_RETENCION_SOLICITUD = 60
export const POLITICA_RETENCION = `Las solicitudes que no llegan a convertirse en cliente se eliminan a los ${DIAS_RETENCION_SOLICITUD} días.`
export const CONSENT_SALUD_PROGRAMACION =
  'Consiento que mi entrenador trate los datos de salud que le doy aquí (cuestionario de salud, molestias, peso, estatura, edad, sueño y estrés) ' +
  'para preparar mi programa. Solo los ve él, no se ceden a terceros salvo a los proveedores técnicos que alojan la aplicación, y si no llego a ser su cliente se eliminan a los ' +
  `${DIAS_RETENCION_SOLICITUD} días. ` +
  'Sin este consentimiento no guardo esas respuestas y mi solicitud llega solo con lo demás.'
export const CONSENT_ASISTENTE_PROGRAMACION =
  'Consiento que mi entrenador use una herramienta de apoyo para preparar la propuesta con mis respuestas. Él la revisa y decide: nada se me da sin su revisión.'
export const AVISO_NO_MEDICO = 'Esto no es consejo médico ni sustituye una valoración profesional. Si tienes dudas sobre tu salud, consulta antes con tu médico.'
export const MENSAJE_RECIBIDA = 'Tu entrenador revisará tu solicitud y preparará una propuesta personalizada.'
export const MENSAJE_REVISAR = 'Tu solicitud necesita revisión personal del entrenador antes de programar.'
export const INCLUYE_PROGRAMACION = [
  'Unas preguntas sobre tu objetivo, tu tiempo y tu material.',
  'Un cuestionario de salud de 7 preguntas.',
  'Tu entrenador lo revisa y te prepara una propuesta a medida.',
]

// ── Respuestas ──
/** V1: solo mayores de 18 (un menor exigiría el consentimiento de su tutor). La edad se pide SIEMPRE, también sin consentimiento de salud: la base de datos la comprueba y, sin consentimiento, no la guarda. */
export const EDAD_MINIMA = 18
export const ETIQUETA_EDAD = 'Edad (esta solicitud es solo para mayores de 18 años)'
export const AVISO_SOLO_ADULTOS = 'Esta solicitud es solo para mayores de 18 años'
export const PREGUNTAS_PROGRAMACION: Pregunta[] = MODELO_PROGRAMACION_INICIAL.questions.map(q => q.id === 'edad' ? { ...q, required: true, label: ETIQUETA_EDAD } : q)

/** ¿Es mayor de edad según lo escrito? (null si no ha contestado o no es un número). */
export function esMayorDeEdad(valor: unknown): boolean | null {
  const n = typeof valor === 'number' ? valor : parseFloat(String(valor ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n >= EDAD_MINIMA : null
}

/** Las preguntas de salud del modelo: solo se piden y se guardan con consentimiento de salud (igual que la columna «es de salud» de la migración). */
export const IDS_SALUD = ['rechaza', 'molestias', 'molestias_detalle', 'peso', 'altura', 'edad', 'fase', 'sueno', 'estres']

/** Lo que se envía: sin las preguntas vacías (la base de datos descarta lo desconocido y valida el resto). */
export function respuestasParaEnvio(valores: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(PREGUNTAS_PROGRAMACION.filter(q => respondida(valores[q.id])).map(q => [q.id, valores[q.id]]))
}

/** Las respuestas guardadas, con la pregunta delante y legibles, en el orden del modelo. */
export function filasRespuestas(respuestas: Record<string, unknown> | null | undefined): { pregunta: string; respuesta: string }[] {
  const r = respuestas ?? {}
  return PREGUNTAS_PROGRAMACION.filter(q => respondida(r[q.id])).map(q => ({ pregunta: q.label, respuesta: textoRespuesta(q, r[q.id]) }))
}

// ── Solicitud (lo que lee el entrenador) y su borrador ──
export type EstadoBorrador = 'sin_generar' | 'listo_para_revisar' | 'aprobado' | 'descartado'
export const ETIQUETA_BORRADOR: Record<EstadoBorrador, string> = {
  sin_generar: 'Sin generar', listo_para_revisar: 'Listo para revisar', aprobado: 'Aprobado', descartado: 'Descartado',
}
export interface SolicitudProgramacion {
  lead_id: string; client_id: string | null
  /** El entrenador la conserva más allá de los 60 días a propósito (si no, la purga semanal la borra). */
  seguimiento_autorizado: boolean
  consentimiento_salud: boolean; consentimiento_asistente: boolean; consentimiento_version: string; consentimiento_en: string
  respuestas: Record<string, unknown>; parq: (boolean | null)[] | null; parq_alarma: boolean; preparar_borrador: boolean
  borrador_estado: EstadoBorrador; propuesta: { weeks?: unknown[] } | null; razones: { decision: string; porque: string }[] | null; criterios_version: string | null
  created_at: string
}

/** El plan propuesto, listo para dejarlo como borrador del cliente, solo si el entrenador lo ha aprobado. Si no, null. */
export function planBorradorDe(s: Pick<SolicitudProgramacion, 'borrador_estado' | 'propuesta'> | null | undefined, clientId: string): Record<string, unknown> | null {
  if (!s || s.borrador_estado !== 'aprobado' || !s.propuesta || !Array.isArray(s.propuesta.weeks) || s.propuesta.weeks.length === 0) return null
  return { ...s.propuesta, clientId }
}

/** Lo único que pasa del lead al cliente al convertirlo: lo que el alta ya pide (nombre y contacto) y, en sus notas privadas, de dónde viene.
 *  Las respuestas de salud, el PAR-Q y el borrador se quedan en la solicitud, solo para el entrenador. */
export function notasDeSolicitud(l: { email: string | null; phone: string | null; created_at: number }): string {
  const dia = new Date(l.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  return [`Solicitud de programación inicial (${dia}).`, l.email && `Correo: ${l.email}`, l.phone && `Teléfono: ${l.phone}`].filter(Boolean).join('\n')
}
