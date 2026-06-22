import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Plantillas de bloques de periodización (estilo mesociclo): cada paso define
// el RPE objetivo y si es semana de descarga. El entrenador aplica un bloque
// sobre la semana activa y se generan N semanas clonando sus días/ejercicios.
export interface PeriodizationStep {
  rpe: string
  isDeload: boolean
}

export interface PeriodizationBlock {
  id: string
  label: string
  desc: string
  steps: PeriodizationStep[]
  custom?: boolean
}

export const DEFAULT_PERIODIZATION_BLOCKS: PeriodizationBlock[] = [
  {
    id: 'strength_4w',
    label: 'Bloque de fuerza · 4 semanas',
    desc: 'Acumulación → Acumulación → Intensificación → Descarga',
    steps: [
      { rpe: '@7', isDeload: false },
      { rpe: '@8', isDeload: false },
      { rpe: '@9', isDeload: false },
      { rpe: '@6', isDeload: true },
    ],
  },
  {
    id: 'hypertrophy_5w',
    label: 'Bloque de hipertrofia · 5 semanas',
    desc: 'Volumen progresivo durante 4 semanas + descarga',
    steps: [
      { rpe: '@6.5', isDeload: false },
      { rpe: '@7', isDeload: false },
      { rpe: '@7.5', isDeload: false },
      { rpe: '@8.5', isDeload: false },
      { rpe: '@6', isDeload: true },
    ],
  },
  {
    id: 'peaking_3w',
    label: 'Bloque de peaking · 3 semanas',
    desc: 'Rampa de intensidad hacia una marca/competición',
    steps: [
      { rpe: '@8', isDeload: false },
      { rpe: '@9', isDeload: false },
      { rpe: '@9.5', isDeload: false },
    ],
  },
]

/** @deprecated usa useCustomPeriodizationBlocks para obtener los bloques (editables) del entrenador */
export const PERIODIZATION_BLOCKS = DEFAULT_PERIODIZATION_BLOCKS

// ── Hook para cargar/guardar bloques personalizados del entrenador ────────
export function useCustomPeriodizationBlocks(trainerId?: string) {
  const LS_KEY = `pf_periodization_blocks_${trainerId}`
  const [blocks, setBlocks] = useState<PeriodizationBlock[]>(() => {
    if (!trainerId) return DEFAULT_PERIODIZATION_BLOCKS
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
      return saved || DEFAULT_PERIODIZATION_BLOCKS
    } catch { return DEFAULT_PERIODIZATION_BLOCKS }
  })

  useEffect(() => {
    if (!trainerId) return
    supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle().then(({ data }) => {
      if (data?.profile?.periodizationBlocks) {
        setBlocks(data.profile.periodizationBlocks)
        localStorage.setItem(LS_KEY, JSON.stringify(data.profile.periodizationBlocks))
      }
    })
  }, [trainerId])

  const saveBlocks = async (newBlocks: PeriodizationBlock[]) => {
    setBlocks(newBlocks)
    if (trainerId) {
      localStorage.setItem(LS_KEY, JSON.stringify(newBlocks))
      const { data } = await supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
      const profile = { ...(data?.profile || {}), periodizationBlocks: newBlocks, updatedAt: Date.now() }
      await supabase.from('entrenadores').update({ profile }).eq('uid', trainerId)
    }
  }

  return { blocks, saveBlocks }
}
