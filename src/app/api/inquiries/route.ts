import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { apiErrorResponse } from "@/lib/apiErrors";
import { nextId } from "@/db/schema";
import { clean, clientIp, isEmail, rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  if (!rateLimit(`inq:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many submissions. Please try again in a few minutes." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // honeypot: bots fill hidden fields
  if (body.website) return NextResponse.json({ success: true });

  const name = clean(body.name, 120);
  const email = body.email;
  const message = clean(body.message, 4000);
  if (!name || !isEmail(email) || message.length < 10) {
    return NextResponse.json({ error: "Please add your name, a valid email and a short project description." }, { status: 400 });
  }

  try {
    const db = await getDb();
    await db.inquiries.insertOne({
      id: await nextId(db, "inquiries"),
      name,
      email,
      phone: clean(body.phone, 40),
      service: clean(body.service, 200) || "General enquiry",
      budget: clean(body.budget, 80) || "Not specified",
      message,
      status: "new",
      createdAt: new Date(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse("inquiry insert failed", error, "Could not save your message. Please WhatsApp or email us directly.");
  }
}
