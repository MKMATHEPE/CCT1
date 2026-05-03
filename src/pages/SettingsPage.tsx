import { useAuth } from "../auth/useAuth";

type Props = {
  view: "profile" | "access" | "session" | "system";
};

export default function SettingsPage({ view }: Props) {
  const { user } = useAuth();
  const lastLogin = sessionStorage.getItem("cct:last-login");
  const lastLoginLabel = lastLogin
    ? new Date(lastLogin).toLocaleString()
    : "Unknown";
  const email = user?.name
    ? `${user.name.toLowerCase().replace(/\s+/g, ".")}@abcinsurance.com`
    : "unknown@abcinsurance.com";

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Settings
            </h2>
            <p className="mt-1 text-sm text-muted">
              Read-only account, access, and system context.
            </p>
          </div>
        </div>
      </div>

      {view === "profile" && (
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            Profile
          </h3>
          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <div>
              <span className="text-muted">Name:</span>{" "}
              {user?.name ?? "Unknown"}
            </div>
            <div>
              <span className="text-muted">Email:</span> {email}
            </div>
            <div>
              <span className="text-muted">Role:</span>{" "}
              {user?.role ?? "Unknown"}
            </div>
          </div>
        </div>
      )}

      {view === "access" && (
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            Access & Role
          </h3>
          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <div>
              <span className="text-muted">Role:</span>{" "}
              <span className="font-semibold">
                {user?.role ?? "Unknown"}
              </span>
            </div>
            <div>
              <span className="text-muted">Assigned scope:</span>{" "}
              {user?.role === "manager" || user?.role === "admin"
                ? "All investigations, risk queue, exports"
                : "Assigned cases, open cases, risk queue"}
            </div>
          </div>
        </div>
      )}

      {view === "session" && (
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            Session
          </h3>
          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <div>
              <span className="text-muted">Status:</span> Active
            </div>
            <div>
              <span className="text-muted">Last login:</span>{" "}
              {lastLoginLabel}
            </div>
          </div>
        </div>
      )}

      {view === "system" && (
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            System Info
          </h3>
          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <div>
              <span className="text-muted">Environment:</span>{" "}
              Demo
            </div>
            <div>
              <span className="text-muted">App version:</span>{" "}
              0.1.0
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
