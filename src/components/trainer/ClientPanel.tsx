import { useState, useEffect, useRef } from 'react'
import {
  X, Save, ChevronLeft, Camera, FileText, 
  Dumbbell, Settings, ClipboardList, StickyNote, TrendingUp, Eye
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ClientData, TrainingPlan, UserProfile } from '../../types'
import { Button } from '../shared/Button'
import { toast } from '../shared/Toast'
import { TrainingPlanEditor } from './TrainingPlanEditor'
import { TrainingPlanView } from '../client/TrainingPlanView'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'

type Tab = 'plan' | 'dieta' | 'vista' | 'progreso' | 'fotos' | 'entrenos' | 'notas' | 'config'

interface Props {
  client: ClientData
  userProfile: UserProfile
  allClients: ClientData[]
  onClose: () => void
  isTrainer?: boolean; // Añadido para compatibilidad con App.tsx
}

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'plan',     icon: Dumbbell,       label: 'Plan' },
  { id: 'dieta',    icon: FileText,       label: 'Dieta' },
  { id: 'vista',    icon: Eye,            label: 'Vista cliente' },
  { id: 'progreso', icon: TrendingUp,      label: 'Progreso' },
  { id: 'fotos',    icon: Camera,          label: 'Fotos' },
  { id: 'entrenos', icon: ClipboardList,  label: 'Entrenos' },
  { id: 'notas',    icon: StickyNote,      label: 'Notas' },
  { id: 'config',   icon: Settings,        label: 'Config' },
]

export function ClientPanel({ client, userProfile, allClients, onClose, isTrainer }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('plan')
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    loadPlan()
  }, [client.id])

  const loadPlan = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('planes')
      .select('datos')
      .eq('cliente_id', client.id)
      .single()

    if (data?.datos?.P) {
      setPlan(data.datos.P as TrainingPlan)
    } else {
      setPlan({
        clientId: client.id,
        type: 'hipertrofia',
        restMain: 180,
        restAcc: 90,
        restWarn: 30,
        weeks: [],
      })
    }
    setLoading(false)
  }

  const handlePlanChange = (newPlan: TrainingPlan) => {
    setPlan(newPlan)
    clearTimeout(saveTimer.current)
    setSaveMsg('Escribiendo...')
    saveTimer.current = setTimeout(() => {
      savePlan(newPlan)
    }, 1500)
  }

  const savePlan = async (planToSave?: TrainingPlan) => {
    const p = planToSave || plan
    if (!p) return
    setSaving(true)
    setSaveMsg('Guardando...')
    const { error } = await supabase
      .from('planes')
      .upsert({ 
        cliente_id: client.id, 
        datos: { P: p }, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'cliente_id' })
    
    if (error) {
      toast('Error al guardar: ' + error.message, 'warn')
      setSaveMsg('Error al guardar')
    } else {
      setSaveMsg('✓ Guardado')
      setTimeout(() => setSaveMsg(''), 2000)
    }
    setSaving(false)
  }

  const importFromClient = async (clientId: string): Promise<TrainingPlan | null> => {
    const { data } = await supabase
      .from('planes')
      .select('datos')
      .eq('cliente_id', clientId)
      .single()
    if (data?.datos?.P?.weeks?.length) return data.datos.P as TrainingPlan
    return null
  }

  const otherClients = allClients.filter(c => c.id !== client.id)
  const library = useExerciseLibrary(userProfile.uid)

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col animate-fade-in">
      <header className="bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center h-14 px-4 gap-3">
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 mr-4">
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
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 h-14 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                  activeTab === id
                    ? 'border-ink text-ink font-semibold'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 flex-shrink-0">
            {saveMsg && <span className="text-xs text-muted hidden sm:block">{saveMsg}</span>}
            <Button size="sm" onClick={() => savePlan()} disabled={saving} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Guardar</span>
            </Button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:flex flex-col w-52 flex-shrink-0 bg-card border-r border-border overflow-y-auto">
          <div className="p-5 text-center border-b border-border">
            <div className="w-16 h-16 rounded-full bg-bg-alt border-2 border-border flex items-center justify-center font-serif text-2xl text-accent mx-auto mb-3">
              {client.name?.[0]?.toUpperCase()}
            </div>
            <h3 className="font-serif font-bold text-base">{client.name} {client.surname}</h3>
            <p className="text-[11px] text-muted mt-0.5">{plan?.type || '—'}</p>
          </div>
          <div className="p-4 space-y-3 text-sm border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Semanas</span>
              <span className="text-xs font-semibold">{plan?.weeks?.length || 0}</span>
            </div>
          </div>
          <div className="p-4 mt-auto">
            <button
              onClick={() => {
                const url = `${window.location.origin}?c=${client.token}`
                navigator.clipboard.writeText(url)
                toast('Enlace copiado ✓', 'ok')
              }}
              className="w-full text-[11px] font-semibold text-accent border border-accent/30 rounded-lg py-2 hover:bg-accent/5 transition-colors"
            >
              🔗 Copiar enlace
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <>
                {activeTab === 'plan' && plan && (
                  <TrainingPlanEditor
                    plan={plan}
                    onChange={handlePlanChange}
                    allClients={otherClients}
                    library={library.exercises}
                    onImportFromClient={importFromClient}
                  />
                )}
                {activeTab === 'notas' && <NotasTab plan={plan} onChange={handlePlanChange} />}
                {activeTab === 'config' && <ConfigTab client={client} plan={plan} onChange={handlePlanChange} />}
                {activeTab === 'vista' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-accent/5 border border-accent/20 rounded-xl">
                      <Eye className="w-
