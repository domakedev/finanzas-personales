import React from 'react';
import Image from 'next/image';

interface Option {
  id: string;
  name: string;
  logo?: string;
  icon?: string;
  type: string;
  [key: string]: any; // Para compatibilidad con tipos existentes
}

interface OptionSelectorProps {
  options: Option[];
  selectedOption: string;
  onSelect: (option: Option) => void;
  gridCols?: string;
  testIdPrefix?: string;
}

export const OptionSelector: React.FC<OptionSelectorProps> = ({
  options,
  selectedOption,
  onSelect,
  gridCols = 'grid-cols-2 md:grid-cols-3',
  testIdPrefix = 'option'
}) => {
  return (
    <div className={`grid ${gridCols} gap-3`}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option)}
          className={`p-3 border-2 rounded-lg flex flex-col items-center gap-2 transition-all hover:border-primary/50 cursor-pointer ${
            selectedOption === option.name ? 'border-primary bg-primary/5' : 'border-gray-200'
          }`}
          data-testid={`${testIdPrefix}-${option.id}`}
        >
          {option.logo ? (
            <div className="w-12 h-12 relative">
              <Image
                src={option.logo}
                alt={option.name}
                fill
                className="object-contain rounded-md"
                onError={(e) => {
                  // Fallback si la imagen no existe
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-12 h-12 flex items-center justify-center text-3xl">
              {option.icon}
            </div>
          )}
          <span className="text-xs font-medium text-center">{option.name}</span>
        </button>
      ))}
    </div>
  );
};