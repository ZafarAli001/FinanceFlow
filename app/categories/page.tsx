"use client";

import React, { useState, useEffect } from "react";
import { DynamicIcon } from "@/components/ui/icon";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [color, setColor] = useState("#3b82f6");

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, color, icon: "Tag" }),
      });

      if (res.ok) {
        setName("");
        setIsModalOpen(false);
        fetchCategories();
      }
    } catch (err) {
      console.error("Failed to create category:", err);
    }
  };

  const expenseCats = categories.filter((c) => c.type === "EXPENSE");
  const incomeCats = categories.filter((c) => c.type === "INCOME");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Financial Categories</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize your expenses and income with structured custom categories
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          <span>New Category</span>
        </Button>
      </div>

      <div className="space-y-8">
        {/* Expense Categories */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Expense Categories ({expenseCats.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {expenseCats.map((cat) => (
              <div key={cat.id} className="p-3 rounded-xl card-elevated flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${cat.color || "#f97316"}20`, color: cat.color || "#f97316" }}
                >
                  <DynamicIcon name={cat.icon || "Utensils"} className="w-4 h-4" />
                </div>
                <span className="font-semibold text-xs text-foreground truncate">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Income Categories */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Income Categories ({incomeCats.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {incomeCats.map((cat) => (
              <div key={cat.id} className="p-3 rounded-xl card-elevated flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${cat.color || "#10b981"}20`, color: cat.color || "#10b981" }}
                >
                  <DynamicIcon name={cat.icon || "Briefcase"} className="w-4 h-4" />
                </div>
                <span className="font-semibold text-xs text-foreground truncate">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Custom Category">
        <form onSubmit={handleCreateCategory} className="space-y-4 py-1">
          <Input label="Category Name" value={name} onChange={(e) => setName(e.target.value)} required />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full rounded-xl border border-border/50 bg-secondary/30 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="EXPENSE">Expense Category</option>
              <option value="INCOME">Income Category</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
