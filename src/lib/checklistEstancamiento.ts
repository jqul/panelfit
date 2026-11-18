// Lista de comprobación ante un ejercicio que no sube: lo que dicen los datos del cliente en cada paso del protocolo (¿es real?,
// ¿se compara lo comparable?, ¿técnica?, ¿esfuerzo?, volumen y frecuencia, recuperación, peso, adherencia). NO concluye ni receta:
// separa el dato de la hipótesis y de la decisión; la decisión es del entrenador (y se anota en el diario de decisiones). Una
// meseta puntual no es un estancamiento, y varias señales a la vez no demuestran una causa. Puro, para probarlo.

import { estaEstancado } from './revisionBloque'
import type { SesionEjercicio } from './historialEjercicio'
import type { AvisoRitmo } from './ritmoPeso'

export type EstadoPaso = 'senal' | 'normal' | 'sin-datos'
export type IdPaso = 'real' | 'comparable' | 'tecnica' | 'esfuerzo' | 'cargaFija' | 'volumen' | 'recuperacion' | 'peso' | 'adherencia'
export interface PasoEstancamiento {
  id: IdPaso
  titulo: string
  /** La pregunta que hay que hacerse en este paso. */
  pregunta: string
  estado: EstadoPaso
  /** Lo que dicen los datos, sin interpretarlo. */
  dato: string
  /** Un dato a favor: lo que sugiere que NO hay un problema (p. ej. el mismo peso le cuesta menos). */
  aFavor?: boolean
}

export interface EntradaChecklist {
  /** Sesiones del ejercicio, la más reciente primero (lib/historialEjercicio). */
  sesiones: SesionEjercicio[]
  /** Sesiones recientes con vídeo de ejecución adjunto. */
  sesionesConVideo: number
  /** RIR medio real de las últimas sesiones y el previsto (null si no se registra o no hay objetivo). */
  esfuerzo: { rirMedio: number | null; objetivo: { min: number; max: number } | null }
  /** El mismo peso en varias sesiones: cómo cambia el RIR (lib/datosEstancamiento.rirACargaFija); null si no hay datos suficientes. */
  cargaFija: { peso: number; sesiones: number; desde: string; rirInicial: number; rirActual: number } | null
  /** Series y días por semana que lleva el ejercicio en las últimas semanas (null si no se puede saber). */
  carga: { seriesPorSemana: number | null; sesionesPorSemana: number | null }
  recuperacion: { checkins: number; checkinsBajos: number; molestiasArticulares: number }
  ritmoPeso: AvisoRitmo | null
  /** Hay pesajes suficientes para hablar del ritmo (si no, «falta dato», no «sin señal»). */
  hayPeso: boolean
  adherenciaPct: number | null
}

const MIN_SESIONES = 4          // para hablar de estancamiento: 3 últimas contra lo anterior (lib/revisionBloque.estaEstancado)
const ADHERENCIA_BAJA = 70      // referencia habitual, no regla
const MARGEN_CARGA_FIJA = 1     // un punto de RIR de diferencia en el mismo peso ya es un cambio apreciable
const SALTO_REPS_COMPARABLE = 3 // si la mejor serie varía más que esto entre sesiones, no se compara igual con igual
const num = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
const sesiones = (n: number) => (n === 1 ? 'sesión' : 'sesiones')

export function checklistEstancamiento(e: EntradaChecklist): PasoEstancamiento[] {
  const cron = [...e.sesiones].reverse().filter(s => s.e1rm > 0)
  const pasos: PasoEstancamiento[] = []

  // 1. ¿Es real? Varias semanas de datos, no una mala sesión
  if (cron.length < MIN_SESIONES) {
    pasos.push({ id: 'real', titulo: '¿Es real?', pregunta: '¿Hay varias semanas de datos, o es una mala sesión?', estado: 'sin-datos',
      dato: `Solo ${cron.length} ${sesiones(cron.length)} con peso: aún no se puede hablar de estancamiento.` })
  } else if (estaEstancado(e.sesiones)) {
    const antes = Math.max(...cron.slice(0, -3).map(s => s.e1rm))
    pasos.push({ id: 'real', titulo: '¿Es real?', pregunta: '¿Hay varias semanas de datos, o es una mala sesión?', estado: 'senal',
      dato: `Las 3 últimas sesiones no superan lo mejor de antes (1RM estimado ${num(antes)} kg).` })
  } else {
    pasos.push({ id: 'real', titulo: '¿Es real?', pregunta: '¿Hay varias semanas de datos, o es una mala sesión?', estado: 'normal',
      dato: 'Alguna de las 3 últimas sesiones supera lo mejor de antes: no hay estancamiento claro.' })
  }

  // 2. ¿Se compara lo comparable? Mismas reps, misma forma de apuntar
  const reps = e.sesiones.slice(0, MIN_SESIONES).map(s => s.mejor?.reps ?? 0).filter(r => r > 0)
  if (reps.length < 2) {
    pasos.push({ id: 'comparable', titulo: 'Datos comparables', pregunta: '¿Las series que comparo son de verdad comparables?', estado: 'sin-datos', dato: 'No hay series suficientes para comparar.' })
  } else {
    const min = Math.min(...reps), max = Math.max(...reps)
    pasos.push({ id: 'comparable', titulo: 'Datos comparables', pregunta: '¿Las series que comparo son de verdad comparables?',
      estado: max - min > SALTO_REPS_COMPARABLE ? 'senal' : 'normal',
      dato: max - min > SALTO_REPS_COMPARABLE
        ? `La mejor serie va de ${min} a ${max} repeticiones entre sesiones: el 1RM estimado no compara igual con igual.`
        : `La mejor serie va de ${min} a ${max} repeticiones: rango parecido.` })
  }

  // 3. Técnica y recorrido: solo se puede mirar si hay vídeo
  pasos.push({ id: 'tecnica', titulo: 'Técnica y recorrido', pregunta: '¿Se ejecuta igual (rango, pausa, tempo) que cuando subía?',
    estado: e.sesionesConVideo > 0 ? 'normal' : 'sin-datos',
    dato: e.sesionesConVideo > 0 ? `${e.sesionesConVideo} ${sesiones(e.sesionesConVideo)} con vídeo para revisarla.` : 'Sin vídeo de ejecución: la técnica y el recorrido no se pueden comprobar con estos datos.' })

  // 4. Esfuerzo: ¿se acerca al fallo lo previsto?
  const { rirMedio, objetivo } = e.esfuerzo
  if (rirMedio === null) {
    pasos.push({ id: 'esfuerzo', titulo: 'Esfuerzo', pregunta: '¿Se está acercando al fallo lo que toca?', estado: 'sin-datos', dato: 'No hay RIR registrado en estas sesiones.' })
  } else if (!objetivo) {
    pasos.push({ id: 'esfuerzo', titulo: 'Esfuerzo', pregunta: '¿Se está acercando al fallo lo que toca?', estado: 'normal', dato: `RIR medio ${num(rirMedio)}; el ejercicio no tiene RIR previsto con el que compararlo.` })
  } else {
    const lejos = rirMedio > objetivo.max + 1, cerca = rirMedio < objetivo.min - 1
    const previsto = objetivo.min === objetivo.max ? String(objetivo.min) : `${objetivo.min}-${objetivo.max}`
    pasos.push({ id: 'esfuerzo', titulo: 'Esfuerzo', pregunta: '¿Se está acercando al fallo lo que toca?', estado: lejos || cerca ? 'senal' : 'normal',
      dato: `RIR medio ${num(rirMedio)} frente a ${previsto} previsto${lejos ? ': queda más lejos del fallo de lo planeado' : cerca ? ': llega más cerca del fallo de lo planeado' : ''}.` })
  }

  // 5. Mismo peso, ¿cuánto margen le queda? El 1RM estimado no ve que un peso cueste menos
  const cf = e.cargaFija
  const preguntaFija = 'Con el mismo peso y repeticiones, ¿le queda más o menos margen que antes?'
  if (!cf) {
    pasos.push({ id: 'cargaFija', titulo: 'Mismo peso, ¿cómo se siente?', pregunta: preguntaFija, estado: 'sin-datos',
      dato: 'Hace falta el mismo peso, con RIR registrado y repeticiones parecidas, en 3 sesiones.' })
  } else {
    const cambio = cf.rirActual - cf.rirInicial
    const base = `A ${num(cf.peso)} kg (${cf.sesiones} sesiones) el RIR pasó de ${num(cf.rirInicial)} a ${num(cf.rirActual)}`
    pasos.push({ id: 'cargaFija', titulo: 'Mismo peso, ¿cómo se siente?', pregunta: preguntaFija,
      estado: cambio <= -MARGEN_CARGA_FIJA ? 'senal' : 'normal',
      aFavor: cambio >= MARGEN_CARGA_FIJA,
      dato: cambio >= MARGEN_CARGA_FIJA ? `${base}: le cuesta menos con el mismo peso, puede estar progresando aunque el 1RM estimado no suba.`
        : cambio <= -MARGEN_CARGA_FIJA ? `${base}: le cuesta más con el mismo peso.` : `${base}: sin cambio claro.` })
  }

  // 6. Volumen y frecuencia: es un dato, no un juicio (más volumen no siempre es mejor)
  const { seriesPorSemana, sesionesPorSemana } = e.carga
  pasos.push({ id: 'volumen', titulo: 'Volumen y frecuencia', pregunta: '¿Cuánto trabajo recibe el ejercicio y cómo se reparte?',
    estado: seriesPorSemana === null ? 'sin-datos' : 'normal',
    dato: seriesPorSemana === null ? 'No se puede calcular el trabajo semanal.' : `${num(seriesPorSemana)} series por semana${sesionesPorSemana ? ` en ${num(sesionesPorSemana)} ${sesiones(sesionesPorSemana)}` : ''}.` })

  // 7. Recuperación: sueño, agujetas, ánimo y molestias
  const r = e.recuperacion
  if (!r.checkins) {
    pasos.push({ id: 'recuperacion', titulo: 'Recuperación', pregunta: '¿Duerme, se recupera y está sin molestias?', estado: r.molestiasArticulares ? 'senal' : 'sin-datos',
      dato: r.molestiasArticulares ? `${r.molestiasArticulares} molestia${r.molestiasArticulares === 1 ? '' : 's'} articular${r.molestiasArticulares === 1 ? '' : 'es'} en 2 semanas; sin check-ins.` : 'Sin check-ins en las últimas 2 semanas.' })
  } else {
    const senal = r.checkinsBajos * 2 >= r.checkins || r.molestiasArticulares > 0
    pasos.push({ id: 'recuperacion', titulo: 'Recuperación', pregunta: '¿Duerme, se recupera y está sin molestias?', estado: senal ? 'senal' : 'normal',
      dato: `${r.checkinsBajos} de ${r.checkins} check-ins con alguna escala baja${r.molestiasArticulares ? `; ${r.molestiasArticulares} molestia${r.molestiasArticulares === 1 ? '' : 's'} articular${r.molestiasArticulares === 1 ? '' : 'es'}` : ''}.` })
  }

  // 8. Peso corporal: déficit o superávit que cambie el contexto
  pasos.push({ id: 'peso', titulo: 'Peso corporal', pregunta: '¿El peso cambia tan rápido que explique el rendimiento?',
    estado: e.ritmoPeso ? 'senal' : e.hayPeso ? 'normal' : 'sin-datos',
    dato: e.ritmoPeso ? e.ritmoPeso.texto : e.hayPeso ? 'El ritmo de peso no pasa de los umbrales de referencia.' : 'Pocos pesajes para hablar del ritmo.' })

  // 9. Adherencia: a veces el problema es la regularidad, no el programa
  pasos.push({ id: 'adherencia', titulo: 'Adherencia', pregunta: '¿Está haciendo el programa que se ha puesto?',
    estado: e.adherenciaPct === null ? 'sin-datos' : e.adherenciaPct < ADHERENCIA_BAJA ? 'senal' : 'normal',
    dato: e.adherenciaPct === null ? 'Sin plan o sin sesiones previstas con las que comparar.' : `Cumple el ${Math.round(e.adherenciaPct)} % de lo previsto.` })

  return pasos
}

/** Cuántos pasos tienen señal, cuántos faltan y la frase de cierre: ninguna conclusión, solo cómo seguir. */
export function resumenChecklist(pasos: PasoEstancamiento[]) {
  const senales = pasos.filter(p => p.estado === 'senal').length
  const sinDatos = pasos.filter(p => p.estado === 'sin-datos').length
  const real = pasos.find(p => p.id === 'real')
  const aFavor = pasos.some(p => p.aFavor)
  const texto = real?.estado === 'senal' && aFavor
    ? 'El 1RM estimado no sube, pero con el mismo peso le cuesta menos: puede estar progresando. Antes de cambiar nada, observa unas semanas más.'
    : real?.estado === 'sin-datos'
    ? 'Todavía no hay datos para hablar de estancamiento: seguir registrando también es una decisión.'
    : real?.estado === 'normal'
      ? 'No hay estancamiento claro: lo habitual es no tocar nada y seguir observando.'
      : senales > 1
        ? `Hay ${senales} señales a la vez: son pistas, no una causa. Elige UNA intervención pequeña y decide cuándo la revisas.`
        : 'Hay estancamiento y pocas señales alrededor: antes de cambiar nada, completa lo que falta; mantener también es una opción.'
  return { senales, sinDatos, texto }
}
