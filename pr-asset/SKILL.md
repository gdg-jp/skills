---
name: pr-asset
description: GDG イベントの画像（connpass サムネイル、OGP、X・Instagram の投稿画像と広告、セッション・登壇者カード、カウントダウン）を、イベントごとのデザインキット（色・モチーフ・書体・ロックアップ）に沿って HTML と CSS で設計し、ローカルで描画して自分の目で見て直し、pr-playbook の render 検査（はみ出し・縮小時の文字サイズ・コントラスト・ロゴ）を通す。キットと顔（サムネイル）の方向案を出すときにも使う。イベントの画像、サムネイル、バナー、広告画像を作るときに使う。
---

# pr-asset — 画像

<!-- reads: guides/design.md, guides/thumbnail.md, guides/brand.md, templates/images/README.md, examples/design/README.md -->

チャプターのデザイナーと同じ判断基準で、イベントごとに違う答えを出す。描いて、見て、直す。
ピクセルは描かない（HTML と CSS を書き、描画器が描き、検査器が測る）。

## 入力（JOB.md が指す）

- `BRIEF.json`。`KIT.json` と `KIT.html`（キットが決まっていれば。顔の HTML）。`COPY.json`（採用コピー）、`POST.json`（添える投稿）
- `references/`（参考画像。ファイル名の日付が新しいほど重く見る。**同じ絵にしない**）
- `assets/`（`gdg.svg`、`stickers/*.svg`、`photos/<speakerId>.jpg`、`logo.*`）。HTML からは相対パスで参照する
- 目的（purpose）: `kit`（キットと顔の方向案）か、テンプレート id（`templates/images/README.md` の表）
- `PREVIOUS.html` と人の指示（直しのとき）

## 読むもの

- `pr-playbook/guides/design.md` — 判断基準。全部読む
- `pr-playbook/examples/design/kits/*.json` — 過去 3 イベントの測った値。`html/*.html` — 型（出発点にしてよい）
- `pr-playbook/templates/images/<id>/slots.schema.json` — サイズと必須スロット。`templates/images/README.md` — HTML の契約
- `pr-playbook/rules.json` のうち scope が `draft.asset_spec` のルール

## 手順

1. **文脈を拾う。** brief から開催地・季節・公式シリーズ・趣旨・対象・`skin`（公式ロゴ、ブランドガイド、前回の画像）。
   `references/` の画像を `view_image` で見る。`guides/design.md` の「新しいイベントで決めるときの手順」のとおり、支配色と
   モチーフの理由を 1 行ずつ決める。理由が書けない色は選ばない。
2. **purpose が `kit`:** キット（色・書体・ロックアップ・モチーフ・写真・事実の書き方）を決め、顔（`connpass-thumbnail`）を
   2〜3 案、HTML で書く。1 案は参考に近く（同じ系統の顔があればその家族。プレイベントは本編の家族）、1 案は構図か
   モチーフが違う。案ごとに描画して見て直し、`rationaleMd` に色とモチーフの理由と「見て直した点」を書く。
   `selfReviewMd` には案全体を見て確かめたことを書く。`examples/design/html/meetup-thumbnail.html`（プレイベントの顔）と
   `connpass-thumbnail.html`（本編の顔）が出発点。
   **purpose がテンプレート id:** `KIT.json` があればその範囲で（新しい色や書体を足さない）、無ければ 1 で決めたキットで、
   1 枚を HTML で書く。`examples/design/html/` の型から始めてよいが、イベントに合わせて変える。
3. **描画する。** `draft.html` に書き、

   ```sh
   node skills/pr-playbook/scripts/render/images.mjs --html draft.html --template <id> --assets . --out out/
   ```

   （サンドボックスでは描画器 broker が `GDG_RENDER_BROKER` で指定されている。無ければ `--broker .render`）
4. **見る。** `out/<id>.png` を `view_image` で開き、`guides/design.md` のセルフレビューの項目を順に確かめる。
   `out/checks.json` の MUST（はみ出し、縮小時の文字サイズ、コントラスト、ロゴ、サイズ）を直す。直して描画し直すのは 3 周まで。
   良くなったときだけ採用する。
5. **返す。** `html` は `draft.html` の中身そのまま（`<style>` と `.canvas`）。`selfReviewMd` に見て確かめたことを項目ごとに
   1 行ずつ。`rationaleMd` に色とモチーフの理由。`skinSource` は KIT.json があれば `kit`。

## HTML の約束（`templates/images/README.md`）

- ルート `<div class="canvas" data-safe-inset="32" style="width:Wpx;height:Hpx">`。サイズはテンプレートどおり
- 必須スロットの文字要素に `data-slot="<名前>" data-required="true"`。任意の文字にも `data-slot` を付ける
- GDG ロゴは `<img data-logo src="assets/gdg.svg">`。比率・回転・切り抜きを変えず、上に何も重ねない
- 画像は `assets/` の相対パスか `data:`。外の URL は img.gdgs.jp だけ。script、iframe、`on*`、`@import` は消される
- 書体は `"Google Sans Flex"`、`"LINE Seed JP"`、`"Google Sans Code"` だけ（@font-face は注入される）
- 写真が無い登壇者に写真を置かない。公式ロゴを文字で似せて作らない。参考画像の丸写しをしない

## 出力

`references/output.schema.json` の JSON だけを返す。`mode` は `design`。キットの案のときは `directions`（2〜3 件）。
例は `references/example-output.json`（design）と `references/example-template-output.json`（template）。
