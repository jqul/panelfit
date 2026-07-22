import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'

interface Props { onDemo: () => void; onRegister: () => void; onLogin: () => void }

const FORMULAS = [
  { name: 'Epley', fn: (w: number, r: number) => w * (1 + r / 30) },
  { name: 'Brzycki', fn: (w: number, r: number) => w * (36 / (37 - r)) },
  { name: 'Lander', fn: (w: number, r: number) => (100 * w) / (101.3 - 2.67123 * r) },
  { name: 'Lombardi', fn: (w: number, r: number) => w * Math.pow(r, 0.1) },
]

const PORCENTAJES = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50]

export function CalculadoraRM({ onDemo, onRegister, onLogin }: Props) {
  const [peso, setPeso] = useState('')
  const [reps, setReps] = useState('')
  const [rm, setRm] = useState<number | null>(null)

  useEffect(() => {
    document.title = 'Calculadora de 1RM (una repetición máxima) | PanelFit'
    document.querySelector('meta[name="description"]')?.setAttribute('content',
      'Calcula tu 1RM (una repetición máxima) gratis. Introduce el peso y las repeticiones y obtén tu máximo estimado con 4 fórmulas científicas.')
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'; ld.id = 'ld-calc-rm'
    ld.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': ['WebApplication', 'SoftwareApplication'],
      name: 'Calculadora de 1RM',
      description: 'Calcula tu una repetición máxima de forma gratuita.',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      url: 'https://panelfit.vercel.app/calculadora-1rm',
    })
    document.head.appendChild(ld)
    return () => { document.getElementById('ld-calc-rm')?.remove() }
  }, [])

  const calcular = () => {
    const w = parseFloat(peso)
    const r = parseInt(reps)
    if (!w || !r || r < 1 || r > 30) return
    const resultados = FORMULAS.map(f => f.fn(w, r))
    const media = resultados.reduce((a, b) => a + b, 0) / resultados.length
    setRm(Math.round(media * 10) / 10)
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-bg/95 backdrop-blur z-10">
        <a href="/" className="text-xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></a>
        <div className="flex items-center gap-4">
          <a href="/blog" className="text-sm text-text-secondary hover:text-text hidden sm:block">Blog</a>
          <a href="/precios" className="text-sm text-text-secondary hover:text-text hidden sm:block">Precios</a>
          <button onClick={onLogin} className="text-sm text-text-secondary hover:text-text">Entrar</button>
          <button onClick={onDemo} className="text-sm bg-accent text-white px-4 py-2 rounded-lg hover:opacity-90">Ver demo</button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-3">Calculadora de 1RM</h1>
        <p className="text-text-secondary mb-8">Calcula tu una repetición máxima estimada a partir de un peso submáximo y las repeticiones realizadas.</p>

        {/* Calculadora */}
        <div className="bg-surface rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Peso (kg)</label>
              <input
                type="number"
                min="1"
                max="500"
                placeholder="ej. 100"
                value={peso}
                onChange={e => { setPeso(e.target.value); setRm(null) }}
                className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-text text-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Repeticiones</label>
              <input
                type="number"
                min="1"
                max="30"
                placeholder="ej. 5"
                value={reps}
                onChange={e => { setReps(e.target.value); setRm(null) }}
                className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-text text-lg focus:outline-none focus:ring-2 focus:ring-accent"
                onKeyDown={e => e.key === 'Enter' && calcular()}
              />
            </div>
          </div>
          <button
            onClick={calcular}
            disabled={!peso || !reps}
            className="w-full py-3 bg-accent text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Calcular 1RM
          </button>

          {rm && (
            <div className="pt-2 space-y-5">
              <div className="text-center py-6 bg-accent/10 rounded-xl">
                <p className="text-sm text-text-secondary mb-1">Tu 1RM estimado</p>
                <p className="text-5xl font-bold text-accent">{rm} <span className="text-2xl">kg</span></p>
                <p className="text-xs text-text-secondary mt-2">Media de 4 fórmulas (Epley, Brzycki, Lander, Lombardi)</p>
              </div>

              {/* Tabla de porcentajes */}
              <div>
                <h2 className="font-semibold mb-3">Tabla de cargas por porcentaje</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-text-secondary">
                        <th className="text-left py-2 pr-4">% del 1RM</th>
                        <th className="text-right py-2 pr-4">Peso (kg)</th>
                        <th className="text-right py-2">Reps aprox.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PORCENTAJES.map(pct => {
                        const repsAprox: Record<number, string> = { 100: '1', 95: '2', 90: '3–4', 85: '5–6', 80: '7–8', 75: '9–10', 70: '11–12', 65: '13–15', 60: '16–20', 55: '20–25', 50: '25+' }
                        return (
                          <tr key={pct} className={`border-b border-border/50 ${pct === 100 ? 'font-bold' : ''}`}>
                            <td className="py-2 pr-4">{pct}%</td>
                            <td className="py-2 pr-4 text-right">{Math.round(rm * pct / 100 * 10) / 10} kg</td>
                            <td className="py-2 text-right text-text-secondary">{repsAprox[pct]}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Por fórmula */}
              <div>
                <h2 className="font-semibold mb-3">Resultado por fórmula</h2>
                <div className="grid grid-cols-2 gap-3">
                  {FORMULAS.map(f => (
                    <div key={f.name} className="p-3 bg-bg rounded-xl border border-border text-center">
                      <p className="text-xs text-text-secondary mb-1">{f.name}</p>
                      <p className="font-bold">{Math.round(f.fn(parseFloat(peso), parseInt(reps)) * 10) / 10} kg</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Explicación */}
        <div className="mt-12 space-y-8">
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">¿Qué es el 1RM?</h2>
            <p className="text-text-secondary leading-relaxed">
              El 1RM (una repetición máxima) es el peso máximo que puedes levantar una sola vez en un ejercicio
              con técnica correcta. Es el estándar de referencia para medir la fuerza y para programar
              intensidades de entrenamiento.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Cómo usar el 1RM para programar</h2>
            <div className="space-y-3">
              {[
                ['Fuerza máxima (85–100%)', '1–5 repeticiones, descansos largos (3–5 min)'],
                ['Hipertrofia (65–85%)', '6–15 repeticiones, descansos medios (1–3 min)'],
                ['Resistencia muscular (50–65%)', '15+ repeticiones, descansos cortos (<1 min)'],
              ].map(([zona, desc]) => (
                <div key={zona} className="p-4 bg-surface rounded-xl">
                  <p className="font-semibold text-sm">{zona}</p>
                  <p className="text-text-secondary text-sm mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">¿Qué fórmula es más precisa?</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Ninguna fórmula es perfecta para todos. La precisión depende del ejercicio, el nivel del atleta,
              y la fibra muscular dominante. En general:
            </p>
            <ul className="space-y-2 text-text-secondary">
              <li><strong className="text-text">Epley:</strong> la más usada, funciona bien para rangos de 1–10 reps.</li>
              <li><strong className="text-text">Brzycki:</strong> más precisa para reps bajas (1–10), tiende a subestimar con reps altas.</li>
              <li><strong className="text-text">Lander:</strong> buena precisión en rango medio (5–12 reps).</li>
              <li><strong className="text-text">Lombardi:</strong> mejor para reps altas (10+).</li>
            </ul>
            <p className="text-text-secondary leading-relaxed mt-4">
              Usar la media de varias fórmulas (como hace esta calculadora) da un resultado más robusto
              que confiar en una sola.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Limitaciones del 1RM estimado</h2>
            <p className="text-text-secondary leading-relaxed">
              El 1RM calculado es una estimación, no un valor exacto. Puede diferir del real por:
              fatiga acumulada, técnica en el set de referencia, el ejercicio en cuestión (las fórmulas
              son más precisas en press banca y sentadilla que en ejercicios de aislamiento), y la
              experiencia del atleta. Úsalo como referencia de programación, no como marca oficial.
            </p>
          </div>
        </div>

        <hr className="border-border my-10" />

        <div className="bg-surface rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-2xl font-serif font-bold">Programa por %RM directamente en PanelFit</h3>
          <p className="text-text-secondary leading-relaxed">
            En PanelFit puedes programar los ejercicios de tus clientes por porcentaje de 1RM.
            El plan se actualiza automáticamente cuando registra un nuevo máximo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button onClick={onDemo} className="px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:opacity-90 flex items-center justify-center gap-2">
              Ver demo <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onRegister} className="px-6 py-3 border border-border rounded-xl hover:bg-bg transition-colors text-sm">
              Solicitar acceso gratis
            </button>
          </div>
        </div>

        <div className="mt-12 space-y-3">
          <h3 className="text-lg font-semibold mb-4">También puede interesarte</h3>
          <a href="/blog/mejor-software-entrenador-personal" className="block p-4 border border-border rounded-xl hover:bg-surface transition-colors">
            <p className="font-medium">Mejor software para entrenador personal en 2025</p>
            <p className="text-sm text-text-secondary mt-1">Comparativa entre las herramientas más usadas</p>
          </a>
          <a href="/blog/plantillas-entrenamiento-entrenador-personal" className="block p-4 border border-border rounded-xl hover:bg-surface transition-colors">
            <p className="font-medium">Plantillas de entrenamiento para entrenador personal</p>
            <p className="text-sm text-text-secondary mt-1">Ahorra tiempo sin sacrificar calidad en los planes</p>
          </a>
        </div>
      </div>

      <footer className="border-t border-border px-4 sm:px-8 py-8 text-center text-sm text-text-secondary">
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <a href="/" className="hover:text-text">Inicio</a>
          <a href="/blog" className="hover:text-text">Blog</a>
          <a href="/precios" className="hover:text-text">Precios</a>
          <a href="/alternativas/harbiz" className="hover:text-text">vs Harbiz</a>
          <a href="/alternativas/trainerize" className="hover:text-text">vs Trainerize</a>
        </div>
        <p>© 2025 PanelFit</p>
      </footer>
    </div>
  )
}
