import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost ?? request.headers.get("host") ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();

  if (host === "www.kairo-anime.com") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = "kairo-anime.com";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}
