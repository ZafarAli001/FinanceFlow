"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CategoryPieChart, CashflowBarChart } from "@/components/analytics/charts";
import { formatCurrency } from "@/lib/utils/formatters";
import { TrendingUp, TrendingDown, Scale, Flame } from "lucide-react";
import { useDataSubscription } from "@/lib/events/data-events";

export default function AnalyticsPage() {
  const [range, setRange] = useState("month");
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analytics?mode=detailed&range=${range}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useDataSubscription(fetchAnalytics);

  return (
    <div className="space-y-6">
      {/* Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Financial Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Spending breakdowns, income analysis & cash flow dynamics
          </p>
        </div>

        <div className="flex gap-1 bg-secondary/30 border border-border/50 p-1 rounded-2xl">
          {[
            { id: "today", label: "Today" },
            { id: "week", label: "Week" },
            { id: "month", label: "Month" },
            { id: "3months", label: "3 Months" },
            { id: "year", label: "Year" },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                range === r.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 bg-secondary/50 rounded-2xl animate-pulse" />
      ) : (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl card-elevated">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Total Income</span>
              <div className="text-2xl font-bold text-emerald-500 mt-1">
                +{formatCurrency(analytics?.totalIncome || 0)}
              </div>
            </div>

            <div className="p-4 rounded-2xl card-elevated">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Total Spending</span>
              <div className="text-2xl font-bold text-rose-400 mt-1">
                -{formatCurrency(analytics?.totalExpense || 0)}
              </div>
            </div>

            <div className="p-4 rounded-2xl card-elevated">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Net Surplus</span>
              <div className="text-2xl font-bold text-indigo-400 mt-1">
                {formatCurrency(analytics?.netCashFlow || 0)}
              </div>
            </div>
          </div>

          {/* Highest Expense Highlight */}
          {analytics?.highestExpense && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase text-rose-400 tracking-wider">Highest Expense</span>
                <p className="text-sm font-semibold text-foreground">
                  {analytics.highestExpense.merchant || analytics.highestExpense.category?.name || "Expense"} —{" "}
                  <span className="text-rose-400 font-extrabold">{formatCurrency(analytics.highestExpense.amount)}</span>
                </p>
              </div>
            </div>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl card-elevated space-y-4">
              <h3 className="font-bold text-sm text-foreground">Spending by Category</h3>
              <CategoryPieChart data={analytics?.spendingByCategory || []} />
            </div>

            <div className="p-5 rounded-2xl card-elevated space-y-4">
              <h3 className="font-bold text-sm text-foreground">Income vs Expense Cashflow</h3>
              <CashflowBarChart data={analytics?.trendData || []} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
