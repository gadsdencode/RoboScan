import jwt from "jsonwebtoken";

const REPORT_ACCESS_TOKEN_TTL = "90d";

interface ReportAccessTokenClaims {
  scanId: number;
  paymentIntentId: string;
  type: "guest_report_access";
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required for report access tokens");
  }
  return secret;
}

export function createGuestReportAccessToken(
  scanId: number,
  paymentIntentId: string
): string {
  const claims: ReportAccessTokenClaims = {
    scanId,
    paymentIntentId,
    type: "guest_report_access",
  };

  return jwt.sign(claims, getJwtSecret(), {
    expiresIn: REPORT_ACCESS_TOKEN_TTL,
  });
}

export function verifyGuestReportAccessToken(
  token: string,
  expectedScanId: number
): ReportAccessTokenClaims | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as Partial<ReportAccessTokenClaims>;
    if (
      decoded.type !== "guest_report_access" ||
      typeof decoded.scanId !== "number" ||
      typeof decoded.paymentIntentId !== "string"
    ) {
      return null;
    }

    if (decoded.scanId !== expectedScanId) {
      return null;
    }

    return decoded as ReportAccessTokenClaims;
  } catch {
    return null;
  }
}
