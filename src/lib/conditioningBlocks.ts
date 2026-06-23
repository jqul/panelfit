import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

export type ConditioningType = 'emom' | 'amrap' | 'for_time' | 'tabata' | 'circuito'

export const CONDITIONING_TYPE_LABEL: Record<ConditioningType, string> = {
  emom: 'EMOM', amrap: 'AMRAP', for_time: 'For Time', tabata: 'Tabata', circuito: 'Circuito',
}

export interface ConditioningItem { exercise: string; target: string } // target: "12 reps", "20 cal", "200m"...

export interface ConditioningBlock {
  id: string
  trainerId: string
  name: string
  type: ConditioningType
  rounds?: number
  workSec?: number
  restSec?: number
  durationMin?: number
  items: ConditioningItem[]
  notes?: string
  createdAt: number
}

interface DBRow {
  id: string; trainer_id: string; name: string; type: ConditioningType
  rounds: number | null; work_sec: number | null; rest_sec: number | null; duration_min: number | null
  items: ConditioningItem[]; notes: string | null; created_at: number
}

function dbToLocal(r: DBRow): ConditioningBlock {
  return {
    id: r.id, trainerId: r.trainer_id, name: r.name, type: r.type,
    rounds: r.rounds ?? undefined, workSec: r.work_sec ?? undefined, restSec: r.rest_sec ?? undefined,
    durationMin: r.duration_min ?? undefined, items: r.items || [], notes: r.notes ?? undefined,
    createdAt: r.created_at,
  }
}

function localToDB(b: ConditioningBlock): Omit<DBRow, never> {
  return {
    id: b.id, trainer_id: b.trainerId, name: b.name, type: b.type,
    rounds: b.rounds ?? null, work_sec: b.workSec ?? null, rest_sec: b.restSec ?? null,
    duration_min: b.durationMin ?? null, items: b.items, notes: b.notes ?? null, created_at: b.createdAt,
  }
}

/** Genera la descripción de protocolo a usar como "sets" del ejercicio en el plan. */
export function conditioningProtocolLabel(b: ConditioningBlock): string {
  switch (b.type) {
    case 'emom': return `EMOM ${b.rounds || '?'} min`
    case 'amrap': return `AMRAP ${b.durationMin || '?'} min`
    case 'tabata': return `Tabata ${b.rounds || 8}× (${b.workSec || 20}s/${b.restSec || 10}s)`
    case 'for_time': return 'For Time'
    default: return `${b.rounds || '?'} rondas`
  }
}

export function useConditioningBlocks(trainerId?: string) {
  const [blocks, setBlocks] = useState<ConditioningBlock[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!trainerId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('conditioning_blocks').select('*').eq('trainer_id', trainerId).order('name')
    setBlocks((data || []).map(dbToLocal))
    setLoading(false)
  }, [trainerId])

  useEffect(() => { load() }, [load])

  const addBlock = useCallback(async (b: Omit<ConditioningBlock, 'id' | 'trainerId' | 'createdAt'>) => {
    if (!trainerId) return
    const block: ConditioningBlock = { ...b, id: `cb_${Date.now()}`, trainerId, createdAt: Date.now() }
    setBlocks(prev => [...prev, block].sort((a, c) => a.name.localeCompare(c.name)))
    await supabase.from('conditioning_blocks').insert(localToDB(block))
  }, [trainerId])

  const deleteBlock = useCallback(async (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    await supabase.from('conditioning_blocks').delete().eq('id', id)
  }, [])

  return { blocks, loading, addBlock, deleteBlock, reload: load }
}
