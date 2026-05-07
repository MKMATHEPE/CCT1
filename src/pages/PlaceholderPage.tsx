import { useTheme } from "../auth/themeContext";

type Props = {
  title: string;
  description?: string;
  body?: string;
  badge?: string;
};

export default function PlaceholderPage({
  title,
  description,
  body,
  badge,
}: Props) {
  const theme = useTheme();
  const cardBg = theme === "light" ? "bg-[#f5f9fd]" : "bg-slate-900/90";
  const heading = theme === "light" ? "text-gray-900" : "text-white";
  return (
    <div className={`${cardBg} border border-border rounded-xl p-6 shadow-sm`}>
      <div className="flex items-center gap-3">
        <h2 className={`text-xl font-semibold ${heading}`}>
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
      {body && (
        <div className={`mt-4 text-sm ${theme === "light" ? "text-gray-600" : "text-slate-300"}`}>
          {body}
        </div>
      )}
    </div>
  );
}
