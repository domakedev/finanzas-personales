import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface QuickStatsCardProps {
  title: string;
  amount: string;
  icon: LucideIcon;
  trend?: {
    value: number; // percentage change
    isPositive: boolean;
  };
  subtitle?: string;
  onClick?: () => void;
  colorScheme?: 'default' | 'success' | 'warning' | 'danger';
}

export function QuickStatsCard({ 
  title, 
  amount, 
  icon: Icon, 
  trend,
  subtitle,
  onClick,
  colorScheme = 'default'
}: QuickStatsCardProps) {
  const getColorClasses = () => {
    switch (colorScheme) {
      case 'success':
        return 'border-l-4 border-l-green-500';
      case 'warning':
        return 'border-l-4 border-l-yellow-500';
      case 'danger':
        return 'border-l-4 border-l-red-500';
      default:
        return '';
    }
  };

  return (
    <Card 
      className={`${getColorClasses()} ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{amount}</div>
        
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            {trend.isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">vs mes pasado</span>
          </div>
        )}
        
        {subtitle && !trend && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
