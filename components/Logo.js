'use client'
import React from 'react';
import Image from 'next/image';

const Logo = ({ 
  variant = 'dark', // 'dark' or 'light'
  size = 'md', // 'sm', 'md', 'lg', 'xl'
  className = '',
  showText = true 
}) => {
  // Size configurations
  const sizeConfig = {
    sm: { width: 24, height: 24, textSize: 'text-lg' },
    md: { width: 32, height: 32, textSize: 'text-xl' },
    lg: { width: 40, height: 40, textSize: 'text-2xl' },
    xl: { width: 48, height: 48, textSize: 'text-3xl' }
  };

  const { width, height, textSize } = sizeConfig[size];

  // Logo text styling based on variant
  const textColor = variant === 'light' 
    ? 'text-white' 
    : 'text-neutral-900';

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo Icon - Replace with your actual logo files when provided */}
      <div 
        className={`
          w-${width/4} h-${width/4} rounded-xl flex items-center justify-center
          ${variant === 'light' 
            ? 'bg-white/20 backdrop-blur-sm border border-white/30' 
            : 'bg-gradient-to-br from-brand-500 to-brand-600 shadow-financial'
          }
        `}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        {/* Temporary logo - replace with actual logo */}
        <div className={`
          font-bold text-center leading-none
          ${variant === 'light' ? 'text-white' : 'text-white'}
          ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}
        `}>
          W
        </div>
      </div>

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold tracking-tight ${textSize} ${textColor} leading-none`}>
            WALI OS
          </span>
          <span className={`
            text-xs font-medium tracking-wide
            ${variant === 'light' ? 'text-white/80' : 'text-neutral-500'}
          `}>
            FundingOS
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
