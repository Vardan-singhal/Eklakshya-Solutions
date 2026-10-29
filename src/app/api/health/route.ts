import { getDb } from "@/db";
import { ConfigurationError, reportServerError } from "@/lib/env.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await (await getDb()).raw.command({ ping: 1 });
    return Response.json({ ok: true });
  } catch (error) {
    reportServerError("health check failed", error);
    return Response.json({ ok: false }, { status: error instanceof ConfigurationError ? 503 : 500 });
  }
}
