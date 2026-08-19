import { notFound } from "next/navigation";
import { MinimalHlsDebugPlayer } from "@/components/debug/MinimalHlsDebugPlayer";

export const dynamic = "force-dynamic";

export default async function HlsDebugPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { src } = await searchParams;
  return <MinimalHlsDebugPlayer initialSource={src ?? ""} />;
}
