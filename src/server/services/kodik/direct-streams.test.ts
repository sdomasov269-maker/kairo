import assert from "node:assert/strict";
import test from "node:test";
import {
  clearKodikDirectStreamCaches,
  decodeKodikSource,
  parseKodikPlayerLink,
  resolveKodikDirectPlayback,
} from "./direct-streams.ts";

function encodeSource(source: string) {
  return Buffer.from(source, "utf8")
    .toString("base64")
    .replace(/[a-zA-Z]/g, (char) => {
      const base = char <= "Z" ? 65 : 97;
      return String.fromCharCode(
        ((char.charCodeAt(0) - base + 8) % 26) + base,
      );
    });
}

test("parseKodikPlayerLink accepts known Kodik hosts and rejects arbitrary hosts", () => {
  assert.deepEqual(
    parseKodikPlayerLink(
      "//aniqit.com/video/91873/060cab655974d46835b3f4405807acc2/720p",
    ),
    {
      url: "https://aniqit.com/video/91873/060cab655974d46835b3f4405807acc2/720p",
      origin: "https://aniqit.com",
      host: "aniqit.com",
      type: "video",
      id: "91873",
      hash: "060cab655974d46835b3f4405807acc2",
    },
  );
  assert.throws(
    () =>
      parseKodikPlayerLink(
        "https://example.com/video/91873/060cab655974d46835b3f4405807acc2/720p",
      ),
    { name: "KodikDirectStreamError" },
  );
});

test("decodeKodikSource reverses Kodik source obfuscation", () => {
  const source = "https://cdn.example.test/video.m3u8";
  assert.equal(decodeKodikSource(encodeSource(source)), source);
});

test("resolveKodikDirectPlayback discovers endpoint, decodes sources, chapters, and caches", async () => {
  clearKodikDirectStreamCaches();
  const playerLink =
    "https://kodikplayer.com/video/91873/060cab655974d46835b3f4405807acc2/720p";
  const page = `
    <script>
      var urlParams = '{}';
      var translationId = 869;
      var translationTitle = "Субтитры";
      parseSkipButtons("12-86", "intro");
    </script>
    <script src="/assets/js/app.player_single.abc123.js"></script>
  `;
  const calls: string[] = [];
  const fetcher = (async (input: string | URL | Request) => {
    const url = input.toString();
    calls.push(url);
    if (url === playerLink) return new Response(page);
    if (url.endsWith("app.player_single.abc123.js"))
      return new Response(`$.ajax({type:"POST",url:atob("L2Z0b3I=")})`);
    if (url.includes("/ftor?"))
      return Response.json({
        links: {
          "360": [
            {
              src: encodeSource("https://cdn.example.test/360.m3u8"),
              type: "application/x-mpegURL",
            },
          ],
          "720": [
            {
              src: encodeSource("https://cdn.example.test/720.m3u8"),
              type: "application/x-mpegURL",
            },
          ],
        },
      });
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  const first = await resolveKodikDirectPlayback(playerLink, {
    fetcher,
    now: () => 1_000,
  });
  assert.deepEqual(
    first.sources.map((source) => [source.quality, source.url]),
    [
      [360, "https://cdn.example.test/360.m3u8"],
      [720, "https://cdn.example.test/720.m3u8"],
    ],
  );
  assert.deepEqual(first.translation, { id: 869, title: "Субтитры" });
  assert.deepEqual(first.chapters, [
    {
      id: "kodik-intro-0",
      title: "Заставка",
      startTime: 12,
      endTime: 86,
      type: "intro",
    },
  ]);
  assert.equal(calls.length, 3);

  const cached = await resolveKodikDirectPlayback(playerLink, {
    fetcher,
    now: () => 2_000,
  });
  assert.equal(cached, first);
  assert.equal(calls.length, 3);

  await resolveKodikDirectPlayback(playerLink, {
    fetcher,
    forceRefresh: true,
    now: () => 3_000,
  });
  assert.equal(calls.length, 5);
});
