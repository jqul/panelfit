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
  isTrainer: boolean
  // Estas son opcionales para que no rompa cuando es modo cliente
  userProfile?: UserProfile 
  allClients?: ClientData[]
  onClose?: () => void
  onBack?: () => void 
}

export function ClientPanel({ client, isTrainer, userProfile, allClients, onClose, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('plan')
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  // Usamos cualquiera de las dos funciones de cierre que venga
  const handleExit = onClose || onBack || (() => window.location.reload());

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
    if (!isTrainer) return // Un cliente no puede editar su plan
    setPlan(newPlan)
    clearTimeout(saveTimer.current)
    setSaveMsg('Escribiendo...')
    saveTimer.current = setTimeout(() => savePlan(newPlan), 1500)
  }

  const savePlan = async (planToSave?: TrainingPlan) => {
    const p = planToSave || plan
    if (!p || !isTrainer) return
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
      toast('Error al guardar', 'warn')
      setSaveMsg('Error')
    } else {
      setSaveMsg('✓ Guardado')
      setTimeout(() => setSaveMsg(''), 2000)
    }
    setSaving(false)
  }

  const otherClients = allClients?.filter(c => c.id !== client.id) || []
  const library = useExerciseLibrary(userProfile?.uid || '')

  const TABS: { id: Tab; icon: any; label: string }[] = [
    { id: 'plan', icon: Dumbbell, label: isTrainer ? 'Plan' : 'Mi Plan' },
    ...(isTrainer ? [{ id: 'vista' as Tab, icon: Eye, label: 'Vista' }] : []),
    ...(isTrainer ? [{ id: 'notas' as Tab, icon: StickyNote, label: 'Notas' }] : []),
    { id: 'config', icon: Settings, label: 'Ajustes' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <header className="border-b h-14 flex items-center px-4 justify-between bg-white">
        <div className="flex items-center gap-4">
          <button onClick={handleExit} className="p-2"><ChevronLeft size={20}/></button>
          <span className="font-bold">{client.name}</span>
        </div>
        
        <nav className="flex gap-4">
          {TABS.map(t => (
            <button 
              key={t.id} 
              onClick={() => setActiveTab(t.id)}
              className={`text-sm font-medium ${activeTab === t.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isTrainer && (
            <>
              <span className="text-xs text-gray-400">{saveMsg}</span>
              <Button onClick={() => savePlan()} disabled={saving} size="sm">Guardar</Button>
            </>
          )}
          <button onClick={handleExit} className="p-2"><X size={20}/></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando plan...</div>
          ) : (
            <>
              {(activeTab === 'plan' || activeTab === 'vista') && plan && (
                isTrainer && activeTab === 'plan' ? (
                  <TrainingPlanEditor 
                    plan={plan} 
                    onChange={handlePlanChange} 
                    allClients={otherClients}
                    library={library.exercises}
                    onImportFromClient={async () => null}
                  />
                ) : (
                  <TrainingPlanView plan={plan} logs={{}} onLogsChange={() => {}} />
                )
              )}
              {activeTab === 'notas' && isTrainer && plan && (
                <textarea 
                  className="w-full h-64 p-4 border rounded-xl bg-white shadow-sm"
                  value={plan.coachNotes || ''}
                  onChange={(e) => handlePlanChange({...plan, coachNotes: e.target.value})}
                  placeholder="Notas privadas sobre el cliente..."
                />
              )}
              {activeTab === 'config' && (
                <div className="p-6 bg-white border rounded-xl shadow-sm">
                  <h3 className="font-bold mb-4">Configuración</h3>
                  <p className="text-sm text-gray-600">Nombre: {client.name} {client.surname}</p>
                  <p className="text-sm text-gray-600">Email: {client.email}</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
