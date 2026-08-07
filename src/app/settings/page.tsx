"use client";

import Link from "next/link";
import { useCallback, useState, useSyncExternalStore } from "react";
import { Cloud, HardDrive, Play, Wifi, WifiOff } from "lucide-react";
import { clearAccountCache, emptyPreferences } from "@/lib/account-data";
import { useAccountData } from "@/components/data/AccountDataProvider";
import { SyncStatusIndicator } from "@/components/data/SyncStatusIndicator";
import {
  SettingsRow,
  SettingsSection,
  SettingsSwitch,
} from "@/components/settings/SettingsUI";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AppShell } from "@/components/layout/AppShell";
import { useLocale } from "@/i18n";
import { PageHero } from "@/components/ui/PageHero";

const subscribeNetwork = (listener: () => void) => {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
};

export default function SettingsPage() {
  const {
    mode,
    preferences,
    updatePreferences,
    pendingCount,
    lastSyncedAt,
    refresh,
    clearHistory,
    clearList,
  } = useAccountData();
  const { locale, dictionary: t } = useLocale();
  const online = useSyncExternalStore(
    subscribeNetwork,
    () => navigator.onLine,
    () => true,
  );
  const [confirmation, setConfirmation] = useState<
    "local-data" | "account-cache" | null
  >(null);
  const closeConfirmation = useCallback(() => setConfirmation(null), []);

  const update = <Key extends keyof typeof preferences>(
    key: Key,
    value: (typeof preferences)[Key],
  ) => updatePreferences({ ...preferences, [key]: value });

  const clearLocalData = () => {
    clearHistory();
    clearList();
    updatePreferences(emptyPreferences);
  };

  const formattedLastSync =
    lastSyncedAt && Number.isFinite(Date.parse(lastSyncedAt))
      ? new Date(lastSyncedAt).toLocaleString(locale)
      : t.sync.neverSynced;

  return (
    <AppShell>
      <main className="settings-page">
        <div className="settings-container">
          <PageHero
            className="settings-hero"
            eyebrow={t.sync.settingsEyebrow}
            title={t.sync.settings}
            description={t.sync.settingsDescription}
          />

          <div className="settings-grid">
            <SettingsSection
              title={t.sync.accountAndSync}
              description={
                mode.kind === "guest"
                  ? t.sync.guestModeDescription
                  : t.sync.accountModeDescription
              }
            >
              <div className="settings-section-icon" aria-hidden="true">
                {mode.kind === "guest" ? <HardDrive /> : <Cloud />}
              </div>
              <div className="settings-status-grid">
                <div>
                  <span>{t.sync.mode}</span>
                  <strong className="settings-badge">
                    {mode.kind === "guest"
                      ? t.sync.browserOnly
                      : t.sync.account}
                  </strong>
                </div>
                <div>
                  <span>{t.sync.queueCount}</span>
                  <strong>
                    {pendingCount ? pendingCount : t.sync.noPendingChanges}
                  </strong>
                </div>
                <div>
                  <span>{t.sync.lastSync}</span>
                  <strong>{formattedLastSync}</strong>
                </div>
                <div>
                  <span>{t.sync.networkStatus}</span>
                  <strong className={online ? "is-online" : "is-offline"}>
                    {online ? <Wifi /> : <WifiOff />}
                    {online ? t.sync.connected : t.sync.noConnection}
                  </strong>
                </div>
              </div>
              <SyncStatusIndicator />
              <div className="settings-actions">
                {mode.kind === "guest" ? (
                  <>
                    <Link
                      className="button button-primary"
                      href="/login?callbackUrl=/settings"
                    >
                      {t.sync.signInForSync}
                    </Link>
                    <button
                      className="button button-danger-ghost"
                      onClick={() => setConfirmation("local-data")}
                    >
                      {t.sync.clearLocalData}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="button button-primary"
                      onClick={() => void refresh()}
                    >
                      {t.sync.retrySync}
                    </button>
                    <button
                      className="button button-danger-ghost"
                      onClick={() => setConfirmation("account-cache")}
                    >
                      {t.sync.clearAccountCache}
                    </button>
                  </>
                )}
              </div>
            </SettingsSection>

            <SettingsSection
              title={t.sync.playerSettings}
              description={t.sync.deviceSettings}
            >
              <div className="settings-section-icon" aria-hidden="true">
                <Play />
              </div>
              <div className="settings-rows">
                <SettingsRow
                  id="playback-rate"
                  label={t.sync.playbackSpeed}
                  description={t.sync.playbackSpeedDescription}
                >
                  <select
                    id="playback-rate"
                    className="settings-select"
                    value={preferences.playbackRate}
                    aria-describedby="playback-rate-description"
                    onChange={(event) =>
                      update("playbackRate", Number(event.target.value))
                    }
                  >
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}×
                      </option>
                    ))}
                  </select>
                </SettingsRow>

                <SettingsRow
                  id="autoplay-next"
                  label={t.sync.autoplayNext}
                  description={t.sync.autoplayDescription}
                >
                  <SettingsSwitch
                    id="autoplay-next"
                    checked={preferences.autoplayNext}
                    label={t.sync.autoplayNext}
                    descriptionId="autoplay-next-description"
                    onChange={(value) => update("autoplayNext", value)}
                  />
                </SettingsRow>

                <SettingsRow
                  id="subtitle-language"
                  label={t.sync.subtitleLanguage}
                  description={t.sync.subtitleLanguageDescription}
                >
                  <select
                    id="subtitle-language"
                    className="settings-select"
                    value={preferences.subtitleLanguage ?? ""}
                    aria-describedby="subtitle-language-description"
                    onChange={(event) =>
                      update("subtitleLanguage", event.target.value || null)
                    }
                  >
                    <option value="">{t.sync.notSelected}</option>
                    <option value="ru">{t.sync.russian}</option>
                    <option value="en">{t.sync.english}</option>
                    <option value="ja">{t.sync.japanese}</option>
                  </select>
                </SettingsRow>

                <SettingsRow
                  id="subtitles-enabled"
                  label={t.sync.subtitlesDefault}
                  description={t.sync.subtitlesDefaultDescription}
                >
                  <SettingsSwitch
                    id="subtitles-enabled"
                    checked={preferences.subtitlesEnabled}
                    label={t.sync.subtitlesDefault}
                    descriptionId="subtitles-enabled-description"
                    onChange={(value) => update("subtitlesEnabled", value)}
                  />
                </SettingsRow>

                <SettingsRow
                  id="subtitle-size"
                  label={t.sync.subtitleSize}
                  description={t.sync.subtitleSizeDescription}
                >
                  <select
                    id="subtitle-size"
                    className="settings-select"
                    value={preferences.subtitleSize}
                    aria-describedby="subtitle-size-description"
                    onChange={(event) =>
                      update(
                        "subtitleSize",
                        event.target.value as typeof preferences.subtitleSize,
                      )
                    }
                  >
                    <option value="small">{t.sync.small}</option>
                    <option value="medium">{t.sync.medium}</option>
                    <option value="large">{t.sync.large}</option>
                  </select>
                </SettingsRow>

                <SettingsRow
                  id="subtitle-background"
                  label={t.sync.subtitleBackground}
                  description={t.sync.subtitleBackgroundDescription}
                >
                  <select
                    id="subtitle-background"
                    className="settings-select"
                    value={preferences.subtitleBackground}
                    aria-describedby="subtitle-background-description"
                    onChange={(event) =>
                      update(
                        "subtitleBackground",
                        event.target
                          .value as typeof preferences.subtitleBackground,
                      )
                    }
                  >
                    <option value="none">{t.sync.none}</option>
                    <option value="shadow">{t.sync.shadow}</option>
                    <option value="solid">{t.sync.solid}</option>
                  </select>
                </SettingsRow>

                <SettingsRow
                  id="preferred-audio"
                  label={t.sync.preferredAudio}
                  description={t.sync.preferredAudioDescription}
                >
                  <select
                    id="preferred-audio"
                    className="settings-select"
                    value={preferences.preferredAudioLanguage ?? ""}
                    aria-describedby="preferred-audio-description"
                    onChange={(event) =>
                      update(
                        "preferredAudioLanguage",
                        event.target.value || null,
                      )
                    }
                  >
                    <option value="">{t.sync.notSelected}</option>
                    <option value="ru">{t.sync.russian}</option>
                    <option value="ja">{t.sync.japanese}</option>
                    <option value="en">{t.sync.english}</option>
                  </select>
                </SettingsRow>

                <SettingsRow
                  id="preferred-quality"
                  label={t.sync.quality}
                  description={t.sync.qualityDescription}
                >
                  <select
                    id="preferred-quality"
                    className="settings-select"
                    value={preferences.preferredQualityMode}
                    aria-describedby="preferred-quality-description"
                    onChange={(event) =>
                      update(
                        "preferredQualityMode",
                        event.target.value === "auto"
                          ? "auto"
                          : Number(event.target.value),
                      )
                    }
                  >
                    <option value="auto">{t.sync.automatic}</option>
                    {[480, 720, 1080].map((quality) => (
                      <option key={quality} value={quality}>
                        {quality}p
                      </option>
                    ))}
                  </select>
                </SettingsRow>

                <SettingsRow
                  id="effects-preference"
                  label={t.sync.effects}
                  description={t.sync.effectsDescription}
                >
                  <select
                    id="effects-preference"
                    className="settings-select"
                    value={preferences.reducedEffectsPreference}
                    aria-describedby="effects-preference-description"
                    onChange={(event) =>
                      update(
                        "reducedEffectsPreference",
                        event.target
                          .value as typeof preferences.reducedEffectsPreference,
                      )
                    }
                  >
                    <option value="full">{t.sync.full}</option>
                    <option value="balanced">{t.sync.balanced}</option>
                    <option value="minimal">{t.sync.minimal}</option>
                  </select>
                </SettingsRow>
              </div>
            </SettingsSection>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={confirmation === "local-data"}
        title={t.sync.clearLocalQuestion}
        description={t.sync.clearLocalDescription}
        confirmLabel={t.sync.clearLocalData}
        cancelLabel={t.sync.cancel}
        destructive
        onClose={closeConfirmation}
        onConfirm={clearLocalData}
      />
      <ConfirmDialog
        open={confirmation === "account-cache"}
        title={t.sync.clearAccountCache}
        description={t.sync.clearCacheQuestion}
        confirmLabel={t.sync.clearAccountCache}
        cancelLabel={t.sync.cancel}
        destructive
        onClose={closeConfirmation}
        onConfirm={() => {
          if (mode.kind === "account") clearAccountCache(mode.userId);
        }}
      />
    </AppShell>
  );
}
