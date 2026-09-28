"use client";

import { useEffect } from "react";

const DATA_UPDATED_EVENT = "finance:data-updated";

/**
 * Dispatch global custom event when financial data changes
 * (transactions, accounts, budgets, categories, imports).
 */
export function notifyDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT));
  }
}

/**
 * React hook to auto-subscribe any page or component to data updates.
 */
export function useDataSubscription(onUpdate: () => void) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUpdate = () => {
      onUpdate();
    };

    window.addEventListener(DATA_UPDATED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(DATA_UPDATED_EVENT, handleUpdate);
    };
  }, [onUpdate]);
}
