"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { checkPassword, endSession, isAdmin, startSession } from "@/lib/adminAuth";
import { rateLimit } from "@/lib/rateLimit";

const STATUSES = ["new", "contacted", "won", "archived"] as const;

export async function loginAction(formData: FormData) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`login:${ip}`, 6, 15 * 60_000)) redirect("/admin/login?error=rate");
  if (!checkPassword(String(formData.get("password") ?? ""))) redirect("/admin/login?error=1");
  await startSession();
  redirect("/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

export async function setInquiryStatus(formData: FormData) {
  if (!(await isAdmin())) redirect("/admin/login");
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!Number.isInteger(id) || !(STATUSES as readonly string[]).includes(status)) return;
  const db = await getDb();
  await db.inquiries.updateOne({ id }, { $set: { status: status as (typeof STATUSES)[number] } });
  revalidatePath("/admin");
}
