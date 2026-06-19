import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { ClientData, TrainingPlan, LibraryExercise, TrainingLogs } from '../../../types'
import { TrainingPlanEditor } from '../TrainingPlanEditor'
import { toast } from '../../shared/Toast'

interface ProgramTask { id: string; type: string; title: string }
interface ProgramDay { tasks: ProgramTask[] }
interface ProgramWeek { label: string; days: ProgramDay[] }
interface Program { id: string; name: string; tipo: string; label_ids?: string[]; weeks: ProgramWeek[] }
interface Label { id: string; name: string; emoji: string; color: string }

export function PlanTab({ client, plan, programs, labels, onPlanChange, onImportFromClient, library, logs, otherClients, trainerId }: {
  client: ClientData
  plan: TrainingPlan
  programs: Program[]
  labels: Label[]
  onPlanChange: (p: TrainingPlan) => void
  onImportFromClient: (id: string) => Promise<TrainingPlan | null>
  library: LibraryExercise[]
  logs: TrainingLogs
  otherClients: ClientData[]
  trainerId: string
}) {
  const [showProgramSelector, setShowProgramSelector] = useState(false)
  const [filterTipo, setFilterTipo] = useState<string | null>(null)
  const [filterLabel, setFilterLabel] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)

  // Etiquetas del cliente
  const clientLabelIds: string[] = client.label_ids || []
  const clientLabels = labels.filter(l => clientLabelIds.includes(l.id))

  // Tipos únicos de programas
  const tiposDisponibles = [...new Set(programs.map(p => p.tipo))]

  // Programas filtrados — por defecto muestra los que coinciden con etiquetas del cliente
  const filteredPrograms = programs.filter(p => {
    if (filterLabel && !p.label_ids?.includes(filterLabel)) return false
    if (filterTipo && p.tipo !== filterTipo) return false
    return true
  })

  // Programas sugeridos (coinciden con etiquetas del cliente)
  const suggestedPrograms = programs.filter(p =>
    p.label_ids?.some(id => clientLabelIds.includes(id))
  )

  const assignProgram = async (prog: Program) => {
    setAssigning(true)
    // Convertir programa a TrainingPlan
    const weeks = (prog.weeks || []).map(w => ({
      label: w.label,
      rpe: '',
      isCurrent: false,
      days: (w.days || []).map(d => ({
        title: d.tasks?.find(t => t.type === 'workout')?.title || 'Día',
        focus: d.tasks?.filter(t => t.type !== 'workout').map(t => t.title).join(', ') || '',
        exercises: [],
      }))
    }))
    // Marcar semana 1 como actual
    if (weeks.length > 0) weeks[0].isCurrent = true

    const newPlan: TrainingPlan = {
      ...plan,
      type: prog.tipo,
      weeks,
      programId: prog.id,
      programName: prog.name,
      fechaInicio: new Date().toISOString().split('T')[0],
    }

    onPlanChange(newPlan)
    setShowProgramSelector(false)
    setAssigning(false)
    toast(`Programa "${prog.name}" asignado ✓`, 'ok')
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
      {/* Banner programa asignado + botón cambiar */}
      <div className="flex-shrink-0 mb-3">
        {plan.programName ? (
          <div className="flex items-center gap-3 px-4 py-3 bg-ok/5 border border-ok/20 rounded-2xl">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-ok uppercase tracking-wider">Programa asignado</p>
              <p className="text-sm font-semibold text-ink truncate">{plan.programName}</p>
              <p className="text-xs text-muted">Tipo: {plan.type} · Inicio: {plan.fechaInicio || '—'}</p>
            </div>
            <button onClick={() => setShowProgramSelector(true)}
              className="flex-shrink-0 px-3 py-1.5 border border-border rounded-xl text-xs font-semibold text-muted hover:border-accent hover:text-accent transition-colors">
              Cambiar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 bg-accent/5 border border-accent/20 rounded-2xl">
            <div className="flex-1">
              <p className="text-sm font-semibold">Sin programa asignado</p>
              {clientLabels.length > 0 && suggestedPrograms.length > 0 && (
                <p className="text-xs text-muted mt-0.5">
                  Hay {suggestedPrograms.length} programa{suggestedPrograms.length > 1 ? 's' : ''} sugerido{suggestedPrograms.length > 1 ? 's' : ''} para {clientLabels.map(l => l.name).join(', ')}
                </p>
              )}
            </div>
            <button onClick={() => setShowProgramSelector(true)}
              className="flex-shrink-0 px-3 py-2 bg-ink text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity">
              Asignar programa
            </button>
          </div>
        )}
      </div>

      {/* Modal selector de programa */}
      {showProgramSelector && (
        <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-xl">Asignar programa</h3>
                  <p className="text-sm text-muted mt-0.5">{client.name} {client.surname}</p>
                </div>
                <button onClick={() => setShowProgramSelector(false)} className="p-2 rounded-xl hover:bg-bg-alt text-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filtros */}
              <div className="mt-4 space-y-2">
                {/* Etiquetas del cliente — filtro rápido */}
                {clientLabels.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted font-semibold">Etiquetas del cliente:</span>
                    {clientLabels.map(label => (
                      <button key={label.id}
                        onClick={() => setFilterLabel(filterLabel === label.id ? null : label.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${filterLabel === label.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                        style={{ backgroundColor: filterLabel === label.id ? label.color + '18' : 'transparent', borderColor: label.color + '60', color: label.color }}>
                        {label.emoji} {label.name}
                        {filterLabel === label.id && <Check className="w-2.5 h-2.5 ml-0.5" />}
                      </button>
                    ))}
                  </div>
                )}
                {/* Filtro por tipo */}
                {tiposDisponibles.length > 1 && (
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => setFilterTipo(null)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${!filterTipo ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
                      Todos
                    </button>
                    {tiposDisponibles.map(tipo => (
                      <button key={tipo} onClick={() => setFilterTipo(filterTipo === tipo ? null : tipo)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${filterTipo === tipo ? 'bg-accent text-white border-accent' : 'border-border text-muted hover:border-accent'}`}>
                        {tipo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Lista de programas */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredPrograms.length === 0 ? (
                <div className="text-center py-10 text-muted">
                  <p className="text-sm">Sin programas con este filtro</p>
                </div>
              ) : (
                filteredPrograms.map(prog => {
                  const progLabels = labels.filter(l => prog.label_ids?.includes(l.id))
                  const totalTasks = (prog.weeks || []).reduce((a, w) =>
                    a + (w.days || []).reduce((b, d) => b + (d.tasks?.length || 0), 0), 0)
                  const isSuggested = prog.label_ids?.some(id => clientLabelIds.includes(id))

                  return (
                    <div key={prog.id}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border cursor-pointer hover:border-accent/40 transition-all ${isSuggested ? 'bg-ok/3 border-ok/20' : 'bg-bg border-border'}`}
                      onClick={() => assignProgram(prog)}>
                      {/* Preview mini calendario */}
                      <div className="grid grid-cols-7 gap-0.5 flex-shrink-0 w-20">
                        {(prog.weeks?.[0]?.days || Array(7).fill({ tasks: [] })).map((d, i) => (
                          <div key={i} className={`h-4 rounded-sm ${(d.tasks?.length || 0) > 0 ? 'bg-accent/40' : 'bg-bg-alt'}`} />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{prog.name}</p>
                          {isSuggested && <span className="text-[9px] bg-ok/10 text-ok px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">✓ Sugerido</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-semibold">{prog.tipo}</span>
                          <span className="text-[10px] text-muted">{(prog.weeks || []).length} sem · {totalTasks} tareas</span>
                          {progLabels.map(l => (
                            <span key={l.id} className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold border"
                              style={{ backgroundColor: l.color + '15', borderColor: l.color + '40', color: l.color }}>
                              {l.emoji} {l.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button className="flex-shrink-0 px-3 py-1.5 bg-ink text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                        disabled={assigning}>
                        {assigning ? '...' : 'Asignar'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor del plan */}
      <div className="flex-1 overflow-hidden min-h-0">
        <TrainingPlanEditor plan={plan} onChange={onPlanChange}
          allClients={otherClients} library={library}
          onImportFromClient={onImportFromClient} logs={logs}
          clientName={`${client.name} ${client.surname}`}
          trainerId={trainerId} />
      </div>
    </div>
  )
}
