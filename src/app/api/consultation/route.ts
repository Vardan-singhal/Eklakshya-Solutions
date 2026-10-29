import { NextResponse } from "next/server";
import { db } from "@/db";
import { consultationSlots } from "@/db/schema";
import { clean, clientIp, isEmail, rateLimit } from "@/lib/rateLimit";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Postgres unique_violation (23505), whether raw or wrapped by drizzle's DrizzleQueryError. */
function isUniqueViolation(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

export async function POST(req: Request) {
  if (!rateLimit(`cal:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = clean(body.name, 120);
  const email = body.email;
  const date = clean(body.date, 10);
  const time = clean(body.time, 30);
  if (!name || !isEmail(email) || !DATE_RE.test(date) || !time) {
    return NextResponse.json({ error: "Please provide your name, email, a date and a time slot." }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(`${date}T00:00:00`) < today) {
    return NextResponse.json({ error: "Please choose a date in the future." }, { status: 400 });
  }

  try {
    // The unique index (preferred_date, preferred_time) is the single source of truth — no check-then-insert race.
    await db.insert(consultationSlots).values({
      name,
      email,
      preferredDate: date,
      preferredTime: time,
      topic: clean(body.topic, 200) || "Project discovery call",
      notes: clean(body.notes, 1000) || null,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "That slot was just booked — please pick another time." }, { status: 409 });
    }
    console.error("consultation insert failed", error);
    return NextResponse.json({ error: "Could not reserve that slot. Please try again." }, { status: 500 });
  }
}
