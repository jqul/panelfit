import { ESCALAS_BASE, type EscalaBase } from './checkinConfig'

// Alertas por umbral (como las de TrainingPeaks): el entrenador pone sus propias reglas y la Bandeja le avisa de los
// clientes que las cumplen. Se guardan en su perfil (entrenadores.profile.alertasUmbral) y se calculan en el panel con
// datos que ya hay; no se guarda nada nuevo por cliente. Tres tipos:
//   - peso: cambia más de X kg en los últimos N días (registros_peso);
//   - checkin: una escala del check-in a X o menos N días seguidos (readiness_checkins);
//   - inactivo: N días sin entrenar (registros).

export type ReglaUmbral =
  | { id: string; tipo: 'peso'; kg: number; dias: number }
  | { id: string; tipo: 'checkin'; escala: EscalaBase; max: number; dias: number }
  | { id: string; tipo: 'inactivo'; dias: number }

export const MAX_REGLAS = 10

/** Una regla sin id (Omit no se reparte entre los tipos de una unión; esto sí). */
export type ReglaSinId = ReglaUmbral extends infer R ? R extends unknown ? Omit<R, 'id'> : never : never

/** Reglas de ejemplo para empezar. */
export const EJEMPLOS: ReglaSinId[] = [
  { tipo: 'peso', kg: 2, dias: 7 },
  { tipo: 'checkin', escala: 'motivation', max: 2, dias: 3 },
  { tipo: 'inactivo', dias: 7 },
]

const entero = (v: unknown, min: number, max: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null }
const decimal = (v: unknown, min: number, max: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 10) / 10)) : null }

/** Limpia lo que venga del perfil: tipos conocidos y valores dentro de rango. */
export function limpiarReglas(raw: unknown): ReglaUmbral[] {
  if (!Array.isArray(raw)) return []
  const out: ReglaUmbral[] = []
  const ids = new Set<string>()
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    let id = typeof o.id === 'string' && o.id.trim() ? o.id.trim().slice(0, 20) : `r${out.length + 1}`
    while (ids.has(id)) id += '_'
    let regla: ReglaUmbral | null = null
    if (o.tipo === 'peso') {
      const kg = decimal(o.kg, 0.5, 20), dias = entero(o.dias, 2, 60)
      if (kg && dias) regla = { id, tipo: 'peso', kg, dias }
    } else if (o.tipo === 'checkin') {
      const escala = Object.keys(ESCALAS_BASE).includes(String(o.escala)) ? o.escala as EscalaBase : null
      const max = entero(o.max, 1, 4), dias = entero(o.dias, 1, 14)
      if (escala && max && dias) regla = { id, tipo: 'checkin', escala, max, dias }
    } else if (o.tipo === 'inactivo') {
      const dias = entero(o.dias, 2, 60)
      if (dias) regla = { id, tipo: 'inactivo', dias }
    }
    if (!regla) continue
    ids.add(id); out.push(regla)
    if (out.length >= MAX_REGLAS) break
  }
  return out
}

/** La regla en una frase, para el editor. */
export function describirRegla(r: ReglaUmbral): string {
  if (r.tipo === 'peso') return `El peso cambia más de ${r.kg.toLocaleString('es-ES')} kg en ${r.dias} días`
  if (r.tipo === 'checkin') return `${ESCALAS_BASE[r.escala].label} a ${r.max} o menos ${r.dias} día${r.dias === 1 ? '' : 's'} seguido${r.dias === 1 ? '' : 's'}`
  return `${r.dias} días sin entrenar`
}

export interface DatosCliente {
  /** Pesos registrados (fecha AAAA-MM-DD), en cualquier orden. */
  pesos: { date: string; weight: number | null }[]
  /** Check-ins (fecha AAAA-MM-DD), en cualquier orden. */
  checkins: { date: string; sleep: number | null; soreness: number | null; stress: number | null; motivation: number | null }[]
  /** Último día que entrenó (AAAA-MM-DD), si alguna vez. */
  ultimoEntreno?: string | null
  /** Desde cuándo es cliente (para no avisar de "días sin entrenar" a quien acaba de empezar). */
  altaMs?: number
}

const restar = (hoy: string, dias: number) => { const d = new Date(hoy + 'T12:00:00'); d.setDate(d.getDate() - dias); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const diasEntre = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000)
const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 })

/** Si el cliente cumple la regla, el texto del aviso; si no, null. */
export function evaluarRegla(r: ReglaUmbral, d: DatosCliente, hoy: string): string | null {
  if (r.tipo === 'peso') {
    const desde = restar(hoy, r.dias)
    const pesos = d.pesos.filter(p => typeof p.weight === 'number' && p.weight > 0 && p.date >= desde && p.date <= hoy).sort((a, b) => a.date.localeCompare(b.date))
    if (pesos.length < 2) return null
    const cambio = pesos[pesos.length - 1].weight! - pesos[0].weight!
    if (Math.abs(cambio) <= r.kg) return null
    return `⚖️ Peso ${cambio > 0 ? '+' : '−'}${fmt(Math.abs(cambio))} kg en ${diasEntre(pesos[0].date, pesos[pesos.length - 1].date)} días`
  }
  if (r.tipo === 'checkin') {
    // Los últimos N check-ins tienen que ser de días seguidos (hasta hoy o ayer) y todos a max o menos
    const conValor = d.checkins.filter(c => typeof c[r.escala] === 'number').sort((a, b) => b.date.localeCompare(a.date))
    if (conValor.length < r.dias) return null
    const ultimos = conValor.slice(0, r.dias)
    if (diasEntre(ultimos[0].date, hoy) > 1) return null
    for (let i = 1; i < ultimos.length; i++) if (diasEntre(ultimos[i].date, ultimos[i - 1].date) !== 1) return null
    if (!ultimos.every(c => (c[r.escala] as number) <= r.max)) return null
    return `📉 ${ESCALAS_BASE[r.escala].label} a ${r.max} o menos ${r.dias} día${r.dias === 1 ? '' : 's'} seguido${r.dias === 1 ? '' : 's'}`
  }
  // inactivo
  if (d.ultimoEntreno) {
    const n = diasEntre(d.ultimoEntreno, hoy)
    return n >= r.dias ? `💤 ${n} días sin entrenar` : null
  }
  // Nunca ha entrenado: solo si ya lleva esos días de alta
  if (d.altaMs) {
    const a = new Date(d.altaMs)
    const n = diasEntre(`${a.getFullYear()}-${String(a.getMonth() + 1).padStart(2, '0')}-${String(a.getDate()).padStart(2, '0')}`, hoy)
    if (n >= r.dias) return `💤 Aún no ha entrenado (${n} días de alta)`
  }
  return null
}
