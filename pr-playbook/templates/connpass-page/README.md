# connpass ページのテンプレート

AI（`pr-connpass-page`）は `sections[]` のスロット（文言と URL）だけを返す。HTML は描画器
`scripts/render/connpass-page.mjs` がここのテンプレートから組む。描画器の出力は `checks/connpass-html.mjs`
（connpass の許可リスト）を必ず通る。テンプレートに許可外の CSS（`border-radius`、`width` など）を書かない。

## セクション

| id | 中身 | スロット |
|---|---|---|
| `hero` | 冒頭の画像（+ リンク） | `imageUrl`, `alt`, `linkUrl` |
| `summary` | 太字の短い行（3 行まで） | `lines[]` |
| `sessions-image` | セッション一覧の画像 | `imageUrl`, `alt` |
| `overview` | 開催概要。色付き左罫線の行、14px | `rows[]{icon,label,value}`, `note` |
| `headline` | メインコピーを見出しに、本文 2〜3 段落 + 一言 | `mainCopy`, `paragraphs[]`, `callout` |
| `feature` | 企画（学生展示など）。写真と申込ボタン | `body`, `imageUrl`, `ctaLabel`, `ctaUrl` |
| `audience` | こんな方におすすめ | `items[]` |
| `timetable-image` | タイムテーブルの画像 | `imageUrl`, `alt`, `note` |
| `speakers` | 登壇者（表組み） | `speakers[]{name,role,imageUrl,sessionTitle}` |
| `venue` | 会場 | `name`, `address`, `access[]`, `mapUrl` |
| `sponsors` | スポンサー | `sponsors[]{name,tier,logoUrl,description,links[]}` |
| `links` | X / Instagram / 公式 | `links[]{label,url}` |
| `faq` | よくある質問 | `items[]{q,a}` |
| `plain` | 飾らない末尾（主催・CoC） | `paragraphs[]` |
| `sessions-list` | セッションの表（画像を作る前・補助） | `sessions[]{title,speaker,track,time,tags[]}` |
| `participant-guide` | 参加者への導線（Discord・配信・資料） | `discordInviteUrl`, `streamUrls[]`, `slidesUrl`, `calendarUrl` |

どのセクションにも `heading`（見出しのステッカー。null なら出さない）がある。画像の URL が null のセクションは
出さず、`warnings` に残る（`imageSlots` に「何の画像が要るか」を書く）。

## skin

`skin.schema.json`。`bg`（ページの地）、`panelBg`（パネル）、`keyline`（2px の枠線）、`accent[]`（行の左罫線を順に使う）、
`text`、`sticker`（見出しの地）。既定は `skins/gdg-default.json`（gdg-design の Off White + Black 02）。
DevFest Kansai 2026 はブルー背景（`skins/devfest-kansai-2026.json`）。色は `#RRGGBB` だけが通る。

## テンプレート言語

`scripts/render/template.mjs`: `{{a}}`（エスケープ）、`{{url a}}`（http(s) だけ）、`{{color a}}`（#hex だけ）、
`{{#each}}`、`{{#if}}…{{else}}`。生の HTML を差し込む書き方は無い。
