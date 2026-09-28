"use client";

import React, { useState, useEffect, useCallback } from "react";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { ChevronRight, Target, Wallet2, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import Link from "next/link";
import { useDataSubscription, notifyDataChanged } from "@/lib/events/data-events";

export default function DashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewRes, budgetRes] = await Promise.all([
        fetch("/api/analytics?mode=overview"),
        fetch("/api/budgets"),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data);
      }

      if (budgetRes.ok) {
        const bData = await budgetRes.json();
        setBudgets(bData.budgets || []);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useDataSubscription(fetchDashboardData);

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchDashboardData();
        notifyDataChanged();
      }
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    }
  };

  if (isLoading && !overview) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-secondary/50" />
          ))}
        </div>
        <div className="h-48 bg-secondary/50 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your financial overview at a glance</p>
      </div>

      {/* Financial Summary KPI Cards */}
      <SummaryCards
        totalBalance={overview?.totalBalance || 0}
        totalIncome={overview?.totalIncome || 0}
        totalExpense={overview?.totalExpense || 0}
        netCashFlow={overview?.netCashFlow || 0}
        todayExpense={overview?.todayExpense || 0}
      />

      {/* Two-Column Layout for Accounts + Budgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Cards Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wallet2 className="w-4 h-4 text-primary" />
              Accounts
            </h2>
            <Link href="/accounts" className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {overview?.accounts?.map((acc: any, index: number) => (
              <div
                key={acc.id}
                className="p-4 rounded-xl card-elevated flex items-center justify-between animate-fadeInUp"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                    style={{ backgroundColor: `${acc.color || "#6366f1"}20`, color: acc.color || "#6366f1" }}
                  >
                    {acc.name?.charAt(0)?.toUpperCase() || "A"}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      {acc.name}
                      {acc.isDefault && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase font-bold tracking-wider">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{acc.type}</div>
                  </div>
                </div>

                <div className="text-right font-bold text-sm text-foreground">
                  {formatCurrency(acc.currentBalance, acc.currency)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Budget Progress Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Budget Progress
            </h2>
            <Link href="/budgets" className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {budgets.length > 0 ? (
            <div className="p-5 rounded-xl card-elevated space-y-4">
              {budgets.slice(0, 3).map((b: any) => (
                <div key={b.id} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground font-semibold">
                      {b.category ? b.category.name : "Overall Monthly"}
                    </span>
                    <span className="text-muted-foreground font-medium">
                      {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        b.percentage > 90 ? "bg-gradient-to-r from-rose-500 to-rose-400" : b.percentage > 75 ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      }`}
                      style={{ width: `${Math.min(100, b.percentage)}%` }}
                    />
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold ${b.percentage > 90 ? "text-rose-400" : b.percentage > 75 ? "text-amber-400" : "text-emerald-400"}`}>
                      {b.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-xl card-elevated text-center">
              <p className="text-sm text-muted-foreground">No budgets set yet</p>
              <Link href="/budgets" className="text-xs text-primary hover:underline mt-1 inline-block">Create one →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent Transactions</h2>
          <Link href="/transactions" className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
            View history <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <RecentTransactions
          transactions={overview?.recentTransactions || []}
          onDelete={handleDeleteTransaction}
        />
      </div>
    </div>
  );
}
