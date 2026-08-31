#!/usr/bin/env node

import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderSessionList, validateSessionList } from "./model.mjs";

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
    throw new Error("Usage: render.mjs --data session-list.json --out output-directory");
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
  if (!match) throw new Error(`${label} is required; install it or provide its font option`);
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
    (await fontFace("Google Sans Session List", fonts.googleRegular, 400)) +
    (await fontFace("Google Sans Session List", fonts.googleBold, 700)) +
    (await fontFace("LINE Seed JP Session List", fonts.lineRegular, 400)) +
    (await fontFace("LINE Seed JP Session List", fonts.lineBold, 800))
  );
}

async function fetchImageData(url) {
  const maxBytes = 5 * 1024 * 1024;
  const response = await fetch(url, {
    headers: { accept: "image/avif,image/webp,image/*" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Could not load ${url}: HTTP ${response.status}`);
  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (!contentType.startsWith("image/")) throw new Error(`${url} did not return an image`);
  const declaredBytes = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
    throw new Error(`${url} is larger than 5 MB`);
  }
  if (!response.body) throw new Error(`${url} returned an empty response body`);
  const chunks = [];
  let receivedBytes = 0;
  for await (const chunk of response.body) {
    receivedBytes += chunk.byteLength;
    if (receivedBytes > maxBytes) throw new Error(`${url} is larger than 5 MB`);
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks, receivedBytes);
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

async function inlinePortraits(data) {
  const copy = structuredClone(data);
  const referencedSpeakerIds = new Set(
    copy.sections.flatMap((section) => section.sessions.flatMap((session) => session.speakers)),
  );
  await Promise.all(
    [...referencedSpeakerIds].map(async (speakerId) => {
      const speaker = copy.speakers[speakerId];
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
  throw new Error("Playwright is required in the working directory to render session-list images");
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
    if (images.some((image) => image.naturalWidth === 0)) {
      throw new Error("One or more portrait images failed to render");
    }
  });
}

async function assertLayout(page) {
  const result = await page.evaluate(() => {
    const canvas = document.querySelector("#canvas");
    const style = getComputedStyle(canvas);
    const overflow = [...document.querySelectorAll("[data-section-id], [data-session-id]")]
      .filter(
        (element) =>
          element.scrollWidth > element.clientWidth + 1 ||
          element.scrollHeight > element.clientHeight + 1,
      )
      .map((element) => element.getAttribute("data-session-id"));
    const canvasRect = canvas.getBoundingClientRect();
    const clippedPortraits = [...document.querySelectorAll(".avatar")]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.left < canvasRect.left - 0.5 ||
          rect.right > canvasRect.right + 0.5 ||
          rect.top < canvasRect.top - 0.5 ||
          rect.bottom > canvasRect.bottom + 0.5
        );
      })
      .map((element) => element.alt);
    return {
      background: style.backgroundColor,
      border: style.borderWidth,
      padding: style.padding,
      overflow,
      clippedPortraits,
    };
  });
  if (
    result.background !== "rgb(240, 240, 240)" ||
    result.border !== "0px" ||
    result.padding !== "0px"
  ) {
    throw new Error("Canvas must use opaque GDG Off White without an outer border or padding");
  }
  if (result.overflow.length > 0)
    throw new Error(`Content overflow: ${result.overflow.join(", ")}`);
  if (result.clippedPortraits.length > 0) {
    throw new Error(`Portraits outside canvas: ${result.clippedPortraits.join(", ")}`);
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
    await assertLayout(page);
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
  const rawData = JSON.parse(await readFile(dataPath, "utf8"));
  validateSessionList(rawData);
  const [data, css, fontCss] = await Promise.all([
    inlinePortraits(rawData),
    readFile(resolve(skillDirectory, "assets/session-list.css"), "utf8"),
    buildFontCss(resolveFonts(options)),
  ]);
  const desktopHtml = standaloneHtml(css, fontCss, renderSessionList(data, "desktop"));
  const mobileHtml = standaloneHtml(css, fontCss, renderSessionList(data, "mobile"));
  await mkdir(outputDirectory, { recursive: true });
  const desktopHtmlPath = resolve(outputDirectory, "session-list-desktop.html");
  const mobileHtmlPath = resolve(outputDirectory, "session-list-mobile.html");
  const desktopPngPath = resolve(outputDirectory, "session-list-desktop.png");
  const mobilePngPath = resolve(outputDirectory, "session-list-mobile.png");
  await Promise.all([
    writeFile(desktopHtmlPath, desktopHtml),
    writeFile(mobileHtmlPath, mobileHtml),
  ]);
  const browser = await loadChromium().launch();
  try {
    const [desktop, mobile] = await Promise.all([
      renderVariant(browser, desktopHtmlPath, desktopPngPath, 1000),
      renderVariant(browser, mobileHtmlPath, mobilePngPath, 390),
    ]);
    process.stdout.write(`${JSON.stringify({ desktop, mobile }, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
