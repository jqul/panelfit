import { supabase } from './supabase'
import { isDemoClientId } from './demoIds'
import type { ClienteLite, FilaPlan } from './usoEjercicio'

/** Lee los planes de los clientes reales (los de la demo no existen en el servidor). null si no se pudo leer. En la demo, de los planes de ejemplo. */
export async function leerPlanes(clientes: ClienteLite[]): Promise<FilaPlan[] | null> {
  const ids = clientes.map(c => c.id).filter(id => !isDemoClientId(id))
  if (ids.length === 0) {
    if (clientes.length === 0) return null
    // Solo clientes de la demo: sus planes de ejemplo viven en memoria, no en el servidor
    const { DEMO_PLAN_MAP } = await import('./demo-data')
    return clientes.filter(c => DEMO_PLAN_MAP[c.id]).map(c => ({ clientId: c.id, plan: { P: DEMO_PLAN_MAP[c.id] } }))
  }
  const filas: FilaPlan[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase.from('planes').select('clientId, plan').in('clientId', ids.slice(i, i + 100))
    if (error) return null
    filas.push(...((data || []) as FilaPlan[]))
  }
  return filas
}
