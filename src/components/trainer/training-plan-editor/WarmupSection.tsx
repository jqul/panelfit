import { useState } from 'react'
import { Flame, ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { Exercise, LibraryExercise } from '../../../types'
import { Modal } from '../../shared/Modal'
import { ExercisePicker } from '../ExercisePicker'

interface WarmupSectionProps {
  warmupExercises: Exercise[]
  isOpen: boolean
  onToggle: () => void
  library: LibraryExercise[]
  onAdd: (ex: Exercise) => void
  onUpdate: (ri: number, updates: Partial<Exercise>) => void
  onDelete: (ri: number) => void
  onMove: (fromRi: number, toRi: number) => void
}

export function WarmupSection({ warmupExercises, isOpen, onToggle, library, onAdd, onUpdate, onDelete, onMove }: WarmupSectionProps) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="border-b border-border/30 bg-orange-50/40">
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors w-full text-left px-4 py-2.5">
        <Flame className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Calentamiento</span>
        {warmupExercises.length > 0
          ? <span className="ml-1 text-[10px] bg-orange-100 text-orange-500 px-1.5 py-0.5 rounded-full font-bold">{warmupExercises.length} ejerc.</span>
          : <span className="ml-auto text-[10px] text-orange-300 font-normal">Sin definir</span>
        }
        {isOpen
          ? <ChevronUp className="w-3 h-3 flex-shrink-0 ml-auto" />
          : <ChevronDown className="w-3 h-3 flex-shrink-0 ml-auto" />
        }
      </button>

      {isOpen && (
        <div className="px-4 pb-3 space-y-1.5">
          {/* Lista de ejercicios */}
          {warmupExercises.length > 0 && (
            <div className="space-y-1">
              {warmupExercises.map((ex, ri) => (
                <div key={ri} className="flex items-center gap-2 bg-white/80 border border-orange-100 rounded-xl px-3 py-2 group">
                  <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[9px] font-bold text-orange-500 flex-shrink-0">
                    {ri + 1}
                  </div>
                  <input
                    value={ex.name}
                    onChange={e => onUpdate(ri, { name: e.target.value })}
                    placeholder="Nombre del ejercicio"
                    className="flex-1 text-xs font-medium bg-transparent outline-none min-w-0 text-gray-700"
                  />
                  <input
                    value={ex.sets}
                    onChange={e => onUpdate(ri, { sets: e.target.value })}
                    placeholder="2×10"
                    className="w-14 text-[10px] font-bold text-center bg-orange-50 border border-orange-100 rounded-lg px-1.5 py-1 outline-none"
                  />
                  <input
                    value={ex.weight || ''}
                    onChange={e => onUpdate(ri, { weight: e.target.value })}
                    placeholder="Peso"
                    className="w-16 text-[10px] text-center bg-orange-50 border border-orange-100 rounded-lg px-1.5 py-1 outline-none"
                  />
                  <input
                    value={ex.videoUrl || ''}
                    onChange={e => onUpdate(ri, { videoUrl: e.target.value })}
                    placeholder="URL vídeo..."
                    className="w-24 text-[10px] bg-orange-50 border border-orange-100 rounded-lg px-1.5 py-1 outline-none hidden sm:block"
                  />
                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => ri > 0 && onMove(ri, ri - 1)}
                      disabled={ri === 0}
                      className="p-0.5 text-orange-300 hover:text-orange-600 disabled:opacity-20">
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => ri < warmupExercises.length - 1 && onMove(ri, ri + 1)}
                      disabled={ri === warmupExercises.length - 1}
                      className="p-0.5 text-orange-300 hover:text-orange-600 disabled:opacity-20">
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDelete(ri)}
                      className="p-0.5 text-orange-300 hover:text-warn ml-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botón añadir */}
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-orange-200 rounded-xl text-[11px] text-orange-400 hover:border-orange-400 hover:text-orange-600 transition-all">
            <Plus className="w-3.5 h-3.5" /> Añadir ejercicio de calentamiento
          </button>
          <p className="text-[10px] text-orange-300 text-center">
            El cliente lo verá antes de empezar los ejercicios principales
          </p>
        </div>
      )}

      {/* Picker de ejercicios de la librería */}
      <Modal open={showPicker} onClose={() => setShowPicker(false)} title="Añadir ejercicio de calentamiento" maxWidth="max-w-2xl">
        <ExercisePicker
          library={library}
          onSelect={ex => { onAdd(ex); setShowPicker(false) }}
          onClose={() => setShowPicker(false)}
        />
      </Modal>
    </div>
  )
}
