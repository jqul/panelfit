import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface SessionNote {
  date: string
  dayKey: string
  dayTitle: string
  comment: string
  completedAt: number
  clientName: string
  clientId?: string
}

export function useSessionNotes(clientIds: string[]) {
  const [notes, setNotes] = useState<(SessionNote & { clientId: string })[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clientIds.length) return
    const fetchNotes = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('registros')
        .select('clientId, session_notes')
        .in('clientId', clientIds)
      const all: (SessionNote & { clientId: string })[] = []
      ;(data || []).forEach((row: any) => {
        const notes: SessionNote[] = row.session_notes || []
        notes.forEach(n => all.push({ ...n, clientId: row.clientId }))
      })
      // Ordenar por más reciente primero
      all.sort((a, b) => b.completedAt - a.completedAt)
      setNotes(all)
      setLoading(false)
    }
    fetchNotes()
  }, [clientIds.join(',')])

  return { notes, loading }
}
