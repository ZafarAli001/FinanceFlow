"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, Plus } from "lucide-react";
import { useDataSubscription, notifyDataChanged } from "@/lib/events/data-events";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (typeFilter) params.append("type", typeFilter);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useDataSubscription(fetchTransactions);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTransactions();
        notifyDataChanged();
      }
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Transaction History</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total {total} transactions recorded in your primary database
          </p>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by merchant, category, description, account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-border/50 bg-secondary/30 px-3 py-2.5 text-sm font-medium text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Types</option>
            <option value="EXPENSE">Expense Only</option>
            <option value="INCOME">Income Only</option>
            <option value="TRANSFER">Transfers Only</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 bg-card/50 rounded-2xl" />
          <div className="h-16 bg-card/50 rounded-2xl" />
          <div className="h-16 bg-card/50 rounded-2xl" />
        </div>
      ) : (
        <RecentTransactions transactions={transactions} onDelete={handleDelete} />
      )}
    </div>
  );
}
