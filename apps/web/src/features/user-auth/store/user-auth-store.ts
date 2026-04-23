import { create } from "zustand";

import { clearToken, getToken, setToken } from "@/features/user-auth/lib/token-storage";

type UserAuthStore = {
  clearToken: () => void;
  setToken: (token: string) => void;
  token: null | string;
};

export const useUserAuthStore = create<UserAuthStore>((set) => ({
  clearToken: () => {
    clearToken();
    set({ token: null });
  },
  setToken: (token: string) => {
    setToken(token);
    set({ token });
  },
  token: getToken(),
}));
