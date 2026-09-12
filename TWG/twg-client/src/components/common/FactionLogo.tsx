import React, { useState, useEffect } from 'react';
import { FactionInfo } from '../../types/army';

export interface FactionLogoProps {
  faction?: Partial<FactionInfo> | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  className?: string;
  imgClassName?: string;
  symbolClassName?: string;
  fallbackSymbol?: string;
}

const DEFAULT_SIZE_CLASSES = {
  xs: {
    img: 'w-4 h-4 rounded object-contain shrink-0',
    symbol: 'text-xs shrink-0'
  },
  sm: {
    img: 'w-5 h-5 rounded object-contain shrink-0',
    symbol: 'text-sm shrink-0'
  },
  md: {
    img: 'w-7 h-7 rounded-md object-contain shrink-0',
    symbol: 'text-xl shrink-0'
  },
  lg: {
    img: 'w-10 h-10 rounded-lg object-contain shrink-0',
    symbol: 'text-2xl shrink-0'
  },
  xl: {
    img: 'w-14 h-14 rounded-xl object-contain shrink-0',
    symbol: 'text-4xl shrink-0'
  },
  custom: {
    img: 'shrink-0',
    symbol: 'shrink-0'
  }
};

export const FactionLogo: React.FC<FactionLogoProps> = ({
  faction,
  size = 'md',
  className = '',
  imgClassName = '',
  symbolClassName = '',
  fallbackSymbol = '⚔️'
}) => {
  const [imgError, setImgError] = useState(false);

  // Reset error when logoUrl changes
  useEffect(() => {
    setImgError(false);
  }, [faction?.logoUrl]);

  const sizeClass = DEFAULT_SIZE_CLASSES[size] || DEFAULT_SIZE_CLASSES.md;

  if (faction?.logoUrl && !imgError) {
    return (
      <img
        src={faction.logoUrl}
        alt={faction.name ? `${faction.name} logo` : 'Faction logo'}
        onError={() => setImgError(true)}
        className={`${sizeClass.img} ${imgClassName} ${className}`.trim()}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center leading-none ${sizeClass.symbol} ${symbolClassName} ${className}`.trim()}
      title={faction?.name}
    >
      {faction?.symbol || fallbackSymbol}
    </span>
  );
};
