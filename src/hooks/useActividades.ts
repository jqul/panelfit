import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../components/shared/Toast'
import { localDateKey } from '../lib/dates'
import type { ActividadReloj, Deporte } from '../lib/actividadReloj'

// Entrenos del reloj de un cliente (tabla `actividades`): los últimos, guardar uno importado y borrarlo. En la demo,
// en memoria.
export interface ActividadGuardada extends ActividadReloj { id: string; fecha: string }

interface Fila {
  id: string; fecha: string; inicio: string | null; deporte: Deporte; nombre: string; duracion_s: number
  distancia_m: number | null; desnivel_m: number | null; fc_media: number | null; fc_max: number | null; kcal: number | null
}
const deFila = (f: Fila): ActividadGuardada => ({
  id: f.id, fecha: f.fecha, inicio: f.inicio, deporte: f.deporte, nombre: f.nombre, duracionS: f.duracion_s,
  distanciaM: f.distancia_m, desnivelM: f.desnivel_m, fcMedia: f.fc_media, fcMax: f.fc_max, kcal: f.kcal,
})

const demoPorCliente = new Map<string, ActividadGuardada[]>()
// Demo: María ya trae dos entrenos del reloj de esta semana
const haceDias = (n: number) => localDateKey(new Date(Date.now() - n * 86400000))
demoPorCliente.set('demo-client-001', [
  { id: 'demo-act-1', fecha: haceDias(1), inicio: null, deporte: 'correr', nombre: 'Rodaje suave', duracionS: 2460, distanciaM: 6200, desnivelM: 35, fcMedia: 146, fcMax: 163, kcal: 410 },
  { id: 'demo-act-2', fecha: haceDias(4), inicio: null, deporte: 'bici', nombre: 'Salida en bici', duracionS: 4500, distanciaM: 31500, desnivelM: 280, fcMedia: 132, fcMax: 158, kcal: 690 },
])
const esDemo = (id: string) => id.startsWith('demo-client-')

export function useActividades(clientId: string) {
  const [actividades, setActividades] = useState<ActividadGuardada[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    if (esDemo(clientId)) { setActividades(demoPorCliente.get(clientId) || []); setCargando(false); return }
    supabase.from('actividades').select('*').eq('client_id', clientId).order('fecha', { ascending: false }).limit(50)
      .then(({ data }) => { if (vivo) { setActividades(((data || []) as Fila[]).map(deFila)); setCargando(false) } })
    return () => { vivo = false }
  }, [clientId])

  /** Guarda un entreno importado. true si se guardó (o ya estaba). */
  const guardar = useCallback(async (a: ActividadReloj): Promise<boolean> => {
    const fecha = localDateKey(a.inicio ? new Date(a.inicio) : new Date())
    if (esDemo(clientId)) {
      const nueva = { ...a, id: `demo-act-${Date.now()}`, fecha }
      demoPorCliente.set(clientId, [nueva, ...(demoPorCliente.get(clientId) || [])])
      setActividades(prev => [nueva, ...prev])
      return true
    }
    const fila = {
      client_id: clientId, fecha, inicio: a.inicio, deporte: a.deporte, nombre: a.nombre.slice(0, 80), duracion_s: a.duracionS,
      distancia_m: a.distanciaM, desnivel_m: a.desnivelM, fc_media: a.fcMedia, fc_max: a.fcMax, kcal: a.kcal,
    }
    const { data, error } = await supabase.from('actividades').insert(fila).select('*').single()
    if (error) {
      if (error.code === '23505') { toast('Ese entreno ya estaba importado', 'info'); return true }
      toast('No se pudo guardar el entreno', 'warn'); return false
    }
    setActividades(prev => [deFila(data as Fila), ...prev].sort((x, y) => y.fecha.localeCompare(x.fecha)))
    return true
  }, [clientId])

  const borrar = useCallback(async (id: string) => {
    if (!esDemo(clientId)) {
      const { error } = await supabase.from('actividades').delete().eq('id', id)
      if (error) { toast('No se pudo borrar', 'warn'); return }
    } else demoPorCliente.set(clientId, (demoPorCliente.get(clientId) || []).filter(a => a.id !== id))
    setActividades(prev => prev.filter(a => a.id !== id))
  }, [clientId])

  return { actividades, cargando, guardar, borrar }
}
