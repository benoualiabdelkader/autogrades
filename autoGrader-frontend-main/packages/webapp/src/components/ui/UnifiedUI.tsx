/**
 * Unified UI Components for AutoGrader
 * نظام مكونات موحد مع أنيميشن احترافي
 */

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

/* =================================
   PAGE HEADER COMPONENT
   ================================= */

interface PageHeaderProps {
  icon: IconDefinition;
  title: string;
  subtitle: string;
  gradient?: 'primary' | 'secondary' | 'accent';
  action?: React.ReactNode;
}

export function PageHeader({ icon, title, subtitle, gradient = 'primary', action }: PageHeaderProps) {
  const gradientClasses = {
    primary: 'from-blue-500 to-purple-600',
    secondary: 'from-green-500 to-blue-600',
    accent: 'from-orange-500 to-red-600'
  };

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradientClasses[gradient]} flex items-center justify-center shadow-lg animate-float`}>
            <FontAwesomeIcon icon={icon as any} className="text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-4xl font-bold premium-text-gradient tracking-tight">
              {title}
            </h1>
            <p className="text-muted-foreground text-lg mt-1">
              {subtitle}
            </p>
          </div>
        </div>
        {action && (
          <div className="animate-slide-right">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

/* =================================
   CARD COMPONENTS
   ================================= */

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
  delay?: number;
}

export function Card({ children, className = '', hover = true, glow = false, onClick, delay = 0 }: CardProps) {
  const classes = `
    glass-card p-6 rounded-2xl
    ${hover ? 'interactive' : ''}
    ${glow ? 'animate-pulse-glow' : ''}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
    stagger-item
  `.trim();

  return (
    <div 
      className={classes} 
      onClick={onClick}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  icon: IconDefinition;
  label: string;
  value: string | number;
  trend?: { value: number; positive: boolean };
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  delay?: number;
}

export function StatCard({ icon, label, value, trend, color = 'blue', delay = 0 }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-green-500 to-emerald-600',
    purple: 'from-purple-500 to-pink-600',
    orange: 'from-orange-500 to-amber-600',
    red: 'from-red-500 to-rose-600'
  };

  return (
    <Card delay={delay} className="relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium mb-2">{label}</p>
          <p className="text-3xl font-bold text-gradient-primary">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
          <FontAwesomeIcon icon={icon as any} className="text-white text-xl" />
        </div>
      </div>
    </Card>
  );
}

/* =================================
   BUTTON COMPONENTS
   ================================= */

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconDefinition;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  loading = false,
  disabled = false,
  className = '' 
}: ButtonProps) {
  const baseClasses = 'font-bold rounded-xl transition-all duration-300 flex items-center gap-2 justify-center';
  
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'bg-transparent hover:bg-white/5 border border-white/10 hover:border-white/20'
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `.trim()}
    >
      {loading ? (
        <>
          <span className="animate-spin">⏳</span>
          Loading...
        </>
      ) : (
        <>
          {icon && <FontAwesomeIcon icon={icon as any} />}
          {children}
        </>
      )}
    </button>
  );
}

/* =================================
   INPUT COMPONENTS
   ================================= */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: IconDefinition;
}

export function Input({ label, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <FontAwesomeIcon icon={icon as any} />
          </div>
        )}
        <input
          {...props}
          className={`
            w-full px-4 py-3 rounded-xl
            bg-white/5 border border-white/10
            focus:bg-white/10 focus:border-primary/50
            focus:outline-none focus:ring-2 focus:ring-primary/20
            transition-all duration-300
            placeholder:text-muted-foreground
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500' : ''}
            ${className}
          `.trim()}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, className = '', ...props }: TextAreaProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        {...props}
        className={`
          w-full px-4 py-3 rounded-xl
          bg-white/5 border border-white/10
          focus:bg-white/10 focus:border-primary/50
          focus:outline-none focus:ring-2 focus:ring-primary/20
          transition-all duration-300
          placeholder:text-muted-foreground
          resize-none
          ${error ? 'border-red-500' : ''}
          ${className}
        `.trim()}
      />
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

/* =================================
   BADGE & TAG COMPONENTS
   ================================= */

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'neutral', size = 'md' }: BadgeProps) {
  const variantClasses = {
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    neutral: 'bg-white/10 text-foreground border-white/20'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  };

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-lg font-medium border
      ${variantClasses[variant]}
      ${sizeClasses[size]}
    `.trim()}>
      {children}
    </span>
  );
}

/* =================================
   LOADING STATES
   ================================= */

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`${sizeClasses[size]} border-4 border-primary/20 border-t-primary rounded-full animate-spin`} />
  );
}

export function LoadingCard({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-6 rounded-2xl space-y-4">
          <div className="h-4 skeleton w-3/4" />
          <div className="h-4 skeleton w-1/2" />
          <div className="h-20 skeleton w-full" />
        </div>
      ))}
    </>
  );
}

/* =================================
   EMPTY STATES
   ================================= */

interface EmptyStateProps {
  icon: IconDefinition;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="glass-card p-12 rounded-2xl text-center animate-scale-in">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
        <FontAwesomeIcon icon={icon as any} className="text-4xl text-muted-foreground" />
      </div>
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
      {action}
    </div>
  );
}

/* =================================
   ALERT COMPONENTS
   ================================= */

interface AlertProps {
  variant: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

export function Alert({ variant, title, children, onClose }: AlertProps) {
  const variantClasses = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400'
  };

  return (
    <div className={`p-4 rounded-xl border ${variantClasses[variant]} animate-slide-left`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {title && <h4 className="font-bold mb-1">{title}</h4>}
          <div className="text-sm opacity-90">{children}</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-current opacity-60 hover:opacity-100 transition-opacity">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/* =================================
   SECTION DIVIDER
   ================================= */

interface SectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ title, subtitle, children, className = '' }: SectionProps) {
  return (
    <section className={`space-y-6 ${className}`}>
      {(title || subtitle) && (
        <div className="animate-fade-in">
          {title && <h2 className="section-header">{title}</h2>}
          {subtitle && <p className="text-muted-foreground -mt-4 mb-4">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
