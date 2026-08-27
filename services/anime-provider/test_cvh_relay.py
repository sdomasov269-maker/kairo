import time
import unittest
from unittest.mock import patch

from providers.cvh_relay import (
    CvhRelayError,
    CvhRelayStore,
    rewrite_manifest,
)


class FakeResponse:
    def __init__(self, content: bytes):
        self.content = content

    def close(self):
        pass


class CvhRelayTest(unittest.TestCase):
    def test_manifest_uses_only_opaque_relay_resources(self):
        store = CvhRelayStore()
        session = store.create(
            "https://media.vkuser.net/master.m3u8?sig=secret",
            {"User-Agent": "provider", "Referer": "https://animego.org/"},
        )
        manifest = b"#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nvariant.m3u8?sig=hidden\n"
        with patch("providers.cvh_relay._upstream_request", return_value=FakeResponse(manifest)):
            result = rewrite_manifest(store, session, session.manifest_url).decode()
        self.assertIn(f"/v1/relay/cvh/{session.id}/resources/", result)
        self.assertNotIn("vkuser.net", result)
        self.assertNotIn("hidden", result)

    def test_arbitrary_hosts_are_rejected(self):
        store = CvhRelayStore()
        with self.assertRaises(CvhRelayError) as raised:
            store.create("https://example.com/master.m3u8", {})
        self.assertEqual(raised.exception.code, "UNSUPPORTED_HOST")

    def test_unknown_resource_is_not_an_open_proxy(self):
        store = CvhRelayStore()
        session = store.create("https://media.vkuser.net/master.m3u8", {})
        with self.assertRaises(CvhRelayError) as raised:
            store.resource(session, "A" * 18)
        self.assertEqual(raised.exception.code, "SEGMENT_NOT_FOUND")

    def test_expired_session_is_rejected(self):
        store = CvhRelayStore(ttl_seconds=0)
        session = store.create("https://media.vkuser.net/master.m3u8", {})
        time.sleep(0.001)
        with self.assertRaises(CvhRelayError) as raised:
            store.get(session.id)
        self.assertEqual(raised.exception.code, "SESSION_EXPIRED")

    def test_encrypted_manifest_is_not_relayed(self):
        store = CvhRelayStore()
        session = store.create("https://media.vkuser.net/master.m3u8", {})
        manifest = b'#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin"\nsegment.ts\n'
        with patch("providers.cvh_relay._upstream_request", return_value=FakeResponse(manifest)):
            with self.assertRaises(CvhRelayError) as raised:
                rewrite_manifest(store, session, session.manifest_url)
        self.assertEqual(raised.exception.code, "UNSUPPORTED_PROTECTED_STREAM")


if __name__ == "__main__":
    unittest.main()
