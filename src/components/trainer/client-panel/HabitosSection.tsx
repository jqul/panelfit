import { useState, useEffect } from 'react'
import { Plus, Trash2, CheckSquare } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { toast } from '../../shared/Toast'
import { DEMO_HABITOS_MAP, isDemoClientId } from '../../../lib/demo-data-extra'
import { esNumerico, parseValor, formatoValor } from '../../../lib/habitoNumerico'

interface Habito { id: string; clientId: string; text: string; sub?: string; order: number; meta?: number | null; unidad?: string | null }

export function HabitosSection({ clientId }: { clientId: string }) {
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [adding, setAdding] = useState(false)
  const [newMeta, setNewMeta] = useState('')
  const [newUnidad, setNewUnidad] = useState('')

  useEffect(() => { loadHabitos() }, [clientId])

  const loadHabitos = async () => {
    setLoading(true)
    if (isDemoClientId(clientId)) { setHabitos([...(DEMO_HABITOS_MAP[clientId] || [])]); setLoading(false); return }
    const { data } = await supabase.from('habitos').select('*').eq('clientId', clientId).order('order')
    setHabitos(data || [])
    setLoading(false)
  }

  const addHabito = async () => {
    if (!newText.trim()) return
    setAdding(true)
    // Con meta (p. ej. 10000 + "pasos") el cliente escribe el valor del día y el hábito se marca solo al llegar a ella.
    const meta = newMeta.trim() ? parseValor(newMeta) : null
    if (newMeta.trim() && (meta === null || meta <= 0)) { toast('La meta debe ser un número mayor que cero', 'warn'); setAdding(false); return }
    const habito = { id: crypto.randomUUID().replace(/-/g, ''), clientId, text: newText.trim(), sub: '', order: habitos.length, ...(meta ? { meta, unidad: newUnidad.trim().slice(0, 20) || null } : {}) }
    const { error } = isDemoClientId(clientId) ? { error: null } : await supabase.from('habitos').insert(habito)
    if (!error && isDemoClientId(clientId)) DEMO_HABITOS_MAP[clientId] = [...(DEMO_HABITOS_MAP[clientId] || []), habito]
    if (error) { toast('Error al añadir hábito', 'warn'); setAdding(false); return }
    setHabitos(h => [...h, habito])
    setNewText('')
    setNewMeta('')
    setNewUnidad('')
    setAdding(false)
  }

  const deleteHabito = async (id: string) => {
    if (isDemoClientId(clientId)) DEMO_HABITOS_MAP[clientId] = (DEMO_HABITOS_MAP[clientId] || []).filter(x => x.id !== id)
    else await supabase.from('habitos').delete().eq('id', id)
    setHabitos(h => h.filter(x => x.id !== id))
  }

  if (loading) return null

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
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
            {esNumerico(h) && <span className="text-[11px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">meta {formatoValor(h.meta as number, h.unidad)}</span>}
            <button onClick={() => deleteHabito(h.id)} aria-label="Eliminar hábito" className="p-1 text-muted hover:text-warn"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <div className="flex gap-2">
          <input value={newText} onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHabito()}
            placeholder="Ej: Beber 2L de agua, dormir 8h..." aria-label="Nuevo hábito"
            className="flex-1 px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
          <input value={newMeta} onChange={e => setNewMeta(e.target.value)} inputMode="decimal" placeholder="Meta" aria-label="Meta del hábito (opcional)"
            className="w-20 px-2 py-2 bg-bg border border-border rounded-xl text-sm text-right outline-none focus:ring-2 focus:ring-accent/20" />
          <input value={newUnidad} onChange={e => setNewUnidad(e.target.value)} maxLength={20} placeholder="Unidad" aria-label="Unidad de la meta (opcional)"
            className="w-20 px-2 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
          <button onClick={addHabito} disabled={adding || !newText.trim()} aria-label="Añadir hábito"
            className="px-3 py-2 bg-ink text-white rounded-xl text-sm disabled:opacity-40">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
