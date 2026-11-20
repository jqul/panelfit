// Revisión semanal de todos los clientes: una sola pasada que junta lo que hay que mirar de cada uno esta semana —sesiones, molestias,
// check-ins, calibración pendiente, decisiones por revisar, progresiones listas, récords— y propone UNA acción rápida (mensaje, abrir la
// ficha). Una fila por cliente, ordenada: atender (molestia fuerte), revisar y bien. Es una lista derivada de lo que ya hay: no guarda nada
// (salvo qué ha marcado como revisado el entrenador) ni decide por él. No habla de estancamiento ni de descarga. Sin React ni red.

export type NivelRevision = 'atender' | 'revisar' | 'bien'
export type IdSenal = 'molestia' | 'checkin' | 'calibracion' | 'decision' | 'progresion' | 'sesiones' | 'inactivo' | 'sin-plan' | 'record'

export interface Senal { id: IdSenal; texto: string; nivel: NivelRevision }

export interface EntradaRevision {
  id: string
  /** Nombre de pila para saludar («María»), no nombre y apellidos. */
  nombrePila: string
  nombreCompleto: string
  tienePlan: boolean
  /** Días distintos entrenados de lunes a hoy y días con ejercicios en la semana del plan. */
  sesionesHechas: number
  sesionesPrevistas: number
  /** 1 = lunes … 7 = domingo. Un 0/3 un lunes es normal; un jueves, no. */
  diaSemana: number
  diasSinEntrenar: number | null
  /** De viaje, lesionado…: no se le regaña por no entrenar. */
  ausente: boolean
  records: string[]
  /** Molestias articulares de los últimos 7 días (no agujetas). */
  molestias: { zona: string; intensidad: number }[]
  checkinBajo: boolean
  /** Ejercicios de la primera semana (calibración) cuyas cargas aún no ha confirmado. */
  calibracionPorRevisar: number
  decisionesPorRevisar: number
  /** Ejercicios con una orientación «subir» no provisional (lib/recomendacionProgresion). */
  progresionesListas: string[]
}

export interface MensajeSugerido { motivo: string; texto: string }
export interface FilaRevision {
  id: string
  nombre: string
  nivel: NivelRevision
  /** «3/3 sesiones», o «Sin plan». */
  sesiones: string
  senales: Senal[]
  mensaje: MensajeSugerido | null
}

export const MOLESTIA_ATENDER = 7   // por encima, no debería esperar
export const MOLESTIA_REVISAR = 4   // por debajo es más ruido que señal (mismo umbral que la Bandeja)
export const DIAS_INACTIVO = 7
const RANGO: Record<NivelRevision, number> = { atender: 0, revisar: 1, bien: 2 }
const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios)

export function filaRevision(e: EntradaRevision): FilaRevision {
  const senales: Senal[] = []
  let mensaje: MensajeSugerido | null = null
  const sugerir = (m: MensajeSugerido) => { if (!mensaje) mensaje = m } // la primera razón (la más importante) manda

  const peor = e.molestias.reduce<{ zona: string; intensidad: number } | null>((a, m) => (!a || m.intensidad > a.intensidad ? m : a), null)
  if (peor && peor.intensidad >= MOLESTIA_REVISAR) {
    senales.push({ id: 'molestia', nivel: peor.intensidad >= MOLESTIA_ATENDER ? 'atender' : 'revisar', texto: `Molestia en ${peor.zona} (${peor.intensidad}/10)` })
    sugerir({ motivo: 'Molestia', texto: `Hola ${e.nombrePila}, ¿cómo va la molestia de ${peor.zona.toLowerCase()}? Cuéntame cómo la notas al entrenar.` })
  }
  if (e.checkinBajo) senales.push({ id: 'checkin', nivel: 'revisar', texto: 'Check-in bajo esta semana' })
  if (e.calibracionPorRevisar > 0) senales.push({ id: 'calibracion', nivel: 'revisar', texto: `Primera semana: revisar las cargas de ${e.calibracionPorRevisar} ${plural(e.calibracionPorRevisar, 'ejercicio', 'ejercicios')}` })
  if (e.decisionesPorRevisar > 0) senales.push({ id: 'decision', nivel: 'revisar', texto: `${e.decisionesPorRevisar} ${plural(e.decisionesPorRevisar, 'decisión', 'decisiones')} por revisar` })

  if (!e.tienePlan) {
    senales.push({ id: 'sin-plan', nivel: 'revisar', texto: 'Sin plan asignado' })
  } else if (!e.ausente) {
    if (e.diasSinEntrenar !== null && e.diasSinEntrenar >= DIAS_INACTIVO) {
      senales.push({ id: 'inactivo', nivel: 'revisar', texto: `Lleva ${e.diasSinEntrenar} días sin entrenar` })
      sugerir({ motivo: 'Recordar el plan', texto: `Hola ${e.nombrePila}, hace unos días que no te veo por el plan. ¿Qué tal vas? Si te cuesta algo, lo ajustamos.` })
    } else if (e.sesionesPrevistas > 0 && e.diaSemana >= 4 && e.sesionesHechas * 2 < e.sesionesPrevistas) {
      // Un 0/3 un lunes es normal; a partir del jueves, con menos de la mitad, hay que mirarlo
      senales.push({ id: 'sesiones', nivel: 'revisar', texto: `Va ${e.sesionesHechas} de ${e.sesionesPrevistas} sesiones` })
      sugerir({ motivo: 'Recordar el plan', texto: `Hola ${e.nombrePila}, esta semana llevas ${e.sesionesHechas} de ${e.sesionesPrevistas} sesiones. ¿Te cuadra hacer las que faltan antes del domingo?` })
    }
  }

  if (e.progresionesListas.length) senales.push({ id: 'progresion', nivel: 'bien', texto: `Listo para subir (orientación): ${e.progresionesListas.slice(0, 2).join(', ')}${e.progresionesListas.length > 2 ? ` y ${e.progresionesListas.length - 2} más` : ''}` })
  if (e.records.length) {
    senales.push({ id: 'record', nivel: 'bien', texto: `Récord en ${e.records.slice(0, 2).join(', ')}${e.records.length > 2 ? ` y ${e.records.length - 2} más` : ''}` })
    sugerir({ motivo: 'Felicitar', texto: `¡Enhorabuena ${e.nombrePila}! Récord esta semana en ${e.records[0].toLowerCase()}. Buen trabajo 💪` })
  }

  const nivel = senales.reduce<NivelRevision>((n, s) => (RANGO[s.nivel] < RANGO[n] ? s.nivel : n), 'bien')
  return {
    id: e.id, nombre: e.nombreCompleto, nivel,
    sesiones: e.tienePlan ? `${e.sesionesHechas}/${e.sesionesPrevistas} ${e.sesionesPrevistas === 1 ? 'sesión' : 'sesiones'}` : 'Sin plan',
    senales: senales.sort((a, b) => RANGO[a.nivel] - RANGO[b.nivel]),
    mensaje,
  }
}

/** Todas las filas, de lo que más urge a lo que va bien (y por nombre dentro de cada nivel). */
export function revisionSemanal(entradas: EntradaRevision[]): FilaRevision[] {
  return entradas.map(filaRevision).sort((a, b) => RANGO[a.nivel] - RANGO[b.nivel] || b.senales.length - a.senales.length || a.nombre.localeCompare(b.nombre, 'es'))
}

/** Resumen de la cabecera: cuántos clientes en cada nivel. */
export function resumenRevision(filas: FilaRevision[]): Record<NivelRevision, number> {
  const r: Record<NivelRevision, number> = { atender: 0, revisar: 0, bien: 0 }
  for (const f of filas) r[f.nivel]++
  return r
}

/** Clave de la semana (el lunes) para recordar qué se marcó como revisado: la semana que viene vuelve a salir. */
export function claveSemana(hoy: string): string {
  const d = new Date(hoy + 'T12:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
