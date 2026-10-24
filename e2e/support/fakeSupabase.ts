import type { BrowserContext, Route, Request } from '@playwright/test'

// Un "Supabase de mentira" en memoria para las pruebas end-to-end. Se engancha a la red del navegador
// (nunca se habla con la base de datos real) y entiende lo justo de PostgREST, Auth y Storage para los
// flujos que se prueban. Lo que falta se registra en `unhandled` y los tests lo comprueban vacío, así que
// una consulta nueva de la app que el simulador no entienda hace fallar la prueba en vez de pasar en falso.
//
// Es una simulación: las funciones SQL reales (export_client_data, delete_client_data...) se prueban aparte
// con PGlite (supabase/hardening/tests). Aquí se prueba que la APP hace las llamadas correctas y reacciona bien.

export const FAKE_URL = 'https://e2e-supabase.test'
export const FAKE_ANON_KEY = 'e2e-anon-key'

type Row = Record<string, any>
type Tables = Record<string, Row[]>

// Tablas con datos de un cliente y la columna que lo identifica (como client_data_tables() en SQL).
const CLIENT_TABLES: [string, string][] = [
  ['checkins', 'clientId'], ['ciclo_tracking', 'client_id'], ['citas', 'client_id'], ['cohorte_clientes', 'client_id'],
  ['dietas', 'cliente_id'], ['encuestas', 'cliente_id'], ['exercise_usage_events', 'client_id'], ['foto_sessions', 'client_id'],
  ['fotos', 'cliente_id'], ['fv_profile_trials', 'client_id'], ['habitos', 'clientId'], ['notificaciones', 'client_id'],
  ['plan_history', 'clientId'], ['planes', 'clientId'], ['programacion_mensajes', 'clientId'], ['progress_photos', 'clientId'],
  ['push_subscriptions', 'client_id'], ['readiness_checkins', 'clientId'], ['registros', 'clientId'], ['registros_dolor', 'clientId'],
  ['registros_habitos', 'clientId'], ['registros_peso', 'clientId'], ['session_load', 'client_id'], ['session_reactions', 'clientId'],
  ['survey_responses', 'client_id'], ['survey_schedules', 'client_id'], ['test_resultados', 'client_id'], ['valoraciones', 'client_id'],
  ['video_feedback', 'client_id'], ['waivers', 'clientId'], ['weekly_reviews', 'clientId'],
]
const UNIQUE: Record<string, string[]> = { registros: ['clientId'], planes: ['clientId'], clientes: ['id', 'token'], entrenadores: ['uid'] }
const NO_AUTO_ID = new Set(['registros', 'planes', 'entrenadores'])

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (sub: string, email: string) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400 })}.firma-e2e`
const subOf = (req: Request): string | null => {
  const m = (req.headers()['authorization'] || '').match(/^Bearer ([^.]+)\.([^.]+)\./)
  if (!m) return null
  try { return JSON.parse(Buffer.from(m[2], 'base64url').toString()).sub ?? null } catch { return null }
}

const CORS = {
  'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*',
  'access-control-expose-headers': '*',
}
const json = (route: Route, status: number, body: unknown, extra: Record<string, string> = {}) =>
  route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) })
const empty = (route: Route, status = 204) => route.fulfill({ status, headers: CORS })

export interface AuthUser { id: string; email: string; password: string }

export class FakeSupabase {
  tables: Tables = {}
  users: AuthUser[] = []
  /** Peticiones que el simulador no sabe responder (el test comprueba que está vacío). */
  unhandled: string[] = []
  /** Ficheros de Storage por bucket. */
  storage: Record<string, string[]> = {}
  removedFiles: { bucket: string; paths: string[] }[] = []
  offline = false
  /** Todas las escrituras (POST/PATCH/DELETE a la API), por si un test quiere saber qué se envió. */
  writes: { method: string; table: string; body: unknown }[] = []

  seed(table: string, ...rows: Row[]) { (this.tables[table] ||= []).push(...rows) }
  rows(table: string): Row[] { return (this.tables[table] ||= []) }
  addUser(email: string, password: string, id: string = crypto.randomUUID()): AuthUser { const u = { id, email, password }; this.users.push(u); return u }

  async attach(context: BrowserContext) {
    await context.route(`${FAKE_URL}/**`, route => this.handle(route).catch(e => { this.unhandled.push(`ERROR ${route.request().method()} ${route.request().url()}: ${e}`); return json(route, 500, { message: String(e) }) }))
  }

  private session(u: AuthUser) {
    const access = jwt(u.id, u.email)
    return {
      access_token: access, token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400,
      refresh_token: `refresh-${u.id}`,
      user: { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() },
    }
  }

  private async handle(route: Route) {
    const req = route.request()
    const url = new URL(req.url())
    const method = req.method()
    if (method === 'OPTIONS') return empty(route)
    if (this.offline) return route.abort('internetdisconnected')
    const p = url.pathname

    if (p.startsWith('/auth/v1/')) return this.auth(route, req, p.slice('/auth/v1/'.length), url)
    if (p.startsWith('/rest/v1/rpc/')) return this.rpc(route, req, p.slice('/rest/v1/rpc/'.length))
    if (p.startsWith('/rest/v1/')) return this.rest(route, req, p.slice('/rest/v1/'.length), url)
    if (p.startsWith('/storage/v1/')) return this.storageApi(route, req, p.slice('/storage/v1/'.length))
    if (p.startsWith('/functions/v1/')) return json(route, 200, {})
    this.unhandled.push(`${method} ${url.pathname}${url.search}`)
    return json(route, 404, { message: 'no simulado' })
  }

  // ── Auth ──
  private async auth(route: Route, req: Request, path: string, url: URL) {
    const body = req.postDataJSON?.() ?? {}
    if (path === 'signup') {
      if (this.users.some(u => u.email === body.email)) return json(route, 422, { code: 'user_already_exists', msg: 'User already registered' })
      const u = this.addUser(body.email, body.password)
      return json(route, 200, this.session(u))
    }
    if (path === 'token') {
      const grant = url.searchParams.get('grant_type')
      if (grant === 'password') {
        const u = this.users.find(x => x.email === body.email && x.password === body.password)
        return u ? json(route, 200, this.session(u)) : json(route, 400, { code: 'invalid_credentials', msg: 'Invalid login credentials' })
      }
      if (grant === 'refresh_token') {
        const u = this.users.find(x => `refresh-${x.id}` === body.refresh_token)
        return u ? json(route, 200, this.session(u)) : json(route, 400, { code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' })
      }
    }
    if (path === 'user') {
      const sub = subOf(req); const u = this.users.find(x => x.id === sub)
      return u ? json(route, 200, this.session(u).user) : json(route, 401, { msg: 'invalid JWT' })
    }
    if (path === 'logout') return empty(route)
    this.unhandled.push(`${req.method()} /auth/v1/${path}`)
    return json(route, 404, { msg: 'auth no simulado' })
  }

  // ── PostgREST ──
  private matches(row: Row, filters: [string, string][]): boolean {
    return filters.every(([col, spec]) => {
      const dot = spec.indexOf('.'); const op = spec.slice(0, dot); const val = spec.slice(dot + 1)
      const cell = row[col]
      switch (op) {
        case 'eq': return String(cell) === val
        case 'neq': return String(cell) !== val
        case 'is': return val === 'null' ? cell === null || cell === undefined : String(cell) === val
        case 'in': return val.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/^"|"$/g, '')).includes(String(cell))
        case 'gt': return cell > val
        case 'gte': return cell >= val
        case 'lt': return cell < val
        case 'lte': return cell <= val
        case 'like': case 'ilike': return new RegExp('^' + val.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', op === 'ilike' ? 'i' : '').test(String(cell ?? ''))
        default: this.unhandled.push(`filtro ${col}=${spec}`); return true
      }
    })
  }

  private async rest(route: Route, req: Request, table: string, url: URL) {
    const method = req.method()
    const prefer = req.headers()['prefer'] || ''
    const accept = req.headers()['accept'] || ''
    const reserved = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'])
    const filters = [...url.searchParams.entries()].filter(([k]) => !reserved.has(k))
    for (const [k] of filters) if (k === 'or' || k === 'and') this.unhandled.push(`filtro compuesto ${k} en ${table}`)
    const all = this.rows(table)
    const wantsRows = prefer.includes('return=representation')
    const respond = (rows: Row[], status = 200) => {
      if (accept.includes('vnd.pgrst.object')) {
        return rows.length === 1 ? json(route, status, rows[0]) : json(route, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows` })
      }
      return json(route, status, rows, { 'content-range': `0-${Math.max(0, rows.length - 1)}/*` })
    }

    if (method === 'GET' || method === 'HEAD') {
      let rows = all.filter(r => this.matches(r, filters))
      const order = url.searchParams.get('order')
      if (order) {
        const [col, dir] = order.split(',')[0].split('.')
        rows = [...rows].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === 'desc' ? -1 : 1))
      }
      const limit = url.searchParams.get('limit')
      if (limit) rows = rows.slice(0, Number(limit))
      return respond(structuredClone(rows))
    }

    const body = req.postDataJSON?.()
    this.writes.push({ method, table, body })

    if (method === 'POST') {
      const incoming: Row[] = Array.isArray(body) ? body : [body]
      const onConflict = url.searchParams.get('on_conflict')
      const merge = prefer.includes('resolution=merge-duplicates')
      const ignore = prefer.includes('resolution=ignore-duplicates')
      const out: Row[] = []
      for (const r of incoming) {
        const keys = onConflict ? onConflict.split(',') : UNIQUE[table] ?? []
        const clash = keys.length ? all.find(x => keys.every(k => x[k] === r[k])) : undefined
        const anyUnique = (UNIQUE[table] ?? []).some(k => all.some(x => x[k] !== undefined && x[k] === r[k]))
        if (clash && merge) { Object.assign(clash, r); out.push(clash); continue }
        if (clash && ignore) continue
        if (!onConflict && anyUnique) return json(route, 409, { code: '23505', message: `duplicate key value violates unique constraint on ${table}` })
        const row = { ...r }
        if (row.id === undefined && !NO_AUTO_ID.has(table)) row.id = crypto.randomUUID()
        all.push(row); out.push(row)
      }
      return wantsRows ? respond(structuredClone(out), 201) : empty(route, 201)
    }

    if (method === 'PATCH') {
      const rows = all.filter(r => this.matches(r, filters))
      rows.forEach(r => Object.assign(r, body))
      return wantsRows ? respond(structuredClone(rows)) : empty(route)
    }

    if (method === 'DELETE') {
      const gone = all.filter(r => this.matches(r, filters))
      this.tables[table] = all.filter(r => !gone.includes(r))
      return wantsRows ? respond(structuredClone(gone)) : empty(route)
    }

    this.unhandled.push(`${method} /rest/v1/${table}`)
    return json(route, 405, { message: 'método no simulado' })
  }

  // ── RPC ──
  private async rpc(route: Route, req: Request, fn: string) {
    const args = req.postDataJSON?.() ?? {}
    const me = subOf(req)
    switch (fn) {
      case 'get_client_by_token': {
        // Igual que la función real: sin las columnas privadas del entrenador.
        const rows = this.rows('clientes').filter(c => c.token === args.p_token).slice(0, 1)
          .map(c => ({ ...c, notas_privadas: null, alerts: [], label_ids: [], precio_mensual: null, lesiones: null, equipo_disponible: null }))
        return json(route, 200, rows)
      }
      case 'claim_client_by_token': {
        const c = this.rows('clientes').find(x => x.token === args.p_token && !x.auth_user_id)
        if (c && me) c.auth_user_id = me
        return empty(route)
      }
      case 'mark_plan_opened': {
        const c = this.rows('clientes').find(x => x.token === args.p_token)
        if (c) c.plan_last_opened_at = new Date().toISOString()
        return empty(route)
      }
      case 'get_trainer_referral_slug': return json(route, 200, null)
      case 'find_trainer_by_email': return json(route, 200, null)
      case 'delete_client_data': {
        const id = args.p_client_id as string
        const client = this.rows('clientes').find(c => c.id === id)
        if (!client || client.trainerId !== me) return json(route, 403, { code: '42501', message: 'No autorizado' })
        const counts: Record<string, number> = {}
        for (const [t, col] of CLIENT_TABLES) {
          const before = this.rows(t).length
          this.tables[t] = this.rows(t).filter(r => String(r[col]) !== id)
          if (before !== this.tables[t].length) counts[t] = before - this.tables[t].length
        }
        this.tables.consentimientos = this.rows('consentimientos').filter(r => r.clientId !== id)
        this.tables.clientes = this.rows('clientes').filter(c => c.id !== id)
        this.rows('registro_borrados').push({ id: crypto.randomUUID(), client_id: id, trainer_id: me, filas: counts })
        return json(route, 200, { ...counts, clientes: 1 })
      }
      default:
        this.unhandled.push(`rpc ${fn}`)
        return json(route, 404, { message: `rpc ${fn} no simulada` })
    }
  }

  // ── Storage ──
  private async storageApi(route: Route, req: Request, path: string) {
    const method = req.method()
    const body = req.postDataJSON?.() ?? {}
    let m: RegExpMatchArray | null
    if (method === 'POST' && (m = path.match(/^object\/list\/([^/]+)$/))) {
      const prefix = String(body.prefix ?? '').replace(/\/$/, '')
      const files = (this.storage[m[1]] ??= []).filter(f => f.startsWith(prefix + '/'))
      const names = new Map<string, { name: string; id: string | null }>()
      for (const f of files) {
        const rest = f.slice(prefix.length + 1); const [first, ...more] = rest.split('/')
        names.set(first, more.length ? { name: first, id: null } : { name: first, id: `id-${f}` })
      }
      return json(route, 200, [...names.values()].slice(body.offset ?? 0, (body.offset ?? 0) + (body.limit ?? 100)))
    }
    if (method === 'DELETE' && (m = path.match(/^object\/([^/]+)$/))) {
      const bucket = m[1]; const prefixes: string[] = body.prefixes ?? []
      this.removedFiles.push({ bucket, paths: prefixes })
      this.storage[bucket] = (this.storage[bucket] ?? []).filter(f => !prefixes.includes(f))
      return json(route, 200, prefixes.map(name => ({ name, bucket_id: bucket })))
    }
    if (method === 'POST' && (m = path.match(/^object\/sign\/([^/]+)\/(.+)$/))) {
      return json(route, 200, { signedURL: `/object/sign/${m[1]}/${m[2]}?token=e2e` })
    }
    this.unhandled.push(`${method} /storage/v1/${path}`)
    return json(route, 404, { message: 'storage no simulado' })
  }
}
