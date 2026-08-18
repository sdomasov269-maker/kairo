import assert from "node:assert/strict";
import test from "node:test";
import { formatReleaseSectionTitle } from "./labels.ts";

const labels = {
  today: "Сегодня выйдут",
  tomorrow: "Завтра выйдут",
  upcoming: "Выйдут",
  yesterday: "Вчера вышли",
  past: "Вышли",
};
const format = (selectedDate: string) =>
  formatReleaseSectionTitle({
    selectedDate,
    referenceDate: "2026-08-16",
    locale: "ru",
    labels,
  });
test("formats relative and absolute release-day labels", () => {
  assert.equal(format("2026-08-16"), "Сегодня выйдут");
  assert.equal(format("2026-08-17"), "Завтра выйдут");
  assert.equal(format("2026-08-18"), "Выйдут 18 августа");
  assert.equal(format("2026-08-15"), "Вчера вышли");
  assert.equal(format("2026-08-14"), "Вышли 14 августа");
});
