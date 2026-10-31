// Series efectivas: las que de verdad estimulan, hechas cerca del fallo (RIR 3 o menos). Para comparar el volumen por
// músculo con los rangos MEV/MAV/MRV, que se pensaron para series duras, no para cualquier serie apuntada.
// Una serie con RIR 4 o más (con margen) no cuenta. Si no tiene RIR apuntado, cuenta: muchos clientes no lo apuntan y,
// si no, el gráfico se quedaría casi vacío; se dice cuántas son para que el entrenador lo sepa.

export const RIR_EFECTIVA = 3

type Serie = { weight?: string; reps?: string; rir?: number }

const hecha = (s: Serie) => (parseFloat(String(s.weight ?? '').replace(',', '.')) || 0) > 0 || (parseInt(String(s.reps ?? '')) || 0) > 0

export interface CuentaSeries { todas: number; efectivas: number; faciles: number; sinRir: number }

/** Cuenta las series con datos de un registro: todas, efectivas, las que no cuentan por fáciles y las que no tienen RIR. */
export function contarSeries(series: Serie[]): CuentaSeries {
  const c: CuentaSeries = { todas: 0, efectivas: 0, faciles: 0, sinRir: 0 }
  for (const s of series) {
    if (!s || !hecha(s)) continue
    c.todas++
    if (typeof s.rir !== 'number') { c.sinRir++; c.efectivas++ }
    else if (s.rir <= RIR_EFECTIVA) c.efectivas++
    else c.faciles++
  }
  return c
}
