"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet2,
  BarChart3,
  Target,
  Tags,
  Settings2,
  Mic,
  Sparkles,
  CloudDownload,
  Plus,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { clsx } from "clsx";

interface SidebarProps {
  onOpenVoice: () => void;
  onOpenQuickAdd: (type?: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenVoice, onOpenQuickAdd }) => {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Transactions", href: "/transactions", icon: ArrowLeftRight },
    { name: "Accounts", href: "/accounts", icon: Wallet2 },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Budgets", href: "/budgets", icon: Target },
    { name: "Categories", href: "/categories", icon: Tags },
    { name: "Backup & Export", href: "/backup", icon: CloudDownload },
  ];

  return (
    <aside className="hidden md:flex flex-col w-[260px] border-r border-border/50 bg-card/50 backdrop-blur-xl p-4 min-h-screen sticky top-0 justify-between">
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none tracking-tight text-foreground">FinanceFlow</h1>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase mt-0.5 block">AI-Powered Finance</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <button
            onClick={onOpenVoice}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <div className="relative">
              <Mic className="w-4 h-4" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="text-sm">AI Voice Entry</span>
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenQuickAdd("EXPENSE")}
              className="py-2 px-3 text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all duration-200 text-center border border-rose-500/20 flex items-center justify-center gap-1.5"
            >
              <TrendingDown className="w-3 h-3" />
              Expense
            </button>
            <button
              onClick={() => onOpenQuickAdd("INCOME")}
              className="py-2 px-3 text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-all duration-200 text-center border border-emerald-500/20 flex items-center justify-center gap-1.5"
            >
              <TrendingUp className="w-3 h-3" />
              Income
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-0.5">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-3 mb-2">Menu</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-[13px] transition-all duration-200 group",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Icon className={clsx("w-[18px] h-[18px] transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span>{item.name}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Profile & Settings Footer */}
      <div className="pt-3 border-t border-border/50 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-secondary/50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
            {pathname === "/settings" ? (
              <Settings2 className="w-4 h-4" />
            ) : (
              "U"
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              Account & Settings
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              Encrypted Profile
            </p>
          </div>
          <Settings2 className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
        </Link>
      </div>
    </aside>
  );
};
