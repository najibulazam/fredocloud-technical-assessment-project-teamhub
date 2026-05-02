import { create } from "zustand";

let toastTimer;

export const useUiStore = create((set) => ({
  sidebarOpen: true,
  theme: "system",
  toast: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setTheme: (theme) => set({ theme }),
  showToast: (toast, duration = 2000) => {
    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    set({ toast });

    if (duration) {
      toastTimer = setTimeout(() => {
        set({ toast: null });
      }, duration);
    }
  },
  clearToast: () => {
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    set({ toast: null });
  }
}));
