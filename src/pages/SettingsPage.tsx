import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { getStoredLastLoginAt } from "../auth/sessionUser";
import { useTheme } from "../auth/themeContext";
import {
  createAdminUser,
  createClientUser,
  deleteClientUser,
  listClientUsers,
  type ClientUserRecord,
  updateClientUser,
} from "../services/authService";

type Props = {
  view: "profile" | "access" | "session" | "system" | "users";
};

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

export default function SettingsPage({ view }: Props) {
  const { user } = useAuth();
  const theme = useTheme();
  const [role, setRole] = useState<"client" | "admin">("client");
  const [insurerName, setInsurerName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editInsurerName, setEditInsurerName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [managedUsers, setManagedUsers] = useState<ClientUserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const lastLogin = getStoredLastLoginAt();
  const lastLoginLabel = lastLogin
    ? new Date(lastLogin).toLocaleString()
    : "Unknown";
  const email = user?.name
    ? `${user.name.toLowerCase().replace(/\s+/g, ".")}@abcinsurance.com`
    : "unknown@abcinsurance.com";

  const cardBg = theme === "light" ? "bg-[#f5f9fd]" : "bg-[#111827]";
  const heading = theme === "light" ? "text-[#1e293b]" : "text-white";
  const body = theme === "light" ? "text-[#5b6f84]" : "text-slate-300";
  // CSS global rules handle input bg/text/border for both themes — no bg-white class (it gets !important-overridden to dark)
  const inputCls = "mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none transition";
  const cardRowCls = theme === "light"
    ? "rounded-xl border border-[rgba(190,210,228,0.45)] px-4 py-4 bg-[#eaf1f8]"
    : "rounded-xl border border-white/10 px-4 py-4";
  const btnOutlineCls = theme === "light"
    ? "rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 bg-[#dae6f2] transition hover:bg-[#cddeed]"
    : "rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20";
  const btnPrimaryCls = theme === "light"
    ? "rounded-xl px-5 py-2.5 text-sm font-semibold text-white bg-primary transition"
    : "rounded-xl border border-white/10 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:border-white/20";

  useEffect(() => {
    if (view !== "users" || user?.role !== "admin") {
      return;
    }

    let isActive = true;
    setIsLoadingUsers(true);

    async function loadUsers() {
      try {
        const users = await listClientUsers();
        if (!isActive) {
          return;
        }
        setManagedUsers(users);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to load client users.",
        });
      } finally {
        if (isActive) {
          setIsLoadingUsers(false);
        }
      }
    }

    void loadUsers();

    return () => {
      isActive = false;
    };
  }, [user?.role, view]);

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (password !== confirmPassword) {
      setFeedback({
        type: "error",
        message: "Password and confirm password must match.",
      });
      return;
    }

    try {
      if (role === "admin") {
        const createdUser = await createAdminUser({ insurerName, username, password });
        setInsurerName("");
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setFeedback({
          type: "success",
          message: `Admin user ${createdUser.name} created successfully.`,
        });
      } else {
        const createdUser = await createClientUser({ insurerName, username, password });
        setManagedUsers((current) =>
          [...current, createdUser].sort((left, right) =>
            left.insurerName.localeCompare(right.insurerName)
          )
        );
        setInsurerName("");
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setFeedback({
          type: "success",
          message: `Client user ${createdUser.username} created successfully.`,
        });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to create user.",
      });
    }
  }

  function beginEditUser(entry: ClientUserRecord) {
    setFeedback(null);
    setEditingUserId(entry.id);
    setEditInsurerName(entry.insurerName);
    setEditUsername(entry.username);
    setEditPassword("");
    setEditConfirmPassword("");
  }

  function cancelEditUser() {
    setEditingUserId(null);
    setEditInsurerName("");
    setEditUsername("");
    setEditPassword("");
    setEditConfirmPassword("");
  }

  async function handleSaveUser(userId: string) {
    setFeedback(null);

    if (editPassword !== editConfirmPassword) {
      setFeedback({
        type: "error",
        message: "Password and confirm password must match.",
      });
      return;
    }

    try {
      const updatedUser = await updateClientUser(userId, {
        insurerName: editInsurerName,
        username: editUsername,
        password: editPassword,
      });

      setManagedUsers((current) =>
        current
          .map((entry) => (entry.id === userId ? updatedUser : entry))
          .sort((left, right) => left.insurerName.localeCompare(right.insurerName))
      );
      cancelEditUser();
      setFeedback({
        type: "success",
        message: `Client user ${updatedUser.username} updated successfully.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to update client user.",
      });
    }
  }

  async function handleDeleteUser(userId: string, usernameToDelete: string) {
    setFeedback(null);

    const confirmation = window.prompt(
      `Type Delete to confirm removing client user ${usernameToDelete}.`
    );
    if (confirmation !== "Delete") {
      if (confirmation !== null) {
        setFeedback({
          type: "error",
          message: "Deletion cancelled. Type Delete exactly to confirm removal.",
        });
      }
      return;
    }

    try {
      await deleteClientUser(userId);
      if (editingUserId === userId) {
        cancelEditUser();
      }
      setManagedUsers((current) => current.filter((entry) => entry.id !== userId));
      setFeedback({
        type: "success",
        message: `Client user ${usernameToDelete} deleted successfully.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to delete client user.",
      });
    }
  }

  const heroText = theme === "light" ? "text-[#1e293b]" : "text-white";
  const heroSub  = theme === "light" ? "text-[#5b6f84]" : "text-slate-300";

  return (
    <div className="space-y-4">
      <section className={`relative overflow-hidden rounded-[28px] p-6 ${
        theme === "light"
          ? "bg-[#f5f9fd] border border-[rgba(198,215,229,0.42)] shadow-[0_2px_8px_rgba(130,168,200,0.10),_0_8px_24px_rgba(130,168,200,0.08)]"
          : "bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(180deg,#0f172a_0%,#020617_100%)] border border-white/10 shadow-[0_28px_60px_rgba(2,6,23,0.42)]"
      }`}>
        {/* World map watermark */}
        <svg
          viewBox="0 0 960 540"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          style={{ opacity: theme === "light" ? 0 : 1 }}
        >
          <path d="M 32,42 L 52,34 L 70,32 L 88,34 L 104,40 L 116,50 L 110,62 L 97,68 L 88,78 L 96,88 L 108,96 L 122,96 L 138,92 L 152,88 L 164,88 L 174,92 L 182,100 L 188,112 L 192,126 L 198,138 L 208,148 L 220,154 L 234,156 L 248,157 L 262,156 L 274,157 L 284,164 L 292,174 L 298,185 L 296,198 L 286,208 L 272,216 L 258,222 L 248,232 L 238,242 L 226,250 L 214,258 L 203,256 L 195,244 L 192,232 L 186,222 L 176,215 L 164,212 L 152,217 L 142,226 L 130,232 L 116,226 L 102,212 L 90,196 L 78,180 L 66,163 L 56,146 L 48,130 L 41,114 L 36,98 L 30,82 L 28,66 L 30,52 Z" fill="white" opacity="0.04"/>
          <path d="M 270,222 L 284,218 L 298,216 L 312,218 L 324,224 L 334,232 L 342,244 L 348,258 L 352,274 L 356,292 L 360,312 L 363,334 L 364,357 L 362,380 L 356,404 L 347,426 L 334,446 L 318,463 L 300,474 L 282,478 L 264,474 L 248,463 L 236,449 L 228,432 L 223,414 L 221,395 L 224,375 L 228,355 L 228,334 L 225,312 L 218,291 L 212,272 L 211,254 L 217,239 L 228,228 L 242,222 L 256,220 Z" fill="white" opacity="0.04"/>
          <path d="M 456,152 L 462,147 L 470,145 L 480,145 L 488,148 L 496,145 L 507,143 L 516,142 L 524,144 L 532,140 L 542,135 L 554,131 L 564,128 L 572,130 L 582,126 L 592,128 L 600,132 L 610,130 L 618,128 L 624,135 L 622,143 L 615,148 L 616,156 L 620,165 L 616,174 L 608,182 L 598,188 L 586,191 L 574,188 L 562,186 L 556,192 L 548,198 L 536,202 L 524,196 L 519,186 L 524,177 L 528,169 L 524,162 L 514,159 L 503,163 L 496,170 L 490,178 L 484,172 L 478,163 L 482,155 L 484,148 L 476,146 L 466,149 L 459,157 L 455,163 L 450,157 Z" fill="white" opacity="0.04"/>
          {/* Africa — most prominent */}
          <path d="M 467,160 L 480,153 L 492,151 L 504,151 L 512,153 L 520,156 L 530,155 L 540,158 L 550,160 L 558,164 L 563,172 L 557,174 L 569,177 L 571,181 L 564,188 L 568,198 L 576,212 L 583,226 L 588,240 L 596,250 L 616,256 L 608,268 L 600,283 L 592,298 L 587,315 L 582,335 L 575,358 L 567,382 L 556,408 L 545,424 L 534,432 L 528,436 L 516,430 L 504,416 L 491,400 L 478,383 L 464,364 L 451,343 L 440,322 L 432,304 L 424,288 L 416,278 L 407,273 L 400,270 L 394,264 L 392,255 L 396,247 L 405,243 L 412,238 L 417,230 L 418,221 L 415,212 L 409,203 L 402,194 L 396,184 L 392,175 L 396,167 L 405,162 L 416,159 L 427,157 L 436,156 L 444,157 L 450,159 L 458,160 Z" fill="white" opacity="0.08"/>
          <path d="M 601,302 L 610,294 L 618,298 L 623,313 L 625,330 L 624,348 L 620,366 L 613,381 L 604,388 L 595,382 L 590,366 L 588,348 L 589,330 L 592,314 Z" fill="white" opacity="0.05"/>
          <path d="M 574,130 L 586,124 L 600,118 L 614,115 L 628,115 L 642,118 L 654,124 L 664,132 L 672,142 L 676,154 L 674,164 L 666,170 L 656,174 L 643,172 L 632,168 L 622,162 L 612,156 L 600,152 L 588,148 L 578,143 Z" fill="white" opacity="0.04"/>
          <path d="M 784,338 L 800,330 L 816,326 L 832,327 L 844,333 L 852,342 L 854,354 L 848,364 L 836,368 L 826,362 L 822,352 L 820,344 L 828,342 L 830,350 L 832,358 L 840,364 L 852,366 L 860,374 L 864,386 L 866,400 L 864,414 L 860,428 L 852,440 L 840,450 L 826,456 L 810,458 L 794,456 L 778,450 L 764,440 L 752,426 L 743,410 L 738,393 L 738,376 L 744,361 L 754,350 L 766,343 L 776,340 Z" fill="white" opacity="0.04"/>
          <g stroke="rgba(255,255,255,0.015)" strokeWidth="0.5" fill="none">
            {[15,30,45,60,-15,-30,-45].map((lat) => (
              <line key={lat} x1="0" y1={(75-lat)/135*540} x2="960" y2={(75-lat)/135*540}/>
            ))}
            {[-150,-120,-90,-60,-30,0,30,60,90,120,150].map((lon) => (
              <line key={lon} x1={(lon+180)/360*960} y1="0" x2={(lon+180)/360*960} y2="540"/>
            ))}
          </g>
          <line x1="0" y1={75/135*540} x2="960" y2={75/135*540} stroke="rgba(255,255,255,0.025)" strokeWidth="0.75"/>
          <line x1="0" y1={(75-23.5)/135*540} x2="960" y2={(75-23.5)/135*540} stroke="rgba(249,115,22,0.03)" strokeWidth="0.75" strokeDasharray="4 6"/>
          <line x1="0" y1={(75+23.5)/135*540} x2="960" y2={(75+23.5)/135*540} stroke="rgba(249,115,22,0.03)" strokeWidth="0.75" strokeDasharray="4 6"/>
        </svg>

        <div className="relative z-10">
          <h1 className={`text-4xl font-semibold tracking-tight ${heroText}`}>Settings</h1>
          <p className={`mt-2 text-base ${heroSub}`}>
            Manage your account, users, and platform settings.
          </p>
        </div>
      </section>

      {view === "profile" && (
        <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
          <h3 className={`text-lg font-semibold ${heading}`}>Profile</h3>
          <div className={`mt-4 space-y-2 text-sm ${body}`}>
            <div>
              <span className="text-muted">Name:</span> {user?.name ?? "Unknown"}
            </div>
            <div>
              <span className="text-muted">Email:</span> {email}
            </div>
            <div>
              <span className="text-muted">Role:</span> {user?.role ?? "Unknown"}
            </div>
          </div>
        </div>
      )}

      {view === "access" && (
        <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
          <h3 className={`text-lg font-semibold ${heading}`}>Access &amp; Role</h3>
          <div className={`mt-4 space-y-2 text-sm ${body}`}>
            <div>
              <span className="text-muted">Role:</span>{" "}
              <span className="font-semibold">{user?.role ?? "Unknown"}</span>
            </div>
            <div>
              <span className="text-muted">Assigned scope:</span>{" "}
              {user?.role === "admin"
                ? "Full dashboard, search, claims, and device database access"
                : "Dashboard, search, and claim logging access"}
            </div>
          </div>
        </div>
      )}

      {view === "session" && (
        <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
          <h3 className={`text-lg font-semibold ${heading}`}>Session</h3>
          <div className={`mt-4 space-y-2 text-sm ${body}`}>
            <div>
              <span className="text-muted">Status:</span> Active
            </div>
            <div>
              <span className="text-muted">Last login:</span> {lastLoginLabel}
            </div>
          </div>
        </div>
      )}

      {view === "users" && (
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
            <h3 className={`text-lg font-semibold ${heading}`}>Create User</h3>
            <p className="mt-1 text-sm text-muted">
              Create a new login. The user will use these credentials on the sign-in page.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleCreateUser}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Role
                </label>
                {theme === "light" ? (
                  <div className="mt-2 flex rounded-xl p-1 bg-[#dae6f2]">
                    <button
                      type="button"
                      onClick={() => setRole("client")}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        role === "client"
                          ? "bg-[#f5f9fd] text-slate-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-600"
                      }`}
                    >
                      Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("admin")}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        role === "admin"
                          ? "bg-[#f5f9fd] text-slate-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-600"
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("client")}
                      className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                        role === "client"
                          ? "border-slate-400 bg-slate-900 text-white"
                          : "border-white/10 bg-slate-800 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("admin")}
                      className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                        role === "admin"
                          ? "border-slate-400 bg-slate-900 text-white"
                          : "border-white/10 bg-slate-800 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Insurer Name
                </label>
                <input
                  value={insurerName}
                  onChange={(event) => setInsurerName(event.target.value)}
                  className={inputCls}
                  placeholder="Enter insurer name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Username
                </label>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className={inputCls}
                  placeholder="Create username"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputCls}
                  placeholder="Create password"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={inputCls}
                  placeholder="Re-enter password"
                />
              </div>

              {feedback && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm ${
                    feedback.type === "success"
                      ? "border border-green-200 bg-green-50 text-green-800"
                      : "border border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              <div className="flex justify-end">
                <button type="submit" className={btnPrimaryCls}>
                  Create {role === "admin" ? "Admin" : "Client"} User
                </button>
              </div>
            </form>
          </div>

          <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
            <h3 className={`text-lg font-semibold ${heading}`}>Existing Client Users</h3>
            <p className="mt-1 text-sm text-muted">
              All client users currently available to sign in appear here.
            </p>

            <div className="mt-6 space-y-3">
              {isLoadingUsers ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted">
                  Loading client users...
                </div>
              ) : managedUsers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted">
                  No client users have been created yet.
                </div>
              ) : (
                managedUsers.map((entry) => {
                  const editable = !entry.builtIn;
                  const isEditing = editingUserId === entry.id;

                  return (
                    <div key={entry.id} className={cardRowCls}>
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Insurer Name
                            </label>
                            <input
                              value={editInsurerName}
                              onChange={(event) => setEditInsurerName(event.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Username
                            </label>
                            <input
                              value={editUsername}
                              onChange={(event) => setEditUsername(event.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              New Password
                            </label>
                            <input
                              type="password"
                              value={editPassword}
                              onChange={(event) => setEditPassword(event.target.value)}
                              className={inputCls}
                              placeholder="Set a new password"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Confirm Password
                            </label>
                            <input
                              type="password"
                              value={editConfirmPassword}
                              onChange={(event) => setEditConfirmPassword(event.target.value)}
                              className={inputCls}
                              placeholder="Confirm new password"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEditUser}
                              className={btnOutlineCls}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSaveUser(entry.id)}
                              className={btnPrimaryCls}
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className={`font-semibold ${heading}`}>
                                {entry.insurerName}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {entry.builtIn && (
                                <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                                  Built-in
                                </div>
                              )}
                              <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                                Client
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-end justify-between gap-3">
                            <div className={`space-y-1 text-sm ${body}`}>
                              <div>Username: {entry.username}</div>
                              <div>Authentication: server-managed and encrypted</div>
                            </div>
                            {editable && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => beginEditUser(entry)}
                                  className={btnOutlineCls}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteUser(entry.id, entry.username)}
                                  className={
                                    theme === "light"
                                      ? "rounded-xl px-4 py-2 text-sm font-semibold text-rose-600 bg-[#fbe8e8] transition hover:bg-[#f5d5d5]"
                                      : "rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-sm font-semibold text-rose-400 transition hover:border-rose-500/30 hover:bg-rose-500/10"
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {view === "system" && (
        <div className="space-y-4">
          <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
            <h3 className={`text-lg font-semibold ${heading}`}>System Info</h3>
            <div className={`mt-4 space-y-2 text-sm ${body}`}>
              <div>
                <span className="text-muted">Environment:</span> Demo
              </div>
              <div>
                <span className="text-muted">App version:</span> 0.1.0
              </div>
            </div>
          </div>

          <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
            <h3 className={`text-lg font-semibold ${heading}`}>
              Claims Centre of Truth (CCT) v1.0.0
            </h3>
            <p className={`mt-2 text-sm ${body}`}>
              A shared platform for recording, validating, and preventing
              duplicate device claims across insurers.
            </p>
            <p className={`mt-4 text-sm ${body}`}>
              Developed by K Mathepe &amp; J Mlondobuzi
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
