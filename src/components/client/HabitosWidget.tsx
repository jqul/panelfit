import { useState, useEffect } from 'react'
import { CheckSquare, Square } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { localDateKey } from '../../lib/dates'
import { avisarCambioHoy } from '../../lib/hoyEventos'
import { esNumerico, parseValor, progresoPct, completadosTras, formatoValor } from '../../lib/habitoNumerico'

interface Habito { id: string; text: string; sub?: string; order: number; meta?: number | null; unidad?: string | null }

// Fila de un hábito con meta: el cliente escribe el valor del día y se guarda al salir del campo o al pulsar Intro.
function FilaNumerica({ h, valor, onGuardar }: { h: Habito; valor: number | undefined; onGuardar: (texto: string) => void }) {
  const [texto, setTexto] = useState(valor === undefined ? '' : String(valor).replace('.', ','))
  useEffect(() => { setTexto(valor === undefined ? '' : String(valor).replace('.', ',')) }, [valor])
  const pct = progresoPct(valor, h)
  const hecho = pct >= 100
  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center gap-3">
        {hecho ? <CheckSquare className="w-4 h-4 text-ok flex-shrink-0" /> : <Square className="w-4 h-4 text-muted flex-shrink-0" />}
        <span className={`text-sm flex-1 min-w-0 ${hecho ? 'text-muted' : ''}`}>{h.text}</span>
        <input value={texto} onChange={e => setTexto(e.target.value)}
          onBlur={() => { if (texto.trim() !== (valor === undefined ? '' : String(valor).replace('.', ','))) onGuardar(texto) }}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          inputMode="decimal" placeholder="0" aria-label={`${h.text}: valor de hoy`}
          className="w-20 px-2 py-1 bg-bg border border-border rounded-lg text-sm text-right tabular-nums outline-none focus:ring-2 focus:ring-accent/20" />
        <span className="text-[11px] text-muted w-24 text-left">/ {formatoValor(h.meta as number, h.unidad)}</span>
      </div>
      <div className="h-1 bg-bg-alt rounded-full mt-1.5 ml-7"><div className="h-full bg-ok rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

export function HabitosWidget({ clientId }: { clientId: string }) {
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [completed, setCompleted] = useState<string[]>([])
  const [valores, setValores] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const today = localDateKey()

  useEffect(() => {
    if (clientId.startsWith('demo-client-')) {
      import('../../lib/demo-data-extra').then(({ DEMO_HABITOS_MAP }) => { setHabitos((DEMO_HABITOS_MAP[clientId] || []).map(h => ({ id: h.id, text: h.text, sub: h.sub, order: h.order, meta: h.meta, unidad: h.unidad }))); setLoading(false) })
      return
    }
    setLoading(true)
    Promise.all([
      supabase.from('habitos').select('id, text, sub, order, meta, unidad').eq('clientId', clientId).order('order'),
      supabase.from('registros_habitos').select('completedHabitIds, valores').eq('clientId', clientId).eq('date', today).maybeSingle(),
    ]).then(([habitosRes, regRes]) => {
      setHabitos(habitosRes.data || [])
      setCompleted(regRes.data?.completedHabitIds || [])
      setValores(regRes.data?.valores || {})
      setLoading(false)
    })
  }, [clientId, today])

  // Para la lista "Para hoy": cuántos van, al cargar y cada vez que se marca uno.
  useEffect(() => {
    if (loading) return
    avisarCambioHoy(clientId, { habitos: { hechos: completed.filter(id => habitos.some(h => h.id === id)).length, total: habitos.length } })
  }, [clientId, loading, habitos, completed])

  const guardar = async (ids: string[], vals: Record<string, number>) => {
    if (clientId.startsWith('demo-client-')) return
    await supabase.from('registros_habitos')
      .upsert({ clientId, date: today, completedHabitIds: ids, valores: vals }, { onConflict: 'clientId,date' })
  }

  const toggle = async (id: string) => {
    const updated = completed.includes(id) ? completed.filter(x => x !== id) : [...completed, id]
    setCompleted(updated)
    await guardar(updated, valores)
  }

  // Un valor nuevo recalcula qué hábitos con meta quedan completos (marcan y desmarcan solos).
  const cambiarValor = async (h: Habito, texto: string) => {
    const n = parseValor(texto)
    const nuevos = { ...valores }
    if (n === null) delete nuevos[h.id]; else nuevos[h.id] = n
    const ids = completadosTras(habitos, completed, nuevos)
    setValores(nuevos)
    setCompleted(ids)
    await guardar(ids, nuevos)
  }

  if (loading || !habitos.length) return null

  const pct = Math.round((completed.length / habitos.length) * 100)

  return (
    <div className="px-4 pt-4">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Hábitos de hoy</p>
          <span className="text-[11px] font-bold text-accent">{completed.length}/{habitos.length}</span>
        </div>
        <div className="h-1 bg-bg-alt"><div className="h-full bg-ok transition-all" style={{ width: `${pct}%` }} /></div>
        <div className="divide-y divide-border">
          {habitos.map(h => {
            if (esNumerico(h)) return <FilaNumerica key={h.id} h={h} valor={valores[h.id]} onGuardar={t => cambiarValor(h, t)} />
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
