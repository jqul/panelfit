import { supabase } from './supabase'

// Aviso de fin de descanso con el móvil bloqueado (función de Edge fin-descanso + tabla descansos). Al empezar o
// cambiar un descanso se marca un token nuevo y se pide el aviso; al saltarlo, pausarlo o salir, se borra y el aviso
// ya no sale. Solo funciona con cuenta de cliente y los avisos activados en este dispositivo; si no, no hace nada.
// Mientras tanto, si la app pasa a segundo plano, una notificación fija dice qué toca y a qué hora se vuelve.

export const TAG_DESCANSO = 'pf-descanso'

let actual: string | null = null

const nuevoToken = () => {
  const a = new Uint8Array(12)
  crypto.getRandomValues(a)
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('')
}

async function puedeAvisar(): Promise<boolean> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

/** Pide el aviso para dentro de `segundos` (sustituye al que hubiera). */
export async function programarAvisoDescanso(segundos: number, cuerpo: string): Promise<void> {
  try {
    if (segundos < 3 || !(await puedeAvisar())) return
    const token = nuevoToken()
    actual = token
    const { error } = await supabase.rpc('marcar_descanso', { p_token: token, p_segundos: Math.min(900, Math.round(segundos)) })
    if (error || actual !== token) return
    await supabase.functions.invoke('fin-descanso', { body: { token, cuerpo } })
  } catch { /* sin aviso: el temporizador de la app sigue funcionando */ }
}

/** Anula el aviso pendiente (descanso saltado, pausado o terminado con la app delante). */
export async function cancelarAvisoDescanso(): Promise<void> {
  if (!actual) return
  actual = null
  try { await supabase.rpc('marcar_descanso', { p_token: null }) } catch { /* sin conexión: como mucho llega un aviso de más */ }
}

/** Notificación fija mientras descansa con la app en segundo plano ("vuelve a las 18:42:30"). */
export async function mostrarDescansoEnCurso(finMs: number, cuerpo: string): Promise<void> {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.ready
    const hora = new Date(finMs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    await reg.showNotification('⏸️ Descansando', { body: `${cuerpo ? cuerpo + ' · ' : ''}vuelve a las ${hora}`, tag: TAG_DESCANSO, silent: true, icon: '/icon-192x192.png', badge: '/icon-96x96.png', data: { url: '/' } })
  } catch { /* sin notificación */ }
}

/** Quita la notificación del descanso (al volver a la app o al terminarlo). */
export async function quitarNotificacionDescanso(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.ready
    ;(await reg.getNotifications({ tag: TAG_DESCANSO })).forEach(n => n.close())
  } catch { /* nada que quitar */ }
}

/** Texto de la siguiente serie para el aviso: "Press banca · serie 3 de 4 · 82,5 kg × 5". */
export function textoSiguiente(n: { exerciseName: string; setNum: number; totalSets: number; weight?: string; reps?: string } | null): string {
  if (!n) return ''
  const peso = n.weight ? `${String(n.weight).replace('.', ',')} kg × ${n.reps}` : n.reps ? `${n.reps} reps` : ''
  return [n.exerciseName, `serie ${n.setNum} de ${n.totalSets}`, peso].filter(Boolean).join(' · ')
}
