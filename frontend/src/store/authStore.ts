import { create } from "zustand";
import { login as apiLogin } from "@/lib/api";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthStore {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  initialize: () => void;
}

const getStorage = () => {
  if (typeof window === "undefined") return { token: null, user: null };
  const path = window.location.pathname;
  const role = path.startsWith("/admin") ? "admin" : 
               (path.startsWith("/kasir") || path.startsWith("/kds")) ? "kasir" : null;
  
  if (!role) return { token: null, user: null };
  
  return {
    token: localStorage.getItem(`token_${role}`),
    user: localStorage.getItem(`user_${role}`),
  };
};

const setStorage = (token: string, user: User) => {
  if (typeof window === "undefined") return;
  // Save specific role token
  localStorage.setItem(`token_${user.role}`, token);
  localStorage.setItem(`user_${user.role}`, JSON.stringify(user));
};

const clearStorage = () => {
  if (typeof window === "undefined") return;
  // We need to clear the specific role we are currently viewing, or just clear both for safety?
  // Let's clear based on current path to avoid logging out the other tab
  const path = window.location.pathname;
  if (path.startsWith("/admin")) {
    localStorage.removeItem("token_admin");
    localStorage.removeItem("user_admin");
  } else if (path.startsWith("/kasir") || path.startsWith("/kds")) {
    localStorage.removeItem("token_kasir");
    localStorage.removeItem("user_kasir");
  } else {
    // Fallback: clear all
    localStorage.removeItem("token_admin");
    localStorage.removeItem("user_admin");
    localStorage.removeItem("token_kasir");
    localStorage.removeItem("user_kasir");
  }
};

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiLogin(email, password);
      setStorage(res.token, res.user);
      set({ token: res.token, user: res.user, isLoading: false });
      return res.user;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Login failed",
        isLoading: false,
      });
      throw err;
    }
  },

  logout: () => {
    clearStorage();
    set({ token: null, user: null });
  },

  initialize: () => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    const role = path.startsWith("/admin") ? "admin" : 
                 (path.startsWith("/kasir") || path.startsWith("/kds")) ? "kasir" : null;
    
    if (!role) return;

    const { token, userStr } = {
      token: localStorage.getItem(`token_${role}`),
      userStr: localStorage.getItem(`user_${role}`),
    };
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ token, user });
      } catch {
        clearStorage();
      }
    }
  },
}));
