export interface Account {
  id: string;
  name: string;
  type: 'BANK' | 'WALLET' | 'CASH';
  currency: 'PEN' | 'USD';
  balance: number;
  logo?: string; // Path to logo image (e.g., '/logos/bcp.png')
  icon?: string; // Emoji icon (e.g., '💵')
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: Date;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  categoryId?: string;
  accountId: string;
  fromAccountId?: string; // For transfers
  exchangeRate?: number; // Exchange rate for cross-currency transfers
  convertedAmount?: number; // Converted amount for destination account
  fromCurrency?: string; // Source currency for transfers
  toCurrency?: string; // Destination currency for transfers
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  currency: 'PEN' | 'USD';
  dueDate?: Date;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: 'PEN' | 'USD';
  deadline?: Date;
}

export interface Budget {
  id?: string;
  userId: string;
  month: number; // 0-11
  year: number;
  totalIncome: number;
  categoryLimits: Record<string, number>; // categoryId -> limit amount
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  userId?: string; // Optional for system categories
  isSystem?: boolean;
  type: 'EXPENSE' | 'INCOME';
}
