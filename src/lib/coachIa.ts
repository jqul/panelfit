// Coach IA beta: cuándo un caso (solicitud de programación) puede prepararse sin revisión profesional previa y en qué estado está su borrador.
// Sin React ni red. La regla de verdad vive en la base de datos (migración 20261121000010: `coach_ia_motivo_revision`), que es lo que de
// verdad impide guardar un borrador; aquí solo se refleja para ENSEÑARLA, en el mismo orden. Una prueba de Vitest comprueba que los
// motivos y los topes coinciden con el SQL: si cambias uno, cambia el otro.
//
// El flujo es semiautomático y sin coste por llamada: el entrenador abre Claude y lanza la tarea; Claude lee UN caso (nombre de pila,
// respuestas sin molestias, criterios del entrenador; nunca el PAR-Q), guarda un borrador «listo para revisar» y el entrenador lo
// aprueba o lo descarta. Nada se publica solo: al convertir en cliente, lo aprobado queda como BORRADOR de su plan.

import { PREGUNTAS_PROGRAMACION, type SolicitudProgramacion } from './solicitudProgramacion'

/** Criterios provisionales: se ajustan con la beta real (como `prog-v0`, `desc-v0`, `rev-v0` y `hoy-v0`). */
export const POLITICA_COACH_IA = {
  version: 'coach-ia-v0-provisional-2026-11',
  /** Casos con borrador listo o aprobado y sin convertir en cliente, por entrenador. */
  maxCasosPendientes: 5,
  /** Límites de lo que la base de datos acepta como propuesta. */
  maxSemanas: 16,
  maxDiasSemana: 7,
  maxEjerciciosDia: 14,
  maxRazones: 30,
} as const

/** Por qué NO se prepara un borrador. Mismos códigos que devuelve `coach_ia_motivo_revision` (y `cupo_completo` / `ya_aprobado` del paquete). */
export const MOTIVOS = [
  'ya_es_cliente', 'sin_consentimiento_salud', 'sin_consentimiento_asistente', 'alarma_parq', 'parq_con_si',
  'datos_incompletos', 'molestias', 'datos_contradictorios', 'edad',
] as const
export type MotivoRevision = (typeof MOTIVOS)[number]

/** Los que piden que lo vea una persona con criterio profesional antes de programar nada (no son solo «faltan datos o permiso»). */
export const MOTIVOS_CLINICOS: readonly MotivoRevision[] = ['alarma_parq', 'parq_con_si', 'molestias', 'datos_contradictorios', 'datos_incompletos', 'edad']

export const TEXTO_MOTIVO: Record<MotivoRevision, string> = {
  ya_es_cliente: 'ya es cliente: su plan se prepara en su ficha',
  sin_consentimiento_salud: 'no dio su consentimiento de salud, así que no hay datos para preparar nada',
  sin_consentimiento_asistente: 'no consintió que se use una herramienta de apoyo para preparar la propuesta',
  alarma_parq: 'señal de alarma en el cuestionario de salud',
  parq_con_si: 'contestó «sí» en alguna pregunta del cuestionario de salud',
  datos_incompletos: 'faltan respuestas de salud (cuestionario o molestias) para valorar el caso',
  molestias: 'declara molestias o dolor',
  datos_contradictorios: 'dice que no tiene molestias pero describe alguna: los datos se contradicen',
  edad: 'no consta que sea mayor de 18 años',
}

type DatosCaso = Pick<SolicitudProgramacion, 'client_id' | 'consentimiento_salud' | 'consentimiento_asistente' | 'parq_alarma' | 'parq' | 'respuestas'>

/** El motivo por el que NO se prepara el borrador, o null si el caso es apto. Mismo orden que la base de datos. */
export function motivoRevision(s: DatosCaso): MotivoRevision | null {
  if (s.client_id) return 'ya_es_cliente'
  if (!s.consentimiento_salud) return 'sin_consentimiento_salud'
  if (!s.consentimiento_asistente) return 'sin_consentimiento_asistente'
  if (s.parq_alarma) return 'alarma_parq'
  if (!Array.isArray(s.parq) || s.parq.length !== 7) return 'datos_incompletos'
  if (s.parq.some(x => x === true)) return 'parq_con_si'
  const r = s.respuestas ?? {}
  if (typeof r.molestias !== 'boolean') return 'datos_incompletos'
  if (r.molestias) return 'molestias'
  if (typeof r.molestias_detalle === 'string' && r.molestias_detalle.trim() !== '') return 'datos_contradictorios'
  const edad = typeof r.edad === 'number' ? r.edad : parseFloat(String(r.edad ?? ''))
  if (!Number.isFinite(edad) || edad < 18) return 'edad'
  return null
}

export type EstadoCasoIa =
  | { tipo: 'sin_caso'; motivo: MotivoRevision }          // ya es cliente, o sin consentimiento: no hay nada que preparar
  | { tipo: 'requiere_revision'; motivo: MotivoRevision }  // plan no generado: lo ve una persona
  | { tipo: 'listo_para_preparar' }
  | { tipo: 'borrador_listo' }
  | { tipo: 'aprobado' }
  | { tipo: 'descartado' }                                 // se puede volver a preparar desde cero

export function estadoCasoIa(s: DatosCaso & Pick<SolicitudProgramacion, 'borrador_estado'>): EstadoCasoIa {
  if (s.borrador_estado === 'listo_para_revisar') return { tipo: 'borrador_listo' }
  if (s.borrador_estado === 'aprobado') return { tipo: 'aprobado' }
  const motivo = motivoRevision(s)
  if (motivo) return MOTIVOS_CLINICOS.includes(motivo) ? { tipo: 'requiere_revision', motivo } : { tipo: 'sin_caso', motivo }
  return s.borrador_estado === 'descartado' ? { tipo: 'descartado' } : { tipo: 'listo_para_preparar' }
}

/** Lo que se entregó a quien preparó el borrador, en claro. «nombre» y «criterios» no son preguntas. */
export function textoDatosEntregados(campos: string[] | null | undefined): string {
  if (!campos || campos.length === 0) return ''
  const conocidas = new Set(PREGUNTAS_PROGRAMACION.map(q => q.id))
  return campos.map(c => (c === 'nombre' ? 'nombre de pila' : c === 'criterios' ? 'tus criterios' : conocidas.has(c) ? c.replace(/_/g, ' ') : c)).join(', ')
}

// ── La propuesta, para leerla antes de decidir ──
export interface EjercicioResumen { nombre: string; series: string; peso: string; rir: string }
export interface DiaResumen { titulo: string; ejercicios: EjercicioResumen[] }
export interface SemanaResumen { etiqueta: string; dias: DiaResumen[] }

const txt = (v: unknown) => (typeof v === 'string' ? v : '')
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})

/** Las semanas de la propuesta, tolerando formas raras (nunca lanza): lo que no se entiende se omite. */
export function resumenPropuesta(propuesta: unknown): SemanaResumen[] {
  return lista(obj(propuesta).weeks).map((w, i) => {
    const sem = obj(w)
    return {
      etiqueta: txt(sem.label) || `Semana ${i + 1}`,
      dias: lista(sem.days).map((d, j) => {
        const dia = obj(d)
        return {
          titulo: [txt(dia.title) || `Día ${j + 1}`, txt(dia.focus)].filter(Boolean).join(' · '),
          ejercicios: lista(dia.exercises).map(e => {
            const ej = obj(e)
            return { nombre: txt(ej.name), series: txt(ej.sets), peso: txt(ej.weight), rir: txt(ej.rir) }
          }).filter(e => e.nombre),
        }
      }),
    }
  })
}

export const totalEjercicios = (semanas: SemanaResumen[]) => semanas.reduce((n, s) => n + s.dias.reduce((m, d) => m + d.ejercicios.length, 0), 0)
