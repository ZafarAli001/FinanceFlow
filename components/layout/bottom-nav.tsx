"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowLeftRight, Mic, BarChart3, Wallet2 } from "lucide-react";
import { clsx } from "clsx";

interface BottomNavProps {
  onOpenVoice: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenVoice }) => {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/", icon: LayoutDashboard },
    { name: "Activity", href: "/transactions", icon: ArrowLeftRight },
    { name: "Insights", href: "/analytics", icon: BarChart3 },
    { name: "Accounts", href: "/accounts", icon: Wallet2 },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border/50 px-3 py-2 pb-safe">
      <div className="flex items-center justify-around relative max-w-md mx-auto">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all duration-200",
                isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={clsx("w-5 h-5", isActive && "drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]")} />
              <span className="text-[10px]">{item.name}</span>
            </Link>
          );
        })}

        {/* Center Floating Voice Button */}
        <button
          onClick={onOpenVoice}
          aria-label="Open voice assistant"
          className="relative -top-5 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 border-4 border-card active:scale-95 transition-all duration-200 hover:shadow-indigo-500/50"
        >
          <Mic className="w-6 h-6" />
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-card animate-pulse" />
        </button>

        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all duration-200",
                isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={clsx("w-5 h-5", isActive && "drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]")} />
              <span className="text-[10px]">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
