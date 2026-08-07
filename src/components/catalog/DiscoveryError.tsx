"use client";

import { useEffect } from "react";
import { useLocale } from "@/i18n";
import { ErrorState } from "@/components/ui/States";

export function DiscoveryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { dictionary: t } = useLocale();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title={t.player.loadError}
      description={t.player.connectionLost}
      actionLabel={t.player.retry}
      onAction={reset}
    />
  );
}
