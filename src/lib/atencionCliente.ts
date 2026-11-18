// «Atención hoy» en la ficha de un cliente: lo accionable que hay ahora mismo (molestia, check-in bajo, vídeo esperando,
// sesiones sin hacer, recordatorios), cada cosa con el sitio exacto para resolverla. Si no hay nada, no hay tarjeta. Mismos
// umbrales que la Bandeja (hooks/useInboxItems) para que ficha y bandeja no se contradigan. Sin React ni red.

import { algunaBaja } from './checkinConfig'

export type AtencionKind = 'dolor' | 'checkin' | 'video' | 'sesion' | 'recordatorio'
export type TabFicha = 'perfil' | 'plan' | 'entrenos' | 'progreso'

export interface Destino {
  tab: TabFicha
  /** Sección de Progreso, o ancla (id) dentro del Resumen. */
  seccion?: string
  /** Plegable que se despliega al llegar: la ficha de valoración del Resumen o los ajustes del plan. */
  abrir?: 'valoracion' | 'ajustes-plan'
}
export interface AtencionItem { kind: AtencionKind; texto: string; destino: Destino; urgente: boolean; accion: string }

/** Molestia articular o fuerte: por debajo de esto es más ruido que señal (ver DolorChart: ≥7 alto, ≥4 moderado). */
export const DOLOR_ALERTA_MIN = 4
export const DOLOR_FUERTE = 7
export const DIAS_SIN_ENTRENAR = 7

export interface EntradaAtencion {
  /** Molestias de los últimos 14 días. */
  dolor: { zona: string; intensidad: number; tipo?: 'doms' | 'articular' }[]
  /** El check-in más reciente de los últimos 7 días, o null. */
  checkin: { sleep: number | null; soreness: number | null; motivation: number | null } | null
  videosPendientes: number
  /** Días desde su última sesión hecha; null si no tiene plan o nunca ha entrenado (ahí no hay «sesión perdida»). */
  diasSinEntrenar: number | null
  recordatorios: { pendientes: number; vencidos: number }
}

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios)

export function construirAtencion(e: EntradaAtencion): AtencionItem[] {
  const out: AtencionItem[] = []

  // La molestia más fuerte; las agujetas (doms) no cuentan, no son una alarma
  const articulares = e.dolor.filter(d => d.tipo !== 'doms' && d.intensidad >= DOLOR_ALERTA_MIN)
  if (articulares.length) {
    const peor = articulares.reduce((a, b) => (b.intensidad > a.intensidad ? b : a))
    out.push({ kind: 'dolor', texto: `Molestia en ${peor.zona} (${peor.intensidad}/10)${articulares.length > 1 ? ` y ${articulares.length - 1} más` : ''}`, destino: { tab: 'progreso', seccion: 'dolor' }, urgente: peor.intensidad >= DOLOR_FUERTE, accion: 'Ver dolor' })
  }

  if (e.checkin && algunaBaja(e.checkin.sleep, e.checkin.soreness, e.checkin.motivation)) {
    const partes = ([['sueño', e.checkin.sleep], ['dolor', e.checkin.soreness], ['energía', e.checkin.motivation]] as const)
      .filter(([, v]) => v !== null && v <= 2).map(([n, v]) => `${n} ${v}/5`)
    out.push({ kind: 'checkin', texto: `Check-in bajo${partes.length ? `: ${partes.join(', ')}` : ''}`, destino: { tab: 'progreso', seccion: 'fatiga' }, urgente: false, accion: 'Ver riesgo' })
  }

  if (e.videosPendientes > 0) {
    out.push({ kind: 'video', texto: `${e.videosPendientes} ${plural(e.videosPendientes, 'vídeo espera', 'vídeos esperan')} tu feedback`, destino: { tab: 'progreso', seccion: 'videos' }, urgente: false, accion: 'Ver vídeos' })
  }

  if (e.diasSinEntrenar !== null && e.diasSinEntrenar >= DIAS_SIN_ENTRENAR) {
    out.push({ kind: 'sesion', texto: `Lleva ${e.diasSinEntrenar} días sin entrenar`, destino: { tab: 'entrenos' }, urgente: false, accion: 'Ver entrenos' })
  }

  if (e.recordatorios.pendientes > 0) {
    const v = e.recordatorios.vencidos
    out.push({ kind: 'recordatorio', texto: `${e.recordatorios.pendientes} ${plural(e.recordatorios.pendientes, 'recordatorio pendiente', 'recordatorios pendientes')}${v > 0 ? ` (${v} ${plural(v, 'vencido', 'vencidos')})` : ''}`, destino: { tab: 'perfil', seccion: 'recordatorios' }, urgente: v > 0, accion: 'Ver recordatorios' })
  }
  return out
}

/** Días enteros entre dos fechas YYYY-MM-DD (hoy menos la última), o null si no hay última. */
export function diasDesde(ultima: string | null | undefined, hoy: string): number | null {
  if (!ultima) return null
  const d = (Date.parse(hoy + 'T00:00:00Z') - Date.parse(ultima + 'T00:00:00Z')) / 86_400_000
  return Number.isFinite(d) ? Math.max(0, Math.round(d)) : null
}
