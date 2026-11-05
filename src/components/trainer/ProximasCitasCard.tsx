import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import type { ClientData } from '../../types'
import { supabase } from '../../lib/supabase'
import { logError } from '../../lib/errors'
import { citasProximas, type CitaLite, type CitaProxima } from '../../lib/citasProximas'
import { DEMO_TRAINER_ID } from '../../lib/demoIds'

// Hoy del entrenador: las citas que quedan hoy y las de mañana, con la hora y el cliente. Un toque abre la agenda.
export function ProximasCitasCard({ trainerId, clients, onVerAgenda }: { trainerId: string; clients: ClientData[]; onVerAgenda: () => void }) {
  const [citas, setCitas] = useState<CitaProxima[] | null>(null)

  useEffect(() => {
    if (trainerId === DEMO_TRAINER_ID) { import('../../lib/demo-data').then(m => setCitas(citasProximas(m.DEMO_CITAS as CitaLite[]))); return }
    const desde = new Date(); desde.setHours(0, 0, 0, 0)
    const hasta = new Date(desde); hasta.setDate(hasta.getDate() + 2)
    supabase.from('citas').select('id, client_id, title, start_at, end_at, status').eq('trainer_id', trainerId)
      .gte('start_at', desde.toISOString()).lt('start_at', hasta.toISOString()).order('start_at')
      .then(({ data, error }) => {
        if (error) { logError('ProximasCitasCard', error); setCitas([]); return }
        setCitas(citasProximas((data || []) as CitaLite[]))
      })
  }, [trainerId])

  if (citas === null) return null
  const nombre = (id: string | null) => { const c = clients.find(x => x.id === id); return c ? `${c.name}${c.surname ? ` ${c.surname[0]}.` : ''}` : null }
  const hoy = citas.filter(c => c.dia === 'hoy')
  const manana = citas.filter(c => c.dia === 'manana')
  const fila = (c: CitaProxima) => (
    <li key={c.id}>
      <button onClick={onVerAgenda} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-bg-alt/50 text-left">
        <span className="text-xs font-bold tabular-nums w-11 flex-shrink-0">{c.hora}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-semibold truncate">{nombre(c.client_id) ?? c.title}</span>
          {nombre(c.client_id) && c.title && <span className="block text-[11px] text-muted truncate">{c.title}</span>}
        </span>
        {c.status === 'pendiente' && <span className="text-[11px] font-bold text-warn flex-shrink-0">Por confirmar</span>}
      </button>
    </li>
  )

  return (
    <section className="bg-card rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }} aria-label="Próximas citas">
      <button onClick={onVerAgenda} className="w-full px-4 py-3 border-b border-border/50 flex items-center gap-2 hover:bg-bg-alt/30 transition-colors">
        <CalendarDays className="w-3.5 h-3.5 text-accent" />
        <h3 className="text-sm font-semibold">Próximas citas</h3>
        <span className="ml-auto text-xs font-semibold text-accent">Agenda →</span>
      </button>
      {citas.length === 0 ? (
        <p className="px-4 py-4 text-xs text-muted text-center">Sin citas hoy ni mañana.</p>
      ) : (
        <div className="py-1">
          {hoy.length > 0 && <p className="px-4 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted">Hoy</p>}
          <ul>{hoy.map(fila)}</ul>
          {manana.length > 0 && <p className="px-4 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted">Mañana</p>}
          <ul>{manana.map(fila)}</ul>
        </div>
      )}
    </section>
  )
}
