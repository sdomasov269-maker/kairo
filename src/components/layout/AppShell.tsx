import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/navigation/Header";

export function AppShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`app-shell ${className}`}>
      <Header />
      {children}
      <Footer />
    </div>
  );
}
