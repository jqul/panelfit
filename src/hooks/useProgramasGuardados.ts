import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isDemoTrainerId } from '../lib/demoIds'
import { alternarGuardado, limpiarGuardados } from '../lib/programasGuardados'

// Programas guardados de la galería (lib/programasGuardados): en el perfil del entrenador; en la demo, en memoria.
let demo: string[] = []

export function useProgramasGuardados(trainerId: string) {
  const [guardados, setGuardados] = useState<string[]>([])
  const esDemo = isDemoTrainerId(trainerId)

  useEffect(() => {
    let vivo = true
    if (esDemo) { setGuardados(demo); return }
    supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle().then(({ data }) => {
      if (vivo) setGuardados(limpiarGuardados((data?.profile as { programasGuardados?: unknown } | null)?.programasGuardados))
    })
    return () => { vivo = false }
  }, [trainerId, esDemo])

  const alternar = useCallback(async (id: string) => {
    let nuevos: string[] = []
    setGuardados(prev => (nuevos = alternarGuardado(prev, id)))
    if (esDemo) { demo = nuevos; return }
    const { data } = await supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
    const actuales = limpiarGuardados((data?.profile as { programasGuardados?: unknown } | null)?.programasGuardados)
    const fusion = alternarGuardado(actuales, id) // sobre lo último del servidor, por si otro dispositivo cambió algo
    await supabase.from('entrenadores').update({ profile: { ...(data?.profile || {}), programasGuardados: fusion, updatedAt: Date.now() } }).eq('uid', trainerId)
    setGuardados(fusion)
  }, [trainerId, esDemo])

  return { guardados, esGuardado: (id: string) => guardados.includes(id), alternar }
}
