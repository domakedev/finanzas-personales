"use client"

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { applyCatchUp, CatchUpBatch } from '@/lib/db';
import { addMoney, subtractMoney } from '@/lib/utils';
import { Debt, Transaction } from '@/types';
import { format, differenceInCalendarDays } from 'date-fns';
import { CheckCircle2, RefreshCw, Wallet, CreditCard, HandCoins, Landmark, Loader2, LucideIcon } from 'lucide-react';

type Currency = 'PEN' | 'USD';
type Kind = 'account' | 'card' | 'debt' | 'lent';

interface Row {
  key: string;
  kind: Kind;
  name: string;
  currency: Currency;
  logo?: string;
  icon?: string;
  appValue: number;      // what the app currently thinks
  raw: string;           // user input
  difference: number | null; // real - app, null when no input
}

const symbol = (c: Currency) => (c === 'USD' ? '$' : 'S/');

const SECTIONS: { kind: Kind; title: string; icon: LucideIcon; hint: string; placeholder: string; appLabel: string; up: string; down: string }[] = [
  { kind: 'account', title: 'Cuentas', icon: Wallet, hint: 'Saldo que ves en la app de tu banco o billetera.', placeholder: 'Saldo real', appLabel: 'En la app', up: 'Ingresos sin registrar', down: 'Gastos sin registrar' },
  { kind: 'card', title: 'Tarjetas de crédito', icon: CreditCard, hint: 'Deuda actual que muestra tu banco (lo que debes hoy, no el límite).', placeholder: 'Deuda real', appLabel: 'Deuda en la app', up: 'Consumos sin registrar', down: 'Pagos sin registrar' },
  { kind: 'debt', title: 'Deudas', icon: Landmark, hint: 'Cuánto te falta pagar hoy de cada deuda.', placeholder: 'Saldo pendiente', appLabel: 'Pendiente en la app', up: 'La deuda creció (intereses u otros)', down: 'Pagos sin registrar' },
  { kind: 'lent', title: 'Me deben', icon: HandCoins, hint: 'Cuánto te deben todavía.', placeholder: 'Aún me deben', appLabel: 'Pendiente en la app', up: 'Te deben más de lo registrado', down: 'Cobros sin registrar' },
];

const remainingOf = (d: Debt) => subtractMoney(d.totalAmount, d.paidAmount || 0);

export default function CatchUpPage() {
  const { user: authUser } = useAuth();
  const user = useStore((s) => s.user) || authUser;
  const accounts = useStore((s) => s.accounts);
  const debts = useStore((s) => s.debts);
  const transactions = useStore((s) => s.transactions);
  const addTransactionToStore = useStore((s) => s.addTransaction);
  const updateAccountInStore = useStore((s) => s.updateAccount);
  const updateDebtInStore = useStore((s) => s.updateDebt);

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [dateInput, setDateInput] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ count: number; transactions: number } | null>(null);

  // How long since the user last recorded anything (excluding previous adjustments)
  const lastRealTx = useMemo(() => {
    const real = transactions.filter((t) => !t.isAdjustment);
    if (real.length === 0) return null;
    return real.reduce((max, t) => (t.date > max ? t.date : max), real[0].date);
  }, [transactions]);
  const daysAway = lastRealTx ? differenceInCalendarDays(new Date(), lastRealTx) : null;

  const rows = useMemo<Row[]>(() => {
    const build = (key: string, kind: Kind, name: string, currency: Currency, appValue: number, logo?: string, icon?: string): Row => {
      const raw = inputs[key] ?? '';
      const real = raw === '' ? NaN : parseFloat(raw);
      return { key, kind, name, currency, logo, icon, appValue, raw, difference: isNaN(real) ? null : subtractMoney(real, appValue) };
    };
    return [
      ...accounts.map((a) => build(`account:${a.id}`, 'account', a.name, a.currency, a.balance, a.logo, a.icon)),
      ...debts.filter((d) => d.isCreditCard).map((d) => build(`card:${d.id}`, 'card', d.lastFourDigits ? `${d.name} ****${d.lastFourDigits}` : d.name, d.currency, remainingOf(d), d.logo, d.icon || '💳')),
      ...debts.filter((d) => !d.isCreditCard && !d.isLent).map((d) => build(`debt:${d.id}`, 'debt', d.name, d.currency, remainingOf(d), undefined, '🏦')),
      ...debts.filter((d) => d.isLent).map((d) => build(`lent:${d.id}`, 'lent', d.name, d.currency, remainingOf(d), undefined, '🤝')),
    ];
  }, [accounts, debts, inputs]);

  const pending = rows.filter((r) => r.difference !== null && r.difference !== 0);
  const matched = rows.filter((r) => r.difference === 0);

  const adjustDate = new Date(`${dateInput}T12:00:00`);
  const adjustDateLabel = isNaN(adjustDate.getTime()) ? '' : format(adjustDate, 'dd/MM/yyyy');

  // Turn every pending row into concrete writes
  const buildBatch = (): CatchUpBatch => {
    const label = `Ajuste por reconciliación (hasta ${adjustDateLabel})`;
    const batch: CatchUpBatch = { transactions: [], accountUpdates: [], debtUpdates: [] };
    const baseTx = { description: label, date: adjustDate, createdAt: new Date(), isVerified: true, isAdjustment: true } as const;

    for (const row of pending) {
      const id = row.key.split(':')[1];
      const diff = row.difference!;
      const real = addMoney(row.appValue, diff);

      if (row.kind === 'account') {
        batch.transactions.push({
          ...baseTx,
          amount: Math.abs(diff),
          type: diff > 0 ? 'INCOME' : 'EXPENSE',
          categoryId: diff > 0 ? 'other-income' : 'other',
          accountId: id,
        } as Omit<Transaction, 'id'>);
        batch.accountUpdates.push({ id, balance: real });
        continue;
      }

      const debt = debts.find((d) => d.id === id)!;
      if (row.kind === 'card' && diff > 0) {
        // Unregistered purchases: an expense charged to the card, so it shows up in the flow and can be deleted later
        batch.transactions.push({ ...baseTx, amount: diff, type: 'EXPENSE', categoryId: 'other', accountId: id } as Omit<Transaction, 'id'>);
        batch.debtUpdates.push({ id, data: { totalAmount: addMoney(debt.totalAmount, diff) } });
      } else if (diff > 0) {
        // Debt grew (interest, fees, or a new loan on top): raise the total
        batch.debtUpdates.push({ id, data: { totalAmount: addMoney(debt.totalAmount, diff) } });
      } else {
        // Paid (or collected) more than the app knew: count it as already paid
        batch.debtUpdates.push({ id, data: { paidAmount: addMoney(debt.paidAmount || 0, Math.abs(diff)) } });
      }
    }
    return batch;
  };

  const handleApply = async () => {
    if (!user || pending.length === 0 || !adjustDateLabel) return;
    setConfirmOpen(false);
    setIsSaving(true);
    setError(null);

    const batch = buildBatch();
    try {
      const created = await applyCatchUp(user.uid, batch);
      created.forEach((tx) => addTransactionToStore(tx));
      batch.accountUpdates.forEach((a) => updateAccountInStore(a.id, { balance: a.balance }));
      batch.debtUpdates.forEach((d) => updateDebtInStore(d.id, d.data));
      setDone({ count: pending.length, transactions: created.length });
      setInputs({});
    } catch (e) {
      console.error('Error applying catch-up:', e);
      setError('No se pudieron guardar los ajustes. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderLogo = (row: Row) =>
    row.logo ? (
      <Image src={row.logo} alt={row.name} width={28} height={28} className="object-contain" />
    ) : (
      <span className="text-xl">{row.icon || '💵'}</span>
    );

  const hasAnything = rows.length > 0;

  if (done) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">¡Estás al día!</h2>
              <p className="text-muted-foreground">
                Se {done.count === 1 ? 'ajustó 1 elemento' : `ajustaron ${done.count} elementos`} y tus saldos y deudas ya coinciden con el banco.
                {done.transactions > 0 && (
                  <> Los movimientos creados aparecen en el flujo como &quot;Ajuste por reconciliación&quot;: si algún día tienes ganas,
                  puedes borrarlos y registrar los gastos reales de ese período.</>
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link href="/dashboard"><Button>Ir al dashboard</Button></Link>
                {done.transactions > 0 && <Link href="/transactions"><Button variant="outline">Ver ajustes en el flujo</Button></Link>}
                <Button variant="ghost" onClick={() => setDone(null)}>Ajustar algo más</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <RefreshCw className="h-7 w-7 text-primary" /> Ponerme al día
          </h2>
          <p className="text-muted-foreground mt-1">
            {daysAway === null
              ? 'Aún no tienes movimientos registrados.'
              : daysAway === 0
                ? 'Registraste movimientos hoy. Aun así puedes verificar que todo coincida.'
                : `Tu último movimiento registrado fue hace ${daysAway} ${daysAway === 1 ? 'día' : 'días'} (${format(lastRealTx!, 'dd/MM/yyyy')}).`}
          </p>
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 text-sm space-y-1">
            <p className="font-medium">No necesitas registrar cada gasto para volver a tener el panorama correcto.</p>
            <p className="text-muted-foreground">
              Abre la app de cada banco, copia el saldo o la deuda que ves y escríbelo abajo. Lo que dejes en blanco no se toca.
              La app corrige la diferencia con un solo ajuste por elemento.
            </p>
          </CardContent>
        </Card>

        {!hasAnything ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-3">
              <Wallet className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Todavía no tienes cuentas ni deudas. Crea una primero.</p>
              <Link href="/accounts"><Button variant="outline">Ir a Cuentas</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-end gap-2 text-sm">
              <label htmlFor="adjust-date" className="text-muted-foreground whitespace-nowrap">Fecha del ajuste</label>
              <input
                id="adjust-date"
                type="date"
                value={dateInput}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setDateInput(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>

            {SECTIONS.map((section) => {
              const sectionRows = rows.filter((r) => r.kind === section.kind);
              if (sectionRows.length === 0) return null;
              return (
                <Card key={section.kind}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <section.icon className="h-5 w-5 text-muted-foreground" /> {section.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{section.hint}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sectionRows.map((row) => (
                      <div
                        key={row.key}
                        className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 md:gap-6 items-center p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            {renderLogo(row)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{row.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {section.appLabel}: {symbol(row.currency)} {row.appValue.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="md:w-48">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                              {symbol(row.currency)}
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              value={row.raw}
                              onChange={(e) => setInputs((prev) => ({ ...prev, [row.key]: e.target.value }))}
                              placeholder={section.placeholder}
                              aria-label={`${section.placeholder} de ${row.name}`}
                              className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
                            />
                          </div>
                        </div>

                        <div className="md:w-52 text-sm">
                          {row.difference === null ? (
                            <span className="text-muted-foreground">Sin cambios</span>
                          ) : row.difference === 0 ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" /> Coincide
                            </span>
                          ) : (
                            <div>
                              <span className={`font-semibold ${(row.kind === 'account' || row.kind === 'lent') === row.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {row.difference > 0 ? '+' : '-'} {symbol(row.currency)} {Math.abs(row.difference).toFixed(2)}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {row.difference > 0 ? section.up : section.down}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}

            <Card>
              <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-sm space-y-1">
                  {pending.length === 0 ? (
                    <p className="text-muted-foreground">
                      {matched.length > 0
                        ? 'Todo coincide. No hay nada que ajustar.'
                        : 'Escribe el valor real de al menos un elemento para ver la diferencia.'}
                    </p>
                  ) : (
                    <p className="font-medium">
                      {pending.length === 1 ? '1 elemento por ajustar' : `${pending.length} elementos por ajustar`}
                      {matched.length > 0 && <span className="text-muted-foreground"> · {matched.length} ya coinciden</span>}
                    </p>
                  )}
                  {error && <p className="text-red-600">{error}</p>}
                </div>
                <Button
                  size="lg"
                  disabled={pending.length === 0 || isSaving || !adjustDateLabel}
                  onClick={() => setConfirmOpen(true)}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {pending.length <= 1 ? 'Ajustar' : `Ajustar ${pending.length} elementos`}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleApply}
        title="Confirmar ajustes"
        message={`Se ajustarán ${pending.length} ${pending.length === 1 ? 'elemento' : 'elementos'} con fecha ${adjustDateLabel}. Los saldos de cuentas y las deudas pasarán a ser los valores que escribiste. Los ajustes de cuentas y consumos de tarjeta quedan como movimientos que puedes borrar después.`}
        confirmText="Sí, ponerme al día"
      />
    </Layout>
  );
}
