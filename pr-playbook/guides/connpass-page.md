# connpass ページ

## 構成
<!-- tips: 6 -->

最近の人は文章を読まない。説明文は長いイベント説明を避け、冒頭にたかだか 3 行の概要文だけを書く。残りは HTML + CSS で
装飾したコンテンツと、見やすい画像で伝える。目的は申込率（CVR）であり、CVR が上がるなら構成は自由に変えてよい。

手本は DevFest Kansai 2026 のページ（`examples/connpass-page/devfest-kansai-2026/`）。hero 画像 → セッション一覧画像 →
開催概要 → メインコピーと短い説明 → 企画 → こんな方におすすめ → タイムテーブル画像 → スポンサー → プレイベント の順。

## タイトルとサムネイルの役割分担
<!-- tips: 5, 26 -->

タイトルは一覧で読まれる（クリック率）。サムネイルはイベント詳細で見られる（申込率）。サムネイルにはサブコピー・日時・場所を入れる。

## 書き方の正本
<!-- tips: 6 -->

- 記法・許可タグ・CSS は `connpass-syntax` skill の `references/syntax.md` が正本。22 の CSS プロパティ以外は connpass に消される
- 構成とパネル・見出し・ステッカーの作り方は `connpass-decent-description` skill を使う
- 色と書体は `brand.md`（イベント skin）を先に見る。skin が無ければ `gdg-design`
- 画像は img.gdgs.jp に置く
