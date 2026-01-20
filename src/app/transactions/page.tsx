"use client"

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TransactionForm } from '@/components/forms/TransactionForm';
import { LoadingFinance } from '@/components/ui/LoadingFinance';
import { useStore } from '@/lib/store';
import { deleteTransactionAtomic } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { Plus, ArrowUpRight, ArrowDownLeft, Trash2, Pencil, Loader2, Sprout, HandCoins, ArrowRightLeft, CreditCard, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { Transaction } from '@/types';
import { TRANSACTION_CATEGORIES, INCOME_SOURCES } from '@/constants/categories';

export default function TransactionsPage() {
  // Colores para diferentes tipos de transacción
  const TRANSACTION_COLORS = {
    INCOME: 'border-green-200 dark:border-green-700',
    EXPENSE: 'border-red-200 dark:border-red-700',
    TRANSFER: 'border-blue-200 dark:border-blue-700',
    PAY_DEBT: 'border-purple-200 dark:border-purple-700',
    PAY_CREDIT_CARD: 'border-orange-200 dark:border-orange-700',
    SAVE_FOR_GOAL: 'border-amber-200 dark:border-amber-700',
    RECEIVE_DEBT_PAYMENT: 'border-green-200 dark:border-green-700',
  };

  // Colores para las etiquetas de tipo (más oscuros)
  const TYPE_LABEL_COLORS = {
    INCOME: 'bg-green-600 dark:bg-green-500 text-white',
    EXPENSE: 'bg-red-600 dark:bg-red-500 text-white',
    TRANSFER: 'bg-blue-600 dark:bg-blue-500 text-white',
    PAY_DEBT: 'bg-purple-600 dark:bg-purple-500 text-white',
    PAY_CREDIT_CARD: 'bg-orange-600 dark:bg-orange-500 text-white',
    SAVE_FOR_GOAL: 'bg-green-800 dark:bg-green-600 text-white',
    RECEIVE_DEBT_PAYMENT: 'bg-emerald-600 dark:bg-emerald-500 text-white',
  };

  // Colores para botones de filtro
  const FILTER_BUTTON_COLORS = {
    ALL: 'bg-gray-600 dark:bg-gray-500 text-white',
    INCOME: 'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600',
    EXPENSE: 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600',
    TRANSFER: 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600',
    PAY_DEBT: 'bg-purple-600 dark:bg-purple-500 text-white hover:bg-purple-700 dark:hover:bg-purple-600',
    PAY_CREDIT_CARD: 'bg-orange-600 dark:bg-orange-500 text-white hover:bg-orange-700 dark:hover:bg-orange-600',
    SAVE_FOR_GOAL: 'bg-green-800 dark:bg-green-600 text-white hover:bg-green-900 dark:hover:bg-green-700',
    RECEIVE_DEBT_PAYMENT: 'bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600',
  };

  const getFilterButtonClass = (type: string) => {
    if (filterType === type) {
      return FILTER_BUTTON_COLORS[type as keyof typeof FILTER_BUTTON_COLORS] || FILTER_BUTTON_COLORS.ALL;
    }
    return 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700';
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; transactionId: string | null }>({
    isOpen: false,
    transactionId: null,
  });
  const [editTransactionConfirm, setEditTransactionConfirm] = useState<{ isOpen: boolean; transaction: Transaction | null }>({
    isOpen: false,
    transaction: null,
  });
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const { user: authUser } = useAuth();
  const user = useStore((state) => state.user) || authUser;
  const transactions = useStore((state) => state.transactions);
  const accounts = useStore((state) => state.accounts);
  const categories = useStore((state) => state.categories);
  const debts = useStore((state) => state.debts);
  const goals = useStore((state) => state.goals);
  const removeTransaction = useStore((state) => state.removeTransaction);
  const updateAccountInStore = useStore((state) => state.updateAccount);
  const updateDebtInStore = useStore((state) => state.updateDebt);
  const updateGoalInStore = useStore((state) => state.updateGoal);

  const handleDelete = async (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    try {
      await deleteTransactionAtomic(transactionId);

      // Update local store for accounts, debts/goals
      if (transaction.type === 'EXPENSE' && transaction.accountId) {
        const account = accounts.find(a => a.id === transaction.accountId);
        if (account) {
          updateAccountInStore(account.id, { balance: account.balance + transaction.amount });
        }
      } else if (transaction.type === 'INCOME' && transaction.accountId) {
        const account = accounts.find(a => a.id === transaction.accountId);
        if (account) {
          updateAccountInStore(account.id, { balance: account.balance - transaction.amount });
        }
      } else if (transaction.type === 'TRANSFER') {
        if (transaction.fromAccountId) {
          const fromAccount = accounts.find(a => a.id === transaction.fromAccountId);
          if (fromAccount) {
            updateAccountInStore(fromAccount.id, { balance: fromAccount.balance + transaction.amount });
          }
        }
        if (transaction.accountId) {
          const toAccount = accounts.find(a => a.id === transaction.accountId);
          if (toAccount) {
            const amountToRevert = transaction.convertedAmount || transaction.amount;
            updateAccountInStore(toAccount.id, { balance: toAccount.balance - amountToRevert });
          }
        }
      } else if (transaction.type === 'PAY_DEBT' && transaction.accountId) {
        const account = accounts.find(a => a.id === transaction.accountId);
        if (account) {
          updateAccountInStore(account.id, { balance: account.balance + transaction.amount });
        }
        const debt = debts.find(d => d.id === transaction.debtId && !d.isCreditCard);
        if (debt) {
          const newPaidAmount = Math.max(0, Math.round(((debt.paidAmount || 0) - transaction.amount) * 100) / 100);
          updateDebtInStore(debt.id, { paidAmount: newPaidAmount });
        }
      } else if (transaction.type === 'PAY_CREDIT_CARD' && transaction.accountId) {
        const account = accounts.find(a => a.id === transaction.accountId);
        if (account) {
          updateAccountInStore(account.id, { balance: account.balance + transaction.amount });
        }
        const creditCard = debts.find(d => d.id === transaction.debtId && d.isCreditCard);
        if (creditCard) {
          const newPaidAmount = Math.max(0, Math.round(((creditCard.paidAmount || 0) - transaction.amount) * 100) / 100);
          updateDebtInStore(creditCard.id, { paidAmount: newPaidAmount });
        }
      } else if (transaction.type === 'SAVE_FOR_GOAL' && transaction.accountId) {
        const account = accounts.find(a => a.id === transaction.accountId);
        if (account) {
          updateAccountInStore(account.id, { balance: account.balance + transaction.amount });
        }
        const goal = goals.find(g => g.id === transaction.goalId);
        if (goal) {
          const newCurrentAmount = goal.currentAmount - transaction.amount;
          updateGoalInStore(goal.id, { currentAmount: newCurrentAmount });
        }
      } else if (transaction.type === 'RECEIVE_DEBT_PAYMENT' && transaction.accountId) {
        const account = accounts.find(a => a.id === transaction.accountId);
        if (account) {
          updateAccountInStore(account.id, { balance: account.balance - transaction.amount });
        }
        const debt = debts.find(d => d.id === transaction.debtId && d.isLent);
        if (debt) {
          const newPaidAmount = Math.max(0, Math.round(((debt.paidAmount || 0) - transaction.amount) * 100) / 100);
          updateDebtInStore(debt.id, { paidAmount: newPaidAmount });
        }
      }

      removeTransaction(transactionId);
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      alert(`Error al eliminar la transacción: ${error.message || "Error desconocido"}`);
    }
  };

  const getAccountName = (id: string) => {
    const account = accounts.find(a => a.id === id);
    if (account) return account.name;
    const debt = debts.find(d => d.id === id);
    if (debt) {
      return debt.isCreditCard ? `${debt.name} (Tarjeta de Crédito)` : debt.name;
    }
    return 'Cuenta desconocida';
  };

  const getDebtName = (id: string) => {
    return debts.find(d => d.id === id)?.name || 'Deuda desconocida';
  };

  const getGoalName = (id: string) => {
    return goals.find(g => g.id === id)?.name || 'Meta desconocida';
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INCOME': return 'Ingreso';
      case 'EXPENSE': return 'Gasto';
      case 'TRANSFER': return 'Transferencia';
      case 'PAY_DEBT': return 'Pago Deuda';
      case 'PAY_CREDIT_CARD': return 'Pago Tarjeta Crédito';
      case 'SAVE_FOR_GOAL': return 'Ahorro Meta';
      case 'RECEIVE_DEBT_PAYMENT': return 'Cobro Préstamo';
      default: return type;
    }
  };

  const monthLabels = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const availableYears = ['ALL', ...[...new Set(transactions.map(tx => tx.date.getFullYear().toString()))].sort()];

  const availableMonths = ['ALL'];
  if (selectedYear === 'ALL') {
    const monthsSet = new Set(transactions.map(tx => tx.date.getMonth().toString()));
    availableMonths.push(...Array.from(monthsSet).sort((a, b) => parseInt(a) - parseInt(b)));
  } else {
    const yearNum = parseInt(selectedYear);
    const monthsSet = new Set(transactions.filter(tx => tx.date.getFullYear() === yearNum).map(tx => tx.date.getMonth().toString()));
    availableMonths.push(...Array.from(monthsSet).sort((a, b) => parseInt(a) - parseInt(b)));
  }

  const filteredTransactions = transactions.filter(tx => {
    const matchesType = filterType === 'ALL' || tx.type === filterType;
    const matchesMonth = selectedMonth === 'ALL' || tx.createdAt.getMonth() === parseInt(selectedMonth);
    const matchesYear = selectedYear === 'ALL' || tx.createdAt.getFullYear() === parseInt(selectedYear);
    return matchesType && matchesMonth && matchesYear;
  });

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Flujo de Caja</h1>
          <p className="text-muted-foreground">Historial de ingresos y gastos</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} data-testid="new-transaction-button">
          <Plus className="mr-2 h-4 w-4" /> Nueva Transacción
        </Button>
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap justify-between">
          <div className="flex flex-wrap items-end gap-2">
            <Button className={getFilterButtonClass('ALL')} onClick={() => setFilterType('ALL')}>Todos</Button>
            <Button className={getFilterButtonClass('INCOME')} onClick={() => setFilterType('INCOME')}>Ingresos</Button>
            <Button className={getFilterButtonClass('EXPENSE')} onClick={() => setFilterType('EXPENSE')}>Gastos</Button>
            <Button className={getFilterButtonClass('TRANSFER')} onClick={() => setFilterType('TRANSFER')}>Transferencias</Button>
            <Button className={getFilterButtonClass('PAY_DEBT')} onClick={() => setFilterType('PAY_DEBT')}>Pago Deudas</Button>
            <Button className={getFilterButtonClass('PAY_CREDIT_CARD')} onClick={() => setFilterType('PAY_CREDIT_CARD')}>Pago TC</Button>
            <Button className={getFilterButtonClass('SAVE_FOR_GOAL')} onClick={() => setFilterType('SAVE_FOR_GOAL')}>Ahorro Meta</Button>
            <Button className={getFilterButtonClass('RECEIVE_DEBT_PAYMENT')} onClick={() => setFilterType('RECEIVE_DEBT_PAYMENT')}>Cobro Préstamo</Button>
          </div>
          <div className="flex gap-2">
            <div className="">
              <label className="block text-sm font-medium mb-1">Mes</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m === 'ALL' ? 'Todos' : monthLabels[parseInt(m)]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Año</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y === 'ALL' ? 'Todos' : y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {filterType === 'ALL' ? 'No hay transacciones registradas.' : 'No hay transacciones de este tipo.'}
              </p>
            ) : (
              filteredTransactions.map((tx) => {
                const getTransactionIcon = () => {
                  if (tx.type === 'TRANSFER') {
                    return <ArrowRightLeft className="h-5 w-5" />;
                  }
                  if (tx.type === 'PAY_DEBT') {
                    return <HandCoins className="h-5 w-5" />;
                  }
                  if (tx.type === 'PAY_CREDIT_CARD') {
                    return <CreditCard className="h-5 w-5" />;
                  }
                  if (tx.type === 'SAVE_FOR_GOAL') {
                    return <Sprout className="h-5 w-5" />;
                  }
                  if (tx.type === 'RECEIVE_DEBT_PAYMENT') {
                    return (
                      <div className="relative">
                        <Banknote className="h-5 w-5" />
                        <ArrowDownLeft className="h-3 w-3 absolute -bottom-1 -right-1 bg-white rounded-full text-green-600" />
                      </div>
                    );
                  }
                  return tx.type === 'INCOME' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />;
                };

                const getTransactionColor = () => {
                  if (tx.type === 'TRANSFER') return 'bg-blue-200/50 dark:bg-blue-700/50 text-blue-700 dark:text-blue-300';
                  if (tx.type === 'PAY_DEBT') return 'bg-purple-200/50 dark:bg-purple-700/50 text-purple-700 dark:text-purple-300';
                  if (tx.type === 'PAY_CREDIT_CARD') return 'bg-orange-200/50 dark:bg-orange-700/50 text-orange-700 dark:text-orange-300';
                  if (tx.type === 'SAVE_FOR_GOAL') return 'bg-green-800/50 dark:bg-green-600/50 text-green-900 dark:text-green-200';
                  if (tx.type === 'RECEIVE_DEBT_PAYMENT') return 'bg-emerald-200/50 dark:bg-emerald-700/50 text-emerald-700 dark:text-emerald-300';
                  if (tx.type === 'INCOME') return 'bg-green-200/50 dark:bg-green-700/50 text-green-700 dark:text-green-300';
                  return 'bg-red-200/50 dark:bg-red-700/50 text-red-700 dark:text-red-300';
                };

                const getAccountInfo = () => {
                  if (tx.type === 'TRANSFER' && tx.fromAccountId) {
                    const fromAcc = accounts.find(a => a.id === tx.fromAccountId);
                    const toAcc = accounts.find(a => a.id === tx.accountId);
                    return `${fromAcc?.name || '?'} → ${toAcc?.name || '?'}`;
                  }
                  return getAccountName(tx.accountId);
                };

                const getAmountDisplay = () => {
                  const account = accounts.find(a => a.id === tx.accountId);
                  const symbol = account?.currency === 'USD' ? '$' : 'S/';
                  
                  if (tx.type === 'TRANSFER' && tx.fromAccountId) {
                      const fromAccount = accounts.find(a => a.id === tx.fromAccountId);
                      const toAccount = accounts.find(a => a.id === tx.accountId);
                      
                      if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency) {
                          const fromSymbol = fromAccount.currency === 'USD' ? '$' : 'S/';
                          const toSymbol = toAccount.currency === 'USD' ? '$' : 'S/';
                          const converted = tx.convertedAmount || tx.amount;
                          return (
                            <span className="text-xs block text-right">
                              {fromSymbol} {tx.amount.toFixed(2)} <br/>
                              ↓ <br/>
                              {toSymbol} {converted.toFixed(2)}
                            </span>
                          );
                      }
                  }
                  
                  return `${symbol} ${tx.amount.toFixed(2)}`;
                };

                return (
                  <div key={tx.id} className={`relative overflow-hidden flex items-center justify-between p-4 border rounded-lg transition-colors ${TRANSACTION_COLORS[tx.type]}`} data-testid={`transaction-${tx.description}`}>
                    {/* Etiqueta de tipo en esquina superior izquierda */}
                    <div className={`absolute top-0 left-0 px-2 py-1 rounded-br-lg text-xs font-medium ${TYPE_LABEL_COLORS[tx.type]}`}>
                      {getTypeLabel(tx.type)}
                    </div>

                    <div className="flex items-center gap-4 flex-1 my-2">
                      <div className={`p-2 rounded-full ${getTransactionColor()}`}>
                        {getTransactionIcon()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(tx.date), 'dd/MM/yyyy')} • {getAccountInfo()}
                        </p>
                        {tx.categoryId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {(() => {
                              const allCategories = [...TRANSACTION_CATEGORIES, ...INCOME_SOURCES, ...categories];
                              const category = allCategories.find(c => c.id === tx.categoryId);
                              return category ? (
                                <span className="flex items-center gap-1">
                                  {category.icon} {category.name}
                                </span>
                              ) : (
                                <span className="text-red-400 italic">Categoría eliminada</span>
                              );
                            })()}
                          </p>
                        )}
                        {tx.type === 'PAY_DEBT' && tx.debtId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Deuda: {getDebtName(tx.debtId)}
                          </p>
                        )}
                        {tx.type === 'RECEIVE_DEBT_PAYMENT' && tx.debtId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Préstamo: {getDebtName(tx.debtId)}
                          </p>
                        )}
                        {tx.type === 'SAVE_FOR_GOAL' && tx.goalId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Meta: {getGoalName(tx.goalId)}
                          </p>
                        )}
                        {tx.type === 'TRANSFER' && tx.exchangeRate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Tasa de cambio: {tx.exchangeRate}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`font-bold text-right ${
                        tx.type === 'TRANSFER' ? 'text-blue-800 dark:text-blue-200' :
                        tx.type === 'PAY_DEBT' ? 'text-purple-800 dark:text-purple-200' :
                        tx.type === 'PAY_CREDIT_CARD' ? 'text-orange-800 dark:text-orange-200' :
                        tx.type === 'SAVE_FOR_GOAL' ? 'text-amber-800 dark:text-amber-200' :
                        tx.type === 'RECEIVE_DEBT_PAYMENT' ? 'text-emerald-800 dark:text-emerald-200' :
                        tx.type === 'INCOME' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                      }`}>
                        <div className="flex items-center gap-1">
                          <span>{tx.type === 'TRANSFER' ? '↔' : (tx.type === 'INCOME' || tx.type === 'RECEIVE_DEBT_PAYMENT') ? '+' : '-'}</span>
                          {getAmountDisplay()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900"
                        onClick={() => setEditTransactionConfirm({ isOpen: true, transaction: tx })}
                        data-testid={`edit-transaction-${tx.description}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900"
                        onClick={() => setDeleteConfirm({ isOpen: true, transactionId: tx.id })}
                        disabled={deletingIds.includes(tx.id)}
                        data-testid={`delete-transaction-${tx.description}`}
                      >
                        {deletingIds.includes(tx.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen || !!editingTransaction}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        title={editingTransaction ? "Editar Transacción" : "Nueva Transacción"}
      >
        <TransactionForm 
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
          }} 
          transaction={editingTransaction || undefined}
        />
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, transactionId: null })}
        onConfirm={async () => {
          if (deleteConfirm.transactionId) {
            setDeletingIds(prev => [...prev, deleteConfirm.transactionId!]);
            try {
              await handleDelete(deleteConfirm.transactionId);
            } finally {
              setDeletingIds(prev => prev.filter(id => id !== deleteConfirm.transactionId));
            }
          }
          setDeleteConfirm({ isOpen: false, transactionId: null });
        }}
        title="Eliminar Transacción"
        message="⚠️ Cuidado: Esta acción debería ser automática y no deberías editarla manualmente, el dinero regresara a la cuenta de origen, y si hay cuenta de destino también se vera afectada. Los balances de las cuentas podrían desincronizarse. ¿Estás seguro?"
        confirmText="Eliminar"
        isDestructive={true}
      />

      <ConfirmDialog
        isOpen={editTransactionConfirm.isOpen}
        onClose={() => setEditTransactionConfirm({ isOpen: false, transaction: null })}
        onConfirm={() => {
          if (editTransactionConfirm.transaction) {
            setEditingTransaction(editTransactionConfirm.transaction);
          }
        }}
        title="Editar Transacción"
        message="⚠️ Cuidado: Esta acción debería ser automática y no deberías editarla manualmente. Editar transacciones puede afectar los balances de tus cuentas. ¿Continuar?"
        confirmText="Editar"
        isDestructive={false}
      />
    </Layout>
  );
}