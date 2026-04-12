import { ClientData } from '../types'
export function mapCliente(row: any): ClientData {
  return {
    id: row.id,
    name: row.name || row.nombre || '',
    surname: row.surname || row.apellido || '',
    weight: row.weight || 0,
    fatPercentage: row.fatPercentage || 0,
    muscleMass: row.muscleMass || 0,
    totalLifted: row.totalLifted || 0,
    planDescription: row.planDescription || '',
    trainerId: row.trainerId || row.entrenador_id || '',
    token: row.token || '',
    createdAt: row.createdAt || (row.created_at ? new Date(row.created_at).getTime() : Date.now()),
    isActive: row.isActive ?? row.activo ?? true,
  }
}
export function mapClientes(rows: any[]): ClientData[] {
  return (rows || []).map(mapCliente)
}
