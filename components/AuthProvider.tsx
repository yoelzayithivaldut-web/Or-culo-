'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { supabaseService } from '@/services/supabaseService';
import { useAdminBypass } from '@/hooks/useAdminBypass';
import type { Profile, UserRole, UserPlan } from '@/types';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  onboardingCompleted: boolean | null;
  isBypass: boolean;
  role: UserRole;
  plan: UserPlan;
  isUnlimited: boolean;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  setBypass: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [role, setRole] = useState<UserRole>('user');
  const [plan, setPlan] = useState<UserPlan>('free');
  const pathname = usePathname();
  const router = useRouter();
  const initialLoadStarted = React.useRef(false);
  const lastUserId = React.useRef<string | null>(null);
  const loadingRef = React.useRef(true);
  const onboardingRef = React.useRef<boolean | null>(null);
  const { isAdminBypass, enableBypass, disableBypass, checkIsAdmin } = useAdminBypass();

  const setBypass = (value: boolean) => {
    if (value) {
      enableBypass();
      refreshAuth();
    } else {
      disableBypass();
    }
  };

  // Keep refs in sync with state for use in handleAuthStateChange
  React.useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  React.useEffect(() => {
    onboardingRef.current = onboardingCompleted;
  }, [onboardingCompleted]);

  const refreshAuth = async () => {
    setLoading(true);
    console.log('Oráculo: Manual refresh started');
    
    // Clear cache to ensure we get the latest profile
    supabaseService.clearProfileCache();
    
    const bypass = isAdminBypass;
    
    if (bypass) {
      console.log('Oráculo: Admin Bypass active');
      try {
        const profile = await supabaseService.getProfile('admin-bypass-id');
        const mockUser: Profile = {
          id: 'admin-bypass-id',
          email: 'admin@test.com',
          display_name: profile?.display_name || 'Administrador de Teste',
          onboarding_completed: profile?.onboarding_completed ?? true,
          role: profile?.role || 'admin',
          plan: profile?.plan || 'premium',
          address: null,
          phone: null,
          education_level: null,
          main_genre: null,
          writing_goal: null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        setUser(mockUser);
        setOnboardingCompleted(profile?.onboarding_completed ?? true);
        setRole(profile?.role || 'admin');
        setPlan(profile?.plan || 'premium');
      } catch (e) {
        setUser({ id: 'admin-bypass-id', email: 'admin@test.com', display_name: 'Administrador de Teste', onboarding_completed: true, role: 'admin', plan: 'premium', address: null, phone: null, education_level: null, main_genre: null, writing_goal: null, updated_at: new Date().toISOString(), created_at: new Date().toISOString() });
        setOnboardingCompleted(true);
        setRole('admin');
        setPlan('premium');
      }
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let currentUser: Profile | null = null;
      
      if (session?.user) {
        const supabaseUser = session.user;
        const profile = await supabaseService.getProfile(supabaseUser.id);
        const isAdmin = checkIsAdmin(supabaseUser.email);
        
        currentUser = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          display_name: profile?.display_name || supabaseUser.user_metadata?.full_name || null,
          onboarding_completed: isAdmin ? true : (profile?.onboarding_completed ?? supabaseUser.user_metadata?.onboarding_completed ?? false),
          address: profile?.address || null,
          phone: profile?.phone || null,
          education_level: profile?.education_level || null,
          main_genre: profile?.main_genre || null,
          writing_goal: profile?.writing_goal || null,
          plan: profile?.plan || (isAdmin ? 'premium' : 'free'),
          role: profile?.role || (isAdmin ? 'admin' : 'user'),
          updated_at: profile?.updated_at || new Date().toISOString(),
          created_at: profile?.created_at || new Date().toISOString(),
          user_metadata: supabaseUser.user_metadata
        };
        
        setOnboardingCompleted(isAdmin ? true : (profile?.onboarding_completed ?? supabaseUser.user_metadata?.onboarding_completed ?? false));
        setRole(profile?.role || (isAdmin ? 'admin' : 'user'));
        setPlan(profile?.plan || (isAdmin ? 'premium' : 'free'));
      } else {
        setOnboardingCompleted(false);
        setRole('user');
        setPlan('free');
      }
      setUser(currentUser);
    } catch (error) {
      console.error('Oráculo: Auth refresh error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // Safety timeout: if auth takes too long, stop loading
    const timeoutId = setTimeout(() => {
      if (isMounted && loadingRef.current) {
        console.warn('Oráculo: Auth initialization timed out. Forcing ready state.');
        setLoading(false);
      }
    }, 5000);

    const handleAuthStateChange = async (session: any) => {
      if (!isMounted) return;
      
      const currentUser = session?.user ?? null;
      const currentUserId = currentUser?.id ?? null;
      
      // If session hasn't changed and we are not in initial load, skip
      if (currentUserId === lastUserId.current && !loadingRef.current && onboardingRef.current !== null) {
        console.log('Oráculo: Skipping redundant auth state change');
        return;
      }
      
      console.log('Oráculo: handleAuthStateChange started', currentUser?.email);
      lastUserId.current = currentUserId;
      setLoading(true);
      
      const bypass = isAdminBypass;
      setBypass(bypass);
      
      if (bypass) {
        try {
          const profile = await supabaseService.getProfile('admin-bypass-id');
          const mockUser: Profile = {
            id: 'admin-bypass-id',
            email: 'admin@test.com',
            display_name: profile?.display_name || 'Administrador de Teste',
            onboarding_completed: profile?.onboarding_completed ?? true,
            role: profile?.role || 'admin',
            plan: profile?.plan || 'premium',
            address: null,
            phone: null,
            education_level: null,
            main_genre: null,
            writing_goal: null,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };
          setUser(mockUser);
          setOnboardingCompleted(profile?.onboarding_completed ?? true);
          setRole(profile?.role || 'admin');
          setPlan(profile?.plan || 'premium');
        } catch (e) {
          setUser({ id: 'admin-bypass-id', email: 'admin@test.com', display_name: 'Administrador de Teste', onboarding_completed: true, role: 'admin', plan: 'premium', address: null, phone: null, education_level: null, main_genre: null, writing_goal: null, updated_at: new Date().toISOString(), created_at: new Date().toISOString() });
          setOnboardingCompleted(true);
          setRole('admin');
          setPlan('premium');
        }
        setLoading(false);
        return;
      }

      // Use the currentUser already defined at the top of the function
      if (currentUser) {
        try {
          const profile = await supabaseService.getProfile(currentUser.id);
          const isAdmin = checkIsAdmin(currentUser.email);
          
          if (profile) {
            setOnboardingCompleted(isAdmin ? true : (profile.onboarding_completed ?? false));
            setRole(profile.role || (isAdmin ? 'admin' : 'user'));
            setPlan(profile.plan || (isAdmin ? 'premium' : 'free'));
          } else {
            const isCompleted = isAdmin ? true : (currentUser.user_metadata?.onboarding_completed ?? false);
            setOnboardingCompleted(isCompleted);
            setRole(isAdmin ? 'admin' : 'user');
            setPlan(isAdmin ? 'premium' : 'free');
          }
        } catch (e) {
          console.error('Oráculo: Profile fetch error in handleAuthStateChange:', e);
          const isAdmin = checkIsAdmin(currentUser.email);
          const isCompleted = isAdmin ? true : (currentUser.user_metadata?.onboarding_completed ?? false);
          setOnboardingCompleted(isCompleted);
          setRole(isAdmin ? 'admin' : 'user');
          setPlan(isAdmin ? 'premium' : 'free');
        }
      } else {
        setOnboardingCompleted(false);
        setRole('user');
        setPlan('free');
      }
      
      setUser(currentUser);
      setLoading(false);
    };

    // Initial check and subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Oráculo: Auth state change event:', event, session?.user?.email);
      
      // If it's the initial session event and we already started getSession, ignore it
      if (event === 'INITIAL_SESSION' && initialLoadStarted.current) {
        console.log('Oráculo: Ignoring INITIAL_SESSION as getSession is already running');
        return;
      }
      
      handleAuthStateChange(session);
    });

    // Initial fetch
    if (!initialLoadStarted.current) {
      initialLoadStarted.current = true;
      console.log('Oráculo: Initial session fetch started');
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('Oráculo: Initial session fetch complete:', session?.user?.email);
        handleAuthStateChange(session);
      }).catch(err => {
        console.error('Oráculo: Initial session fetch error:', err);
        if (isMounted) setLoading(false);
      });
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading || onboardingCompleted === null) return;
    
    const isPublicPath = pathname === '/login' || pathname === '/auth/callback' || pathname === '/landing';
    const isOnboardingPath = pathname === '/onboarding';

    console.log('Oráculo: Redirection check:', { 
      hasUser: !!user, 
      loading, 
      onboardingCompleted, 
      pathname 
    });

    if (!user) {
      if (!isPublicPath && pathname !== '/') {
        console.log('Oráculo: No user, redirecting to login');
        router.push('/login');
      } else if (pathname === '/' && !isPublicPath) {
        console.log('Oráculo: No user on root, redirecting to landing');
        router.push('/landing');
      }
    } else {
      // User is logged in
      if (onboardingCompleted) {
        if (isPublicPath || isOnboardingPath) {
          console.log('Oráculo: Onboarding completed, redirecting to home/plans');
          router.push(isOnboardingPath ? '/plans' : '/');
        }
      } else {
        // Onboarding not completed
        if (!isOnboardingPath) {
          console.log('Oráculo: Onboarding not completed, redirecting to onboarding');
          router.push('/onboarding');
        }
      }
    }
  }, [user, loading, onboardingCompleted, pathname, router]);

  const signOut = async () => {
    sessionStorage.setItem('SKIP_SILENT_LOGIN', 'true');
    if (isAdminBypass) {
      disableBypass();
      window.location.href = '/login';
      return;
    }
    await supabase.auth.signOut();
    router.push('/login');
  };

  const value = {
    user,
    loading,
    onboardingCompleted,
    isBypass: isAdminBypass,
    role,
    plan,
    isUnlimited: role === 'admin' || plan === 'premium',
    refreshAuth,
    signOut,
    setBypass
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
