"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    
    // Safety fallback: Unfreeze UI after 3s no matter what
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      
      if (sessionUser) {
        // Start background profile fetch
        fetchProfile(sessionUser.id, sessionUser.email);
        // Unlock UI immediately
        setLoading(false);
      } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const fetchProfile = async (userId, userEmail = null) => {
    // If we're already fetching or have a recent match, be smart
    if (profile?.id === userId) return;

    try {
      // 1. Direct fetch by ID
      const { data: profileById } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (profileById) {
        setProfile(profileById);
        return;
      }

      // 2. Provisioning fallback
      const email = userEmail || user?.email;
      if (!email) return;

      const isAdminEmail = email.toLowerCase() === 'admin@helixtop.com';

      const { data: resolvedProfile } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: email,
          full_name: email.split('@')[0],
          role: isAdminEmail ? 'Admin' : 'Developer',
          updated_at: new Date().toISOString()
        }, { onConflict: 'email' })
        .select()
        .single();

      if (resolvedProfile) setProfile(resolvedProfile);
    } catch (err) {
      console.error('❌ AUTH: Background profile sync failed:', err);
    }
  };

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  const signOut = async () => {
    try {
      console.log('🚪 AUTH: Initializing logout...');
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      console.log('✅ AUTH: Session cleared.');
      router.push('/login');
    } catch (error) {
      console.error('❌ AUTH: Logout error:', error);
      // Fallback
      window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
       console.log('🔄 AUTH: Manual profile refresh triggered...');
       await fetchProfile(user.id, user.email);
    }
  };

  const isAdmin = profile?.role === 'Admin' || user?.email === 'admin@helixtop.com';
  const effectiveRole = profile?.role || (user?.email === 'admin@helixtop.com' ? 'Admin' : 'Guest');

  const value = React.useMemo(() => ({
    user, 
    profile, 
    loading, 
    signOut, 
    refreshProfile, 
    isAdmin, 
    effectiveRole
  }), [user, profile, loading, isAdmin, effectiveRole]);

  // Grace Period: Don't show the splash screen unless auth takes > 400ms
  const [showSplash, setShowSplash] = useState(false);
  useEffect(() => {
    if (loading && pathname !== '/login') {
      const t = setTimeout(() => setShowSplash(true), 400);
      return () => clearTimeout(t);
    } else {
      setShowSplash(false);
    }
  }, [loading, pathname]);

  return (
    <AuthContext.Provider value={value}>
      {pathname === '/login' ? (
        children
      ) : (
        <>
          <div className={cn(
            "min-h-screen transition-all duration-700", 
            loading ? "opacity-0 scale-[0.98] pointer-events-none" : "opacity-100 scale-100"
          )}>
            {children}
          </div>
          {loading && showSplash && (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-[1000] animate-in fade-in duration-300">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 font-bold uppercase text-[9px] tracking-[0.4em] animate-pulse">Establishing_Secure_Link</p>
              </div>
            </div>
          )}
        </>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
