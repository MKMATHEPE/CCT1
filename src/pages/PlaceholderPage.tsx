type Props = {
  title: string;
  description?: string;
  badge?: string;
};

export default function PlaceholderPage({
  title,
  description,
  badge,
}: Props) {
  return (
    <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-gray-900">
          {title}
        </h2>
        {badge && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-bg text-muted border border-border">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-2 text-sm text-muted">
          {description}
        </p>
      )}
      <div className="mt-4 text-sm text-gray-600">
        This section is ready for wiring into your data sources.
      </div>
    </div>
  );
}
