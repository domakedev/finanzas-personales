import React from 'react';
import { Transaction } from '@/types';
import { ArrowUpRight, ArrowDownRight, ArrowRightLeft, CreditCard, Banknote, ArrowDownLeft, Wallet } from 'lucide-react';
import Link from 'next/link';

interface RecentTransactionsListProps {
  transactions: Transaction[];
  categories: { id: string; name: string; icon: string }[];
}

export function RecentTransactionsList({ transactions, categories }: RecentTransactionsListProps) {
  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'INCOME':
        return <ArrowDownRight className="h-4 w-4 text-green-600" />;
      case 'EXPENSE':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      case 'TRANSFER':
        return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
      case 'PAY_DEBT':
      case 'PAY_CREDIT_CARD':
        return <CreditCard className="h-4 w-4 text-purple-600" />;
      case 'RECEIVE_DEBT_PAYMENT':
        return <Banknote className="h-4 w-4 text-emerald-600" />;
      case 'SAVE_FOR_GOAL':
        return <Wallet className="h-4 w-4 text-amber-600" />;
      default:
        return <ArrowRightLeft className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAmountColor = (type: Transaction['type']) => {
    if (type === 'INCOME' || type === 'RECEIVE_DEBT_PAYMENT') return 'text-green-600';
    if (type === 'EXPENSE' || type === 'PAY_DEBT' || type === 'PAY_CREDIT_CARD' || type === 'SAVE_FOR_GOAL') return 'text-red-600';
    return 'text-blue-600';
  };

  const recentTransactions = transactions
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 7);

  if (recentTransactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm">No hay transacciones recientes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recentTransactions.map((tx) => {
        const category = categories.find(c => c.id === tx.categoryId);
        const isPositive = tx.type === 'INCOME' || tx.type === 'RECEIVE_DEBT_PAYMENT';
        
        return (
          <div
            key={tx.id}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {getTransactionIcon(tx.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{tx.description}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{tx.date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}</span>
                  {category && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span>{category.icon}</span>
                        <span className="truncate">{category.name}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className={`font-semibold flex-shrink-0 ml-2 ${getAmountColor(tx.type)}`}>
              {isPositive ? '+' : '-'} S/ {tx.amount.toFixed(2)}
            </div>
          </div>
        );
      })}
      
      <Link 
        href="/transactions"
        className="block text-center py-2 text-sm text-primary hover:underline"
      >
        Ver todas las transacciones →
      </Link>
    </div>
  );
}
