import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientData, UserProfile } from '../../types'
import { toast } from '../shared/Toast'
import { Plus, Trash2, Send, Calendar, MessageCircle, Edit2, X, ChevronDown, ChevronUp, Check } from 'lucide-react'

interface Encuesta {
  id: string
  nombre: string
  preguntas: string[]
}

interface MensajePlantilla {
  id: string
  tipo: 'recordatorio' | 'bienvenida' | 'checkin' | 'personalizado'
  nombre: string
  texto: string
}

interface Programacion {
  id?: string
  clientId: string
  clientName: string
  tipo: string
  mensaje: string
  encuestaId?: string
  fechaEnvio: string
  enviado: boolean
}

interface Props {
  userProfile: UserProfile
  clients: ClientData[]
}

const LS_PLANTILLAS = (uid: string) => `pf_msg_plantillas_${uid}`
const LS_ENCUESTAS = (uid: string) => `pf_encuestas_lib_${uid}`

const VARS_AYUDA = ['{nombre}', '{dias}', '{enlace}', '{encuesta}']

const PLANTILLAS_DEFAULT: MensajePlantilla[] = [
  { id: 'rec1', tipo: 'recordatorio', nombre: 'Recordatorio estándar', texto: 'Hola {nombre} 👋 Llevas {dias} días sin entrenar. ¿Todo bien? Tu plan sigue aquí cuando quieras:\n\n{enlace}' },
  { id: 'rec2', tipo: 'recordatorio', nombre: 'Recordatorio motivacional', texto: 'Hey {nombre} 💪 No te olvides de tu objetivo. {dias} días de pausa son suficientes. ¡Hoy volvemos!\n\n{enlace}' },
  { id: 'bienvenida1', tipo: 'bienvenida', nombre: 'Bienvenida estándar', texto: 'Hola {nombre} 👋 ¡Bienvenido/a a tu panel de entrenamiento personalizado! Ya tienes todo listo:\n\n{enlace}\n\n¡Vamos a por ello! 💪' },
  { id: 'checkin1', tipo: 'checkin', nombre: 'Check-in semanal', texto: 'Hola {nombre} 📋 Es hora del check-in semanal. Solo 2 minutos — cuéntame cómo ha ido:\n\n{encuesta}' },
]

export function MensajesTab({ userProfile, clients }: Props) {
  const [tab, setTab] = useState<'plantillas' | 'encuestas' | 'programacion'>('plantillas')

  // Plantillas
  const [plantillas, setPlantillas] = useState<MensajePlantilla[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_PLANTILLAS(userProfile.uid)) || 'null') || PLANTILLAS_DEFAULT }
    catch { return PLANTILLAS_DEFAULT }
  })
  const [editandoPlantilla, setEditandoPlantilla] = useState<MensajePlantilla | null>(null)
  const [nuevaPlantilla, setNuevaPlantilla] = useState(false)

  // Encuestas
  const [encuestas, setEncuestas] = useState<Encuesta[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_ENCUESTAS(userProfile.uid)) || '[]') }
    catch { return [] }
  })
  const [editandoEncuesta, setEditandoEncuesta] = useState<Encuesta | null>(null)
  const [nuevaEncuesta, setNuevaEncuesta] = useState(false)

  // Programación
  const [programacion, setProgramacion] = useState<Programacion[]>([])
  const [showNuevoProg, setShowNuevoProg] = useState(false)
  const [nuevoProg, setNuevoProg] = useState<Partial<Programacion>>({
    tipo: 'recordatorio', fechaEnvio: new Date().toISOString().split('T')[0], enviado: false
  })

  useEffect(() => {
    loadProgramacion()
    loadFromDB()
  }, [])

  const loadFromDB = async () => {
    // Cargar plantillas desde BD (override localStorage si hay datos más recientes)
    const { data: pData } = await supabase.from('plantillas_mensajes')
      .select('*').eq('trainerId', userProfile.uid)
    if (pData && pData.length > 0) {
      const dbPlantillas: MensajePlantilla[] = pData.map((p: any) => ({
        id: p.id, tipo: p.tipo, nombre: p.nombre, texto: p.texto
      }))
      setPlantillas(dbPlantillas)
      localStorage.setItem(LS_PLANTILLAS(userProfile.uid), JSON.stringify(dbPlantillas))
    }
    // Cargar encuestas desde BD
    const { data: eData } = await supabase.from('encuestas_biblioteca')
      .select('*').eq('trainerId', userProfile.uid)
    if (eData && eData.length > 0) {
      const dbEncuestas: Encuesta[] = eData.map((e: any) => ({
        id: e.id, nombre: e.nombre, preguntas: e.preguntas || []
      }))
      setEncuestas(dbEncuestas)
      localStorage.setItem(LS_ENCUESTAS(userProfile.uid), JSON.stringify(dbEncuestas))
    }
  }

  const loadProgramacion = async () => {
    const { data } = await supabase.from('programacion_mensajes')
      .select('*').order('fechaEnvio', { ascending: true })
    if (data) {
      setProgramacion(data.map((d: any) => ({
        id: d.id, clientId: d.clientId,
        clientName: clients.find(c => c.id === d.clientId)?.name || '—',
        tipo: d.tipo, mensaje: d.mensaje, encuestaId: d.encuestaId,
        fechaEnvio: d.fechaEnvio, enviado: d.enviado
      })))
    }
  }

  const savePlantillas = async (p: MensajePlantilla[]) => {
    setPlantillas(p)
    localStorage.setItem(LS_PLANTILLAS(userProfile.uid), JSON.stringify(p))
    // Sync a Supabase — upsert cada plantilla
    for (const pl of p) {
      await supabase.from('plantillas_mensajes').upsert({
        id: pl.id, trainerId: userProfile.uid,
        tipo: pl.tipo, nombre: pl.nombre, texto: pl.texto
      })
    }
    // Eliminar las que ya no están
    const ids = p.map(pl => pl.id)
    await supabase.from('plantillas_mensajes')
      .delete().eq('trainerId', userProfile.uid).not('id', 'in', `(${ids.map(i => `'${i}'`).join(',')})`)
  }

  const saveEncuestas = async (e: Encuesta[]) => {
    setEncuestas(e)
    localStorage.setItem(LS_ENCUESTAS(userProfile.uid), JSON.stringify(e))
    for (const enc of e) {
      await supabase.from('encuestas_biblioteca').upsert({
        id: enc.id, trainerId: userProfile.uid,
        nombre: enc.nombre, preguntas: enc.preguntas
      })
    }
    const ids = e.map(enc => enc.id)
    if (ids.length > 0) {
      await supabase.from('encuestas_biblioteca')
        .delete().eq('trainerId', userProfile.uid).not('id', 'in', `(${ids.map(i => `'${i}'`).join(',')})`)
    }
  }

  const fillVars = (texto: string, client: ClientData, dias = 0) => {
    const url = `${window.location.origin}?c=${client.token}`
    const encuestaUrl = `${window.location.origin}?c=${client.token}&encuesta=1`
    return texto
      .replace(/{nombre}/g, client.name)
      .replace(/{dias}/g, String(dias))
      .replace(/{enlace}/g, url)
      .replace(/{encuesta}/g, encuestaUrl)
  }

  const enviarWhatsApp = (prog: Programacion) => {
    const client = clients.find(c => c.id === prog.clientId)
    if (!client) return
    const msg = fillVars(prog.mensaje, client)
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    // Marcar como enviado
    if (prog.id) {
      supabase.from('programacion_mensajes').update({ enviado: true }).eq('id', prog.id).then(() => loadProgramacion())
    }
    toast('WhatsApp abierto ✓', 'ok')
  }

  const guardarProgramacion = async () => {
    if (!nuevoProg.clientId || !nuevoProg.mensaje || !nuevoProg.fechaEnvio) {
      toast('Completa todos los campos', 'warn'); return
    }
    const { error } = await supabase.from('programacion_mensajes').insert({
      trainerId: userProfile.uid,
      clientId: nuevoProg.clientId,
      tipo: nuevoProg.tipo,
      mensaje: nuevoProg.mensaje,
      encuestaId: nuevoProg.encuestaId,
      fechaEnvio: nuevoProg.fechaEnvio,
      enviado: false,
      createdAt: Date.now()
    })
    if (error) { toast('Error al guardar', 'warn'); return }
    toast('Programado ✓', 'ok')
    setShowNuevoProg(false)
    setNuevoProg({ tipo: 'recordatorio', fechaEnvio: new Date().toISOString().split('T')[0], enviado: false })
    loadProgramacion()
  }

  const hoy = new Date().toISOString().split('T')[0]
  const pendientesHoy = programacion.filter(p => p.fechaEnvio === hoy && !p.enviado)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold">Mensajes</h2>
          <p className="text-muted text-sm mt-1">Plantillas, encuestas y programación de envíos</p>
        </div>
        {pendientesHoy.length > 0 && (
          <div className="flex items-center gap-2 bg-warn/10 border border-warn/20 rounded-xl px-3 py-2">
            <span className="text-warn text-sm font-bold">{pendientesHoy.length} pendiente{pendientesHoy.length > 1 ? 's' : ''} hoy</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg p-1 rounded-xl border border-border w-fit">
        {[
          { id: 'plantillas', label: '✍️ Plantillas' },
          { id: 'encuestas', label: '📋 Encuestas' },
          { id: 'programacion', label: '📅 Programación' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PLANTILLAS ── */}
      {tab === 'plantillas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">Variables disponibles: {VARS_AYUDA.map(v => <code key={v} className="bg-bg-alt px-1 py-0.5 rounded text-[10px] mx-0.5">{v}</code>)}</p>
            <button onClick={() => { setNuevaPlantilla(true); setEditandoPlantilla({ id: `p_${Date.now()}`, tipo: 'personalizado', nombre: '', texto: '' }) }}
              className="flex items-center gap-2 px-3 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90">
              <Plus className="w-4 h-4" /> Nueva
            </button>
          </div>

          {(editandoPlantilla || nuevaPlantilla) && editandoPlantilla && (
            <div className="bg-card border border-accent/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{nuevaPlantilla ? 'Nueva plantilla' : 'Editar plantilla'}</h4>
                <button onClick={() => { setEditandoPlantilla(null); setNuevaPlantilla(false) }}>
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Nombre</label>
                  <input type="text" value={editandoPlantilla.nombre}
                    onChange={e => setEditandoPlantilla({ ...editandoPlantilla, nombre: e.target.value })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Tipo</label>
                  <select value={editandoPlantilla.tipo}
                    onChange={e => setEditandoPlantilla({ ...editandoPlantilla, tipo: e.target.value as any })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none">
                    <option value="recordatorio">Recordatorio</option>
                    <option value="bienvenida">Bienvenida</option>
                    <option value="checkin">Check-in</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Mensaje</label>
                <textarea rows={4} value={editandoPlantilla.texto}
                  onChange={e => setEditandoPlantilla({ ...editandoPlantilla, texto: e.target.value })}
                  placeholder="Hola {nombre} 👋..."
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                />
                <div className="flex gap-1 mt-1 flex-wrap">
                  {VARS_AYUDA.map(v => (
                    <button key={v} onClick={() => setEditandoPlantilla({ ...editandoPlantilla, texto: editandoPlantilla.texto + v })}
                      className="text-[10px] bg-bg-alt border border-border px-2 py-0.5 rounded text-muted hover:border-accent hover:text-accent">
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditandoPlantilla(null); setNuevaPlantilla(false) }}
                  className="flex-1 py-2 border border-border rounded-xl text-sm text-muted">Cancelar</button>
                <button onClick={() => {
                  const existe = plantillas.find(p => p.id === editandoPlantilla.id)
                  const updated = existe
                    ? plantillas.map(p => p.id === editandoPlantilla.id ? editandoPlantilla : p)
                    : [...plantillas, editandoPlantilla]
                  savePlantillas(updated).then(() => toast('Plantilla guardada ✓', 'ok'))
                  setEditandoPlantilla(null); setNuevaPlantilla(false)
                }} className="flex-1 py-2 bg-ink text-white rounded-xl text-sm font-semibold">Guardar</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {['recordatorio', 'bienvenida', 'checkin', 'personalizado'].map(tipo => {
              const grupo = plantillas.filter(p => p.tipo === tipo)
              if (!grupo.length) return null
              const labels: Record<string, string> = { recordatorio: '⚠️ Recordatorio', bienvenida: '👋 Bienvenida', checkin: '📋 Check-in', personalizado: '✍️ Personalizado' }
              return (
                <div key={tipo}>
                  <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-2">{labels[tipo]}</p>
                  <div className="space-y-2">
                    {grupo.map(p => (
                      <div key={p.id} className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold">{p.nombre}</p>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => setEditandoPlantilla(p)}
                              className="p-1.5 text-muted hover:text-accent transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!PLANTILLAS_DEFAULT.find(d => d.id === p.id) && (
                              <button onClick={() => savePlantillas(plantillas.filter(x => x.id !== p.id)).then(() => toast('Plantilla eliminada', 'ok'))}
                                className="p-1.5 text-muted hover:text-warn transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted mt-1 line-clamp-2">{p.texto}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ENCUESTAS ── */}
      {tab === 'encuestas' && (
        <div className="space-y-4">
          <button onClick={() => { setNuevaEncuesta(true); setEditandoEncuesta({ id: `enc_${Date.now()}`, nombre: '', preguntas: [''] }) }}
            className="flex items-center gap-2 px-3 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90">
            <Plus className="w-4 h-4" /> Nueva encuesta
          </button>

          {(editandoEncuesta || nuevaEncuesta) && editandoEncuesta && (
            <div className="bg-card border border-accent/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{nuevaEncuesta ? 'Nueva encuesta' : 'Editar encuesta'}</h4>
                <button onClick={() => { setEditandoEncuesta(null); setNuevaEncuesta(false) }}>
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Nombre de la encuesta</label>
                <input type="text" value={editandoEncuesta.nombre}
                  onChange={e => setEditandoEncuesta({ ...editandoEncuesta, nombre: e.target.value })}
                  placeholder="Ej: Check-in semanal / Evaluación inicial..."
                  className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-muted">Preguntas</label>
                {editandoEncuesta.preguntas.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={p}
                      onChange={e => {
                        const ps = [...editandoEncuesta.preguntas]
                        ps[i] = e.target.value
                        setEditandoEncuesta({ ...editandoEncuesta, preguntas: ps })
                      }}
                      placeholder={`Pregunta ${i + 1}`}
                      className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none"
                    />
                    {editandoEncuesta.preguntas.length > 1 && (
                      <button onClick={() => setEditandoEncuesta({ ...editandoEncuesta, preguntas: editandoEncuesta.preguntas.filter((_, idx) => idx !== i) })}
                        className="p-2 text-muted hover:text-warn">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setEditandoEncuesta({ ...editandoEncuesta, preguntas: [...editandoEncuesta.preguntas, ''] })}
                  className="text-sm text-accent hover:underline">+ Añadir pregunta</button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditandoEncuesta(null); setNuevaEncuesta(false) }}
                  className="flex-1 py-2 border border-border rounded-xl text-sm text-muted">Cancelar</button>
                <button onClick={() => {
                  const existe = encuestas.find(e => e.id === editandoEncuesta.id)
                  const updated = existe
                    ? encuestas.map(e => e.id === editandoEncuesta.id ? editandoEncuesta : e)
                    : [...encuestas, editandoEncuesta]
                  saveEncuestas(updated).then(() => toast('Encuesta guardada ✓', 'ok'))
                  setEditandoEncuesta(null); setNuevaEncuesta(false)
                }} className="flex-1 py-2 bg-ink text-white rounded-xl text-sm font-semibold">Guardar</button>
              </div>
            </div>
          )}

          {encuestas.length === 0 ? (
            <div className="text-center py-10 text-muted border-2 border-dashed border-border rounded-2xl">
              <p className="font-serif text-lg">Sin encuestas</p>
              <p className="text-sm mt-1">Crea encuestas reutilizables para tus clientes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {encuestas.map(enc => (
                <div key={enc.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm">{enc.nombre}</p>
                    <div className="flex gap-1">
                      <button onClick={() => setEditandoEncuesta(enc)}
                        className="p-1.5 text-muted hover:text-accent transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => saveEncuestas(encuestas.filter(e => e.id !== enc.id)).then(() => toast('Encuesta eliminada', 'ok'))}
                        className="p-1.5 text-muted hover:text-warn transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted">{enc.preguntas.length} preguntas</p>
                  <div className="mt-2 space-y-1">
                    {enc.preguntas.slice(0, 3).map((p, i) => (
                      <p key={i} className="text-xs text-muted">• {p}</p>
                    ))}
                    {enc.preguntas.length > 3 && <p className="text-xs text-muted">+{enc.preguntas.length - 3} más...</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PROGRAMACIÓN ── */}
      {tab === 'programacion' && (
        <div className="space-y-4">
          <button onClick={() => setShowNuevoProg(true)}
            className="flex items-center gap-2 px-3 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90">
            <Plus className="w-4 h-4" /> Programar envío
          </button>

          {showNuevoProg && (
            <div className="bg-card border border-accent/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Nuevo envío programado</h4>
                <button onClick={() => setShowNuevoProg(false)}><X className="w-4 h-4 text-muted" /></button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Cliente</label>
                  <select value={nuevoProg.clientId || ''}
                    onChange={e => setNuevoProg({ ...nuevoProg, clientId: e.target.value })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none">
                    <option value="">Seleccionar...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.surname}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Fecha de envío</label>
                  <input type="date" value={nuevoProg.fechaEnvio}
                    onChange={e => setNuevoProg({ ...nuevoProg, fechaEnvio: e.target.value })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Tipo</label>
                <div className="flex gap-2">
                  {(['recordatorio', 'checkin', 'encuesta', 'personalizado'] as const).map(t => (
                    <button key={t} onClick={() => setNuevoProg({ ...nuevoProg, tipo: t })}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${nuevoProg.tipo === t ? 'bg-ink text-white border-ink' : 'border-border text-muted'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {nuevoProg.tipo === 'encuesta' && encuestas.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Encuesta</label>
                  <select value={nuevoProg.encuestaId || ''}
                    onChange={e => setNuevoProg({ ...nuevoProg, encuestaId: e.target.value })}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none">
                    <option value="">Seleccionar encuesta...</option>
                    {encuestas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Mensaje</label>
                <div className="flex gap-2 mb-2">
                  <select onChange={e => {
                    const p = plantillas.find(p => p.id === e.target.value)
                    if (p) setNuevoProg({ ...nuevoProg, mensaje: p.texto })
                  }} className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-xs outline-none text-muted">
                    <option value="">Usar plantilla...</option>
                    {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <textarea rows={4} value={nuevoProg.mensaje || ''}
                  onChange={e => setNuevoProg({ ...nuevoProg, mensaje: e.target.value })}
                  placeholder="Escribe el mensaje o selecciona una plantilla..."
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none resize-none"
                />
                <div className="flex gap-1 mt-1 flex-wrap">
                  {VARS_AYUDA.map(v => (
                    <button key={v} onClick={() => setNuevoProg({ ...nuevoProg, mensaje: (nuevoProg.mensaje || '') + v })}
                      className="text-[10px] bg-bg-alt border border-border px-2 py-0.5 rounded text-muted hover:border-accent">
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowNuevoProg(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted">Cancelar</button>
                <button onClick={guardarProgramacion}
                  className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">
                  <Calendar className="w-4 h-4 inline mr-1" /> Programar
                </button>
              </div>
            </div>
          )}

          {/* Lista de programados */}
          {programacion.length === 0 ? (
            <div className="text-center py-10 text-muted border-2 border-dashed border-border rounded-2xl">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin envíos programados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Pendientes hoy primero */}
              {pendientesHoy.length > 0 && (
                <div className="bg-warn/5 border border-warn/20 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-warn">Enviar hoy</p>
                  {pendientesHoy.map(p => (
                    <div key={p.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{p.clientName}</p>
                        <p className="text-xs text-muted line-clamp-1">{p.mensaje}</p>
                      </div>
                      <button onClick={() => enviarWhatsApp(p)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366] text-white rounded-lg text-xs font-bold flex-shrink-0">
                        <Send className="w-3.5 h-3.5" /> Enviar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Todos */}
              <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
                {programacion.map(p => (
                  <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${p.enviado ? 'opacity-50' : ''}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.enviado ? 'bg-ok' : p.fechaEnvio <= hoy ? 'bg-warn' : 'bg-border'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{p.clientName}</p>
                        <span className="text-[10px] bg-bg-alt border border-border px-1.5 py-0.5 rounded text-muted">{p.tipo}</span>
                      </div>
                      <p className="text-xs text-muted">{new Date(p.fechaEnvio + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} · {p.mensaje.slice(0, 50)}...</p>
                    </div>
                    {!p.enviado && (
                      <button onClick={() => enviarWhatsApp(p)}
                        className="p-2 text-[#25D366] hover:bg-[#25D366]/10 rounded-lg transition-colors flex-shrink-0">
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    {p.enviado && <Check className="w-4 h-4 text-ok flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
