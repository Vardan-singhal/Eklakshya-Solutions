import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { getPricingTiers } from "@/lib/content";
import { clean, clientIp, isEmail, rateLimit } from "@/lib/rateLimit";

/**
 * Creates a booking and (when Razorpay keys are configured) a Razorpay order.
 * The amount is ALWAYS computed here from the pricing_tiers row — never trusted from the client.
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
    const [row] = await db
      .insert(bookings)
      .values({
        tierId: tier.dbId ?? null,
        tierName: tier.name,
        mode,
        amount,
        currency,
        clientName: name,
        clientEmail: email,
        clientPhone: clean(body.phone, 40) || null,
        status: "created",
      })
      .returning({ id: bookings.id });

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      await db.update(bookings).set({ status: "awaiting_payment" }).where(eq(bookings.id, row.id));
      return NextResponse.json({ mode: "manual", bookingId: row.id, reference: `EK-${String(row.id).padStart(5, "0")}`, amount, currency });
    }

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
      console.error("razorpay order failed", res.status, await res.text());
      await db.update(bookings).set({ status: "failed" }).where(eq(bookings.id, row.id));
      return NextResponse.json({ error: "The payment gateway could not start the order. Please try again." }, { status: 502 });
    }

    const order = (await res.json()) as { id: string };
    await db.update(bookings).set({ orderId: order.id }).where(eq(bookings.id, row.id));

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
    console.error("create-order failed", error);
    return NextResponse.json({ error: "Something went wrong creating your booking." }, { status: 500 });
  }
}
