"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Target, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";
import { BudgetModal } from "@/components/budgets/budget-modal";
import { useDataSubscription, notifyDataChanged } from "@/lib/events/data-events";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        fetch("/api/budgets"),
        fetch("/api/categories"),
      ]);

      if (bRes.ok) {
        const data = await bRes.json();
        setBudgets(data.budgets || []);
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setCategories(cData.categories || []);
      }
    } catch (err) {
      console.error("Failed to load budgets:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  useDataSubscription(fetchBudgets);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/budgets?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchBudgets();
        notifyDataChanged();
      }
    } catch (err) {
      console.error("Failed to delete budget:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Monthly Budgets</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor and control spending against planned monthly targets
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          <span>Set Budget</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-24 bg-card/50 rounded-2xl" />
          <div className="h-24 bg-card/50 rounded-2xl" />
        </div>
      ) : budgets.length === 0 ? (
        <div className="p-8 text-center rounded-2xl card-elevated space-y-3">
          <Target className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">No budgets set for this month</p>
          <p className="text-xs text-muted-foreground">Create a target budget to monitor your expenses and prevent overspending.</p>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            Set First Budget
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b) => (
            <div key={b.id} className="p-5 rounded-2xl card-elevated space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    {b.category ? b.category.name : "Overall Monthly Budget"}
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">Period: {b.period}</span>
                </div>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="p-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Spent: {formatCurrency(b.spent)}</span>
                  <span className="text-foreground">Limit: {formatCurrency(b.amount)}</span>
                </div>
                <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      b.percentage > 90 ? "bg-gradient-to-r from-rose-500 to-rose-400" : b.percentage > 75 ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                    }`}
                    style={{ width: `${Math.min(100, b.percentage)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                <span className="font-medium text-muted-foreground">
                  Remaining: <strong className={b.remaining < 0 ? "text-rose-400" : "text-emerald-400"}>{formatCurrency(b.remaining)}</strong>
                </span>
                <span className="font-bold">{b.percentage}% Used</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchBudgets}
        categories={categories}
      />
    </div>
  );
}
