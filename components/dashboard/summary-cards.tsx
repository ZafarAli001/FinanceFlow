import React from "react";
import { Wallet2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

interface SummaryCardsProps {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  todayExpense: number;
  currency?: string;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalBalance,
  totalIncome,
  totalExpense,
  netCashFlow,
  todayExpense,
  currency = "INR",
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Balance Card - Hero */}
      <div className="sm:col-span-2 lg:col-span-1 p-5 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/10 border border-indigo-500/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
        <div className="flex items-center justify-between mb-3 relative">
          <span className="text-[11px] font-semibold text-indigo-300/70 uppercase tracking-wider">Net Balance</span>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Wallet2 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1 text-foreground relative">
          {formatCurrency(totalBalance, currency)}
        </div>
        <div className="text-[11px] text-muted-foreground font-medium relative">
          All accounts combined
        </div>
      </div>

      {/* Monthly Income Card */}
      <div className="p-5 rounded-2xl card-elevated relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
        <div className="flex items-center justify-between mb-3 relative">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Income</span>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-400 mb-1 relative">
          +{formatCurrency(totalIncome, currency)}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-400/70 font-medium relative">
          <ArrowUpRight className="w-3 h-3" />
          <span>This month</span>
        </div>
      </div>

      {/* Monthly Expenses Card */}
      <div className="p-5 rounded-2xl card-elevated relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
        <div className="flex items-center justify-between mb-3 relative">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Expenses</span>
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-rose-400 mb-1 relative">
          -{formatCurrency(totalExpense, currency)}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-rose-400/70 font-medium relative">
          <ArrowDownRight className="w-3 h-3" />
          <span>Today: {formatCurrency(todayExpense, currency)}</span>
        </div>
      </div>

      {/* Net Cash Flow Card */}
      <div className="p-5 rounded-2xl card-elevated relative overflow-hidden group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cash Flow</span>
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground border border-border/50">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className={`text-xl sm:text-2xl font-bold tracking-tight mb-1 ${netCashFlow >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {formatCurrency(netCashFlow, currency)}
        </div>
        <div className="text-[11px] text-muted-foreground font-medium">
          {netCashFlow >= 0 ? "Net positive ↗" : "Net deficit ↘"}
        </div>
      </div>
    </div>
  );
};
