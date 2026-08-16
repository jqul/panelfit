import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, Trash2, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react'
import { useTestCatalog, useTestResultados, CATEGORIAS } from '../../../lib/testCatalog'
import { CustomTooltip, EmptyState } from './helpers'
import { toast } from '../../shared/Toast'
import { JumpVideoAnalyzer } from './JumpVideoAnalyzer'

export function PruebasChart({ clientId, trainerId }: { clientId: string; trainerId: string }) {
  const { tests, loading: loadingTests, addTest, deleteTest } = useTestCatalog(trainerId)
  const { resultados, loading: loadingRes, addResultado, deleteResultado } = useTestResultados(clientId)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [logging, setLogging] = useState<string | null>(null)
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [notas, setNotas] = useState('')
  const [showVideoAnalyzer, setShowVideoAnalyzer] = useState(false)
  const [addingTest, setAddingTest] = useState(false)
  const [newNombre, setNewNombre] = useState('')
  const [newCategoria, setNewCategoria] = useState<string>(CATEGORIAS[0])
  const [newUnidad, setNewUnidad] = useState('')

  if (loadingTests || loadingRes) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const startLogging = (testId: string) => {
    setLogging(testId); setValor(''); setFecha(new Date().toISOString().slice(0, 10)); setNotas(''); setShowVideoAnalyzer(false)
  }

  const confirmLog = async (testId: string) => {
    const num = parseFloat(valor)
    if (isNaN(num)) { toast('Introduce un valor válido', 'warn'); return }
    await addResultado(trainerId, testId, num, fecha, notas)
    setLogging(null)
    toast('Resultado guardado ✓', 'ok')
  }

  if (tests.length === 0) return (
    <EmptyState icon={<Dumbbell className="w-8 h-8 opacity-30" />} text="Sin pruebas configuradas" sub="Se cargará un catálogo por defecto al abrir esta pestaña" />
  )

  return (
    <div className="space-y-3">
      {tests.map(test => {
        const history = resultados.filter(r => r.test_id === test.id).sort((a, b) => a.fecha.localeCompare(b.fecha))
        const latest = history[history.length - 1]
        const isExpanded = expanded === test.id
        const isJumpTest = test.nombre.toLowerCase().includes('salto')
        const chartData = history.slice(-10).map(r => ({
          fecha: new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          valor: r.valor,
        }))

        return (
          <div key={test.id} className="border border-border rounded-xl overflow-hidden">
            <button onClick={() => setExpanded(isExpanded ? null : test.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{test.nombre}</p>
                <p className="text-[10px] text-muted uppercase tracking-wider">{test.categoria} · {test.unidad}</p>
              </div>
              {latest && (
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-accent">{latest.valor} {test.unidad}</p>
                  <p className="text-[9px] text-muted">{new Date(latest.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                </div>
              )}
              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />}
            </button>

            {isExpanded && (
              <div className="border-t border-border p-4 space-y-3">
                {test.descripcion && <p className="text-xs text-muted">{test.descripcion}</p>}

                {chartData.length >= 2 ? (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
                        <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#8a8278' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#8a8278' }} />
                        <Tooltip content={<CustomTooltip unit={test.unidad} />} />
                        <Line type="monotone" dataKey="valor" stroke="#6e5438" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-xs text-muted">Necesita al menos 2 resultados para ver la evolución.</p>
                )}

                {logging === test.id ? (
                  <div className="bg-bg rounded-xl p-3 space-y-2">
                    {isJumpTest && !showVideoAnalyzer && (
                      <button onClick={() => setShowVideoAnalyzer(true)}
                        className="w-full py-2 border border-accent/40 text-accent rounded-lg text-xs font-semibold hover:bg-accent/5 transition-colors">
                        📹 Calcular altura desde vídeo (más preciso que a ojo)
                      </button>
                    )}
                    {isJumpTest && showVideoAnalyzer && (
                      <JumpVideoAnalyzer
                        clientId={clientId}
                        onClose={() => setShowVideoAnalyzer(false)}
                        onComputed={(heightCm, note) => { setValor(String(heightCm)); setNotas(note); setShowVideoAnalyzer(false) }}
                      />
                    )}
                    <div className="flex gap-2">
                      <input type="number" step="0.1" value={valor} onChange={e => setValor(e.target.value)} placeholder={`Valor (${test.unidad})`}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-border rounded-lg text-xs outline-none" />
                      <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-border rounded-lg text-xs outline-none" />
                    </div>
                    <input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas (opcional)"
                      className="w-full px-2.5 py-1.5 bg-white border border-border rounded-lg text-xs outline-none" />
                    <div className="flex gap-2">
                      <button onClick={() => setLogging(null)} className="flex-1 py-1.5 border border-border rounded-lg text-xs text-muted">Cancelar</button>
                      <button onClick={() => confirmLog(test.id)} className="flex-1 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold">Guardar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => startLogging(test.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-border rounded-xl text-xs text-muted hover:border-accent hover:text-accent">
                    <Plus className="w-3.5 h-3.5" /> Registrar resultado
                  </button>
                )}

                {history.length > 0 && (
                  <div className="space-y-1">
                    {history.slice().reverse().slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center gap-2 text-xs text-muted">
                        <span className="flex-1">{new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="font-semibold text-ink">{r.valor} {test.unidad}</span>
                        {r.notas && <span className="italic truncate max-w-[120px]">{r.notas}</span>}
                        <button onClick={() => deleteResultado(r.id)} className="text-muted hover:text-warn flex-shrink-0"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}

                {test.es_default === false && (
                  <button onClick={() => deleteTest(test.id)} className="text-[10px] text-muted hover:text-warn underline">Eliminar prueba del catálogo</button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {addingTest ? (
        <div className="border-2 border-dashed border-border rounded-xl p-3 space-y-2">
          <input value={newNombre} onChange={e => setNewNombre(e.target.value)} placeholder="Nombre de la prueba"
            className="w-full px-2.5 py-1.5 bg-bg border border-border rounded-lg text-xs outline-none" />
          <div className="flex gap-2">
            <select value={newCategoria} onChange={e => setNewCategoria(e.target.value)}
              className="flex-1 px-2.5 py-1.5 bg-bg border border-border rounded-lg text-xs outline-none">
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={newUnidad} onChange={e => setNewUnidad(e.target.value)} placeholder="Unidad (kg, cm, seg...)"
              className="flex-1 px-2.5 py-1.5 bg-bg border border-border rounded-lg text-xs outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAddingTest(false)} className="flex-1 py-1.5 border border-border rounded-lg text-xs text-muted">Cancelar</button>
            <button onClick={async () => {
              if (!newNombre.trim() || !newUnidad.trim()) return
              await addTest(newNombre.trim(), newCategoria, newUnidad.trim(), '')
              setAddingTest(false); setNewNombre(''); setNewUnidad('')
            }} className="flex-1 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold">Crear</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingTest(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-border rounded-xl text-xs text-muted hover:border-accent hover:text-accent">
          <Plus className="w-3.5 h-3.5" /> Añadir prueba al catálogo
        </button>
      )}
    </div>
  )
}
