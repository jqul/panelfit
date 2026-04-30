import { Especialidad } from '../lib/especialidades'
 // ── USUARIOS ──────────────────────────────────────────
 export interface UserProfile {
   uid: string; email: string; displayName: string; photoURL?: string
   role: 'super_admin' | 'trainer' | 'client'; approved?: boolean; trainerId?: string; createdAt: number
  planName?: 'free' | 'trial' | 'pro' | 'studio'
  clientLimit?: number
  trialEndsAt?: number
 }
 

 // ── CLIENTES ──────────────────────────────────────────
 export interface ClientData {
   id: string; name: string; surname: string; weight: number; fatPercentage: number
   muscleMass: number; totalLifted: number; planDescription: string
   trainerId: string; token: string; createdAt: number; isActive?: boolean
   objetivo?: Especialidad | 'resistencia' | 'general'  // unificado con Especialidad
 }
 
 // ── PLAN ──────────────────────────────────────────────
 export interface Exercise {
   name: string; sets: string; weight: string; isMain: boolean
   comment: string; videoUrl?: string; videoUrls?: string[]
   requiresVideo?: boolean  // el entrenador pide vídeo de ejecución
   restSets?: number        // descanso entre series (seg)
   restAfter?: number       // descanso tras el ejercicio (seg)
 }
 
 export interface ExerciseVideoUpload {
   exerciseKey: string  // ex_w0_d0_r0
   videoUrl: string
   uploadedAt: number
 }
 export interface DayPlan { title: string; focus: string; exercises: Exercise[] }
 export interface WeekPlan { label: string; rpe: string; isCurrent: boolean; startDate?: string; endDate?: string; days: DayPlan[] }
 
