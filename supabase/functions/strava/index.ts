// Strava para el cliente: conectar su cuenta (OAuth), traer sus entrenos a `actividades` y desconectarla. Los relojes
// (Garmin, Coros, Polar, Suunto, Wahoo, Apple vía apps…) ya sincronizan con Strava, así que con esto le llegan solos.
//
// Secrets: STRAVA_CLIENT_ID y STRAVA_CLIENT_SECRET (los de la aplicación creada en strava.com/settings/api). Los tokens
// de cada cliente se guardan en strava_conexiones, que solo lee esta función con la clave de servicio.
//
// Acciones (POST, con la sesión del cliente):
//   { accion: 'url', vuelta }     → la dirección de autorización de Strava (vuelve a `vuelta` con ?code=…&state=…)
//   { accion: 'conectar', code }  → cambia el código por los tokens y trae los entrenos de los últimos 30 días
//   { accion: 'sincronizar' }     → trae los nuevos (como mucho una vez cada 10 minutos)
//   { accion: 'desconectar' }     → revoca el acceso en Strava y borra los tokens (los entrenos ya traídos se quedan)
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID") ?? ""
const CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET") ?? ""
const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } })
// Solo se vuelve a la propia app
const VUELTAS = [/^https:\/\/panelfit\.vercel\.app\//, /^https:\/\/panelfit-[a-z0-9-]+\.vercel\.app\//, /^http:\/\/localhost(:\d+)?\//, /^http:\/\/127\.0\.0\.1(:\d+)?\//]

type Conexion = { client_id: string; athlete_id: number; access_token: string; refresh_token: string; expires_at: string; ultima_sync: string | null }

/** Deporte de PanelFit a partir del sport_type de Strava. */
function deporte(t: string): string {
  if (/Run/.test(t)) return "correr"
  if (/Ride|Bike|Velomobile|Handcycle/.test(t)) return "bici"
  if (/Walk|Hike|Snowshoe/.test(t)) return "caminar"
  if (/Swim/.test(t)) return "nadar"
  if (/Row|Kayak|Canoe/.test(t)) return "remo"
  if (/Weight|Crossfit|Workout|Hiit/i.test(t)) return "fuerza"
  return "otro"
}

async function tokenStrava(body: Record<string, string>) {
  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...body }),
  })
  if (!r.ok) throw new Error(`Strava token ${r.status}`)
  return await r.json() as { access_token: string; refresh_token: string; expires_at: number; scope?: string; athlete?: { id: number } }
}

/** El token de acceso vigente (lo renueva si caduca en menos de 5 minutos). */
async function acceso(c: Conexion): Promise<string> {
  if (new Date(c.expires_at).getTime() - Date.now() > 300_000) return c.access_token
  const t = await tokenStrava({ grant_type: "refresh_token", refresh_token: c.refresh_token })
  await supabase.from("strava_conexiones").update({
    access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(t.expires_at * 1000).toISOString(),
  }).eq("client_id", c.client_id)
  return t.access_token
}

/** Trae a `actividades` los entrenos desde `desde` (segundos). Devuelve cuántos nuevos. */
async function traer(c: Conexion, desde: number): Promise<number> {
  const token = await acceso(c)
  const r = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${desde}&per_page=50`, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) throw new Error(`Strava actividades ${r.status}`)
  const lista = await r.json() as any[]
  let nuevas = 0
  for (const a of lista) {
    const dur = Math.round(a.moving_time || a.elapsed_time || 0)
    if (!dur) continue
    const n = (x: unknown, max: number) => (typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max ? Math.round(x) : null)
    const hr = (x: unknown) => (typeof x === "number" && x >= 30 && x <= 250 ? Math.round(x) : null)
    const { error } = await supabase.from("actividades").insert({
      client_id: c.client_id, origen: "strava", external_id: String(a.id),
      fecha: String(a.start_date_local || a.start_date).slice(0, 10), inicio: a.start_date ?? null,
      deporte: deporte(String(a.sport_type || a.type || "")), nombre: String(a.name || "").slice(0, 80),
      duracion_s: Math.min(dur, 86400), distancia_m: n(a.distance, 1_000_000), desnivel_m: n(a.total_elevation_gain, 20_000),
      fc_media: hr(a.average_heartrate), fc_max: hr(a.max_heartrate), kcal: n(a.kilojoules, 20_000),
    })
    if (!error) nuevas++ // 23505: ya estaba (de Strava o importado a mano con la misma hora de inicio)
  }
  await supabase.from("strava_conexiones").update({ ultima_sync: new Date().toISOString() }).eq("client_id", c.client_id)
  return nuevas
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
  if (!CLIENT_ID || !CLIENT_SECRET) return json({ error: "Strava no está configurado", configurado: false }, 503)

  // El cliente que llama
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")
  const auth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } } })
  const { data: u } = await auth.auth.getUser(jwt)
  if (!u?.user?.id) return json({ error: "Unauthorized" }, 401)
  const { data: cliente } = await supabase.from("clientes").select("id").eq("auth_user_id", u.user.id).maybeSingle()
  if (!cliente) return json({ error: "Solo para clientes" }, 403)

  let body: { accion?: string; code?: string; vuelta?: string }
  try { body = await req.json() } catch { return json({ error: "JSON" }, 400) }

  try {
    if (body.accion === "url") {
      const vuelta = String(body.vuelta || "")
      if (!VUELTAS.some(r => r.test(vuelta))) return json({ error: "vuelta" }, 400)
      const state = crypto.randomUUID()
      const url = `https://www.strava.com/oauth/authorize?client_id=${encodeURIComponent(CLIENT_ID)}&response_type=code&approval_prompt=auto`
        + `&scope=${encodeURIComponent("read,activity:read_all")}&redirect_uri=${encodeURIComponent(vuelta)}&state=${state}`
      return json({ url, state })
    }

    if (body.accion === "conectar") {
      if (!body.code || typeof body.code !== "string" || body.code.length > 200) return json({ error: "code" }, 400)
      const t = await tokenStrava({ grant_type: "authorization_code", code: body.code })
      if (!t.athlete?.id) return json({ error: "Strava no devolvió el atleta" }, 502)
      if (!(t.scope || "").includes("activity:read")) return json({ error: "Hace falta permiso para leer tus actividades", permiso: false }, 400)
      const fila = {
        client_id: cliente.id, athlete_id: t.athlete.id, access_token: t.access_token, refresh_token: t.refresh_token,
        expires_at: new Date(t.expires_at * 1000).toISOString(), scope: t.scope || "", ultima_sync: null,
      }
      const { error } = await supabase.from("strava_conexiones").upsert(fila)
      if (error) throw error
      const nuevas = await traer(fila as Conexion, Math.floor(Date.now() / 1000) - 30 * 86400)
      return json({ ok: true, nuevas })
    }

    const { data: c } = await supabase.from("strava_conexiones").select("*").eq("client_id", cliente.id).maybeSingle()
    if (!c) return json({ ok: false, conectado: false })

    if (body.accion === "sincronizar") {
      const ultima = c.ultima_sync ? new Date(c.ultima_sync).getTime() : 0
      if (Date.now() - ultima < 10 * 60_000) return json({ ok: true, nuevas: 0, esperar: true })
      // Desde un día antes de la última vez (por si subió algo con retraso), como mucho 30 días atrás
      const desde = Math.max(Math.floor(ultima / 1000) - 86400, Math.floor(Date.now() / 1000) - 30 * 86400)
      return json({ ok: true, nuevas: await traer(c as Conexion, desde) })
    }

    if (body.accion === "desconectar") {
      try {
        const token = await acceso(c as Conexion)
        await fetch("https://www.strava.com/oauth/deauthorize", { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      } catch { /* aunque falle en Strava, aquí se borra */ }
      await supabase.from("strava_conexiones").delete().eq("client_id", cliente.id)
      return json({ ok: true })
    }

    return json({ error: "accion" }, 400)
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 502)
  }
})
