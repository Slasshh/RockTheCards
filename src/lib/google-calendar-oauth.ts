import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { google } from "googleapis";

const CALLBACK_PATH = "/api/admin/google-calendar/callback";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_CONTEXT = Buffer.from(
  "rockthecards/google-calendar/refresh-token/v1",
  "utf8",
);
const ENCRYPTION_VERSION = "v1";
const MAX_REFRESH_TOKEN_LENGTH = 8_192;

export const GOOGLE_CALENDAR_CONNECTION_ID = 1;
export const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.events.owned",
] as const;
const GOOGLE_CALENDAR_WRITE_SCOPES = new Set([
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.events.owned",
]);
export const GOOGLE_OAUTH_CODE_VERIFIER_COOKIE =
  "rtc-google-oauth-code-verifier";
export const GOOGLE_OAUTH_STATE_COOKIE = "rtc-google-oauth-state";

export type GoogleOAuthConfigurationStatus = {
  ready: boolean;
  redirectUri: string | null;
};

export type VerifiedGoogleAccount = {
  email: string;
  id: string;
};

export class MissingGoogleCalendarScopeError extends Error {
  constructor() {
    super("Google Calendar write permission was not granted.");
    this.name = "MissingGoogleCalendarScopeError";
  }
}

export function hasGoogleCalendarWriteScope(
  grantedScopes: string | null | undefined,
) {
  if (!grantedScopes) {
    return false;
  }

  return grantedScopes
    .split(/\s+/)
    .some((scope) => GOOGLE_CALENDAR_WRITE_SCOPES.has(scope));
}

function readRequiredEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for Google Calendar OAuth.`);
  }

  return value;
}

function buildGoogleOAuthRedirectUri() {
  const appUrlValue = readRequiredEnvironmentVariable("NEXTAUTH_URL");
  let appUrl: URL;

  try {
    appUrl = new URL(appUrlValue);
  } catch {
    throw new Error("NEXTAUTH_URL must be a valid absolute URL.");
  }

  const isLocalHttp =
    appUrl.protocol === "http:" &&
    (appUrl.hostname === "localhost" || appUrl.hostname === "127.0.0.1");

  if (appUrl.protocol !== "https:" && !isLocalHttp) {
    throw new Error(
      "NEXTAUTH_URL must use HTTPS outside of local development.",
    );
  }

  if (appUrl.username || appUrl.password) {
    throw new Error("NEXTAUTH_URL must not contain credentials.");
  }

  return new URL(CALLBACK_PATH, appUrl.origin).toString();
}

function getEncryptionKey() {
  const nextAuthSecret = readRequiredEnvironmentVariable("NEXTAUTH_SECRET");

  return createHash("sha256")
    .update("rockthecards/google-calendar/encryption-key/v1\0", "utf8")
    .update(nextAuthSecret, "utf8")
    .digest();
}

function validateRefreshToken(refreshToken: string) {
  const normalizedToken = refreshToken.trim();

  if (
    !normalizedToken ||
    normalizedToken.length > MAX_REFRESH_TOKEN_LENGTH ||
    /[\r\n]/.test(normalizedToken)
  ) {
    throw new Error("Google returned an invalid OAuth refresh token.");
  }

  return normalizedToken;
}

export function getGoogleOAuthConfigurationStatus(): GoogleOAuthConfigurationStatus {
  let redirectUri: string | null = null;

  try {
    redirectUri = buildGoogleOAuthRedirectUri();
  } catch {
    return { ready: false, redirectUri: null };
  }

  return {
    ready: Boolean(
      process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
        process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() &&
        process.env.NEXTAUTH_SECRET?.trim(),
    ),
    redirectUri,
  };
}

export function getGoogleOAuthRedirectUri() {
  return buildGoogleOAuthRedirectUri();
}

export function createGoogleOAuthClient() {
  return new google.auth.OAuth2(
    readRequiredEnvironmentVariable("GOOGLE_OAUTH_CLIENT_ID"),
    readRequiredEnvironmentVariable("GOOGLE_OAUTH_CLIENT_SECRET"),
    buildGoogleOAuthRedirectUri(),
  );
}

export type GoogleOAuthClient = ReturnType<typeof createGoogleOAuthClient>;

export function encryptGoogleRefreshToken(refreshToken: string) {
  const normalizedToken = validateRefreshToken(refreshToken);
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    initializationVector,
  );
  cipher.setAAD(ENCRYPTION_CONTEXT);
  const encryptedToken = Buffer.concat([
    cipher.update(normalizedToken, "utf8"),
    cipher.final(),
  ]);
  const authenticationTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    initializationVector.toString("base64url"),
    authenticationTag.toString("base64url"),
    encryptedToken.toString("base64url"),
  ].join(".");
}

export function decryptGoogleRefreshToken(encryptedRefreshToken: string) {
  const [version, encodedIv, encodedTag, encodedToken, ...unexpectedParts] =
    encryptedRefreshToken.split(".");

  if (
    version !== ENCRYPTION_VERSION ||
    !encodedIv ||
    !encodedTag ||
    !encodedToken ||
    unexpectedParts.length > 0
  ) {
    throw new Error("The stored Google OAuth token has an invalid format.");
  }

  try {
    const initializationVector = Buffer.from(encodedIv, "base64url");
    const authenticationTag = Buffer.from(encodedTag, "base64url");
    const encryptedToken = Buffer.from(encodedToken, "base64url");

    if (initializationVector.length !== 12 || authenticationTag.length !== 16) {
      throw new Error("Invalid encrypted token metadata.");
    }

    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      getEncryptionKey(),
      initializationVector,
    );
    decipher.setAAD(ENCRYPTION_CONTEXT);
    decipher.setAuthTag(authenticationTag);
    const refreshToken = Buffer.concat([
      decipher.update(encryptedToken),
      decipher.final(),
    ]).toString("utf8");

    return validateRefreshToken(refreshToken);
  } catch {
    throw new Error("The stored Google OAuth token cannot be decrypted.");
  }
}

export function authorizeGoogleOAuthClient(
  oauthClient: GoogleOAuthClient,
  encryptedRefreshToken: string,
) {
  oauthClient.setCredentials({
    refresh_token: decryptGoogleRefreshToken(encryptedRefreshToken),
  });

  return oauthClient;
}

export async function verifyGoogleAccount(
  oauthClient: GoogleOAuthClient,
  idToken: string,
): Promise<VerifiedGoogleAccount> {
  const ticket = await oauthClient.verifyIdToken({
    audience: readRequiredEnvironmentVariable("GOOGLE_OAUTH_CLIENT_ID"),
    idToken,
  });
  const payload = ticket.getPayload();
  const email = payload?.email?.trim();
  const id = payload?.sub?.trim();

  if (
    !email ||
    email.length > 320 ||
    !email.includes("@") ||
    payload?.email_verified !== true ||
    !id ||
    id.length > 255
  ) {
    throw new Error("Google returned an invalid verified account identity.");
  }

  return { email, id };
}
