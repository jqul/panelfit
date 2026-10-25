// Clasificaciones propias del entrenador (grupos musculares, especialidades y etiquetas): viven en el navegador
// (localStorage) y las comparten la pestaña, el panel de configuración y el formulario del ejercicio.

export const TAGS_KEY = (uid: string) => `pf_tags_${uid}`
export const CATS_KEY = (uid: string) => `pf_cats_${uid}`
export const ESPS_KEY = (uid: string) => `pf_esps_${uid}`
export const FAV_KEY  = (uid: string) => `pf_fav_${uid}`

export const DEFAULT_CATS = ['Pecho','Espalda','Hombros','Bíceps','Tríceps','Antebrazo','Piernas','Glúteos','Core','Cardio','Funcional/Olímpico','General']

export interface CustomTag  { id: string; label: string; emoji: string; colorIdx: number }
export interface CustomEsp  { id: string; label: string; emoji: string }

export const TAG_COLORS = [
  { bg:'bg-blue-100',   text:'text-blue-700',   border:'border-blue-200'  },
  { bg:'bg-purple-100', text:'text-purple-700',  border:'border-purple-200'},
  { bg:'bg-pink-100',   text:'text-pink-700',    border:'border-pink-200'  },
  { bg:'bg-green-100',  text:'text-green-700',   border:'border-green-200' },
  { bg:'bg-orange-100', text:'text-orange-700',  border:'border-orange-200'},
  { bg:'bg-teal-100',   text:'text-teal-700',    border:'border-teal-200'  },
  { bg:'bg-rose-100',   text:'text-rose-700',    border:'border-rose-200'  },
  { bg:'bg-amber-100',  text:'text-amber-700',   border:'border-amber-200' },
]

export function load<T>(key: string, def: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
}
export function save<T>(key: string, val: T) { localStorage.setItem(key, JSON.stringify(val)) }

export function TagBadge({ tag }: { tag: CustomTag }) {
  const c = TAG_COLORS[(tag.colorIdx ?? 0) % TAG_COLORS.length] ?? TAG_COLORS[0]
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {tag.emoji} {tag.label}
    </span>
  )
}
