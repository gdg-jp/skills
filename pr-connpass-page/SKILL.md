---
name: pr-connpass-page
description: GDG イベントの connpass 説明ページを、3 行の概要と装飾したセクションと画像で組む。connpass-decent-description と connpass-syntax を束ね、イベント skin を当て、pr-playbook の検査（許可 HTML・3 行概要・タイトル）を通す。connpass ページを新しく作るとき、申込率を上げたいときに使う。
---

# pr-connpass-page — connpass ページ

<!-- reads: guides/connpass-page.md, guides/brand.md, guides/thumbnail.md, examples/connpass-page/devfest-kansai-2026/README.md, templates/connpass-page/README.md -->

## 入力

- brief、採用済みのコピー、手元にある画像の URL（img.gdgs.jp）

## 読むもの

- `pr-playbook/rules.json` のうち scope が `draft.connpass_page` のルール
- `pr-playbook/guides/connpass-page.md`（必読）、`guides/brand.md`
- `pr-playbook/examples/connpass-page/devfest-kansai-2026/`（手本。`connpass.html` を読む）
- `connpass-syntax` skill の `references/syntax.md`（許可タグ・属性・22 の CSS プロパティ。**正本**）
- `connpass-decent-description` skill（構成とパネル・見出し・ステッカーの作り方）

## 手順

HTML は書かない。セクションのスロット（文言と URL）を返し、HTML は描画器が組む
（`pr-playbook/templates/connpass-page/README.md` がセクションとスロットの一覧）。

1. タイトルを決める（採用コピーの `connpassTitle`）
2. 冒頭の概要を 3 行以内で書く（`summary`。Markdown）
3. `sections[]` をページの順に並べる: `hero` → `sessions-image` → `overview` → `headline` → `feature` → `audience` →
   `timetable-image` → `speakers` → `venue` → `sponsors` → `participant-guide` → `plain`。要らないものは省く。
   見出しのステッカーは各セクションの `heading`
4. 画像の URL は手元にある img.gdgs.jp のものだけを使う。無ければ `imageUrl: null` にし、`imageSlots` に
   「何の画像が要るか」と載せる文言を書く（画像だけのセクションは描画されない）
5. 色は brief の `skin`（無ければ `gdg-design`）。`skinSource` に出所を書く（色そのものは返さない）
6. 申込時のアンケート（年齢・職業・経験年数・知った場所）を `surveyQuestions` に、配信 URL・Discord・資料の案内を
   `participantOnlyInfo` と `participant-guide` に書く
7. 描画して検査し、MUST を直す。日本語を `yomiyasu` で推敲する

```sh
node <pr-playbook>/scripts/render/run.mjs --input out.json --skin <skin.json> --out connpass.html
```

## 出力

`references/output.schema.json` の JSON だけを返す。例は `references/example-output.json`。

## 検査

```sh
node <pr-playbook>/scripts/checks/run.mjs --kind connpass_page --input out.json --brief brief.json
```

connpass への反映は `gdg-connpass` skill か pr アプリが行う。この Skill はライブのページを書き換えない。
