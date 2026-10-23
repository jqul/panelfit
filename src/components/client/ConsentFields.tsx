import { useState } from 'react'
import { CONSENT_SALUD_LABEL, CONSENT_SALUD_TEXT, CONSENT_FOTOS_LABEL, CONSENT_FOTOS_TEXT, PRIVACY_INFO } from '../../lib/privacyTexts'

interface Props {
  salud: boolean
  fotos: boolean
  onSalud: (v: boolean) => void
  onFotos: (v: boolean) => void
}

// Casillas de consentimiento (sin marcar de entrada: el consentimiento tiene que
// ser un acto explícito) y la información básica sobre el tratamiento de datos.
export function ConsentFields({ salud, fotos, onSalud, onFotos }: Props) {
  const [info, setInfo] = useState(false)
  return (
    <div className="bg-card border border-border rounded-2xl p-3.5 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Tus datos y tu privacidad</p>
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input type="checkbox" checked={salud} onChange={e => onSalud(e.target.checked)} className="mt-0.5 w-4 h-4 flex-shrink-0" />
        <span className="text-sm"><span className="font-semibold">{CONSENT_SALUD_LABEL}</span> <span className="text-muted">(obligatorio)</span>
          <span className="block text-xs text-muted leading-relaxed mt-1">{CONSENT_SALUD_TEXT}</span></span>
      </label>
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input type="checkbox" checked={fotos && salud} disabled={!salud} onChange={e => onFotos(e.target.checked)} className="mt-0.5 w-4 h-4 flex-shrink-0" />
        <span className="text-sm"><span className="font-semibold">{CONSENT_FOTOS_LABEL}</span> <span className="text-muted">(opcional)</span>
          <span className="block text-xs text-muted leading-relaxed mt-1">{CONSENT_FOTOS_TEXT}</span></span>
      </label>
      <button type="button" onClick={() => setInfo(v => !v)} className="text-xs font-semibold text-muted text-left underline underline-offset-2">
        Más información sobre tus datos {info ? '▲' : '▼'}
      </button>
      {info && (
        <dl className="space-y-2">
          {PRIVACY_INFO.map(i => (
            <div key={i.titulo}>
              <dt className="text-xs font-semibold">{i.titulo}</dt>
              <dd className="text-xs text-muted leading-relaxed">{i.texto}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
