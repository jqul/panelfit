
   lastActive?: string; doneToday?: boolean; hasPlan?: boolean; weeklyDays?: number
 }
 
 interface Props {
   userProfile: UserProfile
   onLogout: () => void
   onSelectClient: (client: ClientData) => void
   demoClients?: ClientData[]
 }
 
 export function TrainerDashboard({ userProfile, onLogout, onSelectClient, demoClients }: Props) {
   const [clients, setClients] = useState<ClientWithStats[]>([])
   const [loading, setLoading] = useState(true)
   const [activeTab, setActiveTab] = useState<Tab>('dashboard')
   const [search, setSearch] = useState('')
   const [clientFilter, setClientFilter] = useState<ClientFilter>('all')
   const [showAdd, setShowAdd] = useState(false)
   const [newClient, setNewClient] = useState({ name: '', surname: '' })
   const [adding, setAdding] = useState(false)
   const [deletingId, setDeletingId] = useState<string | null>(null)
   const [linkModal, setLinkModal] = useState<ClientData | null>(null)
   const [sidebarOpen, setSidebarOpen] = useState(false)
   const [quickNote, setQuickNote] = useState(() => localStorage.getItem('pf_quick_note') || '')
   const [logsMap, setLogsMap] = useState<Record<string, any>>({})
   const library = useExerciseLibrary(userProfile.uid)
+  const clientLimit = userProfile.clientLimit ?? 5
+  const limitReached = !demoClients && clients.length >= clientLimit
 
   const fetchClients = async () => {
     setLoading(true)
     if (demoClients) { setClients(demoClients as ClientWithStats[]); setLoading(false); return }
     const { data, error } = await supabase.from('clientes').select('*').eq('trainerId', userProfile.uid)
     if (error) { console.error('Error:', error); setLoading(false); return }
     const mapped = mapClientes(data || [])
     const hoy = new Date().toISOString().split('T')[0]
     const haceUnaS = new Date(); haceUnaS.setDate(haceUnaS.getDate() - 7)
     if (mapped.length) {
       const ids = mapped.map(c => c.id)
       const { data: regs } = await supabase.from('registros').select('clientId,logs').in('clientId', ids)
       const { data: planes } = await supabase.from('planes').select('clientId,plan').in('clientId', ids)
       const planMap: Record<string, boolean> = {}
       ;(planes || []).forEach((p: any) => { planMap[p.clientId] = !!(p.plan?.P?.weeks?.length) })
       const lm: Record<string, any> = {}
       ;(regs || []).forEach((r: any) => { lm[r.clientId] = r.logs || {} })
       setLogsMap(lm)
       setClients(mapped.map(c => {
         const reg = (regs || []).find((r: any) => r.clientId === c.id)
         const logs = reg?.logs || {}
         const dates = [...new Set(Object.values(logs).filter((l: any) => l.dateDone).map((l: any) => l.dateDone as string))].sort().reverse()
         return { ...c, lastActive: dates[0], doneToday: dates[0] === hoy, hasPlan: planMap[c.id] || false, weeklyDays: dates.filter(d => new Date(d) >= haceUnaS).length }
       }))
     } else setClients([])
     setLoading(false)
   }
 
   useEffect(() => {
     fetchClients()
     const channel = supabase.channel('clientes-rt')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes', filter: `trainerId=eq.${userProfile.uid}` }, fetchClients)
       .subscribe()
     return () => { supabase.removeChannel(channel) }
   }, [userProfile.uid])
 
   const handleAdd = async () => {
     if (!newClient.name.trim()) return
+    if (limitReached) { toast(`Límite alcanzado: tu plan permite ${clientLimit} clientes.`, 'warn'); return }
     setAdding(true)
     const token = Math.random().toString(36).slice(2, 14)
     const { error } = await supabase.from('clientes').insert({ trainerId: userProfile.uid, name: newClient.name.trim(), surname: newClient.surname.trim(), token, createdAt: Date.now() })
     if (error) toast('Error: ' + error.message, 'warn')
     else { toast('Cliente creado ✓', 'ok'); setShowAdd(false); setNewClient({ name: '', surname: '' }); fetchClients() }
     setAdding(false)
   }
 
   const handleDelete = async (id: string) => {
     await supabase.from('clientes').delete().eq('id', id)
     setDeletingId(null); fetchClients(); toast('Cliente eliminado', 'ok')
   }
 
   const getClientUrl = (c: ClientData) => `${window.location.origin}?c=${c.token}`
   const sendWhatsApp = (c: ClientData) => {
     window.open(`https://wa.me/?text=${encodeURIComponent(`Hola ${c.name} 👋\n\nTe comparto el enlace a tu panel:\n\n${getClientUrl(c)}\n\n💪`)}`, '_blank')
   }
 
   const hoy = new Date().toISOString().split('T')[0]
   const haceUnaS = new Date(); haceUnaS.setDate(haceUnaS.getDate() - 7)
   const activeToday = clients.filter(c => c.doneToday).length
   const noPlan = clients.filter(c => !c.hasPlan).length
   const noActivity7d = clients.filter(c => !c.lastActive || new Date(c.lastActive) < haceUnaS).length
   const alerts = clients.filter(c => !c.hasPlan || (c.lastActive && new Date(c.lastActive) < haceUnaS))
 

         {NAV_GROUPS.map(group => (
           <div key={group.label}>
             <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted/60 px-3 mb-1">{group.label}</p>
             <div className="space-y-0.5">
               {group.items.map(({ id, icon: Icon, label, badge }) => (
                 <button key={id} onClick={() => handleTabChange(id)}
                   className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === id ? 'bg-ink text-white' : 'text-muted hover:bg-bg-alt hover:text-ink'}`}>
                   <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                   <span className="flex-1 text-left">{label}</span>
                   {badge !== undefined && badge > 0 && (
                     <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === id ? 'bg-white/20' : 'bg-bg-alt text-muted'}`}>{badge}</span>
                   )}
                 </button>
               ))}
             </div>
           </div>
         ))}
       </nav>
       <div className="p-3 border-t border-border space-y-1.5">
         {alerts.length > 0 && (
           <button onClick={() => { setActiveTab('clients'); setClientFilter('no-activity'); setSidebarOpen(false) }}
             className="w-full flex items-center gap-2 px-3 py-2 bg-warn/5 border border-warn/20 rounded-lg text-xs font-semibold text-warn hover:bg-warn/10">
             <Bell className="w-3.5 h-3.5" /> {alerts.length} alerta{alerts.length > 1 ? 's' : ''}
           </button>
         )}

+        <button onClick={() => { if (!limitReached) setShowAdd(true); setSidebarOpen(false) }}
           className="w-full flex items-center gap-2 px-3 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90">
           <UserPlus className="w-3.5 h-3.5" /> Nuevo cliente
         </button>
         <button onClick={onLogout}
           className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-muted hover:bg-bg-alt transition-colors">
           <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
         </button>
       </div>
     </div>
   )
 
   return (
     <div className="flex min-h-[100dvh] overflow-hidden bg-bg">
       <div className="hidden lg:block w-52 flex-shrink-0 bg-card border-r border-border"><SidebarContent /></div>
       {sidebarOpen && (
         <>
           <div className="fixed inset-0 bg-ink/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
           <div className="fixed inset-y-0 left-0 z-40 w-52 bg-card border-r border-border lg:hidden"><SidebarContent /></div>
         </>
       )}
       <main className="flex-1 overflow-y-auto min-w-0 min-h-0">
         <div className="lg:hidden sticky top-0 z-20 bg-card border-b border-border flex items-center justify-between px-4 h-14">
           <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-bg-alt text-muted"><Menu className="w-5 h-5" /></button>
           <h1 className="text-lg font-serif font-bold">Panel<span className="text-accent italic">Fit</span></h1>
           <button onClick={() => setShowAdd(true)} className="p-2 rounded-lg hover:bg-bg-alt text-muted"><UserPlus className="w-5 h-5" /></button>

                   <div className="p-3 space-y-1.5">
                     {alerts.slice(0, 3).map(c => (
                       <button key={c.id} onClick={() => onSelectClient(c)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-bg-alt/50 text-left transition-colors">
                         <div className="w-4 h-4 rounded border-2 border-border flex-shrink-0" />
                         <p className="text-xs text-muted">{!c.hasPlan ? `Crear plan para ${c.name}` : `Revisar progreso de ${c.name}`}</p>
                       </button>
                     ))}
                     {alerts.length === 0 && <div className="px-3 py-4 text-center"><CheckCircle2 className="w-6 h-6 text-ok mx-auto mb-1 opacity-60" /><p className="text-xs text-muted">Todo al día ✓</p></div>}
                   </div>
                 </div>
                 <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                   <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2"><StickyNote className="w-3.5 h-3.5 text-accent" /><h3 className="text-sm font-semibold">Notas rápidas</h3></div>
                   <div className="p-3">
                     <textarea value={quickNote} onChange={e => { setQuickNote(e.target.value); localStorage.setItem('pf_quick_note', e.target.value) }}
                       placeholder="Anota algo al vuelo..." rows={4}
                       className="w-full text-xs text-muted bg-bg-alt/50 border border-border/50 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent/20 resize-none leading-relaxed" />
                   </div>
                 </div>
               </div>
             </div>
           )}
 
           {activeTab === 'clients' && (
             <div className="animate-fade-in space-y-5 max-w-5xl">
               <div className="flex items-center justify-between">

+                <div><h2 className="text-3xl font-serif font-bold">Clientes</h2><p className="text-muted text-sm mt-1">{clients.length}/{clientLimit} alumnos {limitReached ? '· límite alcanzado' : ''}</p></div>
+                <Button className="gap-2" onClick={() => setShowAdd(true)} disabled={limitReached}><UserPlus className="w-4 h-4" /> Nuevo</Button>
               </div>
               <div className="flex gap-3 flex-wrap">
                 <div className="relative flex-1 min-w-40">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                   <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                     className="w-full pl-9 pr-4 py-2.5 bg-white border border-border/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 shadow-sm" />
                 </div>
                 <div className="flex gap-2 flex-wrap">
                   {([{ id: 'all', label: 'Todos' }, { id: 'active', label: '✓ Hoy' }, { id: 'no-plan', label: '⚠ Sin plan' }, { id: 'no-activity', label: '💤 Inactivos' }] as const).map(f => (
                     <button key={f.id} onClick={() => setClientFilter(f.id)}
                       className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${clientFilter === f.id ? 'bg-ink text-white border-ink' : 'bg-white border-border/50 text-muted hover:border-accent shadow-sm'}`}>
                       {f.label}
                     </button>
                   ))}
                 </div>
               </div>
               {loading ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-40 bg-white rounded-2xl animate-pulse shadow-sm" />)}</div>
               ) : filteredClients.length === 0 ? (
                 <div className="text-center py-20 bg-white rounded-2xl shadow-sm"><Users className="w-12 h-12 text-muted/30 mx-auto mb-4" /><p className="font-serif font-bold text-lg">Sin resultados</p></div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                   {filteredClients.map(client => (
                     <div key={client.id} className="bg-white rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer group shadow-sm" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }} onClick={() => onSelectClient(client)}>
                       <div className="flex items-center gap-3 mb-4">

                         </div>
                         <div className="min-w-0 flex-1">
                           <p className="font-serif font-bold text-base truncate">{client.name} {client.surname}</p>
                           <p className="text-[10px] text-muted mt-0.5">{client.doneToday ? <span className="text-ok font-bold">✓ Entrenó hoy</span> : formatLastActive(client.lastActive)}</p>
                         </div>
                       </div>
                       <div className="flex gap-2 mb-4 flex-wrap">
                         {!client.hasPlan && <span className="text-[10px] font-bold bg-warn/10 text-warn px-2 py-0.5 rounded-full">Sin plan</span>}
                         {client.hasPlan && <span className="text-[10px] font-bold bg-ok/10 text-ok px-2 py-0.5 rounded-full">Plan ✓</span>}
                         {!!client.weeklyDays && <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full">{client.weeklyDays}d semana</span>}
                       </div>
                       {deletingId === client.id ? (
                         <div className="flex gap-2">
                           <Button variant="danger" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); handleDelete(client.id) }}>Eliminar</Button>
                           <Button variant="outline" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); setDeletingId(null) }}>Cancelar</Button>
                         </div>
                       ) : (
                         <div className="flex gap-2">
                           <Button variant="outline" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); onSelectClient(client) }}>✏️ Plan</Button>
                           <Button variant="outline" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); setLinkModal(client) }}><MessageCircle className="w-3.5 h-3.5 mr-1" /> Enviar</Button>
                           <Button variant="outline" size="sm" className="px-2" onClick={e => { e.stopPropagation(); setDeletingId(client.id) }}><Trash2 className="w-3.5 h-3.5 text-warn" /></Button>
                         </div>
                       )}
                     </div>
                   ))}

+                  <button onClick={() => !limitReached && setShowAdd(true)} disabled={limitReached} className="border-2 border-dashed border-border rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-muted hover:border-accent hover:text-accent transition-all min-h-[180px] disabled:opacity-50 disabled:cursor-not-allowed">
                     <UserPlus className="w-6 h-6" /><span className="text-sm font-medium">Añadir cliente</span>
                   </button>
                 </div>
               )}
             </div>
           )}
 
           {activeTab === 'exercises' && <ExercisesTab exercises={library.exercises} trainerId={userProfile.uid} onAdd={(n,d,c,v,e,t) => library.addExercise(n,d,c,v,e as any,t)} onUpdate={library.updateExercise} onDelete={library.deleteExercise} />}
           {activeTab === 'templates' && <TemplatesTab trainerId={userProfile.uid} clients={clients} />}
           {activeTab === 'settings' && <SettingsTab userProfile={userProfile} onLogout={onLogout} />}
           {activeTab === 'mensajes' && <MensajesTab userProfile={userProfile} clients={clients} />}
           {activeTab === 'insights' && <InsightsTab clients={clients} logsMap={logsMap} />}
           {activeTab === 'adherencia' && <AdherenciaTab clients={clients} logsMap={logsMap} />}
           {activeTab === 'encuestas' && <EncuestasTab trainerId={userProfile.uid} clients={clients} />}
         </div>
       </main>
 
       <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nuevo cliente">
         <div className="space-y-4">
           <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre *</label>
             <input autoFocus type="text" value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Nombre" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
           <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Apellido</label>
             <input type="text" value={newClient.surname} onChange={e => setNewClient(p => ({ ...p, surname: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Apellido" className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" /></div>
           <div className="flex gap-3 pt-2">
             <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancelar</Button>
