import { useEffect, useState } from 'react'
import { Ticket, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from './Toast'
import { localDateKey } from '../../lib/dates'
import { estadoBono, usadasPorBono, ordenarBonos, fechaCorta, type Bono } from '../../lib/bonos'

// Bonos de sesiones de un cliente. El entrenador los crea y borra (en la ficha, Resumen); el cliente solo los ve (en
// Más). Cada cita nueva se descuenta sola del bono activo (trigger asignar_bono en la base de datos).

const ETIQUETA = { activo: '', agotado: 'Agotado', caducado: 'Caducado' } as const

export function BonosCliente({ clientId, trainerId, quien }: { clientId: string; trainerId?: string; quien: 'entrenador' | 'cliente' }) {
  const hoy = localDateKey()
  const [bonos, setBonos] = useState<Bono[] | null>(null)
  const [usadas, setUsadas] = useState<Record<string, number>>({})
  const [creando, setCreando] = useState(false)
  const [sesiones, setSesiones] = useState(10)
  const [caduca, setCaduca] = useState('')
  const [guardando, setGuardando] = useState(false)
  const demo = clientId.startsWith('demo-client-')

  const cargar = async () => {
    if (demo) { setBonos([]); return }
    const [b, c] = await Promise.all([
      supabase.from('bonos_cliente').select('id, nombre, sesiones, caduca, created_at').eq('client_id', clientId),
      supabase.from('citas').select('bono_id, status').eq('client_id', clientId).not('bono_id', 'is', null),
    ])
    setBonos((b.data || []) as Bono[])
    setUsadas(usadasPorBono((c.data || []) as { bono_id: string | null; status: string }[]))
  }
  useEffect(() => { cargar() }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  const crear = async () => {
    if (!trainerId || sesiones < 1) return
    if (demo) { toast('En la demo no se guardan bonos', 'info'); setCreando(false); return }
    setGuardando(true)
    const { error } = await supabase.from('bonos_cliente').insert({ trainer_id: trainerId, client_id: clientId, nombre: `Bono ${sesiones} sesiones`, sesiones, caduca: caduca || null })
    setGuardando(false)
    if (error) { toast('No se pudo crear el bono', 'warn'); return }
    toast('Bono creado: sus próximas citas se descuentan solas ✓', 'ok')
    setCreando(false); setCaduca(''); cargar()
  }
  const borrar = async (b: Bono) => {
    if (!confirm(`¿Borrar «${b.nombre}»? Sus citas se quedan, pero dejan de contar en ningún bono.`)) return
    const { error } = await supabase.from('bonos_cliente').delete().eq('id', b.id)
    if (error) { toast('No se pudo borrar', 'warn'); return }
    cargar()
  }

  if (!bonos || (quien === 'cliente' && !bonos.length)) return null
  const lista = ordenarBonos(bonos, usadas, hoy)
  return (
    <section aria-label="Bonos de sesiones" className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5" /> {quien === 'cliente' ? 'Tus bonos' : 'Bonos de sesiones'}</p>
        {quien === 'entrenador' && !creando && <button onClick={() => setCreando(true)} className="text-xs font-bold text-accent">+ Nuevo bono</button>}
      </div>
      {creando && (
        <div className="px-5 py-3 border-b border-border bg-bg-alt/30 flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted">Sesiones
            <input type="number" min={1} max={200} value={sesiones} onChange={e => setSesiones(Math.max(1, Math.min(200, +e.target.value || 1)))}
              className="block w-20 mt-1 px-2.5 py-2 bg-card border border-border rounded-lg text-sm" />
          </label>
          <label className="text-xs text-muted">Caduca (opcional)
            <input type="date" value={caduca} min={hoy} onChange={e => setCaduca(e.target.value)}
              className="block mt-1 px-2.5 py-2 bg-card border border-border rounded-lg text-sm" />
          </label>
          <button onClick={crear} disabled={guardando} className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold disabled:opacity-40">{guardando ? 'Creando…' : 'Crear'}</button>
          <button onClick={() => setCreando(false)} className="px-3 py-2 text-sm text-muted">Cancelar</button>
        </div>
      )}
      {lista.length === 0 ? (
        <p className="px-5 py-3 text-sm text-muted">Sin bonos. Crea uno y cada cita nueva de este cliente se descontará sola.</p>
      ) : (
        <div className="divide-y divide-border">
          {lista.map(b => {
            const e = estadoBono(b, usadas[b.id] || 0, hoy)
            return (
              <div key={b.id} className={`px-5 py-3 flex items-center gap-3 ${e.estado !== 'activo' ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{b.nombre} {ETIQUETA[e.estado] && <span className="text-[11px] font-bold text-muted bg-bg-alt px-1.5 py-0.5 rounded-full ml-1">{ETIQUETA[e.estado]}</span>}</p>
                  <p className="text-xs text-muted">{e.estado === 'activo' ? `Quedan ${e.quedan} de ${b.sesiones}` : `${e.usadas} de ${b.sesiones} usadas`}{b.caduca ? ` · caduca el ${fechaCorta(b.caduca)}` : ''}</p>
                  <div className="h-1.5 mt-1.5 bg-bg-alt rounded-full overflow-hidden" aria-hidden>
                    <div className="h-full bg-ok rounded-full" style={{ width: `${Math.min(100, (e.usadas / b.sesiones) * 100)}%` }} />
                  </div>
                </div>
                {quien === 'entrenador' && (
                  <button onClick={() => borrar(b)} aria-label={`Borrar ${b.nombre}`} className="p-1.5 text-muted hover:text-warn"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
