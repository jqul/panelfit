import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

export type MessageType = 'nueva_rutina' | 'racha' | 'descanso' | 'custom'

export const MESSAGE_TYPE_LABEL: Record<MessageType, string> = {
  nueva_rutina: 'Nueva rutina', racha: 'Racha de entreno', descanso: 'Día de descanso', custom: 'Personalizado',
}

export interface MessageTemplate {
  id: string; trainerId: string; tipo: MessageType; nombre: string; texto: string; createdAt: number
}

const DEFAULTS: { tipo: MessageType; nombre: string; texto: string }[] = [
  { tipo: 'nueva_rutina', nombre: 'Nueva rutina asignada', texto: 'Hola {{cliente}} 👋 Te he preparado una rutina nueva, ¡revísala cuando puedas! 💪' },
  { tipo: 'racha', nombre: 'Felicitar racha', texto: '¡{{cliente}}, qué racha llevas! 🔥 Sigue así, se nota el esfuerzo.' },
  { tipo: 'descanso', nombre: 'Día de descanso', texto: 'Hola {{cliente}}, hoy toca descanso 🛌 Aprovecha para recuperar bien, mañana seguimos.' },
]

/** Sustituye los placeholders del mensaje por los datos reales del cliente. */
export function resolveMessage(texto: string, clientName: string): string {
  return texto.replace(/\{\{\s*cliente\s*\}\}/gi, clientName)
}

export function useMessageTemplates(trainerId?: string) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!trainerId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('plantillas_mensajes').select('*').eq('trainerId', trainerId).order('createdAt')
    let rows = data || []
    if (rows.length === 0) {
      const seeded = DEFAULTS.map(d => ({ id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, trainerId, tipo: d.tipo, nombre: d.nombre, texto: d.texto, createdAt: Date.now() }))
      const { error } = await supabase.from('plantillas_mensajes').insert(seeded)
      if (!error) rows = seeded
    }
    setTemplates(rows as MessageTemplate[])
    setLoading(false)
  }, [trainerId])

  useEffect(() => { load() }, [load])

  const saveTemplate = useCallback(async (id: string, updates: Partial<MessageTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    await supabase.from('plantillas_mensajes').update(updates).eq('id', id)
  }, [])

  const addTemplate = useCallback(async (nombre: string, texto: string) => {
    if (!trainerId) return
    const t: MessageTemplate = { id: `msg_${Date.now()}`, trainerId, tipo: 'custom', nombre, texto, createdAt: Date.now() }
    setTemplates(prev => [...prev, t])
    await supabase.from('plantillas_mensajes').insert(t)
  }, [trainerId])

  const deleteTemplate = useCallback(async (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id))
    await supabase.from('plantillas_mensajes').delete().eq('id', id)
  }, [])

  return { templates, loading, saveTemplate, addTemplate, deleteTemplate, reload: load }
}
