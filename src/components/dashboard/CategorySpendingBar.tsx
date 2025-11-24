import React from 'react';

interface CategorySpendingBarProps {
  categoryName: string;
  categoryIcon: string;
  spent: number;
  limit: number;
  currency?: 'PEN' | 'USD';
}

export function CategorySpendingBar({ 
  categoryName, 
  categoryIcon, 
  spent, 
  limit,
  currency = 'PEN'
}: CategorySpendingBarProps) {
  const percentage = (spent / limit) * 100;
  const currencySymbol = currency === 'USD' ? '$' : 'S/';
  
  // Determine color based on usage
  const getColor = () => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 90) return 'bg-red-400';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = () => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span>{categoryIcon}</span>
          <span className="font-medium">{categoryName}</span>
        </div>
        <div className={`font-semibold ${getTextColor()}`}>
          {currencySymbol} {spent.toFixed(2)} / {currencySymbol} {limit.toFixed(2)}
        </div>
      </div>
      
      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-300 rounded-full`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      {percentage >= 90 && (
        <p className="text-xs text-muted-foreground">
          {percentage >= 100 
            ? `⚠️ Has excedido el presupuesto por ${currencySymbol} ${(spent - limit).toFixed(2)}`
            : `⚠️ Cerca del límite (${percentage.toFixed(0)}%)`
          }
        </p>
      )}
    </div>
  );
}
