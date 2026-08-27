from __future__ import annotations

import re
import secrets
import threading
import time
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlsplit

import requests


class CvhRelayError(RuntimeError):
    def __init__(self, code: str, message: str, status: int = 502):
        super().__init__(message)
        self.code = code
        self.status = status


@dataclass
class RelayResource:
    url: str


@dataclass
class RelaySession:
    id: str
    manifest_url: str
    headers: dict[str, str]
    created_at: float
    expires_at: float
    resources: dict[str, RelayResource] = field(default_factory=dict)
    resource_ids: dict[str, str] = field(default_factory=dict)


class CvhRelayStore:
    def __init__(self, ttl_seconds: int = 20 * 60) -> None:
        self._ttl = ttl_seconds
        self._sessions: dict[str, RelaySession] = {}
        self._lock = threading.Lock()

    def create(self, manifest_url: str, headers: dict[str, str]) -> RelaySession:
        _validate_upstream_url(manifest_url)
        now = time.monotonic()
        session = RelaySession(
            id=secrets.token_urlsafe(24),
            manifest_url=manifest_url,
            headers=dict(headers),
            created_at=now,
            expires_at=now + self._ttl,
        )
        with self._lock:
            self._purge(now)
            self._sessions[session.id] = session
        return session

    def get(self, session_id: str) -> RelaySession:
        if not re.fullmatch(r"[A-Za-z0-9_-]{24,64}", session_id):
            raise CvhRelayError("SESSION_EXPIRED", "Relay session is unavailable", 404)
        now = time.monotonic()
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None or session.expires_at <= now:
                self._sessions.pop(session_id, None)
                raise CvhRelayError("SESSION_EXPIRED", "Relay session is unavailable", 410)
            return session

    def register(self, session: RelaySession, url: str) -> str:
        _validate_upstream_url(url)
        with self._lock:
            existing = session.resource_ids.get(url)
            if existing:
                return existing
            resource_id = secrets.token_urlsafe(18)
            session.resources[resource_id] = RelayResource(url=url)
            session.resource_ids[url] = resource_id
            return resource_id

    def resource(self, session: RelaySession, resource_id: str) -> RelayResource:
        if not re.fullmatch(r"[A-Za-z0-9_-]{18,48}", resource_id):
            raise CvhRelayError("SEGMENT_NOT_FOUND", "Relay resource was not found", 404)
        resource = session.resources.get(resource_id)
        if resource is None:
            raise CvhRelayError("SEGMENT_NOT_FOUND", "Relay resource was not found", 404)
        return resource

    def _purge(self, now: float) -> None:
        expired = [key for key, value in self._sessions.items() if value.expires_at <= now]
        for key in expired:
            self._sessions.pop(key, None)


ALLOWED_HOST_SUFFIXES = (".vkuser.net",)
MANIFEST_LIMIT = 2 * 1024 * 1024
RESOURCE_LIMIT = 32 * 1024 * 1024
REQUEST_TIMEOUT = (5, 20)
URI_ATTRIBUTE = re.compile(r'URI="([^"]+)"')


def _validate_upstream_url(url: str) -> None:
    parsed = urlsplit(url)
    host = (parsed.hostname or "").casefold()
    if parsed.scheme != "https" or not any(host.endswith(suffix) for suffix in ALLOWED_HOST_SUFFIXES):
        raise CvhRelayError("UNSUPPORTED_HOST", "CVH upstream host is not allowed", 400)


def _upstream_request(session: RelaySession, url: str, range_header: str | None = None, stream: bool = False):
    _validate_upstream_url(url)
    headers = dict(session.headers)
    if range_header:
        if not re.fullmatch(r"bytes=(?:\d+-\d*|-\d+)", range_header):
            raise CvhRelayError("UPSTREAM_REJECTED", "Invalid byte range", 416)
        headers["Range"] = range_header
    try:
        response = requests.get(
            url,
            headers=headers,
            timeout=REQUEST_TIMEOUT,
            stream=stream,
            allow_redirects=False,
        )
    except requests.Timeout as error:
        raise CvhRelayError("UPSTREAM_TIMEOUT", "CVH upstream timed out", 504) from error
    except requests.RequestException as error:
        raise CvhRelayError("UPSTREAM_UNAVAILABLE", "CVH upstream is unavailable", 502) from error
    if response.status_code not in {200, 206}:
        response.close()
        raise CvhRelayError("UPSTREAM_REJECTED", "CVH upstream rejected the request", 502)
    return response


def rewrite_manifest(store: CvhRelayStore, session: RelaySession, url: str) -> bytes:
    response = _upstream_request(session, url)
    try:
        content = response.content
        if len(content) > MANIFEST_LIMIT:
            raise CvhRelayError("UPSTREAM_REJECTED", "CVH manifest is too large", 502)
    finally:
        response.close()
    text = content.decode("utf-8-sig")
    if not text.lstrip().startswith("#EXTM3U"):
        raise CvhRelayError("UPSTREAM_REJECTED", "CVH returned an invalid manifest", 502)
    output: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("#EXT-X-KEY") and "METHOD=NONE" not in stripped:
            raise CvhRelayError("UNSUPPORTED_PROTECTED_STREAM", "Protected HLS is unsupported", 422)
        if stripped and not stripped.startswith("#"):
            resource_url = urljoin(url, stripped)
            resource_id = store.register(session, resource_url)
            output.append(f"/v1/relay/cvh/{session.id}/resources/{resource_id}")
            continue
        if "URI=\"" in line:
            def replace_uri(match: re.Match[str]) -> str:
                resource_url = urljoin(url, match.group(1))
                resource_id = store.register(session, resource_url)
                return f'URI="/v1/relay/cvh/{session.id}/resources/{resource_id}"'

            line = URI_ATTRIBUTE.sub(replace_uri, line)
        output.append(line)
    return ("\n".join(output) + "\n").encode("utf-8")


def open_resource(
    store: CvhRelayStore,
    session: RelaySession,
    resource_id: str,
    range_header: str | None,
):
    resource = store.resource(session, resource_id)
    response = _upstream_request(session, resource.url, range_header, stream=True)
    length = response.headers.get("content-length")
    if length:
        try:
            too_large = int(length) > RESOURCE_LIMIT
        except ValueError:
            response.close()
            raise CvhRelayError("UPSTREAM_REJECTED", "CVH returned an invalid content length", 502)
        if too_large:
            response.close()
            raise CvhRelayError("UPSTREAM_REJECTED", "CVH resource is too large", 502)
    return resource, response
