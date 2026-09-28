"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ACCOUNT_TYPE_LABELS } from "@/lib/utils/constants";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accountToEdit?: any;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accountToEdit,
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<"BANK" | "CASH" | "WALLET" | "CREDIT_CARD" | "OTHER">("BANK");
  const [openingBalance, setOpeningBalance] = useState<number | "">(0);
  const [currency, setCurrency] = useState("INR");
  const [color, setColor] = useState("#3b82f6");
  const [icon, setIcon] = useState("Building");
  const [isDefault, setIsDefault] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name);
      setType(accountToEdit.type);
      setOpeningBalance(accountToEdit.openingBalance);
      setCurrency(accountToEdit.currency || "INR");
      setColor(accountToEdit.color || "#3b82f6");
      setIcon(accountToEdit.icon || "Building");
      setIsDefault(accountToEdit.isDefault);
    } else {
      setName("");
      setType("BANK");
      setOpeningBalance(0);
      setCurrency("INR");
      setColor("#3b82f6");
      setIcon("Building");
      setIsDefault(false);
    }
    setError(null);
  }, [isOpen, accountToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Account name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        name,
        type,
        openingBalance: Number(openingBalance) || 0,
        currency,
        color,
        icon,
        isDefault,
      };

      const url = accountToEdit ? `/api/accounts/${accountToEdit.id}` : "/api/accounts";
      const method = accountToEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save account");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const colors = ["#3b82f6", "#10b981", "#f43f5e", "#8b5cf6", "#eab308", "#06b6d4", "#ec4899", "#64748b"];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={accountToEdit ? "Edit Financial Account" : "Add New Financial Account"}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {error && <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">{error}</div>}

        <Input
          label="Account Name"
          placeholder="e.g. HDFC Salary Account, Cash Wallet, Credit Card"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Account Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full rounded-xl border border-border/50 bg-secondary/30 px-3 py-2.5 text-sm font-medium text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key} className="bg-card text-foreground">
                  {label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Opening Balance"
            type="number"
            step="any"
            placeholder="0.00"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value ? Number(e.target.value) : "")}
          />
        </div>

        {/* Color Palette */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Account Theme Color
          </label>
          <div className="flex items-center gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${
                  color === c ? "scale-125 ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:scale-110"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Set as Default Checkbox */}
        <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border/50 bg-secondary/30 cursor-pointer hover:bg-secondary/40 transition-colors">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary"
          />
          <div className="text-xs">
            <span className="font-semibold text-foreground">Set as Default Account</span>
            <p className="text-muted-foreground">Used automatically for voice and quick transaction entry</p>
          </div>
        </label>

        <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {accountToEdit ? "Update Account" : "Create Account"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
