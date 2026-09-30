// Envía una notificación push real a las suscripciones de un entrenador o cliente.
// Requiere los secrets VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
// configurados en el proyecto de Supabase (supabase secrets set ...).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import webpush from "npm:web-push@3.6.7"
import { createClient } from "jsr:@supabase/supabase-js@2"

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? ""
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? ""
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:soporte@panelfit.app"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
)

// Solo se permite mandar el push a uno mismo o a la contraparte real de la
// relación entrenador-cliente del que llama — nunca a un id arbitrario del
// body, que es lo que permitía a cualquier usuario autenticado notificar a
// cuenta ajena.
async function resolveAllowedTarget(authHeader: string, trainerId?: string, clientId?: string) {
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  if (!jwt) return null
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
  const { data: userData } = await authClient.auth.getUser(jwt)
  const uid = userData?.user?.id
  if (!uid) return null

  const { data: trainerRow } = await supabase
    .from('entrenadores').select('uid').eq('uid', uid).eq('approved', true).maybeSingle()
  if (trainerRow) {
    if (trainerId && trainerId === uid) return { trainerId }
    if (clientId) {
      const { data: c } = await supabase.from('clientes').select('id').eq('id', clientId).eq('trainerId', uid).maybeSingle()
      if (c) return { clientId }
    }
    return null
  }

  const { data: clientRow } = await supabase
    .from('clientes').select('id, "trainerId"').eq('auth_user_id', uid).maybeSingle()
  if (clientRow) {
    if (clientId && clientId === clientRow.id) return { clientId }
    if (trainerId && trainerId === clientRow.trainerId) return { trainerId }
    return null
  }

  return null
}

// Solo rutas internas relativas — nunca una URL externa (la notificación
// pushea "url" tal cual y el service worker la abre al pulsarla).
function safeUrl(url: unknown): string {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return '/'
  return url.slice(0, 200)
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: "VAPID keys not configured" }), { status: 500 })
  }

  try {
    const { trainerId, clientId, title, body, url } = await req.json()
    if (!trainerId && !clientId) {
      return new Response(JSON.stringify({ error: "trainerId or clientId required" }), { status: 400 })
    }

    const target = await resolveAllowedTarget(req.headers.get('Authorization') || '', trainerId, clientId)
    if (!target) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    let query = supabase.from("push_subscriptions").select("*")
    query = target.trainerId ? query.eq("trainer_id", target.trainerId) : query.eq("client_id", target.clientId)
    const { data: subs, error } = await query
    if (error) throw error

    const payload = JSON.stringify({
      title: String(title || "PanelFit").slice(0, 100),
      body: String(body || "").slice(0, 300),
      url: safeUrl(url),
    })

    const results = await Promise.allSettled(
      (subs || []).map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        ).catch(async (err: any) => {
          // Suscripción caducada o inválida -> limpiar
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id)
          }
          throw err
        })
      )
    )

    const sent = results.filter((r) => r.status === "fulfilled").length
    return new Response(JSON.stringify({ sent, total: subs?.length || 0 }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
