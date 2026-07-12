'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { User, taskApi } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: Record<string, string>) => Promise<void>;
  registerUser: (userData: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const router = useRouter();

  // Load session from httpOnly cookie on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const data = await taskApi.getMe();
        setUser(data.user);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, []);

  const login = async (credentials: Record<string, string>) => {
    setLoading(true);
    try {
      const data = await taskApi.login(credentials);
      setUser(data.user);
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      router.push('/dashboard');
    } catch (err: any) {
      showToast(err.message || 'Login failed.', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async (userData: Record<string, string>) => {
    setLoading(true);
    try {
      const data = await taskApi.register(userData);
      setUser(data.user);
      showToast('Registration successful! Session loaded.', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      showToast(err.message || 'Registration failed.', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await taskApi.logout();
      setUser(null);
      showToast('Logged out securely.', 'info');
      router.push('/login');
    } catch (err) {
      setUser(null);
      router.push('/login');
    }
  };

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const getToastClasses = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'error': return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'warning': return 'bg-amber-50 text-amber-800 border-amber-200';
      default: return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  const getIndicatorColor = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-emerald-500';
      case 'error': return 'bg-rose-500';
      case 'warning': return 'bg-amber-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContext.Provider value={{ showToast }}>
        <AuthContext.Provider value={{ user, loading, login, registerUser, logout, isAuthenticated: !!user }}>
          {children}
          
          {/* Tailwind Styled Toast Portal */}
          <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
            {toasts.map((t) => (
              <div
                key={t.id}
                role="alert"
                className={`flex items-center justify-between p-4 border rounded-lg shadow-md bg-white pointer-events-auto transition-all animate-bounce-short ${getToastClasses(t.type)}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getIndicatorColor(t.type)}`} />
                  <span className="text-sm font-medium">{t.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                  className="text-slate-400 hover:text-slate-600 font-bold ml-4"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </AuthContext.Provider>
      </ToastContext.Provider>
    </QueryClientProvider>
  );
}
