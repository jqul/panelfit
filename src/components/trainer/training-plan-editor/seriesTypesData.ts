// Los tipos de serie que trae PanelFit y su forma. Va aparte de la interfaz de gestión (seriesTypes.tsx) para que el
// panel del cliente, que solo necesita esto, no se descargue el gestor, el modal ni el hook del entrenador.

// ── Tipos de serie ────────────────────────────────────────
export interface SeriesTypeDef {
  id: string
  label: string
  emoji: string
  desc: string
  detail: string
  custom?: boolean
}

export const DEFAULT_SERIES_TYPES: SeriesTypeDef[] = [
  { id: 'normal',      label: 'Normal',      emoji: '▶',  desc: 'Series estándar con descanso completo entre cada una.', detail: 'Realiza cada serie con el mismo peso y repeticiones, descansando el tiempo indicado entre ellas. Es el método más común y efectivo para fuerza e hipertrofia.' },
  { id: 'descendente', label: 'Descendente', emoji: '📉', desc: 'Reduces el peso en cada serie manteniendo las repeticiones.', detail: 'Empieza con el peso más alto y ve bajando en cada serie (ej: 80kg → 70kg → 60kg). Permite más volumen total y mayor fatiga muscular.' },
  { id: 'superserie',  label: 'Superserie',  emoji: '⚡', desc: 'Dos ejercicios seguidos sin descanso entre ellos.', detail: 'Realiza un ejercicio inmediatamente después del otro sin pausa. Puede ser agonista-antagonista (bíceps + tríceps) o mismo músculo para mayor intensidad.' },
  { id: 'piramide',    label: 'Pirámide',    emoji: '🔺', desc: 'Aumentas el peso y reduces reps en cada serie.', detail: 'Progresión ascendente: cada serie sube el peso y baja las repeticiones (ej: 60kg×12 → 70kg×8 → 80kg×5). Ideal para ganar fuerza progresivamente en la sesión.' },
  { id: 'rest_pause',  label: 'Rest-Pause',  emoji: '⏸', desc: 'Mini descansos dentro de una misma serie.', detail: 'Lleva el peso al fallo, descansa 10-20 segundos, y sigue con el mismo peso hasta el siguiente fallo. Repite 2-3 veces. Maximiza el reclutamiento muscular.' },
  { id: 'cluster',     label: 'Cluster',     emoji: '🔗', desc: 'Grupos de reps con microdescansos de 10-15s.', detail: 'Divide las repeticiones en grupos (ej: 3+3+3 con 15s de descanso). Permite usar más peso del habitual con mejor técnica, muy efectivo para fuerza máxima.' },
  { id: 'dropset',     label: 'Drop Set',    emoji: '🎯', desc: 'Al fallo, reduces el peso y continúas sin descanso.', detail: 'Lleva el peso al fallo muscular y sin descanso reduce el peso un 20-30% para continuar. Se pueden hacer 2-3 drops seguidos. Máxima congestión muscular.' },
]
