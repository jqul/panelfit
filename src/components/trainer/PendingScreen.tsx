import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Check, ChevronRight, LogOut } from 'lucide-react'

interface Props {
  uid: string
  email: string
  displayName: string
  onLogout: () => void
}

const ESPECIALIDADES = [
  { v: 'entrenador',           emoji: '💪', label: 'Entrenador personal' },
  { v: 'nutricion',            emoji: '🥗', label: 'Nutricionista' },
  { v: 'entrenador_nutricion', emoji: '⚡', label: 'Entrenador + Nutricionista' },
  { v: 'crossfit',             emoji: '🏋️', label: 'CrossFit / Funcional' },
  { v: 'yoga',                 emoji: '🧘', label: 'Yoga / Pilates' },
  { v: 'fisio',                emoji: '🩺', label: 'Fisioterapeuta' },
  { v: 'running',              emoji: '🏃', label: 'Running / Resistencia' },
  { v: 'otro',                 emoji: '🎯', label: 'Otro' },
]

const TEMAS = [
  { id: 'bosque',  nombre: 'Bosque',  color: '#1a6038', bg: '#f0f7f4' },
  { id: 'marino',  nombre: 'Marino',  color: '#1e3a5f', bg: '#f0f4f9' },
  { id: 'energia', nombre: 'Energía', color: '#c0392b', bg: '#fdf5f5' },
  { id: 'naranja', nombre: 'Naranja', color: '#e67e22', bg: '#fdf7f0' },
  { id: 'morado',  nombre: 'Púrpura', color: '#6c3483', bg: '#f7f0fd' },
  { id: 'elite',   nombre: 'Élite',   color: '#1a1a1a', bg: '#f5f5f5' },
  { id: 'cielo',   nombre: 'Cielo',   color: '#2980b9', bg: '#f0f6fd' },
  { id: 'rosa',    nombre: 'Rosa',    color: '#c0516a', bg: '#fdf0f3' },
]

export function PendingScreen({ uid, email, displayName, onLogout }: Props) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Paso 2 — Tu trabajo
  const [nombre, setNombre] = useState(displayName || '')
  const [especialidad, setEspecialidad] = useState('')
  const [numClientes, setNumClientes] = useState('')
  const [modalidad, setModalidad] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  // Paso 3 — Tu marca
  const [brandName, setBrandName] = useState('')
  const [brandColor, setBrandColor] = useState('#1a6038')
  const [temaId, setTemaId] = useState('bosque')
  const [brandLogo, setBrandLogo] = useState('')

  const applyTema = (tema: typeof TEMAS[0]) => {
    setTemaId(tema.id)
    setBrandColor(tema.color)
  }

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Máximo 2MB'); return }
    const ext = file.name.split('.').pop()
    const path = `${uid}/logo_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('trainer-assets').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('trainer-assets').getPublicUrl(path)
      setBrandLogo(data.publicUrl)
    }
  }

  const saveAndFinish = async () => {
    setSaving(true)
    const profile = {
      especialidad, numClientes, modalidad, phone: whatsapp,
      brandName: brandName || nombre,
      brandColor, temaId, brandLogo,
      onboardingPendingDone: true,
      updatedAt: Date.now(),
    }
    // Guardar en Supabase y localStorage
    await supabase.from('entrenadores').update({
      displayName: nombre,
      profile,
    }).eq('uid', uid)
    localStorage.setItem(`pf_trainer_profile_${uid}`, JSON.stringify(profile))
    setSaving(false)
    setStep(4)
  }

  // Step 4 — polling para ver si ya fue aprobado
  useEffect(() => {
    if (step !== 4) return
    const interval = setInterval(async () => {
      const { data } = await supabase.from('entrenadores')
        .select('approved').eq('uid', uid).maybeSingle()
      if (data?.approved) window.location.reload()
    }, 10000)
    return () => clearInterval(interval)
  }, [step])

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* Header mínimo */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border bg-card">
        <h1 className="text-lg font-serif font-bold">
          Panel<span className="text-accent italic">Fit</span>
        </h1>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-muted hover:text-ink">
          <LogOut className="w-3.5 h-3.5" /> Salir
        </button>
      </div>

      {/* Progress */}
      <div className="h-1 bg-bg-alt">
        <div className="h-full bg-accent transition-all duration-500"
          style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">

          {/* PASO 1 — Bienvenida */}
          {step === 1 && (
            <div className="text-center space-y-6">
              <div className="text-6xl">🎉</div>
              <div>
                <h2 className="text-3xl font-serif font-bold">¡Cuenta creada!</h2>
                <p className="text-muted mt-2 leading-relaxed">
                  Tu solicitud está siendo revisada. Mientras tanto, configura tu perfil
                  para que todo esté listo cuando te activemos.
                </p>
                <p className="text-xs text-muted mt-3 bg-bg-alt rounded-xl px-4 py-2 inline-block">
                  📧 {email}
                </p>
              </div>
              <button onClick={() => setStep(2)}
                className="w-full py-4 bg-ink text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:opacity-90">
                Configurar mi perfil <ChevronRight className="w-5 h-5" />
              </button>
              <button onClick={onLogout} className="text-xs text-muted hover:text-ink">
                Salir y volver más tarde
              </button>
            </div>
          )}

          {/* PASO 2 — Tu trabajo */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs text-accent font-bold uppercase tracking-wider">Paso 1 de 2</p>
                <h2 className="text-2xl font-serif font-bold mt-1">Cuéntanos sobre ti</h2>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  ¿Cómo te llamas?
                </label>
                <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  ¿Cuál es tu especialidad?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ESPECIALIDADES.map(e => (
                    <button key={e.v} onClick={() => setEspecialidad(e.v)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        especialidad === e.v ? 'bg-ink text-white border-ink' : 'border-border text-ink hover:border-accent'
                      }`}>
                      <span>{e.emoji}</span>
                      <span className="text-xs font-medium">{e.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  ¿Cuántos clientes tienes ahora?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['0', '1-5', '6-15', '+15'].map(n => (
                    <button key={n} onClick={() => setNumClientes(n)}
                      className={`py-2.5 rounded-xl border text-sm font-bold transition-all ${
                        numClientes === n ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  ¿Cómo trabajas con tus clientes?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: 'online', l: '💻 Online' },
                    { v: 'presencial', l: '🏋️ Presencial' },
                    { v: 'hibrido', l: '⚡ Híbrido' },
                  ].map(m => (
                    <button key={m.v} onClick={() => setModalidad(m.v)}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        modalidad === m.v ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'
                      }`}>
                      {m.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Tu WhatsApp <span className="font-normal text-muted normal-case">(para comunicarte con clientes)</span>
                </label>
                <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
              </div>

              <button onClick={() => setStep(3)}
                disabled={!nombre.trim() || !especialidad}
                className="w-full py-4 bg-ink text-white rounded-2xl font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                Siguiente <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* PASO 3 — Tu marca */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs text-accent font-bold uppercase tracking-wider">Paso 2 de 2</p>
                <h2 className="text-2xl font-serif font-bold mt-1">Personaliza tu marca</h2>
                <p className="text-muted text-sm mt-1">Así verán tu panel tus clientes. Puedes cambiarlo después.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Nombre de tu negocio
                </label>
                <input value={brandName} onChange={e => setBrandName(e.target.value)}
                  placeholder={`${nombre} Training`}
                  className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
              </div>

              {/* Foto de perfil */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Tu foto de perfil
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    {brandLogo
                      ? <>
                          <img src={brandLogo} className="w-16 h-16 rounded-full object-cover border-4 border-border" alt="" />
                          <button onClick={() => setBrandLogo('')}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-warn text-white rounded-full text-xs font-bold">×</button>
                        </>
                      : <div className="w-16 h-16 rounded-full border-4 border-dashed border-border flex items-center justify-center text-2xl font-bold"
                          style={{ backgroundColor: brandColor + '20', color: brandColor }}>
                          {(brandName || nombre || 'T')[0]?.toUpperCase()}
                        </div>
                    }
                  </div>
                  <label className="px-4 py-2.5 border border-border rounded-xl text-sm text-muted hover:border-accent cursor-pointer transition-colors">
                    📁 {brandLogo ? 'Cambiar foto' : 'Subir foto'}
                    <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
                  </label>
                </div>
              </div>

              {/* Temas de color */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Color de tu marca
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {TEMAS.map(tema => (
                    <button key={tema.id} onClick={() => applyTema(tema)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${
                        temaId === tema.id ? 'border-ink scale-95 shadow-md' : 'border-transparent hover:border-border'
                      }`}
                      style={{ backgroundColor: tema.bg }}>
                      <div className="w-7 h-7 rounded-full" style={{ backgroundColor: tema.color }} />
                      <span className="text-[10px] font-semibold" style={{ color: tema.color }}>{tema.nombre}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input type="color" value={brandColor}
                    onChange={e => { setBrandColor(e.target.value); setTemaId('custom') }}
                    className="w-10 h-10 rounded-xl border border-border cursor-pointer" />
                  <span className="text-xs text-muted">Color personalizado</span>
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl overflow-hidden border border-border">
                <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: brandColor }}>
                  {brandLogo
                    ? <img src={brandLogo} className="w-7 h-7 rounded-full object-cover border-2 border-white/30" alt="" />
                    : <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                        {(brandName || nombre || 'T')[0]?.toUpperCase()}
                      </div>
                  }
                  <span className="text-white font-bold text-sm">{brandName || nombre || 'Tu marca'}</span>
                  <span className="ml-auto text-white/50 text-[10px]">preview</span>
                </div>
                <div className="px-4 py-2 bg-bg-alt text-xs text-muted">
                  Así verán tus clientes la cabecera de su panel 👆
                </div>
              </div>

              <button onClick={saveAndFinish} disabled={saving}
                className="w-full py-4 bg-ink text-white rounded-2xl font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                {saving ? 'Guardando...' : <>Terminar configuración <Check className="w-5 h-5" /></>}
              </button>
            </div>
          )}

          {/* PASO 4 — Esperando aprobación */}
          {step === 4 && (
            <div className="text-center space-y-6">
              <div className="text-6xl animate-bounce">⏳</div>
              <div>
                <h2 className="text-2xl font-serif font-bold">¡Todo listo!</h2>
                <p className="text-muted mt-2 leading-relaxed">
                  Tu perfil está configurado. En cuanto activemos tu cuenta recibirás acceso completo.
                  Normalmente en menos de 24 horas.
                </p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu perfil</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: brandColor }}>
                    {(brandName || nombre || 'T')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{nombre}</p>
                    <p className="text-xs text-muted">{ESPECIALIDADES.find(e => e.v === especialidad)?.emoji} {ESPECIALIDADES.find(e => e.v === especialidad)?.label}</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted">
                Esta página se actualizará automáticamente cuando tu cuenta esté activa.
              </p>
              <button onClick={onLogout} className="text-xs text-muted hover:text-ink underline">
                Salir y volver más tarde
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
