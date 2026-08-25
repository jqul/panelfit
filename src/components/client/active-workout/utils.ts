export function getYTId(url: string) {
  const m = url?.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export function parseSet(sets: string) {
  const m = sets?.match(/(\d+)[×x](\d+)/)
  return { numSets: m ? parseInt(m[1]) : 3, numReps: m ? parseInt(m[2]) : 10 }
}
