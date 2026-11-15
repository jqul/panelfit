import { useEffect, useMemo, useState } from 'react'
import { Trophy } from 'lucide-react'
import type { ClientData, TrainingLogs, TrainingPlan } from '../../types'
import { supabase } from '../../lib/supabase'
import { localDateKey } from '../../lib/dates'
import { isDemoTrainerId } from '../../lib/demoIds'
import { recordsDeLaSemana } from '../../lib/recordsSemana'

const kg = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 })
const dia = (f: string) => new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' })

// Hoy del entrenador → «Récords de la semana» de todos sus clientes (lib/recordsSemana): a quién felicitar.
export function RecordsSemana({ trainerId, clients, logsMap, onAbrir }: {
  trainerId: string; clients: ClientData[]; logsMap: Record<string, TrainingLogs | undefined>; onAbrir: (c: ClientData) => void
}) {
  const [planes, setPlanes] = useState<Record<string, TrainingPlan | null> | null>(null)
  const clave = clients.map(c => c.id).join(',')
  useEffect(() => {
    let vivo = true
    if (isDemoTrainerId(trainerId)) { import('../../lib/demo-data').then(d => { if (vivo) setPlanes(d.DEMO_PLAN_MAP) }); return () => { vivo = false } }
    if (!clients.length) { setPlanes({}); return }
    supabase.from('planes').select('clientId, plan').in('clientId', clients.map(c => c.id)).then(({ data }) => {
      if (!vivo) return
      const m: Record<string, TrainingPlan | null> = {}
      for (const r of (data || []) as { clientId: string; plan: { P?: TrainingPlan } | null }[]) m[r.clientId] = r.plan?.P || null
      setPlanes(m)
    })
    return () => { vivo = false }
  }, [trainerId, clave]) // eslint-disable-line react-hooks/exhaustive-deps

  const records = useMemo(() => planes ? recordsDeLaSemana(clients, logsMap, planes, localDateKey()) : [], [planes, clients, logsMap])
  if (!records.length) return null
  return (
    <section aria-label="Récords de la semana" className="bg-card rounded-2xl p-4 space-y-2" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <h3 className="text-sm font-semibold flex items-center gap-2"><Trophy className="w-4 h-4 text-warn" /> Récords de la semana <span className="text-xs text-muted font-normal">· {records.length}</span></h3>
      <ul className="divide-y divide-border/50">
        {records.slice(0, 8).map(r => {
          const c = clients.find(x => x.id === r.clientId)
          return (
            <li key={`${r.clientId}:${r.ejercicio}`}>
              <button type="button" onClick={() => c && onAbrir(c)} className="w-full flex items-center gap-3 py-2 text-left hover:bg-bg-alt/30">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{r.nombre}</span>
                  <span className="block text-xs text-muted truncate">🏆 {r.ejercicio} · {dia(r.fecha)}</span>
                </span>
                <span className="text-xs tabular-nums text-muted">{kg(r.antes)} → <strong className="text-ink">{kg(r.ahora)} kg</strong></span>
                <span className="text-xs font-bold text-ok tabular-nums w-12 text-right">+{Math.round(((r.ahora - r.antes) / r.antes) * 100)} %</span>
              </button>
            </li>
          )
        })}
      </ul>
      {records.length > 8 && <p className="text-[11px] text-muted">y {records.length - 8} más</p>}
      <p className="text-[11px] text-muted">1RM estimado frente al mejor de antes. Buen momento para felicitarles o contarlo en tus redes.</p>
    </section>
  )
}
