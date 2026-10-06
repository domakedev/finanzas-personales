import { TrendingUp, Shield, Home, Star, type LucideIcon } from 'lucide-react';
import { Pillar, Transaction } from '@/types';
import { addMoney, calcPercent, multiplyMoney, subtractMoney } from './utils';

// Regla 25/15/50/10. Targets come from how the user splits each income (percent is only used by the
// "llenar 25/15/50/10" button). "goal" pillars should reach their target; "limit" pillars should not exceed it.
export interface PillarMeta {
  id: Pillar;
  name: string;
  percent: number;
  kind: 'goal' | 'limit';
  color: string;
  icon: LucideIcon;
  description: string; // what kind of spending belongs here
}

export const PILLARS: PillarMeta[] = [
  {
    id: 'GROWTH', name: 'Crecimiento', percent: 25, kind: 'goal', color: '#2a78d6', icon: TrendingUp,
    description: 'Lo que aumenta tu valor o tus ingresos: inversiones, cursos, libros, herramientas y gastos de tu negocio.',
  },
  {
    id: 'STABILITY', name: 'Estabilidad', percent: 15, kind: 'goal', color: '#1baf7a', icon: Shield,
    description: 'Tu colchón: fondo de emergencia y ahorro de seguridad, disponible rápido y sin riesgo.',
  },
  {
    id: 'ESSENTIAL', name: 'Esenciales', percent: 50, kind: 'limit', color: '#eb6834', icon: Home,
    description: 'Lo necesario para vivir y trabajar: vivienda, mercado, luz, agua, internet, pasajes, salud y cuotas de deudas.',
  },
  {
    id: 'REWARD', name: 'Recompensas', percent: 10, kind: 'limit', color: '#eda100', icon: Star,
    description: 'Gustos sin culpa: salidas, restaurantes, delivery, viajes, hobbies y regalos.',
  },
];

export const PILLAR_IDS = PILLARS.map((p) => p.id) as [Pillar, ...Pillar[]];

export const getPillar = (id?: Pillar) => PILLARS.find((p) => p.id === id);

// Hint shown in the picker (never preselected): the user always chooses the pillar
const CATEGORY_PILLAR: Record<string, Pillar> = {
  food: 'ESSENTIAL',
  transport: 'ESSENTIAL',
  health: 'ESSENTIAL',
  bills: 'ESSENTIAL',
  housing: 'ESSENTIAL',
  education: 'GROWTH',
  investment: 'GROWTH',
  entertainment: 'REWARD',
  shopping: 'REWARD',
  gift: 'REWARD',
};

// Transaction types that carry a pillar (progress). Only EXPENSE requires one.
export const PILLAR_PICK_TYPES: Transaction['type'][] = ['EXPENSE', 'PAY_DEBT', 'SAVE_FOR_GOAL', 'TRANSFER'];

export const suggestPillar = (
  type: Transaction['type'],
  categoryId?: string,
  destinationPillar?: Pillar
): Pillar | undefined => {
  if (type === 'TRANSFER') return destinationPillar;
  if (type === 'PAY_DEBT') return 'ESSENTIAL';
  if (type === 'SAVE_FOR_GOAL') return 'STABILITY';
  return categoryId ? CATEGORY_PILLAR[categoryId] : undefined;
};

export type PillarSplit = Partial<Record<Pillar, number>>;

export const splitTotal = (split?: PillarSplit) =>
  Object.values(split || {}).reduce((sum: number, v) => addMoney(sum, v || 0), 0);

// "Llenar 25/15/50/10": the last pillar takes the rounding remainder so the parts add up to the amount
export const fillSplit = (amount: number): PillarSplit => {
  const split: PillarSplit = {};
  let assigned = 0;
  PILLARS.forEach((p, i) => {
    const value = i === PILLARS.length - 1 ? subtractMoney(amount, assigned) : multiplyMoney(amount, p.percent / 100);
    split[p.id] = value;
    assigned = addMoney(assigned, value);
  });
  return split;
};

// Drops empty parts; returns undefined when nothing is assigned
export const cleanSplit = (split?: PillarSplit): PillarSplit | undefined => {
  const entries = Object.entries(split || {}).filter(([, v]) => Number(v) > 0);
  return entries.length ? Object.fromEntries(entries.map(([k, v]) => [k, Number(v)])) : undefined;
};

const COUNTED_TYPES: Transaction['type'][] = ['EXPENSE', 'PAY_DEBT', 'SAVE_FOR_GOAL', 'TRANSFER'];

export type Currency = 'PEN' | 'USD';

export const currencySymbol = (c: Currency) => (c === 'USD' ? '$' : 'S/');

export const DEFAULT_USD_RATE = 3.5;

// Currency of a movement: its account (or credit card); transfers use the source account
export const makeCurrencyOf = (
  accounts: { id: string; currency: Currency }[],
  debts: { id: string; currency: Currency }[]
) => (t: Transaction): Currency => {
  if (t.type === 'TRANSFER') {
    return (t.fromCurrency as Currency) || accounts.find((a) => a.id === t.fromAccountId)?.currency || 'PEN';
  }
  return accounts.find((a) => a.id === t.accountId)?.currency || debts.find((d) => d.id === t.accountId)?.currency || 'PEN';
};

// Pilares are counted in soles. Dollar movements use the rate frozen on them when registered
// (pillarRate); older ones without it fall back to the current general rate.
export type ToPen = (t: Transaction, value: number) => number;

export const makeToPen = (currencyOf: (t: Transaction) => Currency, generalRate: number): ToPen =>
  (t, value) => (currencyOf(t) === 'USD' ? multiplyMoney(value, t.pillarRate ?? generalRate) : value);

export interface PillarStatus {
  meta: PillarMeta;
  target: number;
  spent: number;
  percent: number;
  transactions: Transaction[];
}

export interface MonthPillars {
  income: number;
  assigned: number; // part of the income the user split into pillars
  incomes: Transaction[];
  hiddenIncomes: Transaction[]; // incomes the user excluded (refunds, returned money)
  pillars: PillarStatus[];
  unassigned: Transaction[]; // expenses without pillar
  hiddenExpenses: Transaction[]; // expenses without pillar the user excluded (refunds, returned money)
}

const inMonth = (d: Date, month: number, year: number) => d.getMonth() === month && d.getFullYear() === year;

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Month an income's split counts for: its own month unless the user moved it (e.g. salary paid early)
export const incomeMonthKey = (t: Transaction) => t.pillarMonth ?? monthKey(t.date);

export const computeMonthPillars = (
  transactions: Transaction[],
  month: number,
  year: number,
  toPen: ToPen = (_, value) => value
): MonthPillars => {
  const monthTxs = transactions.filter((t) => !t.isAdjustment && inMonth(t.date, month, year));
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthIncomes = transactions.filter((t) => t.type === 'INCOME' && !t.isAdjustment && incomeMonthKey(t) === key);
  const incomes = monthIncomes.filter((t) => !t.excludeFromPillars);
  const hiddenIncomes = monthIncomes.filter((t) => t.excludeFromPillars);
  const sum = (txs: Transaction[], pick: (t: Transaction) => number) =>
    txs.reduce((acc, t) => addMoney(acc, toPen(t, pick(t))), 0);

  const pillars = PILLARS.map((meta) => {
    const txs = monthTxs.filter((t) => t.pillar === meta.id && COUNTED_TYPES.includes(t.type));
    const spent = sum(txs, (t) => t.amount);
    const target = sum(incomes, (t) => t.pillarSplit?.[meta.id] || 0);
    return { meta, target, spent, percent: target > 0 ? calcPercent(spent, target) : 0, transactions: txs };
  });

  const noPillar = monthTxs.filter((t) => t.type === 'EXPENSE' && !t.pillar);
  const unassigned = noPillar.filter((t) => !t.excludeFromPillars);
  const hiddenExpenses = noPillar.filter((t) => t.excludeFromPillars);
  return {
    income: sum(incomes, (t) => t.amount),
    assigned: sum(incomes, (t) => splitTotal(t.pillarSplit)),
    incomes,
    hiddenIncomes,
    pillars,
    unassigned,
    hiddenExpenses,
  };
};

// ---- Threshold alerts (50%, 75%, 90%, 100%, over 100%) ----

export interface PillarAlert {
  pillar: Pillar;
  title: string;
  detail: string;
  tone: 'info' | 'warning' | 'danger' | 'success';
}

const THRESHOLDS = [100, 90, 75, 50];

const crossed = (before: number, after: number): number | null => {
  if (before <= 100 && after > 100) return 101;
  return THRESHOLDS.find((t) => before < t && after >= t) ?? null;
};

const buildAlert = (status: PillarStatus, level: number): PillarAlert => {
  const { meta, spent, target } = status;
  const detail = `S/ ${spent.toFixed(2)} de S/ ${target.toFixed(2)} este mes`;
  if (meta.kind === 'goal') {
    if (level >= 100) return { pillar: meta.id, title: `¡Meta de ${meta.name} cumplida! 🎉`, detail, tone: 'success' };
    const title = level === 90 ? `¡Casi! 90% de tu meta de ${meta.name}` : level === 75 ? `3/4 de tu meta de ${meta.name}` : `Mitad de tu meta de ${meta.name}`;
    return { pillar: meta.id, title, detail, tone: 'info' };
  }
  if (level === 101) {
    return { pillar: meta.id, title: `Te pasaste en ${meta.name} por S/ ${subtractMoney(spent, target).toFixed(2)}`, detail, tone: 'danger' };
  }
  if (level === 100) return { pillar: meta.id, title: `Llegaste al límite de ${meta.name}`, detail, tone: 'danger' };
  if (level === 90) return { pillar: meta.id, title: `Cuidado: 90% de ${meta.name}`, detail, tone: 'warning' };
  const title = level === 75 ? `Llevas 3/4 de ${meta.name}` : `Vas en la mitad de ${meta.name}`;
  return { pillar: meta.id, title, detail, tone: 'info' };
};

// Compares pillar progress before/after saving transactions and returns the most important alert, if any.
export const findPillarAlert = (
  before: Transaction[],
  after: Transaction[],
  dates: Date[],
  toPen?: ToPen
): PillarAlert | null => {
  const months = Array.from(new Set(dates.map((d) => `${d.getFullYear()}-${d.getMonth()}`)));
  let best: { score: number; alert: PillarAlert } | null = null;

  for (const key of months) {
    const [year, month] = key.split('-').map(Number);
    const prev = computeMonthPillars(before, month, year, toPen);
    const next = computeMonthPillars(after, month, year, toPen);

    next.pillars.forEach((status, i) => {
      const level = crossed(prev.pillars[i].percent, status.percent);
      if (level === null) return;
      // Over-limit warnings beat goal celebrations, which beat smaller milestones
      const score = level + (status.meta.kind === 'limit' && level >= 100 ? 1000 : 0);
      if (!best || score > best.score) best = { score, alert: buildAlert(status, level) };
    });
  }
  return best ? (best as { score: number; alert: PillarAlert }).alert : null;
};
