import { NextResponse } from "next/server";
import { ConfigurationError, reportServerError } from "./env.server";

export function apiErrorResponse(context: string, error: unknown, message: string) {
  reportServerError(context, error);
  return NextResponse.json({
    error: error instanceof ConfigurationError ? "This service is not configured. Please contact us directly." : message,
  }, { status: error instanceof ConfigurationError ? 503 : 500 });
}
