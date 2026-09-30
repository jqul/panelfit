import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

serve(async (req) => {
  // Supabase database webhooks send a POST with the record payload
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Supabase webhook payload: { type: 'INSERT', record: { ... } }
  const record = body.record ?? body
  const email: string = record.email
  const displayName: string = record.displayName || record.email?.split('@')[0] || 'Entrenador'

  if (!email) return new Response('No email', { status: 400 })

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#0f172a;padding:32px 40px;text-align:center;">
          <span style="font-size:28px;font-weight:700;color:#ffffff;font-family:Georgia,serif;">
            Panel<span style="color:#6366f1;font-style:italic;">Fit</span>
          </span>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 40px 32px;">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">
            Hola ${displayName}, bienvenido a PanelFit 👋
          </h1>
          <p style="margin:0 0 16px;color:#475569;line-height:1.6;">
            Tu solicitud de acceso está recibida. Te activaremos manualmente en las próximas horas.
            Mientras tanto puedes explorar la demo para familiarizarte con la plataforma.
          </p>

          <!-- Steps -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            ${[
              ['1', 'Explora la demo', 'Ve cómo funciona el panel con clientes ficticios.'],
              ['2', 'Preparamos tu cuenta', 'Te activamos en menos de 24 h (normalmente en horas).'],
              ['3', 'Añade tu primer cliente', 'En 2 minutos tienes el primer panel listo.'],
            ].map(([n, title, desc]) => `
            <tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="width:32px;height:32px;background:#6366f1;border-radius:50%;text-align:center;vertical-align:middle;">
                  <span style="color:#fff;font-weight:700;font-size:14px;">${n}</span>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0;font-weight:600;color:#0f172a;font-size:14px;">${title}</p>
                  <p style="margin:4px 0 0;color:#64748b;font-size:13px;">${desc}</p>
                </td>
              </tr></table>
            </td></tr>`).join('')}
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
            <tr><td align="center">
              <a href="https://panelfit.vercel.app/?demo=1"
                 style="display:inline-block;background:#6366f1;color:#ffffff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
                Ver la demo →
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">
            ¿Tienes dudas? Responde a este email o escríbeme a
            <a href="mailto:javier.quinones.lopez@gmail.com" style="color:#6366f1;">javier.quinones.lopez@gmail.com</a>
          </p>
          <p style="margin:8px 0 0;color:#cbd5e1;font-size:11px;">PanelFit · Software para entrenadores personales</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  const headers = {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  }

  // Email de bienvenida al nuevo entrenador
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from: 'PanelFit <onboarding@resend.dev>',
      to: [email],
      subject: '¡Bienvenido a PanelFit! Tu acceso está en camino',
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error (welcome):', err)
    return new Response(JSON.stringify({ error: err }), { status: 500 })
  }

  // Notificación al admin
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from: 'PanelFit <onboarding@resend.dev>',
      to: ['javier.quinones.lopez@gmail.com'],
      subject: `🆕 Nuevo registro en PanelFit: ${displayName}`,
      html: `
        <p style="font-family:sans-serif;font-size:15px;">
          Nuevo entrenador registrado en PanelFit:
        </p>
        <ul style="font-family:sans-serif;font-size:15px;">
          <li><strong>Nombre:</strong> ${displayName}</li>
          <li><strong>Email:</strong> ${email}</li>
        </ul>
        <p style="font-family:sans-serif;font-size:15px;">
          <a href="https://panelfit.vercel.app" style="color:#6366f1;">Ir al panel de admin →</a>
        </p>
      `,
    }),
  })

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
