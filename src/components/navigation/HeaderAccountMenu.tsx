"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { UserRound } from "lucide-react";
import { SyncStatusIndicator } from "@/components/data/SyncStatusIndicator";
import { useLocale } from "@/i18n";
export function HeaderAccountMenu() {
  const { data: session, status } = useSession();
  const { dictionary: t } = useLocale();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    if (open) firstLink.current?.focus();
  }, [open]);
  if (status === "loading")
    return (
      <span className="icon-button profile-button" aria-hidden="true">
        <UserRound size={18} />
      </span>
    );
  return (
    <div className="account-menu" ref={root}>
      <button
        className="icon-button profile-button"
        aria-label={t.sync.profile}
        aria-expanded={open}
        aria-controls="account-menu-panel"
        onClick={() => setOpen((value) => !value)}
      >
        {session?.user?.image ? (
          <img src={session.user.image} alt="" />
        ) : (
          <UserRound size={18} />
        )}
      </button>
      {open && (
        <div id="account-menu-panel" className="account-menu-panel">
          {session?.user ? (
            <>
              <strong>{session.user.name}</strong>
              <small>{session.user.email}</small>
              <SyncStatusIndicator />
              <Link
                ref={firstLink}
                href="/profile"
                onClick={() => setOpen(false)}
              >
                {t.sync.profile}
              </Link>
            </>
          ) : (
            <>
              <Link
                ref={firstLink}
                href="/login"
                onClick={() => setOpen(false)}
              >
                {t.sync.signIn}
              </Link>
              <Link href="/register" onClick={() => setOpen(false)}>
                {t.sync.createAccount}
              </Link>
            </>
          )}
          <Link href="/my-list" onClick={() => setOpen(false)}>
            {t.sync.myList}
          </Link>
          <Link href="/history" onClick={() => setOpen(false)}>
            {t.sync.history}
          </Link>
          <Link href="/settings" onClick={() => setOpen(false)}>
            {t.sync.settings}
          </Link>
          {session?.user && (
            <button onClick={() => void signOut({ callbackUrl: "/" })}>
              {t.sync.signOut}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
