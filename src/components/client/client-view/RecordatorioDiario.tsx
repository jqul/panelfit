import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { isDemoClientId } from '../../../lib/demoIds'
import { toast } from '../../shared/Toast'
import type { ClienteRow } from '../../../lib/supabase-types'

// "Recordarme lo pendiente a las 18:00": el aviso diario con la sesión o las tareas de hoy sin hacer
// (función recordatorio-diario). Llega por las notificaciones de este dispositivo; aquí solo se enciende o se apaga.
export function RecordatorioDiario({ client }: { client: ClienteRow }) {
  const [activo, setActivo] = useState(client.recordatorio_diario !== false)
  const [guardando, setGuardando] = useState(false)

  const cambiar = async () => {
    const nuevo = !activo
    setActivo(nuevo)
    if (isDemoClientId(client.id)) return
    setGuardando(true)
    const { data, error } = await supabase.rpc('recordatorio_diario_cliente', { p_activo: nuevo })
    setGuardando(false)
    if (error || !data) { setActivo(!nuevo); toast('No se pudo guardar', 'warn') }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold" id="recordatorio-diario">Recordarme lo pendiente</p>
        <p className="text-xs text-muted">A las 18:00, si te queda el entreno o alguna tarea del día</p>
      </div>
      <button role="switch" aria-checked={activo} aria-labelledby="recordatorio-diario" onClick={cambiar} disabled={guardando}
        className={`relative w-12 h-7 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${activo ? 'bg-ok' : 'bg-border'}`}>
        <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}
