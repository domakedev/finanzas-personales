import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { Account, Transaction } from '@/types';
import { Button } from '@/components/ui/Button';
import { addTransaction as addTransactionDB, updateAccount as updateAccountInDB, verifyTransaction } from '@/lib/db';
import { addMoney, subtractMoney } from '@/lib/utils';
import { format } from 'date-fns';
import { CheckCircle2, Circle, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface ReconciliationPanelProps {
  account: Account;
  onClose: () => void;
}

export const ReconciliationPanel: React.FC<ReconciliationPanelProps> = ({ account, onClose }) => {
  const { user: authUser } = useAuth();
  const user = useStore((state) => state.user) || authUser;
  const transactions = useStore((state) => state.transactions);
  const updateTransactionInStore = useStore((state) => state.updateTransaction);
  const addTransactionToStore = useStore((state) => state.addTransaction);
  const updateAccountInStore = useStore((state) => state.updateAccount);

  const [realBalanceInput, setRealBalanceInput] = useState<string>('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Get unverified transactions for this account
  const unverifiedTransactions = transactions
    .filter(t => (t.accountId === account.id || t.fromAccountId === account.id) && !t.isVerified)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const calculatedBalance = account.balance;
  const realBalance = parseFloat(realBalanceInput);
  const difference = isNaN(realBalance) ? 0 : subtractMoney(realBalance, calculatedBalance);

  const handleToggleVerify = async (tx: Transaction) => {
    try {
      if (tx.isVerified) {
        // Technically this list only shows unverified, but keeping it safe
      } else {
        await verifyTransaction(tx.id);
        updateTransactionInStore(tx.id, { isVerified: true });
      }
    } catch (error) {
      console.error('Error verifying transaction:', error);
    }
  };

  const handleCreateAdjustment = async () => {
    if (!user || isNaN(realBalance) || difference === 0) return;
    setIsAdjusting(true);

    try {
      const type = difference > 0 ? 'INCOME' : 'EXPENSE';
      const amount = Math.abs(difference);
      
      const newTx = {
        userId: user.uid,
        amount,
        description: 'Ajuste de Reconciliación Automático',
        date: new Date(),
        createdAt: new Date(),
        type,
        accountId: account.id,
        isVerified: true, // Auto-verified
      } as any;

      const docRef = await addTransactionDB(user.uid, newTx);
      addTransactionToStore({ ...newTx, id: docRef.id });

      const newBalance = type === 'INCOME' 
        ? addMoney(account.balance, amount) 
        : subtractMoney(account.balance, amount);

      updateAccountInStore(account.id, { balance: newBalance });
      await updateAccountInDB(account.id, { balance: newBalance });

      setRealBalanceInput('');
    } catch (error) {
      console.error('Error creating adjustment:', error);
      alert('Error al crear el ajuste');
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 p-4 rounded-lg space-y-4 border">
        <h3 className="font-semibold text-sm">1. Ingresa tu saldo real</h3>
        <p className="text-xs text-muted-foreground">
          Revisa la app de tu banco y escribe el saldo exacto que tienes en "{account.name}".
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs font-medium mb-1 block">Saldo Real en Banco</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {account.currency === 'USD' ? '$' : 'S/'}
              </span>
              <input
                type="number"
                step="0.01"
                value={realBalanceInput}
                onChange={(e) => setRealBalanceInput(e.target.value)}
                placeholder="0.00"
                className="flex h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium mb-1 block">Saldo Calculado (App)</label>
            <div className="h-10 px-3 py-2 border rounded-md bg-muted/50 font-semibold flex items-center">
              {account.currency === 'USD' ? '$' : 'S/'} {calculatedBalance.toFixed(2)}
            </div>
          </div>
        </div>

        {!isNaN(realBalance) && realBalanceInput !== '' && (
          <div className={`p-3 rounded-md text-sm border flex items-center justify-between ${
            difference === 0 
              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' 
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
          }`}>
            <div>
              <span className="font-semibold block">Diferencia: {account.currency === 'USD' ? '$' : 'S/'} {Math.abs(difference).toFixed(2)}</span>
              {difference !== 0 && (
                <span className="text-xs">
                  {difference > 0 ? 'Falta registrar ingresos en la app.' : 'Falta registrar gastos en la app.'}
                </span>
              )}
            </div>
            
            {difference !== 0 && (
              <Button 
                size="sm" 
                variant="outline" 
                className="bg-white/50 dark:bg-black/20"
                onClick={handleCreateAdjustment}
                disabled={isAdjusting}
              >
                {isAdjusting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Auto Ajuste
              </Button>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">2. Transacciones no verificadas ({unverifiedTransactions.length})</h3>
          <p className="text-xs text-muted-foreground">Marca ✅ si coinciden con tu banco</p>
        </div>

        {unverifiedTransactions.length === 0 ? (
          <div className="text-center p-6 border rounded-lg border-dashed">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">¡Todo al día! No hay transacciones pendientes de verificar.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
            {unverifiedTransactions.map((tx) => {
              const isIncoming = tx.type === 'TRANSFER' ? tx.accountId === account.id : (tx.type === 'INCOME' || tx.type === 'RECEIVE_DEBT_PAYMENT');
              
              let displayAmount = tx.amount;
              if (tx.type === 'TRANSFER' && tx.fromAccountId && tx.accountId) {
                if (tx.accountId === account.id && tx.convertedAmount) {
                  displayAmount = tx.convertedAmount;
                }
              }

              return (
                <div key={tx.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <button
                      onClick={() => handleToggleVerify(tx)}
                      className="text-gray-400 hover:text-green-500 transition-colors flex-shrink-0"
                      title="Marcar como verificada"
                    >
                      <Circle className="h-5 w-5" />
                    </button>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.date), 'dd/MM/yyyy')} • {tx.type}
                      </p>
                    </div>
                  </div>
                  <div className={`font-bold ml-4 whitespace-nowrap ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                    {isIncoming ? '+' : '-'} {account.currency === 'USD' ? '$' : 'S/'} {displayAmount.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={onClose} variant="outline">Cerrar</Button>
      </div>
    </div>
  );
};
