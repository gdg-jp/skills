# 下書きの種類

pr アプリの `drafts.kind` と、検査器の `--kind`。形の正本は各 Skill の `references/output.schema.json`。

| kind | 作る Skill | 形 | 主な検査 |
|---|---|---|---|
| `copy` | pr-copy | `{ candidates[], notes }` | COPY-FROM-META-THEME, COPY-PER-MEDIUM, CP-TITLE-CONVEYS-CONTENT |
| `x_post` | pr-x-post（`channel: x`） | `{ channel, posts[], notes }` | X-NO-HASHTAG, X-FOLD-LINK-VISIBLE, X-IMAGE-VS-OGP, ANNOUNCE-AFTER-CONFIRMED |
| `ig_post` | pr-x-post（`channel: ig`） | 同上 | CHANNEL-SPECIFIC-COPY, IG-HASHTAGS |
| `connpass_page` | pr-connpass-page | `{ title, summary, sections[], html, imageSlots[], surveyQuestions[], participantOnlyInfo, skinSource, notes }` | CP-SUMMARY-3-LINES, CP-HTML-ALLOWLIST |
| `connpass_mail` | pr-connpass-mail | `{ purpose, subject, scheduledAt, bodyLines[], footer, notes }` | MAIL-SEND-TIME, MAIL-SHORT, MAIL-DECORATED |
| `asset_spec` | pr-asset（後続） | `{ templateId, slots, layoutVars, skinSource, rationaleMd }` | CP-THUMB-HAS-FACTS, BRAND-SKIN-DECLARED |
| `plan` | pr-plan | 計画 | SURVEY-STANDARD-QUESTIONS, REMIND-STAFF-BEFORE-POST, BUDGET-SPLIT ほか |

短縮リンクは本文に `{{shortlink}}` と書く。実 URL は pr アプリが配信時に差し込む。検査器は `{{shortlink}}` を URL（重み 23）として数える。

日本語の本文はすべて `JA-YOMIYASU` の対象になる（`html`、`rationaleMd`、`metaThemeMapping`、折りたたみの写しを除く）。
