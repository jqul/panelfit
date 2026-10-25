import { useMemo, useState } from 'react'
import { Modal } from '../../shared/Modal'
import { supabase } from '../../../lib/supabase'
import { logError } from '../../../lib/errors'
import { isDemoTrainerId } from '../../../lib/demoIds'
import { DEMO_CLIENTS } from '../../../lib/demo-data'
import { applyLabelChange, emptyResult, type BulkResult } from '../../../lib/bulkActions'
import { useLabels } from '../../../hooks/useLabels'
import { AffectedClients, ResultView } from './parts'
import type { SheetProps } from './types'

type Mode = 'add' | 'remove'

export function LabelsSheet({ trainerId, clients, onClose, onChanged }: SheetProps) {
  const { labels } = useLabels(trainerId)
  const [mode, setMode] = useState<Mode>('add')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BulkResult | null>(null)
  const names = useMemo(() => Object.fromEntries(clients.map(c => [c.id, `${c.name} ${c.surname || ''}`.trim()])), [clients])
  const n = clients.length
  const k = picked.size

  const toggle = (id: string) => setPicked(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })

  const run = async () => {
    setRunning(true)
    const add = mode === 'add' ? [...picked] : []
    const remove = mode === 'remove' ? [...picked] : []
    const res = emptyResult()
    await Promise.all(clients.map(async c => {
      const { next, changed } = applyLabelChange(c.label_ids, add, remove)
      if (!changed) { res.ok.push(c.id); return } // ya estaba como se pedía: el resultado buscado se cumple
      if (isDemoTrainerId(trainerId)) {
        const demo = DEMO_CLIENTS.find(d => d.id === c.id)
        if (demo) demo.label_ids = next
        res.ok.push(c.id); return
      }
      const { error } = await supabase.from('clientes').update({ label_ids: next }).eq('id', c.id)
      if (error) { logError('bulk:labels', error); res.failed.push({ id: c.id, reason: 'No se pudo guardar' }) } else res.ok.push(c.id)
    }))
    setRunning(false)
    setResult(res)
    if (res.ok.length) onChanged()
  }

  const footer = result ? (
    <button onClick={onClose} className="w-full min-h-[44px] bg-ink text-white rounded-xl text-sm font-bold">Cerrar</button>
  ) : (
    <button onClick={run} disabled={running || k === 0} className="w-full min-h-[44px] bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-40">
      {running ? 'Guardando…' : k === 0 ? 'Elige al menos una etiqueta'
        : `${mode === 'add' ? 'Añadir' : 'Quitar'} ${k} etiqueta${k === 1 ? '' : 's'} ${mode === 'add' ? 'a' : 'de'} ${n} cliente${n === 1 ? '' : 's'}`}
    </button>
  )

  return (
    <Modal open onClose={onClose} title="Etiquetas" variant="drawer" bare footer={footer}>
      {result ? (
        <ResultView result={result} verb={mode === 'add' ? 'Etiquetas añadidas' : 'Etiquetas quitadas'} nameOf={id => names[id] || id} />
      ) : (
        <>
          <AffectedClients names={clients.map(c => names[c.id])} />
          <div className="px-5 sm:px-6 pt-4 flex gap-2" role="tablist" aria-label="Qué hacer con las etiquetas">
            {([['add', 'Añadir'], ['remove', 'Quitar']] as [Mode, string][]).map(([m, label]) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setPicked(new Set()) }}
                className={`flex-1 min-h-[44px] rounded-xl text-sm font-semibold border transition-all ${mode === m ? 'bg-ink text-white border-ink' : 'border-border text-muted'}`}>{label}</button>
            ))}
          </div>
          <div className="px-5 sm:px-6 py-4">
            {labels.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">Aún no tienes etiquetas. Créalas en Más › Etiquetas.</p>
            ) : (
              <ul className="space-y-1.5" aria-label="Etiquetas">
                {labels.map(l => (
                  <li key={l.id}>
                    <label className={`flex items-center gap-3 px-3 min-h-[44px] rounded-xl border cursor-pointer transition-all ${picked.has(l.id) ? 'bg-accent/10 border-accent' : 'border-border hover:bg-bg-alt'}`}>
                      <input type="checkbox" checked={picked.has(l.id)} onChange={() => toggle(l.id)} className="accent-accent w-4 h-4" />
                      <span aria-hidden>{l.emoji}</span>
                      <span className="text-sm font-medium" style={{ color: l.color }}>{l.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
