import { timingSafeEqual } from "node:crypto";
import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/auth-options";
import {
  createGoogleOAuthClient,
  encryptGoogleRefreshToken,
  GOOGLE_CALENDAR_CONNECTION_ID,
  GOOGLE_OAUTH_CODE_VERIFIER_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  hasGoogleCalendarWriteScope,
  MissingGoogleCalendarScopeError,
  verifyGoogleAccount,
} from "@/lib/google-calendar-oauth";
import { prisma } from "@/lib/prisma";

const OAUTH_COOKIE_PATH = "/api/admin/google-calendar";
const STATE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function getAdminRedirect(
  request: NextRequest,
  status: "connected" | "error" | "scope",
) {
  const url = new URL("/admin", request.url);
  url.searchParams.set("view", "calendar");
  url.searchParams.set("googleCalendar", status);

  return url;
}

function clearOAuthCookies(response: NextResponse) {
  const options = {
    maxAge: 0,
    path: OAUTH_COOKIE_PATH,
  };

  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", options);
  response.cookies.set(GOOGLE_OAUTH_CODE_VERIFIER_COOKIE, "", options);

  return response;
}

function valuesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function readAuthorizationCode(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();

  if (!code || code.length > 4_096 || /[\r\n]/.test(code)) {
    throw new Error("Google OAuth returned an invalid authorization code.");
  }

  return code;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return clearOAuthCookies(
      NextResponse.redirect(new URL("/login", request.url)),
    );
  }

  try {
    const returnedState = request.nextUrl.searchParams.get("state")?.trim();
    const storedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
    const codeVerifier = request.cookies.get(
      GOOGLE_OAUTH_CODE_VERIFIER_COOKIE,
    )?.value;

    if (
      !returnedState ||
      !storedState ||
      !STATE_PATTERN.test(returnedState) ||
      !STATE_PATTERN.test(storedState) ||
      !valuesMatch(returnedState, storedState)
    ) {
      throw new Error("Google OAuth state validation failed.");
    }

    const oauthError = request.nextUrl.searchParams.get("error")?.trim();

    if (oauthError) {
      console.warn(
        "Google Calendar OAuth was refused:",
        oauthError.slice(0, 100),
      );
      return clearOAuthCookies(
        NextResponse.redirect(getAdminRedirect(request, "error")),
      );
    }

    if (
      !codeVerifier ||
      codeVerifier.length < 43 ||
      codeVerifier.length > 128 ||
      !/^[A-Za-z0-9._~-]+$/.test(codeVerifier)
    ) {
      throw new Error("Google OAuth PKCE verifier is invalid.");
    }

    const oauthClient = createGoogleOAuthClient();
    const { tokens } = await oauthClient.getToken({
      code: readAuthorizationCode(request),
      codeVerifier,
    });

    if (!hasGoogleCalendarWriteScope(tokens.scope)) {
      throw new MissingGoogleCalendarScopeError();
    }

    const refreshToken = tokens.refresh_token?.trim();
    const idToken = tokens.id_token?.trim();

    if (!refreshToken || !idToken) {
      throw new Error("Google OAuth did not return the required offline tokens.");
    }

    const account = await verifyGoogleAccount(oauthClient, idToken);
    const encryptedRefreshToken = encryptGoogleRefreshToken(refreshToken);

    await prisma.googleCalendarConnection.upsert({
      create: {
        encryptedRefreshToken,
        googleAccountId: account.id,
        googleEmail: account.email,
        id: GOOGLE_CALENDAR_CONNECTION_ID,
      },
      update: {
        encryptedRefreshToken,
        googleAccountId: account.id,
        googleEmail: account.email,
      },
      where: { id: GOOGLE_CALENDAR_CONNECTION_ID },
    });

    return clearOAuthCookies(
      NextResponse.redirect(getAdminRedirect(request, "connected")),
    );
  } catch (error) {
    console.error(
      "Google Calendar OAuth callback failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    const status =
      error instanceof MissingGoogleCalendarScopeError ? "scope" : "error";

    return clearOAuthCookies(
      NextResponse.redirect(getAdminRedirect(request, status)),
    );
  }
}
