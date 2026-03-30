import { useState, useEffect, useRef } from 'react'
import {
  X, Save, ChevronLeft, Camera, FileText, BarChart2,
  Dumbbell, Settings, ClipboardList, StickyNote, TrendingUp,
  Eye, Plus, Trash2
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
}

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'plan',     icon: Dumbbell,      label: 'Plan' },
  { id: 'dieta',    icon: FileText,      label: 'Dieta' },
  { id: 'vista',    icon: Eye,           label: 'Vista cliente' },
  { id: 'progreso', icon: TrendingUp,    label: 'Progreso' },
  { id: 'fotos',    icon: Camera,        label: 'Fotos' },
  { id: 'entrenos', icon: ClipboardList, label: 'Entrenos' },
  { id: 'notas',    icon: StickyNote,    label: 'Notas' },
  { id: 'config',   icon: Settings,      label: 'Config' },
]

export function ClientPanel({ client, userProfile, allClients, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('plan')
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const library = useExerciseLibrary(userProfile.uid)

  useEffect(() => { loadPlan() }, [client.id])

  const loadPlan = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('planes').select('datos').eq('cliente_id', client.id).single()
    setPlan(
      data?.datos?.P
        ? (data.datos.P as TrainingPlan)
        : { clientId: client.id, type: 'hipertrofia', restMain: 180, restAcc: 90, restWarn: 30, weeks: [] }
    )
    setLoading(false)
  }

  const handlePlanChange = (newPlan: TrainingPlan) => {
    setPlan(newPlan)
    clearTimeout(saveTimer.current)
    setSaveMsg('Escribiendo...')
    saveTimer.current = setTimeout(() => savePlan(newPlan), 1500)
  }

  const savePlan = async (planToSave?: TrainingPlan) => {
    const p = planToSave || plan
    if (!p) return
    setSaving(true)
    setSaveMsg('Guardando...')
    const { error } = await supabase.from('planes')
      .upsert({ cliente_id: client.id, datos: { P: p }, updated_at: new Date().toISOString() },
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

  const otherClients = allClients.filter(c => c.id !== client.id)

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      {/* Header */}
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

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
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
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?c=${client.token}`); toast('Enlace copiado ✓', 'ok') }}
              className="w-full text-[11px] font-semibold text-accent border border-accent/30 rounded-lg py-2 hover:bg-accent/5 transition-colors"
            >
              🔗 Copiar enlace
            </button>
          </div>
        </aside>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <>
                {/* PLAN — editor completo */}
                {activeTab === 'plan' && plan && (
                  <TrainingPlanEditor
                    plan={plan}
                    onChange={handlePlanChange}
                    allClients={otherClients}
                    library={library.exercises}
                    onImportFromClient={importFromClient}
                  />
                )}

                {/* DIETA — editor inline */}
                {activeTab === 'dieta' && (
                  <DietEditorTab clientId={client.id} />
                )}

                {/* VISTA CLIENTE — preview exacto */}
                {activeTab === 'vista' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-accent/5 border border-accent/20 rounded-xl">
                      <Eye className="w-5 h-5 text-accent flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-accent">Modo vista cliente</p>
                        <p className="text-xs text-muted mt-0.5">Esto es exactamente lo que ve el cliente. Los registros aquí no se guardan.</p>
                      </div>
                    </div>
                    {plan && plan.weeks.length > 0
                      ? <TrainingPlanView plan={plan} logs={{}} onLogsChange={() => {}} />
                      : (
                        <div className="flex flex-col items-center justify-center py-24 text-center text-muted">
                          <Eye className="w-14 h-14 mb-4 opacity-20" />
                          <h3 className="font-serif text-xl font-bold mb-1">Sin plan creado</h3>
                          <p className="text-sm">Crea el plan en la pestaña "Plan" primero.</p>
                        </div>
                      )
                    }
                  </div>
                )}

                {/* NOTAS */}
                {activeTab === 'notas' && <NotasTab plan={plan} onChange={handlePlanChange} />}

                {/* CONFIG */}
                {activeTab === 'config' && <ConfigTab client={client} plan={plan} onChange={handlePlanChange} />}

                {/* PLACEHOLDERS */}
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

// ── Editor de dieta (entrenador) ─────────────────────────
function DietEditorTab({ clientId }: { clientId: string }) {
  const [diet, setDiet] = useState<any>(null)
  const [dietLoading, setDietLoading] = useState(true)
  const [dietSaving, setDietSaving] = useState(false)

  useEffect(() => {
    supabase.from('dietas').select('datos').eq('cliente_id', clientId).single()
      .then(({ data }) => {
        setDiet(data?.datos || { kcal: 2000, protein: 150, carbs: 200, fats: 60, meals: [], advice: '' })
        setDietLoading(false)
      })
  }, [clientId])

  const saveDiet = async () => {
    setDietSaving(true)
    const { error } = await supabase.from('dietas')
      .upsert({ cliente_id: clientId, datos: diet, updated_at: new Date().toISOString() },
               { onConflict: 'cliente_id' })
    if (error) toast('Error: ' + error.message, 'warn')
    else toast('Dieta guardada ✓', 'ok')
    setDietSaving(false)
  }

  if (dietLoading) return (
    <div className="animate-pulse space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-card border border-border rounded-xl" />)}
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold">Plan Nutricional</h2>
          <p className="text-muted text-sm mt-0.5">
            {diet?.meals?.length || 0} comidas · {diet?.kcal || 0} kcal objetivo
          </p>
        </div>
        <button onClick={saveDiet} disabled={dietSaving}
          className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Save className="w-4 h-4" />
          {dietSaving ? 'Guardando...' : 'Guardar dieta'}
        </button>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          ['kcal', 'Calorías', 'kcal'],
          ['protein', 'Proteína', 'g'],
          ['carbs', 'Carbos', 'g'],
          ['fats', 'Grasas', 'g'],
        ] as [string, string, string][]).map(([key, label, unit]) => (
          <div key={key} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">{label}</p>
            <div className="flex items-baseline gap-1">
              <input
                type="number" min={0}
                value={diet?.[key] || 0}
                onChange={e => setDiet((d: any) => ({ ...d, [key]: parseInt(e.target.value) || 0 }))}
                className="w-full text-2xl font-serif font-bold bg-transparent outline-none p-0"
              />
              <span className="text-xs text-muted">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Comidas */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted">Comidas del día</p>
        {(!diet?.meals || diet.meals.length === 0) && (
          <div className="bg-card border-2 border-dashed border-border rounded-2xl p-10 text-center text-muted">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sin comidas. Pulsa abajo para añadir.</p>
          </div>
        )}
        {(diet?.meals || []).map((meal: any, i: number) => (
          <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 gap-3 px-4 py-3 border-b border-border items-center">
              <input type="time" value={meal.time || '08:00'}
                onChange={e => {
                  const m = [...diet.meals]; m[i] = { ...m[i], time: e.target.value }
                  setDiet((d: any) => ({ ...d, meals: m }))
                }}
                className="text-sm font-semibold bg-transparent outline-none"
              />
              <input type="text" placeholder="Nombre (ej: Desayuno)" value={meal.name || ''}
                onChange={e => {
                  const m = [...diet.meals]; m[i] = { ...m[i], name: e.target.value }
                  setDiet((d: any) => ({ ...d, meals: m }))
                }}
                className="text-sm bg-transparent outline-none"
              />
              <div className="flex items-center gap-1 justify-end">
                <input type="number" min={0} value={meal.kcal || ''} placeholder="0"
                  onChange={e => {
                    const m = [...diet.meals]; m[i] = { ...m[i], kcal: parseInt(e.target.value) || 0 }
                    setDiet((d: any) => ({ ...d, meals: m }))
                  }}
                  className="w-16 text-sm text-right bg-transparent outline-none"
                />
                <span className="text-xs text-muted">kcal</span>
                <button
                  onClick={() => setDiet((d: any) => ({ ...d, meals: d.meals.filter((_: any, idx: number) => idx !== i) }))}
                  className="ml-2 p-1 text-muted hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="px-4 pb-3 space-y-2 pt-2">
              {(meal.items || ['']).map((item: string, j: number) => (
                <div key={j} className="flex items-center gap-2">
                  <span className="text-muted text-xs w-4 flex-shrink-0">{j + 1}.</span>
                  <input
                    type="text" placeholder="Ej: Avena 60g, Leche 200ml..." value={item}
                    onChange={e => {
                      const m = [...diet.meals]
                      const items = [...(m[i].items || [])]
                      items[j] = e.target.value
                      m[i] = { ...m[i], items }
                      setDiet((d: any) => ({ ...d, meals: m }))
                    }}
                    className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                  {(meal.items || []).length > 1 && (
                    <button
                      onClick={() => {
                        const m = [...diet.meals]
                        m[i] = { ...m[i], items: m[i].items.filter((_: any, idx: number) => idx !== j) }
                        setDiet((d: any) => ({ ...d, meals: m }))
                      }}
                      className="p-1 text-muted hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => {
                  const m = [...diet.meals]
                  m[i] = { ...m[i], items: [...(m[i].items || []), ''] }
                  setDiet((d: any) => ({ ...d, meals: m }))
                }}
                className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted hover:border-accent hover:text-accent transition-all"
              >
                + Añadir alimento
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => setDiet((d: any) => ({
            ...d, meals: [...(d.meals || []), { time: '12:00', name: '', kcal: 0, items: [''] }]
          }))}
          className="w-full py-3 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-2 text-muted hover:border-accent hover:text-accent transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Añadir comida
        </button>
      </div>

      {/* Consejo */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted mb-2">
          Consejo nutricional para el cliente
        </p>
        <textarea rows={3}
          placeholder="Ej: Prioriza los carbohidratos antes del entrenamiento..."
          value={diet?.advice || ''}
          onChange={e => setDiet((d: any) => ({ ...d, advice: e.target.value }))}
          className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
        />
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
        <textarea rows={8}
          value={plan.coachNotes || ''}
          onChange={e => onChange({ ...plan, coachNotes: e.target.value })}
          placeholder="Ej: Cuidado con la rodilla izquierda..."
          className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none leading-relaxed"
        />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Etiquetas rápidas</p>
        <div className="flex flex-wrap gap-2">
          {TAGS.map(tag => (
            <button key={tag}
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

// ── Configuración ─────────────────────────────────────────
function ConfigTab({ client, plan, onChange }: {
  client: ClientData; plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void
}) {
  if (!plan) return null
  return (
    <div className="space-y-6 max-w-lg">
      <h3 className="font-serif font-bold text-lg">Configuración</h3>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-semibold">Tiempos de descanso</h4>
        {([
          ['Principal (seg)', 'restMain'],
          ['Accesorio (seg)', 'restAcc'],
          ['Aviso (seg)', 'restWarn'],
        ] as [string, 'restMain' | 'restAcc' | 'restWarn'][]).map(([label, key]) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <label className="text-sm text-muted">{label}</label>
            <input type="number"
              value={plan[key]}
              onChange={e => onChange({ ...plan, [key]: Number(e.target.value) })}
              className="w-24 text-center px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-semibold">Mensaje al cliente</h4>
        <textarea rows={3}
          value={plan.message || ''}
          onChange={e => onChange({ ...plan, message: e.target.value })}
          placeholder="Mensaje motivacional que verá el cliente en su panel..."
          className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-semibold">Enlace del cliente</h4>
        <div className="flex gap-2">
          <input readOnly
            value={`${window.location.origin}?c=${client.token}`}
            className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-xs text-muted outline-none"
          />
          <Button variant="outline" size="sm"
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?c=${client.token}`); toast('Enlace copiado ✓', 'ok') }}
          >
            Copiar
          </Button>
        </div>
        <p className="text-[11px] text-muted">Comparte este enlace con tu cliente. No necesita contraseña.</p>
      </div>
    </div>
  )
}

// ── Placeholder ───────────────────────────────────────────
function PlaceholderTab({ tab }: { tab: string }) {
  const labels: Record<string, string> = {
    progreso: 'Progreso', fotos: 'Fotos de progreso', entrenos: 'Historial de entrenos',
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
