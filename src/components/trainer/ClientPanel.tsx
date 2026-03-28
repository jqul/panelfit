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
  isTrainer?: boolean
}

export function ClientPanel({ client, userProfile, allClients, onClose }: Props) {
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
      setSaveMsg('Error')
    } else {
      setSaveMsg('✓ Guardado')
      setTimeout(() => setSaveMsg(''), 2000)
    }
    setSaving(false)
  }

  const otherClients = allClients.filter(c => c.id !== client.id)
  const library = useExerciseLibrary(userProfile.uid)

  const TABS: { id: Tab; icon: any; label: string }[] = [
    { id: 'plan', icon: Dumbbell, label: 'Plan' },
    { id: 'vista', icon: Eye, label: 'Vista' },
    { id: 'notas', icon: StickyNote, label: 'Notas' },
    { id: 'config', icon: Settings, label: 'Config' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <header className="border-b h-14 flex items-center px-4 justify-between bg-white">
        <div className="flex items-center gap-4">
          <button onClick={onClose}><ChevronLeft /></button>
          <span className="font-bold">{client.name}</span>
        </div>
        <nav className="flex gap-4">
          {TABS.map(t => (
            <button 
              key={t.id} 
              onClick={() => setActiveTab(t.id)}
              className={activeTab === t.id ? 'text-blue-600' : 'text-gray-500'}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{saveMsg}</span>
          <Button onClick={() => savePlan()} disabled={saving} size="sm">Guardar</Button>
          <button onClick={onClose}><X /></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <p>Cargando...</p>
          ) : (
            <>
              {activeTab === 'plan' && plan && (
                <TrainingPlanEditor 
                  plan={plan} 
                  onChange={handlePlanChange} 
                  allClients={otherClients}
                  library={library.exercises}
                  onImportFromClient={async () => null}
                />
              )}
              {activeTab === 'vista' && plan && (
                <TrainingPlanView plan={plan} logs={{}} onLogsChange={() => {}} />
              )}
              {activeTab === 'notas' && plan && (
                <textarea 
                  className="w-full h-64 p-4 border rounded-xl"
                  value={plan.coachNotes || ''}
                  onChange={(e) => handlePlanChange({...plan, coachNotes: e.target.value})}
                  placeholder="Notas privadas..."
                />
              )}
              {activeTab === 'config' && (
                <div className="p-4 bg-white border rounded-xl">
                  <h3 className="font-bold mb-4">Configuración del cliente</h3>
                  <p className="text-sm text-gray-500">ID: {client.id}</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
