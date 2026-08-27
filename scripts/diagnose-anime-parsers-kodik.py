"""Read-only Kodik diagnostic for anime_parsers_ru.

The script deliberately prints neither the acquired token nor resolved media URLs.
"""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass

import requests
from anime_parsers_ru import KodikParser


@dataclass
class Check:
    status: str = "FAIL"
    detail: str = "not run"


def safe_error(error: Exception) -> str:
    text = re.sub(r"https?://\S+", "[redacted-url]", str(error))
    return re.sub(r"(?i)(token[=: ]+)[^\s,;]+", r"\1[redacted]", text)[:240]


def main() -> int:
    cli = argparse.ArgumentParser()
    cli.add_argument("--shikimori-id", default="53446")
    cli.add_argument("--episode", type=int, default=1)
    cli.add_argument("--quality", type=int, choices=(360, 480, 720), default=720)
    args = cli.parse_args()

    checks = {
        "TOKEN": Check(),
        "TITLE RESOLVE": Check(),
        "TRANSLATIONS": Check(),
        "DIRECT MP4": Check(),
        "HLS": Check(),
    }

    try:
        parser = KodikParser(token=None, validate_token=False)
        if not getattr(parser, "TOKEN", None):
            raise RuntimeError("automatic token acquisition returned an empty value")
        checks["TOKEN"] = Check("PASS", "automatic token acquired (value redacted)")
    except Exception as error:
        checks["TOKEN"].detail = safe_error(error)
        parser = None

    translation_id = "0"
    if parser is not None:
        try:
            info = parser.get_info(args.shikimori_id, "shikimori")
            checks["TITLE RESOLVE"] = Check("PASS", f"series_count={info['series_count']}")
            translations = info.get("translations") or []
            if not translations:
                raise RuntimeError("no translations returned")
            translation = next(
                (
                    item
                    for item in translations
                    if item.get("series_range", (0, 0))[0] <= args.episode
                    <= item.get("series_range", (0, 0))[1]
                ),
                translations[0],
            )
            translation_id = str(translation["id"])
            checks["TRANSLATIONS"] = Check("PASS", f"count={len(translations)}; selected id redacted")
        except Exception as error:
            checks["TITLE RESOLVE"].detail = safe_error(error)
            checks["TRANSLATIONS"].detail = "blocked by title resolve"

    if parser is not None and checks["TRANSLATIONS"].status == "PASS":
        try:
            base, max_quality, _ = parser.get_link(
                args.shikimori_id, "shikimori", args.episode, translation_id
            )
            quality = min(args.quality, max_quality)
            mp4_url = f"https:{base}{quality}.mp4"
            response = requests.get(
                mp4_url,
                headers={"Range": "bytes=0-0"},
                stream=True,
                timeout=20,
            )
            if response.status_code not in (200, 206):
                raise RuntimeError(f"media probe returned HTTP {response.status_code}")
            checks["DIRECT MP4"] = Check("PASS", f"HTTP {response.status_code}; quality={quality}")
            response.close()
        except Exception as error:
            checks["DIRECT MP4"].detail = safe_error(error)

        try:
            playlist_url = parser.get_m3u8_playlist_link(
                args.shikimori_id,
                "shikimori",
                args.episode,
                translation_id,
                args.quality,
            )
            response = requests.get(playlist_url, timeout=20)
            if response.status_code != 200 or not response.text.lstrip().startswith("#EXTM3U"):
                raise RuntimeError(f"playlist probe returned HTTP {response.status_code} or invalid M3U8")
            checks["HLS"] = Check("PASS", f"HTTP 200; bytes={len(response.content)}")
        except Exception as error:
            checks["HLS"].detail = safe_error(error)

    for name, check in checks.items():
        print(f"{name}: {check.status} ({check.detail})")
    return 0 if all(check.status == "PASS" for check in checks.values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
