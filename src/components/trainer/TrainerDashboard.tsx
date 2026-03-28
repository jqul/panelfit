import { useState, useEffect } from 'react';
import { Plus, Users, LogOut, UserPlus, LayoutDashboard } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // <-- RUTA CORREGIDA
import { Button } from '../shared/Button'; // <-- RUTA CORREGIDA
import { ClientData, UserProfile } from '../../types'; // <-- RUTA CORREGIDA

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', surname: '' });

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from('clientes').select('*').eq('trainerId', userProfile.uid);
    if (data) {
      const mapped = data.map((c: any) => ({
        ...c,
        name: c.nombre || c.name,
        surname: c.apellido || c.surname
      }));
      setClients(mapped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [userProfile.uid]);

  const handleAddClient = async () => {
    const clientToInsert = {
      nombre: newClient.name,
      apellido: newClient.surname,
      trainerId: userProfile.uid,
      token: Math.random().toString(36).substring(2, 15),
      createdAt: Date.now(),
    };
    const { data } = await supabase.from('clientes').insert([clientToInsert]).select().single();
    if (data) {
      setClients([...clients, { ...data, name: data.nombre, surname: data.apellido }]);
      setShowAddModal(false);
      setNewClient({ name: '', surname: '' });
    }
  };

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-card border-r p-6">
        <h1 className="text-xl font-bold mb-10">PanelFit</h1>
        <nav className="space-y-2">
          <button className="flex items-center gap-2 w-full p-2 bg-accent text-white rounded"><LayoutDashboard size={16}/> Dashboard</button>
          <button className="flex items-center gap-2 w-full p-2 text-muted"><Users size={16}/> Clientes</button>
        </nav>
        <div className="mt-auto pt-10">
          <Button variant="outline" className="w-full mb-2" onClick={onLogout}><LogOut size={16}/> Salir</Button>
          <Button className="w-full" onClick={() => setShowAddModal(true)}><UserPlus size={16}/> Nuevo Cliente</Button>
        </div>
      </aside>
      <main className="flex-1 p-10 overflow-auto">
        <div className="grid grid-cols-3 gap-4">
          {clients.map(c => (
            <div key={c.id} className="p-4 border rounded-xl hover:border-accent cursor-pointer" onClick={() => onSelectClient?.(c)}>
              {c.name} {c.surname}
            </div>
          ))}
        </div>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl w-96">
            <h2 className="text-xl font-bold mb-4">Nuevo Cliente</h2>
            <input className="w-full border p-2 mb-2" placeholder="Nombre" value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})} />
            <input className="w-full border p-2 mb-4" placeholder="Apellido" value={newClient.surname} onChange={(e) => setNewClient({...newClient, surname: e.target.value})} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancelar</Button>
              <Button onClick={handleAddClient}>Crear</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
