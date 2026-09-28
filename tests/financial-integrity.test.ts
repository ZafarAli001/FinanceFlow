import { describe, it, expect } from "vitest";

function applyExpense(balance: number, amount: number) {
  if (amount <= 0) throw new Error("Amount must be greater than 0");
  return balance - amount;
}

function applyIncome(balance: number, amount: number) {
  if (amount <= 0) throw new Error("Amount must be greater than 0");
  return balance + amount;
}

function applyTransfer(sourceBal: number, destBal: number, amount: number) {
  if (amount <= 0) throw new Error("Amount must be greater than 0");
  return {
    sourceBal: sourceBal - amount,
    destBal: destBal + amount,
  };
}

describe("Financial Integrity & Calculations Unit Tests", () => {
  it("expense decreases account balance", () => {
    const initial = 10000;
    const result = applyExpense(initial, 350);
    expect(result).toBe(9650);
  });

  it("income increases account balance", () => {
    const initial = 10000;
    const result = applyIncome(initial, 5000);
    expect(result).toBe(15000);
  });

  it("atomic transfer updates both balances correctly without affecting net total", () => {
    const sourceInitial = 20000;
    const destInitial = 2000;
    const totalInitial = sourceInitial + destInitial;

    const { sourceBal, destBal } = applyTransfer(sourceInitial, destInitial, 5000);

    expect(sourceBal).toBe(15000);
    expect(destBal).toBe(7000);
    expect(sourceBal + destBal).toBe(totalInitial);
  });

  it("reversing old transaction effect restores previous balance", () => {
    let balance = 5000;
    const expenseAmount = 800;

    // Apply
    balance = applyExpense(balance, expenseAmount);
    expect(balance).toBe(4200);

    // Reverse
    balance += expenseAmount;
    expect(balance).toBe(5000);
  });
});
