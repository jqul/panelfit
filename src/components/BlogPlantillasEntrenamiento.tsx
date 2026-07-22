import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

interface Props { onDemo: () => void; onRegister: () => void; onLogin: () => void }

export function BlogPlantillasEntrenamiento({ onDemo, onRegister, onLogin }: Props) {
  useEffect(() => {
    document.title = 'Plantillas de entrenamiento para entrenador personal (2025) | PanelFit'
    document.querySelector('meta[name="description"]')?.setAttribute('content',
      'Cómo crear y usar plantillas de entrenamiento como entrenador personal para ahorrar tiempo y dar mejores planes a tus clientes.')
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'; ld.id = 'ld-plantillas'
    ld.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article',
      headline: 'Plantillas de entrenamiento para entrenador personal (2025)',
      author: { '@type': 'Organization', name: 'PanelFit' },
      publisher: { '@type': 'Organization', name: 'PanelFit', url: 'https://panelfit.vercel.app' },
      datePublished: '2025-04-15', dateModified: '2025-07-01',
      url: 'https://panelfit.vercel.app/blog/plantillas-entrenamiento-entrenador-personal' })
    document.head.appendChild(ld)
    return () => { document.getElementById('ld-plantillas')?.remove() }
  }, [])

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
      <article className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-sm text-text-secondary mb-6">
          <a href="/" className="hover:text-text">PanelFit</a><span className="mx-2">/</span>
          <a href="/blog" className="hover:text-text">Blog</a><span className="mx-2">/</span>
          <span>Plantillas de entrenamiento</span>
        </p>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold leading-tight mb-4">
          Plantillas de entrenamiento para entrenador personal: ahorra tiempo sin sacrificar calidad
        </h1>
        <p className="text-text-secondary text-sm mb-8">Actualizado julio 2025 · 7 min de lectura</p>
        <p className="text-lg text-text-secondary leading-relaxed mb-8">
          Crear un plan de entrenamiento desde cero para cada cliente nuevo consume horas que podrías dedicar
          a mejorar los planes existentes. Las plantillas bien construidas te permiten entregar un plan
          personalizado en minutos, no en horas — sin que el cliente note la diferencia.
        </p>
        <hr className="border-border mb-8" />
        <section className="space-y-10">
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Por qué las plantillas no son "planes genéricos"</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Hay un miedo legítimo entre entrenadores a que usar plantillas haga que los planes parezcan
              impersonales. Pero una plantilla bien diseñada no es un plan genérico — es una estructura base
              que se personaliza rápido.
            </p>
            <p className="text-text-secondary leading-relaxed">
              La diferencia entre un plan genérico y uno personalizado no está en que partas de cero:
              está en que ajustas las cargas al nivel del cliente, eliges los ejercicios según sus
              limitaciones y objetivos, y revisas el progreso cada semana. Una plantilla te da la estructura;
              tú pones la personalización.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibond mb-4">Qué plantillas necesitas tener</h2>
            <p className="text-text-secondary leading-relaxed mb-4">Con 8-10 plantillas cubres el 90% de los casos:</p>
            <div className="space-y-3">
              {[
                { cat: 'Iniciación', desc: 'Full body 3 días/semana. Movimientos básicos, cargas bajas, énfasis en técnica. Para clientes que nunca han entrenado con pesas.' },
                { cat: 'Pérdida de grasa', desc: 'Circuitos y supersets, densidad alta, descansos cortos. Compatible con déficit calórico.' },
                { cat: 'Hipertrofia intermedio', desc: 'Torso-pierna o push-pull-legs, 4 días/semana. Para clientes con 1-2 años de experiencia.' },
                { cat: 'Fuerza base', desc: 'Sentadilla, peso muerto, press banca, remo. Progresión lineal. Para clientes que quieren fuerza como objetivo principal.' },
                { cat: 'Mantenimiento/salud', desc: 'Full body 2-3 días, bajo volumen, ejercicios funcionales. Para clientes con poco tiempo o que priorizan la salud general.' },
                { cat: 'Rehabilitación/lesión', desc: 'Versiones adaptadas de los anteriores con ejercicios alternativos para las zonas lesionadas más comunes (hombro, lumbar, rodilla).' },
              ].map(({ cat, desc }) => (
                <div key={cat} className="p-4 bg-surface rounded-xl">
                  <p className="font-semibold mb-1">{cat}</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Cómo construir una buena plantilla</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Una plantilla útil no es solo una lista de ejercicios. Debe incluir:
            </p>
            <ul className="space-y-2">
              {[
                'Estructura de días y distribución muscular',
                'Ejercicios principales con series, repeticiones y descanso',
                'Notas sobre progresión (cuándo subir peso, cuándo cambiar de ejercicio)',
                'Ejercicios alternativos para las variantes más comunes (sin máquinas, con lesión, en casa)',
                'Criterio de personalización: qué cambias según el cliente',
              ].map(item => (
                <li key={item} className="flex gap-3 text-text-secondary">
                  <ArrowRight className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">El proceso: de plantilla a plan personalizado en 10 minutos</h2>
            <div className="space-y-4">
              {[
                ['1', 'Evalúa al cliente', 'Objetivo, nivel, lesiones, equipamiento disponible, días por semana.'],
                ['2', 'Elige la plantilla base', 'La que más se aproxima a su perfil.'],
                ['3', 'Ajusta los ejercicios', 'Sustituye lo que no puede hacer, añade trabajo específico para su objetivo.'],
                ['4', 'Establece las cargas iniciales', 'Basadas en su evaluación o en los primeros entrenos de adaptación.'],
                ['5', 'Revisa en 2 semanas', 'Con los datos de registro, ajusta lo que no esté funcionando.'],
              ].map(([n, title, desc]) => (
                <div key={n} className="flex gap-4">
                  <div className="w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">{n}</div>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-text-secondary mt-1">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Dónde guardar y usar las plantillas</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              La forma más simple es un Google Doc o PDF por plantilla. Cuando entra un cliente nuevo,
              duplicas el documento, personalizas, y lo compartes. Funciona hasta que tienes muchos clientes
              y el intercambio por WhatsApp empieza a ser caótico.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Con un software de entrenamiento, las plantillas viven en la plataforma: las seleccionas,
              asignas al cliente, y el cliente ya puede ver su plan y registrar los entrenos directamente.
              Sin reenvíos, sin versiones desactualizadas.
            </p>
          </div>
        </section>
        <hr className="border-border my-10" />
        <div className="bg-surface rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-2xl font-serif font-bold">Plantillas integradas en PanelFit</h3>
          <p className="text-text-secondary leading-relaxed">Crea tus plantillas una vez y asígnalas a nuevos clientes en segundos. El cliente accede por enlace, sin app.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button onClick={onDemo} className="px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:opacity-90 flex items-center justify-center gap-2">
              Ver demo <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onRegister} className="px-6 py-3 border border-border rounded-xl hover:bg-bg transition-colors text-sm">Solicitar acceso gratis</button>
          </div>
        </div>
        <div className="mt-12 space-y-3">
          <h3 className="text-lg font-semibold mb-4">Artículos relacionados</h3>
          <a href="/blog/como-hacer-seguimiento-clientes-gym" className="block p-4 border border-border rounded-xl hover:bg-surface transition-colors">
            <p className="font-medium">Cómo hacer seguimiento de clientes en el gym</p>
            <p className="text-sm text-text-secondary mt-1">Métricas clave y sistema de seguimiento semanal</p>
          </a>
          <a href="/blog/mejor-software-entrenador-personal" className="block p-4 border border-border rounded-xl hover:bg-surface transition-colors">
            <p className="font-medium">Mejor software para entrenador personal en 2025</p>
            <p className="text-sm text-text-secondary mt-1">Comparativa real entre las herramientas más usadas</p>
          </a>
        </div>
      </article>
      <footer className="border-t border-border px-4 sm:px-8 py-8 text-center text-sm text-text-secondary">
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <a href="/" className="hover:text-text">Inicio</a>
          <a href="/blog" className="hover:text-text">Blog</a>
          <a href="/precios" className="hover:text-text">Precios</a>
        </div>
        <p>© 2025 PanelFit</p>
      </footer>
    </div>
  )
}
