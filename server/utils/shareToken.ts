// server/utils/shareToken.ts
// Signed, stable token used in public share URLs (/s/:token). Encodes only the
// scanId; the public summary endpoint enforces the non-sensitive allowlist.

import jwt from "jsonwebtoken";

const SHARE_TOKEN_TTL = "365d";
const SHARE_TOKEN_TYPE = "public_scan_share";

interface ScanShareTokenClaims {
  scanId: number;
  type: typeof SHARE_TOKEN_TYPE;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required for share tokens");
  }
  return secret;
}

export function createScanShareToken(scanId: number): string {
  const claims: ScanShareTokenClaims = { scanId, type: SHARE_TOKEN_TYPE };
  return jwt.sign(claims, getJwtSecret(), { expiresIn: SHARE_TOKEN_TTL });
}

export function verifyScanShareToken(token: string): { scanId: number } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as Partial<ScanShareTokenClaims>;
    if (decoded.type !== SHARE_TOKEN_TYPE || typeof decoded.scanId !== "number") {
      return null;
    }
    return { scanId: decoded.scanId };
  } catch {
    return null;
  }
}
