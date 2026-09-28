"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { formatCurrency } from "@/lib/utils/formatters";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialType?: "EXPENSE" | "INCOME" | "TRANSFER";
  accounts: any[];
  categories: any[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialType = "EXPENSE",
  accounts,
  categories,
}) => {
  const [type, setType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">(initialType);
  const [amount, setAmount] = useState<number | "">("");
  const [accountId, setAccountId] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setType(initialType);
    if (accounts.length > 0) {
      const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
      setAccountId(defaultAcc.id);
      setSourceAccountId(defaultAcc.id);

      const destCandidate = accounts.find((a) => a.id !== defaultAcc.id) || accounts[0];
      setDestinationAccountId(destCandidate.id);
    }

    const filteredCats = categories.filter((c) => c.type === (initialType === "INCOME" ? "INCOME" : "EXPENSE"));
    if (filteredCats.length > 0) {
      setCategoryId(filteredCats[0].id);
    }

    setDate(new Date().toISOString().split("T")[0]);
    setAmount("");
    setMerchant("");
    setDescription("");
    setError(null);
  }, [isOpen, initialType, accounts, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    if (type === "TRANSFER" && sourceAccountId === destinationAccountId) {
      setError("Source and Destination accounts cannot be the same");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const selectedAcc = accounts.find((a) => a.id === (type === "TRANSFER" ? sourceAccountId : accountId));
      const payload = {
        type,
        amount: Number(amount),
        currency: selectedAcc?.currency || "INR",
        accountId: type === "TRANSFER" ? sourceAccountId : accountId,
        sourceAccountId: type === "TRANSFER" ? sourceAccountId : undefined,
        destinationAccountId: type === "TRANSFER" ? destinationAccountId : undefined,
        categoryId: type !== "TRANSFER" ? categoryId || undefined : undefined,
        merchant: merchant || undefined,
        description: description || undefined,
        date: date || new Date().toISOString(),
      };

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record transaction");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === (type === "INCOME" ? "INCOME" : "EXPENSE"));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Financial Transaction">
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {/* Type selector */}
        <div className="grid grid-cols-3 gap-2 bg-secondary/30 p-1 rounded-2xl border border-border/50">
          <button
            type="button"
            onClick={() => setType("EXPENSE")}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              type === "EXPENSE" ? "bg-rose-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType("INCOME")}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              type === "INCOME" ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => setType("TRANSFER")}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              type === "TRANSFER" ? "bg-indigo-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Transfer
          </button>
        </div>

        {error && <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">{error}</div>}

        {/* Amount */}
        <Input
          label="Amount"
          type="number"
          step="any"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
          className="text-lg font-bold"
          required
        />

        {type !== "TRANSFER" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-secondary/30 px-3 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.currentBalance, acc.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-secondary/30 px-3 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                From Account
              </label>
              <select
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-secondary/30 px-3 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.currentBalance, acc.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                To Account
              </label>
              <select
                value={destinationAccountId}
                onChange={(e) => setDestinationAccountId(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-secondary/30 px-3 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.currentBalance, acc.currency)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Merchant / Payee"
            placeholder="e.g. Starbucks, Amazon, SBI"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
          />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <Input
          label="Description / Note"
          placeholder="e.g. Team lunch celebration"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Save Transaction
          </Button>
        </div>
      </form>
    </Modal>
  );
};
