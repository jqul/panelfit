import { esCalentamiento, type TipoSerie } from './tipoSerie'

// Volumen (tonelaje) = kg × reps de cada serie. En los ejercicios que el entrenador marca como «peso por lado»
// (mancuernas, máquinas unilaterales, polea a una mano...) se apunta el peso de UNA mano o lado, así que el volumen
// real es el doble: el registro guarda `porLado: true` y todas las cuentas de volumen pasan por aquí.
// Las series de calentamiento (lib/tipoSerie) no cuentan.

type SerieConPeso = { weight?: string; reps?: string; tipo?: TipoSerie }

const num = (v?: string) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }

export function volumenSeries(series: SerieConPeso[], porLado?: boolean): number {
  const v = series.reduce((a, s) => esCalentamiento(s) ? a : a + num(s.weight) * (parseInt(String(s.reps ?? '')) || 0), 0)
  return porLado ? v * 2 : v
}

export function volumenLog(log?: { sets?: Record<number, SerieConPeso>; porLado?: boolean } | null): number {
  return log ? volumenSeries(Object.values(log.sets || {}), log.porLado) : 0
}
