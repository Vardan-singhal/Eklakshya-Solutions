import { redirect } from "next/navigation";
import { adminEnabled, isAdmin } from "@/lib/adminAuth";
import { Panel } from "@/components/ui/layout";
import { loginAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;
  const enabled = adminEnabled();

  return (
    <section className="section-y pt-40">
      <div className="container-x">
        <div className="mx-auto max-w-md">
          <p className="t-eyebrow">Admin</p>
          <h1 className="t-h2 mt-6">Sign in</h1>
          <Panel className="mt-10">
            {enabled ? (
              <form action={loginAction} className="space-y-6">
                <label className="block">
                  <span className="t-label">Password</span>
                  <input
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="mt-3 w-full rounded-2xl border border-line-strong bg-bg px-5 py-4 text-base outline-none transition-colors focus:border-ember"
                  />
                </label>
                {error && (
                  <p role="alert" className="rounded-2xl border border-ember/50 bg-ember/10 p-4 text-sm">
                    {error === "rate" ? "Too many attempts. Try again in 15 minutes." : "That password is not correct."}
                  </p>
                )}
                <button type="submit" className="t-label w-full rounded-full bg-ember-grad px-6 py-4 font-semibold text-on-accent!">
                  Sign in
                </button>
              </form>
            ) : (
              <p className="t-body">
                Admin is switched off. Set an <code className="font-mono text-fg">ADMIN_PASSWORD</code> (8+ characters) in the environment to enable it.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </section>
  );
}
