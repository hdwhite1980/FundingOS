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

  // Logo styling based on variant - white logo on dark backgrounds, dark logo on light backgrounds
  const logoIconStyle = variant === 'light' 
    ? 'bg-white/20 backdrop-blur-sm border border-white/30 text-white' 
    : 'bg-gradient-to-br from-green-500 to-green-600 shadow-lg text-white';
    
  const textColor = variant === 'light' 
    ? 'text-white' 
    : 'text-neutral-900';
    
  const subtextColor = variant === 'light' 
    ? 'text-white/80' 
    : 'text-neutral-500';

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo Icon */}
      <div 
        className={`
          rounded-xl flex items-center justify-center font-bold text-center leading-none
          ${logoIconStyle}
          ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}
        `}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        W
      </div>

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold tracking-tight ${textSize} ${textColor} leading-none`}>
            WALI-OS
          </span>
          <span className={`
            text-xs font-medium tracking-wide ${subtextColor}
          `}>
            powered by AHTS
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
