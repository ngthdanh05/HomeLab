// Chặn tái phạm design system (docs/UX-UI.md mục 4): chỉ token màu theo vai trò,
// chữ ≥ 12px, 3 mức bo góc, không emoji làm icon.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SRC = new URL("../src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function sourceFiles(dir = SRC, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(tsx?|css)$/.test(name)) out.push(path);
  }
  return out;
}

const files = sourceFiles().map((path) => ({ path: relative(SRC, path).split(sep).join("/"), text: readFileSync(path, "utf8") }));

/** Trả về các dòng vi phạm dạng "file:dòng  nội dung". */
function findViolations(pattern, { skip = () => false, skipComments = false } = {}) {
  const hits = [];
  for (const { path, text } of files) {
    if (skip(path)) continue;
    text.split(/\r?\n/).forEach((line, i) => {
      if (skipComments && /^\s*(?:\/\/|\/?\*)/.test(line)) return;
      pattern.lastIndex = 0;
      if (pattern.test(line)) hits.push(`${path}:${i + 1}  ${line.trim().slice(0, 120)}`);
    });
  }
  return hits;
}

const PALETTE =
  "slate|gray|zinc|neutral|stone|emerald|green|cyan|sky|blue|amber|yellow|red|rose|violet|purple|teal|indigo|orange|lime|pink|fuchsia";

describe("design system", () => {
  test("không dùng màu Tailwind thô (slate-*, emerald-*…), chỉ token theo vai trò", () => {
    const re = new RegExp(`(?<![\\w-])(?:[a-z-]+:)*(?:bg|text|border|ring|from|via|to|shadow|divide|fill|stroke|placeholder|outline)-(?:${PALETTE})-\\d{2,3}\\b`);
    assert.deepEqual(findViolations(re), []);
  });

  test("không có chữ nhỏ hơn 12px", () => {
    assert.deepEqual(findViolations(/text-\[(?:[0-9]|1[01])(?:\.\d+)?px\]/), []);
  });

  test("chỉ 3 mức bo góc: rounded-sm (8px) · rounded-md (12px) · rounded-lg (20px)", () => {
    // `rounded` trơn và -xl/-2xl/-3xl không còn trong theme, nên dùng là mất bo góc.
    const re = /(?<![\w-])(?:[a-z-]+:)*rounded(?:-(?:t|b|l|r|s|e|tl|tr|bl|br))?(?:-(?:xl|2xl|3xl))?(?=["'`\s}])/;
    assert.deepEqual(findViolations(re, { skip: (p) => p.endsWith(".css"), skipComments: true }), []);
  });

  test("không dùng bước khoảng cách lẻ 2px (0.5, 1.5, 2.5, 3.5)", () => {
    const re = /(?<![\w-])(?:[a-z-]+:)*-?(?:p[xytblrse]?|m[xytblrse]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|left|right|bottom|w|h|size|min-[wh]|max-[wh]|translate-[xy])-[0-3]\.5(?![\w.])/;
    assert.deepEqual(findViolations(re), []);
  });

  test("không dùng emoji / ký tự biểu tượng làm icon (dùng lucide-react)", () => {
    // Chỉ khoảnh khắc ăn mừng được giữ emoji (docs/UX-UI.md 4.4). © ® ™ là ký tự chữ, không tính.
    const re = /(?![©®™])[\p{Extended_Pictographic}✓✕✗✘＋↗↻●]/u;
    const allow = new Set(["components/quests/QuestCelebration.tsx"]);
    assert.deepEqual(findViolations(re, { skip: (p) => allow.has(p) }), []);
  });

  test("không còn token brand.* và nền tối ở <body>", () => {
    assert.deepEqual(findViolations(/\bbrand-(?:blue|cyan|violet)\b|bg-slate-950/), []);
  });
});
