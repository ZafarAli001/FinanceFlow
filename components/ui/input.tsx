import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  className,
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && <div className="absolute left-3.5 text-muted-foreground pointer-events-none">{leftIcon}</div>}
        <input
          id={inputId}
          className={twMerge(
            clsx(
              "w-full rounded-xl border border-border/50 bg-secondary/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-destructive/50 focus:ring-destructive/20",
              className
            )
          )}
          {...props}
        />
        {rightIcon && <div className="absolute right-3.5 text-muted-foreground">{rightIcon}</div>}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
