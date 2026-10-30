import { useMemo, useState } from 'react'
import { Modal } from '../../shared/Modal'
import { supabase } from '../../../lib/supabase'
import { logError } from '../../../lib/errors'
import { emptyResult, type BulkResult } from '../../../lib/bulkActions'
import type { Profesional } from '../../../hooks/useProfesionalesEquipo'
import { AffectedClients, ResultView } from './parts'
import type { SheetProps } from './types'

// Asignar los seleccionados a un profesional del equipo (o dejarlos sin asignar). No cambia quién los ve: sirve
// para repartir y para que cada uno filtre "Mis clientes".
export function ProfesionalSheet({ clients, onClose, onChanged, profesionales }: SheetProps & { profesionales: Profesional[] }) {
  const [elegido, setElegido] = useState<string | null | undefined>(undefined) // null = sin asignar
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BulkResult | null>(null)
  const names = useMemo(() => Object.fromEntries(clients.map(c => [c.id, `${c.name} ${c.surname || ''}`.trim()])), [clients])
  const n = clients.length

  const run = async () => {
    if (elegido === undefined) return
    setRunning(true)
    const res = emptyResult()
    const ids = clients.map(c => c.id)
    const { error } = await supabase.from('clientes').update({ profesional_id: elegido }).in('id', ids)
    if (error) { logError('bulk:profesional', error); ids.forEach(id => res.failed.push({ id, reason: 'No se pudo guardar' })) }
    else res.ok.push(...ids)
    setRunning(false)
    setResult(res)
    if (res.ok.length) onChanged()
  }

  const nombre = elegido === null ? 'sin asignar' : profesionales.find(p => p.uid === elegido)?.nombre
  return (
    <Modal open onClose={onClose} title="Asignar profesional" variant="drawer" bare
      footer={result
        ? <button onClick={onClose} className="w-full min-h-[44px] bg-ink text-white rounded-xl text-sm font-bold">Cerrar</button>
        : <button onClick={run} disabled={elegido === undefined || running} className="w-full min-h-[44px] bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-40">
            {running ? 'Guardando…' : elegido === undefined ? 'Elige un profesional' : `Dejar ${n} cliente${n === 1 ? '' : 's'} ${elegido === null ? 'sin asignar' : `con ${nombre}`}`}
          </button>}>
      {result ? (
        <ResultView result={result} verb="Profesional asignado" nameOf={id => names[id] || id} />
      ) : (
        <>
          <AffectedClients names={clients.map(c => names[c.id])} />
          <div role="radiogroup" aria-label="Profesional" className="px-5 sm:px-6 py-4 space-y-1.5">
            {[...profesionales.map(p => ({ id: p.uid as string | null, nombre: p.nombre })), { id: null, nombre: 'Sin asignar' }].map(p => (
              <label key={p.id ?? '__ninguno'} className={`flex items-center gap-3 px-3 min-h-[44px] rounded-xl border cursor-pointer ${elegido === p.id ? 'bg-accent/10 border-accent' : 'border-border hover:bg-bg-alt'}`}>
                <input type="radio" name="profesional" checked={elegido === p.id} onChange={() => setElegido(p.id)} className="accent-accent" />
                <span className="text-sm">{p.nombre}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}
