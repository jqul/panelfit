import { useState } from 'react'
import { Activity, Plus, X } from 'lucide-react'
import { FitnessTest } from '../../../lib/testCatalog'
import { Modal } from '../../shared/Modal'

interface Props {
  testIds: string[]
  tests: FitnessTest[]
  onChange: (testIds: string[]) => void
}

// Pruebas físicas asignadas a este día del plan — el cliente las verá al
// entrenar ese día y podrá meter su propio resultado, que llega directo a
// Progreso > Pruebas sin que el entrenador tenga que teclearlo.
export function DayTestsSection({ testIds, tests, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false)
  const assigned = testIds.map(id => tests.find(t => t.id === id)).filter((t): t is FitnessTest => !!t)
  const available = tests.filter(t => !testIds.includes(t.id))

  const remove = (id: string) => onChange(testIds.filter(t => t !== id))
  const add = (id: string) => { onChange([...testIds, id]); setShowPicker(false) }

  return (
    <div className="px-4 pb-2">
      {assigned.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {assigned.map(t => (
            <span key={t.id} className="flex items-center gap-1 pl-2.5 pr-1 py-1 bg-accent/10 text-accent rounded-full text-[10px] font-semibold">
              <Activity className="w-3 h-3" /> {t.nombre}
              <button onClick={() => remove(t.id)} className="p-0.5 rounded-full hover:bg-accent/20"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
      )}
      <button onClick={() => setShowPicker(true)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-accent transition-colors">
        <Plus className="w-3 h-3" /> Pedir prueba física este día
      </button>

      {showPicker && (
        <Modal open onClose={() => setShowPicker(false)} title="Añadir prueba física">
          {available.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">
              {tests.length === 0 ? 'Aún no tienes pruebas en tu catálogo (Progreso → Pruebas).' : 'Ya has añadido todas tus pruebas a este día.'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {available.map(t => (
                <button key={t.id} onClick={() => add(t.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-bg border border-border rounded-xl hover:border-accent text-left transition-all">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0"><Activity className="w-4 h-4 text-accent" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{t.nombre}</p>
                    <p className="text-xs text-muted">{t.categoria} · se mide en {t.unidad}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
