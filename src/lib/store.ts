// Store global da aplicação — MOZBET
// Usa Zustand para gerenciamento de estado leve e performático

import { create } from "zustand";
import { type Locale } from "@/lib/i18n";

interface User {
  id: string;
  phone: string;
  email?: string;
  balance: number;
  hasDeposited: boolean;
  createdAt: string;
  isAdmin?: boolean;
}

interface AppState {
  // Idioma
  locale: Locale;
  setLocale: (locale: Locale) => void;

  // Autenticação
  user: User | null;
  isLoggedIn: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateBalance: (newBalance: number) => void;
  markFirstDeposit: () => void;

  // Modais
  registerOpen: boolean;
  authMode: "login" | "register";
  depositOpen: boolean;
  chatOpen: boolean;
  supportOpen: boolean;
  helpOpen: boolean;
  profileOpen: boolean;
  setRegisterOpen: (open: boolean) => void;
  openLogin: () => void;
  openRegister: () => void;
  setDepositOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  setSupportOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  setProfileOpen: (open: boolean) => void;

  // Sidebar Mobile
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  // Jogo ativo
  activeGame: string | null;
  setActiveGame: (game: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Idioma — padrão PT
  locale: "pt",
  setLocale: (locale) => set({ locale }),

  // Auth
  user: null,
  isLoggedIn: false,
  login: (user) => set({ user, isLoggedIn: true }),
  logout: () =>
    set({
      user: null,
      isLoggedIn: false,
      profileOpen: false,
      activeGame: null,
    }),
  updateBalance: (newBalance) =>
    set((state) => ({
      user: state.user
        ? { ...state.user, balance: Math.max(0, parseFloat(newBalance.toFixed(2))) }
        : null,
    })),
  markFirstDeposit: () =>
    set((state) => ({
      user: state.user ? { ...state.user, hasDeposited: true } : null,
    })),

  // Modais
  registerOpen: false,
  authMode: "register",
  depositOpen: false,
  chatOpen: false,
  supportOpen: false,
  helpOpen: false,
  profileOpen: false,
  setRegisterOpen: (open) => set({ registerOpen: open }),
  openLogin: () => set({ registerOpen: true, authMode: "login" }),
  openRegister: () => set({ registerOpen: true, authMode: "register" }),
  setDepositOpen: (open) => set({ depositOpen: open }),
  setChatOpen: (open) => set({ chatOpen: open }),
  setSupportOpen: (open) => set({ supportOpen: open }),
  setHelpOpen: (open) => set({ helpOpen: open }),
  setProfileOpen: (open) => set({ profileOpen: open }),

  // Sidebar Mobile
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  // Jogo
  activeGame: null,
  setActiveGame: (game) => set({ activeGame: game }),
}));
