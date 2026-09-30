import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Obtener entrenadores con check-in automático activado
  const { data: trainers, error } = await supabase
    .from('entrenadores')
    .select('uid, email, "displayName"')
    .eq('auto_checkin_enabled', true)
    .eq('approved', true)

  if (error || !trainers?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 })
  }

  const hoy = new Date().toISOString().split('T')[0]
  const haceUnaS = new Date()
  haceUnaS.setDate(haceUnaS.getDate() - 7)
  const haceDosSem = new Date()
  haceDosSem.setDate(haceDosSem.getDate() - 14)

  let sent = 0

  for (const trainer of trainers) {
    // Obtener clientes
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id, name, surname, token')
      .eq('trainerId', trainer.uid)

    if (!clientes?.length) continue

    // Obtener registros de la última semana
    const ids = clientes.map((c: any) => c.id)
    const { data: regs } = await supabase
      .from('registros')
      .select('clientId, logs')
      .in('clientId', ids)

    const logsMap: Record<string, string[]> = {}
    for (const reg of (regs || [])) {
      const dates = Object.values(reg.logs || {})
        .filter((l: any) => l.dateDone)
        .map((l: any) => l.dateDone as string)
      logsMap[reg.clientId] = [...new Set(dates)].sort().reverse()
    }

    // Clasificar clientes
    const activos: any[] = []
    const inactivos7: any[] = []
    const inactivos14: any[] = []

    for (const c of clientes) {
      const dates = logsMap[c.id] || []
      const last = dates[0]
      if (!last || new Date(last) < haceDosSem) {
        inactivos14.push({ ...c, last })
      } else if (new Date(last) < haceUnaS) {
        inactivos7.push({ ...c, last })
      } else {
        activos.push({ ...c, last })
      }
    }

    const BASE = 'https://panelfit.vercel.app'

    const clienteRow = (c: any, color: string) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">
          <span style="font-size:8px;width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;margin-right:8px;vertical-align:middle;"></span>
          ${c.name} ${c.surname}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">
          ${c.last ? `Último: ${c.last}` : 'Sin actividad registrada'}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">
          <a href="${BASE}/?c=${c.token}" style="color:#6366f1;font-size:13px;text-decoration:none;">Ver panel →</a>
        </td>
      </tr>`

    const html = `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:#0f172a;padding:24px 32px;">
          <span style="font-size:24px;font-weight:700;color:#fff;font-family:Georgia,serif;">
            Panel<span style="color:#6366f1;font-style:italic;">Fit</span>
          </span>
          <span style="color:#94a3b8;font-size:13px;margin-left:12px;">Resumen semanal</span>
        </td></tr>
        <tr><td style="padding:28px 32px 8px;">
          <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#0f172a;">Buenos días, ${trainer.displayName} 👋</p>
          <p style="margin:0;color:#64748b;font-size:14px;">Aquí tienes el estado de tus clientes esta semana (${hoy}).</p>
        </td></tr>

        ${inactivos14.length ? `
        <tr><td style="padding:20px 32px 8px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#ef4444;text-transform:uppercase;letter-spacing:0.05em;">⚠️ Sin actividad +14 días (${inactivos14.length})</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fee2e2;border-radius:8px;overflow:hidden;">
            ${inactivos14.map((c: any) => clienteRow(c, '#ef4444')).join('')}
          </table>
        </td></tr>` : ''}

        ${inactivos7.length ? `
        <tr><td style="padding:20px 32px 8px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#f59e0b;text-transform:uppercase;letter-spacing:0.05em;">🕐 Sin actividad esta semana (${inactivos7.length})</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fef3c7;border-radius:8px;overflow:hidden;">
            ${inactivos7.map((c: any) => clienteRow(c, '#f59e0b')).join('')}
          </table>
        </td></tr>` : ''}

        ${activos.length ? `
        <tr><td style="padding:20px 32px 8px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#22c55e;text-transform:uppercase;letter-spacing:0.05em;">✅ Activos esta semana (${activos.length})</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dcfce7;border-radius:8px;overflow:hidden;">
            ${activos.map((c: any) => clienteRow(c, '#22c55e')).join('')}
          </table>
        </td></tr>` : ''}

        <tr><td style="padding:24px 32px;">
          <a href="${BASE}" style="display:inline-block;background:#6366f1;color:#fff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
            Ir al panel →
          </a>
        </td></tr>

        <tr><td style="padding:16px 32px;border-top:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">
            Recibes este email porque tienes el check-in semanal activado en PanelFit.
            <a href="${BASE}" style="color:#6366f1;">Desactivar</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'PanelFit <onboarding@resend.dev>',
        to: [trainer.email],
        subject: `📊 Resumen semanal PanelFit — ${inactivos14.length + inactivos7.length} clientes necesitan atención`,
        html,
      }),
    })

    if (res.ok) sent++
  }

  return new Response(JSON.stringify({ ok: true, sent }), { status: 200 })
})
