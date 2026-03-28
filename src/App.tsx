import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from './lib/supabase'; // <-- RUTA CORREGIDA
import { Auth } from './components/shared/Auth'; // <-- RUTA CORREGIDA
import { TrainerDashboard } from './components/trainer/TrainerDashboard'; 
import { ClientPanel } from './components/trainer/ClientPanel'; // <-- RUTA CORREGIDA
import { UserProfile, ClientData } from './types'; // <-- RUTA CORREGIDA (usa types/index.ts)

// NOTA: Si LandingPage, Layout o SuperAdminDashboard no están en la raíz de components, 
// asegúrate de moverlos ahí o ajustar estas rutas:
import { LandingPage } from './components/shared/LandingPage'; 
import { Layout } from './components/shared/Layout';
import { SuperAdminDashboard } from './components/trainer/SuperAdminDashboard';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApp, setShowApp] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const demoProfile: UserProfile = {
    uid: 'demo',
    email: 'demo@panelfit.com',
    displayName: 'Entrenador Demo',
    role: 'trainer',
    approved: true,
    createdAt: Date.now()
  };

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
        setUser((prevUser: any) => (prevUser?.id === session.user.id ? prevUser : session.user));
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
        // Fallback si no hay perfil en BD
        setProfile({
          uid: user.id,
          email: user.email,
          displayName: user.email?.split('@')[0] || 'Entrenador',
          role: user.email === 'javier.quinones.lopez@gmail.com' ? 'super_admin' : 'trainer',
          approved: user.email === 'javier.quinones.lopez@gmail.com',
          createdAt: Date.now()
        });
      }
    };
    fetchProfile();
  }, [user?.id]);

  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center p-6"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;

  if (selectedClient && !user) return <Layout><ClientPanel client={selectedClient} isTrainer={false} /></Layout>;

  if (isDemo) return (
    <Layout>
      {selectedClient ? (
        <ClientPanel client={selectedClient} isTrainer={true} onBack={() => setSelectedClient(null)} />
      ) : (
        <TrainerDashboard userProfile={demoProfile} onLogout={() => { setIsDemo(false); setShowApp(false); }} />
      )}
    </Layout>
  );

  if (!showApp && !user) return <LandingPage onEnterApp={() => setShowApp(true)} onEnterDemo={() => setIsDemo(true)} />;

  if (!user) return <Auth onAuthSuccess={(u: any) => setUser(u)} />;

  if (!profile) return <div className="min-h-screen bg-bg flex items-center justify-center p-6 text-center">Cargando perfil...</div>;

  return (
    <Layout>
      {selectedClient ? (
        <ClientPanel 
          client={selectedClient} 
          isTrainer={profile?.role === 'trainer' || profile?.role === 'super_admin'} 
          onBack={() => setSelectedClient(null)} 
        />
      ) : profile?.role === 'super_admin' ? (
        <SuperAdminDashboard 
          userProfile={profile} 
          onSelectClient={(client: any) => setSelectedClient(client as ClientData)} 
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
