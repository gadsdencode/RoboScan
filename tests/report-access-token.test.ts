import { beforeEach, describe, expect, it } from "vitest";
import {
  createGuestReportAccessToken,
  verifyGuestReportAccessToken,
} from "../server/utils/reportAccessToken";

describe("reportAccessToken", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("creates and verifies a token for the same scan", () => {
    const token = createGuestReportAccessToken(42, "pi_123");
    const claims = verifyGuestReportAccessToken(token, 42);

    expect(claims).not.toBeNull();
    expect(claims?.scanId).toBe(42);
    expect(claims?.paymentIntentId).toBe("pi_123");
  });

  it("rejects token when expected scan id does not match", () => {
    const token = createGuestReportAccessToken(42, "pi_123");
    const claims = verifyGuestReportAccessToken(token, 99);
    expect(claims).toBeNull();
  });

  it("rejects malformed token", () => {
    const claims = verifyGuestReportAccessToken("not-a-token", 42);
    expect(claims).toBeNull();
  });
});
