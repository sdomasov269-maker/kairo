export type AppBackgroundVariant =
  "default" | "discovery" | "detail" | "watch" | "auth";

export function AppBackground({
  variant = "default",
}: {
  variant?: AppBackgroundVariant;
}) {
  return (
    <div
      className={`app-background app-background-${variant}`}
      aria-hidden="true"
    >
      <i />
      <i />
    </div>
  );
}
