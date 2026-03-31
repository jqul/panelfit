// Mapea los datos de Supabase (snake_case español) al tipo ClientData (camelCase inglés)
import { ClientData } from '../types'

export function mapCliente(row: any): ClientData {
  return {
    id: row.id,
    name: row.nombre || row.name || '',
    surname: row.apellido || row.surname || '',
    weight: row.peso || row.weight || 0,
    fatPercentage: row.grasa || row.fatPercentage || 0,
    muscleMass: row.musculo || row.muscleMass || 0,
    totalLifted: row.total_levant || row.totalLifted || 0,
    planDescription: row.plan_desc || row.planDescription || '',
    trainerId: row.entrenador_id || row.trainerId || '',
    token: row.token || '',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : (row.createdAt || Date.now()),
    isActive: row.activo ?? row.isActive ?? true,
  }
}

export function mapClientes(rows: any[]): ClientData[] {
  return (rows || []).map(mapCliente)
}
