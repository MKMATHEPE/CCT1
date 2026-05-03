import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { getStoredLastLoginAt } from "../auth/sessionUser";
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

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
            <p className="mt-1 text-sm text-muted">
              Read-only account, access, and system context.
            </p>
          </div>
        </div>
      </div>

      {view === "profile" && (
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
          <div className="mt-4 space-y-2 text-sm text-gray-700">
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
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Access & Role</h3>
          <div className="mt-4 space-y-2 text-sm text-gray-700">
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
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Session</h3>
          <div className="mt-4 space-y-2 text-sm text-gray-700">
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
          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Create User</h3>
            <p className="mt-1 text-sm text-muted">
              Create a new login. The user will use these credentials on the sign-in page.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleCreateUser}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Role
                </label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("client")}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                      role === "client"
                        ? "border-slate-400 bg-slate-900 text-white"
                        : "border-border bg-white text-slate-600 hover:border-slate-300"
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
                        : "border-border bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Insurer Name
                </label>
                <input
                  value={insurerName}
                  onChange={(event) => setInsurerName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
                  className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
                  className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
                  className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
                <button
                  type="submit"
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300"
                >
                  Create {role === "admin" ? "Admin" : "Client"} User
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Existing Client Users</h3>
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
                    <div
                      key={entry.id}
                      className="rounded-xl border border-border px-4 py-4"
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Insurer Name
                            </label>
                            <input
                              value={editInsurerName}
                              onChange={(event) => setEditInsurerName(event.target.value)}
                              className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Username
                            </label>
                            <input
                              value={editUsername}
                              onChange={(event) => setEditUsername(event.target.value)}
                              className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
                              className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
                              className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                              placeholder="Confirm new password"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEditUser}
                              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSaveUser(entry.id)}
                              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-300"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800">
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
                            <div className="space-y-1 text-sm text-slate-700">
                              <div>Username: {entry.username}</div>
                              <div>Authentication: server-managed and encrypted</div>
                            </div>
                            {editable && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => beginEditUser(entry)}
                                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteUser(entry.id, entry.username)}
                                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-200 hover:bg-rose-50"
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
          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">System Info</h3>
            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <div>
                <span className="text-muted">Environment:</span> Demo
              </div>
              <div>
                <span className="text-muted">App version:</span> 0.1.0
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">
              Claims Centre of Truth (CCT) v1.0.0
            </h3>
            <p className="mt-2 text-sm text-gray-700">
              A shared platform for recording, validating, and preventing
              duplicate device claims across insurers.
            </p>
            <p className="mt-4 text-sm text-gray-700">
              Developed by K Mathepe &amp; J Mlondobuzi
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
