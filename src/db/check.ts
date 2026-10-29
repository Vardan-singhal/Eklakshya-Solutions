/** Read-only connectivity check: no collections, indexes or records are changed. */
import "dotenv/config";
import { createMongoClient } from "./index";
import { reportServerError } from "../lib/env.server";

async function main() {
  const { client, databaseName } = createMongoClient();
  try {
    await client.connect();
    await client.db(databaseName).command({ ping: 1 });
    console.log("MongoDB connection successful. No records or indexes changed.");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  reportServerError("database check failed", error);
  process.exitCode = 1;
});
