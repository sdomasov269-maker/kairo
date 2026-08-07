import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    { status: "ok", service: "kairo" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
