// Test-specific version of useAuth that doesn't make API calls
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

export const useAuthTest = () => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true
  });

  // Simplified auth check for tests
  useEffect(() => {
    console.log('useAuthTest: Starting auth check');
    
    const checkAuth = () => {
      try {
        const userId = localStorage.getItem('user_id');
        console.log('useAuthTest: user_id from localStorage:', userId);
        
        if (userId === '123') {
          const mockUser: User = {
            user_id: 123,
            first_name: 'Alice',
            last_name: 'Smith',
            role: 'doctor',
            location: 'Room 101',
            email: 'alice@email.com'
          };
          console.log('useAuthTest: Setting mock user:', mockUser);
          setAuthState({ user: mockUser, loading: false });
        } else {
          console.log('useAuthTest: No valid user_id, user not authenticated');
          setAuthState({ user: null, loading: false });
        }
      } catch (error) {
        console.error('useAuthTest: Error during auth check:', error);
        setAuthState({ user: null, loading: false });
      }
    };

    // Small delay to simulate async behavior
    setTimeout(checkAuth, 100);
  }, []);

  const login = async (email: string, password: string) => {
    console.log('useAuthTest: Login attempt:', email);
    
    if (email === 'alice@email.com' && password === 'password') {
      const mockUser: User = {
        user_id: 123,
        first_name: 'Alice',
        last_name: 'Smith',
        role: 'doctor',
        location: 'Room 101',
        email: 'alice@email.com'
      };
      
      localStorage.setItem('user_id', '123');
      setAuthState({ user: mockUser, loading: false });
      console.log('useAuthTest: Login successful');
      return { user: mockUser };
    } else {
      console.log('useAuthTest: Invalid credentials');
      return { error: 'Invalid email or password' };
    }
  };

  const logout = () => {
    console.log('useAuthTest: Logging out');
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
