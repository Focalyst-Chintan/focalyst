'use client';
import React, { useState } from 'react';
import Image from 'next/image';

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
}

export function Avatar({
  src,
  name = '',
  size = 'md',
  className = '',
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const isNumeric = typeof size === 'number';
  const sizeClasses = !isNumeric
    ? {
        sm: 'h-7 w-7 text-[11px]',
        md: 'h-9 w-9 text-[13px]',
        lg: 'h-11 w-11 text-[15px]',
      }[size]
    : '';

  const customStyle = isNumeric
    ? { width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.4)}px` }
    : undefined;

  const getInitials = (n: string) => {
    if (!n) return 'F';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div
      style={customStyle}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden select-none font-semibold ${sizeClasses} ${
        src && !imgError
          ? 'bg-surface-2'
          : 'bg-primary-soft text-primary-text border border-primary/20'
      } ${className}`}
    >
      {src && !imgError ? (
        <Image
          src={src}
          alt={name || 'Avatar'}
          fill
          sizes="48px"
          className="object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}

export default Avatar;
