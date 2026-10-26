import { supabase } from './supabase'
import { isDemoClientId } from './demoIds'
import type { ClienteLite, FilaPlan } from './usoEjercicio'

/** Lee los planes de los clientes reales (los de la demo no existen en el servidor). null si no se pudo leer o no hay clientes reales. */
export async function leerPlanes(clientes: ClienteLite[]): Promise<FilaPlan[] | null> {
  const ids = clientes.map(c => c.id).filter(id => !isDemoClientId(id))
  if (ids.length === 0) return null // solo clientes de la demo: no hay nada que leer, y "nadie lo lleva" sería falso
  const filas: FilaPlan[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase.from('planes').select('clientId, plan').in('clientId', ids.slice(i, i + 100))
    if (error) return null
    filas.push(...((data || []) as FilaPlan[]))
  }
  return filas
}
