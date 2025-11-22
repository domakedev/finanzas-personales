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
import { deleteTransaction, updateAccount } from '@/lib/db';
import { Plus, ArrowUpRight, ArrowDownLeft, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useLoadData } from '@/lib/useLoadData';

export default function TransactionsPage() {
  const { isLoading } = useLoadData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; transactionId: string | null }>({
    isOpen: false,
    transactionId: null,
  });
  const transactions = useStore((state) => state.transactions);
  const accounts = useStore((state) => state.accounts);
  const removeTransaction = useStore((state) => state.setTransactions);
  const updateAccountInStore = useStore((state) => state.updateAccount);

  const handleDelete = async (transactionId: string) => {
    try {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) return;

      if (transaction.type === 'EXPENSE') {
        const account = accounts.find(a => a.id === transaction.accountId);
        if (account) {
          const newBalance = account.balance + transaction.amount;
          updateAccountInStore(account.id, { balance: newBalance });
          await updateAccount(account.id, { balance: newBalance });
        }
      } else if (transaction.type === 'INCOME') {
        const account = accounts.find(a => a.id === transaction.accountId);
        if (account) {
          const newBalance = account.balance - transaction.amount;
          updateAccountInStore(account.id, { balance: newBalance });
          await updateAccount(account.id, { balance: newBalance });
        }
      } else if (transaction.type === 'TRANSFER' && transaction.fromAccountId) {
        const fromAccount = accounts.find(a => a.id === transaction.fromAccountId);
        const toAccount = accounts.find(a => a.id === transaction.accountId);
        if (fromAccount && toAccount) {
          const newFromBalance = fromAccount.balance + transaction.amount;
          const newToBalance = toAccount.balance - transaction.amount;
          updateAccountInStore(fromAccount.id, { balance: newFromBalance });
          updateAccountInStore(toAccount.id, { balance: newToBalance });
          await updateAccount(fromAccount.id, { balance: newFromBalance });
          await updateAccount(toAccount.id, { balance: newToBalance });
        }
      }

      await deleteTransaction(transactionId);
      removeTransaction(transactions.filter(t => t.id !== transactionId));
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  const getAccountName = (id: string) => {
    return accounts.find(a => a.id === id)?.name || 'Cuenta desconocida';
  };

  if (isLoading) {
    return (
      <Layout>
        <LoadingFinance />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Flujo de Caja</h1>
          <p className="text-muted-foreground">Historial de ingresos y gastos</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
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
                  return tx.type === 'INCOME' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />;
                };

                const getTransactionColor = () => {
                  if (tx.type === 'TRANSFER') return 'bg-blue-100 text-blue-600';
                  return tx.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
                };

                const getAccountInfo = () => {
                  if (tx.type === 'TRANSFER' && tx.fromAccountId) {
                    const fromAcc = accounts.find(a => a.id === tx.fromAccountId);
                    const toAcc = accounts.find(a => a.id === tx.accountId);
                    return `${fromAcc?.name || '?'} → ${toAcc?.name || '?'}`;
                  }
                  return getAccountName(tx.accountId);
                };

                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-2 rounded-full ${getTransactionColor()}`}>
                        {getTransactionIcon()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(tx.date), 'dd/MM/yyyy')} • {getAccountInfo()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`font-bold ${
                        tx.type === 'TRANSFER' ? 'text-blue-600' :
                        tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.type === 'TRANSFER' ? '↔' : tx.type === 'INCOME' ? '+' : '-'} S/ {tx.amount.toFixed(2)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteConfirm({ isOpen: true, transactionId: tx.id })}
                      >
                        <Trash2 className="h-4 w-4" />
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
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Transacción"
      >
        <TransactionForm onSuccess={() => setIsModalOpen(false)} />
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, transactionId: null })}
        onConfirm={() => deleteConfirm.transactionId && handleDelete(deleteConfirm.transactionId)}
        title="Eliminar Transacción"
        message="⚠️ Cuidado: Esta acción debería ser automática y no deberías editarla manualmente. Los balances de las cuentas podrían desincronizarse. ¿Estás seguro?"
        confirmText="Eliminar"
        isDestructive={true}
      />
    </Layout>
  );
}