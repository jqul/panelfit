import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { isDemoTrainerId } from '../../lib/demoIds'
import { TIPOS_AVISO, limpiarPreferencias, type PreferenciasAvisos, type TipoAviso } from '../../lib/preferenciasAvisos'

// Ajustes → Notificaciones: qué avisos push te llegan (lib/preferenciasAvisos). Cada interruptor se guarda al
// pulsarlo, fusionando con lo último del perfil en el servidor. La Bandeja no cambia: esto solo decide qué suena.
export function AvisosEditor({ trainerId }: { trainerId: string }) {
  const [prefs, setPrefs] = useState<PreferenciasAvisos | null>(null)
  const [guardando, setGuardando] = useState<TipoAviso | null>(null)
  const demo = isDemoTrainerId(trainerId)

  useEffect(() => {
    let vivo = true
    if (demo) { setPrefs(limpiarPreferencias(undefined)); return }
    supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle().then(({ data }) => {
      if (vivo) setPrefs(limpiarPreferencias((data?.profile as { avisos?: unknown } | null)?.avisos))
    })
    return () => { vivo = false }
  }, [trainerId, demo])

  if (!prefs) return null

  const cambiar = async (tipo: TipoAviso) => {
    const nuevas = { ...prefs, [tipo]: !prefs[tipo] }
    setPrefs(nuevas)
    if (demo) return
    setGuardando(tipo)
    const { data } = await supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
    const profile = { ...(data?.profile || {}), avisos: nuevas, updatedAt: Date.now() }
    const { error } = await supabase.from('entrenadores').update({ profile }).eq('uid', trainerId)
    setGuardando(null)
    if (error) { setPrefs(prefs); toast('No se pudo guardar: ' + error.message, 'warn') }
  }

  return (
    <div className="pt-3 border-t border-border/40">
      <p className="text-sm font-medium">Qué avisos te llegan</p>
      <p className="text-xs text-muted mt-0.5 mb-2">Lo que apagues no te sonará en el móvil, pero seguirá en la Bandeja.</p>
      <ul aria-label="Tipos de aviso" className="divide-y divide-border/40">
        {TIPOS_AVISO.map(t => (
          <li key={t.id} className="flex items-center justify-between gap-4 py-2">
            <div className="min-w-0">
              <p className="text-sm">{t.emoji} {t.label}</p>
              <p className="text-[11px] text-muted">{t.detalle}</p>
            </div>
            <button role="switch" aria-checked={prefs[t.id]} aria-label={t.label} onClick={() => cambiar(t.id)}
              disabled={guardando === t.id}
              className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${prefs[t.id] ? 'bg-accent' : 'bg-border'} ${guardando === t.id ? 'opacity-50' : ''}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-card rounded-full shadow transition-transform ${prefs[t.id] ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
