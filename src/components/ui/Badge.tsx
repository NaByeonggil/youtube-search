'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'grade';
  size?: 'sm' | 'md' | 'lg';
  grade?: 'S' | 'A' | 'B' | 'C' | 'D';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', grade, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full';

    const variants = {
      default: 'bg-gray-100 text-gray-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800',
      grade: '',
    };

    const gradeStyles = {
      S: 'bg-red-100 text-red-700 border-2 border-red-300',
      A: 'bg-orange-100 text-orange-700 border-2 border-orange-300',
      B: 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300',
      C: 'bg-green-100 text-green-700 border-2 border-green-300',
      D: 'bg-gray-100 text-gray-700 border-2 border-gray-300',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    };

    const variantStyle = variant === 'grade' && grade
      ? gradeStyles[grade]
      : variants[variant];

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variantStyle, sizes[size], className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
