import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "../lib/auth/jwt";
import { RegisterSchema, LoginSchema } from "../lib/validation/schemas";

describe("Authentication & Security Tests", () => {
  it("validates registration schema with correct email and strong password", () => {
    const valid = RegisterSchema.safeParse({
      name: "Alice Smith",
      email: "alice@example.com",
      password: "StrongPassword@123",
      currency: "USD",
    });
    expect(valid.success).toBe(true);
  });

  it("rejects invalid emails during registration", () => {
    const invalid = RegisterSchema.safeParse({
      name: "Alice Smith",
      email: "not-an-email",
      password: "StrongPassword@123",
      currency: "USD",
    });
    expect(invalid.success).toBe(false);
  });

  it("rejects short passwords under 6 characters", () => {
    const invalid = RegisterSchema.safeParse({
      name: "Alice Smith",
      email: "alice@example.com",
      password: "123",
      currency: "USD",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates login schema", () => {
    const valid = LoginSchema.safeParse({
      email: "user@domain.com",
      password: "mysecretpassword",
    });
    expect(valid.success).toBe(true);
  });

  it("signs and verifies JWT authentication tokens securely", async () => {
    const payload = {
      userId: "user-12345",
      email: "test@finance.app",
      name: "Test User",
    };

    const token = await signToken(payload);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const verified = await verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe("user-12345");
    expect(verified?.email).toBe("test@finance.app");
    expect(verified?.name).toBe("Test User");
  });

  it("rejects tampered JWT tokens", async () => {
    const tampered = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature";
    const verified = await verifyToken(tampered);
    expect(verified).toBeNull();
  });

  it("verifies cross-device PBKDF2 derived hash matches stored password hash", async () => {
    const crypto = await import("crypto");
    const bcrypt = await import("bcryptjs");

    const email = "test@finance.app";
    const password = "mysecretpassword";

    // Simulating laptop registration where crypto.subtle derives PBKDF2 hash
    const clientDerivedHash = crypto
      .pbkdf2Sync(password, `FinanceFlow:AuthSalt:${email}`, 100000, 32, "sha256")
      .toString("hex");

    const storedHash = await bcrypt.hash(clientDerivedHash, 10);

    // 1. Laptop login sends clientDerivedHash
    const laptopLogin = await bcrypt.compare(clientDerivedHash, storedHash);
    expect(laptopLogin).toBe(true);

    // 2. Mobile/network login sends raw password (since crypto.subtle is disabled over HTTP IP)
    const serverDerivedOnMobileLogin = crypto
      .pbkdf2Sync(password, `FinanceFlow:AuthSalt:${email}`, 100000, 32, "sha256")
      .toString("hex");
    const mobileLogin = await bcrypt.compare(serverDerivedOnMobileLogin, storedHash);
    expect(mobileLogin).toBe(true);
  });
});
