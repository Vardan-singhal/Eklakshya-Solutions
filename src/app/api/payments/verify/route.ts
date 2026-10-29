import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getDb } from "@/db";
import { getRazorpayKeySecret } from "@/lib/env.server";
import { apiErrorResponse } from "@/lib/apiErrors";

/** Verifies the Razorpay checkout signature (HMAC-SHA256 of `order_id|payment_id`) before marking a booking paid. */
export async function POST(req: Request) {
  const secret = getRazorpayKeySecret();
  if (!secret) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const orderId = String(body.razorpay_order_id ?? "");
  const paymentId = String(body.razorpay_payment_id ?? "");
  const signature = String(body.razorpay_signature ?? "");
  if (!orderId || !paymentId || !signature) return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });

  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Payment signature could not be verified." }, { status: 400 });
  }

  try {
    const db = await getDb();
    await db.bookings.updateOne({ orderId }, { $set: { status: "paid", paymentId, updatedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse("payment verification failed", error, "Could not verify your payment. Please contact us.");
  }
}
