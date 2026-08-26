import { useState, useEffect } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { logError } from '../../../lib/errors'
import { sendPush } from '../../../lib/usePushNotifications'

interface CitaCliente {
  id: string; title: string; start_at: string; status: 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
}

export function ProximasSesiones({ clientId, trainerId, clientName }: { clientId: string; trainerId: string; clientName: string }) {
  const [citas, setCitas] = useState<CitaCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().split('T')[0])
  const [time, setTime] = useState('09:00')
  const [saving, setSaving] = useState(false)

  const load = () => {
    supabase.from('citas')
      .select('id, title, start_at, status')
      .eq('client_id', clientId)
      .in('status', ['confirmada', 'pendiente'])
      .gte('start_at', new Date().toISOString())
      .order('start_at')
      .limit(3)
      .then(({ data }) => { setCitas((data || []) as CitaCliente[]); setLoading(false) })
  }

  useEffect(() => { load() }, [clientId])

  const cancelar = async (id: string) => {
    const { error } = await supabase.from('citas').update({ status: 'cancelada' }).eq('id', id)
    if (!error) setCitas(prev => prev.filter(c => c.id !== id))
  }

  const solicitar = async () => {
    setSaving(true)
    const start = new Date(`${date}T${time}:00`)
    const end = new Date(start.getTime() + 60 * 60000)
    const { error } = await supabase.from('citas').insert({
      trainer_id: trainerId, client_id: clientId, title: 'Cita solicitada',
      start_at: start.toISOString(), end_at: end.toISOString(), status: 'pendiente', notes: '',
    })
    setSaving(false)
    if (error) { logError('ProximasSesiones:solicitar', error); return }
    sendPush({ trainerId }, 'Nueva solicitud de cita', `${clientName} pidió una cita para el ${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} a las ${time}`)
    setShowForm(false)
    load()
  }

  if (loading) return null

  return (
    <div className="px-4 pt-4">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-muted" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Próximas sesiones</p>
          </div>
          <button onClick={() => setShowForm(v => !v)} className="text-[10px] font-bold text-accent underline">
            {showForm ? 'Cancelar' : '+ Pedir cita'}
          </button>
        </div>

        {showForm && (
          <div className="px-4 py-3 border-b border-border bg-bg-alt/30 space-y-2">
            <div className="flex gap-2">
              <input type="date" value={date} min={new Date().toISOString().split('T')[0]} onChange={e => setDate(e.target.value)}
                className="flex-1 px-2.5 py-2 bg-white border border-border rounded-lg text-xs outline-none" />
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="px-2.5 py-2 bg-white border border-border rounded-lg text-xs outline-none" />
            </div>
            <button onClick={solicitar} disabled={saving}
              className="w-full py-2 bg-ink text-white rounded-lg text-xs font-bold disabled:opacity-50">
              {saving ? 'Enviando...' : 'Enviar solicitud'}
            </button>
            <p className="text-[10px] text-muted">Tu entrenador confirmará el horario — no es automático.</p>
          </div>
        )}

        {citas.length === 0 ? (
          <p className="px-4 py-3 text-xs text-muted">Sin sesiones programadas</p>
        ) : (
          <div className="divide-y divide-border">
            {citas.map(c => (
              <div key={c.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    {c.title}
                    {c.status === 'pendiente' && <span className="text-[9px] font-bold text-warn bg-warn/10 px-1.5 py-0.5 rounded-full">Pendiente de confirmar</span>}
                  </p>
                  <p className="text-xs text-muted">{new Date(c.start_at).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <button onClick={() => cancelar(c.id)} className="p-1.5 text-muted hover:text-warn rounded-lg flex-shrink-0" title="Cancelar">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
