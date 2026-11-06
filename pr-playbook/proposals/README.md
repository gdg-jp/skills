# Playbook への提案

採否待ちの教訓。**ガイダンスではない。** Skill も pr アプリの束も、このディレクトリを読まない。

1 提案 = 1 ファイル `proposals/<id>.json`:

```json
{
  "id": "x-fold-threshold",
  "kind": "rule | constant | guide | template | example | decision",
  "target": "constants.json#/x/foldThreshold",
  "summary": "一言",
  "observation": "何が起きたか（どのキャンペーンのどの下書きで、人がどう直したか）",
  "evidence": ["根拠（下書きの差分、指標、振り返りの一文）"],
  "payload": {},
  "decision": null
}
```

ユーザーが採用したら、`target` の正本に反映して `decision: { status: "accepted", reviewer, reason }` を書き、正本にコミットしたらこのファイルを消す。
却下なら `decisions.md` に理由を書いてこのファイルを消す。
