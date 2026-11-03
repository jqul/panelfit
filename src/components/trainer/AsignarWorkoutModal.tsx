import { useState } from 'react'
import { Search, UserCheck } from 'lucide-react'
import type { ClientData, TrainingTemplate } from '../../types'
import { Modal } from '../shared/Modal'
import { toast } from '../shared/Toast'
import { localDateKey } from '../../lib/dates'
import { asignarWorkout } from '../../lib/asignarWorkout'
import { FechasPlan } from './FechasPlan'

// Asignar un workout a un cliente directamente desde Workouts (sin entrar en su ficha): elegir cliente y fecha de inicio.
// Su plan actual se guarda en el historial antes de sustituirlo (lib/asignarWorkout).
export function AsignarWorkoutModal({ tmpl, clients, trainerId, onClose }: { tmpl: TrainingTemplate; clients: ClientData[]; trainerId: string; onClose: () => void }) {
  const [busca, setBusca] = useState('')
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [fecha, setFecha] = useState(localDateKey())
  const [guardando, setGuardando] = useState(false)
  const f = busca.trim().toLowerCase()
  const lista = clients
    .filter(c => !c.archivedAt && (!f || `${c.name} ${c.surname || ''}`.toLowerCase().includes(f)))
    .sort((a, b) => `${a.name} ${a.surname || ''}`.localeCompare(`${b.name} ${b.surname || ''}`, 'es'))
  const elegido = clients.find(c => c.id === clienteId)

  const asignar = async () => {
    if (!elegido) return
    setGuardando(true)
    const r = await asignarWorkout(tmpl, elegido.id, fecha, trainerId)
    setGuardando(false)
    if (!r.ok) { toast(`${r.motivo}: no se ha cambiado nada`, 'warn'); return }
    toast(`«${tmpl.name}» asignado a ${elegido.name}${r.enBorrador ? ' (en su borrador: publícalo para que lo vea)' : ''} ✓`, 'ok')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Asignar «${tmpl.name}»`} maxWidth="max-w-md"
      footer={
        <button onClick={asignar} disabled={!elegido || guardando || !fecha}
          className="w-full py-3 rounded-xl bg-ink text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
          <UserCheck className="w-4 h-4" /> {guardando ? 'Asignando…' : elegido ? `Asignar a ${elegido.name}` : 'Elige un cliente'}
        </button>
      }>
      <div className="space-y-3">
        <label className="flex items-center gap-2 px-3 bg-bg border border-border rounded-xl focus-within:border-accent">
          <Search className="w-4 h-4 text-muted flex-shrink-0" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente" aria-label="Buscar cliente" autoFocus
            className="flex-1 py-2.5 bg-transparent text-sm outline-none" />
        </label>
        <div className="max-h-64 overflow-y-auto divide-y divide-border border border-border rounded-xl" role="radiogroup" aria-label="Cliente">
          {lista.length === 0 && <p className="px-3 py-4 text-sm text-muted text-center">{clients.length ? `Ningún cliente con «${busca}»` : 'Aún no tienes clientes'}</p>}
          {lista.map(c => (
            <button key={c.id} type="button" role="radio" aria-checked={clienteId === c.id} onClick={() => setClienteId(c.id)}
              className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${clienteId === c.id ? 'bg-accent/10 font-semibold' : 'hover:bg-bg-alt'}`}>
              {c.name} {c.surname || ''}
            </button>
          ))}
        </div>
        <FechasPlan inicio={fecha} onInicio={setFecha} semanas={tmpl.weeks?.length || 1} />
        <p className="text-xs text-muted">Sustituye las semanas de su plan actual (se guarda una copia en su historial). Si tiene un borrador abierto, va al borrador.</p>
      </div>
    </Modal>
  )
}
