import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_KODIK_CONTROL_MODE, formatKodikTime, KODIK_CONTROL_MODES, kodikShortcut, rendersKairoControlBar, shouldHideKodikControls } from "./kodik-shell.utils.ts";
test("native-only is the production default and renders no Kairo UI", () => { assert.equal(DEFAULT_KODIK_CONTROL_MODE, KODIK_CONTROL_MODES.NATIVE_ONLY); assert.equal(rendersKairoControlBar(DEFAULT_KODIK_CONTROL_MODE), false); });
test("full Kairo mode retains the custom control implementation", () => { assert.equal(rendersKairoControlBar(KODIK_CONTROL_MODES.FULL_KAIRO_CONTROLS), true); });
test("formats player time without Date semantics", () => { assert.equal(formatKodikTime(42), "0:42"); assert.equal(formatKodikTime(3734), "1:02:14"); });
test("maps only supported keyboard shortcuts", () => { assert.equal(kodikShortcut("k"), "TOGGLE_PLAY"); assert.equal(kodikShortcut("ArrowLeft"), "BACK"); assert.equal(kodikShortcut("x"), null); });
test("controls hide only during unobstructed playback", () => { assert.equal(shouldHideKodikControls(true, false, false), true); assert.equal(shouldHideKodikControls(false, false, false), false); assert.equal(shouldHideKodikControls(true, true, false), false); });
