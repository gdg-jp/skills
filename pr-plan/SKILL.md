---
name: pr-plan
description: GDG イベントの PR 計画を brief から作る。広報手段の採否、予算配分（非広告 1 万円前後、X : Instagram = 3 : 7 〜 4 : 6）、広告フライト、投稿・告知・依頼のスケジュール、派生リマインド、プレイベント、ノベルティ、アンケートまで出し、pr-playbook の検査を通す。イベントの集客計画、広報スケジュール、広告予算を考えるときに使う。
---

# pr-plan — PR 計画

<!-- reads: guides/channels.md, guides/schedule.md, guides/budget.md, guides/novelty.md, guides/connections.md, guides/reminders.md -->

## 入力

- brief（`goals.curve`、`budget`、`sessions` の `status`、`speakers` の `tier`、`preEvents`、`connections`、`accounts`）

## 読むもの

- `pr-playbook/rules.json` のうち scope が `plan` のルール
- `pr-playbook/guides/channels.md`、`schedule.md`、`budget.md`、`novelty.md`、`connections.md`、`reminders.md`（すべて必読）
- `pr-playbook/constants.json` の `channelCatalog` / `channelLabels` / `reminders` / `budget` / `milestonesDaysBefore` / `ads`

## 手順

1. 目標曲線（`goalCurve`）を brief から写すか、無ければ週次で作る
2. `channelCatalog` の手段すべてについて採否と理由を書く（`channelMix`）。足りない手段は足してよい（`label` を付ける）
3. 予算を配分する（`budgetAllocation`）。広告フライトは X Ads 10〜14 日前から（最初の 3 日はインプレッション）、Meta 10 日前から
4. スケジュールを作る（`scheduleItems`）。各行に一意の `ref` を付ける
   - `x_post` / `ig_post` ごとに 60 分前の `staff_reminder`（`derivedFrom` = 親の `ref`、`offsetMinutes: -60`）
   - 登壇者付きの `x_post` に 180 分前の `speaker_request`（`purpose: quote`。`tier: high` は `suggestionOnly: true`）
   - `tier: normal` の登壇者ごとに本人の登壇予告の依頼（`purpose: own_announce`）
   - TBA のセッションに関わる行は `blockedBy: ["session:<id>:confirmed"]`
   - Discord は節目（45 / 21 / 7 日前）だけ。フライヤーの文言は `flyer_text` を v1 / v2 の 2 行。当日の `live_post` を入れる
5. プレイベント（本番への導線付き）、営業先（`outreach`）、使うコネクション、ノベルティ 5 種、層別の企画、アンケート 4 問を書く。
   「イベントを知った場所」の選択肢は採用チャネルのラベル + 「その他」
6. 検査し、MUST を直す。日本語を `yomiyasu` で推敲する

## 出力

`references/output.schema.json` の JSON だけを返す。例は `references/example-output.json`。

## 検査

```sh
node <pr-playbook>/scripts/checks/run.mjs --kind plan --input out.json --brief brief.json
```
