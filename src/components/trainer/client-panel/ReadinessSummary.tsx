import { useState, useEffect } from 'react'
import { Moon } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { localDateKey } from '../../../lib/dates'
import { DEMO_READINESS_MAP } from '../../../lib/demo-data'
import { algunaBaja, limpiarConfigCheckin, mediaEscala, type ConfigCheckin } from '../../../lib/checkinConfig'

// Las escalas que el entrenador no pregunta llegan vacías (null) y no salen; sus preguntas propias van en `extra`
// (lib/checkinConfig).
interface ReadinessRow { date: string; sleep: number | null; soreness: number | null; stress: number | null; motivation: number | null; extra?: Record<string, number> | null }

export function ReadinessSummary({ clientId, trainerId }: { clientId: string; trainerId?: string }) {
  const [rows, setRows] = useState<ReadinessRow[]>([])
  const [config, setConfig] = useState<ConfigCheckin | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (clientId.startsWith('demo-client-')) { setRows([...(DEMO_READINESS_MAP[clientId] || [])].sort((a, b) => b.date.localeCompare(a.date))); setLoading(false); return }
    const since = new Date(); since.setDate(since.getDate() - 7)
    supabase.from('readiness_checkins').select('date, sleep, soreness, stress, motivation, extra')
      .eq('clientId', clientId).gte('date', localDateKey(since)).order('date', { ascending: false })
      .then(({ data }) => { setRows((data || []) as ReadinessRow[]); setLoading(false) })
    if (trainerId) supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
      .then(({ data }) => setConfig(limpiarConfigCheckin((data?.profile as { checkin?: unknown } | null)?.checkin)))
  }, [clientId, trainerId])

  if (loading || !rows.length) return null

  const last = rows[0]
  const lowReadiness = algunaBaja(last.sleep, last.soreness, last.motivation)
  const escalas = [
    { label: 'Sueño', value: mediaEscala(rows, r => r.sleep) },
    { label: 'Sin dolor', value: mediaEscala(rows, r => r.soreness) },
    { label: 'Sin estrés', value: mediaEscala(rows, r => r.stress) },
    { label: 'Energía', value: mediaEscala(rows, r => r.motivation) },
    // Sus preguntas propias: solo las que siguen en su check-in (con su nombre de ahora)
    ...(config?.extra || []).map(e => ({ label: e.label, value: mediaEscala(rows, r => r.extra?.[e.id]) })),
  ].filter((s): s is { label: string; value: number } => s.value !== null)

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30 flex items-center gap-2">
        <Moon className="w-3.5 h-3.5 text-muted" />
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Check-in (últimos 7 días)</p>
      </div>
      <div className="p-4 space-y-3">
        {lowReadiness && (
          <div className="bg-warn/10 border border-warn/20 rounded-xl px-3 py-2.5">
            <p className="text-xs text-warn font-medium">⚠️ Última respuesta indica baja forma — considera reducir intensidad hoy.</p>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2" aria-label="Medias del check-in">
          {escalas.map(s => (
            <div key={s.label} className="bg-bg rounded-xl p-2.5 text-center">
              <p className={`text-lg font-bold ${s.value >= 3.5 ? 'text-ok' : s.value >= 2.5 ? 'text-accent' : 'text-warn'}`}>{s.value}</p>
              <p className="text-[11px] text-muted leading-tight mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted">Media sobre {rows.length} día{rows.length > 1 ? 's' : ''} (escala 1-5)</p>
      </div>
    </div>
  )
}
