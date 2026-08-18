"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/i18n";
import { safeCallbackUrl } from "@/server/validation/auth";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const { dictionary: t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const isLogin = mode === "login";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));

    if (!isLogin) {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        setError(
          response.status === 409 ? t.auth.accountExists : t.auth.invalidData,
        );
        setBusy(false);
        return;
      }
      router.push("/login?registered=1");
      return;
    }

    const callbackUrl = safeCallbackUrl(params.get("callbackUrl"));
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
      callbackUrl,
    });
    if (!result?.ok) {
      setError(t.auth.invalidCredentials);
      setBusy(false);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  const submitLabel = isLogin ? t.auth.login : t.auth.createAccount;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="logo" href="/">
          kairo<span>.</span>
        </Link>
        <p className="eyebrow">
          {isLogin ? t.auth.account : t.auth.newProfile}
        </p>
        <h1>{submitLabel}</h1>
        <form onSubmit={submit}>
          {!isLogin && (
            <label>
              {t.auth.name}
              <input
                name="displayName"
                minLength={2}
                maxLength={40}
                required
                autoComplete="name"
              />
            </label>
          )}
          <label>
            {t.auth.email}
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            {t.auth.password}
            <span className="password-field">
              <input
                name="password"
                type={show ? "text" : "password"}
                minLength={isLogin ? 1 : 10}
                maxLength={128}
                required
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShow((visible) => !visible)}
                aria-pressed={show}
              >
                {show ? t.auth.hidePassword : t.auth.showPassword}
              </button>
            </span>
          </label>
          {!isLogin && (
            <label>
              {t.auth.confirmPassword}
              <input
                name="confirmPassword"
                type={show ? "text" : "password"}
                minLength={10}
                maxLength={128}
                required
                autoComplete="new-password"
              />
            </label>
          )}
          <p className="auth-error" role="alert" aria-live="polite">
            {error || "\u00a0"}
          </p>
          <button className="button button-primary" disabled={busy}>
            {busy ? "…" : submitLabel}
          </button>
        </form>
        <p>
          {isLogin ? t.auth.noAccount : t.auth.alreadyAccount}{" "}
          <Link href={isLogin ? "/register" : "/login"}>
            {isLogin ? t.auth.createAccount : t.auth.login}
          </Link>
        </p>
        <small>{t.auth.guestAvailable}</small>
      </section>
    </main>
  );
}
