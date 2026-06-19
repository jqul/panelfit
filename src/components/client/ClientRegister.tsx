import { useState } from 'react'
import { Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Props {
  token: string
  clientName: string
  trainerName: string
  brandColor?: string
  brandLogo?: string
  onComplete: () => void
}

type Step = 'register' | 'login' | 'success'

export function ClientRegister({ token, clientName, trainerName, brandColor = '#6e5438', brandLogo, onComplete }: Props) {
  const [step, setStep] = useState<Step>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const firstName = clientName.split(' ')[0]

  const validatePassword = () => {
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres'
    if (password !== confirmPassword) return 'Las contraseñas no coinciden'
    return null
  }

  const handleRegister = async () => {
    setError('')
    const passError = validatePassword()
    if (passError) { setError(passError); return }
    if (!email.trim()) { setError('Introduce tu email'); return }

    setLoading(true)
    try {
      // Crear cuenta en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { clientName, token }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Este email ya tiene cuenta. Inicia sesión.')
          setStep('login')
        } else {
          setError(authError.message)
        }
        setLoading(false)
        return
      }

      if (authData.user) {
        // Vincular auth_user_id al cliente (RPC: solo si la fila aún no tiene cuenta vinculada)
        const { error: updateError } = await supabase.rpc('claim_client_by_token', { p_token: token })

        if (updateError) {
          setError('Error al vincular cuenta. Contacta con tu entrenador.')
          setLoading(false)
          return
        }

        setStep('success')
        setTimeout(onComplete, 2000)
      }
    } catch (e) {
      setError('Error inesperado. Inténtalo de nuevo.')
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    setError('')
    if (!email.trim() || !password) { setError('Rellena todos los campos'); return }
    setLoading(true)
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    })
    if (loginError) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }
    onComplete()
    setLoading(false)
  }

  if (step === 'success') {
    return (
      <div className="min-h-[100dvh] bg-bg flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-ok/10 rounded-full flex items-center justify-center mb-5">
          <CheckCircle2 className="w-10 h-10 text-ok" />
        </div>
        <h2 className="text-2xl font-serif font-bold mb-2">¡Cuenta creada!</h2>
        <p className="text-muted text-sm">Accediendo a tu panel...</p>
        <div className="flex gap-1 justify-center mt-4">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: brandColor, animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col">
      {/* Header con marca del entrenador */}
      <div className="px-6 pt-12 pb-8 text-center">
        {brandLogo
          ? <img src={brandLogo} className="w-16 h-16 rounded-full object-cover border-2 border-border mx-auto mb-4" alt="" />
          : <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4"
              style={{ backgroundColor: brandColor }}>
              {trainerName[0]?.toUpperCase()}
            </div>
        }
        <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-2">{trainerName}</p>
        {step === 'register' ? (
          <>
            <h1 className="text-2xl font-serif font-bold">Hola, {firstName} 👋</h1>
            <p className="text-sm text-muted mt-2">Crea tu cuenta para acceder a tu panel de entrenamiento</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-serif font-bold">Bienvenido de nuevo</h1>
            <p className="text-sm text-muted mt-2">Inicia sesión para acceder a tu panel</p>
          </>
        )}
      </div>

      {/* Formulario */}
      <div className="flex-1 px-6 space-y-4 max-w-sm mx-auto w-full">
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Email</label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="tu@email.com"
            className="w-full px-4 py-3.5 bg-card border border-border rounded-2xl text-base outline-none focus:ring-2 focus:border-accent transition-colors"
            style={{ '--tw-ring-color': brandColor + '40' } as any}
          />
        </div>

        {/* Contraseña */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete={step === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-4 py-3.5 pr-12 bg-card border border-border rounded-2xl text-base outline-none focus:ring-2 focus:border-accent transition-colors"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirmar contraseña — solo en registro */}
        {step === 'register' && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">Confirmar contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                placeholder="Repite la contraseña"
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                className="w-full px-4 py-3.5 bg-card border border-border rounded-2xl text-base outline-none focus:ring-2 focus:border-accent transition-colors"
              />
              {confirmPassword && password === confirmPassword && (
                <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ok" />
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-warn/10 border border-warn/20 rounded-xl px-4 py-3">
            <p className="text-sm text-warn font-medium">{error}</p>
          </div>
        )}

        {/* Botón principal */}
        <button
          onClick={step === 'register' ? handleRegister : handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base disabled:opacity-50 transition-opacity active:scale-[0.98]"
          style={{ backgroundColor: brandColor, minHeight: '56px' }}>
          {loading
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <>
                {step === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}
                <ArrowRight className="w-4 h-4" />
              </>
          }
        </button>

        {/* Toggle registro/login */}
        <div className="text-center pt-2 pb-8">
          {step === 'register' ? (
            <p className="text-sm text-muted">
              ¿Ya tienes cuenta?{' '}
              <button onClick={() => { setStep('login'); setError(''); setConfirmPassword('') }}
                className="font-semibold hover:underline" style={{ color: brandColor }}>
                Inicia sesión
              </button>
            </p>
          ) : (
            <p className="text-sm text-muted">
              ¿Primera vez?{' '}
              <button onClick={() => { setStep('register'); setError(''); setPassword('') }}
                className="font-semibold hover:underline" style={{ color: brandColor }}>
                Crea tu cuenta
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
