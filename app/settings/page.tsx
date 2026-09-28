"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  LogOut,
  Sparkles,
  Lock,
  Coins,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  Database,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings & Security</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          End-to-end encrypted profile, zero-knowledge security, and system status
        </p>
      </div>

      <div className="space-y-5">
        {/* User Profile Card */}
        <div className="p-6 rounded-2xl card-elevated border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-foreground">{user?.name || "Loading..."}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active Session
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{user?.email || "user@finance.app"}</p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Coins className="w-3.5 h-3.5 text-primary" /> Currency: {user?.currency || "INR"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              isLoading={isLoggingOut}
              className="text-rose-400 hover:text-rose-300 border-rose-500/20 hover:bg-rose-500/10 gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* End-to-End Encryption Assurance */}
        <div className="p-6 rounded-2xl card-elevated border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent space-y-3">
          <div className="flex items-center gap-2.5 font-bold text-sm text-foreground">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span>End-to-End Zero-Knowledge Security</span>
              <p className="text-[11px] font-normal text-muted-foreground">Active 256-Bit PBKDF2 + AES-GCM Protection</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your login authentication uses deterministic client-side key derivation so that raw passwords never cross the network. All accounts, transactions, voice inputs, and categories are tied specifically to your authenticated user account.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 text-xs">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Hashing</span>
              <span className="font-bold text-foreground">PBKDF2 SHA-256</span>
            </div>
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 text-xs">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Session Token</span>
              <span className="font-bold text-foreground">Signed JWT (30-day)</span>
            </div>
            <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 text-xs">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Cookie Security</span>
              <span className="font-bold text-emerald-400">HttpOnly • SameSite Lax</span>
            </div>
          </div>
        </div>

        {/* System & Architecture Info */}
        <div className="p-6 rounded-2xl card-elevated border border-border/50 space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Architecture & Synchronization
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/20 border border-border/40">
              <span className="text-muted-foreground flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-primary" /> Application Mode
              </span>
              <span className="font-bold text-foreground">PWA • Standalone Ready</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/20 border border-border/40">
              <span className="text-muted-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" /> Database Engine
              </span>
              <span className="font-bold text-foreground">SQLite / Prisma ORM</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/20 border border-border/40">
              <span className="text-muted-foreground flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-400" /> Offline Sync Queue
              </span>
              <span className="font-bold text-emerald-400">IndexedDB Auto-Sync</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/20 border border-border/40">
              <span className="text-muted-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" /> Voice Processing
              </span>
              <span className="font-bold text-foreground">Local Web Speech API</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
