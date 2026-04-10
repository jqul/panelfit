// ── USUARIOS ──────────────────────────────────────────
export interface UserProfile {
  uid: string; email: string; displayName: string; photoURL?: string
  role: 'super_admin' | 'trainer' | 'client'; approved?: boolean; trainerId?: string; createdAt: number
}

// ── CLIENTES ──────────────────────────────────────────
export interface ClientData {
  id: string; name: string; surname: string; weight: number; fatPercentage: number
  muscleMass: number; totalLifted: number; planDescription: string
  trainerId: string; token: string; createdAt: number; isActive?: boolean
  objetivo?: 'fuerza' | 'hipertrofia' | 'perdida_grasa' | 'resistencia' | 'general'
}

// ── PLAN ──────────────────────────────────────────────
export interface Exercise {
  name: string; sets: string; weight: string; isMain: boolean
  comment: string; videoUrl?: string; videoUrls?: string[]
  requiresVideo?: boolean  // el entrenador pide vídeo de ejecución
}

export interface ExerciseVideoUpload {
  exerciseKey: string  // ex_w0_d0_r0
  videoUrl: string
  uploadedAt: number
}
export interface DayPlan { title: string; focus: string; exercises: Exercise[] }
export interface WeekPlan { label: string; rpe: string; isCurrent: boolean; startDate?: string; endDate?: string; days: DayPlan[] }

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
}

// ── PLANTILLAS ────────────────────────────────────────
export interface TrainingTemplate {
  id: string; trainerId: string; name: string; type: string; description: string
  weeks: WeekPlan[]; createdAt: number; updatedAt: number
}

// ── BIBLIOTECA ────────────────────────────────────────
export interface LibraryVideo { url: string; label?: string; especialidades?: string[] }
export interface LibraryExercise {
  id: string; trainerId: string; name: string; description?: string
  category?: string; especialidades?: string[]; videos?: LibraryVideo[]; createdAt: number
}

// ── REGISTROS ─────────────────────────────────────────
export interface LogSet { weight: string; reps: string }
export interface ExerciseLog { sets: Record<number, LogSet>; done: boolean; note?: string; dateDone?: string }
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
