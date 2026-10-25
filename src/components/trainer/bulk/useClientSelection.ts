import { useCallback, useState } from 'react'
import { toggleId, toggleAll, pruneSelection } from '../../../lib/bulkActions'

/** Modo selección de la lista de clientes. `sync` recorta lo seleccionado a lo que sigue visible. */
export function useClientSelection() {
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())

  const toggle = useCallback((id: string) => setSelected(s => toggleId(s, id)), [])
  const toggleEvery = useCallback((visibleIds: readonly string[]) => setSelected(s => toggleAll(s, visibleIds)), [])
  const sync = useCallback((visibleIds: readonly string[]) => setSelected(s => pruneSelection(s, visibleIds)), [])
  const stop = useCallback(() => { setSelecting(false); setSelected(new Set()) }, [])

  return { selecting, setSelecting, selected, toggle, toggleEvery, sync, stop }
}
