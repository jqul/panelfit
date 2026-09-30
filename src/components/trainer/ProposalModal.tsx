import { useState } from 'react'
import { X, FileText } from 'lucide-react'
import { TrainerTier, TIER_LABEL, TIER_FEATURES } from '../../lib/tier'

function buildProposalHtml(opts: {
  nombre: string; tier: TrainerTier; clientLimit: number; precio: number; notas: string
}) {
  const { nombre, tier, clientLimit, precio, notas } = opts
  const features = TIER_FEATURES[tier]
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" />
<title>Propuesta PanelFit — ${nombre}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; max-width: 640px; margin: 48px auto; padding: 0 24px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .accent { color: #b45309; font-style: italic; }
  .muted { color: #666; font-size: 13px; }
  .price { font-size: 36px; font-weight: bold; margin: 24px 0 4px; }
  .tier-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; background: #1a1a1a; color: white; font-size: 12px; font-weight: bold; margin-bottom: 16px; }
  ul { padding-left: 0; list-style: none; margin: 16px 0; }
  li { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
  li:before { content: "✓ "; color: #16a34a; font-weight: bold; }
  .notes { margin-top: 24px; padding: 16px; background: #f7f7f5; border-radius: 8px; font-size: 13px; white-space: pre-wrap; }
  .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; }
  @media print { body { margin: 0; padding: 24px; } }
</style></head>
<body>
  <h1>Panel<span class="accent">Fit</span></h1>
  <p class="muted">Propuesta comercial para ${nombre}</p>
  <div class="tier-badge">${TIER_LABEL[tier]}</div>
  <p class="price">${precio}€<span style="font-size:16px;font-weight:normal;color:#666;"> / mes</span></p>
  <p class="muted">Hasta ${clientLimit} clientes incluidos</p>
  <ul>${features.map(f => `<li>${f}</li>`).join('')}</ul>
  ${notas ? `<div class="notes">${notas.replace(/</g, '&lt;')}</div>` : ''}
  <p class="footer">Propuesta generada el ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} · PanelFit</p>
  <script>window.onload = () => window.print()</script>
</body></html>`
}

export function ProposalModal({ onClose }: { onClose: () => void }) {
  const [nombre, setNombre] = useState('')
  const [tier, setTier] = useState<TrainerTier>('basico')
  const [clientLimit, setClientLimit] = useState(5)
  const [precio, setPrecio] = useState(29)
  const [notas, setNotas] = useState('')

  const generar = () => {
    const html = buildProposalHtml({ nombre: nombre.trim() || 'Entrenador/a', tier, clientLimit, precio, notas })
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="fixed inset-0 z-[70] bg-ink/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-3xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5" /> Generar propuesta</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-alt text-muted"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-muted">Rellena lo acordado en la llamada y se abrirá un documento listo para guardar como PDF (Ctrl+P → Guardar como PDF).</p>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Nombre / negocio</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Marta Pérez Coaching"
            className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">Nivel</label>
          <div className="flex gap-2">
            {(['basico', 'alto_rendimiento'] as const).map(t => (
              <button key={t} onClick={() => setTier(t)}
                className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${tier === t ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-ink'}`}>
                {TIER_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Límite de clientes</label>
            <input type="number" min={1} value={clientLimit} onChange={e => setClientLimit(Number(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Precio mensual (€)</label>
            <input type="number" min={0} value={precio} onChange={e => setPrecio(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Notas (opcional)</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
            placeholder="Condiciones acordadas, descuentos, fecha de inicio..."
            className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none resize-none" />
        </div>

        <button onClick={generar} className="w-full py-3 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90">
          Generar propuesta
        </button>
      </div>
    </div>
  )
}
