import { useEffect, useRef, useState } from 'react'
import { Check, ArrowRight, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { validarContacto } from '../lib/leads'
import { PARQ_QUESTIONS } from '../lib/intakeQuestions'
import { faltan, type Pregunta } from '../lib/cuestionarios'
import {
  AVISO_NO_MEDICO, AVISO_SOLO_ADULTOS, esMayorDeEdad, CONSENT_ASISTENTE_PROGRAMACION, CONSENT_PROGRAMACION_VERSION, CONSENT_SALUD_PROGRAMACION, IDS_SALUD, INCLUYE_PROGRAMACION,
  MENSAJE_RECIBIDA, MENSAJE_REVISAR, POLITICA_RETENCION, PREGUNTAS_PROGRAMACION, respuestasParaEnvio,
} from '../lib/solicitudProgramacion'

// Solicitud de programación inicial: la página que abre quien recibe el enlace revocable de un entrenador. Sin cuenta, sin contraseña.
// Solo se enseña lo que la base de datos devuelve para un enlace vigente (obtener_enlace_programacion); revocado, caducado o agotado
// se ve igual que un enlace que no existe. Los pasos: contacto → consentimiento → preguntas → cuestionario de salud (PAR-Q).
// Si no consiente el tratamiento de salud, no se le piden ni se guardan las respuestas de salud ni el PAR-Q.

interface Entrenador { entrenador: string; marca: string | null; logo: string | null }
type Paso = 'contacto' | 'consentimiento' | 'preguntas' | 'parq' | 'fin'
const PARTES = [PREGUNTAS_PROGRAMACION.slice(0, 11), PREGUNTAS_PROGRAMACION.slice(11)]

export function SolicitudProgramacion({ slug }: { slug: string }) {
  const [cargando, setCargando] = useState(true)
  const [datos, setDatos] = useState<Entrenador | null>(null)
  const [paso, setPaso] = useState<Paso>('contacto')
  const [parte, setParte] = useState(0)
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [salud, setSalud] = useState(false)
  const [asistente, setAsistente] = useState(false)
  const [valores, setValores] = useState<Record<string, unknown>>({})
  const [parq, setParq] = useState<(boolean | null)[]>(() => PARQ_QUESTIONS.map(() => null))
  const [web, setWeb] = useState('') // campo que una persona no ve y un robot rellena
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<'ok' | 'revisar' | null>(null)
  const clave = useRef(crypto.randomUUID()) // la misma en cada reintento: un doble clic no duplica la solicitud

  // La página no se indexa: es un enlace privado del entrenador
  useEffect(() => {
    const meta = document.querySelector('meta[name="robots"]')
    const antes = meta?.getAttribute('content') ?? null
    meta?.setAttribute('content', 'noindex, nofollow')
    return () => { if (meta && antes !== null) meta.setAttribute('content', antes) }
  }, [])

  useEffect(() => {
    let vivo = true
    supabase.rpc('obtener_enlace_programacion', { p_slug: slug }).then(({ data }) => {
      if (!vivo) return
      setDatos((data as Entrenador | null) ?? null)
      setCargando(false)
    })
    return () => { vivo = false }
  }, [slug])

  // La edad se pide siempre (solo adultos); lo demás de salud, solo con consentimiento
  const visibles = (qs: Pregunta[]) => qs.filter(q => salud || q.id === 'edad' || !IDS_SALUD.includes(q.id))
  const marca = datos?.marca || datos?.entrenador || ''

  if (cargando) return <div className="min-h-[100dvh] bg-bg flex items-center justify-center"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
  if (!datos) return (
    <div className="min-h-[100dvh] bg-bg flex items-center justify-center px-6 text-center">
      <div className="max-w-sm space-y-3">
        <h1 className="text-2xl font-serif font-bold">Este enlace ya no está disponible</h1>
        <p className="text-sm text-muted leading-relaxed">Pídele a tu entrenador un enlace nuevo.</p>
      </div>
    </div>
  )

  const primario = 'w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed'
  const secundario = 'inline-flex items-center gap-1.5 py-2.5 text-sm font-semibold text-muted hover:text-ink'
  const campo = 'w-full px-4 py-3 bg-bg border border-border rounded-xl text-base outline-none focus:border-accent'
  const poner = (id: string, v: unknown) => setValores(prev => ({ ...prev, [id]: v }))

  const siguienteContacto = () => {
    if (!nombre.trim()) { setError('Escribe tu nombre'); return }
    const c = validarContacto(contacto)
    if (!c.ok) { setError(c.error); return }
    setError(''); setPaso('consentimiento')
  }
  const siguientePreguntas = () => {
    const falta = faltan(visibles(PARTES[parte]), valores)
    if (falta.length) { setError(`Falta contestar: ${falta[0].label}`); return }
    if (parte === 1 && esMayorDeEdad(valores.edad) === false) { setError(AVISO_SOLO_ADULTOS); return }
    setError('')
    if (parte === 0) { setParte(1); window.scrollTo(0, 0); return }
    if (salud) { setPaso('parq'); window.scrollTo(0, 0) } else void enviar()
  }

  const enviar = async () => {
    if (enviando) return
    if (salud && parq.some(x => x === null)) { setError('Contesta las 7 preguntas'); return }
    const c = validarContacto(contacto)
    if (!c.ok) { setError(c.error); return }
    if (web) { setResultado('ok'); setPaso('fin'); return } // un robot: se hace como que ha ido bien, sin enviar nada
    setEnviando(true); setError('')
    // Sin consentimiento de salud, esas respuestas ni salen del navegador (el servidor las descartaría igualmente)
    const limpias = respuestasParaEnvio(valores)
    for (const id of IDS_SALUD) if (!salud && id !== 'edad') delete limpias[id]
    const { data, error: err } = await supabase.rpc('enviar_solicitud_programacion', {
      p_slug: slug, p_clave: clave.current, p_nombre: nombre.trim(), p_email: c.email, p_telefono: c.phone,
      p_respuestas: limpias, p_parq: salud ? parq : null, p_consiente_salud: salud, p_consiente_asistente: salud && asistente,
      p_version: CONSENT_PROGRAMACION_VERSION, p_web: web || null,
    })
    setEnviando(false)
    if (err) { setError(err.message && err.message.length < 140 ? err.message : 'No se pudo enviar. Inténtalo de nuevo en un momento.'); return }
    setResultado(data === 'revisar' ? 'revisar' : 'ok'); setPaso('fin')
  }

  const pasos: Paso[] = salud ? ['contacto', 'consentimiento', 'preguntas', 'parq'] : ['contacto', 'consentimiento', 'preguntas']
  const idx = pasos.indexOf(paso)

  return (
    <div className="min-h-[100dvh] bg-bg">
      <main className="max-w-md mx-auto px-6 py-10 space-y-6">
        <header className="text-center space-y-2">
          {datos.logo
            ? <img src={datos.logo} alt="" className="w-16 h-16 rounded-full object-cover mx-auto" />
            : <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto"><span className="text-2xl font-serif font-bold text-accent">{marca[0]?.toUpperCase()}</span></div>}
          <p className="text-sm font-semibold">{marca}</p>
          {datos.marca && datos.marca !== datos.entrenador && <p className="text-xs text-muted">{datos.entrenador}</p>}
        </header>

        {paso !== 'fin' && idx >= 0 && (
          <div className="flex gap-1.5" aria-hidden>{pasos.map((_, i) => <div key={i} className={`flex-1 h-1 rounded-full ${i <= idx ? 'bg-accent' : 'bg-border'}`} />)}</div>
        )}

        {paso === 'contacto' && (
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); siguienteContacto() }}>
            <div>
              <h1 className="font-serif text-2xl font-bold">Solicitud de programación inicial</h1>
              <p className="text-sm text-muted mt-1">Unos 5 minutos.</p>
            </div>
            <ul className="text-sm space-y-1.5">
              {INCLUYE_PROGRAMACION.map(t => <li key={t} className="flex gap-2"><Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" /> {t}</li>)}
            </ul>
            <p className="text-xs text-muted leading-relaxed bg-card rounded-xl p-3">{AVISO_NO_MEDICO}</p>
            <p className="text-xs text-muted leading-relaxed">{POLITICA_RETENCION}</p>
            <div>
              <label htmlFor="sp-nombre" className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Tu nombre</label>
              <input id="sp-nombre" value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="given-name" maxLength={100} className={campo} />
            </div>
            <div>
              <label htmlFor="sp-contacto" className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Correo o WhatsApp</label>
              <input id="sp-contacto" value={contacto} onChange={e => setContacto(e.target.value)} autoComplete="off" maxLength={254} className={campo} />
            </div>
            {/* Trampa para robots: fuera de la vista y del tabulador */}
            <div aria-hidden style={{ position: 'absolute', left: '-9999px' }}>
              <label>No rellenar <input tabIndex={-1} autoComplete="off" value={web} onChange={e => setWeb(e.target.value)} /></label>
            </div>
            {error && <p role="alert" className="text-sm text-warn font-semibold">{error}</p>}
            <button type="submit" className={primario}>Empezar <ArrowRight className="w-4 h-4" /></button>
          </form>
        )}

        {paso === 'consentimiento' && (
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); setError(''); setPaso('preguntas'); setParte(0) }}>
            <h2 className="font-serif text-2xl font-bold">Antes de seguir</h2>
            <label className="flex items-start gap-3 text-sm leading-relaxed bg-card rounded-xl p-4 cursor-pointer">
              <input type="checkbox" checked={salud} onChange={e => { setSalud(e.target.checked); if (!e.target.checked) setAsistente(false) }} className="mt-1 w-4 h-4" />
              <span>{CONSENT_SALUD_PROGRAMACION}</span>
            </label>
            <label className={`flex items-start gap-3 text-sm leading-relaxed bg-card rounded-xl p-4 ${salud ? 'cursor-pointer' : 'opacity-50'}`}>
              <input type="checkbox" checked={asistente} disabled={!salud} onChange={e => setAsistente(e.target.checked)} className="mt-1 w-4 h-4" />
              <span>{CONSENT_ASISTENTE_PROGRAMACION}</span>
            </label>
            <p className="text-xs text-muted">Puedes seguir sin marcar nada: tu entrenador recibirá tu solicitud solo con tus datos de contacto y las respuestas que no son de salud.</p>
            <button type="submit" className={primario}>Continuar <ArrowRight className="w-4 h-4" /></button>
            <button type="button" onClick={() => setPaso('contacto')} className={secundario}><ArrowLeft className="w-4 h-4" /> Atrás</button>
          </form>
        )}

        {paso === 'preguntas' && (
          <form className="space-y-5" onSubmit={e => { e.preventDefault(); siguientePreguntas() }}>
            <h2 className="font-serif text-2xl font-bold">{parte === 0 ? 'Tu objetivo y tu tiempo' : 'Tu día a día'}</h2>
            {visibles(PARTES[parte]).map(q => <Campo key={q.id} q={q} valor={valores[q.id]} onChange={v => poner(q.id, v)} campo={campo} />)}
            {error && <p role="alert" className="text-sm text-warn font-semibold">{error}</p>}
            <button type="submit" disabled={enviando} className={primario}>{parte === 0 ? 'Continuar' : salud ? 'Continuar' : enviando ? 'Enviando…' : 'Enviar solicitud'} <ArrowRight className="w-4 h-4" /></button>
            <button type="button" onClick={() => { setError(''); if (parte === 1) setParte(0); else setPaso('consentimiento') }} className={secundario}><ArrowLeft className="w-4 h-4" /> Atrás</button>
          </form>
        )}

        {paso === 'parq' && (
          <form className="space-y-5" onSubmit={e => { e.preventDefault(); void enviar() }}>
            <div>
              <h2 className="font-serif text-2xl font-bold">Cuestionario de salud</h2>
              <p className="text-sm text-muted mt-1">Siete preguntas de sí o no.</p>
            </div>
            {PARQ_QUESTIONS.map((p, i) => (
              <fieldset key={p} className="space-y-2">
                <legend className="text-sm font-medium">{p}</legend>
                <div className="flex gap-2">
                  {([true, false] as const).map(v => (
                    <button key={String(v)} type="button" role="radio" aria-checked={parq[i] === v} aria-label={`${p} ${v ? 'Sí' : 'No'}`}
                      onClick={() => setParq(prev => prev.map((x, j) => (j === i ? v : x)))}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${parq[i] === v ? 'bg-ink text-white border-ink' : 'bg-card border-border/60'}`}>{v ? 'Sí' : 'No'}</button>
                  ))}
                </div>
              </fieldset>
            ))}
            {error && <p role="alert" className="text-sm text-warn font-semibold">{error}</p>}
            <button type="submit" disabled={enviando} className={primario}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
            <button type="button" onClick={() => { setError(''); setPaso('preguntas'); setParte(1) }} className={secundario}><ArrowLeft className="w-4 h-4" /> Atrás</button>
          </form>
        )}

        {paso === 'fin' && (
          <div className="text-center space-y-3 py-6" role="status">
            <div className="w-12 h-12 rounded-full bg-ok/10 flex items-center justify-center mx-auto"><Check className="w-6 h-6 text-ok" /></div>
            <h2 className="font-serif text-2xl font-bold">Solicitud recibida</h2>
            <p className="text-sm text-muted leading-relaxed">{resultado === 'revisar' ? MENSAJE_REVISAR : MENSAJE_RECIBIDA}</p>
          </div>
        )}
      </main>
    </div>
  )
}

// Una pregunta del modelo, según su tipo
function Campo({ q, valor, onChange, campo }: { q: Pregunta; valor: unknown; onChange: (v: unknown) => void; campo: string }) {
  const boton = (activo: boolean) => `px-3 py-2.5 rounded-xl border text-sm font-medium text-left ${activo ? 'bg-ink text-white border-ink' : 'bg-card border-border/60'}`
  const etiqueta = <>{q.label}{q.required && <span className="text-accent"> *</span>}</>
  if (q.type === 'choice') return (
    <fieldset className="space-y-2"><legend className="text-sm font-medium">{etiqueta}</legend>
      <div className="grid gap-2" role="radiogroup" aria-label={q.label}>
        {(q.options ?? []).map(o => <button key={o} type="button" role="radio" aria-checked={valor === o} onClick={() => onChange(o)} className={boton(valor === o)}>{o}</button>)}
      </div></fieldset>
  )
  if (q.type === 'multi') {
    const sel = Array.isArray(valor) ? valor as string[] : []
    return (
      <fieldset className="space-y-2"><legend className="text-sm font-medium">{etiqueta}</legend>
        <div className="grid gap-2">
          {(q.options ?? []).map(o => (
            <label key={o} className={`${boton(sel.includes(o))} flex items-center gap-2 cursor-pointer`}>
              <input type="checkbox" className="w-4 h-4" checked={sel.includes(o)} onChange={e => onChange(e.target.checked ? [...sel, o] : sel.filter(x => x !== o))} /> {o}
            </label>
          ))}
        </div></fieldset>
    )
  }
  if (q.type === 'yesno') return (
    <fieldset className="space-y-2"><legend className="text-sm font-medium">{etiqueta}</legend>
      <div className="flex gap-2" role="radiogroup" aria-label={q.label}>
        {([true, false] as const).map(v => <button key={String(v)} type="button" role="radio" aria-checked={valor === v} onClick={() => onChange(v)} className={`flex-1 ${boton(valor === v)}`}>{v ? 'Sí' : 'No'}</button>)}
      </div></fieldset>
  )
  if (q.type === 'scale') return (
    <fieldset className="space-y-2"><legend className="text-sm font-medium">{etiqueta}</legend>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={q.label}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <button key={n} type="button" role="radio" aria-checked={valor === n} aria-label={`${q.label} ${n}`} onClick={() => onChange(n)} className={`text-center ${boton(valor === n)}`}>{n}</button>)}
      </div></fieldset>
  )
  if (q.type === 'number') return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor={`sp-${q.id}`}>{etiqueta}{q.unit ? ` (${q.unit})` : ''}</label>
      <input id={`sp-${q.id}`} type="number" inputMode="decimal" step="any" value={typeof valor === 'number' ? valor : ''} onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))} className={campo} />
    </div>
  )
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor={`sp-${q.id}`}>{etiqueta}</label>
      <textarea id={`sp-${q.id}`} rows={3} maxLength={1000} value={typeof valor === 'string' ? valor : ''} onChange={e => onChange(e.target.value)} className={campo} />
    </div>
  )
}
