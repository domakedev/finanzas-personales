"use client"

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AccountSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { addAccount, updateAccount } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { Account } from '@/types';
import { ACCOUNT_OPTIONS } from '@/constants/categories';
import Image from 'next/image';

interface AccountFormProps {
  onSuccess: () => void;
  account?: Account;
}

export const AccountForm: React.FC<AccountFormProps> = ({ onSuccess, account }) => {
  const { user: authUser } = useAuth();
  const user = useStore((state) => state.user) || authUser;
  const addAccountToStore = useStore((state) => state.addAccount);
  const updateAccountInStore = useStore((state) => state.updateAccount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>(account?.name || '');

  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<z.infer<typeof AccountSchema>>({
    resolver: zodResolver(AccountSchema),
    defaultValues: {
      type: account?.type || 'BANK',
      currency: account?.currency || 'PEN',
      name: account?.name || '',
      balance: account?.balance || 0,
      logo: account?.logo,
      icon: account?.icon,
    }
  });

  const accountType = watch('type');

  const handleOptionSelect = (option: typeof ACCOUNT_OPTIONS[0]) => {
    setSelectedOption(option.name);
    setValue('name', option.name);
    setValue('type', option.type as 'BANK' | 'WALLET' | 'CASH');
    // Save logo or icon
    if ('logo' in option) {
      setValue('logo', option.logo);
      setValue('icon', undefined);
    } else if ('icon' in option) {
      setValue('icon', option.icon);
      setValue('logo', undefined);
    }
  };

  const onSubmit = async (data: any) => {
    if (!user) {
      setError("No estás autenticado.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      // Use the data from the form directly, which includes logo/icon set by handleOptionSelect
      const accountData = {
        ...data,
      };
      
      // Remove undefined fields
      if (!accountData.logo) delete accountData.logo;
      if (!accountData.icon) delete accountData.icon;
      
      if (account) {
        updateAccountInStore(account.id, accountData);
        await updateAccount(account.id, accountData);
      } else {
        // Add to Firebase and get the real document ID
        const docRef = await addAccount(user.uid, accountData);
        
        // Create account with the real Firebase ID
        const accountWithRealId = {
          ...accountData,
          id: docRef.id  // Use Firebase's generated ID
        };
        
        // Add to store with the correct ID
        addAccountToStore(accountWithRealId);
      }
      
      reset();
      onSuccess();
    } catch (err: any) {
      console.error("Error saving account:", err);
      setError(err.message || "Error al guardar la cuenta. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOptions = ACCOUNT_OPTIONS.filter(opt => opt.type === accountType);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Tipo de Cuenta</label>
        <select
          {...register('type')}
          onChange={(e) => {
            setValue('type', e.target.value as any);
            setSelectedOption('');
            setValue('name', '');
          }}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="account-type-select"
        >
          <option value="BANK">Banco</option>
          <option value="WALLET">Billetera Digital</option>
          <option value="CASH">Efectivo</option>
        </select>
        {errors.type && <p className="text-xs text-red-500">{errors.type.message as string}</p>}
      </div>

      {/* Grid de opciones con logos */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {accountType === 'BANK' ? 'Banco' : accountType === 'WALLET' ? 'Billetera' : 'Tipo'}
        </label>
        <div className="grid grid-cols-3 gap-3">
          {filteredOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleOptionSelect(option)}
              className={`p-3 border-2 rounded-lg flex flex-col items-center gap-2 transition-all hover:border-primary/50 cursor-pointer ${
                selectedOption === option.name ? 'border-primary bg-primary/5' : 'border-gray-200'
              }`}
              data-testid={`account-option-${option.id}`}
            >
              {(option as any).logo ? (
                <div className="w-12 h-12 relative">
                  <Image 
                    src={(option as any).logo} 
                    alt={option.name}
                    fill
                    className="object-contain"
                    onError={(e) => {
                      // Fallback si la imagen no existe
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-12 h-12 flex items-center justify-center text-3xl">
                  {(option as any).icon}
                </div>
              )}
              <span className="text-xs font-medium text-center">{option.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Nombre de la Cuenta</label>
        <input
          type="text"
          {...register('name')}
          value={selectedOption}
          onChange={(e) => {
            setSelectedOption(e.target.value);
            setValue('name', e.target.value);
          }}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Ej: Mi cuenta BCP"
          data-testid="account-name-input"
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message as string}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Moneda</label>
          <select
            {...register('currency')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="account-currency-select"
          >
            <option value="PEN">Soles (S/)</option>
            <option value="USD">Dólares ($)</option>
          </select>
          {errors.currency && <p className="text-xs text-red-500">{errors.currency.message as string}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Balance Inicial</label>
          <input
            type="number"
            step="0.01"
            {...register('balance')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0.00"
            data-testid="account-balance-input"
          />
          {errors.balance && <p className="text-xs text-red-500">{errors.balance.message as string}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="save-account-button">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {account ? 'Actualizar Cuenta' : 'Guardar Cuenta'}
      </Button>
      
      {/* Hidden inputs to ensure logo/icon are submitted */}
      <input type="hidden" {...register('logo')} />
      <input type="hidden" {...register('icon')} />
    </form>
  );
};
