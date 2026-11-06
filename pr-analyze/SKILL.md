---
name: pr-analyze
description: GDG イベントの集客を週次で分析し、週次 MTG のアジェンダになるレポートと、予算の付け替え・画像の差し替え・スケジュールの追加移動の提案を出す。目標曲線との差、チャネル別のクリックと申込、広告の費用と CPC、運用の詰まりを見る。提案は人が適用する。集客の振り返り、週次レポート、広告予算の見直しのときに使う。
---

# pr-analyze — 週次の分析

<!-- reads: guides/budget.md, guides/schedule.md, guides/x.md, guides/instagram.md -->

## 入力

- `METRICS.json`（申込の推移と目標曲線、チャネル別、広告、出席）、`AD_FLIGHTS.json`、`PLAN.json`、
  `SCHEDULE.json`（今後 14 日）、`TEAM.json`（メンバーと今週の担当）、`ASSETS.json`（承認済みの画像）、BRIEF.json

## 手順

1. 目標曲線との差から書く（何件足りないか、残り日数、1 日に要る件数）。週次 MTG の最初の話題になる
2. チャネル別のクリックと申込を比べ、効いている手段と効いていない手段を数字で示す（`evidence` に出典の値）
3. 広告は費用・クリック・CPC を比べる。予算の付け替えは `constants.budget` の範囲（X : Instagram = 3 : 7 〜 4 : 6、
   SNS 広告以外は 1 万円前後）に収める。範囲を外れる提案はしない
4. 画像の差し替え、投稿の追加・移動・見送りを、理由付きで出す。自分では何も変えない（人が適用する）
5. 人別に今週の担当と期限切れを並べる
6. 日本語は `yomiyasu` の方針で書く

## 出力

`references/output.schema.json` の JSON だけを返す。例は `references/example-output.json`。
