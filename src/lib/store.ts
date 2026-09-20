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
  avatar?: string;
  vipLevel?: number;
  bonusBalance?: number;
  unlockedBalance?: number;
}

interface AppState {

  locale: Locale;
  setLocale: (locale: Locale) => void;

  user: User | null;
  isLoggedIn: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateBalance: (newBalance: number) => void;
  markFirstDeposit: () => void;

  registerOpen: boolean;
  authMode: "login" | "register";
  depositOpen: boolean;
  depositTab: "deposit" | "withdraw";
  chatOpen: boolean;
  supportOpen: boolean;
  helpOpen: boolean;
  profileOpen: boolean;
  setRegisterOpen: (open: boolean) => void;
  openLogin: () => void;
  openRegister: () => void;
  setDepositOpen: (open: boolean) => void;
  setDepositTab: (tab: "deposit" | "withdraw") => void;
  setChatOpen: (open: boolean) => void;
  setSupportOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  setProfileOpen: (open: boolean) => void;

  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  fakeChatMessages: any[];
  setFakeChatMessages: (messages: any[] | ((prev: any[]) => any[])) => void;

  activeGame: string | null;
  setActiveGame: (game: string | null) => void;

  onlineCount: number;
  setOnlineCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({

  locale: "pt",
  setLocale: (locale) => set({ locale }),

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

  registerOpen: false,
  authMode: "register",
  depositOpen: false,
  depositTab: "deposit",
  chatOpen: false,
  supportOpen: false,
  helpOpen: false,
  profileOpen: false,
  setRegisterOpen: (open) => set({ registerOpen: open }),
  openLogin: () => set({ registerOpen: true, authMode: "login" }),
  openRegister: () => set({ registerOpen: true, authMode: "register" }),
  setDepositOpen: (open) => set({ depositOpen: open }),
  setDepositTab: (tab) => set({ depositTab: tab }),
  setChatOpen: (open) => set({ chatOpen: open }),
  setSupportOpen: (open) => set({ supportOpen: open }),
  setHelpOpen: (open) => set({ helpOpen: open }),
  setProfileOpen: (open) => set({ profileOpen: open }),

  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  fakeChatMessages: [],
  setFakeChatMessages: (messages) => set((state) => ({
    fakeChatMessages: typeof messages === "function" ? messages(state.fakeChatMessages) : messages
  })),

  activeGame: null,
  setActiveGame: (game) => set({ activeGame: game }),

  onlineCount: 200,
  setOnlineCount: (count) => set({ onlineCount: count }),
}));
