---
name: pr-playbook
description: GDG Japan のイベント PR（集客）の判断基準の正本。X・Instagram の投稿、connpass のタイトル・ページ・メール、スケジュール、予算、ノベルティ、リマインド、ブランドについて、ユーザーが実運用で確かめた Tips をルール・ガイド・事例・検査器として持つ。pr-copy / pr-x-post / pr-connpass-page / pr-connpass-mail / pr-plan から読まれる。PR の判断基準を引きたいとき、下書きを Playbook で検査したいとき、PR の教訓を Playbook に足したいときに使う。
---

# PR Playbook

イベント PR の判断基準の**正本**。タスクごとの Skill（`pr-copy` など）がここから必要な部分を読み、下書きを `scripts/checks/` で検査する。
ここにはユーザーが実運用で確かめた Tips だけを書く。一般論は書かない。足したい知見は `proposals/` に置く。

## どのファイルが何の正本か

| 知識 | 正本 | 使い方 |
|---|---|---|
| 機械検査できる断定 | `rules.json` | `id` / `strength`（MUST / SHOULD）/ `scope`（`draft.<kind>` か `plan`）/ `verification`（mechanical / render / review） |
| 数値・窓・一覧 | `constants.json` | `provisional` の付いた値は仮値。断定の根拠にしない |
| 媒体別の判断基準 | `guides/*.md` | 各節の `<!-- tips: n -->` が出典 |
| 良い事例と結果 | `examples/` | DevFest Kansai 2026 の connpass ページ・コピー・skin・brief |
| 入力の形 | `references/brief.schema.json` | 全 Skill と pr アプリの brief が共有する |
| 下書きの形 | `references/draft-kinds.md` と各 Skill の `references/output.schema.json` | |
| 描画テンプレート | `templates/` | pr アプリの画像・ページ生成が使う |
| 却下した案 | `decisions.md` | 蒸し返さない |
| 採否待ちの教訓 | `proposals/` | **ガイダンスとして読まない** |

## 検査

```sh
node scripts/checks/run.mjs --kind <copy|x_post|ig_post|connpass_page|connpass_mail|asset_spec|plan> \
  --input draft.json --brief brief.json [--related related.json] [--no-yomiyasu] [--json]
```

MUST が 1 つでも fail なら exit 1。`JA-YOMIYASU` は `yomiyasu` skill（`YOMIYASU_DIR` か `~/.agents/skills/yomiyasu`）と `python3` があるときだけ
実行され、無ければ unevaluated。`review` のルールは常に unevaluated で、人が判断する。

Playbook 自体の整合は `node scripts/validate.mjs`、検査器のテストは `node --test scripts/checks/`。

## 教訓を足す

1. 会話や振り返りで出た Tips は、まず `proposals/<id>.json` に書く（`proposals/README.md` の形）
2. ユーザーが採用したら、`rules.json`（機械検査できるもの）・`constants.json`（数値）・`guides/`（判断基準）のうち最小の正本に入れ、
   `<!-- tips: n -->` と `source` に出典を書く
3. 採用しなかったものは `decisions.md` に理由とともに残す
