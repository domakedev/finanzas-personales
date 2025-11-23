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
import { Plus, ArrowUpRight, ArrowDownLeft, Trash2, Pencil, Loader2, PiggyBank, BanknoteArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { Transaction } from '@/types';
import { TRANSACTION_CATEGORIES, INCOME_SOURCES } from '@/constants/categories';

export default function TransactionsPage() {
  // Colores para diferentes tipos de transacción
  const TRANSACTION_COLORS = {
    INCOME: 'bg-green-50 border-green-200',
    EXPENSE: 'bg-red-50 border-red-200',
    TRANSFER: 'bg-blue-50 border-blue-200',
    PAY_DEBT: 'bg-purple-50 border-purple-200',
    SAVE_FOR_GOAL: 'bg-blue-50 border-blue-200',
  };

  // Colores para las etiquetas de tipo (más oscuros)
  const TYPE_LABEL_COLORS = {
    INCOME: 'bg-green-600 text-white',
    EXPENSE: 'bg-red-600 text-white',
    TRANSFER: 'bg-blue-600 text-white',
    PAY_DEBT: 'bg-purple-600 text-white',
    SAVE_FOR_GOAL: 'bg-blue-600 text-white',
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
    try {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) return;

      await deleteTransactionAtomic(transactionId);
      
      if (transaction.type === 'EXPENSE') {
        const account = accounts.find(a => a.id === transaction.accountId);
        if (account) {
          updateAccountInStore(account.id, { balance: account.balance + transaction.amount });
        }
      } else if (transaction.type === 'INCOME') {
        const account = accounts.find(a => a.id === transaction.accountId);
        if (account) {
          updateAccountInStore(account.id, { balance: account.balance - transaction.amount });
        }
      } else if (transaction.type === 'TRANSFER' && transaction.fromAccountId) {
        const fromAccount = accounts.find(a => a.id === transaction.fromAccountId);
        const toAccount = accounts.find(a => a.id === transaction.accountId);
        if (fromAccount && toAccount) {
          updateAccountInStore(fromAccount.id, { balance: fromAccount.balance + transaction.amount });
          const amountToRevert = transaction.convertedAmount || transaction.amount;
          updateAccountInStore(toAccount.id, { balance: toAccount.balance - amountToRevert });
        }
      } else if (transaction.type === 'PAY_DEBT') {
        // Revert account balance: add back the amount
        const account = accounts.find(a => a.id === transaction.accountId);
        if (account) {
          updateAccountInStore(account.id, { balance: account.balance + transaction.amount });
        }
        // Revert debt paidAmount: subtract the amount
        if (transaction.debtId) {
          const debt = debts.find(d => d.id === transaction.debtId);
          if (debt) {
            const newPaidAmount = debt.paidAmount - transaction.amount;
            updateDebtInStore(debt.id, { paidAmount: newPaidAmount });
          }
        }
      } else if (transaction.type === 'SAVE_FOR_GOAL') {
        // Revert account balance: add back the amount
        const account = accounts.find(a => a.id === transaction.accountId);
        if (account) {
          updateAccountInStore(account.id, { balance: account.balance + transaction.amount });
        }
        // Revert goal currentAmount: subtract the amount
        if (transaction.goalId) {
          const goal = goals.find(g => g.id === transaction.goalId);
          if (goal) {
            const newCurrentAmount = goal.currentAmount - transaction.amount;
            updateGoalInStore(goal.id, { currentAmount: newCurrentAmount });
          }
        }
      }

      removeTransaction(transactionId);
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      alert(`Error al eliminar la transacción: ${error.message || "Error desconocido"}`);
    }
  };

  const getAccountName = (id: string) => {
    return accounts.find(a => a.id === id)?.name || 'Cuenta desconocida';
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
      case 'SAVE_FOR_GOAL': return 'Ahorro Meta';
      default: return type;
    }
  };

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

      <Card>
        <CardHeader>
          <CardTitle>Historial Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay transacciones registradas.</p>
            ) : (
              transactions.map((tx) => {
                const getTransactionIcon = () => {
                  if (tx.type === 'TRANSFER') {
                    return <ArrowDownLeft className="h-5 w-5 rotate-90" />;
                  }
                  if (tx.type === 'PAY_DEBT') {
                    return <BanknoteArrowDown className="h-5 w-5" />;
                  }
                  if (tx.type === 'SAVE_FOR_GOAL') {
                    return <PiggyBank className="h-5 w-5" />;
                  }
                  return tx.type === 'INCOME' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />;
                };

                const getTransactionColor = () => {
                  if (tx.type === 'TRANSFER') return 'bg-blue-200/50 text-blue-700';
                  if (tx.type === 'PAY_DEBT') return 'bg-purple-200/50 text-purple-700';
                  if (tx.type === 'SAVE_FOR_GOAL') return 'bg-blue-200/50 text-blue-700';
                  if (tx.type === 'INCOME') return 'bg-green-200/50 text-green-700';
                  return 'bg-red-200/50 text-red-700';
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
                        tx.type === 'TRANSFER' ? 'text-blue-800' :
                        tx.type === 'PAY_DEBT' ? 'text-purple-800' :
                        tx.type === 'SAVE_FOR_GOAL' ? 'text-blue-800' :
                        tx.type === 'INCOME' ? 'text-green-800' : 'text-red-800'
                      }`}>
                        <div className="flex items-center gap-1">
                          <span>{tx.type === 'TRANSFER' ? '↔' : (tx.type === 'INCOME' || tx.type === 'PAY_DEBT' || tx.type === 'SAVE_FOR_GOAL') ? '+' : '-'}</span>
                          {getAmountDisplay()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setEditTransactionConfirm({ isOpen: true, transaction: tx })}
                        data-testid={`edit-transaction-${tx.description}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
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
        message="⚠️ Cuidado: Esta acción debería ser automática y no deberías editarla manualmente. Los balances de las cuentas podrían desincronizarse. ¿Estás seguro?"
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