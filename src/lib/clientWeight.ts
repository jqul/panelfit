import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// Historial de peso corporal del cliente. Antes vivía SOLO en localStorage
// del navegador del cliente (`pf_weight_${clientId}`) — nunca llegaba al
// servidor, así que el entrenador (un dispositivo/sesión distinto) jamás
// podía verlo, y si el cliente cambiaba de móvil o borraba datos del
// navegador perdía su historial entero. Ahora vive en `registros_peso`
// (tabla ya existente en el esquema, con su política RLS
// trainer_or_client_owns_registros_peso, pero sin usar hasta ahora).

export interface WeightEntry { date: string; weight: number }

function localKey(clientId: string) { return `pf_weight_${clientId}` }

export async function fetchClientWeights(clientId: string): Promise<WeightEntry[]> {
  if (!clientId) return []
  if (clientId.startsWith('demo-client-')) {
    try { return JSON.parse(localStorage.getItem(localKey(clientId)) || '[]') } catch { return [] }
  }
  const { data, error } = await supabase
    .from('registros_peso')
    .select('date, weight')
    .eq('clientId', clientId)
    .order('date', { ascending: false })
  if (error || !data) return []
  return data
    .filter((r: any) => r.date && r.weight != null)
    .map((r: any) => ({ date: r.date as string, weight: r.weight as number }))
}

/**
 * Hook para el lado del cliente: lectura + registro de su propio peso.
 * `addWeight` actualiza el estado de forma optimista antes de esperar la
 * respuesta del servidor, igual que el resto de escrituras del panel
 * del cliente (sensación de app instantánea aunque la red vaya lenta).
 */
export function useClientWeights(clientId?: string) {
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!clientId) { setWeights([]); setLoading(false); return }
    setLoading(true)
    setWeights(await fetchClientWeights(clientId))
    setLoading(false)
  }, [clientId])

  useEffect(() => { reload() }, [reload])

  const addWeight = useCallback(async (weight: number, date?: string) => {
    if (!clientId) return
    const d = date || new Date().toISOString().split('T')[0]
    const updated = [{ date: d, weight }, ...weights.filter(x => x.date !== d)].sort((a, b) => b.date.localeCompare(a.date))
    setWeights(updated)
    if (clientId.startsWith('demo-client-')) {
      // Persistir también en localStorage para demo: el widget rápido del
      // dashboard y la pestaña de progreso son dos instancias de este hook
      // independientes — sin esto, cada una ve su propia copia en memoria y
      // nunca se enteran la una de la otra.
      try { localStorage.setItem(localKey(clientId), JSON.stringify(updated)) } catch {}
      return
    }
    const { error } = await supabase.from('registros_peso')
      .upsert({ clientId, date: d, weight }, { onConflict: 'clientId,date' })
    if (error) await reload() // si el guardado falló, no dejar al cliente creyendo que se subió
  }, [clientId, weights, reload])

  const deleteWeight = useCallback(async (date: string) => {
    if (!clientId) return
    setWeights(prev => {
      const updated = prev.filter(x => x.date !== date)
      if (clientId.startsWith('demo-client-')) {
        try { localStorage.setItem(localKey(clientId), JSON.stringify(updated)) } catch {}
      }
      return updated
    })
    if (clientId.startsWith('demo-client-')) return
    const { error } = await supabase.from('registros_peso').delete().eq('clientId', clientId).eq('date', date)
    if (error) await reload()
  }, [clientId, reload])

  return { weights, loading, addWeight, deleteWeight, reload }
}
