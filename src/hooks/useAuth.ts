import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  role: string;
  location: string;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
}

export const useAuth = () => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true
  });

  // Check for existing session on mount
  useEffect(() => {
    console.log('🔐 useAuth: useEffect triggered');
    
    const checkAuth = async () => {
      try {
        const userId = localStorage.getItem('user_id');
        console.log('🔐 Checking auth, user_id from localStorage:', userId);
        
        if (userId) {
          console.log('🔐 Fetching user by ID:', userId);
          const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', parseInt(userId))
            .single();

          console.log('🔐 Session restore response:', { user, error });

          if (user && !error) {
            console.log('🔐 Session restored successfully:', user);
            setAuthState({ user, loading: false });
          } else {
            console.log('🔐 Session restore failed, clearing localStorage');
            localStorage.removeItem('user_id');
            setAuthState({ user: null, loading: false });
          }
        } else {
          console.log('🔐 No user_id in localStorage');
          setAuthState({ user: null, loading: false });
        }
      } catch (error) {
        console.error('🔐 Session restore error:', error);
        localStorage.removeItem('user_id');
        setAuthState({ user: null, loading: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    console.log('🔐 Login attempt:', email);
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      console.log('🔐 Login response:', { user, error });

      if (error || !user) {
        console.log('🔐 Login failed:', error);
        return { error: 'Invalid email or password' };
      }

      localStorage.setItem('user_id', user.user_id.toString());
      console.log('🔐 Setting user state:', user);
      setAuthState({ user, loading: false });
      console.log('🔐 Login successful, isAuthenticated:', !!user);
      return { user };
    } catch (error) {
      console.log('🔐 Login error:', error);
      return { error: 'Login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('user_id');
    setAuthState({ user: null, loading: false });
    navigate('/auth');
  };

  return {
    user: authState.user,
    loading: authState.loading,
    login,
    logout,
    isAuthenticated: !!authState.user
  };
};
