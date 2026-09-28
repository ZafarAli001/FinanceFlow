"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Landmark, Banknote, Wallet2, CreditCard, Plus, Star, Trash2, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";
import { AccountModal } from "@/components/accounts/account-modal";
import { useDataSubscription, notifyDataChanged } from "@/lib/events/data-events";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useDataSubscription(fetchAccounts);

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setDefault" }),
      });
      if (res.ok) {
        fetchAccounts();
        notifyDataChanged();
      }
    } catch (err) {
      console.error("Failed to set default account:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete or archive this account?")) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAccounts();
        notifyDataChanged();
      }
    } catch (err) {
      console.error("Failed to delete account:", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "CASH": return Banknote;
      case "WALLET": return Wallet2;
      case "CREDIT_CARD": return CreditCard;
      default: return Landmark;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Financial Accounts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your bank accounts, cash balances, digital wallets & credit cards
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setSelectedAccount(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Add Account</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="h-32 bg-card/50 rounded-2xl" />
          <div className="h-32 bg-card/50 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const Icon = getIcon(acc.type);
            return (
              <div
                key={acc.id}
                className="p-5 rounded-2xl card-elevated flex flex-col justify-between space-y-4 group relative"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold"
                      style={{ backgroundColor: `${acc.color || "#6366f1"}20`, color: acc.color || "#6366f1" }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-base text-foreground flex items-center gap-2">
                        <span>{acc.name}</span>
                        {acc.isDefault && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold uppercase tracking-wider">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground uppercase font-medium tracking-wider">
                        {acc.type}
                      </span>
                    </div>
                  </div>

                  {!acc.isDefault && (
                    <button
                      onClick={() => handleSetDefault(acc.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                      title="Set as Default Account"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-border/50 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                      Current Balance
                    </span>
                    <div className="text-2xl font-black text-foreground">
                      {formatCurrency(acc.currentBalance, acc.currency)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setSelectedAccount(acc);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="p-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAccounts}
        accountToEdit={selectedAccount}
      />
    </div>
  );
}
