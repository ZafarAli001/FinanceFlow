"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { VoiceAssistantModal } from "../voice/voice-assistant-modal";
import { TransactionModal } from "../transactions/transaction-modal";
import { AccountModal } from "../accounts/account-modal";
import { BackupModal } from "../backup/backup-modal";
import { registerAutoSync } from "@/lib/sync/sync-engine";
import { notifyDataChanged } from "@/lib/events/data-events";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = Boolean(
    pathname && (pathname.startsWith("/login") || pathname.startsWith("/signup"))
  );

  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const fetchGlobalData = async () => {
    try {
      const [accRes, catRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/categories"),
      ]);

      if (accRes.status === 401 || catRes.status === 401) {
        if (!isAuthPage) {
          window.location.href = "/login";
        }
        return;
      }

      if (accRes.ok) {
        const data = await accRes.json();
        setAccounts(data.accounts || []);
      }

      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch global app shell data:", error);
    }
  };

  const handleModalSuccess = () => {
    fetchGlobalData();
    notifyDataChanged();
  };

  useEffect(() => {
    fetchGlobalData();
    registerAutoSync();

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registered successfully:", reg.scope))
        .catch((err) => console.error("Service Worker registration failed:", err));
    }
  }, []);

  const handleOpenQuickAdd = (type: string = "EXPENSE") => {
    setTransactionType(type as any);
    setIsTransactionOpen(true);
  };

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar
        onOpenVoice={() => setIsVoiceOpen(true)}
        onOpenQuickAdd={handleOpenQuickAdd}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        <Header
          onOpenVoice={() => setIsVoiceOpen(true)}
          onOpenQuickAdd={handleOpenQuickAdd}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav onOpenVoice={() => setIsVoiceOpen(true)} />

      {/* Modals */}
      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onSuccess={handleModalSuccess}
        accounts={accounts}
        categories={categories}
      />

      <TransactionModal
        isOpen={isTransactionOpen}
        onClose={() => setIsTransactionOpen(false)}
        onSuccess={handleModalSuccess}
        initialType={transactionType}
        accounts={accounts}
        categories={categories}
      />

      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
