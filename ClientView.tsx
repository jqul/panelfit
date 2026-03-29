import { useState, useEffect } from 'react'
import { Home, Dumbbell, BarChart2, Utensils, MoreHorizontal } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TrainingPlan, TrainingLogs, WeightEntry } from '../../types'
import { ClientDashboard } from './ClientDashboard'
import { TrainingPlanView } from './TrainingPlanView'

interface Props { token: string }
type Tab = 'hoy' | 'entreno' | 'progreso' | 'dieta' | 'mas'

export function ClientView({ token }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [client, setClient] = useState<any>(null)
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [logs, setLogs] = useState<TrainingLogs>({})
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('hoy')

  useEffect(() => { loadData() }, [token])

  const loadData = async () => {
    setLoading(true)

    // 1. Cliente por token
    const { data: clientData, error: cErr } = await supabase
      .from('clientes').select('*').eq('token', token).single()
    if (cErr || !clientData) {
      setError('Enlace no válido o expirado.')
      setLoading(false)
      return
    }
    setClient(clientData)

    // 2. Plan
    const { data: planRow } = await supabase
      .from('planes').select('datos').eq('cliente_id', clientData.id).single()
    if (planRow?.datos?.P) setPlan(planRow.datos.P as TrainingPlan)

    // 3. Registros de entreno
    const { data: regRow } = await supabase
      .from('registros').select('datos').eq('cliente_id', clientData.id).single()
    if (regRow?.datos?.logs) setLogs(regRow.datos.logs as TrainingLogs)
    if (regRow?.datos?.pesoHistorial) setWeightHistory(regRow.datos.pesoHistorial)

    setLoading(false)
  }

  const handleLogsChange = async (newLogs: TrainingLogs) => {
    setLogs(newLogs)
    await supabase.from('registros').upsert({
      cliente_id: client.id,
      datos: { logs: newLogs, pesoHistorial: weightHistory },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'cliente_id' })
  }

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-serif font-bold mb-2">Panel<span className="text-accent italic">Fit</span></h1>
        <p className="text-muted text-sm">Cargando tu plan...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-3xl font-serif font-bold mb-4">Panel<span className="text-accent italic">Fit</span></h1>
        <p className="text-warn">{error}</p>
        <p className="text-muted text-sm mt-2">Pide a tu entrenador que te envíe el enlace correcto.</p>
      </div>
    </div>
  )

  const clientName = `${client.nombre || client.name || ''} ${client.apellido || client.surname || ''}`.trim()
  const brandName = plan?.brandName || 'PanelFit'

  const TABS = [
    { id: 'hoy' as Tab,     icon: Home,            label: 'Hoy' },
    { id: 'entreno' as Tab, icon: Dumbbell,        label: 'Entreno' },
    { id: 'progreso' as Tab,icon: BarChart2,       label: 'Progreso' },
    { id: 'dieta' as Tab,   icon: Utensils,        label: 'Dieta' },
    { id: 'mas' as Tab,     icon: MoreHorizontal,  label: 'Más' },
  ]

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-2">
            {plan?.brandLogo && (
              <img src={plan.brandLogo} className="w-7 h-7 rounded-full object-cover border border-border" alt="" />
            )}
            <span className="font-serif font-bold text-base">{brandName}</span>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold">{clientName}</p>
            {plan?.type && <p className="text-[10px] text-muted capitalize">{plan.type}</p>}
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 pb-20 max-w-2xl mx-auto w-full">
        {activeTab === 'hoy' && plan && (
          <ClientDashboard
            plan={plan} logs={logs}
            onLogsChange={handleLogsChange}
            weightHistory={weightHistory}
            clientName={clientName}
          />
        )}
        {activeTab === 'hoy' && !plan && (
          <div className="p-6 text-center text-muted py-20">
            <p className="font-serif text-lg">Sin plan asignado</p>
            <p className="text-sm mt-1">Tu entrenador aún no ha creado tu plan.</p>
          </div>
        )}

        {activeTab === 'entreno' && plan && (
          <TrainingPlanView plan={plan} logs={logs} onLogsChange={handleLogsChange} />
        )}
        {activeTab === 'entreno' && !plan && (
          <div className="p-6 text-center text-muted py-20">
            <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-serif text-lg">Sin plan de entrenamiento</p>
            <p className="text-sm mt-1">Tu entrenador aún no ha creado tu rutina.</p>
          </div>
        )}

        {activeTab === 'progreso' && (
          <div className="p-6 text-center text-muted py-20">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-serif text-lg">Progreso</p>
            <p className="text-sm mt-1">Próximamente</p>
          </div>
        )}

        {activeTab === 'dieta' && (
          <DietClientView clientId={client?.id || ''} />
        )}

        {activeTab === 'mas' && (
          <div className="p-6 text-center text-muted py-20">
            <p className="font-serif text-lg">Más opciones</p>
            <p className="text-sm mt-1">Próximamente</p>
          </div>
        )}
      </main>

      {/* Tab bar inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-10">
        <div className="flex max-w-2xl mx-auto">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                activeTab === id ? 'text-ink' : 'text-muted'
              }`}
            >
              <Icon className={`w-5 h-5 ${activeTab === id ? 'text-ink' : 'text-muted'}`} />
              <span className={`text-[10px] font-medium ${activeTab === id ? 'font-bold text-ink' : ''}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

// ── Vista dieta del cliente (solo lectura) ────────────────
function DietClientView({ clientId }: { clientId: string }) {
  const [diet, setDiet] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) return
    supabase.from('dietas').select('datos').eq('cliente_id', clientId).single()
      .then(({ data }) => {
        setDiet(data?.datos || null)
        setLoading(false)
      })
  }, [clientId])

  if (loading) return (
    <div className="p-6 animate-pulse space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-card/50 rounded-xl" />)}
    </div>
  )

  if (!diet || (!diet.meals?.length && !diet.advice)) return (
    <div className="p-6 text-center text-muted py-20">
      <Utensils className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-serif text-lg">Sin plan nutricional</p>
      <p className="text-sm mt-1">Tu entrenador aún no ha creado tu dieta.</p>
    </div>
  )

  const sortedMeals = [...(diet.meals || [])].sort((a: any, b: any) =>
    (a.time || '').localeCompare(b.time || '')
  )

  return (
    <div className="space-y-5 max-w-xl mx-auto py-6 px-4">
      {/* Macros */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'kcal',    label: 'Calorías', unit: 'kcal', color: 'text-accent' },
          { key: 'protein', label: 'Proteína', unit: 'g',    color: 'text-ok' },
          { key: 'carbs',   label: 'Carbos',   unit: 'g',    color: 'text-blue-600' },
          { key: 'fats',    label: 'Grasas',   unit: 'g',    color: 'text-amber-600' },
        ].map(m => (
          <div key={m.key} className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">{m.label}</p>
            <p className={`text-2xl font-serif font-bold ${m.color}`}>{diet[m.key] || 0}</p>
            <p className="text-xs text-muted">{m.unit}</p>
          </div>
        ))}
      </div>

      {/* Comidas */}
      <div className="space-y-3">
        {sortedMeals.map((meal: any, i: number) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-bold text-muted min-w-[45px]">{meal.time}</span>
              <h3 className="font-serif font-bold text-base flex-1">{meal.name}</h3>
              {meal.kcal > 0 && (
                <span className="text-xs font-bold text-muted bg-bg px-2 py-1 rounded-full border border-border">
                  {meal.kcal} kcal
                </span>
              )}
            </div>
            <ul className="space-y-1">
              {(meal.items || []).filter(Boolean).map((item: string, j: number) => (
                <li key={j} className="flex items-start gap-2 text-sm text-muted">
                  <span className="text-accent mt-0.5 flex-shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Consejo */}
      {diet.advice && (
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-accent mb-2">
            Consejo del entrenador
          </p>
          <p className="text-sm text-ink leading-relaxed italic">"{diet.advice}"</p>
        </div>
      )}
    </div>
  )
}
