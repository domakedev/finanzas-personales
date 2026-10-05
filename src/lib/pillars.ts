import { TrendingUp, Shield, Home, Star, type LucideIcon } from 'lucide-react';
import { Pillar, Transaction } from '@/types';
import { addMoney, calcPercent, multiplyMoney, subtractMoney } from './utils';

// Regla 25/15/50/10. "goal" pillars should reach their target; "limit" pillars should not exceed it.
export interface PillarMeta {
  id: Pillar;
  name: string;
  percent: number;
  kind: 'goal' | 'limit';
  color: string;
  icon: LucideIcon;
}

export const PILLARS: PillarMeta[] = [
  { id: 'GROWTH', name: 'Crecimiento', percent: 25, kind: 'goal', color: '#2a78d6', icon: TrendingUp },
  { id: 'STABILITY', name: 'Estabilidad', percent: 15, kind: 'goal', color: '#1baf7a', icon: Shield },
  { id: 'ESSENTIAL', name: 'Esenciales', percent: 50, kind: 'limit', color: '#eb6834', icon: Home },
  { id: 'REWARD', name: 'Recompensas', percent: 10, kind: 'limit', color: '#eda100', icon: Star },
];

export const PILLAR_IDS = PILLARS.map((p) => p.id) as [Pillar, ...Pillar[]];

export const getPillar = (id?: Pillar) => PILLARS.find((p) => p.id === id);

// Suggested pillar for the system categories; the user can always override it per transaction
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

// Transaction types where the user picks the pillar (TRANSFER takes it from the destination account)
export const PILLAR_PICK_TYPES: Transaction['type'][] = ['EXPENSE', 'PAY_DEBT', 'SAVE_FOR_GOAL'];

export const suggestPillar = (type: Transaction['type'], categoryId?: string): Pillar | undefined => {
  if (type === 'PAY_DEBT') return 'ESSENTIAL';
  if (type === 'SAVE_FOR_GOAL') return 'STABILITY';
  return categoryId ? CATEGORY_PILLAR[categoryId] : undefined;
};

const COUNTED_TYPES: Transaction['type'][] = ['EXPENSE', 'PAY_DEBT', 'SAVE_FOR_GOAL', 'TRANSFER'];

export interface PillarStatus {
  meta: PillarMeta;
  target: number;
  spent: number;
  percent: number;
  transactions: Transaction[];
}

export interface MonthPillars {
  income: number;
  pillars: PillarStatus[];
  unassigned: Transaction[];
}

const inMonth = (d: Date, month: number, year: number) => d.getMonth() === month && d.getFullYear() === year;

export const computeMonthPillars = (transactions: Transaction[], month: number, year: number): MonthPillars => {
  const monthTxs = transactions.filter((t) => !t.isAdjustment && inMonth(t.date, month, year));
  const income = monthTxs
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => addMoney(sum, t.amount), 0);

  const pillars = PILLARS.map((meta) => {
    const txs = monthTxs.filter((t) => t.pillar === meta.id && COUNTED_TYPES.includes(t.type));
    const spent = txs.reduce((sum, t) => addMoney(sum, t.amount), 0);
    const target = multiplyMoney(income, meta.percent / 100);
    return { meta, target, spent, percent: target > 0 ? calcPercent(spent, target) : 0, transactions: txs };
  });

  const unassigned = monthTxs.filter((t) => t.type === 'EXPENSE' && !t.pillar);
  return { income, pillars, unassigned };
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
export const findPillarAlert = (before: Transaction[], after: Transaction[], dates: Date[]): PillarAlert | null => {
  const months = Array.from(new Set(dates.map((d) => `${d.getFullYear()}-${d.getMonth()}`)));
  let best: { score: number; alert: PillarAlert } | null = null;

  for (const key of months) {
    const [year, month] = key.split('-').map(Number);
    const prev = computeMonthPillars(before, month, year);
    const next = computeMonthPillars(after, month, year);
    if (next.income <= 0) continue;

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
