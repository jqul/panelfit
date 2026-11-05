import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { REPS_MAX, pct1RM, pesoPara, rirDeRpe, tablaRPE } from '../lib/conversorRPE'

interface Props { onDemo: () => void; onRegister: () => void; onLogin: () => void }

const RPES = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5]
const fmt = (n: number) => n.toLocaleString('es-ES')
const campo = 'w-full px-4 py-3 rounded-xl border border-border bg-bg text-text text-lg focus:outline-none focus:ring-2 focus:ring-accent'

// Página pública /calculadora-rpe-rir: pasa de RPE a RIR y a %1RM, y con un 1RM da los kilos (lib/conversorRPE).
export function ConversorRPE({ onDemo, onRegister, onLogin }: Props) {
  const [reps, setReps] = useState('5')
  const [rpe, setRpe] = useState(8)
  const [unoRM, setUnoRM] = useState('')
  const rir = rirDeRpe(rpe)
  const r = parseInt(reps)
  const pct = Number.isFinite(r) ? pct1RM(r, rir) : null
  const kg = pct !== null ? pesoPara(parseFloat(unoRM), r, rir) : null
  const tabla = tablaRPE(10)

  useEffect(() => {
    document.title = 'Conversor RPE, RIR y %1RM | PanelFit'
    document.querySelector('meta[name="description"]')?.setAttribute('content',
      'Convierte RPE en RIR y en porcentaje de tu 1RM, y calcula los kilos de cada serie. Gratis, con tabla de RPE de 1 a 10 repeticiones.')
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'; ld.id = 'ld-conversor-rpe'
    ld.text = JSON.stringify({
      '@context': 'https://schema.org', '@type': ['WebApplication', 'SoftwareApplication'],
      name: 'Conversor RPE, RIR y %1RM', description: 'Convierte RPE en RIR y en porcentaje del 1RM.',
      applicationCategory: 'HealthApplication', operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, url: 'https://panelfit.vercel.app/calculadora-rpe-rir',
    })
    document.head.appendChild(ld)
    return () => { document.getElementById('ld-conversor-rpe')?.remove() }
  }, [])

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-bg/95 backdrop-blur z-10">
        <a href="/" className="text-xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></a>
        <div className="flex items-center gap-4">
          <a href="/calculadora-1rm" className="text-sm text-text-secondary hover:text-text hidden sm:block">Calculadora 1RM</a>
          <a href="/blog" className="text-sm text-text-secondary hover:text-text hidden sm:block">Blog</a>
          <button onClick={onLogin} className="text-sm text-text-secondary hover:text-text">Entrar</button>
          <button onClick={onDemo} className="text-sm bg-accent text-white px-4 py-2 rounded-lg hover:opacity-90">Ver demo</button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-3">Conversor RPE, RIR y %1RM</h1>
        <p className="text-text-secondary mb-8">Elige las repeticiones y el esfuerzo (RPE o RIR) y te decimos a qué porcentaje de tu 1RM equivale. Con tu 1RM, los kilos de la serie.</p>

        <section aria-label="Conversor" className="bg-surface rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium">Repeticiones
              <input type="number" min={1} max={REPS_MAX} value={reps} onChange={e => setReps(e.target.value)} className={`${campo} mt-2`} />
            </label>
            <label className="block text-sm font-medium">Tu 1RM (kg, opcional)
              <input type="number" min={1} max={500} step={0.5} placeholder="ej. 140" value={unoRM} onChange={e => setUnoRM(e.target.value)} className={`${campo} mt-2`} />
            </label>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Esfuerzo</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="RPE">
              {RPES.map(v => (
                <button key={v} type="button" role="radio" aria-checked={rpe === v} onClick={() => setRpe(v)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border ${rpe === v ? 'bg-ink text-white border-ink' : 'border-border text-text-secondary hover:text-text'}`}>
                  RPE {fmt(v)}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-secondary mt-2">RPE {fmt(rpe)} = RIR {fmt(rir)}: {rir === 0 ? 'al fallo, no podías hacer ni una más' : `te ${rir === 1 ? 'quedaba 1 repetición' : `quedaban ${fmt(rir)} repeticiones`} en reserva`}.</p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1" data-testid="resultado-rpe">
            <div className="bg-bg rounded-xl p-4 text-center"><p className="text-xs text-text-secondary">RPE</p><p className="font-serif font-bold text-2xl">{fmt(rpe)}</p></div>
            <div className="bg-bg rounded-xl p-4 text-center"><p className="text-xs text-text-secondary">RIR</p><p className="font-serif font-bold text-2xl">{fmt(rir)}</p></div>
            <div className="bg-bg rounded-xl p-4 text-center"><p className="text-xs text-text-secondary">% del 1RM</p><p className="font-serif font-bold text-2xl text-accent">{pct !== null ? `${fmt(pct)} %` : '—'}</p></div>
          </div>
          {kg !== null && <p className="text-center text-lg" data-testid="kilos-rpe">{r} × <strong>{fmt(kg)} kg</strong> @ RPE {fmt(rpe)}</p>}
        </section>

        <h2 className="text-2xl font-serif font-bold mt-12 mb-3">Tabla de RPE</h2>
        <p className="text-sm text-text-secondary mb-4">% del 1RM según las repeticiones (filas) y el RPE (columnas). RIR = 10 − RPE.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead><tr className="text-text-secondary"><th className="text-left py-2 pr-2">Reps</th>{tabla[0].pcts.map(p => <th key={p.rpe} className="py-2 px-1">RPE {p.rpe} <span className="block text-[11px] font-normal">RIR {fmt(rirDeRpe(p.rpe))}</span></th>)}</tr></thead>
            <tbody>
              {tabla.map(f => (
                <tr key={f.reps} className="border-t border-border">
                  <td className="py-2 pr-2 font-semibold">{f.reps}</td>
                  {f.pcts.map(p => <td key={p.rpe} className="py-2 px-1 text-center">{fmt(p.pct)} %</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-text-secondary mt-3">Estimación con la fórmula de Epley sobre las repeticiones posibles (hechas + en reserva). Cada persona y cada ejercicio varían algo: úsalo como guía para programar.</p>

        <div className="bg-surface rounded-2xl p-8 text-center space-y-4 mt-12">
          <h3 className="text-2xl font-serif font-bold">Programa por RPE y %1RM en PanelFit</h3>
          <p className="text-text-secondary leading-relaxed">Pon el RIR o el % de cada serie y tus clientes ven los kilos que les tocan, calculados con su marca.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button onClick={onDemo} className="px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:opacity-90 flex items-center justify-center gap-2">Ver demo <ArrowRight className="w-4 h-4" /></button>
            <button onClick={onRegister} className="px-6 py-3 border border-border rounded-xl hover:bg-bg transition-colors text-sm">Solicitar acceso gratis</button>
          </div>
        </div>

        <a href="/calculadora-1rm" className="block mt-8 p-4 border border-border rounded-xl hover:bg-surface transition-colors">
          <p className="font-medium">Calculadora de 1RM y nivel de fuerza</p>
          <p className="text-sm text-text-secondary mt-1">Tu una repetición máxima con 4 fórmulas y tu nivel en sentadilla, banca y peso muerto</p>
        </a>
      </div>

      <footer className="border-t border-border px-4 sm:px-8 py-8 text-center text-sm text-text-secondary">
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <a href="/" className="hover:text-text">Inicio</a>
          <a href="/calculadora-1rm" className="hover:text-text">Calculadora 1RM</a>
          <a href="/blog" className="hover:text-text">Blog</a>
          <a href="/precios" className="hover:text-text">Precios</a>
        </div>
        <p>© 2025 PanelFit</p>
      </footer>
    </div>
  )
}
