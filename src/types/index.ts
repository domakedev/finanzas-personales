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
  createdAt: Date;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'PAY_DEBT' | 'SAVE_FOR_GOAL' | 'PAY_CREDIT_CARD' | 'RECEIVE_DEBT_PAYMENT';
  categoryId?: string;
  accountId: string;
  fromAccountId?: string; // For transfers
  debtId?: string; // For debt payments
  goalId?: string; // For goal savings
  exchangeRate?: number; // Exchange rate for cross-currency transfers
  convertedAmount?: number; // Converted amount for destination account
  fromCurrency?: string; // Source currency for transfers
  toCurrency?: string; // Destination currency for transfers
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount?: number; // Opcional para tarjetas de crédito
  currency: 'PEN' | 'USD';
  dueDate?: Date;
  isLent?: boolean; // True if the user lent money (Me deben)
  // Campos para tarjetas de crédito
  isCreditCard?: boolean;
  creditCardType?: 'BANK' | 'WALLET';
  paymentDate?: number; // Día del mes de pago (1-31)
  creditLimit?: number; // Límite de crédito
  logo?: string; // Path to logo image (e.g., '/logos/bbva.png')
  icon?: string; // Emoji icon (e.g., '💳')
  lastFourDigits?: string; // Últimos 4 dígitos de la tarjeta
  cutoffDate?: number; // Día del mes de corte (1-31)
  minimumPayment?: number; // Pago mínimo del mes
  totalPayment?: number; // Pago total del mes
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
