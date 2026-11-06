---
name: pr-copy
description: GDG イベントのタイトルとメインコピーを、brief のメタテーマから作る。connpass タイトル・X・Instagram・フライヤーの媒体別と、対象層ごとの変種まで出し、pr-playbook の検査を通す。イベントのタイトル、キャッチコピー、メインコピー、サブコピーを考えるときに使う。
---

# pr-copy — タイトルとメインコピー

<!-- reads: guides/copy.md, guides/brand.md, examples/copy/devfest-kansai-2026.json -->

## 入力

- brief（`pr-playbook/references/brief.schema.json`）。`metaThemes`、`audienceSegments`、`copyConstraints`、`event`、`sessions` を使う
- 追加の指示（あれば）

## 読むもの

- `pr-playbook/rules.json` のうち scope が `draft.copy` のルール
- `pr-playbook/guides/copy.md`（必読）、`guides/brand.md`
- `pr-playbook/examples/copy/devfest-kansai-2026.json`（メタテーマ → コピーの実例と、採用しなかった案）

## 手順

1. brief の `metaThemes` を読み、それぞれが「何を避ける / 何と何を越境させる」かを 1 行で言い換える
2. メタテーマを射影したメインコピーの候補を 3〜5 個出す。候補ごとに `metaThemeMapping`（theme と projection）を書く
3. 各候補について、connpass タイトル（公式シリーズ名に内容を足し、日本語で長さを稼ぐ）、X 用、Instagram 用、フライヤーの 1 行を作る
4. `audienceSegments` の層ごとに 1 行ずつ作る（`bySegment`）。`copyConstraints` の語を全変種に入れる
5. 検査する（下）。MUST が落ちたら直す
6. 日本語の文面を `yomiyasu` で推敲する。無い環境では `notes` にその旨を書く

## 出力

`references/output.schema.json` の JSON だけを返す。例は `references/example-output.json`。

## 検査

```sh
node <pr-playbook>/scripts/checks/run.mjs --kind copy --input out.json --brief brief.json
```

決めるのは人（1〜2 人）。候補の良し悪しを AI が決めない。
