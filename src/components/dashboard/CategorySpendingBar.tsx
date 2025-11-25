import React from 'react';

interface CategorySpendingBarProps {
  categoryName: string;
  categoryIcon: string;
  spent: number;
  total: number;
  currency?: 'PEN' | 'USD';
}

export function CategorySpendingBar({
  categoryName,
  categoryIcon,
  spent,
  total,
  currency = 'PEN'
}: CategorySpendingBarProps) {
  const percentage = total > 0 ? (spent / total) * 100 : 0;
  const currencySymbol = currency === 'USD' ? '$' : 'S/';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span>{categoryIcon}</span>
          <span className="font-medium">{categoryName}</span>
        </div>
        <div className="font-semibold">
          {currencySymbol} {spent.toFixed(2)} ({percentage.toFixed(1)}%)
        </div>
      </div>

      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-300 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
