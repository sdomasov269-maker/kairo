import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function NewReleasesPage() {
  redirect("/catalog?view=episodes");
}
