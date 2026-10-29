import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getRazorpayCredentials } from "@/lib/env.server";
import { apiErrorResponse } from "@/lib/apiErrors";
import { nextId } from "@/db/schema";
import { getPricingTiers } from "@/lib/content";
import { clean, clientIp, isEmail, rateLimit } from "@/lib/rateLimit";

/**
 * Creates a booking and (when Razorpay keys are configured) a Razorpay order.
 * The amount is ALWAYS computed here from pricing_tiers — never trusted from the client.
 * Without keys the booking is stored as `awaiting_payment` and the visitor is told plainly that
 * no money has been taken. It is never marked paid here; only /verify or /webhook can do that.
 */
export async function POST(req: Request) {
  if (!rateLimit(`pay:${clientIp(req)}`, 8, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const tiers = await getPricingTiers();
  const tier = tiers.find((t) => t.id === body.tierId);
  const currency = body.currency === "USD" ? "USD" : "INR";
  const mode = body.mode === "full" ? "full" : "advance";
  const name = clean(body.name, 120);
  const email = body.email;
  if (!tier || !name || !isEmail(email)) {
    return NextResponse.json({ error: "Please choose a package and enter your name and a valid email." }, { status: 400 });
  }

  const amount =
    currency === "INR" ? (mode === "full" ? tier.priceINR : tier.advanceINR) : mode === "full" ? tier.priceUSD : tier.advanceUSD;

  try {
    const credentials = getRazorpayCredentials();
    const db = await getDb();
    const row = { id: await nextId(db, "bookings") };
    const now = new Date();
    await db.bookings.insertOne({
        id: row.id,
        tierId: tier.dbId ?? null,
        tierName: tier.name,
        mode,
        amount,
        currency,
        clientName: name,
        clientEmail: email,
        clientPhone: clean(body.phone, 40) || null,
        status: "created",
        createdAt: now,
        updatedAt: now,
      });

    if (!credentials) {
      await db.bookings.updateOne({ id: row.id }, { $set: { status: "awaiting_payment", updatedAt: new Date() } });
      return NextResponse.json({ mode: "manual", bookingId: row.id, reference: `EK-${String(row.id).padStart(5, "0")}`, amount, currency });
    }

    const { keyId, keySecret } = credentials;

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: amount * 100, // smallest currency unit
        currency,
        receipt: `ek_${row.id}`,
        notes: { bookingId: String(row.id), tier: tier.id, mode },
      }),
    });

    if (!res.ok) {
      console.error("razorpay order failed", res.status);
      await db.bookings.updateOne({ id: row.id }, { $set: { status: "failed", updatedAt: new Date() } });
      return NextResponse.json({ error: "The payment gateway could not start the order. Please try again." }, { status: 502 });
    }

    const order = (await res.json()) as { id: string };
    await db.bookings.updateOne({ id: row.id }, { $set: { orderId: order.id, updatedAt: new Date() } });

    return NextResponse.json({
      mode: "razorpay",
      keyId,
      orderId: order.id,
      amount: amount * 100,
      currency,
      bookingId: row.id,
      description: `${tier.name} — ${mode === "full" ? "full payment" : "advance"}`,
    });
  } catch (error) {
    return apiErrorResponse("create-order failed", error, "Something went wrong creating your booking.");
  }
}
