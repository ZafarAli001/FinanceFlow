import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "gradient" | "outline";
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = "default",
  ...props
}) => {
  const baseStyles = "rounded-2xl transition-all duration-200";

  const variants = {
    default: "bg-white text-foreground border border-border shadow-sm hover:shadow-md",
    glass: "bg-white/80 backdrop-blur-xl border border-zinc-200 text-foreground shadow-sm",
    gradient: "bg-zinc-900 border border-zinc-800 text-white shadow-md",
    outline: "border border-border bg-transparent text-foreground",
  };

  return (
    <div className={twMerge(clsx(baseStyles, variants[variant], className))} {...props}>
      {children}
    </div>
  );
};
