import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from './supabase';
import { Auth } from './components/Auth';
import { TrainerDashboard } from './components/TrainerDashboard';
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
  
  console.log('🔄 PanelFit Render:', { 
    loading, 
    user: user?.email, 
    profile: profile?.role, 
    showApp, 
    isDemo, 
    connectionError 
  });

  const demoProfile: UserProfile = {
    uid: 'demo',
    email: 'demo@panelfit.com',
    displayName: 'Entrenador Demo',
    role: 'trainer',
    approved: true,
    createdAt: Date.now()
  };

  const fetchAndRepairProfile = async (sessionUser: any) => {
    console.log('🔍 PanelFit: Sincronizando perfil para', sessionUser.email);
    try {
      const { data: profileData, error: fetchError } = await supabase
        .from('entrenadores')
        .select('*')
        .eq('uid', sessionUser.id)
        .maybeSingle();
      
      if (fetchError) {
        console.error('❌ PanelFit: Error al buscar perfil:', fetchError);
        if (fetchError.code === '42P01') {
          console.warn('⚠️ PanelFit: La tabla "entrenadores" no existe. Usando perfil temporal.');
        } else {
          console.warn('⚠️ PanelFit: Error de conexión con Supabase. Usando perfil temporal.');
        }
      }
      
      setConnectionError('none');
      let updatedProfile = profileData as UserProfile;
      
      if (!updatedProfile) {
        console.log('🛠️ PanelFit: Perfil no encontrado o inaccesible, generando perfil temporal...');
        const isSuperAdmin = sessionUser.email === 'javier.quinones.lopez@gmail.com';
        const newProfile = {
          uid: sessionUser.id,
          email: sessionUser.email,
          displayName: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Entrenador',
          role: isSuperAdmin ? 'super_admin' : 'trainer',
          approved: isSuperAdmin,
          createdAt: Date.now()
        };
        
        try {
          const { error: upsertError } = await supabase.from('entrenadores').upsert(newProfile);
          if (upsertError) {
            console.warn('⚠️ PanelFit: No se pudo guardar el perfil en la BD:', upsertError.message);
          } else {
            console.log('✅ PanelFit: Perfil guardado/reparado en la BD.');
          }
        } catch (e) {
          console.warn('⚠️ PanelFit: Error al intentar upsert de perfil:', e);
        }
        
        updatedProfile = newProfile as UserProfile;
      } else if (sessionUser.email === 'javier.quinones.lopez@gmail.com' && (updatedProfile.role !== 'super_admin' || !updatedProfile.approved)) {
        console.log('🛠️ PanelFit: Corrigiendo permisos de Super Admin...');
        const fixedProfile = { ...updatedProfile, role: 'super_admin', approved: true };
        try {
          await supabase.from('entrenadores').upsert(fixedProfile);
          updatedProfile = fixedProfile as UserProfile;
          console.log('✅ PanelFit: Permisos corregidos.');
        } catch (e) {
          console.warn('⚠️ PanelFit: No se pudo actualizar permisos en BD.');
        }
      }
      
      if (updatedProfile) {
        console.log('👤 PanelFit: Perfil listo:', updatedProfile.role, 'Aprobado:', updatedProfile.approved);
        setProfile(updatedProfile);
      }
    } catch (error) {
      console.error('❌ PanelFit: Error crítico en sincronización:', error);
      const isSuperAdmin = sessionUser.email === 'javier.quinones.lopez@gmail.com';
      setProfile({
        uid: sessionUser.id,
        email: sessionUser.email,
        displayName: sessionUser.email?.split('@')[0] || 'Entrenador',
        role: isSuperAdmin ? 'super_admin' : 'trainer',
        approved: isSuperAdmin,
        createdAt: Date.now()
      });
    }
  };

  const clearAllData = async () => {
    console.log('🧹 PanelFit: Limpiando todos los datos locales...');
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        if (name.trim().includes('sb-')) {
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        }
      }
      window.location.reload();
    } catch (e) {
      console.error('Error clearing data:', e);
      window.location.reload();
    }
  };

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.error('🔥 PanelFit: Error fatal detectado:', e.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  useEffect(() => {
    console.log('🚀 PanelFit: Iniciando aplicación...');
    
    const params = new URLSearchParams(window.location.search);
    const token = params.get('c');

    const checkUser = async () => {
      console.log('🔍 PanelFit: Comprobando sesión inicial...');
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (session?.user) {
          console.log('✅ PanelFit: Sesión encontrada:', session.user.email);
          setUser(session.user);
        } else {
          console.log('ℹ️ PanelFit: No hay sesión activa.');
        }
      } catch (error: any) {
        console.error('❌ PanelFit: Error comprobando sesión:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      const fetchClientByToken = async () => {
        console.log('🔍 PanelFit: Buscando cliente por token:', token);
        try {
          const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('token', token)
            .single();
          
          if (data && !error) {
            console.log('✅ PanelFit: Cliente encontrado:', data.nombre);
            setSelectedClient(data as ClientData);
          } else {
            console.warn('⚠️ PanelFit: Token inválido o cliente no encontrado.');
            checkUser();
          }
        } catch (e) {
          console.error('❌ PanelFit: Error buscando cliente:', e);
          checkUser();
        } finally {
          setLoading(false);
        }
      };
      fetchClientByToken();
    } else {
      checkUser();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 PanelFit: Auth Event:', event, session?.user?.email);
      
      if (session?.user) {
        setUser(prevUser => {
          if (prevUser?.id === session.user.id) return prevUser;
          return session.user;
        });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        console.log('👋 PanelFit: Sesión cerrada');
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const syncProfile = async () => {
      console.log('🔄 PanelFit: Iniciando sincronización de perfil...');
      await fetchAndRepairProfile(user);
    };

    syncProfile();

    const profileSubscription = supabase
      .channel(`public:entrenadores:uid=eq.${user.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'entrenadores', 
        filter: `uid=eq.${user.id}` 
      }, payload => {
        console.log('🔔 PanelFit: Perfil actualizado en tiempo real:', payload.new);
        setProfile(payload.new as UserProfile);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, [user?.id]);

  useEffect(() => {
    if (user && !profile && !loading) {
      const profileTimeout = setTimeout(() => {
        if (!profile && !loading) {
          console.warn('⚠️ PanelFit: Fallback de perfil activado.');
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
      }, 5000); // Reducimos a 5s para un fallback más rápido
      return () => clearTimeout(profileTimeout);
    }
  }, [user, profile, loading]);

  if (loading || connectionError === 'error') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <h2 className="text-sm font-bold uppercase tracking-widest">Cargando PanelFit...</h2>
        </div>
      </div>
    );
  }

  if (selectedClient && !user) {
    return (
      <Layout>
        <ClientPanel client={selectedClient} isTrainer={false} />
      </Layout>
    );
  }

  if (isDemo) {
    return (
      <Layout>
        {selectedClient ? (
          <ClientPanel client={selectedClient} isTrainer={true} onBack={() => setSelectedClient(null)} />
        ) : (
          <TrainerDashboard userProfile={demoProfile} onLogout={() => { setIsDemo(false); setShowApp(false); }} />
        )}
      </Layout>
    );
  }

  if (!showApp && !user) {
    return (
      <LandingPage 
        onEnterApp={() => setShowApp(true)} 
        onEnterDemo={() => setIsDemo(true)} 
      />
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={(u) => setUser(u)} />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <h1 className="text-2xl font-serif font-bold">Sincronizando Perfil</h1>
          <button onClick={() => window.location.reload()} className="bg-ink text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest">Reintentar</button>
        </div>
      </div>
    );
  }

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
          onSelectClient={(client) => setSelectedClient(client as any)} 
        />
      ) : profile?.role === 'trainer' && !profile.approved ? (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6 bg-card p-8 rounded-2xl border border-border shadow-sm">
            <h2 className="text-2xl font-serif font-bold">Registro Pendiente</h2>
            <p className="text-muted text-sm">Tu cuenta debe ser aprobada por un administrador.</p>
            <button onClick={() => supabase.auth.signOut()} className="w-full py-3 text-muted hover:text-ink text-xs font-bold uppercase tracking-widest">Cerrar sesión</button>
          </div>
        </div>
      ) : (
        profile && (
          <TrainerDashboard 
            userProfile={profile} 
            onLogout={() => supabase.auth.signOut()} 
            onSelectClient={(client) => setSelectedClient(client as any)}
          />
        )
      )}
    </Layout>
  );
}
