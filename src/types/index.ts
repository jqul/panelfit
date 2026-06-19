import { Especialidad } from '../lib/especialidades'
// ── USUARIOS ──────────────────────────────────────────
export interface UserProfile {
  uid: string; email: string; displayName: string; photoURL?: string
  role: 'super_admin' | 'trainer' | 'client'; approved?: boolean; trainerId?: string; createdAt: number
  clientLimit?: number
  planName?: 'free' | 'trial' | 'pro' | 'studio'
}

// ── CLIENTES ──────────────────────────────────────────
export interface ClientData {
  id: string; name: string; surname: string; weight: number; fatPercentage: number
  muscleMass: number; totalLifted: number; planDescription: string
  trainerId: string; token: string; createdAt: number; isActive?: boolean
  phone?: string  // WhatsApp del cliente
  objetivo?: Especialidad | 'resistencia' | 'general'  // unificado con Especialidad
  altura?: number; genero?: string; fechanacimiento?: string
  notas_privadas?: string  // notas privadas del entrenador, nunca se muestran al cliente
  label_ids?: string[]
}

// ── PLAN ──────────────────────────────────────────────
export interface Exercise {
  name: string; sets: string; weight: string; isMain: boolean
  comment: string; videoUrl?: string; videoUrls?: string[]
  requiresVideo?: boolean  // el entrenador pide vídeo de ejecución
  restSets?: number        // descanso entre series (seg)
  restAfter?: number       // descanso tras el ejercicio (seg)
  seriesType?: string      // id de SeriesTypeDef (normal, dropset, etc.)
  hideRest?: boolean       // oculta la cuenta atrás de descanso al cliente
}

export interface ExerciseVideoUpload {
  exerciseKey: string  // ex_w0_d0_r0
  videoUrl: string
  uploadedAt: number
}
export interface DayPlan { title: string; focus: string; exercises: Exercise[]; warmup?: string; warmupExercises?: Exercise[] }
export interface WeekPlan { label: string; rpe: string; isCurrent: boolean; isDeload?: boolean; startDate?: string; endDate?: string; days: DayPlan[] }

export interface TrainingPlan {
  clientId: string; type: string; restMain: number; restAcc: number; restWarn: number
  message?: string; coachNotes?: string
  brandName?: string; brandLogo?: string
  pin?: string
  fechaInicio?: string
  autoWelcome?: boolean
  autoCheckin?: boolean
  autoInactividad?: boolean
  diasSemana?: number  // cuántos días entrena por semana
  diasElegidos?: number[]  // 0=lun,1=mar...6=dom (elegidos por cliente)
  macros?: { kcal: number; protein: number; carbs: number; fats: number; notaMacros?: string }
  weeks: WeekPlan[]
  programId?: string; programName?: string  // programa de plantilla asignado, si lo hay
}

// ── PLANTILLAS ────────────────────────────────────────
export interface TrainingTemplate {
  id: string; trainerId: string; name: string; type: string; description: string
  weeks: WeekPlan[]; createdAt: number; updatedAt: number; label_ids?: string[]
}

// ── BIBLIOTECA ────────────────────────────────────────
// `especialidades` admite tanto los valores fijos de Especialidad como IDs de
// especialidades personalizadas que el entrenador puede crear, por eso es string[].
export interface LibraryVideo { url: string; label?: string; especialidades?: string[] }  // especialidades del vídeo — fuente de verdad
export interface LibraryExercise {
  id: string; trainerId: string; name: string; description?: string
  category?: string; especialidades?: string[]; videos: LibraryVideo[]; createdAt: number  // siempre array, nunca undefined
  tags?: string[]
}

// ── REGISTROS ─────────────────────────────────────────
export interface LogSet { weight: string; reps: string; rir?: number }
export interface ExerciseLog { sets: Record<number, LogSet>; done: boolean; note?: string; dateDone?: string; videoEjecucion?: string }
export type TrainingLogs = Record<string, ExerciseLog>

// ── PROGRESO ──────────────────────────────────────────
export interface WeightEntry { v: number; fecha: string }
export interface ProgressPhoto {
  id: string; clientId: string; date: string
  frontUrl?: string; backUrl?: string; sideUrl?: string
}

// ── CHECK-INS ─────────────────────────────────────────
export interface CheckinRespuesta { pregunta: string; respuesta: string }
export interface Checkin {
  id: string; clientId: string
  respuestas: CheckinRespuesta[]
  createdAt: number
}

// ── PERFIL ENTRENADOR ─────────────────────────────────
export interface TrainerProfile {
  displayName: string; brandName: string; brandLogo: string
  brandColor: string; phone: string; bio: string
  welcomeMsg: string; motivMsg: string
}
