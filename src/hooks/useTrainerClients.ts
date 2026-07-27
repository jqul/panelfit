import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ClientData } from '../types'
import { mapClientes } from '../lib/mappers'
import { toast } from '../components/shared/Toast'

export interface ClientWithStats extends ClientData {
  lastActive?: string
  doneToday?: boolean
  hasPlan?: boolean
  weeklyDays?: number
  planEndDate?: string
  planEndingSoon?: boolean
}

const PLAN_ENDING_SOON_DAYS = 5

function computePlanEnd(fechaInicio?: string, weeksLen?: number): { planEndDate?: string; planEndingSoon?: boolean } {
  if (!fechaInicio || !weeksLen) return {}
  const start = new Date(fechaInicio + 'T00:00:00')
  const end = new Date(start); end.setDate(start.getDate() + weeksLen * 7)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((end.getTime() - today.getTime()) / 86400000)
  return {
    planEndDate: end.toISOString().split('T')[0],
    planEndingSoon: daysLeft >= 0 && daysLeft <= PLAN_ENDING_SOON_DAYS,
  }
}

interface Options {
  trainerId: string
  demoClients?: ClientData[]
  demoLogsMap?: Record<string, any>
  clientLimit?: number
}

export function useTrainerClients({ trainerId, demoClients, demoLogsMap, clientLimit = 999 }: Options) {
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [logsMap, setLogsMap] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    if (demoClients) {
      const lm = demoLogsMap || {}
      setLogsMap(lm)
      const hoy = new Date().toISOString().split('T')[0]
      const haceUnaS = new Date(); haceUnaS.setDate(haceUnaS.getDate() - 7)
      setClients(demoClients.map(c => {
        const logs = lm[c.id] || {}
        const dates = [...new Set(
          Object.values(logs)
            .filter((l: any) => l.dateDone)
            .map((l: any) => l.dateDone as string)
        )].sort().reverse() as string[]
        return {
          ...c,
          lastActive: dates[0],
          doneToday: dates[0] === hoy,
          hasPlan: true,
          weeklyDays: dates.filter(d => new Date(d) >= haceUnaS).length,
        }
      }) as ClientWithStats[])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('clientes').select('*').eq('trainerId', trainerId)
    if (error) { console.error('Error:', error); toast('No se pudieron cargar los clientes', 'warn'); setLoading(false); return }

    const mapped = mapClientes(data || []).map((c, i) => ({
      ...c,
      phone: (data || [])[i]?.phone || '',
      objetivo: (data || [])[i]?.objetivo || 'general',
      altura: (data || [])[i]?.altura || null,
      genero: (data || [])[i]?.genero || null,
      fechanacimiento: (data || [])[i]?.fechanacimiento || null,
      label_ids: (data || [])[i]?.label_ids || [],
    }))

    const hoy = new Date().toISOString().split('T')[0]
    const haceUnaS = new Date()
    haceUnaS.setDate(haceUnaS.getDate() - 7)

    if (mapped.length) {
      const ids = mapped.map(c => c.id)
      const [{ data: regs }, { data: planes }] = await Promise.all([
        supabase.from('registros').select('clientId,logs').in('clientId', ids),
        supabase.from('planes').select('clientId,plan').in('clientId', ids),
      ])

      const planMap: Record<string, boolean> = {}
      const planEndMap: Record<string, { planEndDate?: string; planEndingSoon?: boolean }> = {}
      ;(planes || []).forEach((p: any) => {
        planMap[p.clientId] = !!(p.plan?.P?.weeks?.length)
        planEndMap[p.clientId] = computePlanEnd(p.plan?.P?.fechaInicio, p.plan?.P?.weeks?.length)
      })

      const lm: Record<string, any> = {}
      ;(regs || []).forEach((r: any) => { lm[r.clientId] = r.logs || {} })
      setLogsMap(lm)

      setClients(mapped.map(c => {
        const logs = lm[c.id] || {}
        const dates = [...new Set(
          Object.values(logs)
            .filter((l: any) => l.dateDone)
            .map((l: any) => l.dateDone as string)
        )].sort().reverse()
        return {
          ...c,
          lastActive: dates[0],
          doneToday: dates[0] === hoy,
          hasPlan: planMap[c.id] || false,
          weeklyDays: dates.filter(d => new Date(d) >= haceUnaS).length,
          ...planEndMap[c.id],
        }
      }))
    } else {
      setClients([])
    }
    setLoading(false)
  }, [trainerId, demoClients])

  useEffect(() => {
    fetchClients()
    const channel = supabase.channel('clientes-rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'clientes',
        filter: `trainerId=eq.${trainerId}`
      }, fetchClients)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [trainerId, fetchClients])

  const addClient = async (newClient: {
    name: string; surname: string; phone: string; objetivo: string
    altura: string; peso: string; genero: string; fechanacimiento: string
  }, labelIds: string[] = []) => {
    if (clients.length >= clientLimit) {
      toast(`Limite alcanzado: tu plan permite ${clientLimit} clientes.`, 'warn')
      return false
    }
    const token = Math.random().toString(36).slice(2, 14)
    const { error } = await supabase.from('clientes').insert({
      trainerId,
      name: newClient.name.trim(),
      surname: newClient.surname.trim(),
      phone: (newClient.phone || '').trim(),
      objetivo: newClient.objetivo || 'general',
      token,
      createdAt: Date.now(),
      altura: newClient.altura ? parseFloat(newClient.altura) : null,
      weight: newClient.peso ? parseFloat(newClient.peso) : 0,
      genero: newClient.genero || null,
      fechanacimiento: newClient.fechanacimiento || null,
      fatPercentage: 0, muscleMass: 0, totalLifted: 0, planDescription: '',
      label_ids: labelIds,
    })
    if (error) { toast('Error: ' + error.message, 'warn'); return false }
    toast('Cliente creado ✓', 'ok')
    await fetchClients()
    return true
  }

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) { toast('Error al eliminar el cliente', 'warn'); return false }
    await fetchClients()
    toast('Cliente eliminado', 'ok')
    return true
  }

  const limitReached = !demoClients && clients.length >= clientLimit

  return { clients, logsMap, loading, fetchClients, addClient, deleteClient, limitReached }
}
