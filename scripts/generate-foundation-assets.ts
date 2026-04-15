import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { foundationTrack, type FoundationCourse } from "../shared/foundationCurriculum";

const root = process.cwd();
const outputRoot = path.join(root, "client", "public", "foundation");

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function palette(courseId: FoundationCourse["id"]) {
  return courseId === "ai-clarity"
    ? {
        bgA: "#0b1320",
        bgB: "#10243d",
        accent: "#f2b94b",
        accentSoft: "#7ad1ff",
        ink: "#f5f1e8",
      }
    : {
        bgA: "#171320",
        bgB: "#24303d",
        accent: "#9be07c",
        accentSoft: "#f5c26b",
        ink: "#f4efe5",
      };
}

function textBlock(lines: string[], x: number, y: number, size: number, color: string): string {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * (size + 6)}" fill="${color}" font-size="${size}" font-family="Georgia, 'Times New Roman', serif">${escapeHtml(line)}</text>`
    )
    .join("");
}

function wrapTitle(title: string, width = 26): string[] {
  const words = title.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function courseSvg(course: FoundationCourse): string {
  const colors = palette(course.id);
  const motifs = course.visualMotif.slice(0, 4);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.bgA}" />
      <stop offset="100%" stop-color="${colors.bgB}" />
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)" rx="40" />
  <circle cx="1280" cy="180" r="220" fill="${colors.accent}" fill-opacity="0.12" />
  <circle cx="1420" cy="720" r="180" fill="${colors.accentSoft}" fill-opacity="0.14" />
  <rect x="82" y="82" width="1436" height="736" rx="32" fill="#ffffff" fill-opacity="0.035" stroke="#ffffff" stroke-opacity="0.1" />
  <text x="110" y="170" fill="${colors.accent}" font-size="30" font-family="'Trebuchet MS', Arial, sans-serif" letter-spacing="4">${escapeHtml(course.badge.toUpperCase())}</text>
  ${textBlock(wrapTitle(course.title, 24), 110, 255, 54, colors.ink)}
  <text x="110" y="430" fill="${colors.ink}" fill-opacity="0.82" font-size="30" font-family="'Trebuchet MS', Arial, sans-serif">${escapeHtml(course.subtitle)}</text>
  <text x="110" y="505" fill="${colors.ink}" fill-opacity="0.72" font-size="25" font-family="'Trebuchet MS', Arial, sans-serif">${escapeHtml(course.description)}</text>
  ${motifs
    .map(
      (motif, index) =>
        `<g transform="translate(${110 + index * 250},620)"><rect width="210" height="92" rx="18" fill="#ffffff" fill-opacity="0.06" stroke="${colors.accent}" stroke-opacity="0.35" /><text x="18" y="53" fill="${colors.ink}" font-size="28" font-family="'Trebuchet MS', Arial, sans-serif">${escapeHtml(motif)}</text></g>`
    )
    .join("")}
  <text x="110" y="785" fill="${colors.ink}" fill-opacity="0.72" font-size="24" font-family="'Trebuchet MS', Arial, sans-serif">${escapeHtml(course.differentiationEdge[0] ?? "")}</text>
</svg>`;
}

function moduleSvg(course: FoundationCourse, module: FoundationCourse["modules"][number]): string {
  const colors = palette(course.id);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
  <rect width="1200" height="720" fill="${colors.bgA}" rx="32" />
  <rect x="30" y="30" width="1140" height="660" rx="28" fill="${colors.bgB}" />
  <text x="72" y="120" fill="${colors.accent}" font-size="24" font-family="'Trebuchet MS', Arial, sans-serif" letter-spacing="3">${escapeHtml(course.badge.toUpperCase())}</text>
  ${textBlock(wrapTitle(module.title, 28), 72, 210, 42, colors.ink)}
  <text x="72" y="340" fill="${colors.ink}" fill-opacity="0.82" font-size="24" font-family="'Trebuchet MS', Arial, sans-serif">${escapeHtml(module.purpose)}</text>
  ${module.outcomes
    .slice(0, 3)
    .map(
      (outcome, index) =>
        `<g transform="translate(72,${420 + index * 78})"><circle cx="12" cy="12" r="12" fill="${colors.accent}" fill-opacity="0.9" /><text x="38" y="20" fill="${colors.ink}" font-size="22" font-family="'Trebuchet MS', Arial, sans-serif">${escapeHtml(outcome)}</text></g>`
    )
    .join("")}
  <rect x="760" y="120" width="330" height="440" rx="24" fill="#ffffff" fill-opacity="0.08" stroke="${colors.accentSoft}" stroke-opacity="0.4" />
  <text x="792" y="180" fill="${colors.accentSoft}" font-size="22" font-family="'Trebuchet MS', Arial, sans-serif">Signature</text>
  ${module.signatureInteractions
    .map(
      (item, index) =>
        `<text x="792" y="${240 + index * 50}" fill="${colors.ink}" font-size="24" font-family="Georgia, 'Times New Roman', serif">${escapeHtml(item)}</text>`
    )
    .join("")}
  <text x="792" y="430" fill="${colors.accent}" font-size="22" font-family="'Trebuchet MS', Arial, sans-serif">Capstone</text>
  <text x="792" y="480" fill="${colors.ink}" font-size="21" font-family="'Trebuchet MS', Arial, sans-serif">${escapeHtml(module.capstone)}</text>
</svg>`;
}

function lessonSvg(course: FoundationCourse, lesson: FoundationCourse["modules"][number]["lessons"][number]): string {
  const colors = palette(course.id);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
  <rect width="1200" height="720" fill="${colors.bgA}" rx="28" />
  <rect x="28" y="28" width="1144" height="664" rx="24" fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.1" />
  <text x="60" y="92" fill="${colors.accent}" font-size="20" font-family="'Trebuchet MS', Arial, sans-serif" letter-spacing="3">${escapeHtml(course.badge.toUpperCase())}</text>
  ${textBlock(wrapTitle(lesson.title, 28), 60, 160, 40, colors.ink)}
  <text x="60" y="286" fill="${colors.ink}" fill-opacity="0.84" font-size="24" font-family="'Trebuchet MS', Arial, sans-serif">${escapeHtml(lesson.scenario)}</text>
  <rect x="60" y="340" width="500" height="270" rx="18" fill="#ffffff" fill-opacity="0.05" stroke="${colors.accent}" stroke-opacity="0.28" />
  <text x="84" y="385" fill="${colors.accent}" font-size="20" font-family="'Trebuchet MS', Arial, sans-serif">Visual Model</text>
  ${lesson.diagram.bullets
    .map(
      (bullet, index) =>
        `<text x="84" y="${438 + index * 56}" fill="${colors.ink}" font-size="22" font-family="'Trebuchet MS', Arial, sans-serif">${escapeHtml(bullet)}</text>`
    )
    .join("")}
  <rect x="620" y="120" width="520" height="490" rx="24" fill="${colors.accentSoft}" fill-opacity="0.08" stroke="${colors.accentSoft}" stroke-opacity="0.28" />
  <text x="652" y="172" fill="${colors.accentSoft}" font-size="20" font-family="'Trebuchet MS', Arial, sans-serif">Practice Edge</text>
  <text x="652" y="235" fill="${colors.ink}" font-size="24" font-family="'Trebuchet MS', Arial, sans-serif">${escapeHtml(lesson.whyThisWins)}</text>
  <text x="652" y="338" fill="${colors.accent}" font-size="20" font-family="'Trebuchet MS', Arial, sans-serif">Most Common Trap</text>
  <text x="652" y="395" fill="${colors.ink}" font-size="24" font-family="'Trebuchet MS', Arial, sans-serif">${escapeHtml(lesson.misconceptions[0] ?? "")}</text>
  <text x="652" y="500" fill="${colors.accent}" font-size="20" font-family="'Trebuchet MS', Arial, sans-serif">Transfer Challenge</text>
  <text x="652" y="560" fill="${colors.ink}" font-size="24" font-family="'Trebuchet MS', Arial, sans-serif">${escapeHtml(lesson.beats.apply.replace(/^Apply: /, ""))}</text>
</svg>`;
}

async function writeSvg(kind: "courses" | "modules" | "lessons", id: string, svg: string) {
  const dir = path.join(outputRoot, kind);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${id}.svg`), svg, "utf8");
}

async function main() {
  for (const course of foundationTrack.courses) {
    await writeSvg("courses", course.id, courseSvg(course));
    for (const module of course.modules) {
      await writeSvg("modules", module.id, moduleSvg(course, module));
      for (const lesson of module.lessons) {
        await writeSvg("lessons", lesson.id, lessonSvg(course, lesson));
      }
    }
  }
  console.log(`Generated foundation assets in ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
