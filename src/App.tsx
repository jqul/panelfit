import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from './lib/supabase'; 
import { Auth } from './components/shared/Auth';
import { TrainerDashboard } from './components/trainer/TrainerDashboard'; 
import { ClientPanel } from './components/trainer/ClientPanel'; 
import { UserProfile, ClientData } from './types'; 

// Si estos archivos no existen en tu GitHub, estas líneas darán error.
// He creado versiones temporales abajo para que el build pase.
const Layout = ({ children }: any) => <div className="min-h-screen bg-bg">{children}</div>;
const LandingPage = ({ onEnterApp }: any) => <div className="p-20 text-center"><button onClick={onEnterApp}>Entrar</button></div>;

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('c');

    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) setUser(session.user);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      const fetchClientByToken = async () => {
        const { data } = await supabase.from('clientes').select('*').eq('token', token).single();
        if (data) setSelectedClient(data as ClientData);
        else checkUser();
        setLoading(false);
      };
      fetchClientByToken();
    } else {
      checkUser();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from('entrenadores').select('*').eq('uid', user.id).maybeSingle();
      if (data) setProfile(data as UserProfile);
      else {
        setProfile({
          uid: user.id,
          email: user.email,
          displayName: user.email?.split('@')[0] || 'Entrenador',
          role: 'trainer',
          approved: true,
          createdAt: Date.now()
        });
      }
    };
    fetchProfile();
  }, [user?.id]);

  if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>;

  if (selectedClient && !user) return <Layout><ClientPanel client={selectedClient} isTrainer={false} /></Layout>;

  if (!showApp && !user) return <LandingPage onEnterApp={() => setShowApp(true)} />;

  if (!user) return <Auth onAuthSuccess={(u: any) => setUser(u)} />;

  if (!profile) return <div className="flex h-screen items-center justify-center">Sincronizando...</div>;

  return (
    <Layout>
      {selectedClient ? (
        <ClientPanel 
          client={selectedClient} 
          isTrainer={true} 
          onBack={() => setSelectedClient(null)} 
        />
      ) : (
        <TrainerDashboard 
          userProfile={profile} 
          onLogout={() => supabase.auth.signOut()} 
          onSelectClient={(client: ClientData) => setSelectedClient(client)}
        />
      )}
    </Layout>
  );
}
