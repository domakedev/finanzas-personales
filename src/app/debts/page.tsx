"use client"

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DebtForm } from '@/components/forms/DebtForm';
import { LoadingFinance } from '@/components/ui/LoadingFinance';
import { useStore } from '@/lib/store';
import { deleteDebt, getTransactions } from '@/lib/db';
import { Plus, AlertCircle, Trash2, Pencil, Loader2 } from 'lucide-react';
import { Debt } from '@/types';

export default function DebtsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const debts = useStore((state) => state.debts);
  const transactions = useStore((state) => state.transactions);
  const setDebts = useStore((state) => state.setDebts);
  const removeTransaction = useStore((state) => state.removeTransaction);

  const handleDelete = async (debtId: string) => {
    try {
      await deleteDebt(debtId);
      setDebts(debts.filter(d => d.id !== debtId));
    } catch (error: any) {
      console.error("Error deleting debt:", error);
      alert(`Error al eliminar la deuda: ${error.message || "Error desconocido"}`);
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Deudas y Créditos</h1>
          <p className="text-muted-foreground">Controla tus pagos pendientes</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} data-testid="new-debt-button">
          <Plus className="mr-2 h-4 w-4" /> Nueva Deuda
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {debts.map((debt) => {
          const progress = (debt.paidAmount / debt.totalAmount) * 100;
          const remaining = debt.totalAmount - debt.paidAmount;
          
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
                    onClick={() => setEditConfirm({ isOpen: true, debt })}
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

      <Modal
        isOpen={isModalOpen || editingDebt !== null}
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
