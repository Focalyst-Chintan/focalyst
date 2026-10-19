'use client';
import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[10px] bg-surface-2 animate-pulse ${className}`}
      {...props}
    />
  );
}

export default Skeleton;
