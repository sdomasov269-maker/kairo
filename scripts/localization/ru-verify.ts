import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const { readdir } = await import("node:fs/promises");
async function tsxFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const output: string[] = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await tsxFiles(target)));
    else if (entry.name.endsWith(".tsx")) output.push(target);
  }
  return output;
}

const forbidden = new Set([
  "titleEnglish",
  "englishTitle",
  "titleRomaji",
  "romajiTitle",
]);
const violations: string[] = [];
for (const file of await tsxFiles("src")) {
  if (file.includes(`${path.sep}debug${path.sep}`)) continue;
  const text = await readFile(file, "utf8");
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const visit = (node: ts.Node) => {
    if (ts.isJsxExpression(node) && node.expression) {
      if (
        ts.isJsxAttribute(node.parent) &&
        node.parent.name.getText(source) === "titles"
      ) {
        ts.forEachChild(node, visit);
        return;
      }
      const expression = node.expression.getText(source);
      if (
        [...forbidden].some((name) =>
          new RegExp(`\\b${name}\\b`).test(expression),
        )
      ) {
        const line =
          source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        violations.push(
          `${file.replaceAll("\\", "/")}:${line} ${expression.slice(0, 120)}`,
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
if (violations.length) {
  console.error(
    "Direct English/Romaji title rendering is forbidden:\n" +
      violations.join("\n"),
  );
  process.exitCode = 1;
} else {
  console.log(
    "PASS: no direct English/Romaji title rendering in production TSX",
  );
}
