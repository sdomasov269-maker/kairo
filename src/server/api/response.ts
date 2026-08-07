import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/server/auth/require-session";
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "DATABASE_UNAVAILABLE"
  | "UNKNOWN";
export const apiSuccess = <T>(data: T, init?: ResponseInit) =>
  NextResponse.json({ ok: true as const, data }, init);
export const apiError = (code: ApiErrorCode, message: string, status: number) =>
  NextResponse.json(
    { ok: false as const, error: { code, message } },
    { status },
  );
export const privateApiError = (error: unknown) =>
  error instanceof UnauthorizedError
    ? apiError("UNAUTHORIZED", "Authentication required.", 401)
    : apiError("DATABASE_UNAVAILABLE", "Service temporarily unavailable.", 503);
