import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// Historial de dolor del cliente — pensado para seguimiento de rehabilitación
// (zona + intensidad 0-10 a lo largo del tiempo). Mismo patrón que
// clientWeight.ts: vive en `registros_dolor` con RLS
// trainer_or_client_owns_registros_dolor, y en demo se guarda en localStorage.

export interface PainEntry { id: string; date: string; zona: string; intensidad: number; nota?: string; tipo?: 'doms' | 'articular' }

// Lista única de zonas — la usan tanto el registro manual del cliente como el
// clasificador rápido del check-in diario, para no tener dos vocabularios.
export const ZONAS_DOLOR = ['Rodilla', 'Hombro', 'Espalda baja', 'Cadera', 'Tobillo', 'Cuello', 'Codo', 'Muñeca', 'Otro']

function localKey(clientId: string) { return `pf_dolor_${clientId}` }

export async function fetchClientPain(clientId: string): Promise<PainEntry[]> {
  if (!clientId) return []
  if (clientId.startsWith('demo-client-')) {
    try {
      const entries: PainEntry[] = JSON.parse(localStorage.getItem(localKey(clientId)) || '[]')
      return entries.sort((a, b) => b.date.localeCompare(a.date)) // más reciente primero, igual que la consulta real
    } catch { return [] }
  }
  const { data, error } = await supabase
    .from('registros_dolor')
    .select('id, date, zona, intensidad, nota, tipo')
    .eq('clientId', clientId)
    .order('date', { ascending: false })
  if (error || !data) return []
  return data as PainEntry[]
}

/**
 * Hook para el lado del cliente: lectura + registro de su propio dolor.
 * Igual que useClientWeights, actualiza el estado de forma optimista.
 */
export function useClientPain(clientId?: string) {
  const [entries, setEntries] = useState<PainEntry[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!clientId) { setEntries([]); setLoading(false); return }
    setLoading(true)
    setEntries(await fetchClientPain(clientId))
    setLoading(false)
  }, [clientId])

  useEffect(() => { reload() }, [reload])

  const addEntry = useCallback(async (zona: string, intensidad: number, nota?: string, date?: string, tipo?: 'doms' | 'articular') => {
    if (!clientId) return
    const entry: PainEntry = { id: crypto.randomUUID().replace(/-/g, ''), date: date || new Date().toISOString().split('T')[0], zona, intensidad, nota, tipo }
    const updated = [entry, ...entries].sort((a, b) => b.date.localeCompare(a.date))
    setEntries(updated)
    if (clientId.startsWith('demo-client-')) {
      try { localStorage.setItem(localKey(clientId), JSON.stringify(updated)) } catch {}
      return
    }
    const { error } = await supabase.from('registros_dolor')
      .insert({ id: entry.id, clientId, date: entry.date, zona, intensidad, nota: nota || null, tipo: tipo || null, created_at: Date.now() })
    if (error) await reload() // si el guardado falló, no dejar al cliente creyendo que se subió
  }, [clientId, entries, reload])

  const deleteEntry = useCallback(async (id: string) => {
    if (!clientId) return
    setEntries(prev => {
      const updated = prev.filter(x => x.id !== id)
      if (clientId.startsWith('demo-client-')) {
        try { localStorage.setItem(localKey(clientId), JSON.stringify(updated)) } catch {}
      }
      return updated
    })
    if (clientId.startsWith('demo-client-')) return
    const { error } = await supabase.from('registros_dolor').delete().eq('id', id)
    if (error) await reload()
  }, [clientId, reload])

  return { entries, loading, addEntry, deleteEntry, reload }
}

// Zonas con molestia articular/tendinosa activa (no agujetas) en los últimos
// 7 días — para el aviso de incompatibilidad al diseñar el plan (item 4):
// solo cuenta lo suficientemente serio (intensidad >= 4) y explícitamente
// clasificado como articular, no cualquier agujeta normal de entrenamiento.
export function useRecentPainZonas(clientId?: string) {
  const [zonas, setZonas] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!clientId) { setZonas(new Set()); return }
    fetchClientPain(clientId).then(entries => {
      const since = new Date(); since.setDate(since.getDate() - 7)
      const sinceKey = since.toISOString().split('T')[0]
      const relevant = entries.filter(e => e.date >= sinceKey && e.intensidad >= 4 && e.tipo !== 'doms')
      setZonas(new Set(relevant.map(e => e.zona)))
    })
  }, [clientId])

  return zonas
}
