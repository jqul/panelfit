import { useCallback, useMemo, useState } from 'react'
import { computeProgress, loadSent, markSent, isHidden, setHidden, shouldShowChecklist, type OnboardingClient } from '../lib/onboardingProgress'

/**
 * Estado del onboarding del entrenador: el progreso sale de los clientes reales; en este dispositivo solo se
 * recuerda a quién se envió el enlace y si se ocultó la tarjeta. `enabled=false` (demostración) lo apaga.
 */
export function useOnboarding(uid: string, clients: OnboardingClient[], enabled: boolean) {
  const [sent, setSent] = useState(() => loadSent(window.localStorage, uid))
  const [hidden, setHiddenState] = useState(() => isHidden(window.localStorage, uid))
  const [forced, setForced] = useState(false) // reabierta a mano: se enseña aunque ya esté completa

  const progress = useMemo(() => computeProgress(clients, sent), [clients, sent])
  const visible = enabled && shouldShowChecklist(progress, hidden, forced)

  const noteSent = useCallback((clientId: string) => setSent(markSent(window.localStorage, uid, clientId)), [uid])
  const hide = useCallback(() => { setHidden(window.localStorage, uid, true); setHiddenState(true); setForced(false) }, [uid])
  const show = useCallback(() => { setHidden(window.localStorage, uid, false); setHiddenState(false); setForced(true) }, [uid])

  return { progress, visible, noteSent, hide, show }
}
