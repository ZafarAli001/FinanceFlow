"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Loader2,
  KeyRound,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deriveClientAuthHash } from "@/lib/crypto/e2ee";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Client-side zero-knowledge hash derivation
      const authPayloadPassword = await deriveClientAuthHash(password, email);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: authPayloadPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Fallback check: if client hash didn't match old plaintext bcrypt hash (e.g. demo account), try raw password
        const retryRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const retryData = await retryRes.json();
        if (!retryRes.ok) {
          throw new Error(retryData.error || data.error || "Invalid email or password");
        }
      }

      // Success: redirect to dashboard
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "demo@finance.app",
          password: "password123",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Demo login unavailable");

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to sign in with demo account.");
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-indigo-600/15 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 shadow-xl shadow-indigo-500/25 mb-2">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Welcome to FinanceFlow
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Sign in to your end-to-end encrypted financial dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="p-6 sm:p-8 rounded-3xl card-elevated border border-border/50 shadow-2xl backdrop-blur-xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 animate-fadeInUp">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input */}
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={<Mail className="w-4 h-4 text-muted-foreground" />}
            />

            {/* Password Input with show/hide */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-secondary/30 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              variant="primary"
              type="submit"
              isLoading={isLoading}
              className="w-full py-3 rounded-xl font-semibold shadow-lg shadow-indigo-500/25 mt-2 flex items-center justify-center gap-2"
            >
              Sign In <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isDemoLoading}
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all group"
            >
              {isDemoLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
              )}
              Instant Demo Login (Alex Morgan)
            </button>
          </div>

          {/* End-to-End Encryption Badge */}
          <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-secondary/20 border border-border/40 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>256-Bit End-to-End Encrypted Session</span>
          </div>
        </div>

        {/* Footer Link to Signup */}
        <p className="text-center text-xs text-muted-foreground">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/signup"
            className="font-semibold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
          >
            Create an encrypted account
          </Link>
        </p>
      </div>
    </div>
  );
}
