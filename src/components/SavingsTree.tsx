import React from 'react';
import { cn } from '@/lib/utils';

interface SavingsTreeProps {
  percentage: number; // 0 to 100
  className?: string;
}

export const SavingsTree: React.FC<SavingsTreeProps> = ({ percentage, className }) => {
  const normalizedPercentage = Math.min(100, Math.max(0, percentage));
  
  let stage = 'seed';
  if (normalizedPercentage > 30) stage = 'sapling';
  if (normalizedPercentage > 70) stage = 'tree';

  return (
    <div className={cn("relative flex flex-col items-center justify-center p-4", className)}>
      <svg
        width="120"
        height="120"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-all duration-1000 ease-out"
      >
        {/* Ground */}
        <path d="M10 90 H90" stroke="#555F73" strokeWidth="2" strokeLinecap="round" />
        
        {stage === 'seed' && (
          <g className="animate-bounce-slow">
            <circle cx="50" cy="85" r="5" fill="#555F73" />
            <path d="M50 85 Q50 75 55 70" stroke="#4ade80" strokeWidth="2" />
            <circle cx="55" cy="70" r="2" fill="#4ade80" />
          </g>
        )}

        {stage === 'sapling' && (
          <g className="origin-bottom animate-grow">
             <path d="M50 90 V60" stroke="#8B4513" strokeWidth="3" strokeLinecap="round" />
             <path d="M50 75 Q30 65 35 55" stroke="#4ade80" strokeWidth="2" />
             <path d="M50 70 Q70 60 65 50" stroke="#4ade80" strokeWidth="2" />
             <circle cx="35" cy="55" r="4" fill="#22c55e" />
             <circle cx="65" cy="50" r="4" fill="#22c55e" />
             <circle cx="50" cy="60" r="3" fill="#22c55e" />
          </g>
        )}

        {stage === 'tree' && (
          <g className="origin-bottom animate-grow">
            <path d="M50 90 V40" stroke="#8B4513" strokeWidth="4" strokeLinecap="round" />
            {/* Branches */}
            <path d="M50 70 L30 50" stroke="#8B4513" strokeWidth="3" strokeLinecap="round" />
            <path d="M50 60 L70 45" stroke="#8B4513" strokeWidth="3" strokeLinecap="round" />
            
            {/* Foliage */}
            <circle cx="30" cy="50" r="12" fill="#22c55e" fillOpacity="0.8" />
            <circle cx="70" cy="45" r="12" fill="#22c55e" fillOpacity="0.8" />
            <circle cx="50" cy="35" r="15" fill="#22c55e" fillOpacity="0.9" />
            <circle cx="40" cy="45" r="10" fill="#4ade80" fillOpacity="0.8" />
            <circle cx="60" cy="40" r="10" fill="#4ade80" fillOpacity="0.8" />
            
            {/* Fruits (Gold coins for savings) */}
            {normalizedPercentage >= 90 && (
               <>
                 <circle cx="40" cy="40" r="3" fill="#F2DC99" stroke="#d97706" strokeWidth="1" />
                 <circle cx="60" cy="35" r="3" fill="#F2DC99" stroke="#d97706" strokeWidth="1" />
                 <circle cx="50" cy="25" r="3" fill="#F2DC99" stroke="#d97706" strokeWidth="1" />
               </>
            )}
          </g>
        )}
      </svg>
      <div className="mt-2 text-sm font-medium text-secondary">
        {Math.round(normalizedPercentage)}% Meta
      </div>
    </div>
  );
};
