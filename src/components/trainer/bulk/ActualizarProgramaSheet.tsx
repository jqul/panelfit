import { useEffect, useState } from 'react'
import { Undo2 } from 'lucide-react'
import { Modal } from '../../shared/Modal'
import { toast } from '../../shared/Toast'
import { abortMessage, restoreSnapshots, type AssignOutcome, type ProgramLike } from '../../../lib/bulkAssign'
import { clientesDelPrograma, actualizarProgramaEnClientes, type Destinatarios } from '../../../lib/actualizarProgramaClientes'
import { ResultView } from './parts'

// Tras guardar un programa editado: "¿Llevas el cambio a los clientes que ya lo tienen?". Se marcan todos menos los
// que tienen cambios propios por venir (el entrenador les tocó el plan a mano) y los que tienen un borrador abierto
// (no se pueden tocar). Si no hay ningún cliente con el programa, no aparece nada.
export function ActualizarProgramaSheet({ antes, ahora, trainerId, onClose }: { antes: ProgramLike; ahora: ProgramLike; trainerId: string; onClose: () => void }) {
  const [dest, setDest] = useState<Destinatarios | null | undefined>(undefined) // undefined = cargando, null = error
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [running, setRunning] = useState(false)
  const [outcome, setOutcome] = useState<AssignOutcome | null>(null)
  const [undone, setUndone] = useState(false)

  useEffect(() => {
    clientesDelPrograma(antes, ahora, trainerId).then(d => {
      if (d && !d.clientes.length) { onClose(); return }
      setDest(d)
      if (d) setMarcados(new Set(d.clientes.filter(c => !c.borrador && !c.cambiosPropios).map(c => c.id)))
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (dest === undefined) return null // mientras se mira si hay a quién avisar, nada (casi siempre es un instante)

  const nombreDe = (id: string) => dest?.clientes.find(c => c.id === id)?.nombre || id
  const alternar = (id: string) => setMarcados(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })
  const n = marcados.size

  const run = async () => {
    if (!dest || !n) return
    setRunning(true)
    const res = await actualizarProgramaEnClientes(ahora, dest, [...marcados], trainerId)
    setRunning(false)
    if (res.aborted) { toast(abortMessage(res.aborted), 'warn'); return }
    setOutcome(res)
  }

  const undo = async () => {
    if (!outcome) return
    await outcome.deshacerTareas?.()
    const restored = await restoreSnapshots(outcome.undoable)
    const all = restored === outcome.undoable.length
    toast(all ? `Plan anterior restaurado en ${restored} cliente${restored === 1 ? '' : 's'} ✓` : `Solo se pudo restaurar ${restored}/${outcome.undoable.length}; el resto está en el historial del plan`, all ? 'ok' : 'warn')
    if (restored) setUndone(true)
  }

  const footer = outcome ? (
    <button onClick={onClose} className="w-full min-h-[44px] bg-ink text-white rounded-xl text-sm font-bold">Cerrar</button>
  ) : dest === null ? (
    <button onClick={onClose} className="w-full min-h-[44px] border border-border rounded-xl text-sm font-semibold text-muted">Cerrar</button>
  ) : (
    <div className="flex gap-2">
      <button onClick={onClose} disabled={running} className="flex-1 min-h-[44px] border border-border rounded-xl text-sm font-semibold text-muted">Solo el programa</button>
      <button onClick={run} disabled={running || !n} className="flex-[2] min-h-[44px] bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-40">
        {running ? 'Actualizando…' : n ? `Actualizar a ${n} cliente${n === 1 ? '' : 's'}` : 'Marca a quién'}
      </button>
    </div>
  )

  return (
    <Modal open onClose={onClose} title="¿Llevas el cambio a tus clientes?" variant="drawer" bare footer={footer}>
      {outcome ? (
        <ResultView result={outcome.result} verb="Plan actualizado" nameOf={nombreDe}>
          {outcome.missing.length > 0 && (
            <p className="text-sm text-warn">{outcome.missing.length === 1 ? 'Un workout del programa ya no existe' : `${outcome.missing.length} workouts del programa ya no existen`} ({outcome.missing.join(', ')}): esos días quedan sin ejercicios.</p>
          )}
          {outcome.undoable.length > 0 && !undone && (
            <button onClick={undo} className="flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl border border-border text-sm font-semibold hover:border-ink">
              <Undo2 className="w-4 h-4" /> Deshacer
            </button>
          )}
        </ResultView>
      ) : dest === null ? (
        <p className="px-5 sm:px-6 py-6 text-sm text-warn">El programa está guardado, pero no se pudo comprobar qué clientes lo tienen. Si quieres llevarles el cambio, vuelve a guardarlo en un momento.</p>
      ) : (
        <div className="px-5 sm:px-6 py-4 space-y-3">
          <p className="text-sm text-muted">
            {dest.clientes.length === 1 ? 'Un cliente tiene' : `${dest.clientes.length} clientes tienen`} «{ahora.name}». Solo cambia lo que está por venir: los días ya entrenados o pasados se quedan como están. Se guarda una copia del plan anterior.
          </p>
          <ul className="space-y-1.5" aria-label="Clientes con este programa">
            {dest.clientes.map(c => (
              <li key={c.id}>
                <label className={`flex items-center gap-3 px-3 min-h-[44px] py-2 rounded-xl border transition-all ${c.borrador ? 'opacity-60 cursor-not-allowed border-border' : marcados.has(c.id) ? 'bg-accent/10 border-accent cursor-pointer' : 'border-border hover:bg-bg-alt cursor-pointer'}`}>
                  <input type="checkbox" checked={marcados.has(c.id)} disabled={c.borrador} onChange={() => alternar(c.id)} className="accent-accent" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{c.nombre}</span>
                    {c.borrador ? <span className="block text-xs text-muted">Tiene un borrador sin publicar: no se toca</span>
                      : c.cambiosPropios ? <span className="block text-xs text-warn">Le cambiaste días por venir a mano: se perderían esos cambios</span>
                      : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
