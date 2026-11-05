import { useEffect, useState } from 'react'
import { Minus, Plus, X, Users } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { toast } from '../shared/Toast'
import { localDateKey } from '../../lib/dates'
import { limpiarEnlace } from '../../lib/sesionOnline'
import { CampoEnlaceOnline, EtiquetaOnline } from '../shared/EnlaceOnline'
import type { ClientData } from '../../types'
import {
  apuntar, cambiarAforo, cancelarClaseEntera, crearClase, listarClases, quitar, resumenPlazas, type ClaseConPlazas,
} from '../../lib/clasesGrupo'

const hora = (s: string) => new Date(s).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
const dia = (s: string) => new Date(s).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
const contar = (c: ClaseConPlazas) => ({
  aforo: c.aforo, ocupadas: c.plazas.filter(p => p.estado === 'reservada').length, en_espera: c.plazas.filter(p => p.estado === 'espera').length,
})

function NuevaClase({ onCrear }: { onCrear: (c: { titulo: string; start_at: string; end_at: string; aforo: number; notas: string; enlace: string | null }) => Promise<boolean> }) {
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState(() => localDateKey(new Date(Date.now() + 86400000)))
  const [horaIni, setHoraIni] = useState('19:00')
  const [duracion, setDuracion] = useState(60)
  const [aforo, setAforo] = useState(10)
  const [notas, setNotas] = useState('')
  const [enlace, setEnlace] = useState<string | null>(null) // null = presencial
  const [guardando, setGuardando] = useState(false)
  const crear = async () => {
    const ini = new Date(`${fecha}T${horaIni}:00`)
    if (!titulo.trim() || isNaN(ini.getTime())) return
    if (ini.getTime() <= Date.now()) { toast('Elige una fecha y hora futuras', 'warn'); return }
    if (enlace !== null && !limpiarEnlace(enlace)) { toast('Pega el enlace completo de la videollamada', 'warn'); return }
    setGuardando(true)
    const ok = await onCrear({ titulo: titulo.trim(), start_at: ini.toISOString(), end_at: new Date(ini.getTime() + duracion * 60000).toISOString(), aforo, notas: notas.trim(), enlace: enlace === null ? null : limpiarEnlace(enlace) })
    setGuardando(false)
    if (ok) { setTitulo(''); setNotas(''); setEnlace(null) }
  }
  const campo = 'w-full text-sm bg-card border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-accent/20'
  return (
    <section aria-label="Nueva clase" className="bg-bg-alt rounded-2xl p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">Nueva clase</p>
      <input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={80} placeholder="Funcional, Yoga, HIIT…" aria-label="Nombre de la clase" className={campo} />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">Día<input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={campo + ' mt-1'} /></label>
        <label className="text-xs text-muted">Hora<input type="time" value={horaIni} onChange={e => setHoraIni(e.target.value)} className={campo + ' mt-1'} /></label>
        <label className="text-xs text-muted">Duración (min)<input type="number" min={15} max={240} step={5} value={duracion} onChange={e => setDuracion(Math.min(240, Math.max(15, Number(e.target.value) || 60)))} className={campo + ' mt-1'} /></label>
        <label className="text-xs text-muted">Plazas<input type="number" min={1} max={200} value={aforo} onChange={e => setAforo(Math.min(200, Math.max(1, Number(e.target.value) || 1)))} className={campo + ' mt-1'} /></label>
      </div>
      <input value={notas} onChange={e => setNotas(e.target.value)} maxLength={500} placeholder="Notas: sala, qué traer… (opcional)" aria-label="Notas de la clase" className={campo} />
      <CampoEnlaceOnline value={enlace} onChange={setEnlace} />
      <div className="flex justify-end">
        <button onClick={crear} disabled={guardando || !titulo.trim()} className="px-4 py-2 bg-ink text-white rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50">
          {guardando ? 'Creando…' : 'Crear clase'}
        </button>
      </div>
    </section>
  )
}

function FichaClase({ clase, clients, trainerId, onCambio }: { clase: ClaseConPlazas; clients: ClientData[]; trainerId: string; onCambio: () => void }) {
  const [anadir, setAnadir] = useState('')
  const nombre = (id: string) => { const c = clients.find(x => x.id === id); return c ? `${c.name} ${c.surname || ''}`.trim() : 'Cliente' }
  const n = contar(clase)
  const reservadas = clase.plazas.filter(p => p.estado === 'reservada')
  const espera = clase.plazas.filter(p => p.estado === 'espera')
  const sinApuntar = clients.filter(c => !clase.plazas.some(p => p.client_id === c.id))

  const run = async (p: Promise<boolean>, ok: string) => { if (await p) { toast(ok, 'ok'); onCambio() } else toast('No se pudo guardar', 'warn') }

  return (
    <li className="bg-card border border-border rounded-2xl p-4 space-y-3" aria-label={`Clase ${clase.titulo}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">{clase.titulo}</p>
          <p className="text-xs text-muted capitalize">{dia(clase.start_at)} · {hora(clase.start_at)}–{hora(clase.end_at)}</p>
          {clase.notas && <p className="text-xs text-muted mt-0.5">{clase.notas}</p>}
          {clase.enlace && <a href={clase.enlace} target="_blank" rel="noopener noreferrer" className="inline-block mt-1"><EtiquetaOnline enlace={clase.enlace} /></a>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" role="group" aria-label={`Plazas de ${clase.titulo}`}>
          <button onClick={() => run(cambiarAforo(trainerId, clase.id, clase.aforo - 1), 'Plazas actualizadas')} disabled={clase.aforo <= Math.max(1, n.ocupadas)}
            aria-label="Una plaza menos" className="p-1.5 rounded-lg border border-border text-muted hover:text-ink disabled:opacity-40"><Minus className="w-3 h-3" /></button>
          <span className="text-xs font-semibold tabular-nums px-1">{resumenPlazas(n)}</span>
          <button onClick={() => run(cambiarAforo(trainerId, clase.id, clase.aforo + 1), 'Plazas actualizadas')} disabled={clase.aforo >= 200}
            aria-label="Una plaza más" className="p-1.5 rounded-lg border border-border text-muted hover:text-ink disabled:opacity-40"><Plus className="w-3 h-3" /></button>
        </div>
      </div>

      {(reservadas.length > 0 || espera.length > 0) && (
        <ul className="space-y-1" aria-label={`Apuntados a ${clase.titulo}`}>
          {[...reservadas, ...espera].map((p, i) => (
            <li key={p.client_id} className="flex items-center gap-2 text-sm">
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${p.estado === 'reservada' ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn'}`}>
                {p.estado === 'reservada' ? 'Plaza' : `Espera ${i - reservadas.length + 1}º`}
              </span>
              <span className="flex-1 truncate">{nombre(p.client_id)}</span>
              <button onClick={() => run(quitar(trainerId, clase.id, p.client_id), `${nombre(p.client_id)} ya no está apuntado`)}
                aria-label={`Quitar a ${nombre(p.client_id)}`} className="p-1 rounded text-muted hover:text-warn"><X className="w-3.5 h-3.5" /></button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        {sinApuntar.length > 0 && (
          <>
            <select value={anadir} onChange={e => setAnadir(e.target.value)} aria-label={`Apuntar a ${clase.titulo}`}
              className="flex-1 min-w-[160px] text-xs bg-card border border-border rounded-xl px-2.5 py-1.5">
              <option value="">Apuntar a un cliente…</option>
              {sinApuntar.map(c => <option key={c.id} value={c.id}>{c.name} {c.surname}</option>)}
            </select>
            <button disabled={!anadir} onClick={() => { const id = anadir; setAnadir(''); run(apuntar(trainerId, clase.id, id), `${nombre(id)} apuntado`) }}
              className="px-3 py-1.5 border border-border rounded-xl text-xs font-semibold text-muted hover:border-accent hover:text-accent disabled:opacity-50">Apuntar</button>
          </>
        )}
        <button onClick={() => { if (confirm(`¿Cancelar «${clase.titulo}»? Dejará de salirles a tus clientes.`)) run(cancelarClaseEntera(trainerId, clase.id), 'Clase cancelada') }}
          className="ml-auto px-3 py-1.5 text-xs font-semibold text-muted hover:text-warn">Cancelar clase</button>
      </div>
    </li>
  )
}

// Calendario → Clases de grupo: las clases con plazas, quién va y la lista de espera (lib/clasesGrupo).
export function ClasesGrupo({ trainerId, clients, onClose }: { trainerId: string; clients: ClientData[]; onClose: () => void }) {
  const [clases, setClases] = useState<ClaseConPlazas[] | null>(null)
  const cargar = () => listarClases(trainerId).then(c => { setClases(c ?? []); if (c === null) toast('No se pudieron cargar las clases', 'warn') })
  useEffect(() => { cargar() }, [trainerId])

  const crear = async (c: Parameters<typeof crearClase>[1]) => {
    const nueva = await crearClase(trainerId, c)
    if (!nueva) { toast('No se pudo crear la clase', 'warn'); return false }
    toast(`«${nueva.titulo}» creada ✓ — tus clientes ya pueden reservar`, 'ok')
    cargar(); return true
  }

  return (
    <Modal open onClose={onClose} title="Clases de grupo" variant="drawer">
      <div className="space-y-4">
        <p className="text-sm text-muted flex items-center gap-2"><Users className="w-4 h-4 flex-shrink-0" />Tus clientes reservan desde su app. Si se llena, entran en lista de espera y pasan solos cuando alguien cancela.</p>
        <NuevaClase onCrear={crear} />
        {clases === null ? <div className="h-20 bg-card border border-border rounded-2xl animate-pulse" />
          : clases.length === 0 ? <p className="text-sm text-muted text-center py-6">No tienes clases programadas.</p>
          : <ul className="space-y-3" aria-label="Próximas clases">{clases.map(c => <FichaClase key={c.id} clase={c} clients={clients} trainerId={trainerId} onCambio={cargar} />)}</ul>}
      </div>
    </Modal>
  )
}
