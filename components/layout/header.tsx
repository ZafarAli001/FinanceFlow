"use client";

import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, Sparkles, Plus, Mic, ArrowLeftRight, CheckCircle2, RefreshCw, AlertTriangle, XCircle, Search, Bell } from "lucide-react";
import { Button } from "../ui/button";
import { subscribeSyncStatus, syncOfflineQueue } from "@/lib/sync/sync-engine";

interface HeaderProps {
  onOpenVoice: () => void;
  onOpenQuickAdd: (type?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenVoice, onOpenQuickAdd }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<{
    state: "SYNCED" | "SYNCING" | "PENDING" | "FAILED";
    pendingCount: number;
    message?: string;
  }>({
    state: "SYNCED",
    pendingCount: 0,
  });

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const unsubscribe = subscribeSyncStatus((status) => {
      setSyncStatus(status);
    });

    const handleOnline = async () => {
      setIsOnline(true);
      await syncOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus((prev) => ({ ...prev, state: "PENDING" }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const getSyncBadge = () => {
    if (!isOnline) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold">
          <WifiOff className="w-3 h-3 animate-pulse" />
          <span>Offline</span>
        </div>
      );
    }

    switch (syncStatus.state) {
      case "SYNCING":
        return (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-semibold">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Syncing</span>
          </div>
        );
      case "PENDING":
        return (
          <button
            onClick={() => syncOfflineQueue()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold hover:bg-amber-500/20 transition-colors"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>{syncStatus.pendingCount || 1} Pending</span>
          </button>
        );
      case "FAILED":
        return (
          <button
            onClick={() => syncOfflineQueue()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-semibold hover:bg-rose-500/20 transition-colors"
          >
            <XCircle className="w-3 h-3" />
            <span>Retry Sync</span>
          </button>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            <span>Synced</span>
          </div>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-background/70 backdrop-blur-xl border-b border-border/50 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left - Mobile Brand / Sync */}
        <div className="flex items-center gap-3">
          <div className="md:hidden flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground">FinanceFlow</span>
          </div>

          <div className="hidden sm:flex items-center">{getSyncBadge()}</div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenVoice}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200 text-xs font-medium"
          >
            <div className="relative">
              <Mic className="w-4 h-4" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="hidden sm:inline">Voice</span>
          </button>

          <button
            onClick={() => onOpenQuickAdd("TRANSFER")}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-border/50 transition-all duration-200 text-xs font-medium"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>

          <button
            onClick={() => onOpenQuickAdd("EXPENSE")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] transition-all duration-200 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Entry</span>
          </button>

          <a
            href="/settings"
            className="w-8 h-8 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 ml-1"
            title="Account & Security"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </a>
        </div>
      </div>
    </header>
  );
};
