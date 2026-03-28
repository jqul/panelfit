import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from './supabase'; // <-- ASEGÚRATE DE QUE ESTA RUTA ES CORRECTA
import { Auth } from './components/Auth';
import { TrainerDashboard } from './components/trainer/TrainerDashboard'; // <-- AJUSTADO A TU CARPETA
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { ClientPanel } from './components/ClientPanel';
import { LandingPage } from './components/LandingPage';
import { Layout } from './components/Layout';
import { UserProfile, ClientData } from './types';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApp, setShowApp] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [connectionError, setConnectionError] = useState<'none' | 'timeout' | 'error'>('none');

  const demoProfile: UserProfile = {
    uid: 'demo',
    email: 'demo@panelfit.com',
    displayName: 'Entrenador Demo',
    role: 'trainer',
    approved: true,
    createdAt: Date.now()
  };

  const fetchAndRepairProfile = async (sessionUser: any) => {
    try {
      const { data: profileData, error: fetchError } = await supabase
        .from('entrenadores')
        .select('*')
        .eq('uid', sessionUser.id)
        .maybeSingle();
      
      setConnectionError('none');
      let updatedProfile = profileData as UserProfile;
      
      if (!updatedProfile) {
        const isSuperAdmin = sessionUser.email === 'javier.quinones.lopez@gmail.com';
        const newProfile = {
          uid: sessionUser.id,
          email: sessionUser.email,
          displayName: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Entrenador',
          role: isSuperAdmin ? 'super_admin' : 'trainer',
          approved: isSuperAdmin,
          createdAt: Date.now()
        };
        await supabase.from('entrenadores').upsert(newProfile);
        updatedProfile = newProfile as UserProfile;
      }
      
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
    } catch (error) {
      console.error(error);
    }
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
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
    fetchAndRepairProfile(user);

    const profileSubscription = supabase
      .channel(`public:entrenadores:uid=eq.${user.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'entrenadores', 
        filter: `uid=eq.${user.id}` 
      }, (payload: any) => {
        setProfile(payload.new as UserProfile);
      })
      .subscribe();

    return () => { supabase.removeChannel(profileSubscription); };
  }, [user?.id]);

  useEffect(() => {
    if (user && !profile && !loading) {
      const profileTimeout = setTimeout(() => {
        if (!profile && !loading) {
          const isSuperAdmin = user.email === 'javier.quinones.lopez@gmail.com';
          setProfile({
            uid: user.id,
            email: user.email,
            displayName: user.email?.split('@')[0] || 'Entrenador',
            role: isSuperAdmin ? 'super_admin' : 'trainer',
            approved: isSuperAdmin,
            createdAt: Date.now()
          });
        }
      }, 5000);
      return () => clearTimeout(profileTimeout);
    }
  }, [user, profile, loading]);

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

  if (!profile) return <div className="min-h-screen bg-bg flex items-center justify-center p-6 text-center"><div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" /><button onClick={() => window.location.reload()}>Reintentar</button></div>;

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
      ) : profile?.role === 'trainer' && !profile.approved ? (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6 text-center"><div className="max-w-md space-y-6 bg-card p-8 rounded-2xl border border-border"><h2>Registro Pendiente</h2><button onClick={() => supabase.auth.signOut()}>Cerrar sesión</button></div></div>
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
