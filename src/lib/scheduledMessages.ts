import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from './supabase'
import { localDateKey } from './dates'
import { nuevoIdMensaje } from './scheduledMessageId'
import { isDemoTrainerId, buildDemoScheduledMessages } from './demo-data-extra'

export interface ScheduledMessage {
  id: string
  trainerId: string
  clientId: string
  tipo: string
  mensaje: string
  fechaEnvio: string // 'YYYY-MM-DD'
  enviado: boolean
  pushEnviado: boolean
  createdAt: number
}

function todayISO() {
  return localDateKey()
}

export function useScheduledMessages(trainerId?: string) {
  const [messages, setMessages] = useState<ScheduledMessage[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!trainerId) { setLoading(false); return }
    if (isDemoTrainerId(trainerId)) { setMessages(buildDemoScheduledMessages() as ScheduledMessage[]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('programacion_mensajes')
      .select('*')
      .eq('trainerId', trainerId)
      .eq('enviado', false)
      .order('fechaEnvio')
    setMessages((data || []) as ScheduledMessage[])
    setLoading(false)
  }, [trainerId])

  useEffect(() => { load() }, [load])

  const schedule = useCallback(async (clientId: string, tipo: string, mensaje: string, fechaEnvio: string) => {
    if (!trainerId) return
    const row = {
      id: nuevoIdMensaje(),
      trainerId, clientId, tipo, mensaje, fechaEnvio,
      enviado: false, pushEnviado: false, createdAt: Date.now(),
    }
    const { error } = isDemoTrainerId(trainerId) ? { error: null } : await supabase.from('programacion_mensajes').insert(row)
    if (!error) setMessages(prev => [...prev, row as ScheduledMessage].sort((a, b) => a.fechaEnvio.localeCompare(b.fechaEnvio)))
    return !error
  }, [trainerId])

  const markPushSent = useCallback(async (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, pushEnviado: true } : m))
    if (isDemoTrainerId(trainerId)) return
    await supabase.from('programacion_mensajes').update({ pushEnviado: true }).eq('id', id)
  }, [trainerId])

  const markSent = useCallback(async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id))
    if (isDemoTrainerId(trainerId)) return
    await supabase.from('programacion_mensajes').update({ enviado: true }).eq('id', id)
  }, [trainerId])

  const remove = useCallback(async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id))
    if (isDemoTrainerId(trainerId)) return
    await supabase.from('programacion_mensajes').delete().eq('id', id)
  }, [trainerId])

  const due = useMemo(() => {
    const today = todayISO()
    return messages.filter(m => m.fechaEnvio <= today)
  }, [messages])

  const upcoming = useMemo(() => {
    const today = todayISO()
    return messages.filter(m => m.fechaEnvio > today)
  }, [messages])

  return { messages, due, upcoming, loading, schedule, markPushSent, markSent, remove, reload: load }
}
