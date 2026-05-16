import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { UserProfile } from '../../types'
import { toast } from '../shared/Toast'
import { ChevronRight, Check, Dumbbell, Users, Link, Palette } from 'lucide-react'

interface Props {
  userProfile: UserProfile
  onComplete: () => void
}

const ESPECIALIDADES = [
  { id: 'entrenador', emoji: '💪', label: 'Entrenador personal' },
  { id: 'nutricion', emoji: '🥗', label: 'Nutricionista' },
  { id: 'entrenador_nutricion', emoji: '⚡', label: 'Entrenador + Nutricionista' },
  { id: 'crossfit', emoji: '🏋️', label: 'CrossFit / Funcional' },
  { id: 'yoga', emoji: '🧘', label: 'Yoga / Pilates' },
  { id: 'fisio', emoji: '🩺', label: 'Fisioterapeuta' },
  { id: 'running', emoji: '🏃', label: 'Running / Resistencia' },
  { id: 'otro', emoji: '🎯', label: 'Otro' },
]

const COLORES = [
  { label: 'Verde bosque', color: '#1a6038' },
  { label: 'Azul marino', color: '#1e3a5f' },
  { label: 'Rojo potencia', color: '#c0392b' },
  { label: 'Naranja energía', color: '#e67e22' },
  { label: 'Morado', color: '#6c3483' },
  { label: 'Negro élite', color: '#1a1a1a' },
  { label: 'Azul cielo', color: '#2980b9' },
  { label: 'Rosa fuerte', color: '#c0516a' },
]

const STEPS = [
  { id: 1, label: 'Bienvenida', icon: '👋' },
  { id: 2, label: 'Tu perfil', icon: '🎯' },
  { id: 3, label: 'Tu marca', icon: '🎨' },
  { id: 4, label: 'Primer cliente', icon: '👤' },
]

export function OnboardingWizard({ userProfile, onComplete }: Props) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Paso 2
  const [nombre, setNombre] = useState(userProfile.displayName || '')
  const [especialidad, setEspecialidad] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  // Paso 3
  const [brandName, setBrandName] = useState(userProfile.displayName || '')
  const [brandColor, setBrandColor] = useState('#1a6038')
  const [brandColorCustom, setBrandColorCustom] = useState(false)

  // Paso 4
  const [clientName, setClientName] = useState('')
  const [clientSurname, setClientSurname] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientCreated, setClientCreated] = useState<{ token: string; name: string } | null>(null)

  const saveProfile = async () => {
    const profile = { brandName, brandColor, especialidad, phone: whatsapp }
    await supabase.from('entrenadores')
      .update({ displayName: nombre, profile })
      .eq('uid', userProfile.uid)
    localStorage.setItem(`pf_trainer_profile_${userProfile.uid}`, JSON.stringify(profile))
  }

  const createClient = async () => {
    if (!clientName.trim()) return
    setSaving(true)
    const token = crypto.randomUUID().replace(/-/g, '')
    const { error } = await supabase.from('clientes').insert({
      trainerId: userProfile.uid,
      name: clientName.trim(),
      surname: clientSurname.trim(),
      phone: clientPhone.trim(),
      token,
      createdAt: Date.now(),
      weight: 0, fatPercentage: 0, muscleMass: 0, totalLifted: 0,
      planDescription: '',
    })
    if (!error) {
      setClientCreated({ token, name: clientName.trim() })
      toast('Cliente creado ✓', 'ok')
    } else {
      toast('Error al crear cliente', 'warn')
    }
    setSaving(false)
  }

  const handleComplete = async () => {
    setSaving(true)
    await saveProfile()
    localStorage.setItem(`pf_onboarding_done_${userProfile.uid}`, '1')
    onComplete()
    setSaving(false)
  }

  const next = async () => {
    if (step === 3) await saveProfile()
    setStep(s => s + 1)
  }

  const origin = window.location.origin

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">

      {/* Progress bar */}
      <div className="h-1 bg-bg-alt flex-shrink-0">
        <div className="h-full bg-accent transition-all duration-500"
          style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2 pt-5 pb-3 flex-shrink-0">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step > s.id ? 'bg-ok text-white' :
              step === s.id ? 'bg-accent text-white' :
              'bg-bg-alt text-muted'
            }`}>
              {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.icon}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 rounded-full ${step > s.id ? 'bg-ok' : 'bg-bg-alt'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">

          {/* ── PASO 1: Bienvenida ── */}
          {step === 1 && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="text-6xl">👋</div>
              <div>
                <h1 className="text-3xl font-serif font-bold">
                  Bienvenido a Panel<span className="text-accent italic">Fit</span>
                </h1>
                <p className="text-muted mt-2 leading-relaxed">
                  En menos de 2 minutos tendrás tu panel configurado y tu primer cliente listo para entrenar.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  { icon: <Dumbbell className="w-4 h-4 text-accent" />, text: 'Crea planes de entrenamiento' },
                  { icon: <Users className="w-4 h-4 text-accent" />, text: 'Gestiona tus clientes' },
                  { icon: <Link className="w-4 h-4 text-accent" />, text: 'Manda el link por WhatsApp' },
                  { icon: <Palette className="w-4 h-4 text-accent" />, text: 'Tu marca personalizada' },
                ].map((item, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2">
                    {item.icon}
                    <p className="text-xs font-medium">{item.text}</p>
                  </div>
                ))}
              </div>

              <button onClick={() => setStep(2)}
                className="w-full py-4 bg-ink text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:opacity-90">
                Empezar <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* ── PASO 2: Tu perfil ── */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-xs text-accent font-bold uppercase tracking-wider">Paso 1 de 3</p>
                <h2 className="text-2xl font-serif font-bold mt-1">Cuéntanos sobre ti</h2>
                <p className="text-muted text-sm mt-1">Así personalizamos tu experiencia</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    ¿Cómo te llamas?
                  </label>
                  <input
                    autoFocus
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    ¿Cuál es tu especialidad?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ESPECIALIDADES.map(e => (
                      <button key={e.id} onClick={() => setEspecialidad(e.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all ${
                          especialidad === e.id
                            ? 'bg-ink text-white border-ink'
                            : 'border-border text-ink hover:border-accent'
                        }`}>
                        <span>{e.emoji}</span>
                        <span className="text-xs">{e.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Tu WhatsApp <span className="text-muted font-normal normal-case">(para enviar mensajes a clientes)</span>
                  </label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    placeholder="+34 600 000 000"
                    className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              <button
                onClick={next}
                disabled={!nombre.trim() || !especialidad}
                className="w-full py-4 bg-ink text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40">
                Siguiente <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* ── PASO 3: Tu marca ── */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-xs text-accent font-bold uppercase tracking-wider">Paso 2 de 3</p>
                <h2 className="text-2xl font-serif font-bold mt-1">Personaliza tu marca</h2>
                <p className="text-muted text-sm mt-1">Así verán tu panel tus clientes</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Nombre de tu negocio
                  </label>
                  <input
                    value={brandName}
                    onChange={e => setBrandName(e.target.value)}
                    placeholder="Ej: AlexFit Training"
                    className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                    Color principal
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {COLORES.map(c => (
                      <button key={c.color} onClick={() => { setBrandColor(c.color); setBrandColorCustom(false) }}
                        title={c.label}
                        className={`h-10 rounded-xl border-2 transition-all ${
                          brandColor === c.color && !brandColorCustom
                            ? 'border-ink scale-95 shadow-lg'
                            : 'border-transparent hover:border-ink/30'
                        }`}
                        style={{ backgroundColor: c.color }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={e => { setBrandColor(e.target.value); setBrandColorCustom(true) }}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                    />
                    <span className="text-xs text-muted">Color personalizado</span>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-2xl overflow-hidden border border-border">
                  <div className="px-4 py-3 text-white text-sm font-bold" style={{ backgroundColor: brandColor }}>
                    {brandName || 'Tu negocio'}
                  </div>
                  <div className="px-4 py-3 bg-card">
                    <p className="text-xs text-muted">Así verán tus clientes la cabecera de su panel 👆</p>
                  </div>
                </div>
              </div>

              <button onClick={next}
                disabled={!brandName.trim()}
                className="w-full py-4 bg-ink text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40">
                Siguiente <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* ── PASO 4: Primer cliente ── */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-xs text-accent font-bold uppercase tracking-wider">Paso 3 de 3</p>
                <h2 className="text-2xl font-serif font-bold mt-1">Añade tu primer cliente</h2>
                <p className="text-muted text-sm mt-1">Créale una ficha y mándale el enlace por WhatsApp</p>
              </div>

              {!clientCreated ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Nombre *</label>
                      <input
                        autoFocus
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && clientName.trim() && createClient()}
                        placeholder="Nombre"
                        className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Apellido</label>
                      <input
                        value={clientSurname}
                        onChange={e => setClientSurname(e.target.value)}
                        placeholder="Apellido"
                        className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                      📱 WhatsApp del cliente
                    </label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      placeholder="+34 600 000 000"
                      className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={createClient}
                      disabled={!clientName.trim() || saving}
                      className="flex-1 py-3 bg-ink text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40">
                      {saving ? 'Creando...' : '+ Crear cliente'}
                    </button>
                    <button onClick={handleComplete}
                      className="px-4 py-3 border border-border rounded-xl text-sm text-muted hover:bg-bg-alt">
                      Saltar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cliente creado — mostrar enlace */}
                  <div className="bg-ok/5 border border-ok/20 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-ok/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-ok" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{clientCreated.name} creado ✓</p>
                      <p className="text-xs text-muted">Ya tiene su panel listo</p>
                    </div>
                  </div>

                  {/* Enlace del cliente */}
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                    <p className="text-sm font-semibold">Enlace del panel de {clientCreated.name}</p>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={`${origin}?c=${clientCreated.token}`}
                        className="flex-1 px-3 py-2 bg-bg border border-border rounded-xl text-xs text-muted outline-none"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${origin}?c=${clientCreated.token}`)
                          toast('Enlace copiado ✓', 'ok')
                        }}
                        className="px-3 py-2 border border-border rounded-xl text-xs font-semibold hover:border-accent transition-colors">
                        Copiar
                      </button>
                    </div>
                    {clientPhone && (
                      <button
                        onClick={() => {
                          const url = `${origin}?c=${clientCreated.token}`
                          const phone = clientPhone.replace(/\s+/g, '').replace(/^\+/, '')
                          const msg = encodeURIComponent(`Hola ${clientCreated.name} 👋\n\nTe comparto el enlace a tu panel de entrenamiento personalizado:\n\n${url}\n\n¡Ábrelo desde el móvil y ya tienes todo listo! 💪`)
                          window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:opacity-90">
                        📱 Enviar por WhatsApp
                      </button>
                    )}
                  </div>

                  <button onClick={handleComplete}
                    className="w-full py-4 bg-ink text-white rounded-2xl font-bold text-base hover:opacity-90">
                    Ir a mi panel →
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
