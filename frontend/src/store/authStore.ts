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
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => void;
}

const getStorage = () => {
  if (typeof window === "undefined") return { token: null, user: null };
  return {
    token: localStorage.getItem("token"),
    user: localStorage.getItem("user"),
  };
};

const setStorage = (token: string, user: User) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

const clearStorage = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
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
    const { token, userStr } = {
      token: localStorage.getItem("token"),
      userStr: localStorage.getItem("user"),
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
