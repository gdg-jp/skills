# Session-list input schema

The renderer accepts one UTF-8 JSON object containing `title`, `speakers`, and `sections`.

## Speakers

Speakers are keyed by stable IDs. `name` is required; `role` and HTTPS `image` are optional.

```json
{
  "speaker-id": {
    "name": "Speaker Name",
    "role": "One public role",
    "image": "https://img.gdgs.jp/example"
  }
}
```

## Sections and sessions

Sections appear in input order on mobile. `desktopColumn` assigns a section to desktop column 1 or
2 while preserving its order within that column. `color` is `blue`, `green`, `yellow`, or `red`.

```json
{
  "id": "talks",
  "heading": "TALKS",
  "color": "blue",
  "desktopColumn": 1,
  "sessions": [
    {
      "id": "session-one",
      "title": "Build safer AI agents on Kubernetes",
      "speakers": ["speaker-id"],
      "highlights": [
        { "text": "AI agents", "color": "blue" },
        { "text": "Kubernetes", "color": "red" }
      ]
    }
  ]
}
```

Section IDs and session IDs must be unique. Every speaker reference must exist. Each highlighted
string must occur exactly once in its session title; highlighted ranges may not overlap. This makes
emphasis deterministic without accepting arbitrary HTML.

Do not add sessions whose title is `TBA`. The validator rejects them so unfinished items cannot
leak into the exported overview.
