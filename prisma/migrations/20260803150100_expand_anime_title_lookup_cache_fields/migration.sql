ALTER TABLE "AnimeTitleLookupCache"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "retryable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastHttpStatus" INTEGER;

-- Classify legacy TEMPORARY_ERROR rows without making HTTP 4xx retryable.
UPDATE "AnimeTitleLookupCache"
SET
  "status" = CASE
    WHEN "error" ~* 'HTTP 429' THEN 'RATE_LIMITED'::"AnimeTitleLookupStatus"
    WHEN "error" ~* 'HTTP 404' THEN 'NOT_FOUND'::"AnimeTitleLookupStatus"
    WHEN "error" ~* 'HTTP 5[0-9][0-9]' THEN 'SERVER_ERROR'::"AnimeTitleLookupStatus"
    WHEN "error" ~* 'timeout|timed out|aborted' THEN 'TIMEOUT'::"AnimeTitleLookupStatus"
    WHEN "error" ~* 'HTTP (400|401|403)' THEN 'CLIENT_ERROR'::"AnimeTitleLookupStatus"
    ELSE 'NETWORK_ERROR'::"AnimeTitleLookupStatus"
  END,
  "retryable" = NOT ("error" ~* 'HTTP (400|401|403|404)'),
  "attemptCount" = 1,
  "lastAttemptAt" = "updatedAt",
  "nextRetryAt" = CASE WHEN "error" ~* 'HTTP (400|401|403|404)' THEN NULL ELSE NOW() END,
  "lastHttpStatus" = CASE
    WHEN substring("error" from 'HTTP ([0-9]{3})') IS NOT NULL
    THEN substring("error" from 'HTTP ([0-9]{3})')::INTEGER
    ELSE NULL
  END
WHERE "status" = 'TEMPORARY_ERROR';

UPDATE "AnimeTitleLookupCache"
SET "status" = 'NOT_FOUND', "retryable" = false, "nextRetryAt" = NULL
WHERE "lastHttpStatus" = 404 AND "status" = 'NETWORK_ERROR';

CREATE INDEX IF NOT EXISTS "AnimeTitleLookupCache_provider_status_retryable_nextRetryAt_idx"
ON "AnimeTitleLookupCache"("provider", "status", "retryable", "nextRetryAt");
