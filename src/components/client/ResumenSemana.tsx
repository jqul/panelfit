import { useEffect, useMemo, useState } from 'react'
import type { TrainingLogs, TrainingPlan } from '../../types'
import { supabase } from '../../lib/supabase'
import { localDateKey } from '../../lib/dates'
import { semanaResumen } from '../../lib/hoyResumen'
import { getEffectiveWeekIdx } from '../../lib/planWeek'
import { useTareasCliente } from '../../hooks/useTareasCliente'
import { resumenSemanal, diasDeLaSemana } from '../../lib/resumenSemanal'

// Hoy del cliente: «Tu semana», cuánto lleva hecho de lo que le toca (entrenos, hábitos, tareas, check-in) de lunes a
// hoy (lib/resumenSemanal). El check-in solo cuenta si lo hace a menudo (alguno en las últimas 4 semanas), para no
// regañar a quien no lo usa. Se carga aparte (lazy), como el resto de lo que va debajo del entreno de hoy.
export function ResumenSemana({ clientId, plan, logs }: { clientId: string; plan: TrainingPlan; logs: TrainingLogs }) {
  const dias = useMemo(() => diasDeLaSemana(), [])
  const lunes = dias[0]
  const demo = clientId.startsWith('demo-client-')
  const { tareas, estaHecha, cargando: cargandoTareas } = useTareasCliente(clientId, lunes)
  const [habitos, setHabitos] = useState<{ total: number; hechosPorDia: Record<string, number> } | undefined>()
  const [checkins, setCheckins] = useState<string[] | undefined>()
  const [listo, setListo] = useState(demo)

  useEffect(() => {
    if (demo) return
    const hace28 = new Date(); hace28.setDate(hace28.getDate() - 28)
    Promise.all([
      supabase.from('habitos').select('id').eq('clientId', clientId),
      supabase.from('registros_habitos').select('date, completedHabitIds').eq('clientId', clientId).gte('date', lunes),
      supabase.from('readiness_checkins').select('date').eq('clientId', clientId).gte('date', localDateKey(hace28)),
    ]).then(([h, rh, rc]) => {
      const ids = new Set((h.data || []).map((x: { id: string }) => x.id))
      const porDia: Record<string, number> = {}
      for (const r of (rh.data || []) as { date: string; completedHabitIds: string[] | null }[]) porDia[r.date] = (r.completedHabitIds || []).filter(id => ids.has(id)).length
      setHabitos({ total: ids.size, hechosPorDia: porDia })
      const fechas = ((rc.data || []) as { date: string }[]).map(r => r.date)
      setCheckins(fechas.length ? fechas : undefined)
      setListo(true)
    })
  }, [clientId, lunes, demo])

  if (!listo || cargandoTareas) return null
  const r = resumenSemanal({
    dias,
    entrenos: semanaResumen(plan, logs, getEffectiveWeekIdx(plan, logs)),
    habitos,
    tareas: { lista: tareas, hechas: dias.flatMap(d => tareas.filter(t => estaHecha(t.id, d)).map(t => ({ tarea_id: t.id, fecha: d }))) },
    checkins,
  })
  if (r.pct === null) return null

  return (
    <section className="px-4 pt-4" aria-label="Tu semana">
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu semana</p>
          <p className="text-sm font-semibold"><span className="font-serif text-xl font-bold tabular-nums">{r.pct}%</span> <span className="text-xs text-muted">hecho</span></p>
        </div>
        <ul className="space-y-2">
          {r.partes.map(p => (
            <li key={p.id}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="font-semibold">{p.label}</span>
                <span className="text-muted tabular-nums">{p.hechas} de {p.previstas}</span>
              </div>
              <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${p.pct >= 80 ? 'bg-ok' : 'bg-accent'}`} style={{ width: `${p.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
