# 画像テンプレート

AI（`pr-asset`）はスロットの文言と範囲付きの `layoutVars` だけを返す。HTML は `scripts/render/image-html.mjs` がここのテンプレートから組み、
Worker（Browser Rendering）とローカル（`scripts/render/images.mjs`、Playwright）が同じ HTML を描画する。検査は
`scripts/render/checks-script.js` がページの中で測り（`RENDER-*`）、`<pre id="__checks">` に書く。

| id | サイズ | 媒体 | 用途 |
|---|---|---|---|
| `connpass-thumbnail` | 1200×630 | connpass | connpass のイベント画像（顔） |
| `ogp-1200x630` | 1200×630 | X のリンクカード | 短縮リンクの OGP |
| `x-post-16x9` | 1600×900 | X | X 投稿画像（横） |
| `x-post-1x1` | 1080×1080 | X | X 投稿画像（正方形） |
| `x-ad-16x9` | 1600×900 | X 広告 | X 広告 |
| `ig-feed-4x5` | 1080×1350 | Instagram | Instagram フィード |
| `ig-story-9x16` | 1080×1920 | Instagram | Instagram ストーリー |
| `session-card-1x1` | 1080×1080 | X / Instagram | セッション紹介 |
| `speaker-card-1x1` | 1080×1080 | X / Instagram | 登壇者紹介 |
| `live-session-16x9` | 1600×900 | X | 当日実況のセッション開始 |
| `photo-16x9` | 1600×900 | X / Instagram | 写真を下地にした投稿・広告 |

- 色は skin（`templates/connpass-page/skin.schema.json`）だけ。既定は gdg-design。テンプレートは skin の外の色を持たない
- ロゴは `logoUrl`（gdg-design の `gdg.svg`）を `<img data-logo>` で置くだけ。比率・回転・切り抜きを変えない（`RENDER-LOGO-INTACT`）
- 書体は Google Sans（見出し）+ LINE Seed JP（本文）。フォントファイルはコミットしない（埋め込みの権利を確認して pr の R2 に置く）
- 共通の CSS は `base.css`
