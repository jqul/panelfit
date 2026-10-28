import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isDemoClientId } from '../lib/demoIds'
import { localDateKey } from '../lib/dates'
import type { Tarea } from '../lib/tareas'
import { toast } from '../components/shared/Toast'

export type TareaNueva = Omit<Tarea, 'id' | 'client_id'>

// En la demo no hay tablas: una tarea de ejemplo en memoria, para que se vea en el calendario y en Hoy.
function demoInicial(clientId: string): Tarea[] {
  if (clientId !== 'demo-client-001') return []
  const lunes = new Date(); lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7))
  // Tres días a la semana, uno de ellos hoy: así quien prueba la demo la ve en Hoy sea el día que sea.
  const hoy = (new Date().getDay() + 6) % 7
  const dias = [hoy, (hoy + 2) % 7, (hoy + 4) % 7].sort((a, b) => a - b)
  return [{ id: 'demo-tarea-1', client_id: clientId, titulo: 'Caminar 30 minutos', tipo: 'cardio', nota: 'A ritmo cómodo, puedes hablar.', enlace: '',
    fecha: localDateKey(lunes), repetir: 'semanal', dias, hasta: null }]
}

/**
 * Tareas sueltas de un cliente y lo que lleva hecho. `desde`: primer día del que interesan las marcas de hecha
 * (el entrenador mira meses; el cliente, solo hoy).
 */
export function useTareasCliente(clientId: string, desde: string = localDateKey()) {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [hechas, setHechas] = useState<Set<string>>(new Set()) // "tareaId|fecha"
  const [cargando, setCargando] = useState(true)
  const demo = isDemoClientId(clientId)

  const cargar = useCallback(async () => {
    if (demo) { setTareas(t => t.length ? t : demoInicial(clientId)); setCargando(false); return }
    const [t, h] = await Promise.all([
      supabase.from('tareas_cliente').select('*').eq('client_id', clientId).order('fecha'),
      supabase.from('tareas_hechas').select('tarea_id,fecha').eq('client_id', clientId).gte('fecha', desde),
    ])
    setTareas((t.data || []) as Tarea[])
    setHechas(new Set(((h.data || []) as { tarea_id: string; fecha: string }[]).map(x => `${x.tarea_id}|${x.fecha}`)))
    setCargando(false)
  }, [clientId, desde, demo])

  useEffect(() => { cargar() }, [cargar])

  /** Crea (sin id) o cambia (con id) una tarea. Devuelve si salió bien. */
  const guardar = async (datos: TareaNueva, id?: string) => {
    const fila = { ...datos, titulo: datos.titulo.trim(), dias: datos.repetir === 'semanal' ? datos.dias : [] }
    if (demo) {
      setTareas(prev => id ? prev.map(t => t.id === id ? { ...t, ...fila } : t) : [...prev, { id: `demo-${Date.now()}`, client_id: clientId, ...fila }])
      return true
    }
    const { error } = id
      ? await supabase.from('tareas_cliente').update(fila).eq('id', id)
      : await supabase.from('tareas_cliente').insert({ client_id: clientId, ...fila })
    if (error) { toast('No se pudo guardar la tarea', 'warn'); return false }
    await cargar(); return true
  }

  const borrar = async (id: string) => {
    if (!demo) {
      const { error } = await supabase.from('tareas_cliente').delete().eq('id', id)
      if (error) { toast('No se pudo borrar', 'warn'); return }
    }
    setTareas(prev => prev.filter(t => t.id !== id))
  }

  const estaHecha = (tareaId: string, fecha: string) => hechas.has(`${tareaId}|${fecha}`)

  /** Marca o desmarca la tarea ese día (al momento en pantalla; si falla, se deshace). */
  const alternarHecha = async (tareaId: string, fecha: string) => {
    const clave = `${tareaId}|${fecha}`
    const ahora = !hechas.has(clave)
    const cambiar = (marcar: boolean) => setHechas(prev => { const s = new Set(prev); if (marcar) s.add(clave); else s.delete(clave); return s })
    cambiar(ahora)
    if (demo) return
    const { error } = ahora
      ? await supabase.from('tareas_hechas').insert({ tarea_id: tareaId, client_id: clientId, fecha })
      : await supabase.from('tareas_hechas').delete().eq('tarea_id', tareaId).eq('fecha', fecha)
    if (error) { cambiar(!ahora); toast('No se pudo guardar', 'warn') }
  }

  return { tareas, cargando, guardar, borrar, estaHecha, alternarHecha }
}
