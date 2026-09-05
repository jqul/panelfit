export function getYTId(url: string) {
  const m = url?.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export function parseSet(sets: string) {
  const m = sets?.match(/(\d+)[×x](\d+)/)
  return { numSets: m ? parseInt(m[1]) : 3, numReps: m ? parseInt(m[2]) : 10 }
}

// Lo que se muestra en el HUD de descanso ("modo tarima") mientras el atleta
// recupera — para no tener que salir del descanso y buscar la siguiente serie
// a mano cuando el móvil está en el suelo o apoyado en la jaula.
export interface NextSetInfo {
  exerciseName: string
  setNum: number
  totalSets: number
  weight: string
  reps: string
  targetLabel: string | null
}
