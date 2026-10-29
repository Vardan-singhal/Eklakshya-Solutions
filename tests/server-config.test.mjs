import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { createHmac } from "node:crypto";
import dns from "node:dns";
import { MongoClient, Collection, ObjectId } from "mongodb";
import { ConfigurationError, getMongoConfiguration, getAdminPassword, getRazorpayCredentials, describeServerError, getSocialLinks } from "../src/lib/env.server.ts";
import { GET as socialLinksResponse } from "../src/app/api/social-links/route.ts";
import { getDb, closeDb, createMongoClient } from "../src/db/index.ts";
import { POST } from "../src/app/api/consultation/route.ts";
import { POST as inquiry } from "../src/app/api/inquiries/route.ts";
import { POST as createOrder } from "../src/app/api/payments/create-order/route.ts";
import { POST as verify } from "../src/app/api/payments/verify/route.ts";
import { POST as webhook } from "../src/app/api/payments/webhook/route.ts";
import { getCatalogues, getProjects } from "../src/lib/content.ts";
import { CATALOGUES, PROJECTS, PRICING_TIERS } from "../src/data/siteData.ts";

const variables = ["MONGODB_URI", "MONGODB_DB", "MONGODB_DNS_SERVERS", "ADMIN_PASSWORD", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "SOCIAL_LINKEDIN_URL", "SOCIAL_GITHUB_URL", "SOCIAL_INSTAGRAM_URL", "SOCIAL_WHATSAPP_URL"];
let saved;
let requestId = 0;
beforeEach(() => {
  saved = Object.fromEntries(variables.map((key) => [key, process.env[key]]));
  variables.forEach((key) => delete process.env[key]);
});
afterEach(async () => {
  await closeDb();
  mock.restoreAll();
  for (const key of variables) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function request(body = { name: "Build test", email: "test@example.com", date: "2099-12-31", time: "11:00 AM IST" }, headers = {}) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `192.0.2.${++requestId}`, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Mock driver transport only; application collections, config, IDs and API logic stay real. */
function mongo() {
  process.env.MONGODB_URI = "mongodb://localhost/config_test";
  const indexes = [];
  const inserts = [];
  const updates = [];
  const sequences = new Map();
  const connect = mock.method(MongoClient.prototype, "connect", async function () { return this; });
  mock.method(MongoClient.prototype, "close", async () => {});
  mock.method(Collection.prototype, "createIndexes", async function (specs) {
    indexes.push({ collection: this.collectionName, specs });
    return specs.map((spec) => spec.name);
  });
  mock.method(Collection.prototype, "createIndex", async () => "test-index");
  mock.method(Collection.prototype, "findOneAndUpdate", async function (filter) {
    assert.equal(this.collectionName, "counters");
    const seq = (sequences.get(filter._id) ?? 0) + 1;
    sequences.set(filter._id, seq);
    return { _id: filter._id, seq };
  });
  const insert = mock.method(Collection.prototype, "insertOne", async function (document) {
    inserts.push({ collection: this.collectionName, document });
    return { acknowledged: true, insertedId: new ObjectId() };
  });
  mock.method(Collection.prototype, "updateOne", async function (filter, update) {
    updates.push({ collection: this.collectionName, filter, update });
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  });
  mock.method(Collection.prototype, "find", () => ({ sort() { return this; }, async toArray() { return []; } }));
  return { indexes, inserts, updates, connect, insert };
}

test("database imports are build-safe; first runtime use validates MONGODB_URI", async () => {
  await assert.rejects(getDb(), { name: "ConfigurationError", message: "MONGODB_URI is required" });
});

test("social links are read at request time and WhatsApp uses the configured business number", async () => {
  const first = socialLinksResponse();
  assert.equal(first.headers.get("cache-control"), "no-store");
  const empty = await first.json();
  assert.equal(empty.linkedin, null);
  assert.match(empty.whatsapp, /^https:\/\/wa\.me\/919205617576\?/);
  process.env.SOCIAL_LINKEDIN_URL = "https://www.linkedin.com/company/example";
  process.env.SOCIAL_GITHUB_URL = "https://github.com/example";
  process.env.SOCIAL_INSTAGRAM_URL = "https://www.instagram.com/example/";
  const configured = await socialLinksResponse().json();
  assert.equal(configured.linkedin, process.env.SOCIAL_LINKEDIN_URL);
  assert.equal(configured.github, process.env.SOCIAL_GITHUB_URL);
  assert.equal(configured.instagram, process.env.SOCIAL_INSTAGRAM_URL);
});

test("social endpoint rejects unsafe or unrelated URLs and never returns private settings", async () => {
  process.env.MONGODB_URI = "private-database-marker";
  process.env.SOCIAL_LINKEDIN_URL = "javascript:alert(1)";
  process.env.SOCIAL_GITHUB_URL = "https://private-user:private-password@github.com/example";
  process.env.SOCIAL_INSTAGRAM_URL = "https://instagram.com.attacker.example/profile";
  process.env.SOCIAL_WHATSAPP_URL = "https://wa.me/919205617576";
  assert.deepEqual(getSocialLinks(), { linkedin: null, github: null, instagram: null, whatsapp: "https://wa.me/919205617576" });
  const response = await socialLinksResponse().json();
  assert.deepEqual(Object.keys(response).sort(), ["github", "instagram", "linkedin", "whatsapp"]);
  assert.doesNotMatch(JSON.stringify(response), /private-database-marker|private-password|javascript/);
});

test("MongoDB URI validation supports Atlas, database selection and replica-set URLs without exposing values", () => {
  process.env.MONGODB_URI = "sensitive-invalid-url-marker";
  assert.throws(getMongoConfiguration, (error) => {
    assert.ok(error instanceof ConfigurationError);
    assert.doesNotMatch(error.message, /sensitive-invalid-url-marker/);
    return true;
  });
  process.env.MONGODB_URI = "mongodb+srv://cluster.example.com/";
  assert.equal(getMongoConfiguration().databaseName, "eklakshya_solutions");
  process.env.MONGODB_URI = "mongodb://localhost:27017,localhost:27018/catalogue";
  assert.equal(getMongoConfiguration().databaseName, "catalogue");
  process.env.MONGODB_DB = "override";
  assert.equal(getMongoConfiguration().databaseName, "override");
});

test("optional admin and payment settings retain disabled modes and reject partial configuration", () => {
  assert.equal(getAdminPassword(), undefined);
  assert.equal(getRazorpayCredentials(), null);
  process.env.ADMIN_PASSWORD = "short";
  assert.throws(getAdminPassword, ConfigurationError);
  process.env.RAZORPAY_KEY_ID = "test-only-key-id";
  assert.throws(getRazorpayCredentials, /RAZORPAY_KEY_SECRET/);
});

test("DNS overrides are optional, validated and applied only to the Node resolver", async () => {
  process.env.MONGODB_URI = "mongodb://localhost/config_test";
  assert.deepEqual(getMongoConfiguration().dnsServers, []);
  process.env.MONGODB_DNS_SERVERS = "invalid-dns-value";
  assert.throws(getMongoConfiguration, /MONGODB_DNS_SERVERS/);
  process.env.MONGODB_DNS_SERVERS = "1.1.1.1, 8.8.8.8";
  mock.method(dns, "getServers", () => ["127.0.0.1"]);
  const set = mock.method(dns, "setServers", () => {});
  const { client } = createMongoClient();
  assert.deepEqual(set.mock.calls[0].arguments[0], ["1.1.1.1", "8.8.8.8"]);
  await client.close();
});

test("database diagnostics identify known failures without leaking driver messages", () => {
  const privateMarker = "mongodb://private-user:private-password@private-host/records";
  const dnsError = Object.assign(new Error(privateMarker), { code: "ECONNREFUSED", syscall: "querySrv" });
  assert.match(describeServerError(dnsError), /DNS lookup failed/);
  assert.doesNotMatch(describeServerError(dnsError), /private-user|private-password|private-host/);
  const nested = Object.assign(new Error(privateMarker), { reason: { servers: new Map([["private-host", { error: { code: 18 } }]]) } });
  assert.match(describeServerError(nested), /authentication failed/);
  assert.match(describeServerError({ code: 13 }), /access denied/);
  assert.doesNotMatch(describeServerError(new Error(privateMarker)), /private-password/);
});

test("unconfigured consultation returns safe 503 and a clear server diagnostic", async () => {
  const log = mock.method(console, "error", () => {});
  const response = await POST(request());
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify(await response.json()), /MONGODB_URI|mongodb|password/);
  assert.match(JSON.stringify(log.mock.calls[0].arguments), /MONGODB_URI is required/);
});

test("invalid consultation input still returns 400 before connecting", async () => {
  assert.equal((await POST(request({ name: "" }))).status, 400);
});

test("consultation inserts preserve timestamps, numeric IDs and database-level uniqueness", async () => {
  const transport = mongo();
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  const record = transport.inserts[0];
  assert.equal(record.collection, "consultation_slots");
  assert.equal(record.document.id, 1);
  assert.equal(record.document.email, "test@example.com");
  assert.ok(record.document.createdAt instanceof Date);
  assert.ok(transport.indexes.find((item) => item.collection === "consultation_slots").specs.some(
    (index) => index.unique && index.key.preferredDate === 1 && index.key.preferredTime === 1));
  assert.ok(transport.indexes.find((item) => item.collection === "bookings").specs.some(
    (index) => index.unique && index.partialFilterExpression?.orderId?.$type === "string"));
});

test("MongoDB duplicate-key errors preserve duplicate-slot 409 behavior", async () => {
  const transport = mongo();
  transport.insert.mock.mockImplementation(async () => { throw Object.assign(new Error("private detail"), { code: 11000 }); });
  assert.equal((await POST(request())).status, 409);
});

test("database failures cannot leak driver messages or query values", async () => {
  const transport = mongo();
  const log = mock.method(console, "error", () => {});
  transport.insert.mock.mockImplementation(async () => { throw new Error("private-driver-marker"); });
  const response = await POST(request());
  assert.equal(response.status, 500);
  assert.doesNotMatch(JSON.stringify(await response.json()), /private-driver-marker|mongodb|test@example/);
  assert.doesNotMatch(JSON.stringify(log.mock.calls), /private-driver-marker|test@example/);
});

test("concurrent requests reuse one connection; failed connections can retry", async () => {
  const transport = mongo();
  const [first, second] = await Promise.all([getDb(), getDb()]);
  assert.equal(first, second);
  assert.equal(transport.connect.mock.callCount(), 1);
  await closeDb();
  transport.connect.mock.mockImplementationOnce(async () => { throw new Error("connection failed"); });
  await assert.rejects(getDb());
  await getDb();
  assert.equal(transport.connect.mock.callCount(), 3);
});

test("unconfigured editorial content preserves the original bundled catalogue and projects", async () => {
  assert.deepEqual(await getCatalogues(), CATALOGUES);
  assert.deepEqual(await getProjects(), PROJECTS);
});

test("MongoDB content retains the public catalogue shape and embedded plate order", async () => {
  mongo();
  const catalogue = CATALOGUES[0];
  mock.method(Collection.prototype, "find", () => ({
    sort() { return this; },
    async toArray() { return [{ ...catalogue, _id: new ObjectId(), id: 1, slug: catalogue.id, published: true, sortOrder: 0 }]; },
  }));
  assert.deepEqual(await getCatalogues(), [catalogue]);
});

test("enquiries keep their existing defaults in MongoDB", async () => {
  const transport = mongo();
  const response = await inquiry(request({ name: "Build test", email: "test@example.com", message: "Please build our project." }));
  assert.equal(response.status, 200);
  assert.equal(transport.inserts[0].document.status, "new");
  assert.equal(transport.inserts[0].document.service, "General enquiry");
});

test("manual payment bookings retain numeric references and server-calculated amounts", async () => {
  const transport = mongo();
  const tier = PRICING_TIERS[0];
  const response = await createOrder(request({ tierId: tier.id, name: "Build test", email: "test@example.com", amount: 1 }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.mode, "manual");
  assert.equal(body.reference, "EK-00001");
  assert.equal(body.bookingId, 1);
  assert.equal(body.amount, tier.advanceINR);
  assert.equal(transport.updates[0].update.$set.status, "awaiting_payment");
});

test("verified payment signatures update the matching MongoDB booking", async () => {
  const transport = mongo();
  process.env.RAZORPAY_KEY_SECRET = "test-only-private-marker";
  const signature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update("order_test|payment_test").digest("hex");
  const response = await verify(request({ razorpay_order_id: "order_test", razorpay_payment_id: "payment_test", razorpay_signature: signature }));
  assert.equal(response.status, 200);
  assert.deepEqual(transport.updates[0].filter, { orderId: "order_test" });
  assert.equal(transport.updates[0].update.$set.status, "paid");
});

test("invalid payment signatures cannot update bookings", async () => {
  process.env.RAZORPAY_KEY_SECRET = "test-only-private-marker";
  assert.equal((await verify(request({ razorpay_order_id: "order_test", razorpay_payment_id: "payment_test", razorpay_signature: "invalid" }))).status, 400);
});

test("signed payment webhooks retain their matching and status updates", async () => {
  const transport = mongo();
  process.env.RAZORPAY_WEBHOOK_SECRET = "test-only-webhook-marker";
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "payment_test", order_id: "order_test" } } } });
  const signature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");
  assert.equal((await webhook(request(body, { "x-razorpay-signature": signature }))).status, 200);
  assert.equal(transport.updates[0].update.$set.paymentId, "payment_test");
});
