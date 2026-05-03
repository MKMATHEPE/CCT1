import { useState } from "react";

type Props = {
  onLogin: (username: string, password: string) => Promise<boolean>;
};

export default function LoggedOutPage({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const success = await onLogin(username, password);
      if (!success) {
        setError("Invalid username or password.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }

  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.24),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(239,68,68,0.16),_transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] flex items-center justify-center px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(2,6,23,0.96)_100%)] p-8 shadow-[0_28px_80px_rgba(2,6,23,0.55)] backdrop-blur">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white">Sign In</h2>
            <p className="text-sm text-slate-400">
              Enter your username and password to continue.
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Username
              </label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter username"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/15"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/15"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(239,68,68,0.35)] transition hover:-translate-y-0.5 hover:brightness-110"
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>
      </section>
    </div>
  );
}
