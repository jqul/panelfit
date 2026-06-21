import { useState } from 'react'
import { Users, Dumbbell, CalendarDays, TrendingUp, Settings, ArrowRight } from 'lucide-react'

const STEPS = [
  { icon: Users, title: 'Tus clientes', desc: 'Añade clientes desde "Clientes" o el acceso rápido del resumen. Cada cliente tiene su propio panel: plan, dieta, progreso y más.' },
  { icon: Dumbbell, title: 'Workouts y programas', desc: 'Crea plantillas reutilizables en "Workouts" y prográmalas en "Programas". Al asignar una plantilla a un cliente, se adapta automáticamente a la semana en que esté.' },
  { icon: CalendarDays, title: 'Calendario', desc: 'Agenda sesiones individuales o recurrentes. Tus clientes verán sus próximas citas en su panel.' },
  { icon: TrendingUp, title: 'Progreso y rendimiento', desc: 'Cada cliente tiene 1RM estimado, autoregulación por RIR, niveles de fuerza y volumen por grupo muscular — sin que tengas que calcular nada a mano.' },
  { icon: Settings, title: 'Personaliza tu marca', desc: 'En "Ajustes" configura tu logo, colores y mensajes automáticos. Tus clientes verán tu marca, no la nuestra.' },
]

export function OnboardingTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[100] bg-ink/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-5">
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= step ? 'bg-accent' : 'bg-border'}`} />
          ))}
        </div>

        <div className="text-center space-y-3 py-2">
          <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto">
            <current.icon className="w-7 h-7 text-accent" />
          </div>
          <h2 className="text-xl font-serif font-bold">{current.title}</h2>
          <p className="text-sm text-muted leading-relaxed">{current.desc}</p>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 border border-border rounded-2xl text-sm font-medium text-muted hover:bg-bg-alt transition-colors">
            Saltar
          </button>
          <button onClick={() => isLast ? onClose() : setStep(s => s + 1)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-ink text-white rounded-2xl text-sm font-bold hover:opacity-90 transition-opacity">
            {isLast ? 'Empezar' : 'Siguiente'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
