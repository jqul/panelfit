import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ConsentGate } from './ConsentGate'
import { CONSENT_SALUD_LABEL, CONSENT_FOTOS_LABEL } from '../../lib/privacyTexts'

const props = { trainerName: 'Alex', brandColor: '#6e5438', onGrant: async () => true, onLogout: () => {} }

describe('ConsentGate', () => {
  it('pide el consentimiento con las casillas sin marcar y el botón bloqueado', () => {
    const html = renderToStaticMarkup(<ConsentGate withdrawn={false} {...props} />)
    expect(html).toContain(CONSENT_SALUD_LABEL)
    expect(html).toContain(CONSENT_FOTOS_LABEL)
    expect(html).not.toContain('checked')              // el consentimiento tiene que ser un acto explícito
    expect(html).toMatch(/<button[^>]*disabled[^>]*>.*Aceptar y continuar/) // no se puede continuar sin aceptar
  })
  it('la casilla de fotos está bloqueada mientras no se acepte la de salud', () => {
    const html = renderToStaticMarkup(<ConsentGate withdrawn={false} {...props} />)
    const fotos = html.slice(html.indexOf('type="checkbox"', html.indexOf('type="checkbox"') + 1))
    expect(fotos.slice(0, fotos.indexOf('>'))).toContain('disabled')
  })
  it('si lo retiró, lo explica y deja volver a darlo', () => {
    const html = renderToStaticMarkup(<ConsentGate withdrawn {...props} />)
    expect(html).toContain('Has retirado tu consentimiento')
    expect(html).toContain('Cerrar sesión')
  })
})
