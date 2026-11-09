import { useState, useEffect } from 'react'
import { X, HeartPulse } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useClientPain, ZONAS_DOLOR } from '../../lib/clientPain'
import { localDateKey } from '../../lib/dates'
import { avisarCambioHoy } from '../../lib/hoyEventos'
import { ESCALAS_BASE, filaCheckin, limpiarConfigCheckin } from '../../lib/checkinConfig'
import { sendPush } from '../../lib/usePushNotifications'
import { escalasBajas } from '../../lib/preferenciasAvisos'

// Las preguntas las elige el entrenador (Ajustes → Check-in diario, lib/checkinConfig): de las cuatro escalas de
// siempre, las que quiera, y hasta tres propias. Lo que no se pregunta se guarda vacío.
export function ReadinessCheckin({ clientId, trainerId, configRaw, clientName }: { clientId: string; trainerId?: string; configRaw?: unknown; clientName?: string }) {
  const config = limpiarConfigCheckin(configRaw)
  const METRICS = [
    ...config.escalas.map(k => ({ key: k as string, label: ESCALAS_BASE[k].label, emoji: ESCALAS_BASE[k].emoji, lowLabel: ESCALAS_BASE[k].bajo, highLabel: ESCALAS_BASE[k].alto })),
    ...config.extra.map(e => ({ key: e.id, label: e.label, emoji: e.emoji, lowLabel: e.bajo, highLabel: e.alto })),
  ]
  const [loading, setLoading] = useState(true)
  const [doneToday, setDoneToday] = useState(false)
  const [values, setValues] = useState<Record<string, number>>({})
  const valor = (k: string) => values[k] ?? 3
  const [saving, setSaving] = useState(false)
  const [showSuggestion, setShowSuggestion] = useState(false)
  // Clasificador rápido de dolor: cuando "Agujetas" sale bajo (mucho dolor),
  // no asumimos que es fatiga normal de entrenar — preguntamos en 1 toque si
  // es una molestia articular/tendinosa, y si lo es, en qué zona, para que
  // quede un registro real (registros_dolor) y no se pierda en un simple
  // número del check-in.
  const [painStep, setPainStep] = useState<'none' | 'classify' | 'zone' | 'thanks'>('none')
  const { addEntry } = useClientPain(clientId, trainerId)
  const today = localDateKey()

  useEffect(() => {
    if (clientId.startsWith('demo-client-')) { setLoading(false); return }
    supabase.from('readiness_checkins').select('id').eq('clientId', clientId).eq('date', today).maybeSingle()
      .then(({ data }) => { setDoneToday(!!data); setLoading(false) })
  }, [clientId, today])

  useEffect(() => { if (!loading) avisarCambioHoy(clientId, { checkinHecho: doneToday }) }, [clientId, loading, doneToday])

  // Las sugerencias de después solo salen si se ha preguntado esa escala
  const energiaBaja = config.escalas.includes('motivation') && valor('motivation') <= 2
  const dolorAlto = config.escalas.includes('soreness') && valor('soreness') <= 2

  const submit = async () => {
    if (clientId.startsWith('demo-client-')) {
      setDoneToday(true)
      if (energiaBaja) setShowSuggestion(true)
      if (dolorAlto) setPainStep('classify')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('readiness_checkins').upsert({
      clientId, date: today, ...filaCheckin(config, values),
    }, { onConflict: 'clientId,date' })
    setSaving(false)
    if (!error) {
      setDoneToday(true)
      // Aviso al entrenador si alguna escala sale baja (1 o 2): lo puede apagar en Ajustes → Notificaciones
      const bajas = escalasBajas(METRICS.map(m => ({ label: m.label, valor: valor(m.key) })))
      if (trainerId && bajas.length) sendPush({ trainerId }, '📉 Check-in bajo', `${clientName || 'Tu cliente'}: ${bajas.join(' · ')}`, { tipo: 'checkin_bajo' })
      // Autorregulación: si la energía de hoy es baja, sugiere aliviar la sesión
      if (energiaBaja) setShowSuggestion(true)
      // Mucho dolor marcado en "Agujetas" — puede ser solo fatiga de una buena
      // sesión, o puede ser algo articular. Preguntamos, no asumimos.
      if (dolorAlto) setPainStep('classify')
    }
  }

  const chooseDoms = () => setPainStep('thanks')
  const chooseArticular = () => setPainStep('zone')
  const chooseZona = async (zona: string) => {
    // Deriva una intensidad razonable del propio slider (1=mucho dolor -> ~10,
    // 2=dolor notable -> ~8) en vez de pedir un segundo número — el cliente ya
    // nos dijo cuánto le duele, esto es solo clasificarlo.
    const intensidad = Math.round((5 - valor('soreness')) * 2.5)
    await addEntry(zona, intensidad, undefined, undefined, 'articular')
    setPainStep('thanks')
  }

  if (loading) return null

  if (doneToday) {
    if (painStep === 'classify') {
      return (
        <div className="px-4 pt-4">
          <div className="bg-warn/5 border border-warn/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-warn flex-shrink-0" />
              <p className="text-sm font-semibold">Has marcado bastante dolor hoy — ¿de qué tipo?</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={chooseDoms}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border text-left text-sm hover:border-accent transition-colors">
                <span className="text-base">⚡</span>
                <span><span className="font-semibold">Agujetas normales</span> <span className="text-muted">— fatiga de una buena sesión</span></span>
              </button>
              <button onClick={chooseArticular}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-warn/30 bg-warn/5 text-left text-sm hover:border-warn transition-colors">
                <span className="text-base">⚠️</span>
                <span><span className="font-semibold">Molestia articular o tendinosa</span> <span className="text-muted">— posible lesión</span></span>
              </button>
            </div>
          </div>
        </div>
      )
    }
    if (painStep === 'zone') {
      return (
        <div className="px-4 pt-4">
          <div className="bg-warn/5 border border-warn/20 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold">¿En qué zona?</p>
            <div className="flex flex-wrap gap-2">
              {ZONAS_DOLOR.filter(z => z !== 'Otro').map(z => (
                <button key={z} onClick={() => chooseZona(z)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:border-warn hover:bg-warn/5 transition-colors">
                  {z}
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }
    if (painStep === 'thanks') {
      return (
        <div className="px-4 pt-4">
          <div className="bg-ok/5 border border-ok/20 rounded-2xl px-4 py-3 flex items-center gap-2.5">
            <span className="text-lg flex-shrink-0">✓</span>
            <p className="text-sm flex-1">Registrado — tu entrenador lo verá.</p>
            <button onClick={() => setPainStep('none')} aria-label="Cerrar" className="p-0.5 text-muted hover:text-ink flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )
    }
    if (!showSuggestion) return null
    return (
      <div className="px-4 pt-4">
        <div className="bg-warn/10 border border-warn/20 rounded-2xl px-4 py-3 flex items-start gap-2.5">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Hoy tu energía es baja</p>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">Te sugerimos bajar 1 serie o usar RIR +1 en los ejercicios principales de hoy.</p>
          </div>
          <button onClick={() => setShowSuggestion(false)} aria-label="Cerrar" className="p-0.5 text-muted hover:text-ink flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4">
      <div className="bg-card border border-accent/20 rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-accent/5">
          <p className="text-sm font-semibold">¿Cómo te encuentras hoy?</p>
          <p className="text-xs text-muted mt-0.5">10 segundos — ayuda a ajustar tu entreno</p>
        </div>
        <div className="p-4 space-y-4">
          {METRICS.map(m => (
            <div key={m.key} role="group" aria-label={m.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
                  <span className="text-base leading-none">{m.emoji}</span>{m.label}
                </span>
                <span className="text-xs font-bold text-accent">{valor(m.key)}/5</span>
              </div>
              <input type="range" min={1} max={5} step={1} value={valor(m.key)} aria-label={`${m.label}, de 1 a 5`}
                onChange={e => setValues(s => ({ ...s, [m.key]: parseInt(e.target.value) }))}
                className="w-full accent-accent h-2 cursor-pointer" />
              <div className="flex justify-between text-[11px] text-muted mt-0.5">
                <span>{m.lowLabel}</span><span>{m.highLabel}</span>
              </div>
            </div>
          ))}
          <button onClick={submit} disabled={saving}
            className="w-full py-3 bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-50">
            {saving ? 'Guardando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
