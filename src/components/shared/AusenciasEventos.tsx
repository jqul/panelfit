import { useState } from 'react'
import { CalendarOff, Flag, Plus, Trash2 } from 'lucide-react'
import { useAusenciasEventos } from '../../hooks/useAusenciasEventos'
import { MOTIVOS, PRIORIDADES, motivoDe, rangoTexto, ausenciasPendientes, cuentaAtras, MotivoAusencia, PrioridadEvento } from '../../lib/ausencias'
import { localDateKey } from '../../lib/dates'

const campo = 'w-full px-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20'
const etiqueta = 'block text-[11px] font-bold uppercase tracking-wider text-muted mb-1'
const fechaLarga = (f: string) => new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Fechas clave y ausencias de un cliente. El cliente avisa de cuándo no puede entrenar y apunta sus
 * competiciones; el entrenador ve lo mismo en la ficha y también puede añadir o quitar.
 */
export function AusenciasEventos({ clientId, quien }: { clientId: string; quien: 'cliente' | 'entrenador' }) {
  const { ausencias, eventos, cargando, nuevaAusencia, nuevoEvento, borrarAusencia, borrarEvento } = useAusenciasEventos(clientId, quien)
  const hoy = localDateKey()
  const [form, setForm] = useState<'ausencia' | 'evento' | null>(null)
  const [aus, setAus] = useState({ desde: hoy, hasta: hoy, motivo: 'viaje' as MotivoAusencia, nota: '' })
  const [ev, setEv] = useState({ fecha: '', nombre: '', prioridad: 'A' as PrioridadEvento, nota: '' })
  const [guardando, setGuardando] = useState(false)

  if (cargando) return null
  const pendientes = ausenciasPendientes(ausencias, hoy)
  const futuros = eventos.filter(e => e.fecha >= hoy)
  const yo = quien === 'cliente'

  const guardarAusencia = async () => {
    if (aus.hasta < aus.desde) return
    setGuardando(true)
    if (await nuevaAusencia(aus)) { setForm(null); setAus({ desde: hoy, hasta: hoy, motivo: 'viaje', nota: '' }) }
    setGuardando(false)
  }
  const guardarEvento = async () => {
    if (!ev.fecha || !ev.nombre.trim()) return
    setGuardando(true)
    if (await nuevoEvento(ev)) { setForm(null); setEv({ fecha: '', nombre: '', prioridad: 'A', nota: '' }) }
    setGuardando(false)
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Fechas clave */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted"><Flag className="w-3.5 h-3.5" /> {yo ? 'Tus fechas clave' : 'Fechas clave'}</h3>
        <button onClick={() => setForm(form === 'evento' ? null : 'evento')} aria-expanded={form === 'evento'}
          className="flex items-center gap-1 text-xs font-bold text-accent min-h-[44px] px-1"><Plus className="w-3.5 h-3.5" /> Añadir</button>
      </div>
      {form === 'evento' && (
        <div className="px-4 py-3 border-b border-border bg-bg-alt/30 space-y-2.5">
          <div>
            <label className={etiqueta} htmlFor={`ev-nombre-${clientId}`}>Qué es</label>
            <input id={`ev-nombre-${clientId}`} className={campo} maxLength={80} placeholder="Media maratón, test de fuerza, boda…" value={ev.nombre} onChange={e => setEv({ ...ev, nombre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={etiqueta} htmlFor={`ev-fecha-${clientId}`}>Fecha</label>
              <input id={`ev-fecha-${clientId}`} type="date" min={hoy} className={campo} value={ev.fecha} onChange={e => setEv({ ...ev, fecha: e.target.value })} />
            </div>
            <div>
              <label className={etiqueta} htmlFor={`ev-prio-${clientId}`}>Importancia</label>
              <select id={`ev-prio-${clientId}`} className={campo} value={ev.prioridad} onChange={e => setEv({ ...ev, prioridad: e.target.value as PrioridadEvento })}>
                {PRIORIDADES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <button onClick={guardarEvento} disabled={guardando || !ev.fecha || !ev.nombre.trim()}
            className="w-full min-h-[44px] bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-40">Guardar fecha</button>
        </div>
      )}
      {futuros.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted">{yo ? 'Apunta una competición o una fecha importante y verás la cuenta atrás en Hoy.' : 'Sin fechas clave. Una competición con prioridad A aparece en el Hoy del cliente con su cuenta atrás.'}</p>
      ) : (
        <ul className="divide-y divide-border">
          {futuros.map(e => (
            <li key={e.id} className="px-4 py-2.5 flex items-center gap-3">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${e.prioridad === 'A' ? 'bg-ink text-white' : 'bg-bg-alt text-ink'}`} aria-label={`Prioridad ${e.prioridad}`}>{e.prioridad}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{e.nombre}</span>
                <span className="block text-xs text-muted">{fechaLarga(e.fecha)} · {cuentaAtras(e.fecha, hoy)}</span>
              </span>
              <button onClick={() => borrarEvento(e.id)} aria-label={`Quitar ${e.nombre}`} title="Quitar"
                className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-muted hover:text-warn"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}

      {/* Ausencias */}
      <div className="px-4 py-3 border-y border-border flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted"><CalendarOff className="w-3.5 h-3.5" /> {yo ? 'Cuándo no puedes entrenar' : 'Ausencias'}</h3>
        <button onClick={() => setForm(form === 'ausencia' ? null : 'ausencia')} aria-expanded={form === 'ausencia'}
          className="flex items-center gap-1 text-xs font-bold text-accent min-h-[44px] px-1"><Plus className="w-3.5 h-3.5" /> {yo ? 'Avisar' : 'Añadir'}</button>
      </div>
      {form === 'ausencia' && (
        <div className="px-4 py-3 border-b border-border bg-bg-alt/30 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={etiqueta} htmlFor={`aus-desde-${clientId}`}>Desde</label>
              <input id={`aus-desde-${clientId}`} type="date" className={campo} value={aus.desde}
                onChange={e => setAus({ ...aus, desde: e.target.value, hasta: aus.hasta < e.target.value ? e.target.value : aus.hasta })} />
            </div>
            <div>
              <label className={etiqueta} htmlFor={`aus-hasta-${clientId}`}>Hasta</label>
              <input id={`aus-hasta-${clientId}`} type="date" min={aus.desde} className={campo} value={aus.hasta} onChange={e => setAus({ ...aus, hasta: e.target.value })} />
            </div>
          </div>
          <fieldset>
            <legend className={etiqueta}>Por qué</legend>
            <div className="flex flex-wrap gap-1.5">
              {MOTIVOS.map(m => (
                <button key={m.id} type="button" onClick={() => setAus({ ...aus, motivo: m.id })} aria-pressed={aus.motivo === m.id}
                  className={`px-3 min-h-[40px] rounded-xl text-xs font-semibold border ${aus.motivo === m.id ? 'bg-ink text-white border-ink' : 'bg-card border-border text-muted'}`}>
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label className={etiqueta} htmlFor={`aus-nota-${clientId}`}>Nota (opcional)</label>
            <input id={`aus-nota-${clientId}`} className={campo} maxLength={300} placeholder={yo ? 'Podré hacer algo en el hotel…' : ''} value={aus.nota} onChange={e => setAus({ ...aus, nota: e.target.value })} />
          </div>
          <button onClick={guardarAusencia} disabled={guardando || aus.hasta < aus.desde}
            className="w-full min-h-[44px] bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-40">{yo ? 'Avisar a mi entrenador' : 'Guardar ausencia'}</button>
        </div>
      )}
      {pendientes.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted">{yo ? '¿Te vas de viaje o estás enfermo? Avisa aquí y tu entrenador lo verá.' : 'Sin ausencias previstas.'}</p>
      ) : (
        <ul className="divide-y divide-border">
          {pendientes.map(a => {
            const m = motivoDe(a.motivo)
            const activa = a.desde <= hoy && a.hasta >= hoy
            return (
              <li key={a.id} className="px-4 py-2.5 flex items-center gap-3">
                <span className="text-lg flex-shrink-0" aria-hidden>{m.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{m.label} · {rangoTexto(a)}{activa && <span className="ml-1.5 text-[11px] font-bold text-attn">Ahora</span>}</span>
                  {a.nota && <span className="block text-xs text-muted truncate">{a.nota}</span>}
                  {!yo && a.creado_por === 'cliente' && <span className="block text-[11px] text-muted">Avisó el cliente</span>}
                </span>
                <button onClick={() => borrarAusencia(a.id)} aria-label={`Quitar la ausencia ${rangoTexto(a)}`} title="Quitar"
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-muted hover:text-warn"><Trash2 className="w-4 h-4" /></button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
