"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Coins,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deriveClientAuthHash } from "@/lib/crypto/e2ee";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute password strength
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const strengthColors = [
    "bg-rose-500",
    "bg-rose-400",
    "bg-amber-400",
    "bg-emerald-400",
    "bg-emerald-500",
  ];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Derive client-side zero-knowledge hash
      const authPayloadPassword = await deriveClientAuthHash(password, email);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: authPayloadPassword,
          currency,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account.");
      }

      // Success: redirect to dashboard
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to register. Please check your details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden py-10">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-indigo-600/15 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 shadow-xl shadow-indigo-500/25 mb-2">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Create Encrypted Account
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Zero-knowledge client encryption for your personal finances
          </p>
        </div>

        {/* Card */}
        <div className="p-6 sm:p-8 rounded-3xl card-elevated border border-border/50 shadow-2xl backdrop-blur-xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 animate-fadeInUp">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name */}
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              leftIcon={<User className="w-4 h-4 text-muted-foreground" />}
            />

            {/* Email Address */}
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={<Mail className="w-4 h-4 text-muted-foreground" />}
            />

            {/* Base Currency Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-primary" />
                Base Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-secondary/30 border border-border/50 rounded-xl text-foreground text-sm font-medium focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="INR" className="bg-card text-foreground">INR (₹) — Indian Rupee</option>
                <option value="USD" className="bg-card text-foreground">USD ($) — US Dollar</option>
                <option value="EUR" className="bg-card text-foreground">EUR (€) — Euro</option>
                <option value="GBP" className="bg-card text-foreground">GBP (£) — British Pound</option>
                <option value="CAD" className="bg-card text-foreground">CAD ($) — Canadian Dollar</option>
                <option value="AUD" className="bg-card text-foreground">AUD ($) — Australian Dollar</option>
                <option value="JPY" className="bg-card text-foreground">JPY (¥) — Japanese Yen</option>
                <option value="AED" className="bg-card text-foreground">AED (د.إ) — UAE Dirham</option>
              </select>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
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

              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1 h-1.5 w-full">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          strength >= step ? strengthColors[strength] : "bg-secondary"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground flex justify-between font-medium">
                    <span>Strength: {strengthLabels[strength]}</span>
                    <span>Use 8+ chars, numbers & symbols</span>
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-secondary/30 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                {confirmPassword && password === confirmPassword && (
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              variant="primary"
              type="submit"
              isLoading={isLoading}
              className="w-full py-3 rounded-xl font-semibold shadow-lg shadow-indigo-500/25 mt-3 flex items-center justify-center gap-2"
            >
              Create Account <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* E2EE Guarantee Banner */}
          <div className="p-3.5 rounded-2xl bg-secondary/20 border border-border/40 space-y-1 text-left">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero-Knowledge Architecture</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your password generates a local PBKDF2 hash before reaching our servers. Your financial data and transactions remain completely private to your account.
            </p>
          </div>
        </div>

        {/* Footer Link to Login */}
        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
          >
            Sign in to existing account
          </Link>
        </p>
      </div>
    </div>
  );
}
