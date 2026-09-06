import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// Historial de dolor del cliente — pensado para seguimiento de rehabilitación
// (zona + intensidad 0-10 a lo largo del tiempo). Mismo patrón que
// clientWeight.ts: vive en `registros_dolor` con RLS
// trainer_or_client_owns_registros_dolor, y en demo se guarda en localStorage.

export interface PainEntry { id: string; date: string; zona: string; intensidad: number; nota?: string }

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
    .select('id, date, zona, intensidad, nota')
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

  const addEntry = useCallback(async (zona: string, intensidad: number, nota?: string, date?: string) => {
    if (!clientId) return
    const entry: PainEntry = { id: crypto.randomUUID().replace(/-/g, ''), date: date || new Date().toISOString().split('T')[0], zona, intensidad, nota }
    const updated = [entry, ...entries].sort((a, b) => b.date.localeCompare(a.date))
    setEntries(updated)
    if (clientId.startsWith('demo-client-')) {
      try { localStorage.setItem(localKey(clientId), JSON.stringify(updated)) } catch {}
      return
    }
    const { error } = await supabase.from('registros_dolor')
      .insert({ id: entry.id, clientId, date: entry.date, zona, intensidad, nota: nota || null, created_at: Date.now() })
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
