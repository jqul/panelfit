import { useState, useEffect } from 'react'
import { Moon, Frown, Zap, Flame } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Metric { key: 'sleep' | 'soreness' | 'stress' | 'motivation'; label: string; icon: React.ReactNode; lowLabel: string; highLabel: string }

const METRICS: Metric[] = [
  { key: 'sleep', label: '¿Cómo dormiste?', icon: <Moon className="w-4 h-4" />, lowLabel: 'Mal', highLabel: 'Genial' },
  { key: 'soreness', label: '¿Dolor muscular?', icon: <Frown className="w-4 h-4" />, lowLabel: 'Mucho', highLabel: 'Nada' },
  { key: 'stress', label: '¿Nivel de estrés?', icon: <Zap className="w-4 h-4" />, lowLabel: 'Alto', highLabel: 'Bajo' },
  { key: 'motivation', label: '¿Motivación de hoy?', icon: <Flame className="w-4 h-4" />, lowLabel: 'Baja', highLabel: 'Alta' },
]

export function ReadinessCheckin({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true)
  const [doneToday, setDoneToday] = useState(false)
  const [values, setValues] = useState<Record<string, number>>({ sleep: 3, soreness: 3, stress: 3, motivation: 3 })
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    supabase.from('readiness_checkins').select('id').eq('clientId', clientId).eq('date', today).maybeSingle()
      .then(({ data }) => { setDoneToday(!!data); setLoading(false) })
  }, [clientId, today])

  const submit = async () => {
    setSaving(true)
    const { error } = await supabase.from('readiness_checkins').upsert({
      clientId, date: today, ...values,
    }, { onConflict: 'clientId,date' })
    setSaving(false)
    if (!error) setDoneToday(true)
  }

  if (loading || doneToday) return null

  return (
    <div className="px-4 pt-4">
      <div className="bg-card border border-accent/20 rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-accent/5">
          <p className="text-sm font-semibold">¿Cómo te encuentras hoy?</p>
          <p className="text-xs text-muted mt-0.5">30 segundos — ayuda a ajustar tu entreno</p>
        </div>
        <div className="p-4 space-y-4">
          {METRICS.map(m => (
            <div key={m.key}>
              <div className="flex items-center gap-2 mb-1.5 text-muted">
                {m.icon}<span className="text-xs font-semibold">{m.label}</span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} onClick={() => setValues(s => ({ ...s, [m.key]: v }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                      values[m.key] === v ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'
                    }`}>
                    {v}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-muted mt-0.5">
                <span>{m.lowLabel}</span><span>{m.highLabel}</span>
              </div>
            </div>
          ))}
          <button onClick={submit} disabled={saving}
            className="w-full py-3 bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-50">
            {saving ? 'Guardando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
