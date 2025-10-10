'use client'
import React from 'react';
import Image from 'next/image';

const Logo = ({ 
  variant = 'dark', // 'dark' or 'light'
  size = 'md', // 'sm', 'md', 'lg', 'xl', 'xxl'
  className = '',
  showText = true 
}) => {
  // Size configurations for the entire logo with text
  const sizeConfig = {
    sm: { iconWidth: 32, iconHeight: 32, textSize: 'text-lg' },
    md: { iconWidth: 40, iconHeight: 40, textSize: 'text-xl' },
    lg: { iconWidth: 48, iconHeight: 48, textSize: 'text-2xl' },
    xl: { iconWidth: 56, iconHeight: 56, textSize: 'text-3xl' },
    xxl: { iconWidth: 96, iconHeight: 96, textSize: 'text-5xl' },
    xxxl: { iconWidth: 192, iconHeight: 192, textSize: 'text-7xl' }
  };

  const { iconWidth, iconHeight, textSize } = sizeConfig[size];

  // Choose the appropriate logo file based on variant
  // For light variant (on dark backgrounds), use white logo
  // For dark variant (on light backgrounds), use black logo
  const logoSrc = variant === 'light' ? '/images/wali-os-logo-white.png' : '/images/wali-os-logo-black.png';

  // Adjust dimensions for logo aspect ratio
  const logoWidth = showText ? iconWidth * 3 : iconWidth;
  const logoHeight = iconHeight;

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src={logoSrc}
        alt="WALI-OS"
        width={logoWidth}
        height={logoHeight}
        className="object-contain"
        priority
      />
    </div>
  );
};

export default Logo;
