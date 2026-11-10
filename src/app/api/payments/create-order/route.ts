import { NextResponse } from "next/server";

/** Retired checkout. Existing payment verification and webhooks remain available. */
export async function POST() {
  return NextResponse.json(
    { error: "Online booking is no longer available. Please contact us to discuss your project." },
    { status: 410 },
  );
}
