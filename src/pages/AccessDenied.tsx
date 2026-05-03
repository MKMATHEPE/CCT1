import { Link } from "react-router-dom";

export default function AccessDenied() {
  return (
    <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">
        Access denied
      </h2>
      <p className="mt-2 text-sm text-muted">
        Your current role does not have permission to view this section.
      </p>
      <Link
        to="/"
        className="mt-4 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary hover:text-primary"
      >
        Return to dashboard
      </Link>
    </div>
  );
}
