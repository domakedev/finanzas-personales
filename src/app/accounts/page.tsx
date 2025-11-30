"use client"

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AccountForm } from '@/components/forms/AccountForm';
import { LoadingFinance } from '@/components/ui/LoadingFinance';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { deleteAccount } from '@/lib/db';
import { Plus, Wallet, Banknote, CreditCard, Trash2, Pencil, Loader2, Eye } from 'lucide-react';
import { Account } from '@/types';
export default function AccountsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; accountId: string | null }>({
    isOpen: false,
    accountId: null,
  });
  const [editConfirm, setEditConfirm] = useState<{ isOpen: boolean; account: Account | null }>({
    isOpen: false,
    account: null,
  });
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [editingIds, setEditingIds] = useState<string[]>([]);
  const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; account: Account | null }>({
    isOpen: false,
    account: null,
  });
  const accounts = useStore((state) => state.accounts);
  console.log(accounts);
  const transactions = useStore((state) => state.transactions);
  const debts = useStore((state) => state.debts);
  const removeAccount = useStore((state) => state.removeAccount);

  const handleDelete = async (accountId: string) => {
    try {
      // Check if account has transactions
      const hasTransactions = transactions.some(
        t => t.accountId === accountId || t.fromAccountId === accountId
      );
      
      if (hasTransactions) {
        setError("No se puede eliminar esta cuenta porque tiene transacciones asociadas. Elimina las transacciones primero.");
        return;
      }

      await deleteAccount(accountId);
      removeAccount(accountId);
    } catch (error) {
      console.error("Error deleting account:", error);
      setError("Error al eliminar la cuenta. Inténtalo de nuevo.");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'BANK': return <CreditCard className="h-5 w-5" />;
      case 'WALLET': return <Wallet className="h-5 w-5" />;
      case 'CASH': return <Banknote className="h-5 w-5" />;
      default: return <Wallet className="h-5 w-5" />;
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Mis Cuentas</h1>
          <p className="text-muted-foreground">Gestiona tus bancos y billeteras</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} data-testid="new-account-button">
          <Plus className="mr-2 h-4 w-4" /> Nueva Cuenta
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>✕</Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="accounts-grid">
        {accounts.map((account) => (
          <Card key={account.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2" data-testid={`account-name-${account.name}`}>
                {getIcon(account.type)} {account.name} ({account.currency})
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-green-500 hover:text-green-700 hover:bg-green-50"
                  onClick={() => setHistoryModal({ isOpen: true, account })}
                  data-testid={`view-history-account-${account.name}`}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => setEditConfirm({ isOpen: true, account })}
                  data-testid={`edit-account-${account.name}`}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setDeleteConfirm({ isOpen: true, accountId: account.id })}
                  disabled={deletingIds.includes(account.id)}
                  data-testid={`delete-account-${account.name}`}
                >
                  {deletingIds.includes(account.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent onClick={() => setHistoryModal({ isOpen: true, account })}>
              <div className="flex items-center space-x-2 mb-2">
                {account.logo ? (
                  <Image src={account.logo} alt={account.name} width={24} height={24} className="object-contain" />
                ) : (
                  getIcon(account.type)
                )}
                <div className="text-2xl font-bold">
                  {account.currency === 'USD' ? '$' : 'S/'} {account.balance.toFixed(2)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {account.type === 'BANK' ? 'Cuenta Bancaria' : 
                 account.type === 'WALLET' ? 'Billetera Digital' : 'Efectivo'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen || editingAccount !== null}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAccount(null);
        }}
        title={editingAccount ? "Editar Cuenta" : "Nueva Cuenta"}
      >
        <AccountForm 
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingAccount(null);
          }} 
          account={editingAccount || undefined}
        />
      </Modal>

      <ConfirmDialog
        isOpen={editConfirm.isOpen}
        onClose={() => setEditConfirm({ isOpen: false, account: null })}
        onConfirm={() => {
          if (editConfirm.account) {
            setEditingAccount(editConfirm.account);
          }
        }}
        title="Editar Cuenta"
        message="⚠️ Cuidado: Esta acción debería ser automática y no deberías editarla manualmente. Editar balances puede afectar tus transacciones. ¿Continuar?"
        confirmText="Editar"
        isDestructive={false}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => {
          setDeleteConfirm({ isOpen: false, accountId: null });
          setError(null);
        }}
        onConfirm={async () => {
          if (deleteConfirm.accountId) {
            setDeletingIds(prev => [...prev, deleteConfirm.accountId!]);
            try {
              await handleDelete(deleteConfirm.accountId);
            } finally {
              setDeletingIds(prev => prev.filter(id => id !== deleteConfirm.accountId));
            }
          }
          setDeleteConfirm({ isOpen: false, accountId: null });
        }}
        title="Eliminar Cuenta"
        message="⚠️ Cuidado: Esta acción debería ser automática y no deberías editarla manualmente. Eliminar esta cuenta puede afectar tus transacciones existentes. ¿Estás seguro?"
        confirmText="Eliminar"
        isDestructive={true}
      />

      {/* Modal de Historial de Transacciones */}
      <Modal
        isOpen={historyModal.isOpen}
        onClose={() => setHistoryModal({ isOpen: false, account: null })}
        title={`Historial - ${historyModal.account?.name || ''}`}
      >
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Balance Actual</span>
              <span className="text-2xl font-bold">
                {historyModal.account?.currency === 'USD' ? '$' : 'S/'} {historyModal.account?.balance.toFixed(2)}
              </span>
            </div>
            {historyModal.account && (() => {
              const accountTransactions = transactions
                .filter(t => t.accountId === historyModal.account!.id || t.fromAccountId === historyModal.account!.id)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              
              const firstTransaction = accountTransactions[0];
              const creationDate = firstTransaction ? new Date(firstTransaction.date) : null;
              
              return creationDate && (
                <p className="text-xs text-muted-foreground">
                  Cuenta desde: {creationDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              );
            })()}
          </div>

          <div>
            <h3 className="font-semibold mb-3">Transacciones</h3>
            {historyModal.account && (() => {
              const accountTransactions = transactions
                .filter(t => t.accountId === historyModal.account!.id || t.fromAccountId === historyModal.account!.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              if (accountTransactions.length === 0) {
                return <p className="text-center text-muted-foreground py-8">No hay transacciones en esta cuenta.</p>;
              }

              // Agrupar por semana
              const groupedByWeek: { [key: string]: typeof accountTransactions } = {};
              accountTransactions.forEach(tx => {
                const txDate = new Date(tx.createdAt);
                const startOfWeek = new Date(txDate);
                startOfWeek.setDate(txDate.getDate() - txDate.getDay()); // Domingo de esa semana
                const weekKey = startOfWeek.toISOString().split('T')[0];
                
                if (!groupedByWeek[weekKey]) {
                  groupedByWeek[weekKey] = [];
                }
                groupedByWeek[weekKey].push(tx);
              });

              return (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(groupedByWeek)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .map(([weekStart, weekTransactions]) => {
                      const startDate = new Date(weekStart);
                      const endDate = new Date(startDate);
                      endDate.setDate(startDate.getDate() + 6);
                      
                      const weekTotal = weekTransactions.reduce((sum, tx) => {
                        const isIncoming = tx.type === 'TRANSFER' ? tx.accountId === historyModal.account!.id : (tx.type === 'INCOME' || tx.type === 'RECEIVE_DEBT_PAYMENT');
                        return sum + (isIncoming ? tx.amount : -tx.amount);
                      }, 0);

                      return (
                        <div key={weekStart} className="space-y-2">
                          <div className="sticky top-0 bg-background py-2 border-b flex justify-between items-center">
                            <h4 className="text-sm font-semibold text-muted-foreground">
                              {startDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} - {endDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </h4>
                            <span className={`text-sm font-semibold ${weekTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {weekTotal >= 0 ? '+' : ''}{historyModal.account!.currency === 'USD' ? '$' : 'S/'} {Math.abs(weekTotal).toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            {weekTransactions.map((tx) => {
                              const isIncoming = tx.type === 'TRANSFER' ? tx.accountId === historyModal.account!.id : (tx.type === 'INCOME' || tx.type === 'RECEIVE_DEBT_PAYMENT');

                              return (
                                <div key={tx.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-accent/30 transition-colors">
                                  <div className="flex-1">
                                    <p className="font-medium">{tx.description}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(tx.createdAt).toLocaleDateString('es-PE')} • {
                                        tx.type === 'INCOME' ? '💰 Ingreso' :
                                        tx.type === 'EXPENSE' ? '💸 Gasto' :
                                        tx.type === 'TRANSFER' ? '🔄 Transferencia' :
                                        tx.type === 'PAY_DEBT' ? `💳 Pago: ${debts.find(d => d.id === tx.debtId)?.name || 'Deuda'}` :
                                        tx.type === 'PAY_CREDIT_CARD' ? `💳 Pago TC: ${debts.find(d => d.id === tx.debtId)?.name || 'Tarjeta'}` :
                                        tx.type === 'RECEIVE_DEBT_PAYMENT' ? `💵 Cobro: ${debts.find(d => d.id === tx.debtId)?.name || 'Préstamo'}` :
                                        tx.type === 'SAVE_FOR_GOAL' ? '🌱 Ahorro Meta' :
                                        tx.type
                                      }
                                    </p>
                                  </div>
                                  <div className={`font-bold ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                                    {isIncoming ? '+' : '-'} {historyModal.account!.currency === 'USD' ? '$' : 'S/'} {tx.amount.toFixed(2)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })()}
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
