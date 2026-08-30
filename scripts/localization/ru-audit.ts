import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const roots = [
  "src/app",
  "src/components",
  "src/lib",
  "src/server",
  "src/styles",
  "src/data",
  "prisma",
  "scripts",
];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const excluded = new Set(["node_modules", ".next", "artifacts"]);
const technical =
  /^(use client|use server|GET|POST|PUT|PATCH|DELETE|application\/json|[A-Z0-9_./:-]+)$/;
const hasLatinWords = /[A-Za-z]{3,}/;

async function filesUnder(directory: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    () => [],
  );
  const files: string[] = [];
  for (const entry of entries) {
    if (excluded.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(target)));
    else if (extensions.has(path.extname(entry.name))) files.push(target);
  }
  return files;
}

const rows: string[][] = [];
for (const root of roots) {
  for (const file of await filesUnder(root)) {
    const sourceText = await readFile(file, "utf8");
    const source = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node: ts.Node) => {
      let value: string | undefined;
      let category = "string literal";
      let visible = false;
      if (ts.isJsxText(node)) {
        value = node.getText(source).trim();
        category = "JSX text";
        visible = true;
      } else if (ts.isStringLiteralLike(node)) {
        value = node.text.trim();
        const parent = node.parent;
        if (ts.isJsxAttribute(parent)) {
          category = `attribute:${parent.name.getText(source)}`;
          visible = ["aria-label", "title", "alt", "placeholder"].includes(
            parent.name.getText(source),
          );
        } else if (ts.isPropertyAssignment(parent)) {
          const name = parent.name.getText(source).replace(/["']/g, "");
          category = `property:${name}`;
          visible =
            /title|description|label|message|placeholder|error|empty|loading|tooltip/i.test(
              name,
            );
        }
      }
      if (
        value &&
        hasLatinWords.test(value) &&
        !technical.test(value) &&
        !/^https?:|^\/?[\w./[\]-]+$/.test(value)
      ) {
        const location = source.getLineAndCharacterOfPosition(
          node.getStart(source),
        );
        rows.push([
          path.relative(process.cwd(), file).replaceAll("\\", "/"),
          `${location.line + 1}:${location.character + 1}`,
          value.replaceAll("|", "\\|").replaceAll("\n", " ").slice(0, 180),
          category,
          visible ? "YES" : "REVIEW",
          visible ? "LOCALIZE_OR_JUSTIFY" : "VERIFY_CONTEXT",
        ]);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}
rows.sort(
  (a, b) =>
    a[0].localeCompare(b[0]) ||
    a[1].localeCompare(b[1], undefined, { numeric: true }),
);
await mkdir("artifacts/localization", { recursive: true });
const header =
  "| FILE | LOCATION | CURRENT STRING | CATEGORY | USER VISIBLE | ACTION |\n|---|---:|---|---|---|---|";
await writeFile(
  "artifacts/localization/russian-ui-audit.md",
  `${header}\n${rows.map((row) => `| ${row.join(" | ")} |`).join("\n")}\n`,
);
console.log(`Russian UI audit: ${rows.length} candidates`);
console.log("artifacts/localization/russian-ui-audit.md");
