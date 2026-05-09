import { useState } from "react";

type Props = {
  onLogin: (username: string, password: string) => Promise<boolean>;
};

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    label: "Fraud Detection",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
    label: "IMEI & Serial Search",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    label: "Risk Analytics",
  },
];

const WORLD_MAP_ASSET = "/world-map.svg";

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
      if (!success) setError("Invalid username or password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes page-in   { from { opacity:0 } to { opacity:1 } }
        @keyframes panel-rise{ from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes form-in   { from { opacity:0; transform:translateX(18px) } to { opacity:1; transform:translateX(0) } }
        @keyframes status-blink { 0%,100%{opacity:1} 50%{opacity:.35} }
        .anim-rise { animation: panel-rise .5s cubic-bezier(.22,1,.36,1) both }
        .anim-form { animation: form-in   .5s cubic-bezier(.22,1,.36,1) both }
      `}</style>

      <div
        className="relative min-h-screen overflow-hidden flex text-white"
        style={{ animation: "page-in .3s ease both", background: "#0b1120" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 44% 45%,rgba(30,64,95,0.34),rgba(15,35,58,0.18) 58%,rgba(2,8,23,0) 100%)",
          }}
        />

        <img
          src={WORLD_MAP_ASSET}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-[0.16]"
          style={{
            filter: "drop-shadow(0 12px 18px rgba(2,6,23,0.45))",
            mixBlendMode: "screen",
          }}
        />

        <svg
          viewBox="0 0 960 540"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke="rgba(172,201,213,0.014)" strokeWidth="0.25" fill="none">
            {[15,30,45,60,75,-15,-30,-45,-60].map((lat) => (
              <line key={lat} x1="0" y1={(75 - lat) / 135 * 540} x2="960" y2={(75 - lat) / 135 * 540} />
            ))}
            {[-165,-150,-135,-120,-105,-90,-75,-60,-45,-30,-15,0,15,30,45,60,75,90,105,120,135,150,165].map((lon) => (
              <line
                key={lon}
                x1={(lon + 180) / 360 * 960}
                y1="0"
                x2={(lon + 180) / 360 * 960}
                y2="540"
                opacity={lon % 30 === 0 ? 0.52 : 0.16}
              />
            ))}
          </g>

          <line x1="0" y1={75 / 135 * 540} x2="960" y2={75 / 135 * 540} stroke="rgba(214,235,237,0.028)" strokeWidth="0.35" />
          <line x1="0" y1={(75 - 23.5) / 135 * 540} x2="960" y2={(75 - 23.5) / 135 * 540} stroke="rgba(249,115,22,0.03)" strokeWidth="0.3" strokeDasharray="4 8" />
          <line x1="0" y1={(75 + 23.5) / 135 * 540} x2="960" y2={(75 + 23.5) / 135 * 540} stroke="rgba(249,115,22,0.03)" strokeWidth="0.3" strokeDasharray="4 8" />
        </svg>

        {/* ── Left brand panel ── */}
        <div
          className="relative z-10 hidden lg:flex lg:w-[55%] flex-col justify-between p-14 overflow-hidden"
          style={{
            background: "linear-gradient(160deg,rgba(15,30,53,0.72) 0%,rgba(11,20,34,0.58) 100%)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Right-edge depth shadow */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-24"
            style={{ background: "linear-gradient(to right,transparent,rgba(0,0,0,0.2))" }}
          />

          {/* Logo */}
          <div className="relative z-10 anim-rise" style={{ animationDelay: "0ms" }}>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-9 h-9 rounded-lg"
                style={{
                  background: "linear-gradient(135deg,#f97316,#ef4444)",
                  boxShadow: "0 4px 16px rgba(239,68,68,0.28)",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <span className="text-base font-semibold text-white tracking-tight">CCT Intelligence</span>
            </div>
          </div>

          {/* Main copy */}
          <div className="relative z-10 space-y-9">
            <div className="space-y-5">
              <div
                className="anim-rise inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium">
 
              </div>

              <h1
                className="anim-rise text-[2.6rem] font-bold leading-[1.1] tracking-tight text-white"
                style={{ animationDelay: "120ms" }}
              >
                Detect fraud.
                <br />
                <span style={{ color: "#f97316" }}>Protect payouts.</span>
              </h1>

              <p
                className="anim-rise text-base leading-relaxed max-w-xs"
                style={{ animationDelay: "180ms", color: "#64748b" }}
              >
                Cross-insurer claim verification and risk intelligence built for insurers across Africa.
              </p>
            </div>

            {/* Feature chips */}
            <div
              className="anim-rise flex flex-wrap gap-2"
              style={{ animationDelay: "240ms" }}
            >
              {FEATURES.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#94a3b8",
                  }}
                >
                  <span style={{ color: "#f97316" }}>{f.icon}</span>
                  {f.label}
                </div>
              ))}
            </div>
          </div>

          {/* Stat strip */}
          <div
            className="anim-rise relative z-10 grid grid-cols-3 gap-6 pt-8"
            style={{ animationDelay: "300ms", borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            {[
              { value: "Multi-insurer", label: "Data network" },
              { value: "Real-time",     label: "Risk scoring" },
              { value: "Traceable",    label: "Event history"  },
            ].map((s) => (
              <div key={s.value}>
                <p className="text-sm font-semibold text-white">{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div
          className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 py-12"
          style={{ background: "linear-gradient(90deg,rgba(11,17,32,0.5),rgba(11,17,32,0.9) 36%,rgba(11,17,32,0.98))" }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 anim-rise flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: "linear-gradient(135deg,#f97316,#ef4444)", boxShadow: "0 4px 12px rgba(239,68,68,0.28)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">CCT Intelligence</span>
          </div>

          {/* Form card */}
          <div
            className="w-full max-w-[360px] rounded-2xl p-8"
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset",
              animation: "form-in .5s 80ms cubic-bezier(.22,1,.36,1) both",
            }}
          >
            <div className="mb-7">
              <h2 className="text-xl font-semibold text-white tracking-tight">Sign in</h2>
              <p className="mt-1 text-sm" style={{ color: "#475569" }}>Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium" style={{ color: "#64748b" }}>Username</label>
                <input
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all"
                  style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", caretColor: "#f97316" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(249,115,22,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.08)"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium" style={{ color: "#64748b" }}>Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all"
                  style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", caretColor: "#f97316" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(249,115,22,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.08)"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm"
                  style={{
                    background: "rgba(239,68,68,0.07)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#fca5a5",
                    animation: "panel-rise .3s ease both",
                  }}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-px opacity-80">
                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4.5Zm0 6.5a.875.875 0 1 1 0-1.75A.875.875 0 0 1 8 11Z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all"
                style={{
                  marginTop: "8px",
                  background: isSubmitting ? "rgba(249,115,22,0.45)" : "linear-gradient(135deg,#f97316,#ea4444)",
                  boxShadow: isSubmitting ? "none" : "0 4px 20px rgba(239,68,68,0.25)",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.filter = "brightness(1.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
              >
                <span className="flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Signing in…
                    </>
                  ) : "Sign In"}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
