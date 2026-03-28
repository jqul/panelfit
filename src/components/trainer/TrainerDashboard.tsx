import { useState, useEffect, useMemo } from 'react';
import { Plus, Users, ClipboardList, LogOut, Search, UserPlus, Settings as SettingsIcon, Dumbbell, LayoutDashboard, TrendingUp, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // <-- RUTA CORREGIDA
import { Button } from '../shared/Button'; // <-- RUTA CORREGIDA
import { ClientData, UserProfile } from '../../types'; // <-- RUTA CORREGIDA
import { ClientPanel } from './ClientPanel'; // <-- MISMA CARPETA
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// Importa los tabs si los tienes en archivos separados, si no, bórralos
// import { ExercisesTab } from './ExercisesTab';
// import { TemplatesTab } from './TemplatesTab';

export function TrainerDashboard({ 
  userProfile, 
  onLogout, 
  onSelectClient 
}: { 
  userProfile: UserProfile, 
  onLogout: () => void,
  onSelectClient?: (client: ClientData) => void
}) {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', surname: '' });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'exercises' | 'templates' | 'settings'>('dashboard');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase.from('clientes').select('*').eq('trainerId', userProfile.uid);
      if (fetchError) throw fetchError;
      if (data) {
        const mappedClients = data.map((c: any) => ({
          ...c,
          name: c.nombre || c.name || 'Sin nombre',
          surname: c.apellido || c.surname || ''
        }));
        setClients(mappedClients as ClientData[]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [userProfile.uid]);

  const handleAddClient = async () => {
    if (!newClient.name) return;
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
      const { data, error } = await supabase.from('clientes').insert([clientToInsert]).select().single();
      if (error) throw error;
      if (data) {
        const mapped = { ...data, name: data.nombre, surname: data.apellido };
        setClients(prev => [...prev, mapped]);
      }
      setShowAddModal(false);
      setNewClient({ name: '', surname: '' });
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const filteredClients = clients.filter(c => `${c.name} ${c.surname}`.toLowerCase().includes(search.toLowerCase()));
  const recentClients = [...clients].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  const chartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return { month: d.toLocaleString('es-ES', { month: 'short' }), count: 0 };
    }).reverse();
    clients.forEach(c => {
      const cDate = new Date(c.createdAt);
      const monthStr = cDate.toLocaleString('es-ES', { month: 'short' });
      const monthData = last6Months.find(m => m.month === monthStr);
      if (monthData) monthData.count++;
    });
    let total = 0;
    return last6Months.map(m => { total += m.count; return { ...m, total }; });
  }, [clients]);

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
      <aside className="w-full lg:w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border"><h1 className="text-2xl font-serif font-bold">PanelFit</h1></div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === 'dashboard' ? 'bg-ink text-white' : 'text-muted'}`}><LayoutDashboard className="w-4 h-4" />Dashboard</button>
          <button onClick={() => setActiveTab('clients')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === 'clients' ? 'bg-ink text-white' : 'text-muted'}`}><Users className="w-4 h-4" />Clientes</button>
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <Button variant="outline" className="w-full justify-start gap-3" onClick={onLogout}><LogOut className="w-4 h-4" />Cerrar sesión</Button>
          <Button className="w-full gap-2" onClick={() => setShowAddModal(true)}><UserPlus className="w-4 h-4" />Nuevo Cliente</Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-bg p-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' ? (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-serif font-bold">Resumen</h2>
                <Button className="gap-2" onClick={() => setShowAddModal(true)}><UserPlus className="w-4 h-4" />Nuevo Cliente</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border p-6 rounded-2xl shadow-sm"><Users className="w-6 h-6 text-accent mb-2" /><p className="text-4xl font-serif font-bold">{clients.length}</p><p className="text-xs text-muted uppercase">Total Clientes</p></div>
                <div className="bg-card border p-6 rounded-2xl shadow-sm"><TrendingUp className="w-6 h-6 text-ok mb-2" /><p className="text-4xl font-serif font-bold">+{chartData[chartData.length - 1]?.total || 0}</p><p className="text-xs text-muted uppercase">Este mes</p></div>
                <div className="bg-card border p-6 rounded-2xl shadow-sm"><Calendar className="w-6 h-6 text-warn mb-2" /><p className="text-2xl font-serif font-bold">Hoy</p><p className="text-xs text-muted uppercase">Próxima Sesión</p></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-card border p-6 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-serif font-bold mb-4">Crecimiento</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2A2A" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8E9299', fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8E9299', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A' }} />
                        <Area type="monotone" dataKey="total" stroke="#FF6321" fill="#FF6321" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-border"><h3 className="text-lg font-serif font-bold">Altas Recientes</h3></div>
                  <div className="divide-y divide-border">
                    {recentClients.map(c => (
                      <div key={c.id} onClick={() => onSelectClient?.(c)} className="p-4 hover:bg-bg-alt cursor-pointer flex items-center justify-between group">
                        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-xs">{c.name[0]}</div><div><p className="text-sm font-bold">{c.name} {c.surname}</p></div></div>
                        <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'clients' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredClients.map(client => (
                <div key={client.id} className="bg-card border border-border rounded-xl p-5 hover:border-accent transition-all cursor-pointer" onClick={() => onSelectClient?.(client)}>
                  <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 rounded-full bg-bg-alt flex items-center justify-center font-serif text-lg text-accent">{client.name[0]}</div><div><h3 className="font-serif font-bold text-lg leading-tight">{client.name} {client.surname}</h3></div></div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={(e: any) => { e.stopPropagation(); onSelectClient?.(client); }}>Plan</Button>
                    <Button variant="outline" size="sm" className="px-2" onClick={(e: any) => { e.stopPropagation(); setDeletingId(client.id); }}><Trash2 className="w-4 h-4 text-warn" /></Button>
                  </div>
                </div>
              ))}
              <button onClick={() => setShowAddModal(true)} className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-muted hover:border-accent hover:text-accent transition-all min-h-[140px]"><Plus className="w-6 h-6" /><span className="text-sm font-medium">Añadir Cliente</span></button>
            </div>
          ) : (
            <div className="p-8 text-center">Pestaña en desarrollo...</div>
          )}
        </div>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-8">
            <h3 className="text-xl font-serif font-bold mb-6">Nuevo Cliente</h3>
            <div className="space-y-4">
              <input type="text" className="w-full px-4 py-3 bg-bg border border-border rounded-lg outline-none" placeholder="Nombre" value={newClient.name} onChange={(e: any) => setNewClient({ ...newClient, name: e.target.value })} />
              <input type="text" className="w-full px-4 py-3 bg-bg border border-border rounded-lg outline-none" placeholder="Apellido" value={newClient.surname} onChange={(e: any) => setNewClient({ ...newClient, surname: e.target.value })} />
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
