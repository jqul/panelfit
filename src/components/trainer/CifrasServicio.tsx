import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { ClientData, TrainingLogs, TrainingPlan } from '../../types'
import { isDemoTrainerId } from '../../lib/demoIds'
import { localDateKey } from '../../lib/dates'
import { cifrasServicio, moverMes, type CargaServicio, type ReaccionServicio } from '../../lib/cifrasServicio'

// Negocio → "Calidad del servicio": sesiones del mes, cuántas completas, cómo las valoraron y el esfuerzo medio
// (lib/cifrasServicio). Se piden los planes, las reacciones y el RPE de los últimos 12 meses una vez; el mes se cambia
// sin volver a pedir nada.
const MESES = 12

export function CifrasServicio({ trainerId, clients, logsMap }: { trainerId: string; clients: ClientData[]; logsMap: Record<string, TrainingLogs | undefined> }) {
  const actual = localDateKey().slice(0, 7)
  const [mes, setMes] = useState(actual)
  const [datos, setDatos] = useState<{ planes: Record<string, TrainingPlan | null>; reacciones: ReaccionServicio[]; cargas: CargaServicio[] } | null>(null)
  const ids = useMemo(() => clients.map(c => c.id), [clients])
  const clave = ids.join(',') // no volver a pedir si solo cambia la lista, no quién está en ella

  useEffect(() => {
    let vivo = true
    const desde = `${moverMes(actual, -(MESES - 1))}-01`
    if (isDemoTrainerId(trainerId)) {
      Promise.all([import('../../lib/demo-data'), import('../../lib/demo-data-extra')]).then(([d, x]) => {
        if (!vivo) return
        const reacciones = Object.entries(x.DEMO_REACTIONS_MAP).flatMap(([clientId, rs]) => rs.map(r => ({ clientId, date: r.date, emoji: r.emoji })))
        setDatos({ planes: d.DEMO_PLAN_MAP, reacciones, cargas: [] })
      })
      return () => { vivo = false }
    }
    if (!ids.length) { setDatos({ planes: {}, reacciones: [], cargas: [] }); return }
    Promise.all([
      supabase.from('planes').select('clientId, plan').in('clientId', ids),
      supabase.from('session_reactions').select('clientId, date, emoji').in('clientId', ids).gte('date', desde),
      supabase.from('session_load').select('client_id, date, rpe').eq('trainer_id', trainerId).gte('date', desde),
    ]).then(([p, r, c]) => {
      if (!vivo) return
      const planes: Record<string, TrainingPlan | null> = {}
      for (const row of (p.data || []) as { clientId: string; plan: { P?: TrainingPlan } | null }[]) planes[row.clientId] = row.plan?.P || null
      setDatos({ planes, reacciones: (r.data || []) as ReaccionServicio[], cargas: (c.data || []) as CargaServicio[] })
    })
    return () => { vivo = false }
  }, [trainerId, clave, actual]) // eslint-disable-line react-hooks/exhaustive-deps

  const cifras = useMemo(() => datos && cifrasServicio(
    clients.map(c => ({ id: c.id, plan: datos.planes[c.id], logs: logsMap[c.id] || {} })), datos.reacciones, datos.cargas, mes,
  ), [datos, clients, logsMap, mes])

  if (!cifras) return null
  const nombreMes = new Date(`${mes}-15T12:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const primero = moverMes(actual, -(MESES - 1))
  const tiles = [
    { label: 'Sesiones hechas', valor: String(cifras.sesiones), detalle: `${cifras.clientes} cliente${cifras.clientes === 1 ? '' : 's'}` },
    { label: 'Sesiones completas', valor: cifras.pctCompletas === null ? '—' : `${cifras.pctCompletas}%`, detalle: `${cifras.completas} con el 80 % o más hecho` },
    { label: 'Valoración positiva', valor: cifras.reacciones.pctPositivas === null ? '—' : `${cifras.reacciones.pctPositivas}%`, detalle: `🔥 💪 👍 de ${cifras.reacciones.total} valoraciones` },
    { label: 'Esfuerzo medio', valor: cifras.rpe.media === null ? '—' : `${String(cifras.rpe.media).replace('.', ',')}/10`, detalle: `RPE de ${cifras.rpe.n} sesiones` },
  ]

  return (
    <section aria-label="Calidad del servicio" className="bg-card rounded-2xl p-5 space-y-4" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-serif font-bold">Calidad del servicio</h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMes(moverMes(mes, -1))} disabled={mes <= primero} aria-label="Mes anterior"
            className="p-1.5 rounded-lg text-muted hover:bg-bg-alt disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold capitalize min-w-[8.5rem] text-center" data-testid="mes-servicio">{nombreMes}</span>
          <button type="button" onClick={() => setMes(moverMes(mes, 1))} disabled={mes >= actual} aria-label="Mes siguiente"
            className="p-1.5 rounded-lg text-muted hover:bg-bg-alt disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(t => (
          <div key={t.label} className="bg-bg-alt/40 rounded-xl p-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t.label}</dt>
            <dd className="text-2xl font-serif font-bold mt-1">{t.valor}</dd>
            <dd className="text-[11px] text-muted">{t.detalle}</dd>
          </div>
        ))}
      </dl>
      {cifras.reacciones.total > 0 && (
        <p className="text-xs text-muted" aria-label="Valoraciones por emoji">
          {Object.entries(cifras.reacciones.porEmoji).sort((a, b) => b[1] - a[1]).map(([e, n]) => `${e} ${n}`).join(' · ')}
          {cifras.reacciones.molestias > 0 && ` — ${cifras.reacciones.molestias} con molestias`}
        </p>
      )}
      {cifras.sesiones === 0 && <p className="text-xs text-muted">Nadie ha registrado sesiones este mes.</p>}
    </section>
  )
}
