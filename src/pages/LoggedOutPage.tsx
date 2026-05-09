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

// ─── World map paths ────────────────────────────────────────────────────────
// Coordinate system (Mercator-like, viewBox 0 0 960 540):
//   x = (lon + 180) / 360 * 960
//   y = (75  - lat) / 135 * 540

// Africa — detailed clockwise trace
const PATH_AFRICA = `
  M 467,160 L 480,153 L 492,151 L 504,151 L 512,153
  L 520,156 L 530,155 L 540,158 L 550,160 L 558,164
  L 563,172 L 557,174 L 569,177 L 571,181 L 564,188
  L 568,198 L 576,212 L 583,226 L 588,240 L 596,250
  L 616,256 L 608,268 L 600,283 L 592,298
  L 587,315 L 582,335 L 575,358 L 567,382
  L 556,408 L 545,424 L 534,432 L 528,436
  L 516,430 L 504,416 L 491,400 L 478,383
  L 464,364 L 451,343 L 440,322 L 432,304
  L 424,288 L 416,278 L 407,273 L 400,270
  L 394,264 L 392,255 L 396,247 L 405,243
  L 412,238 L 417,230 L 418,221 L 415,212
  L 409,203 L 402,194 L 396,184 L 392,175
  L 396,167 L 405,162 L 416,159 L 427,157
  L 436,156 L 444,157 L 450,159 L 458,160 Z
`;

// Madagascar — island east of Mozambique
const PATH_MADAGASCAR = `
  M 601,302 L 610,294 L 618,298 L 623,313
  L 625,330 L 624,348 L 620,366 L 613,381
  L 604,388 L 595,382 L 590,366 L 588,348
  L 589,330 L 592,314 Z
`;

// Europe — Iberian, French, Italian, Scandinavian peninsulas
const PATH_EUROPE = `
  M 456,152 L 462,147 L 470,145 L 480,145
  L 488,148 L 496,145 L 507,143 L 516,142
  L 524,144 L 532,140 L 542,135 L 554,131
  L 564,128 L 572,130 L 582,126 L 592,128
  L 600,132 L 610,130 L 618,128 L 624,135
  L 622,143 L 615,148 L 616,156 L 620,165
  L 616,174 L 608,182 L 598,188 L 586,191
  L 574,188 L 562,186 L 556,192 L 548,198
  L 536,202 L 524,196 L 519,186 L 524,177
  L 528,169 L 524,162 L 514,159 L 503,163
  L 496,170 L 490,178 L 484,172 L 478,163
  L 482,155 L 484,148 L 476,146 L 466,149
  L 459,157 L 455,163 L 450,157 Z
`;

// Scandinavia — Norway/Sweden peninsula
const PATH_SCANDINAVIA = `
  M 524,76 L 532,68 L 540,62 L 550,58
  L 558,56 L 566,58 L 572,64 L 570,74
  L 564,82 L 558,88 L 553,96 L 558,104
  L 564,112 L 568,122 L 562,130 L 554,134
  L 546,132 L 537,128 L 530,120 L 526,112
  L 522,104 L 520,96 L 518,87 L 520,80 Z
`;

// Great Britain
const PATH_GB = `
  M 468,101 L 476,96 L 484,94 L 492,98
  L 496,106 L 492,114 L 484,120 L 476,124
  L 468,120 L 464,112 Z
`;

// North America — simplified but recognizable (Alaska + Canada + USA + Mexico)
const PATH_NORTH_AMERICA = `
  M 32,42 L 52,34 L 70,32 L 88,34
  L 104,40 L 116,50 L 110,62 L 97,68
  L 88,78 L 96,88 L 108,96 L 122,96
  L 138,92 L 152,88 L 164,88 L 174,92
  L 182,100 L 188,112 L 192,126
  L 198,138 L 208,148 L 220,154
  L 234,156 L 248,157 L 262,156
  L 274,157 L 284,164 L 292,174
  L 298,185 L 296,198 L 286,208
  L 272,216 L 258,222 L 248,232
  L 238,242 L 226,250 L 214,258
  L 203,256 L 195,244 L 192,232
  L 186,222 L 176,215 L 164,212
  L 152,217 L 142,226 L 130,232
  L 116,226 L 102,212 L 90,196
  L 78,180 L 66,163 L 56,146
  L 48,130 L 41,114 L 36,98
  L 30,82 L 28,66 L 30,52 Z
`;

// Greenland
const PATH_GREENLAND = `
  M 290,18 L 308,12 L 326,10 L 342,12
  L 354,20 L 358,32 L 352,44 L 340,52
  L 324,56 L 308,52 L 296,44 L 288,34 Z
`;

// South America — teardrop, widest at north, narrows to southern cone
const PATH_SOUTH_AMERICA = `
  M 270,222 L 284,218 L 298,216 L 312,218
  L 324,224 L 334,232 L 342,244
  L 348,258 L 352,274 L 356,292
  L 360,312 L 363,334 L 364,357
  L 362,380 L 356,404 L 347,426
  L 334,446 L 318,463 L 300,474
  L 282,478 L 264,474 L 248,463
  L 236,449 L 228,432 L 223,414
  L 221,395 L 224,375 L 228,355
  L 228,334 L 225,312 L 218,291
  L 212,272 L 211,254 L 217,239
  L 228,228 L 242,222 L 256,220 Z
`;

// Asia — Arabia Peninsula + Indian subcontinent visible on the right
const PATH_ARABIA = `
  M 628,182 L 638,176 L 648,172 L 656,176
  L 660,186 L 658,198 L 652,210 L 644,220
  L 636,226 L 628,222 L 622,212
  L 618,200 L 620,190 Z
`;

const PATH_INDIA = `
  M 668,168 L 678,162 L 690,158 L 702,158
  L 714,162 L 722,170 L 726,182 L 724,196
  L 718,210 L 708,222 L 696,230
  L 684,224 L 675,214 L 669,202
  L 665,190 Z
`;

// Part of mainland Asia (Turkey → Central Asia visible at top right)
const PATH_ASIA_COAST = `
  M 574,130 L 586,124 L 600,118 L 614,115
  L 628,115 L 642,118 L 654,124 L 664,132
  L 672,142 L 676,154 L 674,164 L 666,170
  L 656,174 L 643,172 L 632,168 L 622,162
  L 612,156 L 600,152 L 588,148 L 578,143 Z
`;

// Australia — Gulf of Carpentaria indentation + Cape York + Great Australian Bight
const PATH_AUSTRALIA = `
  M 784,338 L 800,330 L 816,326 L 832,327
  L 844,333 L 852,342 L 854,354
  L 848,364 L 836,368 L 826,362
  L 822,352 L 820,344 L 828,342
  L 830,350 L 832,358
  L 840,364 L 852,366 L 860,374
  L 864,386 L 866,400 L 864,414
  L 860,428 L 852,440 L 840,450
  L 826,456 L 810,458 L 794,456
  L 778,450 L 764,440 L 752,426
  L 743,410 L 738,393 L 738,376
  L 744,361 L 754,350 L 766,343
  L 776,340 Z
`;

// ────────────────────────────────────────────────────────────────────────────

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
        className="min-h-screen flex text-white"
        style={{ animation: "page-in .3s ease both", background: "#0b1120" }}
      >

        {/* ── Left brand panel ── */}
        <div
          className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-14 overflow-hidden"
          style={{
            background: "linear-gradient(160deg,#0f1e35 0%,#0b1422 100%)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Right-edge depth shadow */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-24"
            style={{ background: "linear-gradient(to right,transparent,rgba(0,0,0,0.2))" }}
          />

          {/* ── World map watermark ── */}
          <svg
            viewBox="0 0 960 540"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 w-full h-full pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Ocean tint — very subtle so continents read against it */}
            <rect width="960" height="540" fill="rgba(148,163,184,0.015)" />

            {/* Continents — each slightly different opacity for depth */}

            {/* North America */}
            <path d={PATH_NORTH_AMERICA} fill="white" opacity="0.04" />
            <path d={PATH_GREENLAND}     fill="white" opacity="0.03" />

            {/* South America */}
            <path d={PATH_SOUTH_AMERICA} fill="white" opacity="0.04" />

            {/* Europe */}
            <path d={PATH_EUROPE}        fill="white" opacity="0.05" />
            <path d={PATH_SCANDINAVIA}   fill="white" opacity="0.04" />
            <path d={PATH_GB}            fill="white" opacity="0.04" />

            {/* Africa — brightest: primary market */}
            <path d={PATH_AFRICA}        fill="white" opacity="0.09" />
            <path d={PATH_MADAGASCAR}    fill="white" opacity="0.07" />

            {/* Asia */}
            <path d={PATH_ASIA_COAST}    fill="white" opacity="0.04" />
            <path d={PATH_ARABIA}        fill="white" opacity="0.05" />
            <path d={PATH_INDIA}         fill="white" opacity="0.05" />

            {/* Australia */}
            <path d={PATH_AUSTRALIA}     fill="white" opacity="0.04" />

            {/* Subtle graticule lines (lat/lon grid) */}
            <g stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" fill="none">
              {/* Latitude lines every 15° */}
              {[15,30,45,60].map(lat => {
                const y = (75 - lat) / 135 * 540;
                return <line key={lat} x1="0" y1={y} x2="960" y2={y} />;
              })}
              {[-15,-30,-45].map(lat => {
                const y = (75 - lat) / 135 * 540;
                return <line key={lat} x1="0" y1={y} x2="960" y2={y} />;
              })}
              {/* Longitude lines every 30° */}
              {[-150,-120,-90,-60,-30,0,30,60,90,120,150].map(lon => {
                const x = (lon + 180) / 360 * 960;
                return <line key={lon} x1={x} y1="0" x2={x} y2="540" />;
              })}
            </g>

            {/* Equator — slightly more visible */}
            <line
              x1="0" y1={75 / 135 * 540}
              x2="960" y2={75 / 135 * 540}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1"
            />

            {/* Tropic of Cancer */}
            <line
              x1="0" y1={(75 - 23.5) / 135 * 540}
              x2="960" y2={(75 - 23.5) / 135 * 540}
              stroke="rgba(249,115,22,0.06)" strokeWidth="0.75" strokeDasharray="4 6"
            />

            {/* Tropic of Capricorn */}
            <line
              x1="0" y1={(75 + 23.5) / 135 * 540}
              x2="960" y2={(75 + 23.5) / 135 * 540}
              stroke="rgba(249,115,22,0.06)" strokeWidth="0.75" strokeDasharray="4 6"
            />
          </svg>

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
          className="flex-1 flex flex-col items-center justify-center px-8 py-12"
          style={{ background: "#0b1120" }}
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
