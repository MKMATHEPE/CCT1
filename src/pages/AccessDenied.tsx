import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { writeAuditLog } from "../services/auditLogService";

type Props = {
  title?: string;
};

export default function AccessDenied({ title = "Access restricted" }: Props) {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const actor = user?.id ?? "system";
    const actorRole = user?.role ?? "unknown";
    writeAuditLog({
      actor,
      actorRole,
      action: "PERMISSION_DENIED",
      target: location.pathname,
      outcome: "FAILURE",
      context: "Access denied",
    });
  }, [location.pathname, user]);

  return (
    <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-muted">
        You do not have permission to view this section.
      </p>
    </div>
  );
}
