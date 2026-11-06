# DevFest Kansai 2026 の connpass ページ

ユーザーが「現時点での完成系」と呼ぶページ。`~/proj/connpass`（実際に使った編集ディレクトリ）から写した。

| ファイル | 内容 |
|---|---|
| `connpass.html` | connpass に貼った HTML。`CP-HTML-ALLOWLIST` を通る |
| `connpass.md` | Markdown 版（文章の流れ） |
| `timetable.json` / `session-list.json` | 画像の元データ（`connpass-timetable-image` / `connpass-session-list-image`） |
| `as-draft.json` | `connpass.html` を `connpass_page` の下書きの形に包んだもの（検査器の実物テスト） |

手本にする点:

- 冒頭は画像（hero、セッション一覧）。文章は短い概要だけ
- 開催概要は色付きの左罫線の行を並べたパネル。文字は 14px
- メインコピーを見出しにし、説明は 2 段落 + 一言
- 企画（学生展示、学生エンジニア座談会）は写真と申込ボタン
- タイムテーブルは画像。セッションは登壇者ブロック
- skin は DevFest 2026 のブランドガイドに沿ったブルー背景（`examples/skins/devfest-kansai-2026.json`）

画像は img.gdgs.jp の URL のまま参照する。ファイルは持ち込まない。
