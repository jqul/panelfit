// Criterios del entrenador para una programación inicial (Ajustes → «Criterios para programación inicial»). En v1 solo se guarda
// el texto en su perfil (`entrenadores.profile.criteriosProgramacion`, que solo lee el propio entrenador): es lo que leerá quien
// prepare un borrador (a mano o, si algún día él decide asumir ese coste, con una herramienta). Cada guardado sube `version`, y el
// borrador anota con qué versión se preparó (`criterios_version`). Sin React ni red.

export interface CriteriosProgramacion {
  /** Sube en 1 con cada guardado. */
  version: number
  metodologia: string
  material: string
  preferidos: string
  prohibidos: string
  maxDias: string
  maxDuracion: string
  progresion: string
  limitesClinicos: string
  updatedAt?: number
}

export const CAMPOS_CRITERIOS: { id: keyof Omit<CriteriosProgramacion, 'version' | 'updatedAt'>; label: string; ayuda: string; corto?: boolean }[] = [
  { id: 'metodologia', label: 'Metodología', ayuda: 'Cómo programas: estructura semanal, rangos de repeticiones, cercanía al fallo…' },
  { id: 'material', label: 'Material habitual', ayuda: 'Con qué trabajas normalmente y qué sustituyes si falta.' },
  { id: 'preferidos', label: 'Ejercicios preferidos', ayuda: 'Los que quieres ver en un primer programa.' },
  { id: 'prohibidos', label: 'Ejercicios prohibidos', ayuda: 'Los que no pones nunca a alguien que empieza.' },
  { id: 'maxDias', label: 'Máximo de días por semana', ayuda: 'Por ejemplo: 4.', corto: true },
  { id: 'maxDuracion', label: 'Duración máxima de sesión (minutos)', ayuda: 'Por ejemplo: 75.', corto: true },
  { id: 'progresion', label: 'Reglas de progresión', ayuda: 'Cómo suben las cargas y cuándo se cambia algo.' },
  { id: 'limitesClinicos', label: 'Límites clínicos: cuándo parar y pedir revisión', ayuda: 'Qué respuestas del cuestionario de salud te obligan a revisar tú antes de programar nada.' },
]

const MAX = 2000

/** Lo guardado en el perfil, con todo lo que falte (o no sea texto) vacío y los textos recortados. */
export function limpiarCriterios(raw: unknown): CriteriosProgramacion {
  const o = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const t = (k: string) => (typeof o[k] === 'string' ? (o[k] as string).slice(0, MAX) : '')
  const v = typeof o.version === 'number' && Number.isFinite(o.version) && o.version >= 0 ? Math.floor(o.version) : 0
  return {
    version: v, metodologia: t('metodologia'), material: t('material'), preferidos: t('preferidos'), prohibidos: t('prohibidos'),
    maxDias: t('maxDias'), maxDuracion: t('maxDuracion'), progresion: t('progresion'), limitesClinicos: t('limitesClinicos'),
    ...(typeof o.updatedAt === 'number' ? { updatedAt: o.updatedAt } : {}),
  }
}

export const criteriosVacios = (c: CriteriosProgramacion) => CAMPOS_CRITERIOS.every(f => !c[f.id].trim())

/** Lo que se guarda: los textos recortados y la versión siguiente (solo si algo ha cambiado). */
export function guardarCriterios(previo: CriteriosProgramacion, nuevo: CriteriosProgramacion, ahora = Date.now()): CriteriosProgramacion {
  const limpio = limpiarCriterios({ ...nuevo, version: previo.version })
  const cambia = CAMPOS_CRITERIOS.some(f => limpio[f.id].trim() !== previo[f.id].trim())
  return cambia ? { ...limpio, version: previo.version + 1, updatedAt: ahora } : previo
}
