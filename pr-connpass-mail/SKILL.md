---
name: pr-connpass-mail
description: GDG イベントの connpass メール（参加者・グループ宛のメッセージ）を、短く装飾した形で書く。送信時刻と送る節目も決め、pr-playbook の検査を通す。connpass のメッセージ、告知メール、リマインドメールを書くときに使う。
---

# pr-connpass-mail — connpass メール

<!-- reads: guides/connpass-mail.md, guides/schedule.md -->

## 入力

- brief、メールの目的（開催告知 / セッション公開 / 節目の告知 / 前日リマインド / お礼）、伝える要件

## 読むもの

- `pr-playbook/rules.json` のうち scope が `draft.connpass_mail` のルール
- `pr-playbook/guides/connpass-mail.md`（必読）、`guides/schedule.md` の節目
- `connpass-syntax` skill（メール本文の記法）

## 手順

1. 送信時刻を決める（朝の起床前か夕方の退勤前。`constants.mail.sendWindows`）
2. 件名を【イベント名】要件 の形で書く
3. 本文は要件だけを短く。丁寧すぎる言い回し（`constants.mail.bannedPhrases`）を使わない。リンクは `{{shortlink}}`
4. フッターに罫線などの装飾とチャプター名を入れる
5. 検査し、MUST を直す。日本語を `yomiyasu` で推敲する

## 出力

`references/output.schema.json` の JSON だけを返す。例は `references/example-output.json`。

## 検査

```sh
node <pr-playbook>/scripts/checks/run.mjs --kind connpass_mail --input out.json --brief brief.json
```
