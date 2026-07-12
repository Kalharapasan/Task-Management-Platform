import { useContext } from 'react';
import { AuthContext } from '@/app/providers';

/**
 * Custom React Hook: useAuth
 * 
 * AML Security Context:
 * Simplifies access control and role evaluation throughout the page layouts.
 * Prevents unauthorized actions by exposing reactive session details and user roles.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider (included in global Providers)');
  }

  return context;
}
