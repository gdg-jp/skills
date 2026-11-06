---
name: pr-retro
description: GDG イベントの PR を終わったあとに振り返り、人が下書きを直した事実・指標・KPT メモから Playbook への提案（ルール・定数・ガイド・事例）と、Wiki の告知先表に人が貼る更新を出す。一般論は足さず、却下済みの案を蒸し返さない。キャンペーンの振り返り、Tips の言語化、Playbook の見直しのときに使う。
---

# pr-retro — 振り返り

<!-- reads: decisions.md, proposals/README.md -->

## 入力

- `EDITS.json`（人の修正を種類・項目ごとに集めたもの。件数、代表例、変わった検査、`recurring` = 過去のキャンペーンでも同じ修正）
- `METRICS.json`、`PLAN.json`、`SCHEDULE_OUTCOME.json`、`REVIEWS.json`（差し戻しのコメント）、`CONTACTS_USED.json`、
  `ANALYZE_REPORTS.md`（週次レポート）、`RETRO_NOTES.md`（人の KPT）、Playbook の `rules.json` / `constants.json` / `guides/` / `decisions.md`

## 手順

1. 結果（申込・出席・目標との差）を短くまとめる
2. 提案は「人が直した事実」と「指標」と「KPT メモ」に根拠を置く。`evidence` に `EDITS.json` のキー、指標の名前、メモの項目を書く。
   根拠の無い一般論は出さない
3. `recurring: true` の修正は、同じ指摘が 2 回目であることを `summary` に書く
4. `decisions.md` で却下済みの案は出さない
5. `payloadJson`: ルールなら `rules.json` の 1 件、定数なら `{ "path": "/x/…", "value": … }`、ガイドとテンプレートなら `{ "markdown": "…" }`
6. 仮値（`provisional`）に観察値があれば `provisionalUpdates` に入れる
7. 告知先の結果は `wikiOutreachUpdateMd` に、Wiki の「イベント告知対象とコネクション保有者」に人が貼れる形で書く（Wiki には書き込まない）
8. 個人の名前・メールアドレス・@ハンドルを提案と事例に入れない

## 出力

`references/output.schema.json` の JSON だけを返す。例は `references/example-output.json`。
