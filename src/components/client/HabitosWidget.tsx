import { useState, useEffect } from 'react'
import { CheckSquare, Square } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Habito { id: string; text: string; sub?: string; order: number }

export function HabitosWidget({ clientId }: { clientId: string }) {
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [completed, setCompleted] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('habitos').select('id, text, sub, order').eq('clientId', clientId).order('order'),
      supabase.from('registros_habitos').select('completedHabitIds').eq('clientId', clientId).eq('date', today).maybeSingle(),
    ]).then(([habitosRes, regRes]) => {
      setHabitos(habitosRes.data || [])
      setCompleted(regRes.data?.completedHabitIds || [])
      setLoading(false)
    })
  }, [clientId, today])

  const toggle = async (id: string) => {
    const updated = completed.includes(id) ? completed.filter(x => x !== id) : [...completed, id]
    setCompleted(updated)
    await supabase.from('registros_habitos')
      .upsert({ clientId, date: today, completedHabitIds: updated }, { onConflict: 'clientId,date' })
  }

  if (loading || !habitos.length) return null

  const pct = Math.round((completed.length / habitos.length) * 100)

  return (
    <div className="px-4 pt-4">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Hábitos de hoy</p>
          <span className="text-[10px] font-bold text-accent">{completed.length}/{habitos.length}</span>
        </div>
        <div className="h-1 bg-bg-alt"><div className="h-full bg-ok transition-all" style={{ width: `${pct}%` }} /></div>
        <div className="divide-y divide-border">
          {habitos.map(h => {
            const done = completed.includes(h.id)
            return (
              <button key={h.id} onClick={() => toggle(h.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-bg-alt/30 transition-colors">
                {done ? <CheckSquare className="w-4 h-4 text-ok flex-shrink-0" /> : <Square className="w-4 h-4 text-muted flex-shrink-0" />}
                <span className={`text-sm ${done ? 'text-muted line-through' : ''}`}>{h.text}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
