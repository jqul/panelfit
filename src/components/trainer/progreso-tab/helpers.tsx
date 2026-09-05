import { useMemo } from 'react'
import { TrainingPlan } from '../../../types'

export function getExName(key: string, plan?: TrainingPlan | null) {
  const m = key.match(/ex_w(\d+)_d(\d+)_r(\d+)/)
  if (!m || !plan) return null
  return plan.weeks?.[+m[1]]?.days?.[+m[2]]?.exercises?.[+m[3]]?.name || null
}

export function CustomTooltip({ active, payload, label, unit = 'kg' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-muted mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-bold">{p.value} {unit}</p>
      ))}
    </div>
  )
}

export function EmptyState({ icon, text, sub }: { icon: React.ReactNode; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted gap-2">
      {icon}
      <p className="text-sm">{text}</p>
      {sub && <p className="text-xs">{sub}</p>}
    </div>
  )
}

// ── Distribución / grupo muscular ──────────────────────────
export const GROUP_COLORS: Record<string, string> = {
  'Pecho': '#6e5438', 'Espalda': '#4caf7d', 'Piernas': '#e0a854', 'Hombros': '#e07b54',
  'Bíceps': '#3b82f6', 'Tríceps': '#8b5cf6', 'Core': '#ec4899', 'Glúteos': '#06b6d4', 'Otros': '#94a3b8',
}

const MUSCLE_GROUPS: Record<string, string[]> = {
  'Pecho':     ['press','pecho','bench','aperturas','fondos'],
  'Espalda':   ['remo','dominadas','jalón','pull','espalda','trapecio','lumbar','jalon'],
  'Piernas':   ['squat','sentadilla','prensa','leg','femoral','cuádricep','gemelo','pantorrilla','lunges','zancada','cuadricep'],
  'Hombros':   ['press hombro','elevaciones','deltoides','hombro','military'],
  'Bíceps':    ['curl','bícep','bicep'],
  'Tríceps':   ['trícep','tricep','extensión','francés','frances'],
  'Core':      ['plancha','abdominales','crunch','core','oblicuos'],
  'Glúteos':   ['hip thrust','glúteo','gluteo','patada'],
}

// Rango orientativo de series/semana por grupo muscular (MEV/MAV/MRV, principios de volumen de entrenamiento).
// Es una estimación general para lifters intermedios, no una prescripción individualizada.
export const VOLUME_LANDMARKS: Record<string, { mev: number; mav: number; mrv: number }> = {
  'Pecho':    { mev: 8,  mav: 16, mrv: 22 },
  'Espalda':  { mev: 10, mav: 18, mrv: 25 },
  'Piernas':  { mev: 8,  mav: 15, mrv: 20 },
  'Hombros':  { mev: 8,  mav: 17, mrv: 24 },
  'Bíceps':   { mev: 6,  mav: 13, mrv: 20 },
  'Tríceps':  { mev: 6,  mav: 11, mrv: 18 },
  'Core':     { mev: 4,  mav: 10, mrv: 16 },
  'Glúteos':  { mev: 6,  mav: 13, mrv: 20 },
}

export function getVolumeStatus(group: string, sets: number): { label: string; color: string } | null {
  const l = VOLUME_LANDMARKS[group]
  if (!l) return null
  if (sets < l.mev) return { label: 'Bajo', color: '#e07b54' }
  if (sets <= l.mav) return { label: 'Óptimo', color: '#4caf7d' }
  if (sets <= l.mrv) return { label: 'Alto', color: '#e0a854' }
  return { label: 'Excesivo', color: '#dc2626' }
}

export function getMuscleGroup(name: string, libraryMap?: Map<string, string>) {
  const fromLibrary = libraryMap?.get(name.toLowerCase().trim())
  if (fromLibrary) return fromLibrary
  const lower = name.toLowerCase()
  for (const [group, kws] of Object.entries(MUSCLE_GROUPS)) if (kws.some(k => lower.includes(k))) return group
  return 'Otros'
}

export function useLibraryMuscleMap(library?: { name: string; category?: string }[]) {
  return useMemo(() => {
    const map = new Map<string, string>()
    library?.forEach(ex => { if (ex.category) map.set(ex.name.toLowerCase().trim(), ex.category) })
    return map
  }, [library])
}
