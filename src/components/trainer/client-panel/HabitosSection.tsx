import { useState, useEffect } from 'react'
import { Plus, Trash2, CheckSquare } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { toast } from '../../shared/Toast'

interface Habito { id: string; clientId: string; text: string; sub?: string; order: number }

export function HabitosSection({ clientId }: { clientId: string }) {
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { loadHabitos() }, [clientId])

  const loadHabitos = async () => {
    setLoading(true)
    const { data } = await supabase.from('habitos').select('*').eq('clientId', clientId).order('order')
    setHabitos(data || [])
    setLoading(false)
  }

  const addHabito = async () => {
    if (!newText.trim()) return
    setAdding(true)
    const habito = { id: crypto.randomUUID().replace(/-/g, ''), clientId, text: newText.trim(), sub: '', order: habitos.length }
    const { error } = await supabase.from('habitos').insert(habito)
    if (error) { toast('Error al añadir hábito', 'warn'); setAdding(false); return }
    setHabitos(h => [...h, habito])
    setNewText('')
    setAdding(false)
  }

  const deleteHabito = async (id: string) => {
    await supabase.from('habitos').delete().eq('id', id)
    setHabitos(h => h.filter(x => x.id !== id))
  }

  if (loading) return null

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30 flex items-center gap-2">
        <CheckSquare className="w-3.5 h-3.5 text-muted" />
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Hábitos diarios</p>
      </div>
      <div className="p-4 space-y-2">
        {habitos.length === 0 && (
          <p className="text-xs text-muted text-center py-2">Sin hábitos asignados. El cliente los verá en su panel.</p>
        )}
        {habitos.map(h => (
          <div key={h.id} className="flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2">
            <span className="flex-1 text-sm">{h.text}</span>
            <button onClick={() => deleteHabito(h.id)} className="p-1 text-muted hover:text-warn"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <div className="flex gap-2">
          <input value={newText} onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHabito()}
            placeholder="Ej: Beber 2L de agua, dormir 8h..."
            className="flex-1 px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
          <button onClick={addHabito} disabled={adding || !newText.trim()}
            className="px-3 py-2 bg-ink text-white rounded-xl text-sm disabled:opacity-40">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
