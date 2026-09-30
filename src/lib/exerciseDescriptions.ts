// Descripciones de los ejercicios importados de hasaneyldrm/exercises-dataset
// (MIT) — se sirven como recurso estático aparte (public/exercise-
// descriptions.json), NO empaquetadas en el bundle de JS. Son ~720KB de texto
// que solo hace falta una vez (al sembrar la biblioteca de un entrenador
// nuevo, o para pintarlas en el modo demo) — meterlas en el bundle penalizaría
// la carga inicial de la app entera para algo que ni siquiera se usa siempre.
let cache: Record<string, string> | null = null
let inflight: Promise<Record<string, string>> | null = null

export function loadExerciseDescriptions(): Promise<Record<string, string>> {
  if (cache) return Promise.resolve(cache)
  if (inflight) return inflight
  inflight = fetch('/exercise-descriptions.json')
    .then(r => r.ok ? r.json() : {})
    .catch(() => ({}))
    .then(data => { cache = data; inflight = null; return data })
  return inflight
}
