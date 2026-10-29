import { MongoClient } from "mongodb";
import dns from "node:dns";
import { ConfigurationError, getMongoConfiguration } from "../lib/env.server";
import { collections, ensureIndexes, type Database } from "./schema";

type ConnectionCache = { client?: MongoClient; promise?: Promise<Database> };
const globalForDb = globalThis as typeof globalThis & { __eklakshyaMongo?: ConnectionCache };
const cache = globalForDb.__eklakshyaMongo ??= {};

/** An explicit override affects Node's DNS resolver only; it never changes OS settings. */
export function createMongoClient() {
  const { uri, databaseName, dnsServers } = getMongoConfiguration();
  if (dnsServers.length) {
    if (dns.getServers().join(",") !== dnsServers.join(",")) dns.setServers(dnsServers);
    if (typeof dns.promises?.setServers === "function") {
      try {
        dns.promises.setServers(dnsServers);
      } catch {
        // Fall back gracefully if the runtime does not support promise resolver updates
      }
    }
  }
  try {
    return { client: new MongoClient(uri, { serverSelectionTimeoutMS: 10_000, maxPoolSize: 10 }), databaseName };
  } catch {
    throw new ConfigurationError("MONGODB_URI", "must be a valid MongoDB connection string");
  }
}

/** Build-safe import. Connect once per server process on the first runtime database operation. */
export async function getDb(): Promise<Database> {
  if (!cache.promise) {
    const { client, databaseName } = createMongoClient();
    cache.client = client;
    const pending = (async () => {
      await client.connect();
      const db = collections(client.db(databaseName));
      await ensureIndexes(db);
      return db;
    })();
    cache.promise = pending;
    // Failed connections must not poison all later requests.
    void pending.catch(async () => {
      if (cache.promise === pending) {
        cache.promise = undefined;
        cache.client = undefined;
      }
      await client.close().catch(() => {});
    });
  }
  return cache.promise;
}

export async function closeDb() {
  const client = cache.client;
  cache.promise = undefined;
  cache.client = undefined;
  await client?.close();
}
