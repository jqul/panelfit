import { useState, useEffect, useMemo } from 'react';
import { Plus, Users, BarChart3, ClipboardList, LogOut, Search, UserPlus, Settings as SettingsIcon, Dumbbell, LayoutDashboard, TrendingUp, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';
import { Button } from './Button';
import { ClientData, UserProfile } from '../types';
import { Settings } from './Settings';
import { ExerciseLibrary } from './ExerciseLibrary';
import { ClientPanel } from './ClientPanel';
import { TrainingTemplates } from './TrainingTemplates';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export function TrainerDashboard({ 
  userProfile, 
  onLogout, 
  onSelectClient 
}: { 
  userProfile: UserProfile, 
  onLogout: () => void,
  onSelectClient?: (client: ClientData) => void
}) {
  console.log('🏋️ PanelFit: TrainerDashboard render');
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', surname: '' });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'exercises' | 'templates' | 'settings'>('dashboard');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      if (userProfile.uid === 'demo-trainer' || userProfile.uid.startsWith('demo-')) {
        setClients([
          {
            id: 'demo-client-1',
            name: 'Juan',
            surname: 'Pérez',
            weight: 82,
            fatPercentage: 18,
            muscleMass: 35,
            totalLifted: 450,
            planDescription: 'Hipertrofia Avanzada',
            trainerId: 'demo-trainer',
            token: 'demo-token-1',
            createdAt: Date.now() - 10000000
          },
          {
            id: 'demo-client-2',
            name: 'María',
            surname: 'García',
            weight: 65,
            fatPercentage: 22,
            muscleMass: 28,
            totalLifted: 210,
            planDescription: 'Pérdida de Grasa',
            trainerId: 'demo-trainer',
            token: 'demo-token-2',
            createdAt: Date.now() - 5000000
          }
        ]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('clientes')
        .select('*')
        .eq('trainerId', userProfile.uid);
      
      if (fetchError) throw fetchError;

      if (data) {
        // Map database fields (nombre, apellido) to UI fields (name, surname)
        const mappedClients = data.map((c: any) => ({
          ...c,
          name: c.nombre || c.name || 'Sin nombre',
          surname: c.apellido || c.surname || ''
        }));
        setClients(mappedClients as ClientData[]);
      }
    } catch (err: any) {
      console.error('❌ PanelFit: Error cargando clientes:', err);
      setError(err.message || 'No se pudieron cargar tus clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (clientId.startsWith('demo-client-')) {
      setClients(prev => prev.filter(c => c.id !== clientId));
      setDeletingId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clientId);
      
      if (error) throw error;
      
      // Update local state immediately for better UX
      setClients(prev => prev.filter(c => c.id !== clientId));
      setDeletingId(null);
    } catch (error: any) {
      console.error('❌ PanelFit: Error eliminando cliente:', error);
      alert('Error al eliminar el cliente: ' + error.message);
    }
  };

  useEffect(() => {
    fetchClients();

    if (userProfile.uid !== 'demo-trainer') {
      // Real-time subscription
      const channel = supabase
        .channel('public:clientes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes', filter: `trainerId=eq.${userProfile.uid}` }, payload => {
          if (payload.eventType === 'INSERT') {
            const newClient = payload.new as any;
            const mappedClient: ClientData = {
              ...newClient,
              name: newClient.nombre || newClient.name || 'Sin nombre',
              surname: newClient.apellido || newClient.surname || ''
            };
            setClients(prev => {
              if (prev.some(c => c.id === mappedClient.id)) return prev;
              return [...prev, mappedClient];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedClient = payload.new as any;
            const mappedClient: ClientData = {
              ...updatedClient,
              name: updatedClient.nombre || updatedClient.name || 'Sin nombre',
              surname: updatedClient.apellido || updatedClient.surname || ''
            };
            setClients(prev => prev.map(c => c.id === mappedClient.id ? mappedClient : c));
          } else if (payload.eventType === 'DELETE') {
            setClients(prev => prev.filter(c => c.id !== payload.old.id));
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userProfile.uid]);

  const handleAddClient = async () => {
    if (!newClient.name) return;

    if (userProfile.uid === 'demo-trainer') {
      const demoClient: ClientData = {
        id: `demo-client-${Date.now()}`,
        name: newClient.name,
        surname: newClient.surname,
        weight: 0,
        fatPercentage: 0,
        muscleMass: 0,
        totalLifted: 0,
        planDescription: 'Nuevo plan',
        trainerId: userProfile.uid,
        token: Math.random().toString(36).substring(2, 15),
        createdAt: Date.now(),
      };
      setClients(prev => [...prev, demoClient]);
      setShowAddModal(false);
      setNewClient({ name: '', surname: '' });
      return;
    }

    try {
      const clientToInsert = {
        nombre: newClient.name,
        apellido: newClient.surname,
        trainerId: userProfile.uid,
        weight: 0,
        fatPercentage: 0,
        muscleMass: 0,
        totalLifted: 0,
        planDescription: 'Nuevo plan',
        token: Math.random().toString(36).substring(2, 15),
        createdAt: Date.now(),
      };

      const { data, error } = await supabase
        .from('clientes')
        .insert([clientToInsert])
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        const mappedClient: ClientData = {
          ...data,
          name: data.nombre || data.name,
          surname: data.apellido || data.surname
        };
        // Update local state immediately
        setClients(prev => [...prev, mappedClient]);
      }
      
      setShowAddModal(false);
      setNewClient({ name: '', surname: '' });
    } catch (error: any) {
      console.error('❌ PanelFit: Error creando cliente:', error);
      alert('Error al crear el cliente: ' + (error.message || 'Error desconocido'));
    }
  };

  const filteredClients = clients.filter(c => 
    `${c.name} ${c.surname}`.toLowerCase().includes(search.toLowerCase())
  );

  const chartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return {
        month: d.toLocaleString('es-ES', { month: 'short' }),
        count: 0
      };
    }).reverse();

    clients.forEach(c => {
      const cDate = new Date(c.createdAt);
      const monthStr = cDate.toLocaleString('es-ES', { month: 'short' });
      const monthData = last6Months.find(m => m.month === monthStr);
      if (monthData) monthData.count++;
    });

    // Cumulative count
    let total = 0;
    return last6Months.map(m => {
      total += m.count;
      return { ...m, total };
    });
  }, [clients]);

  const recentClients = [...clients].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-serif font-bold tracking-tight">
            Panel<span className="text-accent">Fit</span>
          </h1>
        </div>
        
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-bg-alt border border-border flex items-center justify-center font-serif text-accent overflow-hidden">
              {userProfile.photoURL ? (
                <img src={userProfile.photoURL} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                userProfile.displayName[0]
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{userProfile.displayName}</p>
              <p className="text-xs text-muted truncate">{userProfile.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dashboard' ? 'bg-ink text-white' : 'text-muted hover:bg-bg-alt hover:text-ink'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('clients')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'clients' ? 'bg-ink text-white' : 'text-muted hover:bg-bg-alt hover:text-ink'
            }`}
          >
            <Users className="w-4 h-4" />
            Clientes
            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
              activeTab === 'clients' ? 'bg-ok text-white' : 'bg-bg-alt text-muted'
            }`}>
              {clients.length}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('exercises')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'exercises' ? 'bg-ink text-white' : 'text-muted hover:bg-bg-alt hover:text-ink'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Ejercicios
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'templates' ? 'bg-ink text-white' : 'text-muted hover:bg-bg-alt hover:text-ink'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Plantillas
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings' ? 'bg-ink text-white' : 'text-muted hover:bg-bg-alt hover:text-ink'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            Configuración
          </button>
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Button variant="outline" className="w-full justify-start gap-3" onClick={onLogout}>
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </Button>
          <Button className="w-full gap-2" onClick={() => setShowAddModal(true)}>
            <UserPlus className="w-4 h-4" />
            Nuevo Cliente
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-bg p-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' ? (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-serif font-bold">Resumen</h2>
                  <p className="text-muted text-sm mt-1">Bienvenido de nuevo, {userProfile.displayName}</p>
                </div>
                <Button className="gap-2" onClick={() => setShowAddModal(true)}>
                  <UserPlus className="w-4 h-4" />
                  Nuevo Cliente
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-accent/10 text-accent rounded-xl">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted">Total Clientes</span>
                  </div>
                  <p className="text-4xl font-serif font-bold">{clients.length}</p>
                </div>
                <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-ok/10 text-ok rounded-xl">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted">Crecimiento</span>
                  </div>
                  <p className="text-4xl font-serif font-bold">+{chartData[chartData.length - 1]?.count || 0}</p>
                  <p className="text-[10px] text-muted uppercase tracking-widest font-bold mt-1">Este mes</p>
                </div>
                <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-warn/10 text-warn rounded-xl">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted">Próxima Sesión</span>
                  </div>
                  <p className="text-2xl font-serif font-bold">Hoy</p>
                  <p className="text-[10px] text-muted uppercase tracking-widest font-bold mt-1">3 entrenos programados</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-card border border-border p-6 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-serif font-bold">Crecimiento de Alumnos</h3>
                    <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Histórico</p>
                  </div>
                  <div className="h-[250px] w-full" style={{ minHeight: '250px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF6321" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#FF6321" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2A2A" />
                        <XAxis 
                          dataKey="month" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#8E9299', fontSize: 10 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#8E9299', fontSize: 10 }}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                          itemStyle={{ color: '#FF6321', fontSize: '12px' }}
                          labelStyle={{ color: '#FFFFFF', fontSize: '10px', marginBottom: '4px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#FF6321" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorTotal)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h3 className="text-lg font-serif font-bold">Altas Recientes</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {recentClients.length > 0 ? (
                      recentClients.map(c => (
                        <div 
                          key={c.id} 
                          className="p-4 hover:bg-bg-alt transition-colors cursor-pointer flex items-center justify-between group"
                          onClick={() => onSelectClient?.(c)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-xs">
                              {c.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{c.name} {c.surname}</p>
                              <p className="text-[10px] text-muted">{new Date(c.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-muted italic text-sm">
                        No hay clientes recientes
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-bg-alt/50 border-t border-border">
                    <button 
                      onClick={() => setActiveTab('clients')}
                      className="text-[10px] uppercase tracking-widest font-bold text-accent hover:underline w-full text-center"
                    >
                      Ver todos los clientes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'clients' ? (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-serif font-bold">Clientes</h2>
                  <p className="text-muted text-sm mt-1">Gestiona los planes de entrenamiento de tus alumnos</p>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/20 transition-all text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {error ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-warn/5 border border-warn/20 rounded-2xl gap-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-warn">Error de Conexión</h3>
                    <p className="text-muted text-sm max-w-md mx-auto">
                      No hemos podido cargar tu lista de clientes. Por favor, comprueba tu conexión o intenta reintentar.
                    </p>
                    <p className="text-warn/60 text-xs font-mono mt-2">{error}</p>
                  </div>
                  <div className="flex gap-3">
                    <Button size="sm" onClick={() => fetchClients()} className="gap-2">
                      Reintentar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                      Recargar Página
                    </Button>
                  </div>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-card border border-border rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredClients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClients.map(client => (
                    <div 
                      key={client.id}
                      className="group bg-card border border-border rounded-xl p-5 hover:border-accent hover:shadow-md transition-all cursor-pointer relative"
                      onClick={() => onSelectClient?.(client)}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-bg-alt border border-border flex items-center justify-center font-serif text-lg text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                          {client.name[0]}
                        </div>
                        <div>
                          <h3 className="font-serif font-bold text-lg leading-tight">{client.name} {client.surname}</h3>
                          <p className="text-xs text-muted mt-0.5">Creado el {new Date(client.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {deletingId === client.id ? (
                          <div className="flex-1 flex gap-2">
                            <Button 
                              variant="danger" 
                              size="sm" 
                              className="flex-1 text-[10px] uppercase tracking-wider"
                              onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                            >
                              Confirmar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 text-[10px] uppercase tracking-wider"
                              onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                            >
                              No
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button variant="outline" size="sm" className="flex-1 text-[10px] uppercase tracking-wider" onClick={(e) => { e.stopPropagation(); onSelectClient?.(client); }}>Plan</Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 text-[10px] uppercase tracking-wider"
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = `${window.location.origin}?c=${client.token}`;
                                navigator.clipboard.writeText(url);
                                alert('Enlace copiado al portapapeles');
                              }}
                            >
                              Enlace
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="px-2 hover:bg-warn/10 hover:border-warn/30 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(client.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-warn" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <button 
                    className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-muted hover:border-accent hover:text-accent transition-all min-h-[140px]"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-sm font-medium">Añadir Cliente</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-20 bg-card border border-border rounded-2xl border-dashed">
                  <Users className="w-12 h-12 text-muted/30 mx-auto mb-4" />
                  <h3 className="text-lg font-serif font-bold">No hay clientes</h3>
                  <p className="text-muted text-sm mt-1">Empieza añadiendo a tu primer alumno</p>
                  <Button className="mt-6 gap-2" onClick={() => setShowAddModal(true)}>
                    <UserPlus className="w-4 h-4" />
                    Añadir mi primer cliente
                  </Button>
                </div>
              )}
            </>
          ) : activeTab === 'exercises' ? (
            <ExerciseLibrary />
          ) : activeTab === 'templates' ? (
            <TrainingTemplates />
          ) : (
            <Settings userProfile={userProfile} />
          )}
        </div>
      </main>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-8">
            <h3 className="text-xl font-serif font-bold mb-6">Nuevo Cliente</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Nombre</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-bg border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent transition-all"
                  placeholder="Nombre"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Apellido</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-bg border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent transition-all"
                  placeholder="Apellido"
                  value={newClient.surname}
                  onChange={(e) => setNewClient({ ...newClient, surname: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleAddClient}>Crear Cliente</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
