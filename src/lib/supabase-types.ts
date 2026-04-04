// Tipos de filas de Supabase

export interface ClienteRow {
  id: string
  trainerId: string
  name: string
  surname: string
  weight?: number
  fatPercentage?: number
  muscleMass?: number
  totalLifted?: number
  planDescription?: string
  token: string
  objetivo?: string
  createdAt: number
}

export interface PlanRow {
  clientId: string
  plan: { P: unknown } | null
  updatedAt: number
}

export interface RegistroRow {
  clientId: string
  logs: Record<string, {
    done: boolean
    dateDone?: string
    sets: Record<number, { weight: string; reps: string }>
    note?: string
  }>
  updatedAt: number
}

export interface DietaRow {
  id?: string
  cliente_id: string
  datos: {
    clientId: string
    kcal: number
    protein: number
    carbs: number
    fats: number
    meals: Array<{
      id: string
      time: string
      name: string
      kcal: number
      items: string[]
    }>
    advice: string
    updatedAt: string
  } | null
}

export interface EntrenadorRow {
  uid: string
  email: string
  displayName: string
  approved: boolean
  rol: string
  createdAt?: number
}

export interface CheckinRow {
  id: string
  clientId: string
  respuestas: Array<{ pregunta: string; respuesta: string }>
  createdAt: number
}
