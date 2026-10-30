import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isDemoTrainerId } from '../lib/demoIds'

export interface Profesional { uid: string; nombre: string }

// El dueño y su equipo (profesionales_del_equipo), para asignar cada cliente a un profesional. Con un solo profesional
// (sin equipo) la lista tiene uno y la app no enseña nada de esto. Se pide una vez por dueño y se comparte.
const cache = new Map<string, Promise<Profesional[]>>()

export function useProfesionalesEquipo(ownerId: string): Profesional[] {
  const [lista, setLista] = useState<Profesional[]>([])
  useEffect(() => {
    if (!ownerId || isDemoTrainerId(ownerId)) { setLista([]); return }
    if (!cache.has(ownerId)) {
      cache.set(ownerId, Promise.resolve(supabase.rpc('profesionales_del_equipo', { p_owner: ownerId }))
        .then(({ data }) => (data || []) as Profesional[])
        .catch(() => { cache.delete(ownerId); return [] }))
    }
    let vigente = true
    cache.get(ownerId)!.then(l => { if (vigente) setLista(l) })
    return () => { vigente = false }
  }, [ownerId])
  return lista
}
