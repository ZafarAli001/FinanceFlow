import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Trash2 } from "lucide-react";
import { formatCurrency, formatRelativeDate } from "@/lib/utils/formatters";
import { DynamicIcon } from "../ui/icon";

interface RecentTransactionsProps {
  transactions: any[];
  onDelete?: (id: string) => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions, onDelete }) => {
  if (!transactions.length) {
    return (
      <div className="p-10 text-center rounded-2xl card-elevated">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
          <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-foreground font-medium">No transactions yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Use voice or the + button to start tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((t, index) => {
        const isExpense = t.type === "EXPENSE";
        const isIncome = t.type === "INCOME";
        const isTransfer = t.type === "TRANSFER";

        const categoryName = t.category?.name || (isTransfer ? "Transfer" : "General");
        const categoryIcon = t.category?.icon || (isTransfer ? "ArrowRightLeft" : "Tag");
        const categoryColor = t.category?.color || (isExpense ? "#f43f5e" : isIncome ? "#10b981" : "#6366f1");

        return (
          <div
            key={t.id}
            className="flex items-center justify-between p-3.5 rounded-xl card-elevated group animate-fadeInUp"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            {/* Left Icon & Details */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${categoryColor}15`, color: categoryColor }}
              >
                <DynamicIcon name={categoryIcon} className="w-4 h-4" />
              </div>

              <div className="min-w-0">
                <div className="font-semibold text-sm text-foreground flex items-center gap-1.5 truncate">
                  <span className="truncate">{t.merchant || t.description || categoryName}</span>
                  {t.account && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium shrink-0">
                      {t.account.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                  <span>{categoryName}</span>
                  <span className="text-border">•</span>
                  <span>{formatRelativeDate(t.date)}</span>
                </div>
              </div>
            </div>

            {/* Right Amount & Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div
                  className={`font-bold text-sm ${
                    isExpense
                      ? "text-rose-400"
                      : isIncome
                      ? "text-emerald-400"
                      : "text-indigo-400"
                  }`}
                >
                  {isExpense && "−"}
                  {isIncome && "+"}
                  {formatCurrency(t.amount, t.currency)}
                </div>
              </div>

              {onDelete && (
                <button
                  onClick={() => onDelete(t.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200"
                  aria-label="Delete transaction"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
