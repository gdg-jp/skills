// Runs inside the rendered image page (Browser Rendering in the Worker, Playwright locally) and
// writes the render rules' results to <pre id="__checks">. One file, inlined by image-html.mjs,
// so both renderers measure the same way. Reads its limits from <script id="__config">.
(async () => {
  const out = [];
  const add = (ruleId, problems, unevaluated) =>
    out.push(
      unevaluated
        ? { ruleId, status: "unevaluated", detail: unevaluated }
        : { ruleId, status: problems.length ? "fail" : "pass", detail: problems.join(" / ") },
    );
  try {
    const cfg = JSON.parse(document.getElementById("__config").textContent);
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((img) =>
        img.complete
          ? null
          : new Promise((r) => {
              img.onload = img.onerror = r;
            }),
      ),
    );
    const canvas = document.querySelector(".canvas");
    const box = canvas.getBoundingClientRect();
    const slots = [...canvas.querySelectorAll("[data-slot]")];
    const required = slots.filter((s) => s.dataset.required === "true");
    const name = (el) => el.dataset.slot || el.className;

    add(
      "RENDER-CANVAS-SIZE",
      cfg.width && cfg.height
        ? Math.abs(box.width - cfg.width) > 1 || Math.abs(box.height - cfg.height) > 1
          ? [
              `canvas が ${Math.round(box.width)}×${Math.round(box.height)}（${cfg.width}×${cfg.height} が要る）`,
            ]
          : []
        : [],
    );

    add(
      "RENDER-NO-OVERFLOW",
      slots.flatMap((s) => {
        const r = s.getBoundingClientRect();
        const p = [];
        // Vertical: the laid-out height without max-height or flex shrinking, not scrollHeight,
        // which also counts glyphs taller than the line-height (CJK fonts on Linux) that are drawn
        // in full anyway.
        const saved = [s.style.maxHeight, s.style.flexShrink];
        s.style.maxHeight = "none";
        s.style.flexShrink = "0";
        const natural = s.getBoundingClientRect().height;
        [s.style.maxHeight, s.style.flexShrink] = saved;
        if (s.scrollWidth > s.clientWidth + 1 || natural > r.height + 1)
          p.push(`${name(s)} が枠からはみ出す`);
        if (
          r.left < box.left - 1 ||
          r.top < box.top - 1 ||
          r.right > box.right + 1 ||
          r.bottom > box.bottom + 1
        )
          p.push(`${name(s)} が画像の外に出る`);
        return p;
      }),
    );

    add(
      "RENDER-MIN-FONT",
      required.flatMap((s) => {
        const px = Number.parseFloat(getComputedStyle(s).fontSize) * cfg.thumbnailScale;
        return px + 1e-6 < cfg.minFontPxAtThumbnail
          ? [`${name(s)} は縮小時 ${px.toFixed(1)}px`]
          : [];
      }),
    );

    const rgba = (css) => {
      const m = css.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = 1] = m[1]
        .split(/[ ,/]+/)
        .filter(Boolean)
        .map(Number);
      return { r, g, b, a };
    };
    const lum = ({ r, g, b }) => {
      const c = [r, g, b].map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const background = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const c = rgba(getComputedStyle(n).backgroundColor);
        if (c && c.a >= 0.99) return c;
        if (n.dataset?.photoBackground === "true") return null;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    };
    add(
      "RENDER-CONTRAST",
      required.flatMap((s) => {
        const fg = rgba(getComputedStyle(s).color);
        const bg = background(s);
        if (!fg || !bg) return [];
        const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
        const ratio = (l1 + 0.05) / (l2 + 0.05);
        // WCAG large text (24px, or 18.66px bold) may use the lower threshold.
        const style = getComputedStyle(s);
        const px = Number.parseFloat(style.fontSize);
        const bold = Number.parseInt(style.fontWeight, 10) >= 700;
        const large = px >= 24 || (bold && px >= 18.66);
        const min = large && cfg.minContrastLarge ? cfg.minContrastLarge : cfg.minContrast;
        return ratio + 1e-6 < min ? [`${name(s)} のコントラスト ${ratio.toFixed(2)}`] : [];
      }),
    );

    const inset = Number(canvas.dataset.safeInset || 0);
    add(
      "RENDER-SAFE-ZONE",
      required.flatMap((s) => {
        const r = s.getBoundingClientRect();
        return r.left < box.left + inset - 1 ||
          r.top < box.top + inset - 1 ||
          r.right > box.right - inset + 1 ||
          r.bottom > box.bottom - inset + 1
          ? [`${name(s)} がセーフゾーンの外`]
          : [];
      }),
    );

    const logos = [...canvas.querySelectorAll("img[data-logo]")];
    add(
      "RENDER-LOGO-INTACT",
      logos.flatMap((img) => {
        const p = [];
        const r = img.getBoundingClientRect();
        if (img.naturalWidth && img.naturalHeight) {
          const natural = img.naturalWidth / img.naturalHeight;
          if (Math.abs(r.width / r.height - natural) / natural > 0.01)
            p.push("ロゴの比率が変わっている");
        } else p.push("ロゴが読み込めない");
        for (let n = img; n && n !== canvas.parentElement; n = n.parentElement) {
          const t = getComputedStyle(n).transform;
          if (t && t !== "none") p.push("ロゴ（か親）に transform がある");
        }
        const fit = getComputedStyle(img).objectFit;
        if (fit === "cover" || fit === "none") p.push("ロゴが切り抜かれている");
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (top && top !== img) p.push("ロゴの上に要素が重なっている");
        return [...new Set(p)];
      }),
      logos.length ? null : "ロゴが無い",
    );

    add(
      "RENDER-FONTS-LOADED",
      cfg.fonts
        .filter((f) =>
          [...document.fonts].some(
            (face) => face.family.replace(/^"|"$/g, "") === f && face.status === "error",
          ),
        )
        .map((f) => `${f} が読み込めない`),
      cfg.fonts.length ? null : "フォントを配置していない",
    );
  } catch (error) {
    out.push({
      ruleId: "RENDER-NO-OVERFLOW",
      status: "fail",
      detail: `検査の実行に失敗: ${error}`,
    });
  }
  document.getElementById("__checks").textContent = JSON.stringify(out);
  document.body.dataset.checks = "done";
})();
