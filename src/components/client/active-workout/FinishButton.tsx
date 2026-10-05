import { CheckCircle2 } from 'lucide-react'

interface Props {
  allComplete: boolean
  onClick: () => void
}

// Botón de la cabecera para cerrar la sesión. Durante el entreno la acción
// importante es la serie, no cerrar: mientras falten series es secundario
// (solo borde, sin color) para que no invite a salir por error. Cuando todo
// está hecho pasa a verde y es lo que llama la atención.
export function FinishButton({ allComplete, onClick }: Props) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
        allComplete
          ? 'bg-ok text-white shadow-md shadow-ok/30'
          : 'border border-border text-muted hover:text-ink hover:border-ink'
      }`}
      style={{ minHeight: '40px' }}>
      {allComplete && <CheckCircle2 className="w-3.5 h-3.5" />}
      {allComplete ? '¡Terminar!' : 'Terminar'}
    </button>
  )
}
