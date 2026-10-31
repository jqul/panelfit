// Tipo de una serie concreta, que el cliente marca al apuntarla (distinto del tipo de serie del ejercicio que pone el
// entrenador en el plan: aquí es «esta serie fue de calentamiento / un dropset / al fallo»).
//   · Calentamiento: no cuenta para el volumen ni para las series efectivas.
//   · Dropset: cuenta como una serie más (se apunta el peso de la bajada).
//   · Al fallo: cuenta como efectiva aunque no se apunte el RIR.

export type TipoSerie = 'calentamiento' | 'dropset' | 'fallo'

export const TIPOS_SERIE: { id: TipoSerie; letra: string; label: string; desc: string }[] = [
  { id: 'calentamiento', letra: 'C', label: 'Calentamiento', desc: 'No cuenta para el volumen' },
  { id: 'dropset', letra: 'D', label: 'Dropset', desc: 'Bajada de peso sin descanso' },
  { id: 'fallo', letra: 'F', label: 'Al fallo', desc: 'Hasta no poder hacer otra repetición' },
]

export const letraTipo = (t?: TipoSerie) => TIPOS_SERIE.find(x => x.id === t)?.letra
export const esCalentamiento = (s?: { tipo?: TipoSerie } | null) => s?.tipo === 'calentamiento'
