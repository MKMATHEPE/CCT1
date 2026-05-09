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

const WORLD_MAP_ASSET = "/world-map.svg";

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
        <img
          src={WORLD_MAP_ASSET}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full pointer-events-none select-none object-cover"
          style={{
            opacity: theme === "light" ? 0.19 : 0.16,
            filter: "drop-shadow(0 12px 18px rgba(2,6,23,0.38))",
            mixBlendMode: theme === "light" ? "multiply" : "screen",
          }}
        />

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
