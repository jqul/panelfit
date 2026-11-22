import { lazy, Suspense, useEffect, useState } from 'react'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { isDemoClientId } from '../../lib/demoIds'
import { estadoParq, type EstadoParq, type FilaAdmision } from '../../lib/retencionParq'
import { borrarPendientes, leerPendientes, type AlmacenLocal, type ValoresBasicos } from '../../lib/datosBasicosPendientes'
import { guardarDatosBasicos } from '../../lib/guardarDatosBasicos'
import { toast } from '../shared/Toast'

const CuestionarioAviso = lazy(() => import('./CuestionarioAviso').then(m => ({ default: m.CuestionarioAviso })))

const almacen = (): AlmacenLocal | null => { try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null } }

// En Hoy, lo que quedó pendiente del registro:
//  · Si al registrarse no se pudieron guardar sus datos básicos: lo dice claro (la cuenta está creada, los datos NO) y deja reintentarlo sin volver a escribirlos.
//  · Si su cuestionario de salud tiene una señal de alarma y su entrenador aún no lo ha revisado: el cuestionario de programación queda EN ESPERA (aquí no sale
//    el aviso, ni se abre solo) con un texto tranquilo. Si no, el aviso de siempre del cuestionario pendiente (lib/retencionParq).
export function AvisosDelRegistro({ clientId, onAbrirCuestionario, onPendientes }: { clientId: string; onAbrirCuestionario: () => void; onPendientes: (cuantos: number) => void }) {
  const [parq, setParq] = useState<EstadoParq | null>(null)
  const [pendientes, setPendientes] = useState<ValoresBasicos | null>(() => { const a = almacen(); return a ? leerPendientes(a, clientId) : null })
  const [reintentando, setReintentando] = useState(false)

  useEffect(() => {
    if (isDemoClientId(clientId)) { setParq(estadoParq([])); return }
    let vivo = true
    supabase.from('checkins').select('*').eq('clientId', clientId).in('tipo', ['intake', 'parq_revisado'])
      .then(({ data }) => { if (vivo) setParq(estadoParq((data ?? []) as FilaAdmision[])) })
    return () => { vivo = false }
  }, [clientId])

  const reintentar = async () => {
    if (!pendientes) return
    setReintentando(true)
    const ok = await guardarDatosBasicos(pendientes)
    setReintentando(false)
    if (!ok) { toast('Todavía no se han podido guardar. Inténtalo de nuevo en un rato.', 'warn'); return }
    const a = almacen(); if (a) borrarPendientes(a, clientId)
    setPendientes(null)
    toast('Datos guardados', 'ok')
  }

  return (
    <>
      {pendientes && (
        <div className="px-4 pt-4">
          <div role="status" className="flex items-start gap-3 bg-card border border-warn/40 rounded-2xl px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-warn flex-shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Tus datos básicos están pendientes de guardar</p>
              <p className="text-xs text-muted mt-0.5">Tu cuenta está creada, pero tu fecha de nacimiento, altura y peso todavía no se han guardado. No tienes que escribirlos otra vez.</p>
              <button type="button" onClick={() => void reintentar()} disabled={reintentando}
                className="mt-2 px-3 py-1.5 rounded-xl bg-ink text-white text-xs font-bold disabled:opacity-50">{reintentando ? 'Guardando…' : 'Reintentar'}</button>
            </div>
          </div>
        </div>
      )}
      {parq?.retenido && (
        <div className="px-4 pt-4">
          <div role="status" className="flex items-start gap-3 bg-card border border-border rounded-2xl px-4 py-3">
            <ShieldCheck className="w-5 h-5 text-muted flex-shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Tu entrenador está revisando tus respuestas de salud</p>
              <p className="text-xs text-muted mt-0.5">En cuanto las vea podrás continuar con tu cuestionario. No tienes que hacer nada más.</p>
            </div>
          </div>
        </div>
      )}
      {parq && !parq.retenido && (
        <Suspense fallback={null}><CuestionarioAviso clientId={clientId} onAbrir={onAbrirCuestionario} onPendientes={onPendientes} /></Suspense>
      )}
    </>
  )
}
