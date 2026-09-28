"use client";

import React, { useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: any[];
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
}) => {
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError("Please specify a valid target budget amount greater than 0");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: categoryId || null,
          period,
          amount: Number(amount),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to set budget");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Monthly Budget Target">
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {error && <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">{error}</div>}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Budget Scope / Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Overall Monthly Budget (All Expenses)</option>
            {expenseCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} Category Budget
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Budget Target Amount"
          type="number"
          step="any"
          placeholder="e.g. 15000"
          value={amount}
          onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
          required
        />

        <Input
          label="Budget Period (Month)"
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          required
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Save Budget Target
          </Button>
        </div>
      </form>
    </Modal>
  );
};
