import { isIP } from "node:net";
import type { SocialLinks } from "./socialLinks";

/** Server-only configuration. Accessors validate at runtime, never on module import. */
export class ConfigurationError extends Error {
  constructor(variable: string, reason = "is required") {
    super(`${variable} ${reason}`);
    this.name = "ConfigurationError";
  }
}

const optional = (name: string) => process.env[name]?.trim() || undefined;

/** Explicitly public social profile URLs, read at request time. Reject credential-bearing URLs. */
export function getSocialLinks(): SocialLinks {
  const link = (name: string, hosts: string[]) => {
    const value = optional(name);
    if (!value) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password) return null;
      if (!hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
      return url.toString();
    } catch {
      return null;
    }
  };
  return {
    linkedin: link("SOCIAL_LINKEDIN_URL", ["linkedin.com"]),
    github: link("SOCIAL_GITHUB_URL", ["github.com"]),
    whatsapp: link("SOCIAL_WHATSAPP_URL", ["wa.me", "whatsapp.com"]),
    instagram: link("SOCIAL_INSTAGRAM_URL", ["instagram.com"]),
  };
}

export const hasDatabaseConfiguration = () => Boolean(optional("MONGODB_URI"));

export function getMongoConfiguration() {
  const uri = optional("MONGODB_URI");
  if (!uri) throw new ConfigurationError("MONGODB_URI");
  if (!/^mongodb(?:\+srv)?:\/\/[^/?#]+(?:[/?]|$)/i.test(uri)) {
    throw new ConfigurationError("MONGODB_URI", "must be a valid mongodb:// or mongodb+srv:// connection string");
  }
  let uriDatabase: string;
  try {
    uriDatabase = decodeURIComponent(uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/i)?.[1] ?? "");
  } catch {
    throw new ConfigurationError("MONGODB_URI", "contains an invalid database name");
  }
  const databaseName = optional("MONGODB_DB") || uriDatabase || "eklakshya_solutions";
  if (/[\/\\.\s"$*<>:|?\0]/.test(databaseName)) {
    throw new ConfigurationError("MONGODB_DB", "must be a valid MongoDB database name");
  }
  const dnsServers = (optional("MONGODB_DNS_SERVERS") ?? "").split(",").map((server) => server.trim()).filter(Boolean);
  if (dnsServers.some((server) => !isIP(server))) {
    throw new ConfigurationError("MONGODB_DNS_SERVERS", "must contain comma-separated DNS server IP addresses");
  }
  return { uri, databaseName, dnsServers };
}

export function getAdminPassword() {
  const value = optional("ADMIN_PASSWORD");
  if (value && value.length < 8) throw new ConfigurationError("ADMIN_PASSWORD", "must contain at least 8 characters");
  return value;
}

export const getRazorpayKeySecret = () => optional("RAZORPAY_KEY_SECRET");
export const getRazorpayWebhookSecret = () => optional("RAZORPAY_WEBHOOK_SECRET");

export function getRazorpayCredentials() {
  const keyId = optional("RAZORPAY_KEY_ID");
  const keySecret = getRazorpayKeySecret();
  if (!keyId && !keySecret) return null;
  if (!keyId) throw new ConfigurationError("RAZORPAY_KEY_ID", "is required when RAZORPAY_KEY_SECRET is set");
  if (!keySecret) throw new ConfigurationError("RAZORPAY_KEY_SECRET", "is required when RAZORPAY_KEY_ID is set");
  return { keyId, keySecret };
}

/** Classify known errors without printing driver messages, hostnames, credentials or query values. */
export function describeServerError(error: unknown): string {
  if (error instanceof ConfigurationError) return error.message;
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  let timedOut = false;
  while (queue.length && seen.size < 20) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const item = current as {
      name?: string; code?: string | number; syscall?: string; cause?: unknown;
      reason?: { servers?: Map<unknown, { error?: unknown }> };
    };
    if (["querySrv", "queryTxt"].includes(item.syscall ?? "")) {
      return "MongoDB DNS lookup failed. Check DNS/network access, set MONGODB_DNS_SERVERS to a reachable resolver, or use the provider's non-SRV connection string.";
    }
    if (item.code === 18) return "MongoDB authentication failed. Check the database username, password and authSource in MONGODB_URI.";
    if (item.code === 13) return "MongoDB access denied. The database user needs read/write and index-creation permissions.";
    if (item.code === 11000) return "MongoDB rejected a duplicate value for a unique index. Check existing records before seeding again.";
    if (item.code === 85 || item.code === 86) return "MongoDB index configuration conflicts with an existing index. Review the collection's indexes.";
    if (["CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR"].includes(String(item.code))) {
      return "MongoDB TLS connection failed. Check the certificate, provider connection settings and network access.";
    }
    if (item.name === "MongoServerSelectionError" || ["ETIMEDOUT", "ECONNREFUSED"].includes(String(item.code))) timedOut = true;
    queue.push(item.cause);
    if (item.reason?.servers instanceof Map) queue.push(...Array.from(item.reason.servers.values(), (server) => server.error));
  }
  return timedOut
    ? "MongoDB is unreachable. Check cluster availability, network access/IP allowlisting and the connection settings."
    : "Operation failed; private error details omitted.";
}

export function reportServerError(context: string, error: unknown) {
  console.error(context, describeServerError(error));
}
