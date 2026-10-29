import { useEffect, useMemo, useState } from 'react'
import { Search, Undo2, MessageCircle } from 'lucide-react'
import { Modal } from '../../shared/Modal'
import { toast } from '../../shared/Toast'
import { assignProgramToClients, assignWorkoutToClients, abortMessage, restoreSnapshots, type AssignOutcome, type ProgramLike, type WorkoutLike } from '../../../lib/bulkAssign'
import { norm } from '../../../lib/globalSearch'
import { AffectedClients, ResultView, loadPrograms, loadWorkouts } from './parts'
import { localDateKey } from '../../../lib/dates'
import { FechaInicioCampo } from '../FechaInicioCampo'
import type { SheetProps } from './types'

type Kind = 'programa' | 'workout'

export function AssignSheet({ trainerId, clients, onClose, onChanged, onNotify }: SheetProps & { onNotify: (clientIds: string[]) => void }) {
  const [kind, setKind] = useState<Kind>('workout')
  const [programs, setPrograms] = useState<ProgramLike[] | null | undefined>(undefined) // undefined = cargando, null = error
  const [workouts, setWorkouts] = useState<WorkoutLike[] | null | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [pickedId, setPickedId] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [outcome, setOutcome] = useState<AssignOutcome | null>(null)
  const [undone, setUndone] = useState(false)
  const [fechaInicio, setFechaInicio] = useState(localDateKey())

  useEffect(() => { loadPrograms(trainerId).then(setPrograms); loadWorkouts(trainerId).then(setWorkouts) }, [trainerId])

  const names = useMemo(() => Object.fromEntries(clients.map(c => [c.id, `${c.name} ${c.surname || ''}`.trim()])), [clients])
  const list = kind === 'programa' ? programs : workouts
  const shown = (list || []).filter(i => norm(i.name).includes(norm(query)))
  const picked = (list || []).find(i => i.id === pickedId)
  const n = clients.length

  const switchKind = (k: Kind) => { setKind(k); setPickedId(''); setConfirming(false) }

  const run = async () => {
    if (!picked) return
    setRunning(true)
    const ids = clients.map(c => c.id)
    const res = kind === 'programa'
      ? await assignProgramToClients(picked as ProgramLike, ids, trainerId, { skipDrafts: true, fechaInicio })
      : await assignWorkoutToClients(picked as WorkoutLike, ids, trainerId, { skipDrafts: true, fechaInicio })
    setRunning(false)
    if (res.aborted) { toast(abortMessage(res.aborted), 'warn'); setConfirming(false); return }
    setOutcome(res)
    if (res.result.ok.length) onChanged()
  }

  const undo = async () => {
    if (!outcome) return
    await outcome.deshacerTareas?.()
    const restored = await restoreSnapshots(outcome.undoable)
    const all = restored === outcome.undoable.length
    toast(all ? `Plan anterior restaurado en ${restored} cliente${restored === 1 ? '' : 's'} ✓` : `Solo se pudo restaurar ${restored}/${outcome.undoable.length}; el resto está en el historial del plan`, all ? 'ok' : 'warn')
    if (restored) { setUndone(true); onChanged() }
  }

  const footer = outcome ? (
    <button onClick={onClose} className="w-full min-h-[44px] bg-ink text-white rounded-xl text-sm font-bold">Cerrar</button>
  ) : confirming ? (
    <div className="space-y-2">
      <p className="text-sm text-warn font-medium" role="alert">Se sustituirá el plan actual de {n} cliente{n === 1 ? '' : 's'} y se publicará al instante.</p>
      <div className="flex gap-2">
        <button onClick={() => setConfirming(false)} disabled={running} className="flex-1 min-h-[44px] border border-border rounded-xl text-sm font-semibold text-muted">Volver</button>
        <button onClick={run} disabled={running} className="flex-[2] min-h-[44px] bg-warn text-white rounded-xl text-sm font-bold disabled:opacity-50">
          {running ? 'Asignando…' : `Sí, asignar a ${n} cliente${n === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  ) : (
    <button onClick={() => setConfirming(true)} disabled={!picked}
      className="w-full min-h-[44px] bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-40">
      {picked ? `Asignar «${picked.name}» a ${n} cliente${n === 1 ? '' : 's'}` : `Elige un ${kind} para asignar`}
    </button>
  )

  return (
    <Modal open onClose={onClose} title="Asignar plan" variant="drawer" bare footer={footer}>
      {outcome ? (
        <ResultView result={outcome.result} verb="Plan asignado" nameOf={id => names[id] || id}>
          {outcome.missing.length > 0 && (
            <p className="text-sm text-warn">{outcome.missing.length === 1 ? 'Un workout del programa ya no existe' : `${outcome.missing.length} workouts del programa ya no existen`} ({outcome.missing.join(', ')}): esos días quedan sin ejercicios.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {outcome.result.ok.length > 0 && (
              <button onClick={() => onNotify(outcome.result.ok)} className="flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:opacity-90">
                <MessageCircle className="w-4 h-4" /> Avisarles por WhatsApp
              </button>
            )}
            {outcome.undoable.length > 0 && !undone && (
              <button onClick={undo} className="flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl border border-border text-sm font-semibold hover:bg-bg-alt">
                <Undo2 className="w-4 h-4" /> Deshacer
              </button>
            )}
            {undone && <span className="text-sm text-ok font-semibold self-center">Plan anterior restaurado ✓</span>}
          </div>
          <p className="text-xs text-muted">No se avisa al cliente solo: usa «Avisarles por WhatsApp» si quieres.</p>
        </ResultView>
      ) : (
        <>
          <AffectedClients names={clients.map(c => names[c.id])} />
          <p className="px-5 sm:px-6 pt-2 text-xs text-muted">
            Se publica al instante y sustituye el plan actual de cada cliente. Los que tengan un borrador sin publicar se omiten (no se pisa tu trabajo). Se guarda copia del plan anterior y podrás deshacerlo.
          </p>
          <div className="px-5 sm:px-6 pt-4 flex gap-2" role="tablist" aria-label="Qué asignar">
            {(['workout', 'programa'] as Kind[]).map(k => (
              <button key={k} role="tab" aria-selected={kind === k} onClick={() => switchKind(k)}
                className={`flex-1 min-h-[44px] rounded-xl text-sm font-semibold border transition-all ${kind === k ? 'bg-ink text-white border-ink' : 'border-border text-muted'}`}>
                {k === 'workout' ? 'Un workout' : 'Un programa'}
              </button>
            ))}
          </div>
          <div className="px-5 sm:px-6 pt-3"><FechaInicioCampo value={fechaInicio} onChange={setFechaInicio} /></div>
          <div className="px-5 sm:px-6 py-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder={kind === 'workout' ? 'Buscar workout…' : 'Buscar programa…'} aria-label={kind === 'workout' ? 'Buscar workout' : 'Buscar programa'}
                className="w-full pl-9 pr-3 min-h-[44px] bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
            </div>
            {list === undefined ? (
              <p className="text-sm text-muted text-center py-6">Cargando…</p>
            ) : list === null ? (
              <p className="text-sm text-warn text-center py-6">No se pudo cargar la lista. Cierra e inténtalo de nuevo.</p>
            ) : shown.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">{list.length === 0 ? `Aún no tienes ${kind === 'workout' ? 'workouts' : 'programas'}.` : 'Sin resultados'}</p>
            ) : (
              <div role="radiogroup" aria-label={kind === 'workout' ? 'Workouts' : 'Programas'} className="space-y-1.5">
                {shown.map(i => (
                  <label key={i.id} className={`flex items-center gap-3 px-3 min-h-[44px] rounded-xl border cursor-pointer transition-all ${pickedId === i.id ? 'bg-accent/10 border-accent' : 'border-border hover:bg-bg-alt'}`}>
                    <input type="radio" name="bulk-asignar" checked={pickedId === i.id} onChange={() => { setPickedId(i.id); setConfirming(false) }} className="accent-accent" />
                    <span className="text-sm flex-1 min-w-0 truncate">{i.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
