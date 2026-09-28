import { describe, it, expect, vi } from "vitest";
import { parseVoiceTranscript } from "../lib/ai/voice-parser";

// Mock DB services for unit testing
vi.mock("../lib/finance/account-service", () => ({
  getAccounts: vi.fn().mockResolvedValue([
    { id: "acc-1", name: "HDFC Bank", isDefault: true, currency: "INR", currentBalance: 50000 },
    { id: "acc-2", name: "Cash Wallet", isDefault: false, currency: "INR", currentBalance: 5000 },
    { id: "acc-3", name: "SBI Bank", isDefault: false, currency: "INR", currentBalance: 30000 },
  ]),
}));

vi.mock("../lib/finance/category-service", () => ({
  getCategories: vi.fn().mockResolvedValue([
    { id: "cat-1", name: "Dining", type: "EXPENSE" },
    { id: "cat-2", name: "Groceries", type: "EXPENSE" },
    { id: "cat-3", name: "Salary", type: "INCOME" },
    { id: "cat-4", name: "Freelance", type: "INCOME" },
    { id: "cat-5", name: "Other", type: "EXPENSE" },
  ]),
}));

describe("AI Voice Parser Natural Language Tests", () => {
  it("parses simple expense: 'Spent 300 on lunch'", async () => {
    const cmd = await parseVoiceTranscript("user-1", "Spent 300 on lunch");
    expect(cmd.intent).toBe("ADD_EXPENSE");
    expect(cmd.type).toBe("EXPENSE");
    expect(cmd.amount).toBe(300);
    expect(cmd.category).toBe("Dining");
  });

  it("parses account-specific expense: 'Spent 450 on groceries using HDFC'", async () => {
    const cmd = await parseVoiceTranscript("user-1", "Spent 450 on groceries using HDFC");
    expect(cmd.intent).toBe("ADD_EXPENSE");
    expect(cmd.amount).toBe(450);
    expect(cmd.account).toBe("HDFC Bank");
    expect(cmd.category).toBe("Groceries");
  });

  it("parses income command: 'Salary of 50000 came into SBI'", async () => {
    const cmd = await parseVoiceTranscript("user-1", "Salary of 50000 came into SBI");
    expect(cmd.intent).toBe("ADD_INCOME");
    expect(cmd.type).toBe("INCOME");
    expect(cmd.amount).toBe(50000);
    expect(cmd.account).toBe("SBI Bank");
  });

  it("parses transfer command: 'Move 1000 from HDFC to cash'", async () => {
    const cmd = await parseVoiceTranscript("user-1", "Move 1000 from HDFC to cash");
    expect(cmd.intent).toBe("TRANSFER");
    expect(cmd.type).toBe("TRANSFER");
    expect(cmd.amount).toBe(1000);
    expect(cmd.sourceAccount).toBe("HDFC Bank");
    expect(cmd.destinationAccount).toBe("Cash Wallet");
  });

  it("handles ambiguous input missing amount: 'Spent on lunch'", async () => {
    const cmd = await parseVoiceTranscript("user-1", "Spent on lunch");
    expect(cmd.intent).toBe("AMBIGUOUS");
    expect(cmd.clarificationQuestion).toContain("How much");
  });

  it("parses query intent: 'How much did I spend this month?'", async () => {
    const cmd = await parseVoiceTranscript("user-1", "How much did I spend this month?");
    expect(cmd.intent).toBe("QUERY_EXPENSES");
  });

  it("parses balance query: 'What is my HDFC balance?'", async () => {
    const cmd = await parseVoiceTranscript("user-1", "What is my HDFC balance?");
    expect(cmd.intent).toBe("QUERY_BALANCE");
    expect(cmd.account).toBe("HDFC Bank");
  });

  it("does NOT split single expense containing 'and': 'spent 500 on groceries and coffee'", async () => {
    const { splitVoiceTranscriptIntoSegments } = await import("../lib/ai/voice-parser");
    const segments = splitVoiceTranscriptIntoSegments("spent 500 on groceries and coffee");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toBe("spent 500 on groceries and coffee");
  });

  it("splits multiple expenses when multiple amounts exist: '500 for groceries and 200 for taxi'", async () => {
    const { splitVoiceTranscriptIntoSegments } = await import("../lib/ai/voice-parser");
    const segments = splitVoiceTranscriptIntoSegments("500 for groceries and 200 for taxi");
    expect(segments).toHaveLength(2);
    expect(segments[0]).toContain("500 for groceries");
    expect(segments[1]).toContain("200 for taxi");
  });

  it("extracts relative date of spend: 'Spent 500 on groceries yesterday'", async () => {
    const cmd = await parseVoiceTranscript("user-1", "Spent 500 on groceries yesterday");
    expect(cmd.intent).toBe("ADD_EXPENSE");
    expect(cmd.amount).toBe(500);
    expect(cmd.category).toBe("Groceries");
    expect(cmd.date).toBeDefined();

    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - 1);
    const expectedIso = expectedDate.toISOString().split("T")[0];
    expect(cmd.date).toBe(expectedIso);
    // Description should be clean without 'yesterday'
    expect(cmd.description?.toLowerCase()).not.toContain("yesterday");
  });

  it("extracts N days ago date of spend: 'Spent 800 on dinner 2 days ago'", async () => {
    const cmd = await parseVoiceTranscript("user-1", "Spent 800 on dinner 2 days ago");
    expect(cmd.amount).toBe(800);
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - 2);
    expect(cmd.date).toBe(expectedDate.toISOString().split("T")[0]);
  });

  it("does NOT split single expense containing relative date: 'spent 500 on groceries 2 days ago'", async () => {
    const { splitVoiceTranscriptIntoSegments } = await import("../lib/ai/voice-parser");
    const segments = splitVoiceTranscriptIntoSegments("spent 500 on groceries 2 days ago");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toBe("spent 500 on groceries 2 days ago");
  });

  it("does NOT split single expense containing quantity: 'spent 300 on 2 shirts'", async () => {
    const { splitVoiceTranscriptIntoSegments } = await import("../lib/ai/voice-parser");
    const segments = splitVoiceTranscriptIntoSegments("spent 300 on 2 shirts");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toBe("spent 300 on 2 shirts");
  });

  it("does NOT split single expense containing calendar date: 'spent 1200 on clothes on 15th march'", async () => {
    const { splitVoiceTranscriptIntoSegments } = await import("../lib/ai/voice-parser");
    const segments = splitVoiceTranscriptIntoSegments("spent 1200 on clothes on 15th march");
    expect(segments).toHaveLength(1);
  });

  it("does NOT split single expense containing time: 'spent 400 on dinner at 8 pm'", async () => {
    const { splitVoiceTranscriptIntoSegments } = await import("../lib/ai/voice-parser");
    const segments = splitVoiceTranscriptIntoSegments("spent 400 on dinner at 8 pm");
    expect(segments).toHaveLength(1);
  });

  it("guesses category automatically without asking user: 'Paid 350 to ABC store'", async () => {
    const cmd = await parseVoiceTranscript("user-1", "Paid 350 to ABC store");
    expect(cmd.amount).toBe(350);
    expect(cmd.category).toBeDefined();
    expect(cmd.clarificationQuestion).toBeUndefined();
    expect(cmd.missingFields).toBeUndefined();
  });

  it("does NOT split single expense containing table/identifier: 'spent 500 at table 4'", async () => {
    const { splitVoiceTranscriptIntoSegments } = await import("../lib/ai/voice-parser");
    const segments = splitVoiceTranscriptIntoSegments("spent 500 at table 4");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toBe("spent 500 at table 4");
  });

  it("does NOT split single expense containing items: 'spent 250 for 2 burgers'", async () => {
    const { splitVoiceTranscriptIntoSegments } = await import("../lib/ai/voice-parser");
    const segments = splitVoiceTranscriptIntoSegments("spent 250 for 2 burgers");
    expect(segments).toHaveLength(1);
  });
});

