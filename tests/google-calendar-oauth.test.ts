import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import {
  decryptGoogleRefreshToken,
  encryptGoogleRefreshToken,
  getGoogleOAuthConfigurationStatus,
  hasGoogleCalendarWriteScope,
} from "@/lib/google-calendar-oauth";

const originalGoogleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const originalGoogleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;
const originalNextAuthUrl = process.env.NEXTAUTH_URL;

beforeEach(() => {
  process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-client-secret";
  process.env.NEXTAUTH_SECRET = "test-secret-that-is-long-enough-for-encryption";
  process.env.NEXTAUTH_URL = "https://rockthecards.example";
});

afterAll(() => {
  const originalValues = {
    GOOGLE_OAUTH_CLIENT_ID: originalGoogleClientId,
    GOOGLE_OAUTH_CLIENT_SECRET: originalGoogleClientSecret,
    NEXTAUTH_SECRET: originalNextAuthSecret,
    NEXTAUTH_URL: originalNextAuthUrl,
  };

  for (const [name, value] of Object.entries(originalValues)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

describe("Google Calendar OAuth token encryption", () => {
  test("round-trips a refresh token without storing it in plain text", () => {
    const refreshToken = "1//test-refresh-token";
    const encryptedToken = encryptGoogleRefreshToken(refreshToken);

    expect(encryptedToken).not.toContain(refreshToken);
    expect(decryptGoogleRefreshToken(encryptedToken)).toBe(refreshToken);
  });

  test("rejects an altered encrypted token", () => {
    const encryptedToken = encryptGoogleRefreshToken("1//test-refresh-token");
    const parts = encryptedToken.split(".");
    const encodedToken = parts[3];

    if (!encodedToken) {
      throw new Error("The encrypted token fixture is invalid.");
    }

    parts[3] = `${encodedToken[0] === "A" ? "B" : "A"}${encodedToken.slice(1)}`;

    expect(() => decryptGoogleRefreshToken(parts.join("."))).toThrow(
      "cannot be decrypted",
    );
  });

  test("rejects a token after the NextAuth secret changes", () => {
    const encryptedToken = encryptGoogleRefreshToken("1//test-refresh-token");
    process.env.NEXTAUTH_SECRET = "a-different-nextauth-secret";

    expect(() => decryptGoogleRefreshToken(encryptedToken)).toThrow(
      "cannot be decrypted",
    );
  });
});

describe("Google Calendar OAuth configuration", () => {
  test("builds the callback URL from the canonical NextAuth URL", () => {
    expect(getGoogleOAuthConfigurationStatus()).toEqual({
      ready: true,
      redirectUri:
        "https://rockthecards.example/api/admin/google-calendar/callback",
    });
  });

  test("rejects insecure non-local callback origins", () => {
    process.env.NEXTAUTH_URL = "http://rockthecards.example";

    expect(getGoogleOAuthConfigurationStatus()).toEqual({
      ready: false,
      redirectUri: null,
    });
  });
});

describe("Google Calendar OAuth scopes", () => {
  test("accepts the least-privilege owned-events scope", () => {
    expect(
      hasGoogleCalendarWriteScope(
        "openid https://www.googleapis.com/auth/calendar.events.owned",
      ),
    ).toBe(true);
  });

  test("accepts broader compatible calendar write scopes", () => {
    expect(
      hasGoogleCalendarWriteScope(
        "https://www.googleapis.com/auth/calendar.events",
      ),
    ).toBe(true);
    expect(
      hasGoogleCalendarWriteScope(
        "https://www.googleapis.com/auth/calendar",
      ),
    ).toBe(true);
  });

  test("rejects identity-only and read-only grants", () => {
    expect(
      hasGoogleCalendarWriteScope(
        "openid https://www.googleapis.com/auth/userinfo.email",
      ),
    ).toBe(false);
    expect(
      hasGoogleCalendarWriteScope(
        "https://www.googleapis.com/auth/calendar.events.readonly",
      ),
    ).toBe(false);
    expect(hasGoogleCalendarWriteScope(undefined)).toBe(false);
  });
});
