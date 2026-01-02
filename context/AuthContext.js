"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Session initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        setLoading(false);
      }
    });

    // Safety timeout: Ensure loading screen disappears after 10s regardless of network
    const timer = setTimeout(() => {
      setLoading(false);
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const fetchProfile = async (userId, userEmail = null) => {
    // Safety Timeout
    const timeout = setTimeout(() => {
       console.warn('⚠️ AUTH: fetchProfile reached 15s timeout limit.');
    }, 15000);

    try {
      console.log(`🔄 AUTH: Resolving Identity for ${userId}...`);
      
      // 1. First, always try a direct fetch by ID (fastest path)
      const { data: profileById } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileById) {
        console.log('✅ AUTH: Identity confirmed via ID match.');
        setProfile(profileById);
        return;
      }

      // 2. If no ID match, perform an atomic SYNC/PROVISION via email upsert
      let email = userEmail;
      if (!email) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        email = authUser?.email;
      }

      if (!email) throw new Error('Email resolution failed.');

      console.log(`🔄 AUTH: ID mismatch. Performing atomic email-sync for ${email}...`);
      const isAdminEmail = email.toLowerCase() === 'admin@helixtop.com';

      // Atomic Upsert: Match on email, update ID if it changed, or insert if missing
      const { data: resolvedProfile, error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: email,
          full_name: email.split('@')[0],
          role: isAdminEmail ? 'Admin' : 'Developer',
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'email',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (upsertError) throw upsertError;

      if (resolvedProfile) {
        console.log('✅ AUTH: Identity resolved and synced.');
        setProfile(resolvedProfile);
      }
    } catch (err) {
      console.error('❌ AUTH: Identity resolution fatal error:', err);
      // Optional: notify UI or set dummy profile to unstick loading
    } finally {
      clearTimeout(timeout);
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

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile, isAdmin, effectiveRole }}>
      {!loading && children}
      {loading && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-[1000]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 font-black uppercase text-xs tracking-[0.3em]">Authenticating_Session...</p>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
