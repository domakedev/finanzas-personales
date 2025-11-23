import { create } from 'zustand';
import { Account, Transaction, Debt, Goal } from '@/types';
import { User } from 'firebase/auth';

interface AppState {
  user: User | null;
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  goals: Goal[];
  
  setUser: (user: User | null) => void;
  setAccounts: (accounts: Account[]) => void;
  addAccount: (account: Account) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  removeAccount: (id: string) => void;

  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  removeTransaction: (id: string) => void;
  
  setDebts: (debts: Debt[]) => void;
  addDebt: (debt: Debt) => void;
  updateDebt: (id: string, debt: Partial<Debt>) => void;
  
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  accounts: [],
  transactions: [],
  debts: [],
  goals: [],

  setUser: (user) => set({ user }),

  setAccounts: (accounts) => set({ accounts }),
  addAccount: (account) => set((state) => ({ accounts: [...state.accounts, account] })),
  updateAccount: (id, updated) => set((state) => ({
    accounts: state.accounts.map((acc) => acc.id === id ? { ...acc, ...updated } : acc)
  })),
  removeAccount: (id) => set((state) => ({
    accounts: state.accounts.filter((acc) => acc.id !== id)
  })),

  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (transaction) => set((state) => ({ transactions: [transaction, ...state.transactions] })),
  removeTransaction: (id) => set((state) => ({
    transactions: state.transactions.filter((t) => t.id !== id)
  })),

  setDebts: (debts) => set({ debts }),
  addDebt: (debt) => set((state) => ({ debts: [...state.debts, debt] })),
  updateDebt: (id, updated) => set((state) => ({
    debts: state.debts.map((d) => d.id === id ? { ...d, ...updated } : d)
  })),

  setGoals: (goals) => set({ goals }),
  addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
  updateGoal: (id, updated) => set((state) => ({
    goals: state.goals.map((g) => g.id === id ? { ...g, ...updated } : g)
  })),
}));
