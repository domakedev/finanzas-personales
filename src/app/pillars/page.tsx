"use client"

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { ChevronLeft, ChevronRight, Check, AlertCircle, CalendarClock } from 'lucide-react';
import { deleteField } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { IncomeSplitEditor } from '@/components/pillars/IncomeSplitEditor';
import { useStore } from '@/lib/store';
import { updateTransaction as updateTransactionInDB } from '@/lib/db';
import {
  cleanSplit, computeMonthPillars, monthKey, PILLARS, PillarSplit, PillarStatus, splitTotal,
} from '@/lib/pillars';
import { subtractMoney } from '@/lib/utils';
import { Pillar, Transaction } from '@/types';

const money = (v: number) => `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortDate = (d: Date) => d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });

const statusLine = ({ meta, target, spent }: PillarStatus) => {
  if (target <= 0) return { text: 'Sin meta · reparte un ingreso', tone: 'text-muted-foreground', done: false };
  const diff = subtractMoney(target, spent);
  if (meta.kind === 'goal') {
    return diff <= 0
      ? { text: 'Meta cumplida', tone: 'text-green-600 dark:text-green-400', done: true }
      : { text: `Faltan ${money(diff)}`, tone: 'text-muted-foreground', done: false };
  }
  return diff < 0
    ? { text: `Te pasaste ${money(-diff)}`, tone: 'text-red-600 dark:text-red-400', done: false }
    : { text: `Te quedan ${money(diff)}`, tone: 'text-muted-foreground', done: false };
};

export default function PillarsPage() {
  const transactions = useStore((s) => s.transactions);
  const accounts = useStore((s) => s.accounts);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });
  const [expanded, setExpanded] = useState<Pillar | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [splitTx, setSplitTx] = useState<Transaction | null>(null);
  const [draftSplit, setDraftSplit] = useState<PillarSplit>({});
  const [draftMonth, setDraftMonth] = useState<string | undefined>();
  const [splitError, setSplitError] = useState<string | null>(null);

  const { income, assigned, incomes, pillars, unassigned } = computeMonthPillars(transactions, cursor.month, cursor.year);
  const monthName = new Date(cursor.year, cursor.month, 1).toLocaleDateString('es-PE', { month: 'long' });
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name;
  const toSplit = Math.max(0, subtractMoney(income, assigned));

  const shiftMonth = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ month: d.getMonth(), year: d.getFullYear() });
    setExpanded(null);
  };

  const assignPillar = async (txId: string, pillar: Pillar) => {
    setSavingId(txId);
    try {
      await updateTransactionInDB(txId, { pillar });
      updateTransaction(txId, { pillar });
    } catch (error) {
      console.error('Error assigning pillar:', error);
    } finally {
      setSavingId(null);
    }
  };

  const openSplit = (tx: Transaction) => {
    setSplitTx(tx);
    setDraftSplit(tx.pillarSplit || {});
    setDraftMonth(tx.pillarMonth);
    setSplitError(null);
  };

  const saveSplit = async () => {
    if (!splitTx) return;
    if (splitTotal(draftSplit) > splitTx.amount) {
      setSplitError('Repartiste más de lo que ingresó');
      return;
    }
    const split = cleanSplit(draftSplit);
    const month = draftMonth && draftMonth !== monthKey(splitTx.date) ? draftMonth : undefined;
    setSavingId(splitTx.id);
    try {
      await updateTransactionInDB(splitTx.id, {
        pillarSplit: split ?? deleteField(),
        pillarMonth: month ?? deleteField(),
      } as unknown as Partial<Transaction>);
      updateTransaction(splitTx.id, { pillarSplit: split, pillarMonth: month });
      setSplitTx(null);
    } catch (error) {
      console.error('Error saving pillar split:', error);
      setSplitError('No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setSavingId(null);
    }
  };

  const stats = [
    { label: 'Ingresos', value: money(income), warn: false },
    { label: 'Repartido', value: money(assigned), warn: false },
    { label: 'Sin repartir', value: money(toSplit), warn: toSplit > 0 },
    { label: 'Gastos sin pilar', value: String(unassigned.length), warn: unassigned.length > 0 },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center justify-center gap-2 xl:justify-start">
            <button onClick={() => shiftMonth(-1)} className="rounded-full p-2 hover:bg-muted" aria-label="Mes anterior">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="min-w-48 text-center text-3xl font-bold tracking-tight">
              <span className="capitalize">{monthName}</span> {cursor.year}
            </h2>
            <button onClick={() => shiftMonth(1)} className="rounded-full p-2 hover:bg-muted" aria-label="Mes siguiente">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-card px-4 py-2">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-lg font-semibold tabular-nums ${s.warn ? 'text-amber-600 dark:text-amber-400' : ''}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-3">
          {/* Pillars */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {pillars.map((status) => {
              const { meta, target, spent, percent, transactions: txs } = status;
              const Icon = meta.icon;
              const over = meta.kind === 'limit' && percent > 100;
              const line = statusLine(status);
              const isOpen = expanded === meta.id;
              const sorted = txs.slice().sort((a, b) => b.date.getTime() - a.date.getTime());
              const visible = isOpen ? sorted : sorted.slice(0, 3);
              return (
                <Card key={meta.id} className="flex h-full flex-col" data-testid={`pillar-card-${meta.id}`}>
                  <CardContent className="flex flex-1 flex-col gap-3 pt-5">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${meta.color}26`, color: meta.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold">{meta.name}</p>
                        <p className="text-xs text-muted-foreground">{meta.kind === 'goal' ? 'Meta' : 'Límite'}</p>
                      </div>
                      {target > 0 && (
                        <span className={`text-2xl font-bold tabular-nums ${over ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {percent.toFixed(0)}%
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="tabular-nums">
                        <span className="text-xl font-semibold">{money(spent)}</span>
                        <span className="text-sm text-muted-foreground"> / {money(target)}</span>
                      </p>
                      <div className="mt-2 h-2.5 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: over ? '#c0392b' : meta.color }}
                        />
                      </div>
                      <p className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${line.tone}`}>
                        {line.done && <Check className="h-3.5 w-3.5" />}
                        {line.text}
                      </p>
                    </div>

                    <div className="mt-auto border-t border-border pt-2">
                      {sorted.length === 0 ? (
                        <p className="py-1 text-xs text-muted-foreground">Sin movimientos este mes</p>
                      ) : (
                        <>
                          {visible.map((tx) => (
                            <div key={tx.id} className="flex items-center gap-2 py-1 text-sm">
                              <span className="min-w-0 flex-1 truncate">{tx.description}</span>
                              <span className="text-xs text-muted-foreground">{shortDate(tx.date)}</span>
                              <span className="w-20 text-right tabular-nums">{tx.amount.toFixed(2)}</span>
                            </div>
                          ))}
                          {sorted.length > 3 && (
                            <button
                              onClick={() => setExpanded(isOpen ? null : meta.id)}
                              className="pt-1 text-xs font-medium text-primary hover:underline"
                            >
                              {isOpen ? 'Ver menos' : `Ver todos (${sorted.length})`}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Side column */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-5">
                <p className="pb-2 font-semibold">Ingresos del mes</p>
                {incomes.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aún no hay ingresos. La meta de cada pilar sale de cómo los repartes.</p>
                )}
                {incomes
                  .slice()
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .map((tx) => {
                    const done = splitTotal(tx.pillarSplit);
                    const moved = tx.pillarMonth && tx.pillarMonth !== monthKey(tx.date);
                    return (
                      <button
                        key={tx.id}
                        onClick={() => openSplit(tx)}
                        className="block w-full space-y-1.5 rounded-md border-t border-border px-1 py-2.5 text-left first:border-0 hover:bg-muted"
                        data-testid={`income-split-${tx.id}`}
                      >
                        <span className="flex items-center gap-2 text-sm">
                          <span className="min-w-0 flex-1 truncate font-medium">{tx.description}</span>
                          <span className="tabular-nums">{tx.amount.toFixed(2)}</span>
                        </span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{shortDate(tx.date)}</span>
                          {moved && (
                            <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> cuenta para {monthName}</span>
                          )}
                          <span className={`ml-auto font-medium ${done > 0 ? '' : 'text-primary'}`}>{done > 0 ? 'Editar' : 'Repartir'}</span>
                        </span>
                        {done > 0 && (
                          <span className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted">
                            {PILLARS.filter((p) => tx.pillarSplit?.[p.id]).map((p) => (
                              <span
                                key={p.id}
                                style={{ width: `${((tx.pillarSplit?.[p.id] || 0) / tx.amount) * 100}%`, backgroundColor: p.color }}
                                title={p.name}
                              />
                            ))}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </CardContent>
            </Card>

            {unassigned.length > 0 && (
              <Card className="border-amber-300 dark:border-amber-800">
                <CardContent className="pt-5">
                  <p className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    {unassigned.length} gasto{unassigned.length > 1 ? 's' : ''} sin pilar
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pb-2 pt-1 text-xs text-muted-foreground">
                    {PILLARS.map((p) => {
                      const PIcon = p.icon;
                      return (
                        <span key={p.id} className="flex items-center gap-1"><PIcon className="h-3 w-3" style={{ color: p.color }} />{p.name}</span>
                      );
                    })}
                  </div>
                  <div className="max-h-[32rem] overflow-y-auto pr-1">
                    {unassigned
                      .slice()
                      .sort((a, b) => b.date.getTime() - a.date.getTime())
                      .map((tx) => (
                        <div key={tx.id} className="space-y-2 border-t border-border py-2.5 first:border-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="min-w-0 flex-1 truncate">{tx.description}</span>
                            <span className="font-medium tabular-nums">{tx.amount.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                              {shortDate(tx.date)}{accountName(tx.accountId) ? ` · ${accountName(tx.accountId)}` : ''}
                            </span>
                            {PILLARS.map((p) => {
                              const PIcon = p.icon;
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => assignPillar(tx.id, p.id)}
                                  disabled={savingId === tx.id}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg transition-transform hover:scale-110 disabled:opacity-50"
                                  style={{ backgroundColor: `${p.color}26`, color: p.color }}
                                  aria-label={`Asignar a ${p.name}`}
                                  title={p.name}
                                >
                                  <PIcon className="h-4 w-4" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={splitTx !== null} onClose={() => setSplitTx(null)} title={splitTx ? `${splitTx.description} · ${money(splitTx.amount)}` : ''}>
        {splitTx && (
          <div className="space-y-4">
            {splitError && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{splitError}</p>}
            <IncomeSplitEditor
              amount={splitTx.amount}
              value={draftSplit}
              onChange={(v) => { setDraftSplit(v); setSplitError(null); }}
              date={splitTx.date}
              month={draftMonth}
              onMonthChange={setDraftMonth}
            />
            <Button className="w-full" onClick={saveSplit} disabled={savingId === splitTx.id}>
              Guardar reparto
            </Button>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
