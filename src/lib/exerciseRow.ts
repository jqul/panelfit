// Línea de resumen de un ejercicio en la biblioteca: lo que el entrenador busca
// de un vistazo (grupo muscular, especialidad, si tiene vídeo) en una sola línea
// legible, en vez de una fila de insignias.

interface RowInput {
  category?: string
  especialidades?: string[]
  videos?: { url: string }[]
}

export function exerciseSubtitle(ex: RowInput, espLabel: (id: string) => string | undefined, maxEsps = 2): string {
  const parts: string[] = []
  if (ex.category) parts.push(ex.category)
  const labels = (ex.especialidades || []).map(espLabel).filter((l): l is string => !!l)
  if (labels.length) {
    const shown = labels.slice(0, maxEsps).join(', ')
    parts.push(labels.length > maxEsps ? `${shown} +${labels.length - maxEsps}` : shown)
  }
  const n = ex.videos?.length || 0
  parts.push(n === 0 ? 'Sin vídeo' : n === 1 ? '1 vídeo' : `${n} vídeos`)
  return parts.join(' · ')
}

// Cuántos ejercicios hay en cada grupo, de más a menos, solo los que tienen alguno.
export function categoryCounts(exercises: { category?: string }[]): { category: string; n: number }[] {
  const count = new Map<string, number>()
  exercises.forEach(e => { if (e.category) count.set(e.category, (count.get(e.category) || 0) + 1) })
  return [...count.entries()].map(([category, n]) => ({ category, n })).sort((a, b) => b.n - a.n || a.category.localeCompare(b.category, 'es'))
}
