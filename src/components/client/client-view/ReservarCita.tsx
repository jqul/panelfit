import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { localDateKey } from '../../../lib/dates'
import { huecosLibres, type HorarioCitas, type Ocupado, type Hueco } from '../../../lib/huecosCitas'
import { sendPush } from '../../../lib/usePushNotifications'
import { toast } from '../../shared/Toast'

// Reservar cita en un hueco libre del horario de su entrenador (agenda_cliente / reservar_cita). Se descarga al tocar
// "Pedir cita". Si el entrenador no tiene horario, avisa con onSinHorario y se sigue con la solicitud libre de antes.

const DIAS = 14
const ERRORES: Record<string, string> = {
  ocupado: 'Ese hueco se acaba de ocupar. Elige otro.',
  antelacion: 'Ese hueco ya está demasiado cerca. Elige otro.',
  fuera_de_horario: 'Ese hueco ya no está en el horario. Elige otro.',
  demasiadas: 'Ya tienes 3 citas pendientes. Cuando pase alguna podrás reservar otra.',
  sin_horario: 'Tu entrenador ya no tiene horario para reservas.',
}

export function ReservarCita({ trainerId, clientName, onSinHorario, onHecho }: {
  trainerId: string; clientName: string; onSinHorario: () => void; onHecho: () => void
}) {
  const [datos, setDatos] = useState<{ horario: HorarioCitas; ocupado: Ocupado[] } | null>(null)
  const [dia, setDia] = useState<string | null>(null)
  const [elegido, setElegido] = useState<Hueco | null>(null)
  const [enviando, setEnviando] = useState(false)

  const cargar = () => supabase.rpc('agenda_cliente', { p_desde: localDateKey(), p_dias: DIAS }).then(({ data, error }) => {
    const d = data as { horario: HorarioCitas | null; ocupado: Ocupado[] } | null
    if (error || !d?.horario) { onSinHorario(); return }
    setDatos({ horario: d.horario, ocupado: d.ocupado || [] })
  })
  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const huecos = useMemo(() => datos ? huecosLibres(datos.horario, datos.ocupado, localDateKey(), DIAS) : [], [datos])
  const dias = [...new Set(huecos.map(h => h.fecha))]
  const diaVisible = dia && dias.includes(dia) ? dia : dias[0]

  if (!datos) return <p className="px-4 py-3 text-xs text-muted">Buscando huecos…</p>
  if (!huecos.length) return <p className="px-4 py-3 text-xs text-muted">No quedan huecos libres en las próximas dos semanas. Escribe a tu entrenador.</p>

  const reservar = async () => {
    if (!elegido) return
    setEnviando(true)
    const { data, error } = await supabase.rpc('reservar_cita', { p_inicio: elegido.inicio.toISOString() })
    setEnviando(false)
    const r = data as { id?: string; status?: string; error?: string } | null
    if (error || !r?.id) {
      toast(ERRORES[r?.error || ''] || 'No se pudo reservar. Inténtalo de nuevo.', 'warn')
      setElegido(null); cargar()
      return
    }
    const cuando = `${elegido.inicio.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })} a las ${elegido.hora}`
    sendPush({ trainerId }, r.status === 'confirmada' ? 'Nueva cita reservada' : 'Nueva solicitud de cita', `${clientName} · ${cuando}`)
    toast(r.status === 'confirmada' ? `Cita reservada: ${cuando} ✓` : `Solicitada: ${cuando}. Tu entrenador la confirmará.`, 'ok')
    onHecho()
  }

  const chip = (activo: boolean) => `px-3 min-h-[36px] rounded-full text-xs font-semibold border whitespace-nowrap flex-shrink-0 ${activo ? 'bg-ink text-white border-ink' : 'bg-card border-border text-muted'}`
  return (
    <div className="px-4 py-3 border-b border-border bg-bg-alt/30 space-y-2.5">
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Día">
        {dias.map(f => (
          <button key={f} onClick={() => { setDia(f); setElegido(null) }} aria-pressed={f === diaVisible} className={chip(f === diaVisible)}>
            {new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Hora">
        {huecos.filter(h => h.fecha === diaVisible).map(h => (
          <button key={h.hora} onClick={() => setElegido(h)} aria-pressed={elegido === h} className={chip(elegido === h)}>{h.hora}</button>
        ))}
      </div>
      <button onClick={reservar} disabled={!elegido || enviando} className="w-full py-2 bg-ink text-white rounded-lg text-xs font-bold disabled:opacity-40">
        {enviando ? 'Reservando…' : elegido ? `Reservar a las ${elegido.hora}` : 'Elige una hora'}
      </button>
      <p className="text-[11px] text-muted">{datos.horario.autoconfirmar ? 'Queda reservada al momento.' : 'Tu entrenador la confirmará.'} Citas de {datos.horario.duracion_min} min.</p>
    </div>
  )
}
