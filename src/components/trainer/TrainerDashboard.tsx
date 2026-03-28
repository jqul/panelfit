import { useState, useEffect, useMemo } from 'react';
import { Plus, Users, ClipboardList, LogOut, Search, UserPlus, Settings as SettingsIcon, Dumbbell, LayoutDashboard, TrendingUp, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import { supabase } from '../../supabase'; // <-- CAMBIADO A ../../
import { Button } from '../Button'; // <-- CAMBIADO A ../
import { ClientData, UserProfile } from '../../types'; // <-- CAMBIADO A ../../
import { Settings } from '../Settings'; // <-- CAMBIADO A ../
import { ExerciseLibrary } from '../ExerciseLibrary'; // <-- CAMBIADO A ../
import { ClientPanel } from '../ClientPanel'; // <-- CAMBIADO A ../
import { TrainingTemplates } from '../TrainingTemplates'; // <-- CAMBIADO A ../
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      await supabase.from('clientes').delete().eq('id', clientId);
      setClients(prev => prev.filter(c => c.id !== clientId));
      setDeletingId(null);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  useEffect(() => {
    fetchClients();
    const channel = supabase
      .channel('public:clientes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes', filter: `trainerId=eq.${userProfile.uid}` }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const newC = payload.new as any;
          const mapped = { ...newC, name: newC.nombre || newC.name, surname: newC.apellido || newC.surname };
          setClients(prev => prev.some(c => c.id === mapped.id) ? prev : [...prev, mapped]);
        } else if (payload.eventType === 'DELETE') {
          setClients(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
      {/* ... (Resto del JSX igual que antes, asegúrate de que los onClick tengan tipos si fallan) ... */}
      {/* Ejemplo: onClick={(e: React.MouseEvent) => ... } */}
      <aside className="w-full lg:w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border"><h1 className="text-2xl font-serif font-bold">PanelFit</h1></div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === 'dashboard' ? 'bg-ink text-white' : 'text-muted'}`}><LayoutDashboard className="w-4 h-4" />Dashboard</button>
          <button onClick={() => setActiveTab('clients')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${activeTab === 'clients' ? 'bg-ink text-white' : 'text-muted'}`}><Users className="w-4 h-4" />Clientes</button>
        </nav>
        <div className="p-4 border-t border-border"><Button className="w-full" onClick={() => setShowAddModal(true)}>Nuevo Cliente</Button></div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-bg p-8">
        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {recentClients.map(c => (
               <div key={c.id} onClick={() => onSelectClient?.(c)} className="p-4 bg-card border rounded-xl cursor-pointer hover:border-accent">{c.name} {c.surname}</div>
             ))}
          </div>
        ) : activeTab === 'clients' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredClients.map(client => (
              <div key={client.id} className="p-4 bg-card border rounded-xl">
                <h3 onClick={() => onSelectClient?.(client)} className="cursor-pointer font-bold">{client.name} {client.surname}</h3>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => onSelectClient?.(client)}>Plan</Button>
                  <Button size="sm" variant="outline" onClick={(e: any) => { e.stopPropagation(); setDeletingId(client.id); }}>Borrar</Button>
                </div>
              </div>
            ))}
            <button onClick={() => setShowAddModal(true)} className="border-2 border-dashed p-4 rounded-xl">+ Añadir</button>
          </div>
        ) : <div className="p-4">Otras pestañas...</div>}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-8">
            <h3 className="text-xl font-bold mb-4">Nuevo Cliente</h3>
            <input className="w-full p-2 border mb-2" placeholder="Nombre" value={newClient.name} onChange={(e: any) => setNewClient({...newClient, name: e.target.value})} />
            <input className="w-full p-2 border mb-4" placeholder="Apellido" value={newClient.surname} onChange={(e: any) => setNewClient({...newClient, surname: e.target.value})} />
            <div className="flex gap-2"><Button variant="outline" onClick={() => setShowAddModal(false)}>Cancelar</Button><Button onClick={handleAddClient}>Crear</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
