import { useState } from 'react'
import { Plus, Trash2, Pencil, Check, ChevronUp, ChevronDown, BatteryLow } from 'lucide-react'
import { toast } from '../../shared/Toast'
import { PeriodizationBlock, PeriodizationStep } from '../../../lib/periodizationBlocks'

export function BlockManager({ blocks, onSave, onClose }: {
  blocks: PeriodizationBlock[]
  onSave: (blocks: PeriodizationBlock[]) => void
  onClose: () => void
}) {
  const [list, setList] = useState<PeriodizationBlock[]>(JSON.parse(JSON.stringify(blocks)))
  const [editing, setEditing] = useState<string | null>(null)

  const update = (id: string, updates: Partial<PeriodizationBlock>) => {
    setList(l => l.map(b => b.id === id ? { ...b, ...updates } : b))
  }

  const addBlock = () => {
    const id = `custom_${Date.now()}`
    const newBlock: PeriodizationBlock = {
      id, label: 'Mi bloque', desc: 'Describe el objetivo de este bloque...',
      steps: [{ rpe: '@7', isDeload: false }, { rpe: '@8', isDeload: false }],
      custom: true,
    }
    setList(l => [...l, newBlock])
    setEditing(id)
  }

  const removeBlock = (id: string) => {
    setList(l => l.filter(b => b.id !== id))
    if (editing === id) setEditing(null)
  }

  const updateStep = (blockId: string, stepIdx: number, updates: Partial<PeriodizationStep>) => {
    setList(l => l.map(b => b.id === blockId
      ? { ...b, steps: b.steps.map((s, i) => i === stepIdx ? { ...s, ...updates } : s) }
      : b))
  }

  const addStep = (blockId: string) => {
    setList(l => l.map(b => b.id === blockId ? { ...b, steps: [...b.steps, { rpe: '@7', isDeload: false }] } : b))
  }

  const removeStep = (blockId: string, stepIdx: number) => {
    setList(l => l.map(b => b.id === blockId ? { ...b, steps: b.steps.filter((_, i) => i !== stepIdx) } : b))
  }

  const moveStep = (blockId: string, fromIdx: number, toIdx: number) => {
    setList(l => l.map(b => {
      if (b.id !== blockId) return b
      const steps = [...b.steps]
      if (toIdx < 0 || toIdx >= steps.length) return b
      const [moved] = steps.splice(fromIdx, 1)
      steps.splice(toIdx, 0, moved)
      return { ...b, steps }
    }))
  }

  const handleSave = () => {
    onSave(list)
    toast('Bloques guardados ✓', 'ok')
    onClose()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Personaliza los bloques de periodización: cuántas semanas tiene cada uno, el RPE objetivo de cada una y cuál es de descarga.</p>

      <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
        {list.map(block => (
          <div key={block.id} className={`border rounded-2xl overflow-hidden transition-all ${editing === block.id ? 'border-accent/40 bg-accent/3' : 'border-border bg-bg'}`}>
            <div className="flex items-center gap-3 px-4 py-3">
              <input value={block.label} onChange={e => update(block.id, { label: e.target.value })}
                className="flex-1 text-sm font-bold bg-transparent outline-none min-w-0 border-b border-transparent focus:border-accent/40 pb-0.5 transition-colors" />
              <span className="text-[10px] text-muted flex-shrink-0">{block.steps.length} sem.</span>
              <button onClick={() => setEditing(editing === block.id ? null : block.id)}
                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${editing === block.id ? 'text-accent bg-accent/10' : 'text-muted hover:text-accent hover:bg-accent/5'}`}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => removeBlock(block.id)}
                className="p-1.5 rounded-lg text-muted hover:text-warn hover:bg-warn/5 transition-colors flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {editing === block.id && (
              <div className="px-4 pb-4 space-y-3 border-t border-border/50">
                <div className="pt-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Descripción</label>
                  <input value={block.desc} onChange={e => update(block.id, { desc: e.target.value })}
                    placeholder="Ej: Acumulación progresiva + descarga..."
                    className="w-full text-xs bg-bg border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent/20" />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted">Semanas del bloque</label>
                  {block.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
                      <span className="text-[10px] font-bold text-muted w-12 flex-shrink-0">Sem {i + 1}</span>
                      <input value={step.rpe} onChange={e => updateStep(block.id, i, { rpe: e.target.value })}
                        placeholder="@7" className="w-16 text-xs font-mono text-center bg-bg border border-border rounded-lg px-1.5 py-1 outline-none flex-shrink-0" />
                      <button onClick={() => updateStep(block.id, i, { isDeload: !step.isDeload })}
                        title="Marcar como descarga"
                        className={`p-1 rounded-lg flex-shrink-0 ${step.isDeload ? 'text-warn bg-warn/10' : 'text-muted hover:text-warn'}`}>
                        <BatteryLow className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex-1" />
                      <button onClick={() => moveStep(block.id, i, i - 1)} disabled={i === 0}
                        className="p-1 text-muted hover:text-ink disabled:opacity-20 flex-shrink-0"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => moveStep(block.id, i, i + 1)} disabled={i === block.steps.length - 1}
                        className="p-1 text-muted hover:text-ink disabled:opacity-20 flex-shrink-0"><ChevronDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeStep(block.id, i)} disabled={block.steps.length <= 1}
                        className="p-1 text-muted hover:text-warn disabled:opacity-20 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <button onClick={() => addStep(block.id)}
                    className="w-full border border-dashed border-border rounded-xl py-2 text-xs text-muted hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Añadir semana
                  </button>
                </div>

                <button onClick={() => setEditing(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-semibold">
                  <Check className="w-3 h-3" /> Listo
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={addBlock}
        className="w-full border-2 border-dashed border-border rounded-2xl py-3 text-sm text-muted hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Crear bloque personalizado
      </button>

      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted hover:bg-bg-alt transition-colors">Cancelar</button>
        <button onClick={handleSave} className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">Guardar bloques</button>
      </div>
    </div>
  )
}
