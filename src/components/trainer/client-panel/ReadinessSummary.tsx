import { useState, useEffect } from 'react'
import { Moon } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

interface ReadinessRow { date: string; sleep: number; soreness: number; stress: number; motivation: number }

export function ReadinessSummary({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<ReadinessRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const since = new Date(); since.setDate(since.getDate() - 7)
    supabase.from('readiness_checkins').select('date, sleep, soreness, stress, motivation')
      .eq('clientId', clientId).gte('date', since.toISOString().split('T')[0]).order('date', { ascending: false })
      .then(({ data }) => { setRows(data || []); setLoading(false) })
  }, [clientId])

  if (loading || !rows.length) return null

  const avg = (key: keyof Omit<ReadinessRow, 'date'>) => Math.round((rows.reduce((a, r) => a + r[key], 0) / rows.length) * 10) / 10
  const last = rows[0]
  const lowReadiness = last.sleep <= 2 || last.soreness <= 2 || last.motivation <= 2

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30 flex items-center gap-2">
        <Moon className="w-3.5 h-3.5 text-muted" />
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Readiness (últimos 7 días)</p>
      </div>
      <div className="p-4 space-y-3">
        {lowReadiness && (
          <div className="bg-warn/10 border border-warn/20 rounded-xl px-3 py-2.5">
            <p className="text-xs text-warn font-medium">⚠️ Última respuesta indica baja forma — considera reducir intensidad hoy.</p>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Sueño', value: avg('sleep') },
            { label: 'Sin dolor', value: avg('soreness') },
            { label: 'Sin estrés', value: avg('stress') },
            { label: 'Motivación', value: avg('motivation') },
          ].map(s => (
            <div key={s.label} className="bg-bg rounded-xl p-2.5 text-center">
              <p className={`text-lg font-bold ${s.value >= 3.5 ? 'text-ok' : s.value >= 2.5 ? 'text-accent' : 'text-warn'}`}>{s.value}</p>
              <p className="text-[8px] text-muted uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted">Media sobre {rows.length} día{rows.length > 1 ? 's' : ''} (escala 1-5)</p>
      </div>
    </div>
  )
}
