# 画像テンプレート

画像の作り方は 2 つある。どちらも Worker（Browser Rendering）とローカル（`scripts/render/images.mjs`、Playwright）が
同じ HTML を描画し、`scripts/render/checks-script.js` がページの中で測って（`RENDER-*`）`<pre id="__checks">` に書く。

1. **design 方式（既定、`pr-asset`）** — AI が `guides/design.md` のとおりに HTML と CSS を書く。`scripts/render/design-html.mjs` が
   script と外部参照を取り除き、フォントと検査器を注入する。ここのテンプレートからは**サイズと必須スロット**だけを使う。
2. **template 方式（`live` の実況カード、人の手直し）** — ここの `template.html` のスロットを文言で埋める。`image-html.mjs` が組む。

| id | サイズ | 媒体 | 用途 | 必須スロット |
|---|---|---|---|---|
| `connpass-thumbnail` | 1200×630 | connpass | connpass のイベント画像（顔） | title, subcopy, date, place |
| `ogp-1200x630` | 1200×630 | X のリンクカード | 短縮リンクの OGP | title |
| `x-post-16x9` | 1600×900 | X | X 投稿画像（横） | headline |
| `x-post-1x1` | 1080×1080 | X | X 投稿画像（正方形） | headline |
| `x-ad-16x9` | 1600×900 | X 広告 | X 広告 | headline, cta |
| `ig-feed-4x5` | 1080×1350 | Instagram | Instagram フィード | headline |
| `ig-story-9x16` | 1080×1920 | Instagram | Instagram ストーリー | headline, cta |
| `session-card-1x1` | 1080×1080 | X / Instagram | セッション紹介 | sessionTitle, speakerName, speakerRole |
| `speaker-card-1x1` | 1080×1080 | X / Instagram | 登壇者紹介 | speakerName, speakerRole |
| `live-session-16x9` | 1600×900 | X | 当日実況のセッション開始 | time, track, sessionTitle |
| `photo-16x9` | 1600×900 | X / Instagram | 写真を下地にした投稿・広告 | headline |

design 方式の HTML の契約:

- ルートは `<div class="canvas" data-safe-inset="32" style="width:Wpx;height:Hpx">`。サイズはテンプレートのとおり（`RENDER-CANVAS-SIZE`）
- 必須スロットの文字要素に `data-slot="<名前>" data-required="true"`（`DESIGN-FACTS-MARKED`）。任意の文字にも `data-slot` を付けると、はみ出しを測れる
- GDG ロゴは `<img data-logo src="assets/gdg.svg">`。比率・回転・切り抜きを変えない（`RENDER-LOGO-INTACT`）
- 画像は束の `assets/`（`assets/gdg.svg`、`assets/stickers/<file>.svg`、`assets/photos/<id>.jpg`、`assets/logo.*`）か `data:`。
  外の URL は img.gdgs.jp だけ。script、iframe、`on*` 属性は消される（`DESIGN-NO-EXTERNAL`）
- 書体は `"Google Sans Flex"`、`"LINE Seed JP"`、`"Google Sans Code"`（`constants.design.fonts`。@font-face は注入される）
- 共通の CSS は無い。`examples/design/html/` の型をコピーして変える

template 方式の約束は以前のとおり: 色は skin だけ、ロゴは `<img data-logo>`、共通 CSS は `base.css`。
