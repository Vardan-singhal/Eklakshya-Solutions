/** Only intentionally public configuration belongs here. Keep the direct NEXT_PUBLIC_ read for Next.js. */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://eklakshya.com";

function validateSiteUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
    return value.replace(/\/+$/, "");
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a public HTTP(S) URL without credentials");
  }
}

export const publicEnv = { siteUrl: validateSiteUrl(siteUrl) };
