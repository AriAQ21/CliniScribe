import { useAuth } from './useAuth';

export interface DummyUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  location: string;
}

export function useDummyUser() {
  const { user, loading } = useAuth();
  
  // Transform auth user to match legacy interface
  const transformedUser = user ? {
    id: user.user_id.toString(),
    email: user.email,
    display_name: `${user.first_name} ${user.last_name}`,
    role: user.role || 'GP',
    location: user.location || 'Room 1'
  } : null;

  return { user: transformedUser, loading };
}