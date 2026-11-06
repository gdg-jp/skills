---
name: pr-improve
description: pr.gdgs.jp で採用した Playbook の提案（振り返り・分析・人の Tips）を、gdg-jp/skills の pr-playbook に書き戻す。書き出した JSON を取り込み、ルールと定数は feedback.mjs で反映し、ガイド・テンプレート・事例・決定は手で書き、検査を通してコミットする。「提案を Playbook に反映して」「Tips を書き戻して」と言われたら使う。
---

# pr-improve — 提案を Playbook に書き戻す

`design-improve` と同じ考え: 正本の変更は人のレビューを経る。pr アプリ（Worker）は Playbook に書かない。

## 手順

1. pr の `/playbook/proposals` で「採用した提案を書き出す」→ `proposals-<date>.json` を受け取る
2. 取り込む（個人を特定できる値を含む提案は拒否される）

   ```sh
   node pr-playbook/scripts/feedback.mjs import proposals-<date>.json
   node pr-playbook/scripts/feedback.mjs list
   ```

3. `rule`（検査が実装済みのもの）と `constant` は `apply` で書く。提案時と `rules.json` / `constants.json` が違えば拒否されるので、
   その場合は pr で書き出し直す

   ```sh
   node pr-playbook/scripts/feedback.mjs apply <id>
   ```

4. `guide` / `template` / `example` / `decision` は `apply` が宛先と本文を表示するので、その正本に手で書く。
   ガイドは `<!-- tips: n -->` の出典を付け、一般論は足さない。却下したものは `decisions.md` に理由と一緒に残す（蒸し返さないため）
5. 検査とテストを通す

   ```sh
   node pr-playbook/scripts/validate.mjs
   node --test pr-playbook/scripts/checks/*.test.mjs pr-playbook/scripts/render/*.test.mjs pr-playbook/scripts/*.test.mjs
   node pr-playbook/scripts/render/build-schema.mjs --check
   ```

6. skills にコミットし、そのコミットを pr の提案画面の「適用した」に入れる。反映済みの `proposals/<id>.json` は消す
