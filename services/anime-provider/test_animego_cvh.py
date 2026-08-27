import unittest

from providers.animego_cvh import AnimegoCvhProvider, AnimegoProviderError


class FakeAnimegoParser:
    _CVH_HEADERS = {
        "Referer": "https://animego.org/",
        "Accept": "application/json",
        "User-Agent": "test-agent",
    }

    def search(self, query):
        return [
            {
                "id": "wrong",
                "title": "Совсем другой сериал",
                "original_title": "Different Show",
                "year": 2026,
                "type": "Сериал",
                "link": "https://animego.example/anime/wrong",
                "image": None,
            },
            {
                "id": "3591",
                "title": "Точный тайтл",
                "original_title": "Exact Title",
                "year": 2026,
                "type": "Сериал",
                "link": "https://animego.example/anime/exact-3591",
                "image": "https://animego.example/poster.jpg",
            },
        ]

    def get_voices(self, anime_id, episode):
        return {
            "total_episodes": 12,
            "voices": [
                {"label": "Ignored", "translation_id": "1", "player": "Kodik", "embed": "https://example.test", "cvh_id": None},
                {"label": "Dream Cast", "translation_id": "81", "player": "CVH", "embed": "https://animego.example/cdn-iframe/56735/Dream", "cvh_id": "56735"},
            ],
        }

    def cvh_get_playlist(self, cvh_id):
        return {1: {1: [{"voiceStudio": "Dream Cast", "vkId": "vk-1"}]}}

    def cvh_get_stream_by_id(self, vk_id):
        return {
            "HLS": "https://media.vkuser.net/master.m3u8",
            "DASH": "https://media.vkuser.net/manifest.mpd",
            "MP4s": ["https://media.vkuser.net/video-720p.mp4"],
        }


class AnimegoCvhProviderTest(unittest.TestCase):
    def setUp(self):
        self.provider = AnimegoCvhProvider(FakeAnimegoParser(), timeout=1, ttl=60)

    def test_title_resolution_scores_exact_candidate(self):
        result = self.provider.resolve_title(["Exact Title", "Точный тайтл"], 2026, "tv")
        self.assertEqual(result.id, "3591")
        self.assertGreater(result.score, 0.9)

    def test_voices_keep_only_cvh_and_enrich_vk_id(self):
        result = self.provider.get_voices("3591", 1)
        self.assertEqual(len(result.voices), 1)
        self.assertEqual(result.voices[0].player, "cvh")
        self.assertEqual(result.voices[0].vkId, "vk-1")
        self.assertTrue(result.voices[0].episodeAvailable)
        self.assertEqual(result.voices[0].episodeCoverage, 1)

    def test_playback_uses_shared_descriptor(self):
        result = self.provider.resolve_playback("3591", 1, "81")
        self.assertEqual(result.provider, "animego-cvh")
        self.assertEqual([source.protocol for source in result.sources], ["hls", "mp4"])
        self.assertTrue(result.sources[0].url.startswith("/v1/relay/cvh/"))
        self.assertNotIn("vkuser.net", result.model_dump_json())

    def test_no_cvh_voice_is_normalized(self):
        parser = FakeAnimegoParser()
        parser.get_voices = lambda anime_id, episode: {"voices": [], "total_episodes": 0}
        provider = AnimegoCvhProvider(parser, timeout=1)
        with self.assertRaises(AnimegoProviderError) as raised:
            provider.get_voices("none", 1)
        self.assertEqual(raised.exception.code, "NO_CVH_VOICE")


if __name__ == "__main__":
    unittest.main()
