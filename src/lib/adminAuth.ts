import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { getAdminPassword } from "./env.server";

/**
 * Minimal single-owner auth for /admin. Enabled only when ADMIN_PASSWORD (8+ chars) is set.
 * Session = httpOnly cookie "<expiry>.<HMAC(expiry)>" signed with the password. No password → admin is off.
 */
const COOKIE = "ek_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

const secret = () => getAdminPassword() ?? "";
export const adminEnabled = () => secret().length >= 8;

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");
const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const checkPassword = (input: string) => adminEnabled() && safeEqual(sign(`pw:${input}`), sign(`pw:${secret()}`));

export async function startSession() {
  const exp = Date.now() + MAX_AGE * 1000;
  (await cookies()).set(COOKIE, `${exp}.${sign(`session:${exp}`)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  if (!adminEnabled()) return false;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  return Number(exp) > Date.now() && !!sig && safeEqual(sig, sign(`session:${exp}`));
}
