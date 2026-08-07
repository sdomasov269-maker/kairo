import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role?: Role;
    displayName?: string;
  }
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: Role;
    displayName?: string;
  }
}
