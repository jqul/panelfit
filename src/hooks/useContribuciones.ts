import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isDemoTrainerId } from '../lib/demoIds'
import { limpiarContribuciones, type ContribucionesPropias } from '../lib/contribucionMuscular'

// Contribuciones musculares que el entrenador ajustó por ejercicio (lib/contribucionMuscular). Viven en su perfil
// (entrenadores.profile.contribMuscular), junto al resto de ajustes, así que no hace falta tabla nueva. En el demo se
// quedan solo en memoria.
export function useContribuciones(trainerId?: string) {
  const [propias, setPropias] = useState<ContribucionesPropias>({})
  const demo = isDemoTrainerId(trainerId)

  useEffect(() => {
    if (!trainerId || demo) return
    let vivo = true
    supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle().then(({ data }) => {
      if (vivo) setPropias(limpiarContribuciones((data?.profile as { contribMuscular?: unknown } | null)?.contribMuscular))
    })
    return () => { vivo = false }
  }, [trainerId, demo])

  /** Guarda el conjunto completo; devuelve false si no se pudo (y deja lo anterior). */
  const guardar = useCallback(async (nuevas: ContribucionesPropias): Promise<boolean> => {
    const antes = propias
    const limpias = limpiarContribuciones(nuevas)
    setPropias(limpias)
    if (!trainerId || demo) return true
    const { data } = await supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
    const { error } = await supabase.from('entrenadores').update({ profile: { ...(data?.profile || {}), contribMuscular: limpias, updatedAt: Date.now() } }).eq('uid', trainerId)
    if (error) { setPropias(antes); return false }
    return true
  }, [propias, trainerId, demo])

  return { propias, guardar }
}
