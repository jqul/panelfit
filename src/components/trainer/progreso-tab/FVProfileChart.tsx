import { useMemo, useState } from 'react'
import { ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, Trash2, Gauge, Video, Info } from 'lucide-react'
import { ClientData } from '../../../types'
import { useFVProfileTrials } from '../../../lib/fvProfileTrials'
import { fitForceVelocityProfile, relativePower } from '../../../lib/forceVelocity'
import { EmptyState } from './helpers'
import { JumpVideoAnalyzer } from './JumpVideoAnalyzer'
import { toast } from '../../shared/Toast'

function FVTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold">{p.force} N · {p.velocity} m/s</p>
      {p.loadKg !== undefined && <p className="text-muted">Carga: {p.loadKg}kg</p>}
    </div>
  )
}

export function FVProfileChart({ client, trainerId }: { client: ClientData; trainerId: string }) {
  const { trials, loading, addTrial, deleteTrial } = useFVProfileTrials(client.id)
  const [showForm, setShowForm] = useState(false)
  const [showVideoAnalyzer, setShowVideoAnalyzer] = useState(false)
  const [loadKg, setLoadKg] = useState('0')
  const [bodyweightKg, setBodyweightKg] = useState('')
  const [pushoffCm, setPushoffCm] = useState('40')
  const [heightCm, setHeightCm] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  const byDate = useMemo(() => {
    const map = new Map<string, typeof trials>()
    trials.forEach(t => { const arr = map.get(t.date) || []; arr.push(t); map.set(t.date, arr) })
    return map
  }, [trials])
  const dates = useMemo(() => [...byDate.keys()].sort(), [byDate])
  const latestDate = dates[dates.length - 1]
  const currentTrials = latestDate ? byDate.get(latestDate)! : []

  const currentPoints = useMemo(() => currentTrials.map(t => ({
    loadKg: t.load_kg,
    ...(() => {
      const v = Math.sqrt(9.81 * t.jump_height_m / 2)
      const f = (t.bodyweight_kg + t.load_kg) * 9.81 * (t.jump_height_m / t.pushoff_distance_m + 1)
      return { velocity: Math.round(v * 100) / 100, force: Math.round(f * 10) / 10 }
    })(),
  })), [currentTrials])

  const currentProfile = useMemo(() => fitForceVelocityProfile(currentTrials.map(t => ({
    loadKg: t.load_kg, totalMassKg: t.bodyweight_kg + t.load_kg, jumpHeightM: t.jump_height_m, pushoffDistanceM: t.pushoff_distance_m,
  }))), [currentTrials])

  const avgBW = currentTrials.length ? currentTrials.reduce((a, t) => a + t.bodyweight_kg, 0) / currentTrials.length : client.weight
  const pmaxPerKg = relativePower(currentProfile.Pmax, avgBW)

  // Evolución de la potencia relativa entre sesiones de test (si hay más de una)
  const sessionTrend = useMemo(() => dates.map(d => {
    const ts = byDate.get(d)!
    const profile = fitForceVelocityProfile(ts.map(t => ({ loadKg: t.load_kg, totalMassKg: t.bodyweight_kg + t.load_kg, jumpHeightM: t.jump_height_m, pushoffDistanceM: t.pushoff_distance_m })))
    const bw = ts.reduce((a, t) => a + t.bodyweight_kg, 0) / ts.length
    return { date: d, pmaxKg: relativePower(profile.Pmax, bw) }
  }).filter(s => s.pmaxKg !== null), [dates, byDate])

  const startAdding = () => {
    setShowForm(true); setShowVideoAnalyzer(false)
    setLoadKg('0')
    setBodyweightKg(String(client.weight || trials[0]?.bodyweight_kg || ''))
    setPushoffCm(trials[0] ? String(Math.round(trials[0].pushoff_distance_m * 100)) : '40')
    setHeightCm(''); setDate(new Date().toISOString().slice(0, 10)); setNotes('')
  }

  const confirmAdd = async () => {
    const load = parseFloat(loadKg) || 0
    const bw = parseFloat(bodyweightKg) || 0
    const pushoff = parseFloat(pushoffCm) || 0
    const height = parseFloat(heightCm) || 0
    if (bw <= 0 || pushoff <= 0 || height <= 0) { toast('Faltan datos: peso corporal, distancia de empuje y altura de salto', 'warn'); return }
    await addTrial(trainerId, {
      date, load_kg: load, bodyweight_kg: bw,
      pushoff_distance_m: pushoff / 100, jump_height_m: height / 100,
      notes: notes.trim() || null,
    })
    setShowForm(false)
    toast('Salto guardado ✓', 'ok')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const vMax = currentProfile.V0 ? currentProfile.V0 * 1.1 : Math.max(2, ...currentPoints.map(p => p.velocity)) * 1.3
  const fMax = currentProfile.F0 ? currentProfile.F0 * 1.1 : Math.max(100, ...currentPoints.map(p => p.force)) * 1.2
  const linePoints = currentProfile.F0 !== null && currentProfile.V0 !== null
    ? [{ velocity: 0, force: currentProfile.F0 }, { velocity: currentProfile.V0, force: 0 }]
    : []

  return (
    <div className="space-y-4">
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted leading-relaxed">
          Método simplificado de Samozino/Morin: salta con varias cargas distintas (peso corporal, +20kg, +40kg...) el mismo día,
          midiendo siempre la misma distancia de empuje. Con 2+ cargas se calcula la fuerza máxima teórica (F0), la velocidad
          máxima teórica (V0) y la potencia máxima (Pmax) — sin plataforma de fuerza.
        </p>
      </div>

      {currentTrials.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-2xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Perfil actual ({new Date(latestDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})</p>
            {currentProfile.F0 !== null ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted">F0 (fuerza máx.)</span><span className="font-bold">{currentProfile.F0} N</span></div>
                <div className="flex justify-between"><span className="text-muted">V0 (velocidad máx.)</span><span className="font-bold">{currentProfile.V0} m/s</span></div>
                <div className="flex justify-between"><span className="text-muted">Pmax</span><span className="font-bold">{currentProfile.Pmax} W</span></div>
                <div className="flex justify-between"><span className="text-muted">Pmax relativa</span><span className="font-bold text-accent">{pmaxPerKg} W/kg</span></div>
              </div>
            ) : (
              <p className="text-xs text-muted">Necesita al menos 2 cargas distintas el mismo día para ajustar el perfil ({currentTrials.length} de momento).</p>
            )}
          </div>
          <div className="bg-card border border-border rounded-2xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1"><Gauge className="w-3 h-3" /> Saltos de esta sesión</p>
            <div className="space-y-1 text-xs">
              {currentTrials.map(t => (
                <div key={t.id} className="flex justify-between">
                  <span className="text-muted">{t.load_kg}kg carga</span>
                  <span className="font-bold">{Math.round(t.jump_height_m * 100)} cm</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentPoints.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 bg-bg-alt/30">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Perfil Fuerza-Velocidad</p>
          </div>
          <div className="h-56 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
                <XAxis dataKey="velocity" type="number" domain={[0, Math.ceil(vMax)]} tick={{ fontSize: 9, fill: '#8a8278' }}
                  label={{ value: 'Velocidad (m/s)', position: 'insideBottom', offset: -2, fontSize: 9, fill: '#8a8278' }} />
                <YAxis dataKey="force" type="number" domain={[0, Math.ceil(fMax / 100) * 100]} tick={{ fontSize: 9, fill: '#8a8278' }} />
                <Tooltip content={<FVTooltip />} />
                {linePoints.length > 0 && <Line data={linePoints} dataKey="force" stroke="#6e5438" strokeWidth={2} dot={false} isAnimationActive={false} />}
                <Scatter data={currentPoints} dataKey="force" fill="#e07b54" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {sessionTrend.length >= 2 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 bg-bg-alt/30">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Evolución de Pmax relativa (W/kg)</p>
          </div>
          <div className="h-32 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sessionTrend.map(s => ({ ...s, fecha: new Date(s.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) }))} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
                <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#8a8278' }} />
                <YAxis tick={{ fontSize: 9, fill: '#8a8278' }} />
                <Tooltip formatter={(v: number) => [`${v} W/kg`, 'Pmax relativa']} />
                <Line type="monotone" dataKey="pmaxKg" stroke="#6e5438" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {trials.length === 0 && (
        <EmptyState icon={<Gauge className="w-8 h-8 opacity-30" />} text="Sin saltos registrados"
          sub="Registra al menos 2 saltos con cargas distintas para calcular el perfil" />
      )}

      {showForm ? (
        <div className="bg-bg rounded-xl p-3 space-y-2">
          {showVideoAnalyzer ? (
            <JumpVideoAnalyzer clientId={client.id} mode="jump" onClose={() => setShowVideoAnalyzer(false)}
              onComputed={(value, note) => { setHeightCm(String(value)); setNotes(note); setShowVideoAnalyzer(false) }} />
          ) : (
            <button onClick={() => setShowVideoAnalyzer(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-accent/40 text-accent rounded-lg text-xs font-semibold hover:bg-accent/5 transition-colors">
              <Video className="w-3.5 h-3.5" /> Calcular altura desde vídeo
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[9px] text-muted uppercase tracking-wider">Carga externa (kg)</span>
              <input type="number" step="0.5" value={loadKg} onChange={e => setLoadKg(e.target.value)}
                className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-border rounded-lg text-xs outline-none" />
            </label>
            <label className="block">
              <span className="text-[9px] text-muted uppercase tracking-wider">Altura de salto (cm)</span>
              <input type="number" step="0.1" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="ej. 32"
                className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-border rounded-lg text-xs outline-none" />
            </label>
            <label className="block">
              <span className="text-[9px] text-muted uppercase tracking-wider">Peso corporal hoy (kg)</span>
              <input type="number" step="0.1" value={bodyweightKg} onChange={e => setBodyweightKg(e.target.value)}
                className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-border rounded-lg text-xs outline-none" />
            </label>
            <label className="block">
              <span className="text-[9px] text-muted uppercase tracking-wider" title="Distancia que las piernas se extienden durante el salto — mide desde la posición más baja de la sentadilla hasta la extensión completa">Distancia de empuje (cm)</span>
              <input type="number" step="0.5" value={pushoffCm} onChange={e => setPushoffCm(e.target.value)}
                className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-border rounded-lg text-xs outline-none" />
            </label>
          </div>
          <p className="text-[9px] text-muted -mt-1">Distancia de empuje: mide con cinta métrica desde la sentadilla más baja del salto hasta la extensión completa. Usa la misma en todas las cargas del día.</p>
          <div className="flex gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="flex-1 px-2.5 py-1.5 bg-white border border-border rounded-lg text-xs outline-none" />
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas (opcional)"
              className="flex-1 px-2.5 py-1.5 bg-white border border-border rounded-lg text-xs outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-1.5 border border-border rounded-lg text-xs text-muted">Cancelar</button>
            <button onClick={confirmAdd} className="flex-1 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold">Guardar salto</button>
          </div>
        </div>
      ) : (
        <button onClick={startAdding}
          className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-border rounded-xl text-xs text-muted hover:border-accent hover:text-accent">
          <Plus className="w-3.5 h-3.5" /> Registrar salto
        </button>
      )}

      {trials.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Historial</p>
          {trials.map(t => (
            <div key={t.id} className="flex items-center gap-2 text-xs text-muted">
              <span className="flex-1">{new Date(t.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span className="font-semibold text-ink">{t.load_kg}kg · {Math.round(t.jump_height_m * 100)}cm</span>
              {t.notes && <span className="italic truncate max-w-[120px]">{t.notes}</span>}
              <button onClick={() => deleteTrial(t.id)} className="text-muted hover:text-warn flex-shrink-0"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
