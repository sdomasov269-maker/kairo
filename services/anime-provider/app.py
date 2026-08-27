import re

from fastapi import FastAPI, Header, HTTPException, Path, Query
from fastapi.responses import Response, StreamingResponse

from environment import load_provider_environment

load_provider_environment()

from providers.kodik import KodikProvider, ProviderError
from providers.animego_cvh import AnimegoCvhProvider, AnimegoProviderError
from providers.cvh_relay import (
    RESOURCE_LIMIT,
    CvhRelayError,
    open_resource,
    rewrite_manifest,
)

app = FastAPI(title="Kairo anime provider", docs_url=None, redoc_url=None)
provider = KodikProvider()
animego_provider = AnimegoCvhProvider()


def raise_http(error: ProviderError) -> None:
    status = 404 if error.code in {"TITLE_NOT_FOUND", "TRANSLATION_NOT_FOUND", "NO_TRANSLATIONS"} else 504 if error.code == "PROVIDER_TIMEOUT" else 502
    raise HTTPException(status_code=status, detail={"code": error.code, "message": str(error)})


def raise_animego_http(error: AnimegoProviderError) -> None:
    status = 400 if error.code == "INVALID_REQUEST" else 404 if error.code in {"TITLE_NOT_FOUND", "NO_CVH_VOICE", "NO_CVH_STREAM"} else 504 if error.code == "PROVIDER_TIMEOUT" else 502
    raise HTTPException(status_code=status, detail={"code": error.code, "message": str(error)})


def raise_relay_http(error: CvhRelayError) -> None:
    raise HTTPException(status_code=error.status, detail={"code": error.code, "message": str(error)})


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/v1/kodik/titles/{shikimori_id}")
def title_info(shikimori_id: str):
    try:
        return provider.get_title_info(shikimori_id)
    except ProviderError as error:
        raise_http(error)


@app.get("/v1/kodik/titles/{shikimori_id}/translations")
def translations(shikimori_id: str):
    try:
        return provider.get_translations(shikimori_id)
    except ProviderError as error:
        raise_http(error)


@app.get("/v1/kodik/playback/{shikimori_id}")
def playback(
    shikimori_id: str,
    episode: int = Query(ge=0, le=10000),
    translation_id: str | None = Query(default=None, max_length=100),
):
    try:
        return provider.resolve_episode(shikimori_id, episode, translation_id)
    except ProviderError as error:
        raise_http(error)


@app.get("/v1/animego/search")
def animego_search(q: str = Query(min_length=1, max_length=200)):
    try:
        return animego_provider.search(q)
    except AnimegoProviderError as error:
        raise_animego_http(error)


@app.get("/v1/animego/resolve")
def animego_resolve(
    title: list[str] = Query(min_length=1, max_length=200),
    year: int | None = Query(default=None, ge=1900, le=2200),
    media_type: str | None = Query(default=None, max_length=40),
):
    try:
        return animego_provider.resolve_title(title, year, media_type)
    except AnimegoProviderError as error:
        raise_animego_http(error)


@app.get("/v1/animego/titles/{anime_id}/episodes/{episode}/voices")
def animego_voices(anime_id: str, episode: int = Path(ge=1, le=10000)):
    try:
        return animego_provider.get_voices(anime_id, episode)
    except AnimegoProviderError as error:
        raise_animego_http(error)


@app.get("/v1/animego/titles/{anime_id}/episodes/{episode}/playback")
def animego_playback(
    anime_id: str,
    episode: int = Path(ge=1, le=10000),
    translation_id: str | None = Query(default=None, max_length=100),
    season: int = Query(default=1, ge=1, le=1000),
):
    try:
        return animego_provider.resolve_playback(anime_id, episode, translation_id, season)
    except AnimegoProviderError as error:
        raise_animego_http(error)


@app.get("/v1/relay/cvh/{session_id}/manifest.m3u8")
def cvh_relay_manifest(session_id: str):
    try:
        session = animego_provider.relay_store.get(session_id)
        content = rewrite_manifest(animego_provider.relay_store, session, session.manifest_url)
        return Response(content, media_type="application/vnd.apple.mpegurl", headers={"cache-control": "no-store"})
    except CvhRelayError as error:
        raise_relay_http(error)


@app.get("/v1/relay/cvh/{session_id}/resources/{resource_id}")
def cvh_relay_resource(
    session_id: str,
    resource_id: str,
    range_header: str | None = Header(default=None, alias="Range"),
):
    try:
        session = animego_provider.relay_store.get(session_id)
        resource, upstream = open_resource(
            animego_provider.relay_store,
            session,
            resource_id,
            range_header,
        )
        content_type = upstream.headers.get("content-type", "application/octet-stream")
        if "mpegurl" in content_type.casefold() or resource.url.casefold().endswith(".m3u8"):
            upstream.close()
            content = rewrite_manifest(animego_provider.relay_store, session, resource.url)
            return Response(content, media_type="application/vnd.apple.mpegurl", headers={"cache-control": "no-store"})
        headers = {"cache-control": "no-store"}
        for source, target in (("content-range", "Content-Range"), ("accept-ranges", "Accept-Ranges"), ("content-length", "Content-Length")):
            if upstream.headers.get(source):
                headers[target] = upstream.headers[source]
        if upstream.status_code == 206 and range_header and "Content-Range" not in headers:
            match = re.fullmatch(r"bytes=(\d+)-\d*", range_header)
            length = upstream.headers.get("content-length")
            if match and length and length.isdigit():
                start = int(match.group(1))
                headers["Content-Range"] = f"bytes {start}-{start + int(length) - 1}/*"

        def chunks():
            transferred = 0
            try:
                for chunk in upstream.iter_content(64 * 1024):
                    if not chunk:
                        continue
                    transferred += len(chunk)
                    if transferred > RESOURCE_LIMIT:
                        break
                    yield chunk
            finally:
                upstream.close()

        return StreamingResponse(chunks(), status_code=upstream.status_code, media_type=content_type, headers=headers)
    except CvhRelayError as error:
        raise_relay_http(error)
