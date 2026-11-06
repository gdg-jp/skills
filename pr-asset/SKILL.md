---
name: pr-asset
description: GDG イベントの画像（connpass サムネイル、OGP、X・Instagram の投稿画像と広告、セッション・登壇者カード、写真下地）を、テンプレートのスロットを埋めて作る。ピクセル・CSS・HTML は書かず、文言と範囲付きのレイアウト変数だけを返し、ローカルで描画して pr-playbook の render 検査（はみ出し・縮小時の文字サイズ・コントラスト・ロゴ）を通す。イベントの画像、サムネイル、バナーを作るときに使う。
---

# pr-asset — 画像

<!-- reads: guides/thumbnail.md, guides/brand.md, templates/images/README.md -->

AI はピクセルを設計しない。テンプレートのスロットに文言を入れ、描画器が組み、検査器が測る。

## 入力

- テンプレート id（`pr-playbook/templates/images/<id>/`）、brief（skin、登壇者・セッション）、採用コピー、
  投稿や connpass ページの `imageSlots` の文言（あれば）

## 読むもの

- `pr-playbook/templates/images/<id>/{slots.schema.json,README.md}`（必須スロット、字数、サイズ）
- `pr-playbook/guides/thumbnail.md`（縮小表示で読める、事実を載せる）、`guides/brand.md`（skin、ロゴの禁則）
- `pr-playbook/rules.json` のうち scope が `draft.asset_spec` のルール（`RENDER-*`、`CP-THUMB-HAS-FACTS`、`BRAND-SKIN-DECLARED`）

## 手順

1. `slots.schema.json` の必須スロットを全部埋める。字数（`maxLength`）を守る。使わないスロットは null
2. 見出しは採用コピーから短く。日時・場所は brief の事実をそのまま（サムネイルは縮小表示で読まれる）
3. `layoutVars` は範囲の中だけ: `titleScale` 0.8〜1.2、`align` left / center、`emphasis` は強調する語を 3 つまで
4. 色は brief の skin（無ければ gdg-design）。`skinSource` に出所を書く。色・書体・座標は返さない
5. ローカルで描画して検査する。MUST が落ちたら文言を短くするか `titleScale` を下げる

```sh
node <pr-playbook>/scripts/render/images.mjs --template <id> --slots out.json --skin <skin.json> --out /tmp/asset
```

## 出力

`references/output.schema.json` の JSON だけを返す（`templateId`, `slots`, `layoutVars`, `skinSource`, `rationaleMd`）。
例は `references/example-output.json`。
