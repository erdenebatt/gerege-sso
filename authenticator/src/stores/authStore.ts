import { create } from 'zustand';
import * as api from '../lib/api';
import { saveToken, getToken, removeToken } from '../lib/storage';

interface User {
  gen_id: string;
  email: string;
  picture: string;
  verified: boolean;
  mfa_enabled: boolean;
  mfa_level: number;
}

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  loading: true,

  login: async (email: string, otp: string) => {
    const verifyRes = await api.verifyEmailOTP(email, otp);
    const exchangeRes = await api.exchangeToken(verifyRes.code);
    await saveToken(exchangeRes.token);
    set({ token: exchangeRes.token });
    const user = await api.getMe();
    set({ user });
  },

  logout: async () => {
    await removeToken();
    set({ token: null, user: null });
  },

  checkAuth: async () => {
    set({ loading: true });
    try {
      const token = await getToken();
      if (!token) {
        set({ token: null, user: null, loading: false });
        return false;
      }
      set({ token });
      const user = await api.getMe();
      set({ user, loading: false });
      return true;
    } catch {
      await removeToken();
      set({ token: null, user: null, loading: false });
      return false;
    }
  },
}));
