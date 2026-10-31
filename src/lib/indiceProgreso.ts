import { TrainingLogs, TrainingPlan } from '../types'
import { localDateKey } from './dates'
import { historialPorEjercicio } from './historialEjercicio'
import { volumenLog } from './volumen'

// Índice de progreso: un número que resume si el cliente progresa, comparando las últimas 4 semanas con las 4 de
// antes, y que se explica solo. Sale de tres partes, cada una con su peso:
//   · Fuerza (60 %): mediana del cambio del 1RM estimado de los ejercicios repetidos en los dos periodos.
//   · Volumen (25 %): cambio del tonelaje (kg × reps; el peso por lado cuenta doble).
//   · Constancia (15 %): cambio en el número de sesiones hechas.
// Si una parte no se puede calcular, las demás reparten su peso. El esfuerzo (RIR medio) se enseña aparte: entrenar
// más cerca del fallo no es progresar por sí solo, pero ayuda a leer el resto. Puro: recibe logs, plan y la fecha.

export type IdParte = 'fuerza' | 'volumen' | 'constancia'
export interface ParteIndice { id: IdParte; label: string; peso: number; pct: number | null; detalle: string }
export interface IndiceProgreso {
  indice: number
  estado: 'sube' | 'estable' | 'baja'
  partes: ParteIndice[]
  rirMedio: number | null
}

const DIAS = 28
const PESOS: Record<IdParte, number> = { fuerza: 0.6, volumen: 0.25, constancia: 0.15 }
const TOPE: Record<IdParte, number> = { fuerza: 25, volumen: 50, constancia: 50 }
const r1 = (n: number) => Math.round(n * 10) / 10
const pct = (ahora: number, antes: number) => antes > 0 ? ((ahora - antes) / antes) * 100 : null
const tope = (v: number, t: number) => Math.max(-t, Math.min(t, v))
/** «+4,2 %», para enseñar las partes (espacio duro: el % no se queda solo en otra línea). */
export const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${r1(n).toLocaleString('es-ES')}\u00a0%`

function mediana(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function indiceProgreso(logs: TrainingLogs, plan?: TrainingPlan | null, hoy: Date = new Date()): IndiceProgreso | null {
  const d = (dias: number) => { const x = new Date(hoy); x.setDate(x.getDate() - dias); return localDateKey(x) }
  const finAhora = localDateKey(hoy), iniAhora = d(DIAS - 1), iniAntes = d(2 * DIAS - 1)
  const periodo = (fecha: string) => fecha >= iniAhora && fecha <= finAhora ? 'ahora' : fecha >= iniAntes && fecha < iniAhora ? 'antes' : null

  // Volumen, sesiones y RIR por periodo
  const vol = { ahora: 0, antes: 0 }
  const dias = { ahora: new Set<string>(), antes: new Set<string>() }
  const rirs: number[] = []
  for (const log of Object.values(logs || {})) {
    if (!log?.done || !log.dateDone) continue
    const p = periodo(log.dateDone)
    if (!p) continue
    vol[p] += volumenLog(log)
    dias[p].add(log.dateDone)
    if (p === 'ahora') Object.values(log.sets || {}).forEach(s => { if (typeof s?.rir === 'number') rirs.push(s.rir) })
  }
  if (!dias.ahora.size || !dias.antes.size) return null

  // Fuerza: mejor 1RM estimado de cada ejercicio en cada periodo
  const cambios: number[] = []
  for (const h of historialPorEjercicio(logs, plan)) {
    let ahora = 0, antes = 0
    for (const s of h.sesiones) {
      const p = periodo(s.date)
      if (p === 'ahora') ahora = Math.max(ahora, s.e1rm)
      else if (p === 'antes') antes = Math.max(antes, s.e1rm)
    }
    const c = ahora > 0 ? pct(ahora, antes) : null
    if (c !== null) cambios.push(c)
  }

  const fuerza = cambios.length ? mediana(cambios) : null
  const volumen = pct(vol.ahora, vol.antes)
  const constancia = pct(dias.ahora.size, dias.antes.size)
  const kg = (n: number) => Math.round(n).toLocaleString('es-ES')
  const partes: ParteIndice[] = [
    { id: 'fuerza', label: 'Fuerza', peso: PESOS.fuerza, pct: fuerza === null ? null : r1(fuerza),
      detalle: fuerza === null
        ? 'Sin ejercicios repetidos en los dos periodos: no se puede comparar el 1RM.'
        : `Mediana del cambio del 1RM estimado en ${cambios.length} ${cambios.length === 1 ? 'ejercicio repetido' : 'ejercicios repetidos'}.` },
    { id: 'volumen', label: 'Volumen', peso: PESOS.volumen, pct: volumen === null ? null : r1(volumen),
      detalle: `${kg(vol.ahora)} kg movidos frente a ${kg(vol.antes)} kg las 4 semanas anteriores.` },
    { id: 'constancia', label: 'Constancia', peso: PESOS.constancia, pct: constancia === null ? null : r1(constancia),
      detalle: `${dias.ahora.size} ${dias.ahora.size === 1 ? 'sesión' : 'sesiones'} frente a ${dias.antes.size}.` },
  ]
  const validas = partes.filter(p => p.pct !== null)
  const pesoTotal = validas.reduce((a, p) => a + p.peso, 0)
  const indice = r1(validas.reduce((a, p) => a + tope(p.pct!, TOPE[p.id]) * p.peso, 0) / (pesoTotal || 1))
  return {
    indice,
    estado: indice >= 1.5 ? 'sube' : indice <= -1.5 ? 'baja' : 'estable',
    partes,
    rirMedio: rirs.length ? r1(rirs.reduce((a, b) => a + b, 0) / rirs.length) : null,
  }
}

