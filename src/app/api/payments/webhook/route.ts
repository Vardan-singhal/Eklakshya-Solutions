import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getDb } from "@/db";
import { getRazorpayWebhookSecret } from "@/lib/env.server";
import { apiErrorResponse } from "@/lib/apiErrors";

/**
 * Razorpay webhook — the source of truth for payment state (handles closed tabs / network drops).
 * Configure the URL in the Razorpay dashboard and set RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = getRazorpayWebhookSecret();
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

  try {
    if (orderId && ["payment.captured", "order.paid", "payment.failed"].includes(event.event ?? "")) {
      const db = await getDb();
      if (event.event === "payment.captured" || event.event === "order.paid") {
        await db.bookings.updateOne({ orderId }, { $set: {
          status: "paid", ...(payment?.id ? { paymentId: payment.id } : {}), updatedAt: new Date(),
        } });
      } else if (event.event === "payment.failed") {
        await db.bookings.updateOne({ orderId }, { $set: { status: "failed", updatedAt: new Date() } });
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    return apiErrorResponse("payment webhook failed", error, "Could not process the webhook. Please retry.");
  }
}
