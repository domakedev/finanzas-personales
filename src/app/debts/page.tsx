"use client"

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DebtForm } from '@/components/forms/DebtForm';
import { CreditCardForm } from '@/components/forms/CreditCardForm';
import { LoadingFinance } from '@/components/ui/LoadingFinance';
import { useStore } from '@/lib/store';
import { deleteDebt, getTransactions } from '@/lib/db';
import { Plus, AlertCircle, Trash2, Pencil, Loader2, Eye, ArrowUpRight, ArrowDownLeft, Sprout, HandCoins, ArrowRightLeft, CreditCard, Banknote } from 'lucide-react';
import { Debt, Transaction } from '@/types';
import { format } from 'date-fns';
import { TRANSACTION_CATEGORIES, INCOME_SOURCES } from '@/constants/categories';

export default function DebtsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLentModalOpen, setIsLentModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; debtId: string | null }>({
    isOpen: false,
    debtId: null,
  });
  const [editConfirm, setEditConfirm] = useState<{ isOpen: boolean; debt: Debt | null }>({
    isOpen: false,
    debt: null,
  });
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [isCreditCardModalOpen, setIsCreditCardModalOpen] = useState(false);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const debts = useStore((state) => state.debts);
  const transactions = useStore((state) => state.transactions);
  const accounts = useStore((state) => state.accounts);
  const categories = useStore((state) => state.categories);
  const goals = useStore((state) => state.goals);
  const setDebts = useStore((state) => state.setDebts);
  const removeTransaction = useStore((state) => state.removeTransaction);

  // Separar deudas normales, tarjetas de crédito y préstamos (Me deben)
  const normalDebts = debts.filter(debt => !debt.isCreditCard && !debt.isLent);
  const creditCards = debts.filter(debt => debt.isCreditCard);
  const lentDebts = debts.filter(debt => debt.isLent);

  const handleDelete = async (debtId: string) => {
    try {
      await deleteDebt(debtId);
      setDebts(debts.filter(d => d.id !== debtId));
    } catch (error: any) {
      console.error("Error deleting debt:", error);
      alert(`Error al eliminar la deuda: ${error.message || "Error desconocido"}`);
    }
  };

  const getAccountName = (id: string) => {
    return accounts.find(a => a.id === id)?.name || debts.find(d => d.id === id)?.name || 'Cuenta desconocida';
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

  const filteredTransactions = selectedCardId ? transactions.filter(tx => tx.debtId === selectedCardId || tx.accountId === selectedCardId) : [];

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Deudas y Préstamos</h1>
          <p className="text-muted-foreground">Controla lo que debes y lo que te deben</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setIsModalOpen(true)} data-testid="new-debt-button">
            <Plus className="mr-2 h-4 w-4" /> Nueva Deuda
          </Button>
          <Button onClick={() => setIsLentModalOpen(true)} variant="secondary" data-testid="new-lent-button">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Préstamo (Me deben)
          </Button>
          <Button onClick={() => setIsCreditCardModalOpen(true)} variant="outline" data-testid="new-credit-card-button">
            <Plus className="mr-2 h-4 w-4" /> Agregar Tarjeta de Crédito
          </Button>
        </div>
      </div>

      {/* Tarjetas de Crédito */}
      {creditCards.length > 0 && (
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold">Tarjetas de Crédito</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {creditCards.map((debt) => {
              // Para tarjetas de crédito: mostrar uso del límite de crédito
              const creditLimit = debt.creditLimit || debt.totalAmount; // Fallback si no hay límite definido
              const usedCredit = debt.totalAmount - (debt.paidAmount || 0); // Crédito usado restante
              const availableCredit = creditLimit - usedCredit;
              const usagePercentage = (usedCredit / creditLimit) * 100;

              // Color de la barra según el uso
              const getUsageColor = () => {
                if (usagePercentage >= 90) return 'bg-red-500';
                if (usagePercentage >= 70) return 'bg-yellow-500';
                return 'bg-green-500';
              };

              // Calcular alerta basada en cutoffDate y paymentDate
              const getAlertColor = () => {
                const today = new Date();
                let alertDate = null;

                // Calcular próxima fecha de corte si existe
                if (debt.cutoffDate) {
                  const cutoffDay = debt.cutoffDate;
                  const currentYear = today.getFullYear();
                  const currentMonth = today.getMonth();

                  // Crear fecha de corte para este mes
                  let cutoffDate = new Date(currentYear, currentMonth, cutoffDay);

                  // Si ya pasó este mes, usar el próximo mes
                  if (cutoffDate < today) {
                    cutoffDate = new Date(currentYear, currentMonth + 1, cutoffDay);
                  }

                  alertDate = cutoffDate;
                }
                // Si no hay cutoffDate, usar paymentDate como fallback
                else if (debt.paymentDate) {
                  const paymentDay = debt.paymentDate;
                  const currentYear = today.getFullYear();
                  const currentMonth = today.getMonth();

                  // Crear fecha de pago para este mes
                  let paymentDate = new Date(currentYear, currentMonth, paymentDay);

                  // Si ya pasó este mes, usar el próximo mes
                  if (paymentDate < today) {
                    paymentDate = new Date(currentYear, currentMonth + 1, paymentDay);
                  }

                  alertDate = paymentDate;
                }

                if (!alertDate) return '';

                const daysUntilAlert = Math.ceil((alertDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                if (daysUntilAlert <= 3) return 'border-red-500 bg-red-50 dark:bg-red-900/20';
                if (daysUntilAlert <= 7) return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
                if (daysUntilAlert <= 14) return 'border-green-500 bg-green-50 dark:bg-green-900/20';
                return '';
              };

              return (
                <Card key={debt.id} data-testid={`credit-card-${debt.name}`} className={getAlertColor()}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {debt.logo && <img src={debt.logo} alt={debt.name} className="w-6 h-6" />}
                      {debt.icon && <span>{debt.icon}</span>}
                      {debt.name}
                      {debt.lastFourDigits && (
                        <span className="text-xs text-muted-foreground">
                          ****-{debt.lastFourDigits}
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-green-500 hover:text-green-700 hover:bg-green-50"
                        onClick={() => {
                          setSelectedCardId(debt.id);
                          setIsTransactionsModalOpen(true);
                        }}
                        data-testid={`view-history-credit-card-${debt.name}`}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          if (debt.isCreditCard) {
                            setEditingDebt(debt);
                            setIsCreditCardModalOpen(true);
                          } else {
                            setEditConfirm({ isOpen: true, debt });
                          }
                        }}
                        data-testid={`edit-credit-card-${debt.name}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteConfirm({ isOpen: true, debtId: debt.id })}
                        disabled={deletingIds.includes(debt.id)}
                        data-testid={`delete-credit-card-${debt.name}`}
                      >
                        {deletingIds.includes(debt.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {debt.currency === 'USD' ? '$' : 'S/'} {usedCredit.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Crédito usado de {debt.currency === 'USD' ? '$' : 'S/'} {creditLimit.toFixed(2)}
                    </p>                   

                    <div className="w-full bg-secondary/20 rounded-full h-2.5">
                      <div
                        className={`${getUsageColor()} h-2.5 rounded-full transition-all duration-500`}
                        style={{ width: `${usagePercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-right mt-1 text-muted-foreground">
                      {usagePercentage.toFixed(0)}%
                    </p>

                    {debt.cutoffDate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Día de corte: {debt.cutoffDate} de cada mes
                      </p>
                    )}
                    {debt.paymentDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Día de pago: {debt.paymentDate} de cada mes
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Me deben (Préstamos) */}
      {lentDebts.length > 0 && (
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold">Me deben (Préstamos)</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lentDebts.map((debt) => {
              const progress = ((debt.paidAmount || 0) / debt.totalAmount) * 100;
              const remaining = debt.totalAmount - (debt.paidAmount || 0);

              return (
                <Card key={debt.id} data-testid={`lent-${debt.name}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {debt.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          setEditingDebt(debt);
                          setIsLentModalOpen(true);
                        }}
                        data-testid={`edit-lent-${debt.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteConfirm({ isOpen: true, debtId: debt.id })}
                        disabled={deletingIds.includes(debt.id)}
                        data-testid={`delete-lent-${debt.name}`}
                      >
                        {deletingIds.includes(debt.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {debt.currency === 'USD' ? '$' : 'S/'} {remaining.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Me deben (Restante)
                    </p>

                    <div className="w-full bg-secondary/20 rounded-full h-2.5">
                      <div
                        className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-right mt-1 text-muted-foreground">
                      {progress.toFixed(0)}% Pagado
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Deudas Normales */}
      {normalDebts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Mis Deudas</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {normalDebts.map((debt) => {
              const progress = ((debt.paidAmount || 0) / debt.totalAmount) * 100;
              const remaining = debt.totalAmount - (debt.paidAmount || 0);

              return (
                <Card key={debt.id} data-testid={`debt-${debt.name}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {debt.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          setEditConfirm({ isOpen: true, debt });
                        }}
                        data-testid={`edit-debt-${debt.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteConfirm({ isOpen: true, debtId: debt.id })}
                        disabled={deletingIds.includes(debt.id)}
                        data-testid={`delete-debt-${debt.name}`}
                      >
                        {deletingIds.includes(debt.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {debt.currency === 'USD' ? '$' : 'S/'} {remaining.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Restante de {debt.currency === 'USD' ? '$' : 'S/'} {debt.totalAmount.toFixed(2)}
                    </p>

                    <div className="w-full bg-secondary/20 rounded-full h-2.5">
                      <div
                        className="bg-primary h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-right mt-1 text-muted-foreground">
                      {progress.toFixed(0)}% Pagado
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen || (editingDebt !== null && editingDebt.isCreditCard !== true && editingDebt.isLent !== true)}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDebt(null);
        }}
        title={editingDebt ? "Editar Deuda" : "Registrar Deuda"}
      >
        <DebtForm
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingDebt(null);
          }}
          debt={editingDebt || undefined}
        />
      </Modal>

      <Modal
        isOpen={isLentModalOpen || (editingDebt !== null && editingDebt.isLent === true)}
        onClose={() => {
          setIsLentModalOpen(false);
          setEditingDebt(null);
        }}
        title={editingDebt ? "Editar Préstamo" : "Registrar Préstamo (Me deben)"}
      >
        <DebtForm
          onSuccess={() => {
            setIsLentModalOpen(false);
            setEditingDebt(null);
          }}
          debt={editingDebt || undefined}
          isLent={true}
        />
      </Modal>

      <Modal
        isOpen={isCreditCardModalOpen || (editingDebt !== null && editingDebt.isCreditCard === true)}
        onClose={() => {
          setIsCreditCardModalOpen(false);
          setEditingDebt(null);
        }}
        title={editingDebt ? "Editar Tarjeta de Crédito" : "Agregar Tarjeta de Crédito"}
      >
        <CreditCardForm
          onSuccess={() => {
            setIsCreditCardModalOpen(false);
            setEditingDebt(null);
          }}
          debt={editingDebt || undefined}
        />
      </Modal>

      <Modal
        isOpen={isTransactionsModalOpen}
        onClose={() => {
          setIsTransactionsModalOpen(false);
          setSelectedCardId(null);
        }}
        title={`Historial de ${selectedCardId ? getDebtName(selectedCardId) : 'Tarjeta'}`}
      >
        <div className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay transacciones relacionadas.</p>
          ) : (
            filteredTransactions.map((tx) => {
              const isExpenseOnCard = tx.accountId === selectedCardId && tx.type === 'EXPENSE';
              const isPaymentOnCard = tx.debtId === selectedCardId && tx.type === 'PAY_CREDIT_CARD';

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
                if (isExpenseOnCard) return 'bg-red-200/50 dark:bg-red-700/50 text-red-700 dark:text-red-300';
                if (isPaymentOnCard) return 'bg-green-200/50 dark:bg-green-700/50 text-green-700 dark:text-green-300';
                if (tx.type === 'TRANSFER') return 'bg-blue-200/50 dark:bg-blue-700/50 text-blue-700 dark:text-blue-300';
                if (tx.type === 'PAY_DEBT') return 'bg-purple-200/50 dark:bg-purple-700/50 text-purple-700 dark:text-purple-300';
                if (tx.type === 'SAVE_FOR_GOAL') return 'bg-green-800/50 dark:bg-green-600/50 text-green-900 dark:text-green-200';
                if (tx.type === 'RECEIVE_DEBT_PAYMENT') return 'bg-emerald-200/50 dark:bg-emerald-700/50 text-emerald-700 dark:text-emerald-300';
                if (tx.type === 'INCOME') return 'bg-green-200/50 dark:bg-green-700/50 text-green-700 dark:text-green-300';
                return 'bg-red-200/50 dark:bg-red-700/50 text-red-700 dark:text-red-300';
              };

              const getBorderColor = () => {
                if (isExpenseOnCard) return 'border-red-200 dark:border-red-700';
                if (isPaymentOnCard) return 'border-green-200 dark:border-green-700';
                return 'border-green-200 dark:border-green-700';
              };

              const getTypeLabelColor = () => {
                if (isExpenseOnCard) return 'bg-red-600 dark:bg-red-500';
                if (isPaymentOnCard) return 'bg-green-600 dark:bg-green-500';
                return 'bg-green-600 dark:bg-green-500';
              };

              const getAmountColor = () => {
                if (isExpenseOnCard) return 'text-red-800 dark:text-red-200';
                if (isPaymentOnCard) return 'text-green-800 dark:text-green-200';
                return 'text-green-800 dark:text-green-200';
              };

              const getSign = () => {
                if (isExpenseOnCard) return '+';
                if (isPaymentOnCard) return '-';
                return tx.type === 'TRANSFER' ? '↔' : (tx.type === 'INCOME' || tx.type === 'RECEIVE_DEBT_PAYMENT') ? '+' : '-';
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
                <div key={tx.id} className={`relative overflow-hidden flex items-center justify-between p-4 border rounded-lg transition-colors ${getBorderColor()}`}>
                  <div className={`absolute top-0 left-0 px-2 py-1 rounded-br-lg text-xs font-medium ${getTypeLabelColor()} text-white`}>
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
                    <div className={`font-bold text-right ${getAmountColor()}`}>
                      <div className="flex items-center gap-1">
                        <span>{getSign()}</span>
                        {getAmountDisplay()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={editConfirm.isOpen}
        onClose={() => setEditConfirm({ isOpen: false, debt: null })}
        onConfirm={() => {
          if (editConfirm.debt) {
            setEditingDebt(editConfirm.debt);
          }
        }}
        title="Editar Deuda"
        message="⚠️ Cuidado: Esta acción debería ser automática y no deberías editarla manualmente. ¿Continuar?"
        confirmText="Editar"
        isDestructive={false}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, debtId: null })}
        onConfirm={async () => {
          if (deleteConfirm.debtId) {
            setDeletingIds(prev => [...prev, deleteConfirm.debtId!]);
            try {
              await handleDelete(deleteConfirm.debtId);
            } finally {
              setDeletingIds(prev => prev.filter(id => id !== deleteConfirm.debtId));
            }
          }
          setDeleteConfirm({ isOpen: false, debtId: null });
        }}
        title="Eliminar Deuda"
        message="⚠️ Cuidado: Esta acción debería ser automática y no deberías editarla manualmente. ¿Estás seguro de eliminar este registro de deuda?"
        confirmText="Eliminar"
        isDestructive={true}
      />
    </Layout>
  );
}
