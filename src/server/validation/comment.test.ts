import assert from "node:assert/strict";
import test from "node:test";
import { createCommentSchema } from "./comment.ts";

test("comment validation trims plain text and preserves spoiler state", () => {
  const parsed = createCommentSchema.parse({
    animeId: "anime-1",
    body: "  Important comment  ",
    spoiler: true,
  });
  assert.equal(parsed.body, "Important comment");
  assert.equal(parsed.spoiler, true);
});

test("comment validation rejects empty and oversized bodies", () => {
  assert.equal(
    createCommentSchema.safeParse({ animeId: "a", body: "   " }).success,
    false,
  );
  assert.equal(
    createCommentSchema.safeParse({ animeId: "a", body: "x".repeat(2001) })
      .success,
    false,
  );
});
