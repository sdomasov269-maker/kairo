import { notFound } from "next/navigation";
import { KodikPlayerDebug } from "./KodikPlayerDebug";

export const dynamic = "force-dynamic";

export default function KodikPlayerDebugPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <KodikPlayerDebug />;
}
