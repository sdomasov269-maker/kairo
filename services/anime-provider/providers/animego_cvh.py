from __future__ import annotations

import re
import threading
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from dataclasses import dataclass
from difflib import SequenceMatcher

from anime_parsers_ru import AnimegoParser

from models import (
    AnimegoSearchResult,
    AnimegoVoice,
    AnimegoVoices,
    PlaybackDescriptor,
    PlaybackSource,
    PlaybackTranslation,
)
from providers.cvh_relay import CvhRelayStore


class AnimegoProviderError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass
class CacheEntry:
    expires_at: float
    value: object


def normalize_title(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).casefold()
    return " ".join(re.sub(r"[^\w]+", " ", normalized, flags=re.UNICODE).split())


def title_similarity(left: str, right: str) -> float:
    a, b = normalize_title(left), normalize_title(right)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    return SequenceMatcher(None, a, b).ratio()


class AnimegoCvhProvider:
    def __init__(self, parser: AnimegoParser | None = None, timeout: float = 25, ttl: float = 300, relay_store: CvhRelayStore | None = None) -> None:
        self._parser = parser or AnimegoParser(use_cache=True)
        self._timeout = timeout
        self._ttl = ttl
        self._cache: dict[str, CacheEntry] = {}
        self._lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="animego-cvh")
        self.relay_store = relay_store or CvhRelayStore()

    def _run(self, operation):
        try:
            return self._executor.submit(operation).result(timeout=self._timeout)
        except FutureTimeout as error:
            raise AnimegoProviderError("PROVIDER_TIMEOUT", "AnimeGO/CVH timed out") from error
        except AnimegoProviderError:
            raise
        except Exception as error:
            name = type(error).__name__
            code = "TITLE_NOT_FOUND" if name == "NoResults" else "PROVIDER_ERROR"
            raise AnimegoProviderError(code, f"AnimeGO/CVH {name}") from error

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
    def _search_result(item: dict, score: float | None = None) -> AnimegoSearchResult:
        return AnimegoSearchResult(
            id=str(item.get("id", "")),
            title=str(item.get("title", "")),
            originalTitle=item.get("original_title"),
            year=item.get("year") if isinstance(item.get("year"), int) else None,
            type=item.get("type"),
            url=str(item.get("link", "")),
            poster=item.get("image"),
            score=score,
        )

    def search(self, query: str) -> list[AnimegoSearchResult]:
        query = query.strip()
        if not query:
            raise AnimegoProviderError("INVALID_REQUEST", "Search query is required")
        return self._cached(
            f"search:{normalize_title(query)}",
            lambda: [self._search_result(item) for item in self._parser.search(query)],
        )

    def resolve_title(
        self,
        titles: list[str],
        year: int | None = None,
        media_type: str | None = None,
    ) -> AnimegoSearchResult:
        wanted = [title.strip() for title in titles if title.strip()]
        if not wanted:
            raise AnimegoProviderError("INVALID_REQUEST", "At least one title is required")

        def resolve() -> AnimegoSearchResult:
            candidates: dict[str, dict] = {}
            for title in wanted[:6]:
                try:
                    for item in self._parser.search(title):
                        candidates.setdefault(str(item.get("id", "")), item)
                except Exception as error:
                    if type(error).__name__ != "NoResults":
                        raise
            ranked: list[tuple[float, dict]] = []
            for item in candidates.values():
                names = [str(item.get("title", "")), str(item.get("original_title") or "")]
                similarity = max(title_similarity(w, candidate) for w in wanted for candidate in names)
                score = similarity * 0.82
                candidate_year = item.get("year")
                if year and isinstance(candidate_year, int):
                    score += max(0.0, 0.13 - abs(year - candidate_year) * 0.065)
                candidate_type = normalize_title(str(item.get("type") or ""))
                wanted_type = normalize_title(media_type or "")
                if wanted_type and candidate_type:
                    aliases = {"tv": "сериал", "series": "сериал", "movie": "фильм"}
                    normalized_wanted = aliases.get(wanted_type, wanted_type)
                    if normalized_wanted in candidate_type:
                        score += 0.05
                ranked.append((score, item))
            ranked.sort(key=lambda pair: pair[0], reverse=True)
            if not ranked or ranked[0][0] < 0.64:
                raise AnimegoProviderError("TITLE_NOT_FOUND", "No confident AnimeGO title match")
            return self._search_result(ranked[0][1], round(ranked[0][0], 4))

        key = f"resolve:{'|'.join(normalize_title(x) for x in wanted)}:{year}:{media_type}"
        return self._cached(key, resolve)

    def get_voices(self, anime_id: str, episode: int) -> AnimegoVoices:
        def resolve() -> AnimegoVoices:
            raw = self._parser.get_voices(anime_id=anime_id, episode=episode)
            cvh = [voice for voice in raw.get("voices", []) if str(voice.get("player", "")).casefold() == "cvh"]
            if not cvh:
                raise AnimegoProviderError("NO_CVH_VOICE", "No CVH voice is available")
            playlist_cache: dict[str, dict] = {}
            voices: list[AnimegoVoice] = []
            for voice in cvh:
                cvh_id = str(voice.get("cvh_id") or "")
                vk_id = None
                episode_coverage = 0
                if cvh_id:
                    if cvh_id not in playlist_cache:
                        playlist_cache[cvh_id] = self._parser.cvh_get_playlist(cvh_id)
                    playlist = playlist_cache[cvh_id]
                    season = next(iter(playlist), None)
                    entries = playlist.get(season, {}).get(episode, []) if season is not None else []
                    label = normalize_title(str(voice.get("label", "")))
                    season_episodes = playlist.get(season, {}) if season is not None else {}
                    episode_coverage = sum(
                        1
                        for episode_entries in season_episodes.values()
                        if any(normalize_title(str(entry.get("voiceStudio", ""))) == label for entry in episode_entries)
                    )
                    match = next((entry for entry in entries if normalize_title(str(entry.get("voiceStudio", ""))) == label), None)
                    vk_id = str(match.get("vkId")) if match and match.get("vkId") else None
                voices.append(AnimegoVoice(
                    player="cvh",
                    translationId=str(voice.get("translation_id", "")),
                    name=str(voice.get("label", "")),
                    cvhId=cvh_id,
                    vkId=vk_id,
                    embed=str(voice.get("embed", "")),
                    episodeAvailable=vk_id is not None,
                    episodeCoverage=episode_coverage,
                ))
            return AnimegoVoices(
                titleId=anime_id,
                episode=episode,
                totalEpisodes=raw.get("total_episodes"),
                voices=voices,
            )

        return self._cached(f"voices:{anime_id}:{episode}", resolve)

    @staticmethod
    def _quality(url: str) -> int | None:
        match = re.search(r"(?:^|[^0-9])(\d{3,4})p(?:[^0-9]|$)", url)
        return int(match.group(1)) if match else None

    def resolve_playback(
        self,
        anime_id: str,
        episode: int,
        translation_id: str | None = None,
        season: int = 1,
    ) -> PlaybackDescriptor:
        def resolve() -> PlaybackDescriptor:
            voices = self.get_voices(anime_id, episode)
            voice = next(
                (item for item in voices.voices if item.translationId == translation_id),
                voices.voices[0] if not translation_id and voices.voices else None,
            )
            if voice is None:
                raise AnimegoProviderError("NO_CVH_VOICE", "Requested CVH voice is unavailable")
            if voice.vkId:
                streams = self._parser.cvh_get_stream_by_id(voice.vkId)
            else:
                streams = self._parser.cvh_get_stream(voice.cvhId, season, episode, voice.name)
            sources: list[PlaybackSource] = []
            if streams.get("HLS"):
                session = self.relay_store.create(streams["HLS"], self._parser._CVH_HEADERS)
                sources.append(PlaybackSource(protocol="hls", url=f"/v1/relay/cvh/{session.id}/manifest.m3u8"))
                for url in sorted(streams.get("MP4s", []), key=lambda value: self._quality(value) or 0, reverse=True):
                    resource_id = self.relay_store.register(session, url)
                    sources.append(PlaybackSource(protocol="mp4", url=f"/v1/relay/cvh/{session.id}/resources/{resource_id}", quality=self._quality(url)))
            if not sources:
                raise AnimegoProviderError("NO_CVH_STREAM", "CVH returned no playable sources")
            return PlaybackDescriptor(
                provider="animego-cvh",
                titleId=anime_id,
                episode=episode,
                translation=PlaybackTranslation(id=voice.translationId, name=voice.name, type="voice"),
                sources=sources,
            )

        return self._cached(f"playback:{anime_id}:{season}:{episode}:{translation_id or 'auto'}", resolve)
