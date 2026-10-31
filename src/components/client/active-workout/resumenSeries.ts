// Totales de las series de un ejercicio: reps, volumen (kg × reps) y peso máximo. Para el resumen de la vista de
// lista. `soloHechas`: hoy solo cuentan las marcadas; la vez anterior, todas las que tienen datos.

export interface SerieLite { weight?: string; reps?: string; done?: boolean }

const num = (v: string | undefined) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : 0 }

/** `porLado`: el peso es de una mano/lado (lib/volumen.ts): el volumen cuenta el doble. */
export function resumenSeries(series: Record<number, SerieLite | undefined>, soloHechas: boolean, porLado = false): { reps: number; volumen: number; maxKg: number } {
  let reps = 0, volumen = 0, maxKg = 0
  for (const s of Object.values(series || {})) {
    if (!s || (soloHechas && !s.done)) continue
    const r = Math.round(num(s.reps)), w = num(s.weight)
    if (!r) continue
    reps += r
    volumen += w * r * (porLado ? 2 : 1)
    if (w > maxKg) maxKg = w
  }
  return { reps, volumen: Math.round(volumen * 10) / 10, maxKg }
}
