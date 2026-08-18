import { Footer } from "@/components/layout/Footer";

export function AppShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`app-shell ${className}`}>
      {children}
      <Footer />
    </div>
  );
}
