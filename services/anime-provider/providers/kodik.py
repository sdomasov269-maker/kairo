from __future__ import annotations

import math
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from dataclasses import dataclass

from anime_parsers_ru import KodikParser

from models import (
    PlaybackDescriptor,
    PlaybackSkipSegment,
    PlaybackSource,
    PlaybackTranslation,
    TitleInfo,
)


class ProviderError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass
class CacheEntry:
    expires_at: float
    value: object


def normalize_skip_segments(raw_segments: object) -> list[PlaybackSkipSegment]:
    if not isinstance(raw_segments, (list, tuple)):
        return []
    valid: list[tuple[float, float]] = []
    for raw in raw_segments:
        if not isinstance(raw, (list, tuple)) or len(raw) != 2:
            continue
        start, end = raw
        if isinstance(start, bool) or isinstance(end, bool):
            continue
        try:
            normalized = (float(start), float(end))
        except (TypeError, ValueError):
            continue
        if (
            not all(math.isfinite(value) for value in normalized)
            or normalized[0] < 0
            or normalized[1] <= normalized[0]
            or normalized[1] > 21_600
        ):
            continue
        valid.append(normalized)
    valid.sort(key=lambda segment: (segment[0], segment[1]))
    result: list[PlaybackSkipSegment] = []
    for index, (start, end) in enumerate(valid):
        kind = "unknown"
        if index == 0 and start <= 300:
            kind = "opening"
        elif index == len(valid) - 1 and start > 300:
            kind = "ending"
        result.append(PlaybackSkipSegment(kind=kind, start=start, end=end))
    return result


class KodikProvider:
    def __init__(self) -> None:
        self._parser: KodikParser | None = None
        self._lock = threading.Lock()
        self._cache: dict[str, CacheEntry] = {}
        self._executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="kodik")
        self._timeout = float(os.getenv("KODIK_RESOLVE_TIMEOUT_SECONDS", "25"))
        self._ttl = float(os.getenv("KODIK_RESOLVE_CACHE_SECONDS", "300"))

    def _get_parser(self) -> KodikParser:
        with self._lock:
            if self._parser is None:
                token = os.getenv("KODIK_API_TOKEN", "").strip() or None
                if token is None and os.getenv("KODIK_AUTOMATIC_TOKEN_FALLBACK") != "true":
                    raise ProviderError("TOKEN_MISSING", "KODIK_API_TOKEN is not configured")
                self._parser = KodikParser(token=token, validate_token=False, use_cache=True)
            return self._parser

    def _run(self, operation):
        try:
            return self._executor.submit(operation).result(timeout=self._timeout)
        except FutureTimeout as error:
            raise ProviderError("PROVIDER_TIMEOUT", "Kodik resolution timed out") from error
        except ProviderError:
            raise
        except Exception as error:
            name = type(error).__name__
            code = {
                "NoResults": "TITLE_NOT_FOUND",
                "ContentBlocked": "MEDIA_BLOCKED",
                "TokenError": "TOKEN_INVALID",
            }.get(name, "PROVIDER_ERROR")
            raise ProviderError(code, f"Kodik {name}") from error

    def _cached(self, key: str, operation):
        now = time.monotonic()
        with self._lock:
            cached = self._cache.get(key)
            if cached and cached.expires_at > now:
                return cached.value
        value = self._run(operation)
        with self._lock:
            self._cache[key] = CacheEntry(now + self._ttl, value)
        return value

    @staticmethod
    def _translation(item: dict) -> PlaybackTranslation:
        raw_type = str(item.get("type", "")).lower()
        translation_type = (
            "subtitles" if "субтит" in raw_type else "voice" if "озвуч" in raw_type else None
        )
        return PlaybackTranslation(
            id=str(item.get("id", "0")),
            name=str(item.get("name", "Неизвестно")),
            type=translation_type,
        )

    def get_title_info(self, shikimori_id: str) -> TitleInfo:
        def resolve() -> TitleInfo:
            info = self._get_parser().get_info(shikimori_id, "shikimori")
            translations = [self._translation(item) for item in info.get("translations", [])]
            return TitleInfo(
                titleId=shikimori_id,
                seriesCount=int(info.get("series_count", 0)),
                translations=translations,
            )

        return self._cached(f"title:{shikimori_id}", resolve)

    def get_translations(self, shikimori_id: str) -> TitleInfo:
        info = self.get_title_info(shikimori_id)
        if not info.translations:
            raise ProviderError("NO_TRANSLATIONS", "No translations were found")
        return info

    def resolve_episode(
        self, shikimori_id: str, episode: int, translation_id: str | None
    ) -> PlaybackDescriptor:
        key = f"playback:{shikimori_id}:{episode}:{translation_id or 'auto'}"

        def resolve() -> PlaybackDescriptor:
            info = self.get_title_info(shikimori_id)
            translation = next(
                (item for item in info.translations if item.id == translation_id),
                info.translations[0] if not translation_id and info.translations else None,
            )
            if translation is None:
                raise ProviderError("TRANSLATION_NOT_FOUND", "Translation was not found")
            base, max_quality, raw_segments = self._get_parser().get_link(
                shikimori_id, "shikimori", episode, translation.id
            )
            qualities = [
                quality
                for quality in (720, 480, 360)
                if quality <= int(max_quality)
            ]
            if not qualities:
                qualities = [int(max_quality)]
            skip_segments = normalize_skip_segments(raw_segments)
            return PlaybackDescriptor(
                titleId=shikimori_id,
                episode=episode,
                translation=translation,
                sources=[
                    *[
                        PlaybackSource(
                            protocol="hls",
                            url=f"https:{base}{quality}.mp4:hls:manifest.m3u8",
                            quality=quality,
                        )
                        for quality in qualities
                    ],
                    *[
                        PlaybackSource(
                            protocol="mp4",
                            url=f"https:{base}{quality}.mp4",
                            quality=quality,
                        )
                        for quality in qualities
                    ],
                ],
                skipSegments=skip_segments,
            )

        return self._cached(key, resolve)
