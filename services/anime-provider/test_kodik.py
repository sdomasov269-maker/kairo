import unittest

from models import PlaybackTranslation, TitleInfo
from providers.kodik import KodikProvider, ProviderError, normalize_skip_segments


class KodikTranslationsTest(unittest.TestCase):
    def test_reuses_title_info_contract(self):
        provider = KodikProvider()
        expected = TitleInfo(
            titleId="56735",
            seriesCount=12,
            translations=[PlaybackTranslation(id="609", name="AniDUB", type="voice")],
        )
        provider.get_title_info = lambda _shikimori_id: expected

        self.assertEqual(provider.get_translations("56735"), expected)

    def test_empty_translation_list_is_normalized(self):
        provider = KodikProvider()
        provider.get_title_info = lambda shikimori_id: TitleInfo(
            titleId=shikimori_id,
            seriesCount=0,
            translations=[],
        )

        with self.assertRaisesRegex(ProviderError, "No translations") as raised:
            provider.get_translations("56735")
        self.assertEqual(raised.exception.code, "NO_TRANSLATIONS")


class KodikSkipSegmentsTest(unittest.TestCase):
    def test_normalizes_opening_ending_and_unknown_segments(self):
        segments = normalize_skip_segments([[0, 90], [400, 420], [1150, 1300]])
        self.assertEqual(
            [(item.kind, item.start, item.end) for item in segments],
            [("opening", 0.0, 90.0), ("unknown", 400.0, 420.0), ("ending", 1150.0, 1300.0)],
        )

    def test_single_segment_uses_timing_instead_of_array_position(self):
        self.assertEqual(normalize_skip_segments([[5, 95]])[0].kind, "opening")
        self.assertEqual(normalize_skip_segments([[1100, 1200]])[0].kind, "ending")

    def test_invalid_optional_segments_are_ignored(self):
        self.assertEqual(
            normalize_skip_segments([[-1, 20], [30, 20], [0, float("inf")], [0], "bad"]),
            [],
        )


if __name__ == "__main__":
    unittest.main()
