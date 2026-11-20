// «Decisión de hoy»: la lista corta de lo que el entrenador debería mirar HOY, de todos sus clientes. No inventa ninguna métrica: junta lo que
// ya existe —solicitudes por enlace, molestias, check-ins, decisiones vencidas, calibración, evidencia de descarga, adherencia, progresiones
// orientativas y récords— y lo ordena. Cada fila responde cuatro preguntas: quién, qué necesita, por qué ahora y cuál es la siguiente acción
// SEGURA (abrir la pantalla donde decide él: mirar, revisar, escribir). Nunca cambia un plan, nunca diagnostica y no repite el veredicto de
// ninguna política: si algo está en un contexto atípico (ausencia, adherencia baja, calibración), el rendimiento no se interpreta. Los pocos
// criterios propios viven en UNA política con versión (provisional: la beta con clientes reales los ajustará). Sin React ni red.

import type { Destino } from './atencionCliente'
import type { EvidenciaDescarga } from './evidenciaDescarga'
import { POLITICA_DESCARGA } from './evidenciaDescarga'

export type CategoriaDecision =
  | 'solicitud-revision' | 'molestia-fuerte' | 'solicitud' | 'molestia' | 'checkin' | 'decision' | 'calibracion'
  | 'descarga' | 'adherencia' | 'progresion' | 'felicitar'
export type NivelDecision = 'atender' | 'revisar' | 'bien'

export interface PoliticaDecisionHoy {
  version: string
  /** Orden de las categorías, de lo que más urge a lo que menos (menor = antes). */
  orden: Record<CategoriaDecision, number>
  nivel: Record<CategoriaDecision, NivelDecision>
  /** Molestia articular (0-10) que se considera fuerte, y desde la que se enseña. Mismos umbrales que la Bandeja y la revisión semanal. */
  molestiaFuerte: number
  molestiaMin: number
  /** Adherencia (% de lo previsto) desde la que se felicita, sobre las últimas semanas completas con ese número mínimo de semanas. */
  adherenciaFelicitarPct: number
  semanasFelicitar: number
  /** Filas que se enseñan sin pedirlo. */
  visibles: number
}

export const POLITICA_DECISION_HOY: PoliticaDecisionHoy = {
  version: 'hoy-v0-provisional-2026-11',
  orden: { 'solicitud-revision': 10, 'molestia-fuerte': 20, solicitud: 30, molestia: 40, checkin: 50, decision: 60, calibracion: 70, descarga: 80, adherencia: 90, progresion: 100, felicitar: 110 },
  nivel: { 'solicitud-revision': 'atender', 'molestia-fuerte': 'atender', solicitud: 'revisar', molestia: 'revisar', checkin: 'revisar', decision: 'revisar', calibracion: 'revisar', descarga: 'revisar', adherencia: 'revisar', progresion: 'bien', felicitar: 'bien' },
  molestiaFuerte: 7,
  molestiaMin: 4,
  adherenciaFelicitarPct: 90,
  semanasFelicitar: 3,
  visibles: 8,
}

export type DestinoTarea =
  | { tipo: 'contactos' }
  | { tipo: 'ficha'; clienteId: string; destino: Destino }

export interface Tarea {
  id: string
  categoria: CategoriaDecision
  nivel: NivelDecision
  prioridad: number
  /** A igual prioridad, antes la de mayor valor (la molestia más fuerte); sin él, por nombre. */
  gravedad?: number
  /** Quién: el cliente o la persona que ha enviado la solicitud. */
  quien: string
  clienteId: string | null
  /** Qué necesita. */
  necesita: string
  /** Por qué ahora. */
  porque: string
  /** Siguiente acción segura: el texto del botón que abre la pantalla donde decide el entrenador. */
  accion: string
  destino: DestinoTarea
}

export interface EntradaSolicitud {
  id: string
  nombre: string
  /** Solicitud de programación inicial con una respuesta de alarma en el PAR-Q (estado «revisar»). */
  revisionPersonal: boolean
  /** Días enteros esperando respuesta. */
  diasEsperando: number
  esSolicitud: boolean
}

export interface EntradaClienteHoy {
  id: string
  nombre: string
  /** De viaje, lesionado…: no se le reclama nada por no entrenar. */
  ausente: boolean
  molestias: { zona: string; intensidad: number }[]
  /** «sueño 2/5, energía 1/5», o null si no hay check-in bajo. */
  checkinBajo: string | null
  calibracionPorRevisar: number
  decisionesPorRevisar: number
  progresionesListas: string[]
  records: string[]
  /** La lectura de evidencia de «¿Puede tocar descarga?»; null si no tiene plan. */
  descarga: EvidenciaDescarga | null
}

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios)
const lista = (xs: string[]) => `${xs.slice(0, 2).join(', ')}${xs.length > 2 ? ` y ${xs.length - 2} más` : ''}`
const dias = (n: number) => `${n} ${plural(n, 'día', 'días')}`

export function tareasDeSolicitud(s: EntradaSolicitud, p: PoliticaDecisionHoy = POLITICA_DECISION_HOY): Tarea[] {
  const categoria: CategoriaDecision = s.revisionPersonal ? 'solicitud-revision' : 'solicitud'
  const espera = s.diasEsperando >= 1 ? `Lleva ${dias(s.diasEsperando)} sin contestar` : 'Acaba de llegar'
  return [{
    id: `sol:${s.id}`, categoria, nivel: p.nivel[categoria], prioridad: p.orden[categoria], quien: s.nombre, clienteId: null,
    necesita: s.revisionPersonal ? 'Revisar tú la solicitud antes de programar nada' : s.esSolicitud ? 'Contestar la solicitud de programación' : 'Contestar el contacto',
    porque: s.revisionPersonal ? 'Una respuesta del cuestionario de salud pide tu revisión personal. ' + espera : espera,
    accion: 'Abrir la solicitud', destino: { tipo: 'contactos' },
  }]
}

export function tareasDeCliente(c: EntradaClienteHoy, p: PoliticaDecisionHoy = POLITICA_DECISION_HOY): Tarea[] {
  const out: Tarea[] = []
  const nueva = (categoria: CategoriaDecision, t: Pick<Tarea, 'necesita' | 'porque' | 'accion' | 'gravedad'> & { destino: Destino }) =>
    out.push({ id: `${categoria}:${c.id}`, categoria, nivel: p.nivel[categoria], prioridad: p.orden[categoria], gravedad: t.gravedad, quien: c.nombre, clienteId: c.id, necesita: t.necesita, porque: t.porque, accion: t.accion, destino: { tipo: 'ficha', clienteId: c.id, destino: t.destino } })

  const peor = c.molestias.filter(m => m.intensidad >= p.molestiaMin).reduce<{ zona: string; intensidad: number } | null>((a, m) => (!a || m.intensidad > a.intensidad ? m : a), null)
  if (peor) {
    nueva(peor.intensidad >= p.molestiaFuerte ? 'molestia-fuerte' : 'molestia', {
      necesita: `Mirar la molestia de ${peor.zona.toLowerCase()}`, porque: `Ha registrado ${peor.intensidad}/10 en los últimos 7 días`,
      accion: 'Abrir su registro de dolor', gravedad: peor.intensidad, destino: { tab: 'progreso', seccion: 'dolor' },
    })
  }
  if (c.checkinBajo) nueva('checkin', { necesita: 'Mirar su check-in', porque: `Lo ha marcado bajo: ${c.checkinBajo}`, accion: 'Ver su fatiga y check-ins', destino: { tab: 'progreso', seccion: 'fatiga' } })
  if (c.decisionesPorRevisar > 0) {
    nueva('decision', {
      necesita: `Revisar ${c.decisionesPorRevisar === 1 ? 'una decisión anotada' : `${c.decisionesPorRevisar} decisiones anotadas`}`, porque: 'El plazo que te pusiste para volver a mirarla ya ha llegado',
      accion: 'Ver qué pasó desde la decisión', destino: { tab: 'progreso', seccion: 'estancamiento' },
    })
  }
  if (c.calibracionPorRevisar > 0) {
    nueva('calibracion', {
      necesita: `Confirmar las cargas de ${c.calibracionPorRevisar} ${plural(c.calibracionPorRevisar, 'ejercicio', 'ejercicios')}`, porque: 'Ya ha entrenado la primera semana; hasta que lo confirmes, su rendimiento no se interpreta',
      accion: 'Revisar las cargas', destino: { tab: 'perfil', seccion: 'calibracion' },
    })
  }

  const d = c.descarga
  const atipico = !!d && (d.contexto.adherenciaBaja || d.contexto.ausenteReciente >= POLITICA_DESCARGA.diasAusenciaAtipica || d.contexto.calibrando)
  // Evidencia de descarga: solo con contexto normal y confianza suficiente; es una señal a mirar, no una orden
  if (d && !c.ausente && !atipico && d.confianza !== 'baja' && d.senales.length > 0) {
    nueva('descarga', {
      necesita: 'Mirar la evidencia de carga acumulada', porque: `${d.senales[0].texto.replace(/[.\s]+$/, '')}${d.senales.length > 1 ? ` (y ${d.senales.length - 1} ${plural(d.senales.length - 1, 'señal más', 'señales más')})` : ''} · confianza ${d.confianza}`,
      accion: 'Ver la evidencia (no es un veredicto)', destino: { tab: 'progreso', seccion: 'descarga' },
    })
  }
  // Adherencia baja: se pregunta, no se supone cansancio. Una ausencia declarada o la calibración no cuentan contra el cliente
  if (d && !c.ausente && d.contexto.adherenciaBaja && d.contexto.adherenciaPct !== null && !d.contexto.calibrando) {
    nueva('adherencia', {
      necesita: 'Preguntarle cómo va con las sesiones', porque: `Hizo el ${d.contexto.adherenciaPct} % de lo previsto en ${d.contexto.semanasAdherencia === 1 ? 'la última semana completa' : `las últimas ${d.contexto.semanasAdherencia} semanas completas`}; pueden ser mil razones, no solo cansancio`,
      accion: 'Abrir sus entrenos', destino: { tab: 'entrenos' },
    })
  }
  if (c.progresionesListas.length > 0) {
    nueva('progresion', {
      necesita: 'Mirar la orientación de progresión', porque: `Hay orientación de subir en ${lista(c.progresionesListas)}; la decides tú`,
      accion: 'Abrir su progreso', destino: { tab: 'progreso' },
    })
  }
  // Felicitar: récord de la semana, o adherencia alta sostenida sin ausencias ni calibración
  const completas = d ? d.semanas.filter(s => !s.enCurso).slice(-p.semanasFelicitar) : []
  const constante = completas.length >= p.semanasFelicitar && completas.every(s => s.previstas > 0 && s.diasAusencia === 0 && (s.sesiones / s.previstas) * 100 >= p.adherenciaFelicitarPct)
  if (c.records.length > 0) {
    nueva('felicitar', { necesita: 'Felicitarle', porque: `Récord esta semana en ${lista(c.records)}`, accion: 'Abrir su progreso', destino: { tab: 'progreso' } })
  } else if (constante && !c.ausente && !c.molestias.some(m => m.intensidad >= p.molestiaMin)) {
    nueva('felicitar', { necesita: 'Felicitarle', porque: `Ha hecho todas las sesiones previstas ${p.semanasFelicitar} semanas seguidas`, accion: 'Abrir sus entrenos', destino: { tab: 'entrenos' } })
  }
  return out
}

export interface DecisionHoy {
  politicaVersion: string
  /** Todas las filas, ordenadas. */
  tareas: Tarea[]
  /** Las que se enseñan sin pedirlo (la política fija cuántas), y cuántas quedan. */
  visibles: Tarea[]
  restantes: number
  /** Cuántas hay para atender, para revisar y que van bien. */
  resumen: Record<NivelDecision, number>
}

export function decisionHoy(clientes: EntradaClienteHoy[], solicitudes: EntradaSolicitud[], p: PoliticaDecisionHoy = POLITICA_DECISION_HOY): DecisionHoy {
  const tareas = [...solicitudes.flatMap(s => tareasDeSolicitud(s, p)), ...clientes.flatMap(c => tareasDeCliente(c, p))]
    .sort((a, b) => a.prioridad - b.prioridad || (b.gravedad ?? 0) - (a.gravedad ?? 0) || a.quien.localeCompare(b.quien, 'es'))
  const resumen: Record<NivelDecision, number> = { atender: 0, revisar: 0, bien: 0 }
  for (const t of tareas) resumen[t.nivel]++
  return { politicaVersion: p.version, tareas, visibles: tareas.slice(0, p.visibles), restantes: Math.max(0, tareas.length - p.visibles), resumen }
}
