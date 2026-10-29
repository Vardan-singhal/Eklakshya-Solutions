import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";

/** Verifies the Razorpay checkout signature (HMAC-SHA256 of `order_id|payment_id`) before marking a booking paid. */
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
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

  await db.update(bookings).set({ status: "paid", paymentId, updatedAt: new Date() }).where(eq(bookings.orderId, orderId));
  return NextResponse.json({ success: true });
}
