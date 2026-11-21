import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { leerResumenCoachIa, RESUMEN_COACH_IA_VACIO, type ResumenCoachIa } from '../lib/coachIa'

/** Coach IA beta (lib/coachIa): si esta cuenta lo tiene habilitado y qué casos hay. Lo decide la base de datos (`coach_ia_resumen`): la app no puede
 *  leer la lista de habilitados ni baja las respuestas de salud para calcular nada. Si la función no existe todavía o falla, es «no habilitado»
 *  (cerrado por defecto): nada de Coach IA se enseña. `omitir` (la demostración) no llama a nada. */
export function useCoachIa(omitir = false): ResumenCoachIa & { cargado: boolean } {
  const [resumen, setResumen] = useState<ResumenCoachIa>(RESUMEN_COACH_IA_VACIO)
  const [cargado, setCargado] = useState(omitir)

  useEffect(() => {
    if (omitir) return
    let vivo = true
    supabase.rpc('coach_ia_resumen').then(({ data, error }) => {
      if (!vivo) return
      setResumen(error ? RESUMEN_COACH_IA_VACIO : leerResumenCoachIa(data))
      setCargado(true)
    })
    return () => { vivo = false }
  }, [omitir])

  return { ...resumen, cargado }
}
