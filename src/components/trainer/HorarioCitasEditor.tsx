import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { Modal } from '../shared/Modal'
import { limpiarFranjas, aMinutos, type Franja } from '../../lib/huecosCitas'

// "Horario para reservas": cuándo se le puede reservar cita desde la app del cliente (franjas por día de la semana),
// cuánto dura cada cita, el margen entre citas, la antelación mínima y si se confirman solas. Sin franjas, los clientes
// siguen pidiendo cita como antes (proponen día y hora y el entrenador confirma).

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DURACIONES = [30, 45, 60, 90]
const MARGENES = [0, 10, 15, 30]
const ANTELACIONES = [{ h: 2, t: '2 horas' }, { h: 12, t: '12 horas' }, { h: 24, t: '1 día' }, { h: 48, t: '2 días' }]

interface Horario { franjas: Franja[]; duracion_min: number; margen_min: number; antelacion_horas: number; autoconfirmar: boolean }
const VACIO: Horario = { franjas: [], duracion_min: 60, margen_min: 0, antelacion_horas: 12, autoconfirmar: false }

export function HorarioCitasEditor({ trainerId, demo, onClose }: { trainerId: string; demo: boolean; onClose: () => void }) {
  const [h, setH] = useState<Horario | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (demo) { setH({ ...VACIO, franjas: [{ dia: 0, desde: '09:00', hasta: '13:00' }, { dia: 2, desde: '16:00', hasta: '20:00' }] }); return }
    supabase.from('horario_citas').select('*').eq('trainer_id', trainerId).maybeSingle()
      .then(({ data }) => setH(data ? { ...VACIO, ...data, franjas: limpiarFranjas(data.franjas) } : VACIO))
  }, [trainerId, demo])

  if (!h) return null
  const cambiar = (parche: Partial<Horario>) => setH({ ...h, ...parche })
  const franjasDe = (dia: number) => h.franjas.map((f, i) => ({ f, i })).filter(x => x.f.dia === dia)
  const editarFranja = (i: number, parche: Partial<Franja>) => cambiar({ franjas: h.franjas.map((f, j) => j === i ? { ...f, ...parche } : f) })
  const malas = h.franjas.filter(f => { const a = aMinutos(f.desde), b = aMinutos(f.hasta); return a === null || b === null || a >= b })

  const guardar = async () => {
    if (malas.length) { toast('Revisa las franjas: la hora de fin tiene que ser después de la de inicio', 'warn'); return }
    if (demo) { toast('En la demo no se guarda el horario', 'info'); onClose(); return }
    setGuardando(true)
    const { error } = await supabase.from('horario_citas').upsert({ trainer_id: trainerId, ...h, franjas: limpiarFranjas(h.franjas), updated_at: new Date().toISOString() }, { onConflict: 'trainer_id' })
    setGuardando(false)
    if (error) { toast('No se pudo guardar el horario', 'warn'); return }
    toast(h.franjas.length ? 'Horario guardado: tus clientes ya pueden reservar ✓' : 'Horario guardado (sin franjas, no se puede reservar)', 'ok')
    onClose()
  }

  const chip = (activo: boolean) => `px-3 min-h-[36px] rounded-full text-xs font-semibold border ${activo ? 'bg-ink text-white border-ink' : 'border-border text-muted'}`

  return (
    <Modal open onClose={onClose} title="Horario para reservas" maxWidth="max-w-lg"
      footer={<button onClick={guardar} disabled={guardando} className="w-full py-3 bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-40">{guardando ? 'Guardando…' : 'Guardar horario'}</button>}>
      <div className="p-5 space-y-5">
        <p className="text-sm text-muted">Tus clientes verán los huecos libres en su app y reservarán con un toque. Lo que ya tienes en la agenda cuenta como ocupado.</p>

        <section aria-label="Franjas" className="space-y-2">
          {DIAS.map((nombre, dia) => (
            <div key={dia} className="flex items-start gap-3">
              <p className="w-20 pt-2 text-sm font-semibold flex-shrink-0">{nombre}</p>
              <div className="flex-1 space-y-1.5">
                {franjasDe(dia).map(({ f, i }) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input type="time" value={f.desde} onChange={e => editarFranja(i, { desde: e.target.value })} aria-label={`${nombre}: desde`}
                      className="px-2 py-1.5 bg-bg border border-border rounded-lg text-sm" />
                    <span className="text-muted text-sm">–</span>
                    <input type="time" value={f.hasta} onChange={e => editarFranja(i, { hasta: e.target.value })} aria-label={`${nombre}: hasta`}
                      className="px-2 py-1.5 bg-bg border border-border rounded-lg text-sm" />
                    <button onClick={() => cambiar({ franjas: h.franjas.filter((_, j) => j !== i) })} aria-label={`Quitar franja del ${nombre.toLowerCase()}`}
                      className="p-1.5 text-muted hover:text-warn"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <button onClick={() => cambiar({ franjas: [...h.franjas, { dia, desde: '09:00', hasta: '13:00' }] })} aria-label={`Añadir franja el ${nombre.toLowerCase()}`}
                  className="flex items-center gap-1 text-xs text-accent font-semibold py-1.5">
                  <Plus className="w-3.5 h-3.5" /> {franjasDe(dia).length ? 'Otra franja' : 'Añadir franja'}
                </button>
              </div>
            </div>
          ))}
        </section>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Duración de cada cita</p>
            <div className="flex gap-1.5 flex-wrap">{DURACIONES.map(d => <button key={d} onClick={() => cambiar({ duracion_min: d })} aria-pressed={h.duracion_min === d} className={chip(h.duracion_min === d)}>{d} min</button>)}</div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Margen entre citas</p>
            <div className="flex gap-1.5 flex-wrap">{MARGENES.map(m => <button key={m} onClick={() => cambiar({ margen_min: m })} aria-pressed={h.margen_min === m} className={chip(h.margen_min === m)}>{m ? `${m} min` : 'Sin margen'}</button>)}</div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Antelación mínima</p>
            <div className="flex gap-1.5 flex-wrap">{ANTELACIONES.map(a => <button key={a.h} onClick={() => cambiar({ antelacion_horas: a.h })} aria-pressed={h.antelacion_horas === a.h} className={chip(h.antelacion_horas === a.h)}>{a.t}</button>)}</div>
          </div>
          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input type="checkbox" checked={h.autoconfirmar} onChange={e => cambiar({ autoconfirmar: e.target.checked })} className="w-4 h-4 accent-accent" />
            Confirmar las reservas solas (si no, te llegan como pendientes)
          </label>
        </div>
      </div>
    </Modal>
  )
}
