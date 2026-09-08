import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { api, restore, send, setToken } from '../api/client';
import { User } from '../types';
import { useQueryClient } from '@tanstack/react-query';
const Context = createContext<{
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}>(null!);
export function AuthProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  async function reload() {
    setUser(await api('/auth/me'));
  }
  useEffect(() => {
    let active = true;
    void restore().then(async (ok) => {
      if (ok) {
        const u = await api<User>('/auth/me').catch(() => null);
        if (active) setUser(u);
      }
      if (active) setLoading(false);
    });
    const expired = () => setUser(null);
    window.addEventListener('auth-expired', expired);
    return () => {
      active = false;
      window.removeEventListener('auth-expired', expired);
    };
  }, []);
  async function login(email: string, password: string) {
    const data = await send('/auth/login', { email, password });
    cache.clear();
    setToken(data.accessToken);
    await reload();
  }
  async function logout() {
    await send('/auth/logout', {});
    setToken(null);
    cache.clear();
    setUser(null);
  }
  return (
    <Context.Provider value={{ user, loading, login, logout, reload }}>
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
