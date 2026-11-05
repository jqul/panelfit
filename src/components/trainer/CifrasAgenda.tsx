import { useEffect, useState } from 'react'
import { BarChart2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logError } from '../../lib/errors'
import { DEMO_TRAINER_ID, DEMO_CITAS } from '../../lib/demo-data'
import { listarClases, type ClaseConPlazas } from '../../lib/clasesGrupo'
import { cifrasMes, type CitaCifras } from '../../lib/cifrasAgenda'

const inicioMes = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const finMes = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 1)

function Dato({ n, label, tono }: { n: number | string; label: string; tono?: 'ok' | 'warn' }) {
  return (
    <div className="bg-bg rounded-xl px-3 py-2 text-center">
      <p className={`font-serif font-bold text-xl tabular-nums ${tono === 'ok' ? 'text-ok' : tono === 'warn' ? 'text-warn' : ''}`}>{n}</p>
      <p className="text-[11px] text-muted leading-tight">{label}</p>
    </div>
  )
}

// Cifras de la agenda del mes (lib/cifrasAgenda): asistencia, ausencias sin avisar, cancelaciones y ocupación de las
// clases. En el Calendario recibe las citas ya cargadas (se actualiza al pasar lista); en Mi negocio las lee ella.
export function CifrasAgenda({ trainerId, citas: citasDadas }: { trainerId: string; citas?: CitaCifras[] }) {
  const [mesAtras, setMesAtras] = useState(0)
  const ref = new Date(); ref.setDate(1); ref.setMonth(ref.getMonth() - mesAtras)
  const [citas, setCitas] = useState<CitaCifras[]>([])
  const [clases, setClases] = useState<ClaseConPlazas[]>([])
  const clave = `${ref.getFullYear()}-${ref.getMonth()}`

  useEffect(() => {
    let vivo = true
    const desde = inicioMes(ref), hasta = finMes(ref)
    listarClases(trainerId, desde).then(k => { if (vivo) setClases((k || []).filter(c => new Date(c.start_at) < hasta)) })
    if (citasDadas) return () => { vivo = false }
    if (trainerId === DEMO_TRAINER_ID) { setCitas(DEMO_CITAS as CitaCifras[]); return () => { vivo = false } }
    supabase.from('citas').select('start_at, status, client_id').eq('trainer_id', trainerId)
      .gte('start_at', desde.toISOString()).lt('start_at', hasta.toISOString())
      .then(({ data, error }) => { if (error) logError('CifrasAgenda', error); if (vivo) setCitas((data || []) as CitaCifras[]) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainerId, clave, !!citasDadas])

  const c = cifrasMes(citasDadas ?? citas, clases, ref)
  const nada = c.citas.total + c.citas.canceladas + c.clases.plazas === 0
  const nombreMes = ref.toLocaleDateString('es-ES', { month: 'long' })
  const sinMarcar = c.citas.sinMarcar + c.clases.sinMarcar

  return (
    <section aria-label="Cifras de la agenda" className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-muted" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-wider text-muted flex-1">Agenda de {nombreMes}</p>
        <button onClick={() => setMesAtras(m => (m === 0 ? 1 : 0))} className="text-xs font-semibold text-accent">{mesAtras === 0 ? 'Mes anterior' : 'Este mes'}</button>
      </div>
      {nada ? <p className="text-sm text-muted">Sin citas ni clases este mes.</p> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Dato n={c.asistencia === null ? '—' : `${c.asistencia}%`} label="Asistencia" tono={c.asistencia !== null && c.asistencia >= 85 ? 'ok' : c.asistencia !== null && c.asistencia < 70 ? 'warn' : undefined} />
            <Dato n={c.citas.noVinieron + c.clases.noVinieron} label="No vinieron sin avisar" tono={c.citas.noVinieron + c.clases.noVinieron > 0 ? 'warn' : undefined} />
            <Dato n={c.citas.canceladas} label="Citas canceladas" />
            <Dato n={c.clases.ocupacion === null ? '—' : `${c.clases.ocupacion}%`} label="Ocupación de clases" />
          </div>
          <p className="text-xs text-muted">
            {c.citas.total} cita{c.citas.total === 1 ? '' : 's'} ({c.citas.vinieron} vinieron) · {c.clases.total} clase{c.clases.total === 1 ? '' : 's'} con {c.clases.plazas} plaza{c.clases.plazas === 1 ? '' : 's'} ({c.clases.vinieron} vinieron)
          </p>
          {sinMarcar > 0 && <p className="text-xs text-accent font-semibold">{sinMarcar} sin pasar lista: márcalas para que la asistencia cuadre</p>}
        </>
      )}
    </section>
  )
}
