import { randomBytes } from "node:crypto";
import { CodeChallengeMethod } from "google-auth-library";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth-options";
import {
  createGoogleOAuthClient,
  getGoogleOAuthRedirectUri,
  GOOGLE_CALENDAR_SCOPES,
  GOOGLE_OAUTH_CODE_VERIFIER_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
} from "@/lib/google-calendar-oauth";

const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;
const OAUTH_COOKIE_PATH = "/api/admin/google-calendar";

function getAdminRedirect(request: Request, status: "error" | "login") {
  const url = new URL(status === "login" ? "/login" : "/admin", request.url);

  if (status === "error") {
    url.searchParams.set("view", "calendar");
    url.searchParams.set("googleCalendar", "error");
  }

  return url;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.redirect(getAdminRedirect(request, "login"));
  }

  try {
    const oauthClient = createGoogleOAuthClient();
    const { codeChallenge, codeVerifier } =
      await oauthClient.generateCodeVerifierAsync();

    if (!codeChallenge) {
      throw new Error("Google OAuth PKCE challenge generation failed.");
    }

    const state = randomBytes(32).toString("base64url");
    const authorizationUrl = oauthClient.generateAuthUrl({
      access_type: "offline",
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
      include_granted_scopes: true,
      prompt: "consent select_account",
      scope: [...GOOGLE_CALENDAR_SCOPES],
      state,
    });
    const response = NextResponse.redirect(authorizationUrl);
    const secure = new URL(getGoogleOAuthRedirectUri()).protocol === "https:";
    const cookieOptions = {
      httpOnly: true,
      maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
      path: OAUTH_COOKIE_PATH,
      sameSite: "lax" as const,
      secure,
    };

    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, cookieOptions);
    response.cookies.set(
      GOOGLE_OAUTH_CODE_VERIFIER_COOKIE,
      codeVerifier,
      cookieOptions,
    );

    return response;
  } catch (error) {
    console.error(
      "Google Calendar OAuth initialization failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return NextResponse.redirect(getAdminRedirect(request, "error"));
  }
}
