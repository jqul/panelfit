import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { CONSENT_VERSION } from './privacyTexts'

export interface ConsentRow { version: string; salud: boolean; fotos: boolean; accepted_at: string }
export type ConsentStatus = 'loading' | 'ok' | 'needed' | 'withdrawn'

// El historial de consentimientos es de solo añadir: la última fila manda.
// - sin filas, o de una versión anterior de los textos → hay que pedirlo
// - salud retirada → no se puede seguir guardando datos de salud
export function evaluateConsent(latest: ConsentRow | null): { status: Exclude<ConsentStatus, 'loading'>; fotos: boolean } {
  if (!latest) return { status: 'needed', fotos: false }
  if (!latest.salud) return { status: 'withdrawn', fotos: false }
  if (latest.version !== CONSENT_VERSION) return { status: 'needed', fotos: false }
  return { status: 'ok', fotos: latest.fotos }
}

export async function recordConsent(clientId: string, salud: boolean, fotos: boolean): Promise<boolean> {
  const { error } = await supabase.from('consentimientos').insert({ clientId, version: CONSENT_VERSION, salud, fotos: salud && fotos })
  return !error
}

// Estado del consentimiento del cliente. Los clientes de demostración y los que
// aún no han iniciado sesión no consultan nada. Si la consulta falla (sin red,
// tabla no disponible) NO se bloquea al cliente: el consentimiento se pide en el
// siguiente acceso, y no se corta un entreno por un fallo de conexión.
export function useConsent(clientId: string | undefined, enabled: boolean) {
  const isDemo = !!clientId && clientId.startsWith('demo-client-')
  const [state, setState] = useState<{ status: ConsentStatus; fotos: boolean }>({ status: 'loading', fotos: false })

  const load = useCallback(async () => {
    if (!clientId || !enabled) return
    if (isDemo) { setState({ status: 'ok', fotos: true }); return }
    const { data, error } = await supabase.from('consentimientos')
      .select('version, salud, fotos, accepted_at').eq('clientId', clientId)
      .order('accepted_at', { ascending: false }).limit(1)
    if (error) { setState({ status: 'ok', fotos: false }); return }
    setState(evaluateConsent((data?.[0] as ConsentRow | undefined) ?? null))
  }, [clientId, enabled, isDemo])

  useEffect(() => { load() }, [load])

  const grant = useCallback(async (salud: boolean, fotos: boolean) => {
    if (!clientId) return false
    if (isDemo) { setState({ status: salud ? 'ok' : 'withdrawn', fotos }); return true }
    const ok = await recordConsent(clientId, salud, fotos)
    if (ok) setState(evaluateConsent({ version: CONSENT_VERSION, salud, fotos: salud && fotos, accepted_at: new Date().toISOString() }))
    return ok
  }, [clientId, isDemo])

  return { ...state, grant, reload: load }
}
