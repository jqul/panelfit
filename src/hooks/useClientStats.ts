import { useMemo } from 'react'
import { ClientWithStats } from './useTrainerClients'

interface Options {
  clients: ClientWithStats[]
  logsMap: Record<string, any>
  search: string
  clientFilter: 'all' | 'active' | 'no-plan' | 'no-activity'
}

export function useClientStats({ clients, logsMap, search, clientFilter }: Options) {
  const haceUnaS = new Date()
  haceUnaS.setDate(haceUnaS.getDate() - 7)
  const haceDosSemanas = new Date()
  haceDosSemanas.setDate(haceDosSemanas.getDate() - 14)

  const activeToday = clients.filter(c => c.doneToday).length
  const noPlan = clients.filter(c => !c.hasPlan).length
  const noActivity7d = clients.filter(c =>
    !c.lastActive || new Date(c.lastActive) < haceUnaS
  ).length

  const activePrevWeek = useMemo(() => {
    let count = 0
    clients.forEach(c => {
      const logs = logsMap[c.id] || {}
      const dates = Object.values(logs)
        .filter((l: any) => l.dateDone)
        .map((l: any) => l.dateDone as string)
      if (dates.some(d => new Date(d) >= haceDosSemanas && new Date(d) < haceUnaS)) count++
    })
    return count
  }, [clients, logsMap])

  const adherenciaMap = useMemo(() => {
    const map: Record<string, number> = {}
    clients.forEach(c => {
      map[c.id] = Math.min(100, Math.round(((c.weeklyDays || 0) / 4) * 100))
    })
    return map
  }, [clients])

  const filteredClients = useMemo(() => {
    let list = [...clients]
    if (clientFilter === 'active') list = list.filter(c => c.doneToday)
    else if (clientFilter === 'no-plan') list = list.filter(c => !c.hasPlan)
    else if (clientFilter === 'no-activity') list = list.filter(c =>
      !c.lastActive || new Date(c.lastActive) < haceUnaS
    )
    if (search) list = list.filter(c =>
      `${c.name} ${c.surname}`.toLowerCase().includes(search.toLowerCase())
    )
    return list
  }, [clients, clientFilter, search])

  const chartData = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().split('T')[0]
    return {
      label: d.toLocaleDateString('es-ES', { weekday: 'short' }),
      count: clients.filter(c => c.lastActive === key).length,
      key,
    }
  }), [clients])

  const activityFeed = useMemo(() => {
    const events: { clientName: string; text: string; date: string }[] = []
    clients.forEach(c => {
      const logs = logsMap[c.id] || {}
      const dates = [...new Set(
        Object.values(logs)
          .filter((l: any) => l.dateDone)
          .map((l: any) => l.dateDone as string)
      )].sort().reverse()
      if (dates[0]) events.push({
        clientName: `${c.name} ${c.surname}`,
        text: 'completo una sesion',
        date: dates[0],
      })
    })
    return events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)
  }, [clients, logsMap])

  const alerts = clients.filter(c =>
    !c.hasPlan || (!c.lastActive || new Date(c.lastActive) < haceUnaS)
  )

  const formatLastActive = (date?: string) => {
    if (!date) return 'Nunca'
    const diff = Math.round(
      (new Date().setHours(0,0,0,0) - new Date(date + 'T00:00:00').getTime()) / 86400000
    )
    if (diff === 0) return 'Hoy'
    if (diff === 1) return 'Ayer'
    if (diff < 7) return `Hace ${diff}d`
    return new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  return {
    activeToday, noPlan, noActivity7d, activePrevWeek,
    adherenciaMap, filteredClients, chartData, activityFeed,
    alerts, formatLastActive,
  }
}
