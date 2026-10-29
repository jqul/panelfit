import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { logError } from './errors'
import { localDateKey } from './dates'
import type { TareaDePrograma } from './tareasPrograma'

// Al asignar (o actualizar, o quitar) un programa, las tareas que vienen de programas (origen "programa:…") siguen al
// programa actual: se quitan las que estaban por venir y sin hacer, y se ponen las del programa nuevo desde hoy. Las
// ya hechas o pasadas no se tocan (son su historial). Devuelve cómo deshacerlo.
//
// Las tareas son secundarias: si algo falla se anota y se sigue (la asignación del plan ya está hecha).

type Fila = TareaDePrograma & { id: string; client_id: string }

export async function sincronizarTareasPrograma(
  destinos: { clientId: string; tareas: TareaDePrograma[] }[], hoy = localDateKey(),
): Promise<() => Promise<void>> {
  const ids = destinos.map(d => d.clientId)
  if (!ids.length) return async () => {}
  let quitadas: Fila[] = []
  let puestas: string[] = []
  try {
    const { data: futuras, error } = await supabase.from('tareas_cliente').select('*')
      .in('client_id', ids).like('origen', 'programa:*').gte('fecha', hoy) // * es el comodín de PostgREST, como %
    if (error) throw error
    const candidatas = (futuras || []) as Fila[]
    if (candidatas.length) {
      const { data: hechas, error: e2 } = await supabase.from('tareas_hechas').select('tarea_id').in('tarea_id', candidatas.map(t => t.id))
      if (e2) throw e2
      const conMarca = new Set((hechas || []).map((h: { tarea_id: string }) => h.tarea_id))
      quitadas = candidatas.filter(t => !conMarca.has(t.id))
      if (quitadas.length) {
        const { error: e3 } = await supabase.from('tareas_cliente').delete().in('id', quitadas.map(t => t.id))
        if (e3) { quitadas = []; throw e3 }
      }
    }
    const nuevas = destinos.flatMap(d => d.tareas.filter(t => t.fecha >= hoy).map(t => ({ ...t, client_id: d.clientId })))
    if (nuevas.length) {
      const { data, error: e4 } = await supabase.from('tareas_cliente').insert(nuevas).select('id')
      if (e4) throw e4
      puestas = (data || []).map((r: { id: string }) => r.id)
    }
  } catch (err) {
    logError('sincronizarTareasPrograma', err as PostgrestError)
  }
  return async () => {
    if (puestas.length) await supabase.from('tareas_cliente').delete().in('id', puestas)
    if (quitadas.length) await supabase.from('tareas_cliente').insert(quitadas)
  }
}
