// Kilos con formato español ("122,5", "80") en toda la app: con coma decimal y sin ceros de más. Un texto que no es
// un número (p. ej. "80%" o "Banda") se devuelve tal cual.

const NUM = /^\s*-?\d+(?:[.,]\d+)?\s*$/

export function kg(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return ''
  const n = typeof v === 'number' ? v : NUM.test(v) ? parseFloat(v.replace(',', '.')) : NaN
  if (!Number.isFinite(n)) return String(v)
  return n.toLocaleString('es-ES', { maximumFractionDigits: 2, useGrouping: false })
}
