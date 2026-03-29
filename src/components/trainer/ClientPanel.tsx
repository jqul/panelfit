import { useState, useEffect, useRef } from 'react'
import {
  X, Save, ChevronLeft, Camera, FileText, BarChart2,
  Dumbbell, Settings, ClipboardList, StickyNote, Eye,
  MessageSquare, CheckCircle2, Clock, TrendingUp
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ClientData, TrainingPlan, TrainingLogs, UserProfile } from '../../types'
import { Button } from '../shared/Button'
import { toast } from '../shared/Toast'
import { TrainingPlanEditor } from './TrainingPlanEditor'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'

type Tab = 'plan' | 'vista' | 'entrenos' | 'encuesta' | 'notas' | 'config'

interface Props {
  client: ClientData
  userProfile: UserProfile
  allClients: ClientData[]
  onClose: () => void
}

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'plan',     icon: Dumbbell,      label: 'Plan' },
  { id: 'vista',    icon: Eye,           label: 'Vista cliente' },
  { id: 'entrenos', icon: ClipboardList, label: 'Entrenos' },
  { id: 'encuesta', icon: MessageSquare, label: 'Encuesta' },
  { id: 'notas',    icon: StickyNote,    label: 'Notas' },
  { id: 'config',   icon: Settings,      label: 'Config' },
]

export function ClientPanel({ client, userProfile, allClients, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('plan')
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [logs, setLogs] = useState<TrainingLogs>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const library = useExerciseLibrary(userProfile.uid)
  const otherClients = allClients.filter(c => c.id !== clientId)

  useEffect(() => { loadData() }, [clientId])

  const loadData = async () => {
    setLoading(true)
    // Plan - FIXED: usando cliente_id y datos?.P
    const { data: planData } = await supabase
      .from('planes').select('datos').eq('cliente_id', clientId).single()
    if (planData?.datos?.P) setPlan(planData.datos.P as TrainingPlan)
    else setPlan({ clientId: clientId, type: 'hipertrofia', restMain: 180, restAcc: 90, restWarn: 30, weeks: [] })

    // Registros - FIXED: usando cliente_id y datos?.logs
    const { data: regData } = await supabase
      .from('registros').select('datos').eq('cliente_id', clientId).single()
    if (regData?.datos?.logs) setLogs(regData.datos.logs as TrainingLogs)

    setLoading(false)
  }

  const handlePlanChange = (newPlan: TrainingPlan) => {
    setPlan(newPlan)
    clearTimeout(saveTimer.current)
    setSaveMsg('Escribiendo...')
    saveTimer.current = setTimeout(() => savePlan(newPlan), 1500)
  }

  const savePlan = async (planToSave?: TrainingPlan) => {
    const p = planToSave || plan; if (!p) return
    setSaving(true); setSaveMsg('Guardando...')
    // FIXED: usando cliente_id, datos, updated_at y onConflict
    const { error } = await supabase.from('planes')
      .upsert({ cliente_id: clientId, datos: { P: p }, updated_at: new Date().toISOString() },
         { onConflict: 'cliente_id' })
    if (error) { toast('Error al guardar: ' + error.message, 'warn'); setSaveMsg('Error') }
    else { setSaveMsg('✓ Guardado'); setTimeout(() => setSaveMsg(''), 2000) }
    setSaving(false)
  }

  const importFromClient = async (clientId: string): Promise<TrainingPlan | null> => {
    const { data } = await supabase.from('planes').select('datos').eq('cliente_id', clientId).single()
    if (data?.datos?.P?.weeks?.length) return data.datos.P as TrainingPlan
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col animate-fade-in">
      <header className="bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center h-14 px-4 gap-3">
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5 mr-2">
            <div className="w-8 h-8 rounded-full bg-bg-alt border border-border flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
              {client.name?.[0]?.toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-tight">{client.name} {client.surname}</p>
              <p className="text-[10px] text-muted">{plan?.type || 'Sin tipo'}</p>
            </div>
          </div>
          <nav className="flex-1 flex items-stretch overflow-x-auto scrollbar-hide">
            {TABS.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 h-14 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                  activeTab === id ? 'border-ink text-ink font-semibold' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 flex-shrink-0">
            {saveMsg && <span className="text-xs text-muted hidden sm:block">{saveMsg}</span>}
            <Button size="sm" onClick={() => savePlan()} disabled={saving} className="gap-1.5">
              <Save className="w-3.5 h-3.5" /><span className="hidden sm:inline">Guardar</span>
            </Button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />)}</div>
            ) : (
              <>
                {activeTab === 'plan' && plan && (
                  <TrainingPlanEditor plan={plan} onChange={handlePlanChange}
                    allClients={otherClients} library={library.exercises} onImportFromClient={importFromClient} />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
