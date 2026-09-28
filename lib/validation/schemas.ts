import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  currency: z.string().default("INR"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const AccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["BANK", "CASH", "WALLET", "CREDIT_CARD", "OTHER"]),
  openingBalance: z.number().default(0),
  currency: z.string().default("INR"),
  icon: z.string().optional(),
  color: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const UpdateAccountSchema = AccountSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

export const TransactionSchema = z.object({
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.string().default("INR"),
  accountId: z.string().min(1, "Account is required"),
  sourceAccountId: z.string().optional(),
  destinationAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  merchant: z.string().optional(),
  description: z.string().optional(),
  note: z.string().optional(),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  time: z.string().optional(),
  tags: z.string().optional(),
  clientId: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === "TRANSFER") {
      return (
        !!data.sourceAccountId &&
        !!data.destinationAccountId &&
        data.sourceAccountId !== data.destinationAccountId
      );
    }
    return true;
  },
  {
    message: "Transfer requires different source and destination accounts",
    path: ["destinationAccountId"],
  }
);

export const CategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  type: z.enum(["EXPENSE", "INCOME"]),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const BudgetSchema = z.object({
  categoryId: z.string().nullable().optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be in YYYY-MM format"),
  amount: z.number().positive("Budget amount must be greater than 0"),
});

export const VoiceCommandInputSchema = z.object({
  transcript: z.string().min(1, "Transcript cannot be empty"),
  contextAccountId: z.string().optional(),
});

export const VoiceParsedCommandSchema = z.object({
  intent: z.enum([
    "ADD_EXPENSE",
    "ADD_INCOME",
    "TRANSFER",
    "QUERY_BALANCE",
    "QUERY_EXPENSES",
    "QUERY_INCOME",
    "QUERY_ANALYTICS",
    "AMBIGUOUS",
  ]),
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]).optional(),
  amount: z.number().optional(),
  currency: z.string().default("INR"),
  account: z.string().optional(),
  sourceAccount: z.string().optional(),
  destinationAccount: z.string().optional(),
  category: z.string().optional(),
  merchant: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  confidence: z.number().min(0).max(1),
  clarificationQuestion: z.string().optional(),
  missingFields: z.array(z.string()).optional(),
  answer: z.string().optional(), // For QUERY intent
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type AccountInput = z.infer<typeof AccountSchema>;
export type TransactionInput = z.infer<typeof TransactionSchema>;
export type CategoryInput = z.infer<typeof CategorySchema>;
export type BudgetInput = z.infer<typeof BudgetSchema>;
export type VoiceParsedCommand = z.infer<typeof VoiceParsedCommandSchema>;
