// ── USUARIOS ──────────────────────────────────────────
export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  role: 'super_admin' | 'trainer' | 'client'
  approved?: boolean
  trainerId?: string
  createdAt: number
}

// ── CLIENTES ──────────────────────────────────────────
export interface ClientData {
  id: string
  name: string
  surname: string
  weight: number
  fatPercentage: number
  muscleMass: number
  totalLifted: number
  planDescription: string
  trainerId: string
  token: string
  createdAt: number
  isActive?: boolean
}

// ── PLAN DE ENTRENAMIENTO ─────────────────────────────
export interface Exercise {
  name: string
  sets: string       // "4×5", "3×10", etc.
  weight: string     // "100 kg", "Corporal", etc.
  isMain: boolean
  comment: string
  videoUrl?: string
}

export interface DayPlan {
  title: string
  focus: string
  exercises: Exercise[]
}

export interface WeekPlan {
  label: string
  rpe: string
  isCurrent: boolean
  startDate?: string
  endDate?: string
  days: DayPlan[]
}

export interface TrainingPlan {
  clientId: string
  type: string
  restMain: number   // segundos descanso principal
  restAcc: number    // segundos descanso accesorio
  restWarn: number   // segundos aviso
  message?: string
  audioUrl?: string
  audioTitle?: string
  brandName?: string
  brandLogo?: string
  pin?: string
  coachNotes?: string  // notas privadas del entrenador
  weeks: WeekPlan[]
}

// ── REGISTROS DE ENTRENO ──────────────────────────────
export interface LogSet {
  weight: string
  reps: string
}

export interface ExerciseLog {
  sets: Record<number, LogSet>
  done: boolean
  note?: string
  dateDone?: string  // YYYY-MM-DD
}

// key: "ex_w{weekIdx}_d{dayIdx}_r{exIdx}"
export type TrainingLogs = Record<string, ExerciseLog>

// ── PESO / PROGRESO ───────────────────────────────────
export interface WeightEntry {
  v: number
  fecha: string  // YYYY-MM-DD
}

// ── DIETA ─────────────────────────────────────────────
export interface Meal {
  time: string
  name: string
  kcal: number
  items: string[]
}

export interface DietPlan {
  clientId: string
  kcal: number
  protein: number
  carbs: number
  fats: number
  meals: Meal[]
  advice?: string
}

// ── HÁBITOS ───────────────────────────────────────────
export interface Habit {
  id: string
  text: string
  sub: string
  order: number
}

// ── FOTOS ─────────────────────────────────────────────
export interface ProgressPhoto {
  id: string
  clientId: string
  date: string
  frontUrl?: string
  backUrl?: string
  sideUrl?: string
}

// ── ENCUESTA ──────────────────────────────────────────
export interface Survey {
  id: string
  clientId: string
  questions: string[]
  answers?: string[]
  sentDate?: string
  answeredAt?: string
}

// ── BIBLIOTECA DE EJERCICIOS ──────────────────────────
export interface LibraryExercise {
  id: string
  trainerId: string
  name: string
  videoUrl?: string
  category?: string
  notes?: string
}
