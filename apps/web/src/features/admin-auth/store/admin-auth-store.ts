import { create } from "zustand";

import { getAdminAuthHeader } from "@/features/admin-auth/lib/admin-auth";

type AdminAuthStore = {
  isAuthed: boolean;
  setAuthed: (value: boolean) => void;
};

export const useAdminAuthStore = create<AdminAuthStore>((set) => ({
  isAuthed: getAdminAuthHeader() !== null,
  setAuthed: (value: boolean) => set({ isAuthed: value }),
}));
