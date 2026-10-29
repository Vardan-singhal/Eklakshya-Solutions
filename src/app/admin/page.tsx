import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { adminEnabled, isAdmin } from "@/lib/adminAuth";
import { Card } from "@/components/ui/layout";
import { logoutAction, setInquiryStatus } from "./actions";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
const STATUSES = ["new", "contacted", "won", "archived"] as const;

export default async function AdminPage() {
  if (!adminEnabled() || !(await isAdmin())) redirect("/admin/login");

  const db = await getDb();
  const [inq, books, slots, paid] = await Promise.all([
    db.inquiries.find().sort({ createdAt: -1 }).limit(100).toArray(),
    db.bookings.find().sort({ createdAt: -1 }).limit(100).toArray(),
    db.consultationSlots.find().sort({ preferredDate: 1, preferredTime: 1 }).limit(100).toArray(),
    db.bookings.countDocuments({ status: "paid" }),
  ]);

  return (
    <section className="section-y pt-40">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="t-eyebrow">Admin</p>
            <h1 className="t-h2 mt-6">Inbox</h1>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="t-label rounded-full border border-line-strong px-6 py-3 transition-colors hover:border-ember hover:text-fg">
              Sign out
            </button>
          </form>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 md:gap-8">
          {[
            ["Enquiries", inq.length],
            ["New", inq.filter((i) => i.status === "new").length],
            ["Bookings", books.length],
            ["Paid", paid],
          ].map(([k, v]) => (
            <Card key={String(k)}>
              <p className="t-label">{k}</p>
              <p className="t-h2 mt-6">{v}</p>
            </Card>
          ))}
        </div>

        <h2 className="t-h4 mb-6 mt-20">Enquiries</h2>
        <div className="space-y-4">
          {inq.length === 0 && <p className="t-body">No enquiries yet.</p>}
          {inq.map((i) => (
            <Card key={i.id} className="!p-6 md:!p-8">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="min-w-0 max-w-2xl">
                  <p className="font-semibold">
                    {i.name} <span className="t-small">· {i.email}{i.phone ? ` · ${i.phone}` : ""}</span>
                  </p>
                  <p className="t-label mt-2">
                    {i.service} · {i.budget} · {fmt(i.createdAt)}
                  </p>
                  <p className="t-body mt-4 whitespace-pre-wrap">{i.message}</p>
                </div>
                <form action={setInquiryStatus} className="flex items-center gap-3">
                  <input type="hidden" name="id" value={i.id} />
                  <select name="status" defaultValue={i.status} className="t-label rounded-full border border-line-strong bg-bg px-4 py-3">
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="t-label rounded-full bg-ember-grad px-5 py-3 font-semibold text-on-accent!">
                    Save
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>

        <h2 className="t-h4 mb-6 mt-20">Bookings</h2>
        <div className="overflow-x-auto rounded-[1.75rem] border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="t-label border-b border-line">
              <tr>
                {["Ref", "Package", "Client", "Amount", "Status", "Created"].map((h) => (
                  <th key={h} className="px-6 py-4 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {books.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-muted">
                    No bookings yet.
                  </td>
                </tr>
              )}
              {books.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0">
                  <td className="px-6 py-4 font-mono text-xs">EK-{String(b.id).padStart(5, "0")}</td>
                  <td className="px-6 py-4">
                    {b.tierName} <span className="t-small">({b.mode})</span>
                  </td>
                  <td className="px-6 py-4">
                    {b.clientName} <span className="t-small">· {b.clientEmail}</span>
                  </td>
                  <td className="px-6 py-4">
                    {b.currency} {b.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`t-label rounded-full border px-3 py-1 ${b.status === "paid" ? "border-ember text-accent!" : "border-line-strong"}`}>{b.status.replace("_", " ")}</span>
                  </td>
                  <td className="px-6 py-4 text-muted">{fmt(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="t-h4 mb-6 mt-20">Discovery calls</h2>
        <div className="overflow-x-auto rounded-[1.75rem] border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="t-label border-b border-line">
              <tr>
                {["Date", "Time", "Name", "Email", "Topic"].map((h) => (
                  <th key={h} className="px-6 py-4 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-muted">
                    No calls booked yet.
                  </td>
                </tr>
              )}
              {slots.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className="px-6 py-4 font-mono text-xs">{s.preferredDate}</td>
                  <td className="px-6 py-4">{s.preferredTime}</td>
                  <td className="px-6 py-4">{s.name}</td>
                  <td className="px-6 py-4 text-muted">{s.email}</td>
                  <td className="px-6 py-4 text-muted">{s.topic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
