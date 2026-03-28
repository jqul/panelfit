import { useState, useEffect, useRef } from 'react'
import {
  X, Save, ChevronLeft, Camera, FileText, BarChart2,
  Dumbbell, MessageSquare, Settings, ClipboardList, StickyNote, TrendingUp, Eye
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ClientData, TrainingPlan, UserProfile } from '../../types'
import { Button } from '../shared/Button'
import { toast } from '../shared/Toast'
import { TrainingPlanEditor } from './TrainingPlanEditor'
import { DietEditor } from './DietEditor'
import { TrainingPlanView } from '../client/TrainingPlanView'
import { useExerciseLibrary } from '../../hooks/useExerciseLibrary'

type Tab = 'plan' | 'dieta' | 'vista' | 'progreso' | 'fotos' | 'entrenos' | 'notas' | 'config'

interface Props {
  client: ClientData
  userProfile: UserProfile
  allClients: ClientData[]
  onClose: () => void
}

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'plan',     icon: Dumbbell,       label: 'Plan' },
  { id: 'dieta',    icon: FileText,       label: 'Dieta' },
  { id: 'vista',    icon: Eye,            label: 'Vista cliente' },
  { id: 'progreso', icon: TrendingUp,     label: 'Progreso' },
  { id: 'fotos',    icon: Camera,         label: 'Fotos' },
  { id: 'entrenos', icon: ClipboardList,  label: 'Entrenos' },
  { id: 'notas',    icon: StickyNote,     label: 'Notas' },
  { id: 'config',   icon: Settings,       label: 'Config' },
]

export function ClientPanel({ client, userProfile, allClients, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('plan')
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  // Cargar plan
  useEffect(() => {
    loadPlan()
  }, [clientId])

  const loadPlan = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('planes')
      .select('datos')
      .eq('cliente_id', clientId)
      .single()

    if (data?.datos?.P) {
      setPlan(data.datos.P as TrainingPlan)
    } else {
      // Plan vacío por defecto
      setPlan({
        clientId: clientId,
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
    // Auto-save con debounce
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
      .upsert({ cliente_id: clientId, datos: { P: p }, updated_at: new Date().toISOString() },
               { onConflict: 'cliente_id' })
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
      {/* Header */}
      <header className="bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center h-14 px-4 gap-3">
          {/* Back */}
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Avatar + nombre */}
          <div className="flex items-center gap-2.5 mr-4">
            <div className="w-8 h-8 rounded-full bg-bg-alt border border-border flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
              {client.name?.[0]?.toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-tight">{client.name} {client.surname}</p>
              <p className="text-[10px] text-muted">{plan?.type || 'Sin tipo'}</p>
            </div>
          </div>

          {/* Tabs */}
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

          {/* Save status + botón */}
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

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar info cliente (solo PC) */}
        <aside className="hidden lg:flex flex-col w-52 flex-shrink-0 bg-card border-r border-border overflow-y-auto">
          <div className="p-5 text-center border-b border-border">
            <div className="w-16 h-16 rounded-full bg-bg-alt border-2 border-border flex items-center justify-center font-serif text-2xl text-accent mx-auto mb-3">
              {client.name?.[0]?.toUpperCase()}
            </div>
            <h3 className="font-serif font-bold text-base">{client.name} {client.surname}</h3>
            <p className="text-[11px] text-muted mt-0.5">{plan?.type || '—'}</p>
          </div>
          <div className="p-4 space-y-3 text-sm border-b border-border">
            {[
              { label: 'Peso', value: plan ? '—' : '—' },
              { label: 'Semanas', value: plan?.weeks?.length ? `${plan.weeks.length}` : '0' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-muted">{label}</span>
                <span className="text-xs font-semibold">{value}</span>
              </div>
            ))}
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

        {/* Contenido tabs */}
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

                {/* Vista previa — el entrenador ve exactamente lo que verá el cliente */}
                {activeTab === 'vista' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-accent/5 border border-accent/20 rounded-xl">
                      <Eye className="w-5 h-5 text-accent flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-accent">Modo vista cliente</p>
                        <p className="text-xs text-muted mt-0.5">Esto es exactamente lo que ve el cliente en su enlace. Los registros no se guardan aquí.</p>
                      </div>
                    </div>
                    {plan && plan.weeks.length > 0 ? (
                      <TrainingPlanView plan={plan} logs={{}} onLogsChange={() => {}} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-24 text-center text-muted">
                        <Eye className="w-14 h-14 mb-4 opacity-20" />
                        <h3 className="font-serif text-xl font-bold mb-1">Sin plan creado</h3>
                        <p className="text-sm">Crea el plan en la pestaña "Plan" para ver la vista del cliente.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Dieta — editor completo */}
                {activeTab === 'dieta' && (
                  <DietEditor clientId={client.id} isTrainer={true} />
                )}

                {/* Placeholders para secciones pendientes */}
                {['progreso', 'fotos', 'entrenos'].includes(activeTab) && (
                  <PlaceholderTab tab={activeTab} />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// ── Notas privadas ────────────────────────────────────────
function NotasTab({ plan, onChange }: { plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void }) {
  if (!plan) return null
  const TAGS = ['⚠️ Lesión', '🔥 Alta intensidad', '🐢 Progreso lento', '⭐ Cliente VIP', '📞 Llamar']
  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h3 className="font-serif font-bold text-lg mb-1">Notas privadas</h3>
        <p className="text-xs text-muted mb-3">Solo las ves tú. El cliente no tiene acceso.</p>
        <textarea
          rows={8}
          value={plan.coachNotes || ''}
          onChange={e => onChange({ ...plan, coachNotes: e.target.value })}
          placeholder="Ej: Cuidado con la rodilla izquierda. Le cuesta la técnica en sentadilla..."
          className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none leading-relaxed"
        />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Etiquetas rápidas</p>
        <div className="flex flex-wrap gap-2">
          {TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => onChange({ ...plan, coachNotes: (plan.coachNotes || '') + '\n[' + tag + '] ' })}
              className="px-3 py-1.5 text-xs border border-border rounded-lg hover:border-accent hover:text-accent transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Configuración del cliente ─────────────────────────────
function ConfigTab({ client, plan, onChange }: { client: ClientData; plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void }) {
  if (!plan) return null
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h3 className="font-serif font-bold text-lg mb-4">Configuración</h3>
      </div>

      {/* Tiempos de descanso */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-semibold">Tiempos de descanso</h4>
        {[
          { label: 'Principal (seg)', key: 'restMain' as const },
          { label: 'Accesorio (seg)', key: 'restAcc' as const },
          { label: 'Aviso (seg)', key: 'restWarn' as const },
        ].map(({ label, key }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <label className="text-sm text-muted">{label}</label>
            <input
              type="number"
              value={plan[key]}
              onChange={e => onChange({ ...plan, [key]: Number(e.target.value) })}
              className="w-24 text-center px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        ))}
      </div>

      {/* Mensaje al cliente */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-semibold">Mensaje al cliente</h4>
        <textarea
          rows={3}
          value={plan.message || ''}
          onChange={e => onChange({ ...plan, message: e.target.value })}
          placeholder="Mensaje motivacional que verá el cliente en su panel..."
          className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none"
        />
      </div>

      {/* Enlace */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-semibold">Enlace del cliente</h4>
        <div className="flex gap-2">
          <input
            readOnly
            value={`${window.location.origin}?c=${client.token}`}
            className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-xs text-muted outline-none"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}?c=${client.token}`)
              toast('Enlace copiado ✓', 'ok')
            }}
          >
            Copiar
          </Button>
        </div>
        <p className="text-[11px] text-muted">Comparte este enlace con tu cliente. No necesita contraseña.</p>
      </div>
    </div>
  )
}

// ── Placeholder secciones pendientes ─────────────────────
function PlaceholderTab({ tab }: { tab: string }) {
  const labels: Record<string, string> = {
    dieta: 'Dieta',
    vista: 'Vista previa del cliente',
    progreso: 'Progreso',
    fotos: 'Fotos de progreso',
    entrenos: 'Historial de entrenos',
  }
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center text-muted">
      <div className="w-14 h-14 bg-bg-alt rounded-2xl flex items-center justify-center mb-4 opacity-50">
        <Dumbbell className="w-6 h-6" />
      </div>
      <h3 className="font-serif text-xl font-bold mb-1">{labels[tab] || tab}</h3>
      <p className="text-sm">Próximamente disponible</p>
    </div>
  )
}
