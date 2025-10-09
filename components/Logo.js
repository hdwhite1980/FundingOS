'use client'
import React from 'react';
import Image from 'next/image';

const Logo = ({ 
  variant = 'dark', // 'dark' or 'light'
  size = 'md', // 'sm', 'md', 'lg', 'xl'
  className = '',
  showText = true 
}) => {
  // Size configurations for the entire logo with text
  const sizeConfig = {
    sm: { iconWidth: 32, iconHeight: 32, textSize: 'text-lg' },
    md: { iconWidth: 40, iconHeight: 40, textSize: 'text-xl' },
    lg: { iconWidth: 48, iconHeight: 48, textSize: 'text-2xl' },
    xl: { iconWidth: 56, iconHeight: 56, textSize: 'text-3xl' }
  };

  const { iconWidth, iconHeight, textSize } = sizeConfig[size];

  // Choose the appropriate logo file based on variant
  // For light variant (on dark backgrounds), use white logo
  // For dark variant (on light backgrounds), use black logo
  const logoSrc = showText
    ? (variant === 'light' ? '/images/wali-os-logo-white.svg?v=4' : '/images/wali-os-logo-black.svg?v=4')
    : (variant === 'light' ? '/images/wali-os-icon-white.svg?v=4' : '/images/wali-os-icon-black.svg?v=4');

  // If showing full logo with text, use larger dimensions
  const logoWidth = showText ? iconWidth * 4 : iconWidth;
  const logoHeight = showText ? iconHeight : iconHeight;

  return (
    <div className={`flex items-center ${className}`}>
      {showText ? (
        <div className={`flex items-center gap-2`}>
          <Image
            src={variant === 'light' ? '/images/wali-os-icon-white.svg?v=4' : '/images/wali-os-icon-black.svg?v=4'}
            alt="WALI-OS Icon"
            width={iconWidth}
            height={iconHeight}
            className="object-contain"
            priority
            unoptimized
          />
          <span className={`font-bold ${textSize} ${variant === 'light' ? 'text-white' : 'text-slate-900'}`}>
            WALI-OS
          </span>
        </div>
      ) : (
        <Image
          src={logoSrc}
          alt="WALI-OS"
          width={logoWidth}
          height={logoHeight}
          className="object-contain"
          priority
          unoptimized
        />
      )}
    </div>
  );
};

export default Logo;
