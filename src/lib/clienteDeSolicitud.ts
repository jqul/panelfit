// Al convertir una solicitud de programación inicial en cliente, qué se le rellena al formulario de «Nuevo cliente» con lo que la persona ya contestó,
// para no teclear otra vez lo mismo. Sin React ni red.
//
// Solo se propone (el entrenador lo ve y lo puede cambiar antes de crear la ficha) y solo lo imprescindible de la ficha: el objetivo, la altura y el peso.
// Las demás respuestas de salud (molestias, sueño, estrés, lo que prefiere evitar…) y el PAR-Q se quedan en la solicitud, solo para el entrenador.
// Altura y peso son respuestas de salud en el cuestionario: solo existen con el consentimiento de salud, que dice que se usan «para preparar mi programa»,
// y aquí solo pasan a la ficha si el entrenador crea el cliente. No se inventa nada que no se preguntó: el género y la fecha de nacimiento no están en la
// solicitud (solo la edad en años) y se quedan para el entrenador.

/** Objetivo de la solicitud (las opciones de `lib/modelosEncuesta`) → objetivo de la ficha del cliente. Lo desconocido o «Otro» se queda en «general». */
export const OBJETIVO_DE_SOLICITUD: Record<string, string> = {
  'Ganar músculo': 'hipertrofia',
  'Perder grasa': 'perdida_grasa',
  'Ganar fuerza': 'fuerza',
  'Rendimiento deportivo': 'rendimiento',
  'Salud y forma general': 'general',
  'Otro': 'general',
}

export interface DatosClienteDeSolicitud {
  /** Solo lo que se pudo leer con sentido; el resto no se toca. */
  campos: { objetivo?: string; altura?: string; peso?: string }
  /** Para decirle al entrenador qué se rellenó: «objetivo», «altura», «peso». */
  rellenados: string[]
  /** La edad en años que dijo (solo una pista junto a «Nacimiento»: la fecha no se inventa). */
  edad: number | null
}

const numero = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : NaN
  return Number.isFinite(n) ? n : null
}
/** 78.5 → «78.5»; 78 → «78» (sin ceros de más). */
const texto = (n: number) => String(Math.round(n * 10) / 10)

export function datosClienteDeSolicitud(s: { consentimiento_salud?: boolean; respuestas?: Record<string, unknown> | null } | null | undefined): DatosClienteDeSolicitud {
  const vacio: DatosClienteDeSolicitud = { campos: {}, rellenados: [], edad: null }
  if (!s || !s.respuestas || typeof s.respuestas !== 'object') return vacio
  const r = s.respuestas
  const campos: DatosClienteDeSolicitud['campos'] = {}
  const rellenados: string[] = []

  const objetivo = typeof r.objetivo === 'string' ? OBJETIVO_DE_SOLICITUD[r.objetivo.trim()] : undefined
  if (objetivo) { campos.objetivo = objetivo; rellenados.push('objetivo') }

  // Lo de salud, solo con el consentimiento de salud (sin él la solicitud ni lo guarda) y dentro de los mismos límites que valida la base de datos
  let edad: number | null = null
  if (s.consentimiento_salud === true) {
    const altura = numero(r.altura); const peso = numero(r.peso); const e = numero(r.edad)
    if (altura !== null && altura >= 100 && altura <= 250) { campos.altura = texto(altura); rellenados.push('altura') }
    if (peso !== null && peso >= 20 && peso <= 400) { campos.peso = texto(peso); rellenados.push('peso') }
    if (e !== null && e >= 18 && e <= 100) edad = Math.round(e)
  }
  return { campos, rellenados, edad }
}

/** «objetivo, altura y peso» */
export function listaRellenados(rellenados: string[]): string {
  return rellenados.length <= 1 ? rellenados.join('') : `${rellenados.slice(0, -1).join(', ')} y ${rellenados[rellenados.length - 1]}`
}

/** La etiqueta que marca a quien se lleva con Coach IA. Se busca por nombre (sin mayúsculas ni espacios de más) y, si no existe, se crea al crear el cliente. */
export const ETIQUETA_COACH_IA = { name: 'Coach IA', emoji: '🤖', color: '#8b5cf6' } as const
export const esEtiquetaCoachIa = (nombre: string) => nombre.trim().toLowerCase().replace(/\s+/g, ' ') === 'coach ia'
