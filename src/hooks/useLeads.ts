import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isDemoTrainerId } from '../lib/demoIds'
import { esNuevo, ordenarLeads, type EstadoLead, type Lead } from '../lib/leads'

interface ClienteNombre { id: string; name: string; surname?: string }

/** Contactos de la página pública del entrenador. Una sola carga para la Bandeja, Hoy y la pestaña de Contactos. */
export function useLeads(trainerId: string, clients: ClienteNombre[]) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const demo = isDemoTrainerId(trainerId)

  const cargar = useCallback(async () => {
    if (demo) {
      const { buildDemoLeads } = await import('../lib/demo-data-extra')
      setLeads(buildDemoLeads() as Lead[])
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('leads').select('*').eq('trainer_id', trainerId).order('created_at', { ascending: false })
    if (!error && data) setLeads(data as Lead[])
    setLoading(false)
  }, [trainerId, demo])

  useEffect(() => { void cargar() }, [cargar])

  // Al volver a la pestaña del navegador (o a la app), por si ha entrado alguien mientras tanto
  useEffect(() => {
    if (demo) return
    const alVolver = () => { if (document.visibilityState === 'visible') void cargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [cargar, demo])

  const nombres = useMemo(() => new Map(clients.map(c => [c.id, `${c.name} ${c.surname ?? ''}`.trim()])), [clients])
  const lista = useMemo(
    () => ordenarLeads(leads.map(l => ({ ...l, referrerName: l.referred_by_client_id ? nombres.get(l.referred_by_client_id) ?? l.referrerName : l.referrerName }))),
    [leads, nombres],
  )
  const nuevos = useMemo(() => lista.filter(esNuevo), [lista])

  const cambiarEstado = useCallback(async (id: string, status: EstadoLead): Promise<boolean> => {
    const antes = leads.find(l => l.id === id)?.status
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, status } : l)))
    if (demo) return true
    const { error } = await supabase.from('leads').update({ status }).eq('id', id)
    if (error && antes) { setLeads(prev => prev.map(l => (l.id === id ? { ...l, status: antes } : l))); return false }
    return !error
  }, [leads, demo])

  return { leads: lista, nuevos, loading, recargar: cargar, cambiarEstado }
}

export type LeadsState = ReturnType<typeof useLeads>
