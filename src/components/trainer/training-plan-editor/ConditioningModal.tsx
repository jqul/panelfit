import { useState } from 'react'
import { Plus, Trash2, Flame } from 'lucide-react'
import {
  ConditioningBlock, ConditioningType, ConditioningItem,
  CONDITIONING_TYPE_LABEL, useConditioningBlocks, conditioningProtocolLabel,
} from '../../../lib/conditioningBlocks'
import { DayPlan, Exercise } from '../../../types'

const TYPES: ConditioningType[] = ['emom', 'amrap', 'for_time', 'tabata', 'circuito']

function blockToDay(b: ConditioningBlock): DayPlan {
  const protocol = conditioningProtocolLabel(b)
  const exercises: Exercise[] = b.items.map(item => ({
    name: item.exercise, sets: protocol, weight: item.target, isMain: false, comment: '',
  }))
  return { title: `Acondicionamiento — ${b.name}`, focus: CONDITIONING_TYPE_LABEL[b.type], exercises }
}

export function ConditioningModal({ trainerId, onApply, onClose }: {
  trainerId?: string
  onApply: (day: DayPlan) => void
  onClose: () => void
}) {
  const { blocks, loading, addBlock, deleteBlock } = useConditioningBlocks(trainerId)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<ConditioningType>('amrap')
  const [rounds, setRounds] = useState<number | ''>('')
  const [workSec, setWorkSec] = useState<number | ''>(20)
  const [restSec, setRestSec] = useState<number | ''>(10)
  const [durationMin, setDurationMin] = useState<number | ''>(10)
  const [items, setItems] = useState<ConditioningItem[]>([{ exercise: '', target: '' }])
  const [notes, setNotes] = useState('')

  const resetForm = () => {
    setName(''); setType('amrap'); setRounds(''); setWorkSec(20); setRestSec(10); setDurationMin(10)
    setItems([{ exercise: '', target: '' }]); setNotes(''); setCreating(false)
  }

  const save = async () => {
    if (!name.trim() || !items.some(i => i.exercise.trim())) return
    await addBlock({
      name: name.trim(), type,
      rounds: rounds === '' ? undefined : Number(rounds),
      workSec: workSec === '' ? undefined : Number(workSec),
      restSec: restSec === '' ? undefined : Number(restSec),
      durationMin: durationMin === '' ? undefined : Number(durationMin),
      items: items.filter(i => i.exercise.trim()),
      notes: notes.trim() || undefined,
    })
    resetForm()
  }

  if (creating) {
    return (
      <div className="space-y-4">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Metcon piernas"
          className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-accent/20" />

        <div className="flex gap-1.5 flex-wrap">
          {TYPES.map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${type === t ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-ink'}`}>
              {CONDITIONING_TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(type === 'tabata' || type === 'circuito') && (
            <div><label className="block text-[10px] font-bold text-muted mb-1">Rondas</label>
              <input type="number" min={1} value={rounds} onChange={e => setRounds(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" /></div>
          )}
          {type === 'tabata' && (
            <>
              <div><label className="block text-[10px] font-bold text-muted mb-1">Trabajo (s)</label>
                <input type="number" min={1} value={workSec} onChange={e => setWorkSec(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" /></div>
              <div><label className="block text-[10px] font-bold text-muted mb-1">Descanso (s)</label>
                <input type="number" min={0} value={restSec} onChange={e => setRestSec(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" /></div>
            </>
          )}
          {(type === 'amrap' || type === 'emom') && (
            <div><label className="block text-[10px] font-bold text-muted mb-1">{type === 'emom' ? 'Minutos' : 'Duración (min)'}</label>
              <input type="number" min={1} value={type === 'emom' ? rounds : durationMin}
                onChange={e => type === 'emom' ? setRounds(e.target.value ? Number(e.target.value) : '') : setDurationMin(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" /></div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted">Ejercicios</label>
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={it.exercise} onChange={e => setItems(its => its.map((x, idx) => idx === i ? { ...x, exercise: e.target.value } : x))}
                placeholder="Ejercicio" className="flex-1 px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" />
              <input value={it.target} onChange={e => setItems(its => its.map((x, idx) => idx === i ? { ...x, target: e.target.value } : x))}
                placeholder="12 reps / 20 cal..." className="w-32 px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" />
              <button onClick={() => setItems(its => its.filter((_, idx) => idx !== i))} disabled={items.length <= 1}
                className="p-1.5 text-muted hover:text-warn disabled:opacity-20"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <button onClick={() => setItems(its => [...its, { exercise: '', target: '' }])}
            className="w-full border border-dashed border-border rounded-lg py-2 text-xs text-muted hover:border-accent hover:text-accent flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Añadir ejercicio
          </button>
        </div>

        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notas (opcional)..."
          className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none resize-none" />

        <div className="flex gap-3">
          <button onClick={resetForm} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted hover:bg-bg-alt">Cancelar</button>
          <button onClick={save} disabled={!name.trim() || !items.some(i => i.exercise.trim())}
            className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-40">Guardar bloque</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Bloques de acondicionamiento (EMOM/AMRAP/circuitos) reutilizables, añadibles a la semana como un día más.</p>

      {loading ? <p className="text-sm text-muted text-center py-6">Cargando...</p> : blocks.length === 0 ? (
        <div className="text-center py-8 text-muted border-2 border-dashed border-border rounded-2xl">
          <Flame className="w-7 h-7 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin bloques aún</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
          {blocks.map(b => (
            <div key={b.id} className="border border-border rounded-xl px-3 py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{b.name}</p>
                <p className="text-[10px] text-muted">{CONDITIONING_TYPE_LABEL[b.type]} · {conditioningProtocolLabel(b)} · {b.items.length} ejercicios</p>
              </div>
              <button onClick={() => onApply(blockToDay(b))}
                className="px-3 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold hover:opacity-90 flex-shrink-0">Añadir a semana</button>
              <button onClick={() => deleteBlock(b.id)} className="p-1.5 text-muted hover:text-warn flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setCreating(true)}
        className="w-full border-2 border-dashed border-border rounded-2xl py-3 text-sm text-muted hover:border-accent hover:text-accent flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Crear bloque
      </button>
      <button onClick={onClose} className="w-full py-2 text-sm text-muted hover:text-ink">Cerrar</button>
    </div>
  )
}
