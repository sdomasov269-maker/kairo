| FILE | LOCATION | CURRENT STRING | CATEGORY | USER VISIBLE | ACTION |
|---|---:|---|---|---|---|
| prisma/seed.mjs | 5:15 | Development seed is disabled. | string literal | REVIEW | VERIFY_CONTEXT |
| prisma/seed.mjs | 13:5 | Set DEV_SEED_EMAIL and a DEV_SEED_PASSWORD of at least 10 characters. | string literal | REVIEW | VERIFY_CONTEXT |
| prisma/seed.mjs | 18:10 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| prisma/seed.mjs | 27:35 | Kairo Dev | property:displayName | REVIEW | VERIFY_CONTEXT |
| prisma/seed.mjs | 29:15 | Development user is ready. | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/anime-title-stats.ts | 1:34 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/anime-title-stats.ts | 2:30 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/anime-title-stats.ts | 10:37 | --max-attempts= | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/anime-title-stats.ts | 81:15 | RU missing by reason: | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/anime-title-stats.ts | 89:15 | Retryable errors by status/type: | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/anime-title-stats.ts | 109:15 | Report: reports/anime-title-coverage/missing-ru.json | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/apply-title-cache-migration.ts | 1:26 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/apply-title-cache-migration.ts | 2:30 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/check-title-cache-schema.ts | 1:30 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/check-title-cache-schema.ts | 12:5 | SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name IN ('20260803150000_expand_anime_title_lookup_cache', '20260803150100_expand_anime | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/check-title-cache-schema.ts | 15:5 | SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'AnimeTitleLookupCache' ORDER BY ordinal_position | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/check-title-cache-schema.ts | 18:5 | SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid WHERE pg_type.typname = 'AnimeTitleLookupStatus' ORDER BY enumsortorder | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/dev/check-provider.mjs | 14:15 | Provider health: PASS | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 1:30 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 12:16 | SELECT COUNT(*) AS count FROM (SELECT "animeId", "number" FROM "AnimeSeason" GROUP BY 1,2 HAVING COUNT(*) > 1) value | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 14:16 | SELECT COUNT(*) AS count FROM (SELECT "seasonId", "number" FROM "AnimeEpisode" GROUP BY 1,2 HAVING COUNT(*) > 1) value | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 16:16 | SELECT COUNT(*) AS count FROM "AnimeSeason" season LEFT JOIN "Anime" anime ON anime.id = season."animeId" WHERE anime.id IS NULL | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 18:16 | SELECT COUNT(*) AS count FROM "AnimeEpisode" episode LEFT JOIN "AnimeSeason" season ON season.id = episode."seasonId" WHERE season.id IS NULL | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 20:16 | SELECT COUNT(*) AS count FROM "AnimeEpisode" episode LEFT JOIN "Anime" anime ON anime.id = episode."animeId" WHERE anime.id IS NULL | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 22:16 | SELECT COUNT(*) AS count FROM "AnimeEpisode" episode JOIN "AnimeSeason" season ON season.id = episode."seasonId" WHERE episode."animeId" <> season."animeId" | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 24:16 | SELECT COUNT(*) AS count FROM "AnimeSeason" WHERE "number" <= 0 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 26:16 | SELECT COUNT(*) AS count FROM "AnimeEpisode" WHERE "number" <= 0 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 28:16 | SELECT COUNT(*) AS count FROM "AnimeEpisode" WHERE "durationSec" < 0 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 30:16 | SELECT COUNT(*) AS count FROM "AnimeEpisode" WHERE "introStartSec" < 0 OR "introEndSec" < 0 OR "outroStartSec" < 0 OR "outroEndSec" < 0 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 32:16 | SELECT COUNT(*) AS count FROM "AnimeEpisode" WHERE "introEndSec" < "introStartSec" | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 34:16 | SELECT COUNT(*) AS count FROM "AnimeEpisode" WHERE "outroEndSec" < "outroStartSec" | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 36:16 | SELECT COUNT(*) AS count FROM (SELECT anime.id FROM "Anime" anime JOIN "AnimeEpisode" episode ON episode."animeId" = anime.id WHERE anime.format = 'MOVIE' GROUP BY anime.id HAVING  | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 38:16 | SELECT COUNT(*) AS count FROM "AnimeEpisode" WHERE "availableAt" > CURRENT_TIMESTAMP AND "isPublished" = false | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-check.ts | 40:16 | SELECT COUNT(*) AS count FROM "AnimeEpisode" episode JOIN "Anime" anime ON anime.id = episode."animeId" WHERE anime.slug <> 'eclipse-protocol' AND episode.description IS NULL AND e | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-seed-demo.ts | 1:30 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-seed-demo.ts | 9:21 | Eclipse Protocol | property:titleEnglish | YES | LOCALIZE_OR_JUSTIFY |
| scripts/episodes-seed-demo.ts | 10:20 | Eclipse Protocol | property:titleRomaji | YES | LOCALIZE_OR_JUSTIFY |
| scripts/episodes-seed-demo.ts | 23:14 | Season 1 | property:title | YES | LOCALIZE_OR_JUSTIFY |
| scripts/episodes-seed-demo.ts | 60:14 | Demo DASH | property:label | YES | LOCALIZE_OR_JUSTIFY |
| scripts/episodes-seed-demo.ts | 72:14 | Demo MP4 | property:label | YES | LOCALIZE_OR_JUSTIFY |
| scripts/episodes-stats.ts | 1:30 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-sync.ts | 1:42 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-sync.ts | 121:18 | Mass write requires --apply; continuing in dry-run mode. | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-sync.ts | 143:11 | No matching Anime found | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-sync.ts | 182:5 | Would create seasons | property:Would create seasons | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-sync.ts | 186:5 | Would create episodes | property:Would create episodes | REVIEW | VERIFY_CONTEXT |
| scripts/episodes-sync.ts | 191:5 | Unknown episode count | property:Unknown episode count | REVIEW | VERIFY_CONTEXT |
| scripts/generate-missing-episodes.ts | 1:42 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/generate-missing-episodes.ts | 74:55 | Season 1 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/generate-missing-episodes.ts | 115:28 | Dry-run mode. Add --apply to write changes. | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/generate-missing-episodes.ts | 134:50 | unknown error | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/localization/ru-audit.ts | 1:44 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/localization/ru-audit.ts | 2:18 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/localization/ru-audit.ts | 22:36 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/localization/ru-audit.ts | 49:22 | string literal | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/localization/ru-audit.ts | 53:20 | JSX text | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/localization/ru-audit.ts | 102:3 | \| FILE \| LOCATION \| CURRENT STRING \| CATEGORY \| USER VISIBLE \| ACTION \| \|---\|---:\|---\|---\|---\|---\| | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/localization/ru-coverage.ts | 1:53 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/localization/ru-coverage.ts | 2:30 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/localization/ru-verify.ts | 1:26 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/localization/ru-verify.ts | 2:18 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/localization/ru-verify.ts | 5:34 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/localization/ru-verify.ts | 62:5 | Direct English/Romaji title rendering is forbidden: | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/localization/ru-verify.ts | 68:5 | PASS: no direct English/Romaji title rendering in production TSX | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-anime-detail.mjs | 1:26 | file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-anime-detail.mjs | 4:16 | C:/Program Files/Google/Chrome/Application/chrome.exe | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-anime-detail.mjs | 42:34 | section#player | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-anime-detail.mjs | 43:36 | [data-testid=kairo-player] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-anime-detail.mjs | 45:47 | #playback-translation | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-anime-detail.mjs | 50:43 | #playback-translation | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-anime-detail.mjs | 61:47 | [data-testid=kairo-player] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-anime-detail.mjs | 110:21 | NOT AVAILABLE | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-anime-detail.mjs | 112:3 | [aria-label="Выбор эпизода"] button | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-anime-detail.mjs | 127:60 | NOT AVAILABLE | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-anime-detail.mjs | 135:30 | #playback-translation | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-anime-detail.mjs | 159:24 | [data-testid=kairo-player] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 1:29 | node:perf_hooks | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 2:26 | file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 7:19 | C:/Program Files/Google/Chrome/Application/chrome.exe | property:executablePath | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 8:10 | --autoplay-policy=no-user-gesture-required | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 85:30 | [data-testid=kairo-player] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 90:41 | Load CVH voices | property:name | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 91:32 | CVH voices | property:hasText | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 94:15 | Translation / voice | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 98:41 | Resolve playback | property:name | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 100:22 | descriptor ready | property:hasText | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 104:47 | [data-testid=kairo-player] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 201:41 | Load translations | property:name | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 203:22 | Kodik translations | property:hasText | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 207:41 | Resolve playback | property:name | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 209:22 | Kodik descriptor ready | property:hasText | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-animego-cvh.mjs | 213:47 | [data-testid=kairo-player] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 1:26 | file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 8:18 | KairoContinue123! | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 11:19 | C:/Program Files/Google/Chrome/Application/chrome.exe | property:executablePath | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 12:10 | --autoplay-policy=no-user-gesture-required | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 23:24 | Continue QA | property:displayName | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 44:41 | login session was not retained | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 54:24 | [data-testid="kairo-player"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 96:33 | [data-testid="continue-watching"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 97:36 | a[href*="/anime/"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 99:19 | Continue Watching card was not rendered | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 103:32 | [aria-label$="%"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 118:24 | [data-testid="kairo-player"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 126:14 | [data-testid="kairo-player"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 158:22 | [data-testid="continue-watching"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 170:30 | [data-testid="autonext"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 193:24 | [data-testid="kairo-player"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 201:14 | [data-testid="kairo-player"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 204:45 | #playback-translation | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 207:46 | #playback-translation | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 232:22 | [data-testid="kairo-player"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 240:21 | [data-testid="autonext"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-continue-autonext.mjs | 241:21 | [data-testid="autonext"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-kodik-player.mjs | 1:26 | file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-kodik-player.mjs | 5:19 | C:/Program Files/Google/Chrome/Application/chrome.exe | property:executablePath | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-kodik-player.mjs | 6:10 | --autoplay-policy=no-user-gesture-required | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-kodik-player.mjs | 37:25 | :hls:seg- | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-kodik-player.mjs | 45:20 | :hls:seg- | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-kodik-player.mjs | 56:18 | :hls:seg- | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-kodik-player.mjs | 60:39 | unknown media request failure | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-kodik-player.mjs | 95:24 | Stall observations | property:hasText | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-kodik-player.mjs | 124:49 | Timeline is not measurable | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-kodik-player.mjs | 182:38 | Load translations | property:name | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-kodik-player.mjs | 195:33 | /api/playback/kodik? | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-kodik-player.mjs | 198:38 | Resolve playback | property:name | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-kodik-player.mjs | 200:24 | Descriptor resolved | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-manual-quality.mjs | 1:29 | node:perf_hooks | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-manual-quality.mjs | 2:26 | file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-manual-quality.mjs | 7:19 | C:/Program Files/Google/Chrome/Application/chrome.exe | property:executablePath | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-manual-quality.mjs | 8:10 | --autoplay-policy=no-user-gesture-required | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-manual-quality.mjs | 33:59 | request failed | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-manual-quality.mjs | 36:22 | **/api/playback/resolve?** | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-manual-quality.mjs | 158:22 | [data-testid="kairo-player"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-manual-quality.mjs | 181:22 | [data-testid="kairo-player"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-manual-quality.mjs | 205:22 | [data-testid="kairo-player"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-manual-quality.mjs | 231:22 | [data-testid="kairo-player"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-manual-quality.mjs | 264:22 | [data-testid="kairo-player"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-player-ux.mjs | 1:26 | file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-player-ux.mjs | 6:19 | C:/Program Files/Google/Chrome/Application/chrome.exe | property:executablePath | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-player-ux.mjs | 7:10 | --autoplay-policy=no-user-gesture-required | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-player-ux.mjs | 19:29 | [data-testid=kairo-player] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-player-ux.mjs | 20:30 | [aria-label="Видеоплеер Kairo"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-player-ux.mjs | 54:30 | Video bounds unavailable | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-player-ux.mjs | 93:38 | Timeline bounds unavailable | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-player-ux.mjs | 156:22 | [role="menu"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-player-ux.mjs | 204:20 | [data-testid="episode-navigator"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-player-ux.mjs | 283:35 | button, input, output | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 1:29 | node:perf_hooks | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 2:26 | file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 7:19 | C:/Program Files/Google/Chrome/Application/chrome.exe | property:executablePath | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 8:10 | --autoplay-policy=no-user-gesture-required | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 20:29 | [data-testid=kairo-player] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 23:40 | Load translations | property:name | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 25:22 | Kodik translations | property:hasText | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 28:15 | Translation / voice | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 29:12 | option:checked | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 32:40 | Resolve playback | property:name | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 34:22 | kodik · fallback=no | property:hasText | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 58:40 | Resolve playback | property:name | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 60:22 | kodik · fallback=no | property:hasText | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 64:5 | /api/playback/resolve?shikimoriId=56735&episode=2&title=%D0%90%D0%BA%D0%BA%D1%83%D1%80%D0%B0%D1%82%D0%BD%D0%B0%D1%8F%20%D0%B8%20%D1%81%D0%B8%D0%BC%D0%BF%D0%B0%D1%82%D0%B8%D1%87%D0% | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 68:43 | Translation / voice | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 72:42 | Resolve playback | property:name | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 74:24 | kodik · fallback=no | property:hasText | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 79:15 | Simulate Kodik failure | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 88:40 | Resolve playback | property:name | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 90:22 | animego-cvh · fallback=yes | property:hasText | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 95:5 | /api/playback/resolve?shikimoriId=56735&episode=1&title=%D0%90%D0%BA%D0%BA%D1%83%D1%80%D0%B0%D1%82%D0%BD%D0%B0%D1%8F%20%D0%B8%20%D1%81%D0%B8%D0%BC%D0%BF%D0%B0%D1%82%D0%B8%D1%87%D0% | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 140:5 | /api/playback/resolve?shikimoriId=56735&episode=1&title=test&simulateKodikFailure=PROVIDER_UNAVAILABLE&simulateCvhFailure=PROVIDER_UNAVAILABLE | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 147:29 | /api/playback/resolve? | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-provider-manager.mjs | 157:12 | [data-testid=kairo-player] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 1:26 | file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 6:19 | C:/Program Files/Google/Chrome/Application/chrome.exe | property:executablePath | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 7:10 | --autoplay-policy=no-user-gesture-required | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 29:37 | [aria-label="Выбор эпизода"] button | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 35:45 | [aria-label="Выбор эпизода"] button | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 51:39 | aside[aria-label='Управление просмотром'] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 52:44 | [aria-selected="true"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 84:35 | [aria-label="Выбор эпизода"] button | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 99:35 | [aria-label="Выбор эпизода"] button | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 107:36 | [aria-label="Выбор эпизода"] button | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 112:41 | [aria-label="Выбор сезона"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 113:46 | [aria-label="Выбор озвучки"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 114:43 | [aria-label="Выбор эпизода"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 156:41 | #playback-translation | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 159:41 | #playback-translation | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 193:31 | [aria-hidden="true"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-right-panel-polish.mjs | 221:35 | 01 / Kairo Watch | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-skip-segments.mjs | 1:26 | file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-skip-segments.mjs | 8:19 | C:/Program Files/Google/Chrome/Application/chrome.exe | property:executablePath | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-skip-segments.mjs | 9:10 | --autoplay-policy=no-user-gesture-required | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-skip-segments.mjs | 21:45 | [data-testid="kairo-player"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-skip-segments.mjs | 58:34 | #playback-translation | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-skip-segments.mjs | 83:20 | [data-testid="autonext"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-skip-segments.mjs | 84:48 | [data-testid="autonext"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-skip-segments.mjs | 89:18 | KairoSkip123! | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-skip-segments.mjs | 91:24 | Skip QA | property:displayName | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-skip-segments.mjs | 112:36 | [data-testid="skip-opening"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-skip-segments.mjs | 116:55 | [data-testid="skip-opening"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 1:26 | file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 5:3 | /anime/anilist-169583-oh-boy-was-i-wrong-about-her?episode=1 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 7:18 | KairoWatch123! | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 10:19 | C:/Program Files/Google/Chrome/Application/chrome.exe | property:executablePath | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 11:10 | --autoplay-policy=no-user-gesture-required | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 27:24 | Watch QA | property:displayName | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 32:20 | input[name="email"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 33:20 | input[name="password"] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 34:20 | form .button-primary | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 39:41 | login session was not established | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 122:36 | [data-testid=kairo-player] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 131:21 | resume after reload was not applied | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 160:34 | #playback-translation | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 182:43 | episode=1 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 182:56 | episode=2 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 217:20 | [data-testid=kairo-player] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 226:21 | episode-one resume was not restored | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 236:22 | [data-testid=kairo-player] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 255:43 | episode=1 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 255:56 | episode=2 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 269:42 | episode-one duration is missing | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/accept-watch-progress.mjs | 331:49 | kairo:pending-sync:v1 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/analyze-segment-timestamps.ts | 1:28 | node:crypto | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/analyze-segment-timestamps.ts | 2:28 | node:fs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/analyze-segment-timestamps.ts | 3:24 | node:os | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/analyze-segment-timestamps.ts | 4:22 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/analyze-segment-timestamps.ts | 5:27 | node:child_process | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/analyze-segment-timestamps.ts | 14:72 | Usage: analyze-segment-timestamps.ts <session-id> [count] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/analyze-segment-timestamps.ts | 104:142 | +faststart | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/archive-support/kodik-resolvers.ts | 30:53 | Kodik player chunk URL is missing | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/archive-support/kodik-resolvers.ts | 34:42 | Kodik returned no playable sources | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/archive-support/kodik-resolvers.ts | 44:36 | Rust resolver is not configured | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/archive-support/kodik-resolvers.ts | 53:56 | Rust resolver returned an invalid payload | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/benchmark-kodik-resolvers.ts | 1:44 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/benchmark-kodik-resolvers.ts | 2:25 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/benchmark-kodik-resolvers.ts | 23:93 | bytes=0-4095 | property:Range | REVIEW | VERIFY_CONTEXT |
| scripts/playback/benchmark-kodik-resolvers.ts | 25:94 | #EXTM3U | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/compare-hls-transports.mjs | 1:26 | file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/compare-hls-transports.mjs | 3:20 | C:/Program Files/Google/Chrome/Application/chrome.exe | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/compare-hls-transports.mjs | 4:23 | D:/ANIME/node_modules/hls.js/dist/hls.min.js | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/compare-hls-transports.mjs | 10:10 | --autoplay-policy=no-user-gesture-required | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/compare-hls-transports.mjs | 33:22 | :hls:seg- | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/compare-hls-transports.mjs | 66:35 | video/mp4; codecs="avc1.42E01E,mp4a.40.2" | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/compare-hls-transports.mjs | 161:38 | Load translations | property:name | REVIEW | VERIFY_CONTEXT |
| scripts/playback/compare-hls-transports.mjs | 176:33 | /api/playback/kodik? | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/compare-hls-transports.mjs | 179:38 | Resolve playback | property:name | REVIEW | VERIFY_CONTEXT |
| scripts/playback/compare-hls-transports.mjs | 181:24 | Descriptor resolved | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/compare-hls-transports.mjs | 197:29 | Timeline is not measurable | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/compare-hls-transports.mjs | 309:45 | --mode= | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/inspect-native-hls-cdp.mjs | 1:26 | file:///C:/Users/sdoma/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/inspect-native-hls-cdp.mjs | 16:19 | C:/Program Files/Google/Chrome/Application/chrome.exe | property:executablePath | REVIEW | VERIFY_CONTEXT |
| scripts/playback/inspect-native-hls-cdp.mjs | 17:10 | --autoplay-policy=no-user-gesture-required | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/inspect-native-hls-cdp.mjs | 46:23 | <video id="cdp-native-hls" muted playsinline></video> | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/inspect-native-hls-cdp.mjs | 48:40 | #cdp-native-hls | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/inspect-native-hls-cdp.mjs | 53:34 | #cdp-native-hls | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/inspect-native-hls-cdp.mjs | 58:52 | blob: | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/prepare-normalization-feasibility.ts | 1:28 | node:crypto | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/prepare-normalization-feasibility.ts | 2:100 | node:fs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/prepare-normalization-feasibility.ts | 3:24 | node:os | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/prepare-normalization-feasibility.ts | 4:22 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/prepare-normalization-feasibility.ts | 5:27 | node:child_process | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/prepare-normalization-feasibility.ts | 6:29 | node:perf_hooks | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/prepare-normalization-feasibility.ts | 14:72 | Usage: prepare-normalization-feasibility.ts <session-id> | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/prepare-normalization-feasibility.ts | 80:21 | #EXTM3U | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/prepare-normalization-feasibility.ts | 80:32 | #EXT-X-VERSION:3 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/prepare-normalization-feasibility.ts | 83:5 | #EXT-X-ENDLIST | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/prepare-normalization-feasibility.ts | 105:121 | segment-%03d.ts | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/prepare-normalization-feasibility.ts | 110:121 | expr:gte(t,n_forced*6) | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/prepare-normalization-feasibility.ts | 112:44 | segment-%03d.ts | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 1:64 | node:fs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 2:24 | node:os | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 3:22 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 4:23 | node:child_process | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 9:3 | C:\Program Files\Google\Chrome\Application\chrome.exe | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 10:3 | C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 11:3 | C:\Program Files\Microsoft\Edge\Application\msedge.exe | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 14:34 | No local Chrome/Edge executable found | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 20:3 | --autoplay-policy=no-user-gesture-required | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 21:47 | --window-size=900,700 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 21:72 | about:blank | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 36:172 | CDP socket failed | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 53:52 | Evaluation failed | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 56:64 | ({userAgent:navigator.userAgent,platform:navigator.platform,rvfc:typeof HTMLVideoElement.prototype.requestVideoFrameCallback==='function',quality:typeof HTMLVideoElement.prototype. | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 57:43 | Selected Chromium does not support requestVideoFrameCallback | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/run-chromium-rvfc-ab.ts | 66:184 | (()=>{const v=document.querySelector('video');return {result:window.__result,error:window.__error,current:v?.currentTime,duration:v?.duration,paused:v?.paused,ended:v?.ended,readyS | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/serve-normalization-feasibility.ts | 1:56 | node:fs | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/serve-normalization-feasibility.ts | 2:30 | node:http | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/serve-normalization-feasibility.ts | 3:42 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/serve-normalization-feasibility.ts | 4:24 | node:os | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/serve-normalization-feasibility.ts | 9:49 | text/html; charset=utf-8 | property:.html | REVIEW | VERIFY_CONTEXT |
| scripts/playback/serve-normalization-feasibility.ts | 11:14 | <!doctype html><meta charset="utf-8"><title>Kairo normalization feasibility</title> <script src="/shaka.js"></script><video id="video" muted playsinline style="width:640px"></video | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/playback/serve-normalization-feasibility.ts | 54:140 | not found | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-inspect-search.ts | 1:34 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-inspect-search.ts | 2:18 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-inspect-search.ts | 31:35 | --query= | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-inspect-search.ts | 33:31 | Use --query=<title> | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-inspect-search.ts | 54:21 | Search response exceeds 2 MB | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-inspect-search.ts | 65:7 | Field types: | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-inspect-search.ts | 71:7 | Nullable fields: | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-inspect-search.ts | 76:17 | Enum-like: | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-inspect-search.ts | 100:58 | Inspect failed | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-inspect.ts | 1:34 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-inspect.ts | 2:18 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-inspect.ts | 43:19 | OpenAPI schema exceeds 2 MB | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-search.ts | 8:35 | --query= | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-search.ts | 10:31 | Use --query=<title> | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-search.ts | 24:15 | Database writes: 0 Video requests: 0 Torrent requests: 0 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-search.ts | 32:48 | AniLiberty search failed | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-show.ts | 10:26 | Use --id=<release-id> | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-show.ts | 33:3 | Database writes: 0 Playback requests: 0 Media URLs printed: 0 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-sync.ts | 1:30 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-sync.ts | 11:26 | Use --id=<release-id> [--dry-run\|--apply] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-sync.ts | 16:20 | Dry-run complete. Database writes: 0 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-aniliberty-updates.ts | 1:30 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-catalog-report.ts | 24:13 | Kairo ranking: | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-catalog-report.ts | 30:3 | Imports: 0 Playback requests: 0 Media URLs collected: 0 Database writes: 0 Credentials used: 0 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-catalog-validate.ts | 8:3 | Imports: 0 Playback requests: 0 Media URLs collected: 0 Database writes: 0 Credentials used: 0 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-kodik-blocked.ts | 9:9 | Official documentation, API credentials and written integration permission are required | property:message | YES | LOCALIZE_OR_JUSTIFY |
| scripts/provider-kodik-diagnose.ts | 1:30 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-kodik-diagnose.ts | 79:33 | --title must not be empty | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-kodik-diagnose.ts | 126:7 | Use exactly one selector: --anime-id, --anilist-id, --shikimori-id, --mal-id or --title | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-kodik-diagnose.ts | 156:19 | Selected local anime has no MAL/Shikimori identifier | property:reason | REVIEW | VERIFY_CONTEXT |
| scripts/provider-kodik-diagnose.ts | 180:9 | local identifier resolution only | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-kodik-diagnose.ts | 215:48 | Kodik diagnostics failed | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-kodik-health.ts | 11:11 | Official contract and permission are not verified | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-kodik-health.ts | 12:11 | Provider, API base URL and token must all be configured | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-kodik-inspect.ts | 5:5 | Provider: Kodik Status: PARTNER_ACCESS_REQUIRED KODIK_API_BASE_URL is not configured. Network requests: 0 Playback requests: 0 Database writes: 0 | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-kodik-inspect.ts | 11:19 | KODIK_API_BASE_URL must not contain query or fragment | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-manifest-sync.ts | 1:30 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-manifest-sync.ts | 9:51 | --file= | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-manifest-sync.ts | 14:5 | Usage: npm run providers:manifest:sync -- --file=<path> [--dry-run\|--apply] | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-manifest-sync.ts | 17:19 | Choose either --dry-run or --apply | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-manifest-sync.ts | 30:7 | Dry-run only. No database records were changed. Use --apply explicitly to commit this exact manifest. | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-manifest-sync.ts | 34:7 | SELECT to_regclass('public."AnimeMediaProviderConfig"') IS NOT NULL AS present | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-manifest-sync.ts | 38:9 | Provider migration is not applied. Run npm run db:migrate and retry; do not use db push or reset. | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-manifest-validate.ts | 4:33 | --file= | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-manifest-validate.ts | 8:5 | Usage: npm run providers:manifest:validate -- --file=<path> | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-probe.ts | 1:44 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-probe.ts | 2:18 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-probe.ts | 16:5 | Use exactly one of --provider=<key> or --base-url=<https-url> | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-probe.ts | 20:56 | Invalid provider key | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-probe.ts | 41:7 | Ad-hoc candidate; authorization and capabilities are not verified. | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/provider-probe.ts | 57:337 | not verified | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/server-only-test-loader.mjs | 3:19 | data:text/javascript,export%20{} | property:url | REVIEW | VERIFY_CONTEXT |
| scripts/server-only-test-register.mjs | 1:26 | node:module | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/sync-anime-index.ts | 1:34 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/sync-anime-index.ts | 2:29 | node:perf_hooks | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/sync-anime-index.ts | 30:19 | --source must be snapshot, catalog or anilist | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/sync-anime-index.ts | 32:19 | Choose either --only-missing or --update-existing | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/sync-anime-index.ts | 163:7 | Anime index sync failed: | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/sync-anime-localized-titles.ts | 1:34 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/sync-anime-localized-titles.ts | 2:29 | node:perf_hooks | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/sync-anime-localized-titles.ts | 10:8 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/sync-anime-localized-titles.ts | 57:19 | --locale must be ru, uk or all | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/sync-anime-localized-titles.ts | 67:19 | --retry-before must be an ISO date | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/sync-anime-localized-titles.ts | 83:5 | Wikidata RU fallback is slow and intended only for small explicit batches. | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/sync-anime-localized-titles.ts | 87:21 | --fallback-wikidata requires --limit=50 or less | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/sync-anime-localized-titles.ts | 90:19 | --retry-api-errors currently requires --locale=ru | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/sync-anime-localized-titles.ts | 555:7 | Title sync failed: | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/test-kodik-direct.ts | 6:17 | Usage: npx tsx scripts/test-kodik-direct.ts "<kodik-player-url>" | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/test-kodik-direct.ts | 27:18 | original URL | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/test-kodik-direct.ts | 28:18 | canonical URL | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/test-kodik-direct.ts | 30:18 | parseLink basic | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/test-kodik-direct.ts | 32:18 | extended parse | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/test-kodik-direct.ts | 33:55 | playerSingleUrl is missing | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/test-kodik-direct.ts | 36:18 | resolved player chunk URL | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/test-kodik-direct.ts | 38:18 | detected videoInfo endpoint | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/test-kodik-direct.ts | 41:18 | getLinks result | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/test-kodik-direct.ts | 42:18 | available qualities | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/test-kodik-direct.ts | 47:19 | direct HLS failed | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/test-kodik.ts | 1:30 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/test-kodik.ts | 35:7 | Use exactly one of --slug=<anime-slug>, --mal-id=<id> or --shikimori-id=<id> | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/test-kodik.ts | 58:15 | Kodik diagnostic (read-only) | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/test-kodik.ts | 88:48 | Kodik diagnostic failed | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/trace-anime-title.ts | 1:30 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/trace-anime-title.ts | 14:19 | Provide a valid --anilist-id | string literal | REVIEW | VERIFY_CONTEXT |
| scripts/trace-anime-title.ts | 67:7 | Title trace failed: | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/AnimePlaybackPanel.tsx | 4:29 | @/components/player/KairoPlayer | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/AnimePlaybackPanel.tsx | 5:36 | @/components/player/KairoPlayer | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/AnimePlaybackPanel.tsx | 6:32 | @/components/data/AccountDataProvider | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/AnimePlaybackPanel.tsx | 12:8 | @/lib/playback/descriptor | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/AnimePlaybackPanel.tsx | 19:8 | @/lib/watch-progress/policy | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/AnimePlaybackPanel.tsx | 23:8 | @/lib/playback/autonext | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/AnimePlaybackPanel.tsx | 410:42 | 01 / Kairo / Просмотр | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/anime/[slug]/error.tsx | 7:25 | button button-primary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/loading.tsx | 4:22 | skeleton skeleton-poster | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/loading.tsx | 6:24 | skeleton skeleton-line short | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/loading.tsx | 7:24 | skeleton skeleton-title | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/loading.tsx | 8:24 | skeleton skeleton-line | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/loading.tsx | 9:24 | skeleton skeleton-line | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/not-found.tsx | 6:11 | Этой истории нет в каталоге Kairo. | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/anime/[slug]/not-found.tsx | 7:23 | button button-primary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/page.tsx | 3:27 | @/components/anime/Cards | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/page.tsx | 4:35 | @/components/effects/KairoWebGLSurface | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/page.tsx | 5:26 | @/components/layout/AppShell | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/page.tsx | 10:8 | @/lib/anime/resolve | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/page.tsx | 17:8 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/page.tsx | 19:34 | @/server/services/hero-image.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/page.tsx | 121:43 | Kairo / Тайтл | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/anime/[slug]/page.tsx | 144:60 | #player | attribute:href | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/page.tsx | 148:62 | #about-heading | attribute:href | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/page.tsx | 154:29 | KAIRO / ПРОСМОТР | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/anime/[slug]/WatchControlGrid.tsx | 5:31 | @/components/ui/KairoDropdown | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/WatchControlGrid.tsx | 6:42 | @/lib/playback/descriptor | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/anime/[slug]/WatchControlGrid.tsx | 150:43 | Музыка / Spotify | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/admin/anime-import/route.ts | 1:33 | node:crypto | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/admin/anime-import/route.ts | 3:33 | @/server/services/anime-import.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/admin/providers/aniliberty/import/route.ts | 3:24 | @/lib/db/prisma | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/admin/providers/aniliberty/import/route.ts | 4:36 | @/server/auth/require-session | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/admin/providers/aniliberty/import/route.ts | 8:8 | @/server/media-providers/adapters/aniliberty/sync | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/admin/providers/aniliberty/import/route.ts | 44:16 | Invalid request origin | property:error | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/admin/providers/aniliberty/import/route.ts | 48:39 | Rate limit exceeded | property:error | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/admin/providers/aniliberty/import/route.ts | 55:16 | Invalid request | property:error | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/admin/providers/aniliberty/import/route.ts | 68:16 | [audit] AniLiberty admin import | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/auth/[...nextauth]/route.ts | 2:29 | @/server/auth/options | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/auth/register/route.ts | 3:24 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/auth/register/route.ts | 4:24 | @/lib/db | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/auth/register/route.ts | 5:36 | @/server/validation/auth | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/catalog/route.ts | 2:36 | @/lib/catalog | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/catalog/route.ts | 3:37 | @/lib/catalog/identity | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/catalog/route.ts | 4:34 | @/lib/catalog/public | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/catalog/route.ts | 9:8 | @/lib/anilist | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/catalog/route.ts | 10:49 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/catalog/route.ts | 11:54 | @/lib/jikan | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/catalog/route.ts | 12:52 | @/server/services/anime-title-enrichment.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/catalog/route.ts | 20:37 | Catalog unavailable | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/comments/route.ts | 2:24 | @/lib/db | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/comments/route.ts | 6:8 | @/server/auth/require-session | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/comments/route.ts | 7:37 | @/server/validation/comment | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/comments/route.ts | 37:41 | Invalid comment | property:error | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/comments/route.ts | 44:43 | Invalid parent | property:error | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/comments/route.ts | 55:16 | Comment service unavailable | property:error | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/current-season/route.ts | 2:36 | @/lib/catalog | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/current-season/route.ts | 3:36 | @/server/services/current-season.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/current-season/route.ts | 21:16 | Invalid season request | property:error | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/current-season/route.ts | 28:24 | public, s-maxage=300, stale-while-revalidate=900 | property:Cache-Control | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/anime-list/[animeKey]/route.ts | 1:36 | @/server/auth/require-session | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/anime-list/[animeKey]/route.ts | 2:55 | @/server/api/response | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/anime-list/[animeKey]/route.ts | 3:33 | @/server/services/anime-list.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/anime-list/[animeKey]/route.ts | 4:26 | @/server/validation/data | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/anime-list/[animeKey]/route.ts | 13:37 | Invalid anime key. | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/anime-list/route.ts | 1:36 | @/server/auth/require-session | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/anime-list/route.ts | 2:55 | @/server/api/response | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/anime-list/route.ts | 7:8 | @/server/services/anime-list.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/anime-list/route.ts | 8:32 | @/server/validation/data | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/anime-list/route.ts | 35:37 | Invalid anime list data. | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/merge-local-data/route.ts | 1:55 | @/server/api/response | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/merge-local-data/route.ts | 2:36 | @/server/auth/require-session | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/merge-local-data/route.ts | 3:32 | @/server/services/merge.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/merge-local-data/route.ts | 4:37 | @/server/validation/merge | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/merge-local-data/route.ts | 13:39 | Too many merge attempts. | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/merge-local-data/route.ts | 22:37 | Request is too large. | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/merge-local-data/route.ts | 25:37 | Request is too large. | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/merge-local-data/route.ts | 28:37 | Invalid local data. | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/merge-local-data/route.ts | 34:37 | Invalid JSON. | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/preferences/route.ts | 1:36 | @/server/auth/require-session | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/preferences/route.ts | 2:55 | @/server/api/response | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/preferences/route.ts | 6:8 | @/server/services/preferences.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/preferences/route.ts | 7:34 | @/server/validation/data | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/preferences/route.ts | 25:37 | Invalid preferences data. | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/progress/[animeKey]/[season]/[episode]/route.ts | 1:36 | @/server/auth/require-session | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/progress/[animeKey]/[season]/[episode]/route.ts | 2:55 | @/server/api/response | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/progress/[animeKey]/[season]/[episode]/route.ts | 3:32 | @/server/services/progress.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/progress/[animeKey]/[season]/[episode]/route.ts | 4:44 | @/server/validation/data | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/progress/[animeKey]/[season]/[episode]/route.ts | 24:37 | Invalid progress key. | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/progress/route.ts | 1:36 | @/server/auth/require-session | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/progress/route.ts | 2:55 | @/server/api/response | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/progress/route.ts | 7:8 | @/server/services/progress.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/progress/route.ts | 8:31 | @/server/validation/data | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/me/progress/route.ts | 26:37 | Invalid progress data. | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/new/route.ts | 2:40 | @/lib/catalog/public | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/animego/resolve/route.ts | 2:37 | @/server/playback/animego-cvh-provider-client | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/animego/resolve/route.ts | 3:39 | @/server/playback/kodik-provider-client | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/animego/resolve/route.ts | 19:52 | Invalid titles | property:message | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/playback/animego/resolve/route.ts | 33:13 | AnimeGO title resolve failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/animego/route.ts | 2:40 | @/server/playback/animego-cvh-provider-client | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/animego/route.ts | 3:39 | @/server/playback/kodik-provider-client | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/animego/route.ts | 20:52 | Invalid playback query | property:message | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/playback/animego/route.ts | 38:13 | AnimeGO playback failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/animego/search/route.ts | 2:31 | @/server/playback/animego-cvh-provider-client | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/animego/search/route.ts | 3:39 | @/server/playback/kodik-provider-client | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/animego/search/route.ts | 11:52 | Invalid query | property:message | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/playback/animego/search/route.ts | 22:55 | AnimeGO search failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/animego/voices/route.ts | 2:34 | @/server/playback/animego-cvh-provider-client | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/animego/voices/route.ts | 3:39 | @/server/playback/kodik-provider-client | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/animego/voices/route.ts | 18:52 | Invalid voices query | property:message | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/playback/animego/voices/route.ts | 29:55 | AnimeGO voices failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/kodik/route.ts | 5:8 | @/server/playback/kodik-provider-client | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/kodik/route.ts | 28:52 | Invalid playback query | property:message | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/playback/kodik/route.ts | 43:13 | Playback resolve failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/kodik/translations/route.ts | 5:8 | @/server/playback/kodik-provider-client | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/kodik/translations/route.ts | 18:52 | Invalid Shikimori ID | property:message | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/playback/kodik/translations/route.ts | 30:55 | Title resolve failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/resolve/route.ts | 2:39 | @/server/playback/kodik-provider-client | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/resolve/route.ts | 3:33 | @/server/playback/provider-manager | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/playback/resolve/route.ts | 34:52 | Invalid playback query | property:message | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/playback/resolve/route.ts | 63:13 | Playback resolve failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/release-schedule/route.ts | 1:38 | @/server/api/response | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/release-schedule/route.ts | 2:36 | @/server/services/release-schedule.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/release-schedule/route.ts | 7:35 | Invalid schedule start. | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/release-schedule/route.ts | 10:35 | Invalid schedule start. | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/release-schedule/route.ts | 14:26 | public, s-maxage=300, stale-while-revalidate=900 | property:Cache-Control | REVIEW | VERIFY_CONTEXT |
| src/app/api/release-schedule/route.ts | 18:32 | Release schedule is unavailable. | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/search/route.ts | 2:37 | @/lib/catalog/identity | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/search/route.ts | 7:8 | @/lib/anilist | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/search/route.ts | 8:49 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/search/route.ts | 9:54 | @/lib/jikan | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/search/route.ts | 10:52 | @/server/services/anime-title-enrichment.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/search/route.ts | 11:48 | @/server/repositories/anime-title.repository | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/search/route.ts | 12:39 | @/server/repositories/anime.repository | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/search/route.ts | 58:16 | AniList временно недоступен | property:error | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/stream/cvh/[sessionId]/[...resource]/route.ts | 32:20 | Relay resource was not found | property:message | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/stream/cvh/[sessionId]/[...resource]/route.ts | 40:54 | Invalid byte range | property:message | YES | LOCALIZE_OR_JUSTIFY |
| src/app/api/stream/cvh/[sessionId]/[...resource]/route.ts | 57:30 | Relay timed out | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/stream/cvh/[sessionId]/[...resource]/route.ts | 57:50 | Relay is unavailable | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/stream/cvh/[sessionId]/[...resource]/route.ts | 67:22 | private, no-store | property:cache-control | REVIEW | VERIFY_CONTEXT |
| src/app/api/watch-party/auth/route.ts | 5:8 | @/server/auth/require-session | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/watch-party/auth/route.ts | 9:8 | @/server/services/watch-party.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/watch-party/auth/route.ts | 10:40 | @/server/watch-party/ably-token | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/watch-party/create/route.ts | 2:34 | @/domain/watch-party/schemas | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/watch-party/create/route.ts | 6:8 | @/server/auth/require-session | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/watch-party/create/route.ts | 10:8 | @/server/services/watch-party.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/watch-party/room/[code]/route.ts | 2:34 | @/domain/watch-party/schemas | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/watch-party/room/[code]/route.ts | 6:8 | @/server/auth/require-session | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/api/watch-party/room/[code]/route.ts | 12:8 | @/server/services/watch-party.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/error.tsx | 9:27 | button button-primary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/error.tsx | 12:25 | button button-secondary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/loading.tsx | 4:22 | catalog-loading-head skeleton | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/loading.tsx | 5:22 | anime-grid catalog-grid | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/page.tsx | 2:31 | @/components/catalog/CatalogClient | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/page.tsx | 3:26 | @/components/layout/AppShell | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/page.tsx | 4:77 | @/lib/catalog | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/page.tsx | 5:37 | @/lib/catalog/identity | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/page.tsx | 6:34 | @/lib/catalog/public | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/page.tsx | 11:8 | @/lib/anilist | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/page.tsx | 12:38 | @/lib/catalog | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/page.tsx | 13:35 | @/lib/anilist | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/page.tsx | 14:49 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/page.tsx | 15:54 | @/lib/jikan | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/page.tsx | 16:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/page.tsx | 17:52 | @/server/services/anime-title-enrichment.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/catalog/page.tsx | 30:12 | Каталог аниме — Kairo | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/app/catalog/page.tsx | 32:7 | Ищите аниме по жанру, году, рейтингу, формату и статусу в каталоге Kairo. | property:description | YES | LOCALIZE_OR_JUSTIFY |
| src/app/catalog/page.tsx | 106:25 | app-shell-discovery app-shell-catalog | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/collections/[slug]/page.tsx | 2:41 | @/components/catalog/DiscoveryPages | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/collections/[slug]/page.tsx | 3:26 | @/components/layout/AppShell | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/collections/[slug]/page.tsx | 4:34 | @/lib/catalog/public | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/collections/[slug]/page.tsx | 8:8 | @/lib/catalog/system-collections.server | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/collections/error.tsx | 3:43 | @/components/catalog/DiscoveryError | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/collections/loading.tsx | 1:45 | @/components/catalog/DiscoveryLoading | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/collections/page.tsx | 1:36 | @/components/catalog/DiscoveryPages | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/collections/page.tsx | 2:26 | @/components/layout/AppShell | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/collections/page.tsx | 3:34 | @/lib/catalog/public | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/collections/page.tsx | 4:42 | @/lib/catalog/system-collections.server | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 8:8 | @/components/player/KairoPlayer | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 14:8 | @/lib/playback/descriptor | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 35:17 | Resolving… | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 66:21 | Descriptor resolved | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 72:62 | Resolve failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 88:12 | Kairo / Development | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 89:13 | Kodik Player baseline | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 91:55 | Kodik resolver | attribute:aria-label | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 93:11 | Shikimori ID | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 109:11 | Load translations | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 134:34 | AUTO (HLS) | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 140:11 | Resolve playback | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 146:13 | Stall observations ( | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 152:48 | ready= | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 153:36 | network= | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 153:65 | ahead= | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 154:48 | hls= | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/kodik-player/KodikPlayerDebug.tsx | 159:14 | No waiting/stalled events recorded. | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/providers/ProviderDebug.tsx | 4:46 | @/components/player/KairoPlayer | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/providers/ProviderDebug.tsx | 8:8 | @/lib/playback/animego-cvh | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/providers/ProviderDebug.tsx | 13:8 | @/lib/playback/descriptor | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/providers/ProviderDebug.tsx | 28:47 | Provider request failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/providers/ProviderDebug.tsx | 50:5 | Choose a provider and load translations/voices. | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/providers/ProviderDebug.tsx | 60:36 | Loading options… | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/providers/ProviderDebug.tsx | 60:57 | Resolving playback… | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/providers/ProviderDebug.tsx | 103:17 | Kodik descriptor ready | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/providers/ProviderDebug.tsx | 149:19 | AnimeGO/CVH descriptor ready | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/providers/ProviderDebug.tsx | 155:52 | Provider request failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/providers/ProviderDebug.tsx | 165:12 | Kairo / Development | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/providers/ProviderDebug.tsx | 166:13 | Playback providers | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/providers/ProviderDebug.tsx | 168:55 | Provider resolver | attribute:aria-label | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/providers/ProviderDebug.tsx | 181:41 | AnimeGO / CVH | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/providers/ProviderDebug.tsx | 186:13 | Shikimori ID | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/providers/ProviderDebug.tsx | 209:15 | AnimeGO ID | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/providers/ProviderDebug.tsx | 220:15 | Simulate Kodik failure | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/providers/ProviderDebug.tsx | 234:15 | Simulate CVH failure | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/providers/ProviderDebug.tsx | 255:46 | CVH voices | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/debug/providers/ProviderDebug.tsx | 258:11 | Translation / voice | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/providers/ProviderDebug.tsx | 277:34 | AUTO (HLS) | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/debug/providers/ProviderDebug.tsx | 283:11 | Resolve playback | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/history/page.tsx | 5:32 | @/components/data/AccountDataProvider | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/history/page.tsx | 6:37 | @/components/data/SyncStatusIndicator | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/history/page.tsx | 7:26 | @/components/layout/AppShell | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/history/page.tsx | 8:31 | @/components/layout/PageContainer | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/history/page.tsx | 9:28 | @/components/ui/States | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/history/page.tsx | 10:26 | @/components/ui/PageHero | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/history/page.tsx | 47:25 | button button-danger-ghost | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/history/page.tsx | 57:28 | account-card-grid history-grid | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/history/page.tsx | 60:29 | account-item-card history-card | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/history/page.tsx | 85:33 | button button-primary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/history/page.tsx | 91:33 | button button-secondary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/layout.tsx | 9:33 | @/components/auth/SessionProvider | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/layout.tsx | 10:31 | @/components/layout/AppBackground | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/layout.tsx | 11:24 | @/components/navigation/Header | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/layout.tsx | 12:39 | @/components/webgl/KairoWebGLEnvironment | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/layout.tsx | 13:25 | @/lib/site-url | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/layout.tsx | 16:10 | Kairo — аниме, которое стоит сохранить | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/app/layout.tsx | 22:12 | Kairo — аниме, которое стоит сохранить | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/app/login/page.tsx | 2:26 | @/components/auth/AuthForm | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/my-list/page.tsx | 5:32 | @/components/data/AccountDataProvider | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/my-list/page.tsx | 6:37 | @/components/data/SyncStatusIndicator | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/my-list/page.tsx | 7:26 | @/components/layout/AppShell | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/my-list/page.tsx | 8:31 | @/components/layout/PageContainer | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/my-list/page.tsx | 9:28 | @/components/ui/States | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/my-list/page.tsx | 10:26 | @/components/ui/PageHero | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/my-list/page.tsx | 84:25 | button button-danger-ghost | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/my-list/page.tsx | 97:29 | account-item-card list-card | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/my-list/page.tsx | 121:33 | button button-secondary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/new/error.tsx | 3:43 | @/components/catalog/DiscoveryError | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/new/loading.tsx | 1:45 | @/components/catalog/DiscoveryLoading | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/new/page.tsx | 6:12 | /catalog?view=episodes | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/not-found.tsx | 7:23 | button button-primary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/not-found.tsx | 8:9 | Вернуться в Kairo | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/app/page.tsx | 1:32 | @/components/home/HomeFoundation | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/page.tsx | 2:26 | @/components/layout/AppShell | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/page.tsx | 3:34 | @/lib/catalog/public | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/page.tsx | 7:8 | @/lib/release-schedule/nearest | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/page.tsx | 11:8 | @/server/services/release-schedule.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/page.tsx | 12:39 | @/server/services/current-season.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/profile/page.tsx | 3:32 | @/components/auth/ProfileContent | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/profile/page.tsx | 4:26 | @/components/layout/AppShell | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/profile/page.tsx | 5:24 | @/lib/db | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/profile/page.tsx | 6:29 | @/server/auth/options | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/profile/page.tsx | 10:36 | /login?callbackUrl=/profile | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/register/page.tsx | 2:26 | @/components/auth/AuthForm | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/robots.ts | 2:25 | @/lib/site-url | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/room/[code]/page.tsx | 3:29 | @/server/auth/options | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/room/[code]/page.tsx | 7:8 | @/server/services/watch-party.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/room/[code]/page.tsx | 28:16 | /anime?roomError=not-found | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/settings/page.tsx | 6:53 | @/lib/account-data | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/settings/page.tsx | 7:32 | @/components/data/AccountDataProvider | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/settings/page.tsx | 8:37 | @/components/data/SyncStatusIndicator | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/settings/page.tsx | 13:8 | @/components/settings/SettingsUI | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/settings/page.tsx | 14:31 | @/components/ui/ConfirmDialog | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/settings/page.tsx | 15:26 | @/components/layout/AppShell | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/settings/page.tsx | 17:26 | @/components/ui/PageHero | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/settings/page.tsx | 121:33 | button button-primary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/settings/page.tsx | 122:28 | /login?callbackUrl=/settings | attribute:href | REVIEW | VERIFY_CONTEXT |
| src/app/settings/page.tsx | 127:33 | button button-danger-ghost | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/settings/page.tsx | 136:33 | button button-primary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/settings/page.tsx | 142:33 | button button-danger-ghost | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/sitemap.ts | 2:25 | @/lib/site-url | string literal | REVIEW | VERIFY_CONTEXT |
| src/app/watch/[slug]/[episode]/loading.tsx | 4:22 | skeleton watch-loading-title | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/watch/[slug]/[episode]/loading.tsx | 5:22 | skeleton watch-loading-player | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/watch/[slug]/[episode]/not-found.tsx | 8:23 | button button-primary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/app/watch/[slug]/[episode]/not-found.tsx | 9:9 | Вернуться в Kairo | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/components/anime/AniListUnavailableState.tsx | 10:12 | AniList временно недоступен | property:eyebrow | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AniListUnavailableState.tsx | 13:16 | AniList временно отклонил запрос Kairo. | property:forbidden | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AniListUnavailableState.tsx | 14:19 | Превышен лимит запросов AniList. Попробуйте немного позже. | property:rate-limit | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AniListUnavailableState.tsx | 15:14 | AniList не успел ответить. Соединение можно повторить. | property:timeout | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AniListUnavailableState.tsx | 16:14 | Не удалось установить соединение с AniList. | property:network | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AniListUnavailableState.tsx | 17:13 | На стороне AniList произошла временная ошибка. | property:server | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AniListUnavailableState.tsx | 33:21 | not-found source-unavailable | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AniListUnavailableState.tsx | 39:21 | button button-primary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AniListUnavailableState.tsx | 45:25 | button button-secondary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AnimePoster.tsx | 5:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AnimePoster.tsx | 7:40 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AnimePoster.tsx | 8:35 | @/lib/catalog/poster | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AnimePoster.tsx | 9:38 | @/components/effects/KairoWebGLSurface | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AnimePoster.tsx | 10:40 | @/components/webgl/dom-sync/DomTargetRegistry | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AnimePoster.tsx | 59:25 | (prefers-reduced-motion: reduce) | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AnimePoster.tsx | 81:96 | Anime poster | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AnimePoster.tsx | 90:96 | Anime poster | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AnimePoster.tsx | 97:89 | Anime poster | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/anime/AnimePoster.tsx | 109:89 | Anime poster | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/anime/Cards.tsx | 7:46 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/anime/Cards.tsx | 10:37 | @/components/ui/OverflowMarqueeText | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/anime/Cards.tsx | 11:36 | @/components/effects/KairoDomCurlTarget | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/anime/Cards.tsx | 17:8 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/anime/Cards.tsx | 52:19 | (max-width: 500px) 45vw, (max-width: 1100px) 30vw, 15vw | attribute:sizes | REVIEW | VERIFY_CONTEXT |
| src/components/anime/PlayerPlaceholder.tsx | 7:18 | Плеер Kairo | attribute:aria-label | YES | LOCALIZE_OR_JUSTIFY |
| src/components/anime/PlayerPlaceholder.tsx | 19:11 | Скоро здесь появится новый Kairo Player. | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/components/auth/AuthForm.tsx | 8:33 | @/server/validation/auth | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/auth/AuthForm.tsx | 39:19 | /login?registered=1 | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/auth/AuthForm.tsx | 124:29 | button button-primary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/auth/ProfileContent.tsx | 3:31 | @/components/auth/SignOutButton | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/auth/ProfileContent.tsx | 4:31 | @/components/layout/PageContainer | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/auth/ProfileContent.tsx | 5:26 | @/components/ui/PageHero | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/auth/SessionProvider.tsx | 3:37 | @/components/data/AccountDataProvider | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/auth/SessionProvider.tsx | 4:36 | @/components/data/AccountMergeDialog | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/auth/SignOutButton.tsx | 6:17 | button button-secondary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/BrowseFilters.tsx | 6:31 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/BrowseFilters.tsx | 7:31 | @/components/ui/KairoDropdown | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/BrowseFilters.tsx | 290:60 | Minimum titles | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/BrowseFilters.tsx | 307:61 | By date | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/BrowseFilters.tsx | 310:60 | By rating | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/BrowseFilters.tsx | 317:25 | By popularity | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/BrowseFilters.tsx | 320:65 | By title | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/BrowseFilters.tsx | 325:62 | By count | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/BrowseFilters.tsx | 329:60 | By rating | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/BrowseFilters.tsx | 336:25 | By popularity | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/BrowseFilters.tsx | 339:65 | By title | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/BrowseFilters.tsx | 347:23 | button button-secondary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/BrowseFilters.tsx | 354:23 | button button-primary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogClient.tsx | 4:27 | @/components/anime/Cards | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogClient.tsx | 5:35 | @/components/effects/KairoWebGLSurface | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogClient.tsx | 6:36 | @/components/layout/DiscoveryPageShell | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogClient.tsx | 7:33 | @/components/catalog/CatalogControls | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogClient.tsx | 8:29 | @/components/catalog/CatalogHero | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogClient.tsx | 9:34 | @/components/ui/States | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogClient.tsx | 18:8 | @/lib/catalog | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogClient.tsx | 19:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogClient.tsx | 59:41 | Catalog request failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogClient.tsx | 156:50 | This season | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogClient.tsx | 158:55 | New episodes | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogClient.tsx | 159:51 | All anime | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogClient.tsx | 165:40 | anime-grid catalog-grid | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogClient.tsx | 177:29 | skeleton-card catalog-infinite-skeleton | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 5:30 | @/components/catalog/BrowseFilters | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 6:35 | @/components/effects/KairoWebGLSurface | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 7:34 | @/components/effects/WebGLImageTarget | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 8:31 | @/components/ui/KairoDropdown | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 14:8 | @/lib/catalog | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 15:31 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 27:3 | Slice of Life | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 130:15 | By genre | property:genres | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 131:15 | This season | property:season | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 132:17 | New episodes | property:episodes | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 133:12 | All anime | property:all | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 135:19 | All seasons | property:allSeasons | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 147:17 | catalog-discovery-panel category-navigation | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 152:34 | Каталог Kairo | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/components/catalog/CatalogControls.tsx | 198:32 | category-tile is-selected | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 267:31 | catalog-advanced is-open | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogControls.tsx | 269:24 | catalog-advanced-inner filter-selects | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogHero.tsx | 4:35 | @/components/layout/DiscoveryPageShell | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/CatalogHero.tsx | 20:41 | 02 KAIRO / КАТАЛОГ | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/components/catalog/DiscoveryError.tsx | 5:28 | @/components/ui/States | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryLoading.tsx | 1:33 | @/components/ui/States | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 6:27 | @/components/anime/Cards | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 7:29 | @/components/anime/AnimePoster | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 12:8 | @/lib/catalog/collections | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 13:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 14:42 | @/lib/catalog/public | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 15:46 | @/components/ui/States | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 19:8 | @/components/layout/DiscoveryPageShell | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 20:33 | @/components/catalog/DiscoverySearch | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 24:8 | @/components/catalog/BrowseFilters | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 25:42 | @/components/catalog/ReleaseDiscoveryControls | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 26:35 | @/components/effects/KairoWebGLSurface | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 27:36 | @/components/effects/KairoDomCurlTarget | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 106:41 | New releases request failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 134:13 | Данные AniList загружены | property:live | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 136:15 | AniList недоступен · данные получены из резервного источника | property:backup | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 137:20 | AniList временно недоступен | property:unavailable | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 143:13 | Дані AniList завантажено | property:live | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 145:15 | AniList недоступний · дані отримано з резервного джерела | property:backup | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 146:20 | AniList тимчасово недоступний | property:unavailable | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 152:13 | AniList data loaded | property:live | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 153:17 | Showing the latest saved catalog data | property:snapshot | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 154:15 | AniList unavailable · showing backup source data | property:backup | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 155:20 | AniList is temporarily unavailable | property:unavailable | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 157:9 | New releases could not be updated and no saved snapshot is available yet. | property:unavailableHint | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 158:14 | Try again | property:retry | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 163:17 | catalog-page new-page | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 194:38 | anime-grid catalog-grid | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoveryPages.tsx | 323:31 | (max-width: 600px) 35vw, 180px | attribute:sizes | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoverySearch.tsx | 9:21 | catalog-search discovery-search | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/DiscoverySearch.tsx | 19:25 | button button-primary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/ReleaseDiscoveryControls.tsx | 5:41 | @/components/catalog/BrowseFilters | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/ReleaseDiscoveryControls.tsx | 6:30 | @/components/catalog/BrowseFilters | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/ReleaseDiscoveryControls.tsx | 7:35 | @/components/effects/KairoWebGLSurface | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/ReleaseDiscoveryControls.tsx | 8:34 | @/components/effects/WebGLImageTarget | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/ReleaseDiscoveryControls.tsx | 9:31 | @/components/ui/KairoDropdown | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/ReleaseDiscoveryControls.tsx | 11:31 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/ReleaseDiscoveryControls.tsx | 44:3 | Slice of Life | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/ReleaseDiscoveryControls.tsx | 94:17 | catalog-discovery-panel category-navigation release-discovery-panel | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/ReleaseDiscoveryControls.tsx | 99:34 | Каталог Kairo | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/components/catalog/ReleaseDiscoveryControls.tsx | 121:30 | category-tile is-selected | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/ReleaseDiscoveryControls.tsx | 167:31 | catalog-advanced is-open | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/catalog/ReleaseDiscoveryControls.tsx | 169:24 | catalog-advanced-inner filter-selects | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/data/AccountDataProvider.tsx | 24:8 | @/lib/account-data | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/data/AccountDataProvider.tsx | 31:8 | @/lib/watch-progress | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/data/AccountDataProvider.tsx | 32:49 | @/lib/pending-sync | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/data/AccountDataProvider.tsx | 129:59 | bootstrap failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/data/AccountDataProvider.tsx | 378:21 | useAccountData must be used inside AccountDataProvider | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/data/AccountMergeDialog.tsx | 9:8 | @/lib/account-data | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/data/AccountMergeDialog.tsx | 10:57 | @/lib/watch-progress | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/data/AccountMergeDialog.tsx | 91:21 | button button-primary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/data/AccountMergeDialog.tsx | 98:21 | button button-secondary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/data/AccountMergeDialog.tsx | 105:21 | button button-secondary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/effects/KairoDomCurlTarget.tsx | 7:8 | @/components/webgl/dom-curl/DomCurlRegistry | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/effects/WebGLImageTarget.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/effects/WebGLImageTarget.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/effects/WebGLImageTarget.test.ts | 3:30 | node:fs | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/effects/WebGLImageTarget.test.ts | 5:6 | WebGL tile ready state removes the fallback surface above Canvas | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/effects/WebGLImageTarget.tsx | 4:40 | @/components/webgl/dom-sync/DomTargetRegistry | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/effects/WebGLImageTarget.tsx | 5:39 | @/components/webgl/dom-curl/DomCurlRegistry | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/effects/WebGLImageTarget.tsx | 22:25 | (prefers-reduced-motion: reduce) | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/ContinueWatchingHistoryModal.tsx | 7:29 | @/components/anime/AnimePoster | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/ContinueWatchingHistoryModal.tsx | 9:40 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/ContinueWatchingHistoryModal.tsx | 10:41 | @/lib/watch-progress | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/ContinueWatchingHistoryModal.tsx | 11:33 | @/lib/watch-route | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/ContinueWatchingHistoryModal.tsx | 12:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/ContinueWatchingHistoryModal.tsx | 43:11 | button:not([disabled]), a[href] | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HeroStarField.tsx | 50:43 | (prefers-reduced-motion: reduce) | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HeroStarField.tsx | 119:31 | rgba(135, 224, 230, 0.42) | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HeroStarField.tsx | 156:36 | rgba(177, 236, 241, 0) | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeFoundation.tsx | 6:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeFoundation.tsx | 10:8 | @/lib/release-schedule/types | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeFoundation.tsx | 11:42 | @/server/services/current-season.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeFoundation.tsx | 50:27 | KAIRO / HOME | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/components/home/HomeSections.tsx | 6:27 | @/components/anime/Cards | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeSections.tsx | 7:29 | @/components/anime/AnimePoster | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeSections.tsx | 8:35 | @/components/effects/KairoWebGLSurface | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeSections.tsx | 9:36 | @/components/effects/KairoDomCurlTarget | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeSections.tsx | 10:32 | @/components/data/AccountDataProvider | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeSections.tsx | 15:8 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeSections.tsx | 16:43 | @/lib/release-schedule/labels | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeSections.tsx | 17:40 | @/lib/watch-progress | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeSections.tsx | 18:33 | @/lib/watch-route | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeSections.tsx | 19:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeSections.tsx | 20:42 | @/server/services/current-season.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeSections.tsx | 25:8 | @/lib/release-schedule/types | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/HomeSections.tsx | 192:29 | (max-width: 767px) 78vw, 22vw | attribute:sizes | REVIEW | VERIFY_CONTEXT |
| src/components/home/ReleaseCalendarModal.tsx | 13:29 | @/components/anime/AnimePoster | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/ReleaseCalendarModal.tsx | 15:40 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/ReleaseCalendarModal.tsx | 16:43 | @/lib/release-schedule/labels | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/ReleaseCalendarModal.tsx | 20:8 | @/lib/release-schedule/types | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/home/ReleaseCalendarModal.tsx | 80:11 | button:not([disabled]), a[href] | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/layout/AppShell.tsx | 1:24 | @/components/layout/Footer | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/layout/DiscoveryPageShell.tsx | 26:23 | page-hero discovery-hero | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/layout/Footer.tsx | 29:15 | © 2026 Kairo | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/components/navigation/GlobalSearch.tsx | 7:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/navigation/GlobalSearch.tsx | 12:8 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/navigation/GlobalSearch.tsx | 13:29 | @/components/anime/AnimePoster | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/navigation/GlobalSearch.tsx | 41:13 | button, a, input | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/navigation/GlobalSearch.tsx | 108:36 | Поиск Kairo | JSX text | YES | LOCALIZE_OR_JUSTIFY |
| src/components/navigation/Header.tsx | 6:28 | @/components/ui/IconButton | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/navigation/Header.tsx | 7:32 | @/components/navigation/NavigationDock | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/navigation/HeaderAccountMenu.tsx | 7:37 | @/components/data/SyncStatusIndicator | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/navigation/HeaderAccountMenu.tsx | 34:23 | icon-button profile-button | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/navigation/HeaderAccountMenu.tsx | 41:19 | icon-button profile-button | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/navigation/NavigationDock.tsx | 49:39 | (hover: hover) and (pointer: fine) | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/navigation/NavigationDock.tsx | 145:34 | navigation-dock is-idle | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/player/KairoPlayer.tsx | 27:8 | @/lib/playback/descriptor | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/player/KairoPlayer.tsx | 32:8 | @/lib/playback/hls-policy | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/player/KairoPlayer.tsx | 33:47 | @/lib/playback/skip-segments | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/player/KairoPlayer.tsx | 34:36 | @/lib/playback/time | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/player/KairoPlayer.tsx | 43:8 | @/lib/playback/quality | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/player/KairoPlayer.tsx | 198:18 | Resolve an episode to begin. | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/player/KairoPlayer.tsx | 501:27 | HLS is not supported in this browser | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/player/KairoPlayer.tsx | 545:75 | :fatal | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/player/KairoPlayer.tsx | 585:54 | Playback setup failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/player/KairoPlayer.tsx | 885:20 | Видеоплеер Kairo | attribute:aria-label | YES | LOCALIZE_OR_JUSTIFY |
| src/components/player/KairoPlayer.tsx | 907:35 | Browser media error | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/ui/ConfirmDialog.tsx | 61:29 | button button-secondary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/ui/kairo-dropdown-state.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/ui/kairo-dropdown-state.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/ui/kairo-dropdown-state.test.ts | 15:6 | keyboard navigation wraps and skips disabled options | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/ui/kairo-dropdown-state.test.ts | 21:6 | outside targets close the dropdown while contained targets do not | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/ui/OverflowMarqueeText.tsx | 53:37 | a, button | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/ui/States.tsx | 15:24 | state-card empty-state | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/ui/States.tsx | 51:25 | button button-primary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/ui/States.tsx | 60:21 | discovery-page loading-state | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/ui/States.tsx | 61:23 | skeleton-block skeleton-heading | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/ui/States.tsx | 64:27 | skeleton-block skeleton-card | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/ui/States.tsx | 83:21 | state-card error-state | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/ui/States.tsx | 87:25 | button button-primary | attribute:className | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/dom-curl/DomCurlFrameUpdater.tsx | 3:26 | @react-three/fiber | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/dom-curl/DomCurlFrameUpdater.tsx | 21:7 | (prefers-reduced-motion: reduce) | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/dom-curl/DomCurlRegistry.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/dom-curl/DomCurlRegistry.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/dom-curl/DomCurlRegistry.test.ts | 5:6 | DOM curl is neutral when shared strength is zero | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/dom-curl/DomCurlRegistry.test.ts | 17:6 | text is gentler than a surface | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/dom-sync/DomTargetRectSampler.tsx | 3:26 | @react-three/fiber | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/images/curlStrength.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/images/curlStrength.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/images/curlStrength.test.ts | 5:6 | curl has a fast bounded attack and slower monotonic release | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/images/curlStrength.test.ts | 21:6 | background-tab sized deltas remain clamped | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/images/shaders.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/images/shaders.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/images/shaders.test.ts | 8:6 | poster shader converts linear sampled color to renderer output space | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/images/shaders.test.ts | 15:6 | passthrough keeps rect, cover, mask and output color without curl | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/images/shaders.ts | 1:34 | varying vec2 vScreenUv;  void main() {   vScreenUv = uv;   gl_Position = vec4(position.xy, 0.0, 1.0); } | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/images/shaders.ts | 10:30 | vec2 applyCurl(vec2 screenUv) {   float centered = 2.0 * screenUv.y - 1.0;   float profile = 1.0 - sqrt(max(0.0, 1.0 - centered * centered));   float uvScale = 1.0 - profile * uCur | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/images/shaders.ts | 40:27 | vec2 localUv = (curledScreenUv - uRect.xy) / uRect.zw;   vec2 edge = min(localUv, 1.0 - localUv);   float inside = step(0.0, edge.x) * step(0.0, edge.y);   vec2 rectPx = uRect.zw * | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/images/shaders.ts | 52:29 | precision highp float;  uniform sampler2D uTexture; uniform vec2 uTextureSize; uniform vec2 uViewportPx; uniform vec4 uRect; uniform float uRadiusPx; uniform float uCurlStrength; v | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/images/WebGLImageLayer.tsx | 3:36 | @react-three/fiber | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/images/WebGLImageLayer.tsx | 83:25 | [Kairo WebGL texture] | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/KairoWebGLCanvas.tsx | 3:44 | @react-three/fiber | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/KairoWebGLCanvas.tsx | 45:7 | (prefers-reduced-motion: reduce) | string literal | REVIEW | VERIFY_CONTEXT |
| src/components/webgl/KairoWebGLCanvas.tsx | 92:25 | [Kairo WebGL color pipeline] | string literal | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 6:8 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 13:10 | Eclipse Protocol | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/catalog.ts | 15:16 | Eclipse Protocol | property:titleRomaji | YES | LOCALIZE_OR_JUSTIFY |
| src/data/catalog.ts | 16:12 | When the sun went silent, memory became a weapon. | property:tagline | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 20:5 | Courier Rei Kuroda crosses the drowned megacity of Nara-9 carrying the last human memory of daylight — and a secret powerful enough to restart the sky. | property:synopsis | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 28:13 | Kairo Pictures | string literal | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 38:12 | Neon Ronin | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/catalog.ts | 40:14 | No master. No past. | property:tagline | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 43:15 | A swordsman wakes beneath a city that never sleeps. | property:synopsis | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 54:12 | Ashen Crown | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/catalog.ts | 56:14 | The throne remembers. | property:tagline | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 59:15 | An exiled heir returns to a kingdom built on volcanic glass. | property:synopsis | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 70:12 | Zero Meridian | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/catalog.ts | 72:14 | Beyond every known map. | property:tagline | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 75:15 | Four navigators pursue a signal from outside spacetime. | property:synopsis | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 86:12 | Silent Orbit | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/catalog.ts | 88:14 | In silence, we return. | property:tagline | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 90:15 | A deserted lunar station transmits one final song. | property:synopsis | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 101:12 | Crimson Memory | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/catalog.ts | 103:14 | Some memories bleed. | property:tagline | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 105:15 | A painter discovers that every portrait changes the past. | property:synopsis | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 120:12 | Attack on Titan | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/catalog.ts | 134:12 | Fullmetal Alchemist: Brotherhood | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/catalog.ts | 148:12 | Frieren: Beyond Journey’s End | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/catalog.ts | 167:12 | SPY×FAMILY | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/catalog.ts | 181:12 | Cowboy Bebop | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/catalog.ts | 195:12 | Death Note | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/catalog.ts | 255:48 | Lumen Voice | property:studio | REVIEW | VERIFY_CONTEXT |
| src/data/catalog.ts | 285:48 | Aster Dub | property:studio | REVIEW | VERIFY_CONTEXT |
| src/data/releases/eclipse-protocol.ts | 1:42 | @/domain/watch/types | string literal | REVIEW | VERIFY_CONTEXT |
| src/data/releases/eclipse-protocol.ts | 15:21 | Демонстрационный эпизод Kairo. | property:synopsis | REVIEW | VERIFY_CONTEXT |
| src/data/releases/eclipse-protocol.ts | 18:18 | The Last Light | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/releases/eclipse-protocol.ts | 19:21 | A Kairo demonstration episode. | property:synopsis | REVIEW | VERIFY_CONTEXT |
| src/data/releases/eclipse-protocol.ts | 35:18 | Memory Line | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/releases/eclipse-protocol.ts | 36:21 | The second demonstration entry. | property:synopsis | REVIEW | VERIFY_CONTEXT |
| src/data/releases/eclipse-protocol.ts | 49:18 | Русский · Demo | property:label | YES | LOCALIZE_OR_JUSTIFY |
| src/data/releases/eclipse-protocol.ts | 55:18 | English · Demo | property:label | YES | LOCALIZE_OR_JUSTIFY |
| src/data/releases/eclipse-protocol.ts | 87:18 | Русский · Demo | property:label | YES | LOCALIZE_OR_JUSTIFY |
| src/data/releases/eclipse-protocol.ts | 93:18 | English · Demo | property:label | YES | LOCALIZE_OR_JUSTIFY |
| src/data/releases/index.ts | 2:35 | @/data/catalog | string literal | REVIEW | VERIFY_CONTEXT |
| src/data/releases/index.ts | 3:42 | @/domain/watch/types | string literal | REVIEW | VERIFY_CONTEXT |
| src/data/watch/demo-episodes.ts | 8:14 | The Last Light | property:titleEn | YES | LOCALIZE_OR_JUSTIFY |
| src/data/watch/demo-episodes.ts | 10:7 | Демонстрационная серия для проверки интерфейса Kairo. Видеоматериал не связан с аниме. | property:descriptionRu | YES | LOCALIZE_OR_JUSTIFY |
| src/data/watch/demo-episodes.ts | 12:7 | A demo episode for testing the Kairo interface. The video is not related to the anime. | property:descriptionEn | YES | LOCALIZE_OR_JUSTIFY |
| src/data/watch/demo-episodes.ts | 18:16 | English · Demo | property:label | YES | LOCALIZE_OR_JUSTIFY |
| src/data/watch/demo-episodes.ts | 28:17 | Demo source | property:studio | REVIEW | VERIFY_CONTEXT |
| src/data/watch/demo-episodes.ts | 34:16 | Demo intro | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/watch/demo-episodes.ts | 41:16 | Demo content | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/data/watch/demo-episodes.ts | 59:14 | Memory Line | property:titleEn | YES | LOCALIZE_OR_JUSTIFY |
| src/data/watch/demo-episodes.ts | 62:20 | The second demo entry is retained for interface testing. | property:descriptionEn | YES | LOCALIZE_OR_JUSTIFY |
| src/data/watch/demo-episodes.ts | 70:17 | Demo source | property:studio | REVIEW | VERIFY_CONTEXT |
| src/lib/account-data/storage.ts | 3:41 | @/lib/watch-progress | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/account-data/storage.ts | 5:16 | kairo:account-cache:v1: | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/account-data/storage.ts | 6:31 | kairo:anime-list:v1 | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/account-data/storage.ts | 7:38 | kairo:player-preferences:v1 | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/account-data/storage.ts | 110:47 | kairo:playback-rate:v1 | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/account-data/storage.ts | 111:40 | kairo:autoplay-next:v1 | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/account-data/storage.ts | 112:44 | kairo:subtitle-language:v1 | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/account-data/types.ts | 1:41 | @/lib/watch-progress | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anilist/client.ts | 30:17 | Kairo/0.1 (server-side AniList client) | property:User-Agent | REVIEW | VERIFY_CONTEXT |
| src/lib/anilist/client.ts | 149:11 | AniList returned an invalid JSON response | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anilist/client.ts | 173:11 | AniList response does not contain data | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anilist/client.ts | 193:17 | Unknown error | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anilist/client.ts | 208:13 | AniList request timed out | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anilist/client.ts | 209:13 | AniList network request failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anilist/client.ts | 219:33 | AniList request failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anilist/index-retry.test.ts | 1:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anilist/index-retry.test.ts | 2:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anilist/index-retry.test.ts | 6:6 | AniList 429 honors Retry-After and retries only the current page | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anilist/index-retry.test.ts | 38:6 | AniList 429 without Retry-After uses exponential backoff | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anilist/index-retry.test.ts | 61:6 | AniList non-retryable errors stop immediately | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anilist/queries.ts | 1:29 | id idMal type title { romaji english native } description   coverImage { extraLarge large medium color } bannerImage genres   averageScore meanScore popularity trending episodes du | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anilist/queries.ts | 37:29 | id idMal type isAdult title { romaji english native } description   coverImage { extraLarge large medium color } bannerImage genres   averageScore meanScore popularity trending epi | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 1:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 2:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 12:29 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 13:24 | node:os | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 14:18 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 25:10 | Attack on Titan | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/anime-index/anime-index.test.ts | 26:17 | Attack on Titan | property:titleEnglish | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/anime-index/anime-index.test.ts | 27:16 | Shingeki no Kyojin | property:titleRomaji | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/anime-index/anime-index.test.ts | 33:13 | WIT Studio | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 45:6 | maps snapshot/catalog Anime to the local index shape | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 50:38 | Shingeki no Kyojin | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 53:6 | rejects invalid AniList IDs and title-less records | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 72:6 | normalizes arrays without empty values or duplicates | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 79:6 | keeps a compatible canonical slug and repairs incompatible slugs | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 81:57 | Attack on Titan | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 85:50 | Attack on Titan | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 90:6 | merge is idempotent, preserves good values and does not touch relations | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 97:18 | Shingeki no Kyojin | property:titleRomaji | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/anime-index/anime-index.test.ts | 98:19 | Attack on Titan | property:titleEnglish | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/anime-index/anime-index.test.ts | 112:15 | WIT Studio | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 128:6 | detects duplicate AniList IDs while keeping the first record | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/anime-index.test.ts | 137:6 | index checkpoint resumes from the next unfinished page | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/checkpoint.ts | 1:44 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/checkpoint.ts | 2:18 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/snapshot-source.ts | 1:35 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-index/snapshot-source.ts | 2:18 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-season/current.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-season/current.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-season/current.test.ts | 25:6 | resolves every UTC anime season boundary | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-season/current.test.ts | 34:6 | resolves the immediate next season without skipping a year | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-season/current.test.ts | 45:6 | home window admits only current and next active titles and current finishes | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-season/current.test.ts | 55:6 | home window reserves space for announced and newly finished titles | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-season/current.test.ts | 67:6 | 24 item pages expose load more only while data remains | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-season/current.test.ts | 82:6 | page merge appends new anime and removes overlapping IDs | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-season/current.test.ts | 104:6 | catalog refresh deterministically admits a qualifying new title | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-season/current.ts | 1:36 | @/lib/catalog | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-season/current.ts | 2:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 1:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 2:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 19:29 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 20:24 | node:os | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 21:18 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 27:11 | Shingeki no Kyojin | property:romaji | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 28:12 | Attack on Titan | property:english | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 30:14 | Attack on Titan! | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 37:6 | normalizes Latin, Cyrillic, Ukrainian, Japanese and punctuation | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 38:36 | Attack on Titan! | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 38:57 | attack on titan | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 45:36 | Season 2 — Part 2 | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 45:58 | season 2 part 2 | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 48:6 | builds unique normalized title variants | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 51:5 | shingeki no kyojin | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 52:5 | attack on titan | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 56:6 | scores strong matches and rejects contradictions | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 60:14 | Attack on Titan | property:english | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 67:14 | Attack on Titan | property:english | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 76:6 | detects close ambiguous matches | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 80:16 | Attack on Titan | property:english | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 87:16 | Attack on Titan | property:english | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 96:6 | resolves locale-specific fallbacks without RU leaking into UK | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 125:6 | upsert policy protects locked/manual, confidence and idempotency | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 156:6 | Shikimori provider supports injected fetch and does not call live API | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 162:15 | Shingeki no Kyojin | property:name | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 164:19 | Attack on Titan | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 179:6 | localization counters enforce per-anime invariants | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 188:6 | exact Shikimori RU is final while UK ambiguity stays independent | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 203:6 | existing RU does not trigger Wikidata RU | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 208:6 | Wikidata cache hit and negative cache avoid HTTP requests | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/anime-titles.test.ts | 222:6 | title checkpoint resumes after the last completed AniList ID | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/checkpoint.ts | 1:44 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/checkpoint.ts | 2:18 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/display.ts | 28:11 | Unknown title | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/http.ts | 67:25 | Kairo anime-title-importer/1.0 | property:User-Agent | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/http.ts | 113:50 | Provider request failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/lookup-cache.ts | 55:53 | Provider request failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/lookup-cache.ts | 100:53 | Unknown provider error | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/matching.ts | 21:26 | TV SERIES | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/matching.ts | 22:17 | MOVIE SERIES | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/providers/wikidata.ts | 163:54 | Unknown provider error | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/public-list.test.ts | 1:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/public-list.test.ts | 2:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/public-list.test.ts | 13:10 | One Piece | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/anime-titles/public-list.test.ts | 14:17 | One Piece | property:titleEnglish | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/anime-titles/public-list.test.ts | 15:16 | ONE PIECE | property:titleRomaji | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/anime-titles/public-list.test.ts | 26:6 | the same AniList ID gets one RU displayTitle across public sections | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/public-list.test.ts | 43:6 | Russian catalog never falls back to English, Romaji or Native | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/public-list.test.ts | 82:6 | filters and pagination cannot bypass the shared localizer | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/public-list.test.ts | 97:6 | English base data cannot overwrite displayTitle and locale results stay separate | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/public-list.test.ts | 111:33 | One Piece | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/public-list.test.ts | 115:6 | twenty cards perform one batch loader call | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/retry.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/retry.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/retry.test.ts | 11:6 | only-missing is a Prisma relation filter applied before take | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/retry.test.ts | 22:6 | retry selection excludes permanent and too-early entries | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/retry.test.ts | 78:6 | 429 is retryable and empty result is permanent NOT_FOUND | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/retry.test.ts | 83:42 | HTTP 429 | property:error | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/anime-titles/retry.test.ts | 89:14 | HTTP 429 | property:error | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/anime-titles/retry.test.ts | 100:42 | HTTP 404 | property:error | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/anime-titles/retry.test.ts | 107:6 | successful retry replaces the classified error and circuit stops only future work | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime-titles/retry.test.ts | 119:6 | Wikidata RU requires explicit opt-in | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 3:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 14:6 | detail lookup prefers exact PostgreSQL slug | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 26:6 | readable AniList route falls back to PostgreSQL AniList ID | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 42:6 | database result is sufficient and stops later local sources | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 57:6 | local catalog survives AniList 403 without snapshot or Jikan | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 66:37 | HTTP 403 | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 74:6 | local sources survive database schema drift | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 83:23 | P2022 schema drift | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 94:6 | detail snapshot is returned before remote resolution | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 103:6 | runtime indexed anime wins over the detail snapshot | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 117:6 | no local record has controlled empty resolution | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 124:6 | available AniList enrichment still merges into a local record | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 134:6 | related anime degrades to an empty list during AniList outage | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 138:37 | HTTP 403 | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 145:6 | maintenance 403 is recognized as non-retryable provider outage | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.test.ts | 149:7 | The AniList API has been temporarily disabled due to severe stability issues. | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.ts | 1:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/local-first.ts | 5:11 | Anime metadata sources are temporarily unavailable | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/resolve.ts | 4:63 | @/data/catalog | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/resolve.ts | 11:8 | @/lib/anilist | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/resolve.ts | 12:48 | @/lib/catalog | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/resolve.ts | 19:8 | @/lib/catalog/snapshot | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/resolve.ts | 24:8 | @/lib/jikan | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/resolve.ts | 28:8 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/resolve.ts | 29:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/resolve.ts | 33:8 | @/server/services/anime-title-enrichment.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/resolve.ts | 39:8 | @/server/repositories/anime.repository | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/resolve.ts | 147:9 | All public anime sources are temporarily unavailable | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/anime/runtime-catalog.ts | 1:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 38:6 | normalizes localized titles for identity matching | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 39:36 | Sōsō no Frieren! | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 39:60 | soso no frieren | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 42:6 | keeps the primary canonical slug for AniList duplicates | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 45:12 | Frieren: Beyond Journey's End | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/catalog/catalog.test.ts | 50:12 | Sousou no Frieren | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/catalog/catalog.test.ts | 56:6 | builds and parses canonical AniList detail routes | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 57:36 | Daemons of the Shadow Realm | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 64:6 | builds backup MAL routes without confusing them with AniList routes | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 65:30 | Fullmetal Alchemist: Brotherhood | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 74:6 | classifies AniList transport failures without treating them as missing media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 80:5 | {"error":"blocked"} | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 86:36 | {"error":"blocked"} | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 94:6 | cover resolver is stable and falls back cleanly | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 104:6 | canonical statuses are localized without leaking raw enums | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 111:6 | resolves Russian and English titles with explicit locale priorities | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 114:12 | Attack on Titan | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/catalog/catalog.test.ts | 115:19 | Attack on Titan | property:titleEnglish | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/catalog/catalog.test.ts | 116:18 | Shingeki no Kyojin | property:titleRomaji | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/catalog/catalog.test.ts | 121:47 | Attack on Titan | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 123:55 | Shingeki no Kyojin | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 126:6 | uses safe locale fallbacks without machine-generated titles | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 138:63 | Unknown title | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 141:6 | canonical localization covers the requested popular AniList titles | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 160:6 | AniList merge preserves curated Russian titles and maps English separately | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 165:16 | Attack on Titan | property:english | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 166:15 | Shingeki no Kyojin | property:romaji | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 197:20 | Attack on Titan | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/catalog/catalog.test.ts | 202:37 | Attack on Titan | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 205:6 | Jikan backup mapper produces a complete renderable anime card | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 208:12 | Fullmetal Alchemist: Brotherhood | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/catalog/catalog.test.ts | 209:20 | Fullmetal Alchemist: Brotherhood | property:title_english | YES | LOCALIZE_OR_JUSTIFY |
| src/lib/catalog/catalog.test.ts | 212:15 | Two brothers search for the Philosopher's Stone. | property:synopsis | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 225:13 | Finished Airing | property:status | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/catalog.test.ts | 227:15 | 24 min per ep | property:duration | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/collections.ts | 1:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/identity.ts | 1:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/poster.ts | 1:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/public.ts | 3:34 | @/data/catalog | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/public.ts | 8:8 | @/lib/anilist | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/public.ts | 9:49 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/public.ts | 10:50 | @/lib/jikan | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/public.ts | 11:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/public.ts | 12:52 | @/server/services/anime-title-enrichment.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/snapshot.ts | 3:28 | node:crypto | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/snapshot.ts | 4:61 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/snapshot.ts | 5:18 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/snapshot.ts | 6:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/system-collections.server.ts | 8:8 | @/lib/catalog/collections | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/catalog/system-collections.server.ts | 9:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/db/prisma-diagnostics.test.ts | 1:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/db/prisma-diagnostics.test.ts | 2:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/db/prisma-diagnostics.test.ts | 10:6 | Prisma delegate assertion reports a stale generated client | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/db/prisma-diagnostics.test.ts | 22:6 | Prisma system warnings are emitted once per failure kind | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/db/prisma-diagnostics.ts | 39:7 | Prisma Client does not contain AnimeLocalizedTitle. Run prisma generate and restart the server. | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/db/prisma-diagnostics.ts | 57:33 | Prisma model unavailable | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/db/prisma-diagnostics.ts | 65:33 | Database table is missing | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/db/prisma-diagnostics.ts | 73:33 | Database unavailable | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/db/prisma.ts | 2:30 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/env.server.ts | 10:19 | NEXTAUTH_SECRET (or AUTH_SECRET) | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/jikan/mapper.ts | 7:13 | Currently Airing | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/jikan/mapper.ts | 9:17 | Finished Airing | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/jikan/mapper.ts | 11:19 | Not yet aired | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/countries.ts | 4:41 | South Korea | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/countries.ts | 7:22 | United States | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/countries.ts | 8:45 | United Kingdom | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/descriptions.ts | 1:46 | @/data/localizations/anime-overrides.ru | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/descriptions.ts | 2:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/descriptions.ts | 143:44 | Description is not available yet. | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/formats.ts | 3:28 | TV series | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/formats.ts | 4:52 | Short series | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/formats.ts | 9:49 | Music video | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/genres.ts | 10:3 | Mahou Shoujo | property:Mahou Shoujo | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/genres.ts | 17:3 | Slice of Life | property:Slice of Life | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/resolver.ts | 3:46 | @/data/localizations/anime-overrides.ru | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/resolver.ts | 4:48 | @/lib/shikimori | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/resolver.ts | 5:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/resolver.ts | 26:19 | [Kairo localization] | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/sources.ts | 5:27 | Light novel | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/sources.ts | 6:40 | Visual novel | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/sources.ts | 7:29 | Video game | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/sources.ts | 12:28 | Web novel | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/sources.ts | 13:33 | Live action | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/sources.ts | 16:49 | Multimedia project | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/sources.ts | 17:43 | Picture book | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/statuses.ts | 15:45 | On hiatus | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/media-localization/statuses.ts | 32:11 | Unknown status | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/pending-sync/queue.ts | 12:34 | Pending payload is too deeply nested | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/pending-sync/queue.ts | 14:21 | URLs are not allowed in pending payloads | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/pending-sync/queue.ts | 22:25 | Sensitive fields are not allowed in pending payloads | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/pending-sync/storage.ts | 3:13 | kairo:pending-sync:v1 | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/autonext.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/autonext.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/autonext.test.ts | 5:6 | autonext returns the next episode only inside confirmed metadata | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/autonext.test.ts | 10:6 | last or incomplete episode metadata disables autonext | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/descriptor.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/descriptor.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/descriptor.test.ts | 5:6 | accepts a minimal provider-independent descriptor | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/descriptor.test.ts | 22:6 | rejects non-HTTPS media sources | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/descriptor.test.ts | 33:6 | accepts only the validated same-origin CVH relay path | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/descriptor.test.ts | 52:33 | /api/stream?url=https://example.test | property:url | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/descriptor.ts | 23:44 | HTTPS source required | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/descriptor.ts | 33:53 | Invalid segment range | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/hls-policy.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/hls-policy.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/hls-policy.test.ts | 5:6 | Safari keeps native HLS when both transports exist | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/hls-policy.test.ts | 12:6 | Chromium prefers hls.js MSE over its native HLS pipeline | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/hls-policy.test.ts | 19:6 | native HLS remains the fallback without MSE | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/hls-policy.test.ts | 30:6 | Safari detection excludes Chrome and Edge on Apple platforms | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/hls-policy.test.ts | 33:15 | Apple Computer, Inc. | property:vendor | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/hls-policy.test.ts | 35:9 | Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15 | property:userAgent | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/hls-policy.test.ts | 41:15 | Apple Computer, Inc. | property:vendor | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/hls-policy.test.ts | 43:9 | Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/151.0 Mobile/15E148 Safari/604.1 | property:userAgent | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/hls-policy.test.ts | 49:15 | Google Inc. | property:vendor | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/hls-policy.test.ts | 51:9 | Mozilla/5.0 AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36 | property:userAgent | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/hls-policy.ts | 10:25 | Apple Computer, Inc. | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/quality.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/quality.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/quality.test.ts | 35:6 | provider quality options are unique and sorted highest first | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/quality.test.ts | 39:6 | media state preserves time, playback rate, volume and mute | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/quality.test.ts | 67:6 | rapid switches retain the first stable snapshot | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/quality.test.ts | 81:6 | a single source exposes one provider quality behind Auto | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/quality.test.ts | 85:6 | manual source selection preserves the baseline protocol | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/skip-segments.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/skip-segments.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/skip-segments.test.ts | 8:6 | skip visibility is limited to the opening and ending windows | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/skip-segments.test.ts | 17:6 | unknown metadata is not presented and seek target is segment end | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/skip-segments.test.ts | 23:6 | new descriptor segments cannot retain a stale active segment | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/time.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/time.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/time.test.ts | 5:6 | formats sub-hour playback time as minutes and seconds | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/time.test.ts | 10:6 | formats long playback time with hours | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/playback/time.test.ts | 14:6 | handles unavailable media time safely | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/release-schedule/labels.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/release-schedule/labels.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/release-schedule/labels.test.ts | 19:6 | formats relative and absolute release-day labels | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/release-schedule/nearest.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/release-schedule/nearest.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/release-schedule/nearest.test.ts | 14:6 | prefers today even when tomorrow has more releases | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/release-schedule/nearest.test.ts | 26:6 | selects tomorrow and sorts its releases | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/release-schedule/nearest.test.ts | 37:6 | searches forward without mixing days | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/release-schedule/nearest.test.ts | 45:6 | returns null only after the whole window is empty | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/release-schedule/types.ts | 1:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/shikimori/client.ts | 21:23 | Kairo/0.1 development | property:User-Agent | REVIEW | VERIFY_CONTEXT |
| src/lib/shikimori/client.ts | 33:21 | [Kairo localization] Shikimori unavailable | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-progress/policy.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-progress/policy.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-progress/policy.test.ts | 10:6 | watch progress uses one completion and save policy | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-progress/policy.test.ts | 16:6 | resume accepts unfinished media after the minimum position | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-progress/policy.test.ts | 28:6 | resume rejects completed, near-end and invalid media | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-progress/selectors.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-progress/selectors.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-progress/selectors.test.ts | 23:6 | Continue Watching selects one latest unfinished episode per anime | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-progress/selectors.test.ts | 41:6 | Continue Watching excludes completed, near-zero and invalid entries | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-progress/selectors.ts | 2:38 | @/domain/watch/types | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-progress/storage.ts | 5:13 | kairo:watch-progress:v2 | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-progress/storage.ts | 6:9 | kairo:watch-progress:v1 | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-route.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-route.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-route.test.ts | 5:6 | legacy watch links map to shareable unified anime state | string literal | REVIEW | VERIFY_CONTEXT |
| src/lib/watch-route.test.ts | 8:5 | /anime/anilist-123-example?season=4&episode=7#watch | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/api/response.ts | 2:35 | @/server/auth/require-session | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/api/response.ts | 19:32 | Authentication required. | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/api/response.ts | 20:40 | Service temporarily unavailable. | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/auth/options.ts | 2:31 | @next-auth/prisma-adapter | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/auth/options.ts | 6:24 | @/lib/db | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/auth/options.ts | 7:35 | @/server/validation/auth | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/auth/options.ts | 8:35 | @/lib/env.server | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/auth/options.ts | 19:13 | Email and password | property:name | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/adapter.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/adapter.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/adapter.test.ts | 8:6 | adapter maps metadata without calling a video endpoint | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/adapter.test.ts | 33:6 | playback stays disabled without partner permission | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/adapter.ts | 39:52 | AniLiberty unavailable | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.test.ts | 2:26 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.test.ts | 3:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.test.ts | 17:6 | OpenAPI snapshot is valid and declares the current server | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.test.ts | 33:6 | client uses configured OpenAPI server and maps 404 | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.test.ts | 49:6 | timeout is typed and retries are bounded | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.test.ts | 61:6 | 429 honors Retry-After | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.test.ts | 74:6 | schema drift is typed and diagnostics redact credentials | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.ts | 104:13 | AniLiberty response exceeds size limit | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.ts | 109:15 | AniLiberty resource was not found | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.ts | 114:15 | AniLiberty request is not authorized | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.ts | 124:15 | AniLiberty rate limit exceeded | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.ts | 140:13 | AniLiberty response exceeds size limit | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.ts | 146:43 | AniLiberty returned invalid JSON | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.ts | 150:29 | [aniliberty] response schema mismatch | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.ts | 158:43 | AniLiberty response schema changed | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.ts | 173:13 | AniLiberty request timed out | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.ts | 183:11 | AniLiberty network request failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/client.ts | 214:11 | id,name,year,type,alias,description,episodes_total,is_ongoing,is_in_production,updated_at,episodes | property:include | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 9:6 | public metadata requests omit Authorization when no token exists | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 22:6 | explicit credentials use bearer and a Kairo user agent | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 33:46 | Bearer secret | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 36:6 | 400 is not retried | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 48:6 | 5xx retries are bounded | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 61:6 | response size is bounded | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 69:6 | metadata methods never call video or torrent paths | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 89:6 | health failure marks provider degraded | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 97:6 | schedule updates retain cursor | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 105:6 | exact original title can match | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 111:26 | Steins;Gate | property:english | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 117:6 | fuzzy title is sent to manual review | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 124:6 | dry-run performs no writes and exposes no media URL | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 138:22 | Steins;Gate | property:english | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/extra.test.ts | 145:6 | capabilities separate metadata from playback | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/mapper.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/mapper.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/mapper.test.ts | 12:46 | English title | property:english | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/mapper.test.ts | 17:6 | search and release mapping preserve identity metadata | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/mapper.test.ts | 21:25 | English title | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/mapper.test.ts | 28:6 | episode mapping is stable and metadata never stores media URLs | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/mapper.test.ts | 44:6 | fractional ordinals are retained in reference metadata | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/schemas.ts | 106:18 | At least one title is required | property:message | YES | LOCALIZE_OR_JUSTIFY |
| src/server/media-providers/adapters/aniliberty/search.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.test.ts | 2:26 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.test.ts | 3:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.test.ts | 13:43 | Black Clover | property:english | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.test.ts | 17:6 | current sanitized fixture passes transport schema | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.test.ts | 26:6 | nullable metadata does not reject an item | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.test.ts | 33:6 | number and string IDs normalize to strings | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.test.ts | 40:6 | unknown fields are allowed | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.test.ts | 47:6 | one damaged item is rejected independently | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.test.ts | 57:6 | missing release ID rejects item | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.test.ts | 64:6 | unknown top-level wrapper raises SchemaError | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.test.ts | 69:6 | all invalid IDs raise SchemaError | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.test.ts | 78:6 | diagnostic formatter renders full JSON path and received type | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.test.ts | 92:6 | diagnostic formatter redacts URLs and token-like values | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.test.ts | 107:6 | normalization exposes no media fields | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.ts | 34:7 | $1=[REDACTED] | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.ts | 72:7 | AniLiberty search response has an unknown top-level structure | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.ts | 84:12 | [aniliberty] rejected search item | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.ts | 88:41 | invalid item | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/search.ts | 110:7 | AniLiberty search response contains no valid release IDs | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/sync.ts | 1:35 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/aniliberty/sync.ts | 83:5 | No exact local Anime match; manual review is required (fuzzy matches are never auto-published) | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/adapter.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/adapter.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/adapter.test.ts | 9:6 | adapter is not registered without verified authorization | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/adapter.test.ts | 11:6 | health is controlled and performs no request | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/adapter.test.ts | 16:6 | all unverified capabilities remain false | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/adapter.test.ts | 22:6 | playback policy is partner access required | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/adapter.test.ts | 24:6 | playback environment flag cannot bypass policy | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/adapter.test.ts | 29:6 | contract claims remain UNKNOWN | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/adapter.test.ts | 33:6 | adapter playback never returns media | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/adapter.ts | 45:7 | Kodik playback is disabled pending written permission | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/client.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/client.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/client.test.ts | 8:6 | client is disabled without config | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/client.test.ts | 13:6 | base URL alone does not enable client | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/client.test.ts | 18:6 | token alone does not enable client | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/client.test.ts | 23:6 | enabled config still requires partner contract | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/client.test.ts | 33:6 | client exposes only token presence | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/client.test.ts | 38:6 | unknown contract never performs guessed requests | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/client.test.ts | 48:6 | playback always requires permission | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/client.ts | 45:7 | Kodik playback permission is not verified | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/errors.ts | 3:15 | Kodik is disabled: official API configuration is required | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/errors.ts | 11:15 | Kodik partner access and an official API contract are required | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/mapper.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/mapper.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/mapper.test.ts | 8:6 | missing translation language remains unknown | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/mapper.test.ts | 13:6 | studio name does not imply Russian language | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/mapper.test.ts | 17:14 | Russian Studio | property:label | YES | LOCALIZE_OR_JUSTIFY |
| src/server/media-providers/adapters/kodik/mapper.test.ts | 18:15 | Russian Studio | property:studio | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/mapper.test.ts | 22:6 | explicit language is preserved | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/mapper.test.ts | 28:6 | media URLs and tokens are removed from metadata | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/mapper.test.ts | 37:6 | iframe HTML is never mapped | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/mapper.test.ts | 39:41 | <iframe /> | property:iframeHtml | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/mapper.test.ts | 42:6 | mapping cannot run without official contract | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/adapters/kodik/mapper.ts | 24:5 | Kodik mapping is unavailable until an official contract is provided | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-provider.ts | 35:23 | Invalid provider key | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-schema.ts | 1:32 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-schema.ts | 2:18 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-schema.ts | 114:21 | Manifest must be a JSON file smaller than 5 MB | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-schema.ts | 120:21 | Manifest is not valid JSON | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-sync.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-sync.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-sync.test.ts | 3:35 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-sync.test.ts | 9:43 | Licensed Test | property:name | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-sync.test.ts | 21:14 | Test Anime | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/server/media-providers/manifest-sync.test.ts | 55:6 | manifest schema rejects duplicate episode positions | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-sync.test.ts | 63:6 | dry-run plan matches by AniList ID and counts provider artifacts | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-sync.ts | 1:35 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-sync.ts | 30:21 | Manifest provider has no authorized integration method | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-sync.ts | 42:7 | Manifest contains direct media without licensed/partner/written authorization | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-sync.ts | 50:7 | Manifest contains embed playback without official/written authorization | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/manifest-sync.ts | 102:7 | No unambiguous local Anime match found; add AniList ID or MAL ID to the manifest | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/policy.ts | 47:21 | Direct playback requires a protocol | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/policy.ts | 49:21 | Embed playback cannot declare a media protocol | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/probe-transport.ts | 1:24 | node:dns/promises | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/probe-transport.ts | 2:22 | node:net | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/probe-transport.ts | 3:17 | node:tls | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/probe-transport.ts | 37:24 | ::ffff: | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/probe-transport.ts | 53:21 | Only HTTPS provider URLs are allowed | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/probe-transport.ts | 55:21 | Provider URL contains unsafe authority data | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/probe-transport.ts | 61:21 | Provider resolves to a private or reserved address | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/probe-transport.ts | 95:27 | Probe request limit reached | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/probe-transport.ts | 108:17 | application/json, application/yaml, text/html;q=0.8, text/plain;q=0.5 | property:Accept | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/probe-transport.ts | 114:44 | Redirect response has no Location | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/probe-transport.ts | 116:31 | Redirect limit reached | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/probe-transport.ts | 123:29 | Probe response exceeds 2 MB | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/probe-transport.ts | 133:31 | Probe response exceeds 2 MB | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/probe-transport.ts | 164:23 | Redirect limit reached | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/probe-transport.ts | 193:36 | TLS timeout | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/providers.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/providers.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/providers.test.ts | 38:6 | registry rejects unauthorized providers and duplicate keys | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/providers.test.ts | 65:6 | identity matching prioritizes AniList/MAL identifiers | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/providers.test.ts | 73:6 | playback falls back to the next healthy provider | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/research-catalog.ts | 1:26 | node:fs/promises | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/research-catalog.ts | 2:18 | node:path | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/research-catalog.ts | 60:21 | Catalog must be an object | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/research-catalog.ts | 63:21 | Unsupported catalog schema | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/research-catalog.ts | 67:23 | Invalid candidate key | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 21:36 | /episode/{id}/player | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 35:44 | request budget exhausted | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 51:6 | valid OpenAPI and API-key auth are detected | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 54:20 | Official API | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/server/media-providers/verifier.test.ts | 58:35 | /episode/{id}/player | property:/episode/{id}/player | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 64:34 | Swagger UI | property:body | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 69:39 | Official API | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 71:6 | Swagger UI without schema remains unverified | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 76:34 | Swagger API documentation | property:body | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 84:6 | missing docs and timeout are deterministic | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 104:6 | unsupported candidates perform no requests | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 117:6 | private addresses are blocked | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 129:6 | redirects, size and sensitive headers are bounded | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 139:25 | secret=token | property:set-cookie | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 155:25 | apiKey=secret | property:set-cookie | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.test.ts | 166:6 | playback is never called and request budget is respected | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.ts | 79:28 | Network probe skipped for unsupported candidate. | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.ts | 128:11 | Documentation page declares terms/privacy links; links were not followed. | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.ts | 164:7 | No official OpenAPI/Swagger schema was verified; claimed capabilities remain untrusted. | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/media-providers/verifier.ts | 167:5 | The five-request safety budget does not permit separate /.well-known/security.txt, terms, or privacy requests; only links present in fetched documentation are inspected. | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/animego-cvh-provider-client.ts | 34:17 | Provider timed out | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/animego-cvh-provider-client.ts | 34:40 | Provider is unavailable | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/animego-cvh-provider-client.ts | 53:7 | AnimeGO/CVH provider rejected the request | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/animego-cvh-provider-client.ts | 120:7 | AnimeGO/CVH returned an invalid descriptor | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/animego-cvh-provider-client.ts | 138:11 | AnimeGO/CVH returned an invalid relay path | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/kodik-provider-client.ts | 39:17 | Provider timed out | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/kodik-provider-client.ts | 39:40 | Provider is unavailable | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/kodik-provider-client.ts | 58:7 | Playback provider rejected the request | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.test.ts | 6:49 | Exact Title | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.test.ts | 16:6 | primary success never invokes CVH | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.test.ts | 37:6 | eligible failure falls back and matches translation by name | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.test.ts | 55:17 | Dream Cast | property:name | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.test.ts | 74:6 | contract/request errors do not fall back | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.test.ts | 95:6 | double failure becomes one normalized error | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.test.ts | 118:6 | an unplayable preferred default advances deterministically at resolve time | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.test.ts | 146:17 | Dream Cast | property:name | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.test.ts | 157:59 | bad source | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.test.ts | 166:67 | Dream Cast | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.ts | 68:9 | Playback provider contract failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.ts | 96:13 | resolve start | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.ts | 97:13 | trying kodik | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.ts | 102:13 | Simulated Kodik failure | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.ts | 106:15 | kodik success | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.ts | 116:15 | trying animego-cvh | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.ts | 124:15 | Playback unavailable | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.ts | 183:17 | animego-cvh success | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/provider-manager.ts | 196:13 | Playback is temporarily unavailable | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 15:6 | normalizes case, punctuation, TV and episode suffixes | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 16:41 | AniLibria.TV (12 эп.) | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 17:53 | ani dub | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 20:6 | matches the same name exactly despite case | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 22:17 | Dream Cast | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 23:5 | dream cast | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 30:6 | TV postfix and episode count normalize to exact | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 33:5 | AniLibria.TV (12 эп.) | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 38:6 | curated aliases match known studio variants | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 40:17 | SHIZA Project | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 47:6 | strong fuzzy typo is accepted | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 50:5 | Anime Vostt | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 56:6 | weak fuzzy is rejected and reported as default | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 58:17 | Dream Cast | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 66:6 | matching voice without the requested episode is not selected | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 68:50 | Dream Cast | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.test.ts | 75:6 | default is deterministic and prefers coverage before name | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.ts | 19:4 | anilibria tv | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.ts | 20:13 | shiza project | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.ts | 21:4 | shiza project | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.ts | 21:21 | shiza project | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/playback/translation-matching.ts | 92:7 | No CVH voice has this episode | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/repositories/anime-index.repository.ts | 1:55 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/repositories/anime-title.repository.ts | 7:8 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/repositories/anime-title.repository.ts | 8:24 | @/lib/db/prisma | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/repositories/anime-title.repository.ts | 9:38 | @/lib/db/prisma-diagnostics | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/repositories/anime-title.repository.ts | 10:37 | @/lib/anime-titles/normalize | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/repositories/anime-title.repository.ts | 11:45 | @/lib/anime-titles/policy | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/repositories/anime-title.repository.ts | 15:8 | @/lib/anime-titles/lookup-cache | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/repositories/anime-title.repository.ts | 21:8 | @/lib/anime-titles/types | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/repositories/anime.repository.ts | 3:24 | @/lib/db/prisma | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/repositories/anime.repository.ts | 4:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/anime-import.service.ts | 3:24 | @/lib/db/prisma | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/anime-import.service.ts | 4:53 | @/lib/anilist | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/anime-import.service.ts | 5:29 | @/lib/catalog | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/anime-import.service.ts | 6:48 | @/lib/shikimori | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/anime-import.service.ts | 7:46 | @/data/localizations/anime-overrides.ru | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/anime-import.service.ts | 8:46 | @/data/localizations/anime-overrides.uk | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/anime-import.service.ts | 14:7 | AniList returned no anime; the local catalogue was not changed. | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/anime-import.service.ts | 142:17 | Unknown import error | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/anime-index-sync.service.ts | 207:54 | Unknown database error | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/anime-list.service.ts | 2:24 | @/lib/db | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/anime-list.service.ts | 3:38 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/anime-title-enrichment.service.ts | 3:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/anime-title-enrichment.service.ts | 4:39 | @/server/repositories/anime-title.repository | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/anime-title-enrichment.service.ts | 5:49 | @/lib/db/prisma-diagnostics | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/anime-title-enrichment.service.ts | 9:8 | @/lib/anime-titles/public-list | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/current-season.service.ts | 8:8 | @/lib/anime-season/current | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/current-season.service.ts | 13:8 | @/lib/anilist | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/current-season.service.ts | 14:37 | @/lib/catalog | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/current-season.service.ts | 18:8 | @/lib/catalog/public | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/current-season.service.ts | 19:49 | @/lib/media-localization | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/current-season.service.ts | 20:47 | @/server/repositories/anime.repository | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/current-season.service.ts | 21:52 | @/server/services/anime-title-enrichment.service | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/current-season.service.ts | 22:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/episode.service.ts | 7:8 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/episode.service.ts | 8:24 | @/lib/db | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/episode.service.ts | 12:8 | @/domain/watch/resolvers | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/episode.service.ts | 18:8 | @/domain/watch | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/hero-image.service.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/hero-image.service.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/hero-image.service.test.ts | 8:6 | rejects portrait and sub-1920 TMDB artwork | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/hero-image.service.test.ts | 29:6 | prefers high resolution language-neutral landscape artwork | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/hero-image.service.ts | 3:24 | @/lib/db/prisma | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/hero-image.service.ts | 4:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/hero-image.service.ts | 218:20 | [Hero image] cache write skipped | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/hero-image.service.ts | 255:22 | [Hero image] TMDB fallback | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 19:6 | Kodik stays inert until explicitly configured | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 38:6 | Kodik diagnostics report a configuration error without a token | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 54:6 | Kodik resolves an allowlisted HTTPS episode and normalizes translations | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 82:6 | Kodik preserves distinct translations and deduplicates translation IDs | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 87:40 | Dub A | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/server/services/kodik.service.test.ts | 88:40 | Dub B | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/server/services/kodik.service.test.ts | 89:40 | Dub A | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/server/services/kodik.service.test.ts | 95:6 | Dub A | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 95:15 | Dub B | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 99:6 | Kodik classifies an empty successful response as NOT_FOUND | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 134:6 | Kodik retries 429 and 5xx with bounded backoff | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 161:6 | Kodik classifies timeout separately and bounds retries | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 190:6 | Kodik classifies DNS and other fetch failures as NETWORK_ERROR | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 191:38 | fetch failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 209:6 | Kodik distinguishes invalid JSON, content type and schema mismatch | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 221:22 | <html /> | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 242:6 | Kodik accepts absent optional fields and reports normalized releases | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 259:6 | Kodik rejects malformed, non-HTTPS and unexpected embed hosts | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 261:5 | javascript:alert(1) | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.test.ts | 280:6 | Kodik sends the confirmed shikimori_id parameter and never exposes token | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.ts | 302:24 | [kodik] search started | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.ts | 339:28 | [kodik] search failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.ts | 362:50 | missing content-type | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.ts | 391:29 | [kodik] response schema mismatch | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.ts | 415:28 | [kodik] search completed | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.ts | 440:26 | [kodik] search failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.ts | 495:11 | Kodik returned an invalid response | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.ts | 499:9 | Kodik request failed | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.ts | 510:9 | Kodik material schema mismatch | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik.service.ts | 698:23 | A positive malId or shikimoriId is required | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/detail-episodes.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/detail-episodes.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/detail-episodes.test.ts | 84:16 | Example Romaji | property:titleRomaji | YES | LOCALIZE_OR_JUSTIFY |
| src/server/services/kodik/detail-episodes.test.ts | 95:6 | one season produces one episode list with a watch URL | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/detail-episodes.test.ts | 113:6 | multiple seasons retain their exact season and episode mapping | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/detail-episodes.test.ts | 123:6 | movie and no result do not create fictional episodes | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/detail-episodes.test.ts | 131:6 | blocked episodes have no active watch link | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/detail-episodes.test.ts | 138:6 | multiple translations do not duplicate episode rows and voice is preferred | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/detail-episodes.test.ts | 144:6 | provider lookup uses real metadata once and exposes no token | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/detail-episodes.test.ts | 165:15 | Example Romaji | property:romaji | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/detail-episodes.test.ts | 173:6 | provider failure becomes the controlled empty state | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/detail-episodes.test.ts | 177:25 | temporary failure | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/detail-episodes.ts | 1:59 | @/domain/watch | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/detail-episodes.ts | 2:28 | @/types/media | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/errors.ts | 2:25 | Kodik REST provider is not configured | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 13:10 | Cowboy Bebop | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/server/services/kodik/provider.test.ts | 14:15 | Cowboy Bebop | property:title_orig | YES | LOCALIZE_OR_JUSTIFY |
| src/server/services/kodik/provider.test.ts | 15:32 | Voice One | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/server/services/kodik/provider.test.ts | 24:6 | parses the typed Kodik API response and rejects malformed materials | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 36:6 | prefers exact shikimori_id without treating AniList or MAL IDs as equivalent | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 43:26 | Different title | property:english | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 51:6 | classifies exact title with year and excludes unrelated movie types | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 57:38 | Cowboy Bebop | property:english | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 64:6 | deduplicates title fallback in locale priority order and bounds attempts | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 69:18 | Cowboy Bebop | property:english | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 70:17 | Cowboy Bebop | property:romaji | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 72:19 | Alias 1 | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 72:30 | Alias 2 | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 72:41 | Alias 3 | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 77:7 | Cowboy Bebop | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 79:7 | Alias 1 | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 80:7 | Alias 2 | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 85:6 | groups translations for one anime identity and preserves restrictions | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 95:18 | Subtitle Two | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/server/services/kodik/provider.test.ts | 111:6 | normalizes with_episodes_data seasons and episode metadata | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 124:24 | Episode Two | property:title | YES | LOCALIZE_OR_JUSTIFY |
| src/server/services/kodik/provider.test.ts | 139:38 | Episode Two | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 143:6 | handles every blocked_seasons form deterministically | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 150:6 | uses sequential title fallback only until a confident match | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 162:28 | Cowboy Bebop | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 168:49 | Cowboy Bebop | property:english | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 171:54 | Cowboy Bebop | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 174:6 | detailed playback explicitly requests complete season and episode data | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 189:24 | Cowboy Bebop | property:english | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 197:6 | missing token is a controlled configuration error and performs no request | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 207:46 | Cowboy Bebop | property:english | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 213:6 | malformed API material raises a typed response error | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 224:46 | Cowboy Bebop | property:english | REVIEW | VERIFY_CONTEXT |
| src/server/services/kodik/provider.test.ts | 229:6 | request URL and logs never expose the token | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/merge.service.ts | 2:24 | @/lib/db | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/merge.service.ts | 4:29 | @prisma/client | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/merge.service.ts | 5:37 | @/server/validation/merge | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/preferences.service.ts | 2:24 | @/lib/db | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/preferences.service.ts | 4:34 | @/server/validation/data | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/progress.service.ts | 2:24 | @/lib/db | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/progress.service.ts | 4:31 | @/server/validation/data | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/progress.service.ts | 5:42 | @/lib/watch-progress/policy | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/release-schedule.service.ts | 3:57 | @/lib/anilist | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/release-schedule.service.ts | 4:24 | @/lib/db/prisma | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/release-schedule.service.ts | 5:44 | @/lib/release-schedule/types | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/release-schedule.service.ts | 6:33 | @/lib/watch-route | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/release-schedule.service.ts | 7:32 | @/server/repositories/anime.repository | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/release-schedule.service.ts | 11:8 | @/lib/release-schedule/types | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/watch-party.service.ts | 2:24 | @/lib/db | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/watch-party.service.ts | 3:34 | @/domain/watch-party/room-code | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/services/watch-party.service.ts | 4:32 | @/domain/watch-party/schemas | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/validation/comment.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/validation/comment.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/validation/comment.test.ts | 5:6 | comment validation trims plain text and preserves spoiler state | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/validation/comment.test.ts | 8:11 | Important comment | property:body | REVIEW | VERIFY_CONTEXT |
| src/server/validation/comment.test.ts | 11:29 | Important comment | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/validation/comment.test.ts | 15:6 | comment validation rejects empty and oversized bodies | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/validation/merge.ts | 15:54 | anime key required | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/watch-party/ably-token.test.ts | 1:20 | node:assert/strict | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/watch-party/ably-token.test.ts | 2:18 | node:test | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/watch-party/ably-token.test.ts | 4:6 | guest token cannot publish and never contains master secret | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/watch-party/ably-token.test.ts | 6:5 | app.key:super-secret | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/watch-party/ably-token.test.ts | 8:5 | watch-party:1 | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/watch-party/ably-token.test.ts | 12:49 | watch-party:1 | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/watch-party/ably-token.test.ts | 19:6 | host token is scoped to its room and may publish | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/watch-party/ably-token.test.ts | 21:5 | app.key:super-secret | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/watch-party/ably-token.test.ts | 23:5 | watch-party:7 | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/watch-party/ably-token.test.ts | 28:34 | watch-party:7 | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/watch-party/ably-token.ts | 1:41 | node:crypto | string literal | REVIEW | VERIFY_CONTEXT |
| src/server/watch-party/ably-token.ts | 11:38 | Invalid ABLY_API_KEY | string literal | REVIEW | VERIFY_CONTEXT |
