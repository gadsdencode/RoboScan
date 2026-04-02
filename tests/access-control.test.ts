import { beforeEach, describe, expect, it, vi } from "vitest";
import { FEATURES } from "../shared/tiers";

const { mockStorage } = vi.hoisted(() => ({
  mockStorage: {
    getUserActiveSubscription: vi.fn(),
    getUserLlmsFieldPurchases: vi.fn(),
    getUserRobotsFieldPurchases: vi.fn(),
    getPurchaseByScanId: vi.fn(),
    hasUserPurchasedField: vi.fn(),
    hasUserPurchasedRobotsField: vi.fn(),
    getScan: vi.fn(),
  },
}));

vi.mock("../server/storage", () => ({
  storage: mockStorage,
}));

vi.mock("../server/utils/admin", () => ({
  isAdmin: vi.fn(() => false),
}));

import { checkFeatureAccess } from "../server/utils/accessControl";

describe("checkFeatureAccess scan purchase ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.getUserActiveSubscription.mockResolvedValue(undefined);
    mockStorage.getUserLlmsFieldPurchases.mockResolvedValue([]);
    mockStorage.getUserRobotsFieldPurchases.mockResolvedValue([]);
  });

  it("grants access when authenticated user owns purchased scan", async () => {
    mockStorage.getScan.mockResolvedValue({ id: 9, userId: "u1" });
    mockStorage.getPurchaseByScanId.mockResolvedValue({ id: 1, scanId: 9 });

    const result = await checkFeatureAccess(
      { user: { claims: { sub: "u1" } } },
      FEATURES.FULL_SCAN_DETAILS,
      { scanId: 9 }
    );

    expect(result.hasAccess).toBe(true);
    expect(result.reason).toBe("purchase");
  });

  it("denies access when purchase exists for scan owned by another user", async () => {
    mockStorage.getScan.mockResolvedValue({ id: 9, userId: "other-user" });
    mockStorage.getPurchaseByScanId.mockResolvedValue({ id: 1, scanId: 9 });

    const result = await checkFeatureAccess(
      { user: { claims: { sub: "u1" } } },
      FEATURES.FULL_SCAN_DETAILS,
      { scanId: 9 }
    );

    expect(result.hasAccess).toBe(false);
  });
});
