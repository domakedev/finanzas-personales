// Regla 25/15/50/10: what the money is for (independent of which account holds it)
export type Pillar = 'GROWTH' | 'STABILITY' | 'ESSENTIAL' | 'REWARD';

export interface Account {
  id: string;
  name: string;
  type: 'BANK' | 'WALLET' | 'CASH';
  currency: 'PEN' | 'USD';
  balance: number;
  logo?: string; // Path to logo image (e.g., '/logos/bcp.png')
  icon?: string; // Emoji icon (e.g., '💵')
  pillar?: Pillar; // Hint: transfers INTO this account suggest this pillar
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
  isVerified?: boolean; // For reconciliation: true = user confirmed this matches bank statement
  isAdjustment?: boolean; // Created by "Ponerme al día": balance adjustment the user may split into real transactions later
  pillar?: Pillar; // EXPENSE / PAY_DEBT / SAVE_FOR_GOAL / TRANSFER: chosen by the user (progress)
  pillarSplit?: Partial<Record<Pillar, number>>; // INCOME: how much of it the user assigns to each pillar (targets)
  pillarMonth?: string; // INCOME: 'YYYY-MM' the split counts for, when different from the date (e.g. salary paid on the 30th)
  excludeFromPillars?: boolean; // INCOME / EXPENSE the user marked as not counting (refunds, returned money): ignored in Pilares
  pillarRate?: number; // Dollar movements: soles per dollar frozen when registered, used to count them in Pilares
}

// AI-parsed transaction suggestion from voice/text input
export interface ParsedTransaction {
  id: string; // Temporary client-side ID for UI tracking
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD format
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'PAY_DEBT' | 'SAVE_FOR_GOAL' | 'PAY_CREDIT_CARD' | 'RECEIVE_DEBT_PAYMENT';
  categoryId?: string;
  accountId?: string; // May be empty if AI couldn't determine
  fromAccountId?: string;
  debtId?: string;
  goalId?: string;
  pillar?: Pillar;
  confidence: number; // 0-1 how confident the AI is
  aiNote?: string; // Optional note from AI explaining its reasoning
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
