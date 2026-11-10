// Aviso de fin de descanso con el móvil bloqueado: "⏱️ ¡A por la siguiente serie!". Usa los mismos secrets VAPID que
// send-push.
//
// La app del cliente, al empezar un descanso, marca un token con marcar_descanso() (tabla descansos, con la hora a la
// que acaba) y llama aquí con su sesión. Esta función responde al momento y, en segundo plano, espera hasta la hora de
// fin y manda el push solo si el token sigue siendo el mismo (si lo saltó, lo alargó o lo pausó, la app lo cambió o lo
// borró). Una función de Edge dura como mucho ~150 s en este plan: en los descansos más largos espera un tramo y se
// vuelve a llamar a sí misma con el secreto 'fin_descanso' de internal_webhook_secrets (nunca en el código).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import webpush from "npm:web-push@3.6.7"
import { createClient } from "jsr:@supabase/supabase-js@2"

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? ""
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? ""
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:soporte@panelfit.app"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")

const TRAMO_MS = 110_000 // lo máximo que espera una llamada antes de pasar el relevo
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// La app la llama desde el navegador: hace falta CORS (la autorización es la sesión o el secreto, no el origen)
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } })
const dormir = (ms: number) => new Promise(r => setTimeout(r, ms))

function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

async function secreto(): Promise<string | null> {
  const { data } = await supabase.from("internal_webhook_secrets").select("secret").eq("name", "fin_descanso").maybeSingle()
  return data?.secret ?? null
}

/** El descanso sigue en pie con ese token: su hora de fin, o null si lo cambiaron o lo cancelaron. */
async function finSiSigue(clientId: string, token: string): Promise<number | null> {
  const { data } = await supabase.from("descansos").select("token, fin_at").eq("client_id", clientId).maybeSingle()
  return data && data.token === token ? new Date(data.fin_at).getTime() : null
}

async function avisar(clientId: string, cuerpo: string) {
  const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("client_id", clientId)
  const payload = JSON.stringify({ title: "⏱️ ¡A por la siguiente serie!", body: cuerpo || "Se acabó el descanso", url: "/", tag: "pf-descanso", vibrar: true })
  await Promise.allSettled((subs || []).map(sub =>
    webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 60, urgency: "high" })
      .catch(async (err: any) => {
        if (err?.statusCode === 404 || err?.statusCode === 410) await supabase.from("push_subscriptions").delete().eq("id", sub.id)
      })))
}

/** Espera (un tramo como mucho) y, si el descanso sigue en pie, avisa o pasa el relevo a otra llamada. */
async function esperar(clientId: string, token: string, cuerpo: string) {
  const fin = await finSiSigue(clientId, token)
  if (fin === null) return
  const falta = fin - Date.now()
  if (falta > TRAMO_MS) {
    await dormir(TRAMO_MS)
    if (await finSiSigue(clientId, token) === null) return
    const s = await secreto()
    if (!s) return
    await fetch(`${SUPABASE_URL}/functions/v1/fin-descanso`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${s}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ clientId, token, cuerpo }),
    }).catch(() => {})
    return
  }
  if (falta > 0) await dormir(falta)
  if (await finSiSigue(clientId, token) === null) return
  await avisar(clientId, cuerpo)
  await supabase.from("descansos").delete().eq("client_id", clientId).eq("token", token)
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return json({ error: "VAPID keys not configured" }, 500)

  let body: { token?: unknown; cuerpo?: unknown; clientId?: unknown }
  try { body = await req.json() } catch { return json({ error: "JSON" }, 400) }
  const token = typeof body.token === "string" && body.token.length >= 8 && body.token.length <= 64 ? body.token : null
  const cuerpo = typeof body.cuerpo === "string" ? body.cuerpo.replace(/\s+/g, " ").trim().slice(0, 140) : ""
  if (!token) return json({ error: "token" }, 400)

  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")
  let clientId: string | null = null
  // Relevo de una llamada anterior, con el secreto interno
  const s = await secreto()
  if (s && bearer && igual(bearer, s)) {
    clientId = typeof body.clientId === "string" && UUID.test(body.clientId) ? body.clientId : null
  } else if (bearer) {
    // El propio cliente, con su sesión
    const auth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${bearer}` } } })
    const { data: u } = await auth.auth.getUser(bearer)
    if (u?.user?.id) {
      const { data: c } = await supabase.from("clientes").select("id").eq("auth_user_id", u.user.id).maybeSingle()
      clientId = c?.id ?? null
    }
  }
  if (!clientId) return json({ error: "Unauthorized" }, 401)
  if (await finSiSigue(clientId, token) === null) return json({ ok: false, motivo: "sin descanso en curso" })

  EdgeRuntime.waitUntil(esperar(clientId, token, cuerpo))
  return json({ ok: true }, 202)
})
