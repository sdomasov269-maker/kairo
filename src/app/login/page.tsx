import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
