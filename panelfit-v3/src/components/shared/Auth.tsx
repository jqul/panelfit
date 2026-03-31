import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../shared/Button'
import { Eye, EyeOff } from 'lucide-react'

interface AuthProps {
  onAuth: () => void
}

export function Auth({ onAuth }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o contraseña incorrectos')
    else onAuth()
    setLoading(false)
  }

  const handleRegister = async () => {
    if (!name.trim()) { setError('Introduce tu nombre'); return }
    setError(''); setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('entrenadores').upsert({
        id: data.user.id, nombre: name, email, activo: false
      }, { onConflict: 'id' })
    }
    setError('')
    setLoading(false)
    setMode('login')
    alert('Cuenta creada. En breve recibirás confirmación de acceso.')
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif font-bold tracking-tight">
            Panel<span className="text-accent italic">Fit</span>
          </h1>
          <p className="text-muted text-sm mt-2">Plataforma de entrenamiento personalizado</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-serif font-bold mb-6">
            {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </h2>

          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full px-4 py-3 bg-bg border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 bg-bg border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-10 bg-bg border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-warn">{error}</p>}

          <Button
            className="w-full mt-6"
            size="lg"
            onClick={mode === 'login' ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar →' : 'Crear cuenta →'}
          </Button>

          <p className="text-center text-sm text-muted mt-4">
            {mode === 'login' ? '¿Sin cuenta? ' : '¿Ya tienes cuenta? '}
            <button
              onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
              className="text-accent hover:underline font-medium"
            >
              {mode === 'login' ? 'Regístrate' : 'Entra aquí'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
