import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthAuthorizeUrl } from "@/lib/googleDrive";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/drive/callback`;
  const authUrl = getGoogleOAuthAuthorizeUrl(redirectUri);

  return NextResponse.redirect(authUrl);
}
