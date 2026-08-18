import "server-only";

let validated = false;

export function validateServerEnv(): void {
  if (validated || process.env.NODE_ENV !== "production") return;

  const required = ["DATABASE_URL", "NEXTAUTH_URL"];
  if (!(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET)) {
    required.push("NEXTAUTH_SECRET (or AUTH_SECRET)");
  }
  if (
    process.env.KODIK_PROVIDER_ENABLED === "true" &&
    !process.env.KODIK_API_TOKEN
  ) {
    required.push("KODIK_API_TOKEN");
  }
  if (
    process.env.ANILIBERTY_PROVIDER_ENABLED === "true" &&
    !process.env.ANILIBERTY_API_TOKEN
  ) {
    required.push("ANILIBERTY_API_TOKEN");
  }

  const missing = required.filter((name) =>
    name.includes("(") ? true : !process.env[name]?.trim(),
  );
  if (missing.length) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(", ")}`,
    );
  }
  validated = true;
}
