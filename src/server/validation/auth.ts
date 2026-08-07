import { z } from "zod";

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const safeCallbackUrl = (value: string | null | undefined) =>
  value?.startsWith("/") && !value.startsWith("//") ? value : "/";

const displayName = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value));
const email = z.string().trim().email().transform(normalizeEmail);
const password = z.string().min(10).max(128);

export const credentialsSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});
export const registrationSchema = z
  .object({ displayName, email, password, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "password_mismatch",
  });
