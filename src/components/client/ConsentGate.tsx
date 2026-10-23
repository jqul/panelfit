import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { ConsentFields } from './ConsentFields'

interface Props {
  withdrawn: boolean
  trainerName: string
  brandColor: string
  onGrant: (salud: boolean, fotos: boolean) => Promise<boolean>
  onLogout: () => void
}

// Pantalla que se interpone cuando el cliente aún no ha dado su consentimiento
// (clientes que ya existían antes de pedirlo, o si cambió el texto) o lo retiró.
export function ConsentGate({ withdrawn, trainerName, brandColor, onGrant, onLogout }: Props) {
  const [salud, setSalud] = useState(false)
  const [fotos, setFotos] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const accept = async () => {
    setSaving(true); setError('')
    const ok = await onGrant(true, fotos)
    if (!ok) setError('No se pudo guardar. Comprueba la conexión e inténtalo de nuevo.')
    setSaving(false)
  }

  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col">
      <div className="px-6 pt-10 pb-4">
        <h1 className="text-xl font-serif font-bold">{withdrawn ? 'Has retirado tu consentimiento' : 'Antes de seguir...'}</h1>
        <p className="text-sm text-muted mt-1.5">
          {withdrawn
            ? `Mientras no lo des de nuevo no se guardan tus datos de salud. Si lo que quieres es que ${trainerName} borre tus datos, ya tiene tu solicitud.`
            : `${trainerName} necesita tu consentimiento para tratar tus datos de salud. Es un paso de una sola vez.`}
        </p>
      </div>
      <div className="flex-1 px-6 space-y-4 max-w-sm mx-auto w-full pb-8">
        <ConsentFields salud={salud} fotos={fotos} onSalud={setSalud} onFotos={setFotos} />
        {error && <p role="alert" className="text-sm text-warn">{error}</p>}
        <button onClick={accept} disabled={!salud || saving}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base disabled:opacity-50 transition-opacity active:scale-[0.98]"
          style={{ backgroundColor: brandColor, minHeight: '56px' }}>
          {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Aceptar y continuar <ArrowRight className="w-4 h-4" /></>}
        </button>
        <button onClick={onLogout} className="w-full py-3 text-sm font-medium text-muted">Cerrar sesión</button>
      </div>
    </div>
  )
}
