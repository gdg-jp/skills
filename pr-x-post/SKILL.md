---
name: pr-x-post
description: GDG イベントの X 投稿（と Instagram 投稿）の本文を書く。「さらに表示」の折りたたみ位置、画像か OGP か、ハッシュタグ、投稿時刻、スタッフ・登壇者への依頼文まで出し、pr-playbook の検査を通す。告知・セッション紹介・登壇者紹介・カウントダウン・当日実況の投稿を書くときに使う。
---

# pr-x-post — X / Instagram 投稿

<!-- reads: guides/x.md, guides/instagram.md, guides/reminders.md, guides/schedule.md, guides/live.md -->

## 入力

- brief（`sessions` の `status` / `flags`、`speakers` の `tier`、`event.hashtag` / `streamUrls`、`accounts`）
- 採用済みのコピー（`pr-copy` の出力の 1 候補）
- 書く投稿の一覧（スケジュールの行。`purpose`、時刻、対象のセッションや登壇者）
- チャネル: `x`（既定）か `ig`

## 読むもの

- `pr-playbook/rules.json` のうち scope が `draft.x_post`（Instagram は `draft.ig_post`）のルール
- `pr-playbook/guides/x.md`（必読）、`guides/instagram.md`（ig のとき必読）、`guides/reminders.md`、`guides/live.md`（当日実況のとき）
- `pr-playbook/constants.json` の `x`（折りたたみのしきい値は仮値）

## 手順

1. 投稿ごとに `purpose` と `expectedReaction`（quote / repost / click）を決め、添付を合わせる（quote → 画像、repost → OGP 付き短縮リンク）
2. `purpose: session` はそのセッションの `status` が `confirmed` 以上のものだけ書く。TBA のセッションは書かない
3. 本文を書く。リンクは `{{shortlink}}` と書く。告知投稿にハッシュタグを入れない。当日実況にはイベントのハッシュタグを付ける
4. 長い投稿は、折りたたみ前に情報を最大限入れてリンクを最後に置き、折りたたみ後の 1 行目にクリックを後押しする文を置く。
   `text` を行の境目で `textAboveFold` と `textBelowFold` に分ける（短い投稿は `textBelowFold` を空に）
5. スタッフへの依頼文（`staffReminder`）を書く。セッション紹介には登壇者への依頼文（`speakerRequest`）を書き、`tier: high` は `suggestionOnly: true`
6. 検査し、MUST を直す。日本語を `yomiyasu` で推敲する

Instagram（`--channel ig`）は X の本文を流用しない。ハッシュタグを多数付ける。

## 出力

`references/output.schema.json` の JSON だけを返す。例は `references/example-output.json`。

## 検査

```sh
node <pr-playbook>/scripts/checks/run.mjs --kind x_post --input out.json --brief brief.json
node <pr-playbook>/scripts/checks/run.mjs --kind ig_post --input ig.json --brief brief.json --related related.json  # related = { "xPosts": [...] }
```

投稿の予約は `gdg-sns` skill か pr アプリが行う。この Skill は投稿しない。
