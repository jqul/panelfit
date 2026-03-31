import { useState, useEffect } from 'react'
import { Home, Dumbbell, BarChart2, Utensils, MoreHorizontal } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TrainingPlan, TrainingLogs, WeightEntry } from '../../types'
import { ClientDashboard } from './ClientDashboard'
import { TrainingPlanView } from './TrainingPlanView'

interface ClientViewProps { token: string }
type Tab = 'hoy' | 'entreno' | 'progreso' | 'dieta' | 'mas'

export function ClientView({ token }: ClientViewProps) {
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
    const { data: clientData, error: cErr } = await supabase
      .from('clientes').select('*').eq('token', token).single()
    if (cErr || !clientData) { setError('Enlace no válido o expirado.'); setLoading(false); return }
    setClient(clientData)

    const { data: planData } = await supabase
      .from('planes').select('plan').eq('clientId', clientData.id).single()
    if ((planData as any)?.plan?.P) setPlan((planData as any).plan.P as TrainingPlan)

    const { data: regData } = await supabase
      .from('registros').select('logs').eq('clientId', clientData.id).single()
    if ((regData as any)?.logs) setLogs((regData as any).logs as TrainingLogs)

    setLoading(false)
  }

  const handleLogsChange = async (newLogs: TrainingLogs) => {
    setLogs(newLogs)
    await supabase.from('registros').upsert({
      clientId: client.id,
      logs: newLogs,
      updatedAt: new Date().toISOString(),
    }, { onConflict: 'clientId' })
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

  const clientName = `${client.name || ''} ${client.surname || ''}`.trim()
  const brandName = plan?.brandName || 'PanelFit'

  const TABS = [
    { id: 'hoy' as Tab,     icon: Home,           label: 'Hoy' },
    { id: 'entreno' as Tab, icon: Dumbbell,       label: 'Entreno' },
    { id: 'progreso' as Tab,icon: BarChart2,      label: 'Progreso' },
    { id: 'dieta' as Tab,   icon: Utensils,       label: 'Dieta' },
    { id: 'mas' as Tab,     icon: MoreHorizontal, label: 'Más' },
  ]

  return (
    <div className="min-h-screen bg-bg flex flex-col">
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

      <main className="flex-1 pb-20 max-w-2xl mx-auto w-full">
        {activeTab === 'hoy' && plan && (
          <ClientDashboard plan={plan} logs={logs} onLogsChange={handleLogsChange}
            weightHistory={weightHistory} clientName={clientName} />
        )}
        {activeTab === 'entreno' && plan && (
          <TrainingPlanView plan={plan} logs={logs} onLogsChange={handleLogsChange} />
        )}
        {activeTab === 'dieta' && <DietaClienteView plan={plan} />}
        {activeTab === 'progreso' && (
          <div className="p-6 text-center text-muted py-20">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-serif text-lg">Progreso</p>
            <p className="text-sm mt-1">Próximamente</p>
          </div>
        )}
        {!plan && (
          <div className="p-6 text-center text-muted py-20">
            <p className="font-serif text-lg">Sin plan asignado</p>
            <p className="text-sm mt-1">Tu entrenador aún no ha creado tu plan.</p>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-10">
        <div className="flex max-w-2xl mx-auto">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                activeTab === id ? 'text-ink' : 'text-muted'
              }`}
            >
              <Icon className={`w-5 h-5 ${activeTab === id ? 'text-ink' : 'text-muted'}`} />
              <span className={`text-[10px] font-medium ${activeTab === id ? 'font-bold text-ink' : ''}`}>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function DietaClienteView({ plan }: { plan: TrainingPlan | null }) {
  const diet = (plan as any)?.diet
  if (!diet?.kcal && !diet?.advice) return (
    <div className="p-6 text-center text-muted py-20">
      <Utensils className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-serif text-lg">Sin plan de dieta</p>
      <p className="text-sm mt-1">Tu entrenador aún no ha añadido tu dieta.</p>
    </div>
  )
  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto">
      {diet.kcal > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-serif font-bold mb-4">Macros diarios</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Calorías', value: diet.kcal, unit: 'kcal', color: 'text-accent' },
              { label: 'Proteína', value: diet.protein, unit: 'g', color: 'text-ok' },
              { label: 'Carbohidratos', value: diet.carbs, unit: 'g', color: 'text-warn' },
              { label: 'Grasas', value: diet.fats, unit: 'g', color: 'text-muted' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="bg-bg rounded-xl p-3 text-center">
                <p className={`text-2xl font-serif font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-muted uppercase tracking-wider">{label} · {unit}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {diet.advice && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-serif font-bold mb-3">Indicaciones</h3>
          <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-wrap">{diet.advice}</p>
        </div>
      )}
    </div>
  )
}
