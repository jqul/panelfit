import { useMemo } from 'react'
import { TrainingPlan } from '../../../types'

export function getExName(key: string, plan?: TrainingPlan | null) {
  const m = key.match(/ex_w(\d+)_d(\d+)_r(\d+)/)
  if (!m || !plan) return null
  return plan.weeks?.[+m[1]]?.days?.[+m[2]]?.exercises?.[+m[3]]?.name || null
}

export function useWeightHistory(clientId: string) {
  try {
    const raw = localStorage.getItem(`pf_weight_${clientId}`)
    return raw ? JSON.parse(raw) as { date: string; weight: number }[] : []
  } catch { return [] }
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
