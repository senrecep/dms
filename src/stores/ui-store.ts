import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  isSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  activeModal: string | null;
}

interface UIActions {
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      isSidebarOpen: true,
      isMobileMenuOpen: false,
      activeModal: null,

      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      toggleMobileMenu: () =>
        set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),

      openModal: (modalId) => set({ activeModal: modalId }),

      closeModal: () => set({ activeModal: null }),
    }),
    {
      name: "ui-store",
      partialize: (state) => ({ isSidebarOpen: state.isSidebarOpen }),
    }
  )
);
