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
}

// ── PLAN ──────────────────────────────────────────────
export interface Exercise {
  name: string; sets: string; weight: string; isMain: boolean
  comment: string; videoUrl?: string; videoUrls?: string[]
}
export interface DayPlan { title: string; focus: string; exercises: Exercise[] }
export interface WeekPlan { label: string; rpe: string; isCurrent: boolean; startDate?: string; endDate?: string; days: DayPlan[] }
export interface TrainingPlan {
  clientId: string; type: string; restMain: number; restAcc: number; restWarn: number
  message?: string; audioUrl?: string; audioTitle?: string; brandName?: string
  brandLogo?: string; pin?: string; coachNotes?: string; weeks: WeekPlan[]
}

// ── PLANTILLAS ────────────────────────────────────────
export interface TrainingTemplate {
  id: string; trainerId: string; name: string; type: string; description: string
  weeks: WeekPlan[]; createdAt: number; updatedAt: number
}

// ── BIBLIOTECA DE EJERCICIOS ──────────────────────────
export interface LibraryVideo { url: string; label?: string }
export interface LibraryExercise {
  id: string; trainerId: string; name: string; description?: string
  category?: string; videos?: LibraryVideo[]; createdAt: number
}

// ── REGISTROS ─────────────────────────────────────────
export interface LogSet { weight: string; reps: string }
export interface ExerciseLog { sets: Record<number, LogSet>; done: boolean; note?: string; dateDone?: string }
export type TrainingLogs = Record<string, ExerciseLog>

// ── OTROS ─────────────────────────────────────────────
export interface WeightEntry { v: number; fecha: string }
export interface ProgressPhoto { id: string; clientId: string; date: string; frontUrl?: string; backUrl?: string; sideUrl?: string }
