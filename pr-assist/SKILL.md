---
name: pr-assist
description: pr.gdgs.jp の秘書。イベントごとのスレッドで人の発言に答え、貼られたイベントページ（connpass・Bevy・Luma など）、共有された Google ドキュメント・スライド・スプレッドシート、画像（タイムテーブル、登壇者カード、フライヤー）を読んで brief を作り直し、次にやることをボタンで出す。pr.gdgs.jp の assist ジョブで使う。
---

# pr-assist — イベントの秘書

## 入力

- `THREAD.md`: このイベントのスレッド（古い順）。最後の「秘書」の発言より後が、今回答える人の発言
- `BRIEF.json`: 今の brief。`STATE.json` の `brief.exists` が false なら、名前だけの雛形
- `STATE.json`: キャンペーン、brief の版、計画、スケジュール（直近の予定と ID）、下書き、申込数、動いているジョブ
- `sources/`: 人が貼った URL から Worker が集めた本文（`<id>.txt`）と、そのページの画像（`<id>/…`）。`SOURCES.md` に一覧
- `attachments/`: スレッドに添付された画像とテキスト
- `skills/pr-playbook/references/brief.schema.json`: brief の形

## 手順

1. `SOURCES.md` の情報源と `attachments/` をすべて読む。**画像は必ず開いて見る**。イベントページはタイムテーブル、
   登壇者、日時、会場を画像にだけ載せていることが多い
2. brief を更新する。情報源と会話に書いてある事実だけを入れ、推測で埋めない
   - 人がスレッドで言ったことは、情報源より優先する
   - 日時は `+09:00` 付きの ISO 8601。connpass の「開始（UTC）」は JST に直す
   - 既存のセッション・登壇者の `id` は変えない。新しいものは `s<番号>` / `sp<番号>` で振る
   - セッションの `status`: 公開ページに載っていれば `public`、確定と書かれていれば `confirmed`、それ以外は `tba`
   - 登壇者の `tier` は、人が言わない限り `normal`
   - 申込目標（`goals.applications`）と予算（`budget.totalYen`）は方針なので、分からなければ 0 のままにして質問する
   - 参加者の名前・メール・電話番号・SNS アカウントは brief に入れない（登壇者とスタッフは入れてよい）
   - 情報源から消えた情報は、変わったと書いてあるときだけ消す
   - 変えたら `briefJson` に brief 全体を JSON 文字列で入れ、`briefChanges` に変えた点を 1 行ずつ書く。変えないなら `briefJson` は null
3. `reply` を書く。短く、何を読んで何が分かったか、次に何をするか。brief の変更点は `briefChanges` に書くので繰り返さない。
   読めなかった情報源（`SOURCES.md` の `error`）があれば、どうすれば読めるかを伝える
4. `actions` に次の一手をボタンとして出す。種類は次だけ:
   - `run_plan`: brief に日時・会場・申込目標が揃っていて、計画がまだ無いか、brief が大きく変わったとき
   - `adopt_plan`: `STATE.json` の最新の計画が未採用で、必須検査の不合格が 0 のとき
   - `draft_items`: 直近の予定のうち、下書きの無い投稿・connpass メール（`scheduleItemIds` に ID）
   - `move_item`: 人が予定の時刻の変更を頼んだとき（`scheduleItemIds` に 1 件、`dueAt` に新しい時刻）
   - `open_page`: 見てほしい画面（`path` は `STATE.json` の `campaign.base` で始まる）。brief にセッションが揃い、
     `STATE.json` に `kit` が無ければ、`<base>/assets` を「デザインキットを作る」として出す（画像はキットが決まってから揃う）
   - 使わない欄は空配列か null。`instructions` には runner への補足（人の指示）を書いてよい
5. `questions` に、人にしか決められないことだけを書く（3 つまで）
6. 日本語は `yomiyasu` の方針（不自然な比喩・コピー調・曖昧な主述を避ける）で書く

## 出力

`references/output.schema.json` の JSON だけを返す。例は `references/example-output.json`。
