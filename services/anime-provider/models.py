from typing import Literal

from pydantic import BaseModel, Field


class PlaybackTranslation(BaseModel):
    id: str
    name: str
    type: Literal["voice", "subtitles"] | None = None


class PlaybackSource(BaseModel):
    protocol: Literal["hls", "mp4", "dash"]
    url: str
    quality: int | None = None


class PlaybackSkipSegment(BaseModel):
    kind: Literal["opening", "ending", "unknown"]
    start: float
    end: float


class PlaybackDescriptor(BaseModel):
    provider: str = "kodik"
    titleId: str
    episode: int
    translation: PlaybackTranslation | None = None
    sources: list[PlaybackSource]
    skipSegments: list[PlaybackSkipSegment] = Field(default_factory=list)


class TitleInfo(BaseModel):
    provider: str = "kodik"
    titleId: str
    seriesCount: int
    translations: list[PlaybackTranslation]


class AnimegoSearchResult(BaseModel):
    id: str
    title: str
    originalTitle: str | None = None
    year: int | None = None
    type: str | None = None
    url: str
    poster: str | None = None
    score: float | None = None


class AnimegoVoice(BaseModel):
    player: str
    translationId: str
    name: str
    cvhId: str
    vkId: str | None = None
    embed: str
    episodeAvailable: bool = False
    episodeCoverage: int = 0


class AnimegoVoices(BaseModel):
    provider: str = "animego-cvh"
    titleId: str
    episode: int
    totalEpisodes: int | None = None
    voices: list[AnimegoVoice]
    dashAvailable: bool = False
