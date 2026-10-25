import { Check, ArrowRight, X } from 'lucide-react'
import type { OnboardingProgress, OnboardingStepId } from '../../lib/onboardingProgress'

/**
 * Tarjeta de "Primeros pasos" del panel Hoy: tres resultados (cliente → workout → acceso) que se marcan solos
 * según los datos reales. Una sola acción principal: el botón del siguiente paso.
 */
export function OnboardingChecklist({ progress, onStep, onHide }: {
  progress: OnboardingProgress
  onStep: (step: OnboardingStepId, clientId: string | null) => void
  onHide: () => void
}) {
  const { steps, next, complete, done, total, focusClientId, openedCount } = progress
  const hero = done === 0 // entrenador recién llegado: la tarjeta es lo primero que ve

  return (
    <section aria-label="Primeros pasos" className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div className={`flex items-start justify-between gap-3 ${hero ? 'px-6 pt-8 pb-4 sm:px-8' : 'px-5 pt-5 pb-3'}`}>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">{complete ? 'Todo listo' : `Primeros pasos · ${done} de ${total}`}</p>
          <h3 className={`font-serif font-bold leading-snug ${hero ? 'text-2xl' : 'text-lg'}`}>
            {complete ? 'Tu primer cliente ya tiene su enlace' : hero ? 'Tu primer cliente, entrenando en 2 minutos' : next!.title}
          </h3>
          <p className="text-sm text-muted mt-1">
            {complete
              ? (openedCount > 0 ? `${openedCount === 1 ? 'Un cliente ya ha abierto' : `${openedCount} clientes ya han abierto`} su plan.` : 'En cuanto lo abra, lo verás aquí y en la Bandeja.')
              : hero ? 'Crea al cliente, dale un workout y mándale el acceso por WhatsApp. Sin instalar nada.' : next!.desc}
          </p>
        </div>
        <button onClick={onHide} aria-label={complete ? 'Cerrar los primeros pasos' : 'Ocultar los primeros pasos'} title="Ocultar"
          className="p-2 -mr-2 -mt-1 rounded-lg text-muted hover:bg-bg-alt hover:text-ink flex-shrink-0"><X className="w-4 h-4" /></button>
      </div>

      <ol className={`${hero ? 'px-6 sm:px-8' : 'px-5'} space-y-1.5`}>
        {steps.map((s, i) => (
          <li key={s.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${s.id === next?.id ? 'bg-bg-alt/60' : ''}`}>
            <span aria-hidden className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${s.done ? 'bg-ok text-white' : s.id === next?.id ? 'bg-ink text-white' : 'bg-bg-alt text-muted'}`}>
              {s.done ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </span>
            <span className={`text-sm flex-1 ${s.done ? 'text-muted line-through' : 'font-semibold'}`}>{s.title}</span>
            <span className="sr-only">{s.done ? 'Hecho' : s.id === next?.id ? 'Siguiente paso' : 'Pendiente'}</span>
          </li>
        ))}
      </ol>

      <div className={`${hero ? 'px-6 pb-8 sm:px-8' : 'px-5 pb-5'} pt-4`}>
        {complete ? (
          <button onClick={onHide} className="px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-muted hover:bg-bg-alt">Entendido</button>
        ) : (
          <button onClick={() => onStep(next!.id, focusClientId)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
            {next!.cta} <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </section>
  )
}
