"use client"

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GoalForm } from '@/components/forms/GoalForm';
import { SavingsTree } from '@/components/SavingsTree';
import { LoadingFinance } from '@/components/ui/LoadingFinance';
import { useStore } from '@/lib/store';
import { deleteGoal } from '@/lib/db';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Goal } from '@/types';
import { useLoadData } from '@/lib/useLoadData';

export default function GoalsPage() {
  const { isLoading } = useLoadData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; goalId: string | null }>({
    isOpen: false,
    goalId: null,
  });
  const [editConfirm, setEditConfirm] = useState<{ isOpen: boolean; goal: Goal | null }>({
    isOpen: false,
    goal: null,
  });
  const goals = useStore((state) => state.goals);
  const setGoals = useStore((state) => state.setGoals);

  const handleDelete = async (goalId: string) => {
    try {
      await deleteGoal(goalId);
      setGoals(goals.filter(g => g.id !== goalId));
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
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
          <h1 className="text-3xl font-bold">Metas de Ahorro</h1>
          <p className="text-muted-foreground">Visualiza y alcanza tus objetivos</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} data-testid="new-goal-button">
          <Plus className="mr-2 h-4 w-4" /> Nueva Meta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const percentage = (goal.currentAmount / goal.targetAmount) * 100;
          
          return (
            <Card key={goal.id} data-testid={`goal-${goal.name}`}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-center flex-1">{goal.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => setEditConfirm({ isOpen: true, goal })}
                    data-testid={`edit-goal-${goal.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteConfirm({ isOpen: true, goalId: goal.id })}
                    data-testid={`delete-goal-${goal.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <SavingsTree percentage={percentage} />
                <div className="mt-4 text-center w-full">
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span>{goal.currency === 'USD' ? '$' : 'S/'} {goal.currentAmount.toFixed(2)}</span>
                      <span className="text-muted-foreground">{goal.currency === 'USD' ? '$' : 'S/'} {goal.targetAmount.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-secondary/20 rounded-full h-2.5">
                    <div 
                      className="bg-green-500 h-2.5 rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={isModalOpen || editingGoal !== null}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGoal(null);
        }}
        title={editingGoal ? "Editar Meta" : "Nueva Meta de Ahorro"}
      >
        <GoalForm 
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingGoal(null);
          }} 
          goal={editingGoal || undefined}
        />
      </Modal>

      <ConfirmDialog
        isOpen={editConfirm.isOpen}
        onClose={() => setEditConfirm({ isOpen: false, goal: null })}
        onConfirm={() => {
          if (editConfirm.goal) {
            setEditingGoal(editConfirm.goal);
          }
        }}
        title="Editar Meta"
        message="⚠️ Cuidado: Esta acción debería ser automática y no deberías editarla manualmente. ¿Continuar?"
        confirmText="Editar"
        isDestructive={false}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, goalId: null })}
        onConfirm={() => deleteConfirm.goalId && handleDelete(deleteConfirm.goalId)}
        title="Eliminar Meta"
        message="⚠️ Cuidado: Esta acción debería ser automática y no deberías editarla manualmente. ¿Estás seguro de eliminar esta meta de ahorro?"
        confirmText="Eliminar"
        isDestructive={true}
      />
    </Layout>
  );
}
