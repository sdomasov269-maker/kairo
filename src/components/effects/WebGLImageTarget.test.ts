import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("WebGL tile ready state removes the fallback surface above Canvas", () => {
  const css = readFileSync(
    new URL("./WebGLImageTarget.module.css", import.meta.url),
    "utf8",
  );
  assert.match(
    css,
    /data-webgl-ready="true"[^}]+category-tile\)[^{]*\{[^}]*background:\s*transparent[\s\S]*?\}/,
  );
  assert.match(css, /background:\s*transparent\s*!important/);
  assert.match(css, /mix-blend-mode:\s*normal\s*!important/);
  assert.match(css, /box-shadow:\s*none\s*!important/);
  assert.match(
    css,
    /category-tile\)::before,[\s\S]*?category-tile\)::after[\s\S]*?display:\s*none\s*!important/,
  );
});
