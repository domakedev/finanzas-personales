"use client"

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { addCategory, updateCategory, deleteCategory } from '@/lib/db';
import { Category } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Loader2, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';

const CategorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  icon: z.string().min(1, "El icono es requerido"), // We can use emoji picker or simple text for now
  type: z.enum(['EXPENSE', 'INCOME']),
});

type CategoryFormData = z.infer<typeof CategorySchema>;

export default function CategoriesPage() {
  const { user } = useAuth();
  const { categories, addCategory: addCategoryToStore, updateCategory: updateCategoryInStore, removeCategory: removeCategoryFromStore } = useStore();
  const [isLoading, setIsLoading] = useState(false); // Categories are loaded by DataLoader
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; categoryId: string | null }>({
    isOpen: false,
    categoryId: null,
  });
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<CategoryFormData>({
    resolver: zodResolver(CategorySchema),
    defaultValues: {
      type: 'EXPENSE',
      icon: '🏷️'
    }
  });

  // No need to load categories here, DataLoader does it.

  const onSubmit = async (data: CategoryFormData) => {
    if (!user) return;
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, data);
        updateCategoryInStore(editingCategory.id, data);
      } else {
        const docRef = await addCategory(user.uid, data);
        const newCategory: Category = {
          id: docRef.id,
          userId: user.uid,
          ...data
        };
        addCategoryToStore(newCategory);
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving category:", error);
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId);
      removeCategoryFromStore(categoryId);
      setDeleteConfirm({ isOpen: false, categoryId: null });
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setValue('name', category.name);
    setValue('icon', category.icon);
    setValue('type', category.type);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    reset({ type: 'EXPENSE', icon: '🏷️' });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Categorías Personalizadas</h1>
            <p className="text-muted-foreground">Gestiona tus propias categorías de gastos e ingresos</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Categoría
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No has creado categorías personalizadas aún.
            </div>
          ) : (
            categories.map((category) => (
              <Card key={category.id} className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <h3 className="font-medium">{category.name}</h3>
                    <span className={cn(
                      "inline-flex items-center justify-center text-xs font-medium px-2.5 py-1 pb-1.5 rounded-full text-white leading-none",
                      category.type === 'EXPENSE' ? "bg-red-600" : "bg-green-600"
                    )}>
                      {category.type === 'EXPENSE' ? 'Gasto' : 'Ingreso'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                    <Pencil className="h-4 w-4 text-blue-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ isOpen: true, categoryId: category.id })} disabled={deletingIds.includes(category.id)}>
                    {deletingIds.includes(category.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-500" />}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingCategory ? "Editar Categoría" : "Nueva Categoría"}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <input
                {...register('name')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Ej: Cervezas"
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Icono (Emoji)</label>
              <input
                {...register('icon')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="🍺"
              />
              {errors.icon && <p className="text-xs text-red-500">{errors.icon.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <select
                {...register('type')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="EXPENSE">Gasto</option>
                <option value="INCOME">Ingreso</option>
              </select>
            </div>

            <Button type="submit" className="w-full">
              {editingCategory ? 'Actualizar' : 'Crear'}
            </Button>
          </form>
        </Modal>

        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, categoryId: null })}
          onConfirm={async () => {
            if (deleteConfirm.categoryId) {
              setDeletingIds(prev => [...prev, deleteConfirm.categoryId!]);
              try {
                await handleDelete(deleteConfirm.categoryId);
              } finally {
                setDeletingIds(prev => prev.filter(id => id !== deleteConfirm.categoryId));
              }
            }
            setDeleteConfirm({ isOpen: false, categoryId: null });
          }}
          title="Eliminar Categoría"
          message="¿Estás seguro de eliminar esta categoría? Las transacciones existentes mantendrán el ID pero podrían no mostrar el nombre correctamente si no se maneja."
          confirmText="Eliminar"
          isDestructive={true}
        />
      </div>
    </Layout>
  );
}
