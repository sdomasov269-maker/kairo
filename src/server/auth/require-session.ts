import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "./options";
export class UnauthorizedError extends Error {}
export async function requireUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new UnauthorizedError("Unauthorized");
  return {
    userId: session.user.id,
    role: session.user.role,
    email: session.user.email,
  };
}
