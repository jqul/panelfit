import { FakeSupabase } from './fakeSupabase'

export const ids = {
  trainer: '11111111-1111-4111-8111-111111111111',
  client: '22222222-2222-4222-8222-222222222222',
  clientUser: '33333333-3333-4333-8333-333333333333',
}
export const TOKEN = 'tokene2e0123456789abcdef0123456789'
export const TRAINER_LOGIN = { email: 'entrenador@e2e.test', password: 'clave-e2e-1' }
export const CLIENT_LOGIN = { email: 'maria@e2e.test', password: 'clave-e2e-2' }

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** Plan de una semana con un día de tres ejercicios (sin día de la semana en el título: siempre es "el de hoy"). */
export function samplePlan(overrides: { exerciseNames?: [string, string, string]; weight?: string } = {}) {
  const [a, b, c] = overrides.exerciseNames ?? ['Press banca', 'Remo con barra', 'Curl de bíceps']
  return {
    clientId: ids.client, type: 'hipertrofia', restMain: 120, restAcc: 60, restWarn: 15, fechaInicio: today(),
    weeks: [{
      label: 'Semana 1', rpe: '@7', isDeload: false, isCurrent: true,
      days: [{ title: 'DÍA A — EMPUJE', focus: '', exercises: [
        { name: a, sets: '3x5', weight: overrides.weight ?? '80kg', comment: '', isMain: true },
        { name: b, sets: '3x8', weight: '60kg', comment: '', isMain: false },
        { name: c, sets: '2x12', weight: '15kg', comment: '', isMain: false },
      ] }],
    }],
  }
}

/** Un entrenador aprobado, un cliente suyo con su plan, y las cuentas de acceso de los dos. */
export function seedWorld(fake: FakeSupabase, opts: { clientHasAccount?: boolean; clientConsented?: boolean } = {}) {
  fake.addUser(TRAINER_LOGIN.email, TRAINER_LOGIN.password, ids.trainer)
  fake.seed('entrenadores', { uid: ids.trainer, email: TRAINER_LOGIN.email, displayName: 'Alex Trainer', approved: true, rol: 'trainer', role: 'trainer', profile: { planName: 'studio', clientLimit: 50, brandName: 'AlexFit' } })
  if (opts.clientHasAccount) fake.addUser(CLIENT_LOGIN.email, CLIENT_LOGIN.password, ids.clientUser)
  fake.seed('clientes', {
    id: ids.client, trainerId: ids.trainer, name: 'María', surname: 'García', token: TOKEN, objetivo: 'hipertrofia',
    auth_user_id: opts.clientHasAccount ? ids.clientUser : null, notas_privadas: 'nota privada del entrenador',
    metricas_cliente: [], createdAt: Date.now(),
  })
  fake.seed('planes', { clientId: ids.client, plan: { P: samplePlan() }, updatedAt: 1000, borrador_activo: false, plan_borrador: null })
  if (opts.clientConsented) fake.seed('consentimientos', { id: 'c-1', clientId: ids.client, version: '2026-10', salud: true, fotos: false, accepted_at: new Date().toISOString() })
}
