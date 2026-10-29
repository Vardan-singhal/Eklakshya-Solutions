import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";

/**
 * Razorpay webhook — the source of truth for payment state (handles closed tabs / network drops).
 * Configure the URL in the Razorpay dashboard and set RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  type Entity = { order_id?: string; id?: string };
  let event: { event?: string; payload?: { payment?: { entity?: Entity }; order?: { entity?: Entity } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload." }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id ?? event.payload?.order?.entity?.id;

  if (orderId) {
    if (event.event === "payment.captured" || event.event === "order.paid") {
      await db.update(bookings).set({ status: "paid", paymentId: payment?.id, updatedAt: new Date() }).where(eq(bookings.orderId, orderId));
    } else if (event.event === "payment.failed") {
      await db.update(bookings).set({ status: "failed", updatedAt: new Date() }).where(eq(bookings.orderId, orderId));
    }
  }
  return NextResponse.json({ received: true });
}
