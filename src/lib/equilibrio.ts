// Equilibrio empuje / tirón / pierna: reparte las series por grupo muscular (los de getMuscleGroup) en los tres
// patrones y avisa cuando uno se queda corto. Un plan con mucho más empuje que tirón es la descompensación más común
// (hombros adelantados, molestias); poca pierna, la segunda. Core y lo que no se reconoce no cuentan.

export type Patron = 'empuje' | 'tiron' | 'pierna'

const PATRON_DE_GRUPO: Record<string, Patron> = {
  'Pecho': 'empuje', 'Hombros': 'empuje', 'Tríceps': 'empuje',
  'Espalda': 'tiron', 'Bíceps': 'tiron',
  'Piernas': 'pierna', 'Glúteos': 'pierna',
}

export const MINIMO_SERIES = 10
const MAX_RATIO = 1.5
const MIN_PIERNA = 0.25

export interface Equilibrio {
  series: Record<Patron, number>
  /** Empuje ÷ tirón (null sin tirón). */
  ratio: number | null
  avisos: string[]
}

export function equilibrio(seriesPorGrupo: Record<string, number>): Equilibrio | null {
  const series: Record<Patron, number> = { empuje: 0, tiron: 0, pierna: 0 }
  for (const [g, n] of Object.entries(seriesPorGrupo)) {
    const p = PATRON_DE_GRUPO[g]
    if (p) series[p] += n
  }
  const total = series.empuje + series.tiron + series.pierna
  if (total < MINIMO_SERIES) return null
  const ratio = series.tiron > 0 ? Math.round((series.empuje / series.tiron) * 10) / 10 : null
  const avisos: string[] = []
  const r = (n: number) => n.toLocaleString('es-ES')
  if (series.tiron === 0 && series.empuje > 0) avisos.push('Hay empuje pero nada de tirón: añade remos o dominadas.')
  else if (ratio !== null && ratio > MAX_RATIO) avisos.push(`Mucho más empuje que tirón (${r(ratio)}:1): sube remos o dominadas para equilibrar los hombros.`)
  else if (ratio !== null && ratio < 1 / MAX_RATIO) avisos.push(`Mucho más tirón que empuje (1:${r(Math.round((1 / ratio) * 10) / 10)}): falta press de pecho u hombro.`)
  if (series.pierna / total < MIN_PIERNA) avisos.push(`Poca pierna: ${Math.round((series.pierna / total) * 100)} % de las series (lo habitual, de un 30 % en adelante).`)
  return { series, ratio, avisos }
}
