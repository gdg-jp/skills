#!/usr/bin/env node

import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderDesktop, renderMobile, validateSchedule } from "./model.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const skillDirectory = resolve(scriptDirectory, "..");
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const key = argument.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    options[key] = value;
    index += 1;
  }
  if (!options.data || !options.out) {
    throw new Error(
      "Usage: render.mjs --data timetable.json --out output-directory [font options]",
    );
  }
  return options;
}

function findFont(explicitPath, candidates, label) {
  if (explicitPath) {
    const path = resolve(explicitPath);
    if (!existsSync(path)) throw new Error(`${label} not found: ${path}`);
    return path;
  }
  const match = candidates.find(existsSync);
  if (!match) {
    throw new Error(
      `${label} is required. Install it or provide its path with the corresponding font option.`,
    );
  }
  return match;
}

function resolveFonts(options) {
  const userFonts = resolve(process.env.USERPROFILE ?? process.env.HOME ?? "", "Library/Fonts");
  return {
    googleRegular: findFont(
      options["google-sans"],
      [resolve(userFonts, "GoogleSans-Regular-v1.27.ttf")],
      "Google Sans Regular",
    ),
    googleBold: findFont(
      options["google-sans-bold"],
      [resolve(userFonts, "GoogleSans-Bold-v1.27.ttf")],
      "Google Sans Bold",
    ),
    lineRegular: findFont(
      options["line-seed"],
      [resolve(userFonts, "LINESeedJP-Regular.ttf")],
      "LINE Seed JP Regular",
    ),
    lineBold: findFont(
      options["line-seed-bold"],
      [resolve(userFonts, "LINESeedJP-ExtraBold.ttf"), resolve(userFonts, "LINESeedJP-Bold.ttf")],
      "LINE Seed JP Bold",
    ),
  };
}

async function fontFace(name, path, weight) {
  const bytes = await readFile(path);
  return `@font-face{font-family:"${name}";src:url(data:font/ttf;base64,${bytes.toString(
    "base64",
  )}) format("truetype");font-style:normal;font-weight:${weight};font-display:block;}`;
}

async function buildFontCss(fonts) {
  return (
    (await fontFace("Google Sans Timetable", fonts.googleRegular, 400)) +
    (await fontFace("Google Sans Timetable", fonts.googleBold, 700)) +
    (await fontFace("LINE Seed JP Timetable", fonts.lineRegular, 400)) +
    (await fontFace("LINE Seed JP Timetable", fonts.lineBold, 800))
  );
}

async function fetchImageData(url) {
  const response = await fetch(url, { headers: { accept: "image/avif,image/webp,image/*" } });
  if (!response.ok) throw new Error(`Could not load ${url}: HTTP ${response.status}`);
  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (!contentType.startsWith("image/")) throw new Error(`${url} did not return an image`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error(`${url} is larger than 5 MB`);
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

async function inlinePortraits(schedule) {
  const copy = structuredClone(schedule);
  await Promise.all(
    Object.values(copy.speakers).map(async (speaker) => {
      if (speaker.image) speaker.imageData = await fetchImageData(speaker.image);
    }),
  );
  return copy;
}

function standaloneHtml(css, fontCss, body) {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${fontCss}\n${css}</style>
</head>
<body>${body}</body>
</html>`;
}

function loadChromium() {
  const requireFromWorkingDirectory = createRequire(resolve(process.cwd(), "package.json"));
  for (const packageName of ["@playwright/test", "playwright"]) {
    try {
      return requireFromWorkingDirectory(packageName).chromium;
    } catch (error) {
      if (error?.code !== "MODULE_NOT_FOUND") throw error;
    }
  }
  throw new Error("Playwright is required in the working directory to render timetable images.");
}

async function assertReady(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.images];
    await Promise.all(
      images.map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((resolveImage, rejectImage) => {
              image.addEventListener("load", resolveImage, { once: true });
              image.addEventListener("error", rejectImage, { once: true });
            }),
      ),
    );
    const broken = images.filter((image) => image.naturalWidth === 0);
    if (broken.length > 0) throw new Error(`${broken.length} portrait image(s) failed to render`);
  });
}

async function assertNoOverflow(page) {
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll("[data-entry-id]")]
      .filter(
        (element) =>
          element.scrollWidth > element.clientWidth + 1 ||
          element.scrollHeight > element.clientHeight + 1,
      )
      .map((element) => element.getAttribute("data-entry-id")),
  );
  if (overflow.length > 0) throw new Error(`Content overflow: ${overflow.join(", ")}`);
}

async function assertFlushWhiteCanvas(page) {
  const surface = await page.locator("#canvas").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderWidths: [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth,
      ],
      paddings: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft],
    };
  });
  if (surface.backgroundColor !== "rgb(255, 255, 255)") {
    throw new Error(`Canvas background must be white, got ${surface.backgroundColor}`);
  }
  if ([...surface.borderWidths, ...surface.paddings].some((value) => value !== "0px")) {
    throw new Error("Canvas must not have an outer border or padding");
  }
}

async function assertCompactRightAlignedTimeLabels(page) {
  const rails = await page.evaluate(() => {
    return [...document.querySelectorAll(".time-block, .mobile-time")].map((element) => {
      const labels = [...element.children].map((child) => child.getBoundingClientRect().right);
      return {
        width: element.getBoundingClientRect().width,
        rightEdges: labels,
      };
    });
  });
  const invalid = rails.filter(
    (rail) =>
      rail.width > 48.5 ||
      rail.rightEdges.some((rightEdge) => Math.abs(rightEdge - rail.rightEdges[0]) > 0.5),
  );
  if (rails.length === 0 || invalid.length > 0) {
    throw new Error("Time labels must use a compact, right-aligned rail");
  }
}

async function renderVariant(browser, htmlPath, pngPath, width) {
  const context = await browser.newContext({
    viewport: { width, height: 1200 },
    deviceScaleFactor: 2,
  });
  try {
    const page = await context.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
    await assertReady(page);
    await assertNoOverflow(page);
    await assertFlushWhiteCanvas(page);
    await assertCompactRightAlignedTimeLabels(page);
    const canvas = page.locator("#canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error(`Canvas not found in ${basename(htmlPath)}`);
    await canvas.screenshot({ path: pngPath, type: "png" });
    const output = await stat(pngPath);
    if (output.size > MAX_OUTPUT_BYTES) {
      throw new Error(`${basename(pngPath)} exceeds the 10 MB img.gdgs.jp limit`);
    }
    return {
      width: Math.ceil(box.width * 2),
      height: Math.ceil(box.height * 2),
      bytes: output.size,
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const dataPath = resolve(options.data);
  const outputDirectory = resolve(options.out);
  const rawSchedule = JSON.parse(await readFile(dataPath, "utf8"));
  validateSchedule(rawSchedule);

  const fonts = resolveFonts(options);
  const schedule = await inlinePortraits(rawSchedule);
  const [css, fontCss] = await Promise.all([
    readFile(resolve(skillDirectory, "assets/timetable.css"), "utf8"),
    buildFontCss(fonts),
  ]);
  const desktopHtml = standaloneHtml(css, fontCss, renderDesktop(schedule));
  const mobileHtml = standaloneHtml(css, fontCss, renderMobile(schedule));

  await mkdir(outputDirectory, { recursive: true });
  const desktopHtmlPath = resolve(outputDirectory, "timetable-desktop.html");
  const mobileHtmlPath = resolve(outputDirectory, "timetable-mobile.html");
  const desktopPngPath = resolve(outputDirectory, "timetable-desktop.png");
  const mobilePngPath = resolve(outputDirectory, "timetable-mobile.png");
  await Promise.all([
    writeFile(desktopHtmlPath, desktopHtml),
    writeFile(mobileHtmlPath, mobileHtml),
  ]);

  const chromium = loadChromium();
  const browser = await chromium.launch();
  try {
    const [desktop, mobile] = await Promise.all([
      renderVariant(browser, desktopHtmlPath, desktopPngPath, 1000),
      renderVariant(browser, mobileHtmlPath, mobilePngPath, 390),
    ]);
    process.stdout.write(
      `${JSON.stringify(
        {
          desktop: { html: desktopHtmlPath, png: desktopPngPath, ...desktop },
          mobile: { html: mobileHtmlPath, png: mobilePngPath, ...mobile },
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
