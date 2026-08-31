# Timetable input schema

The renderer accepts one UTF-8 JSON object with `title`, `tracks`, `speakers`, and `entries`.

## Tracks

Define one to four tracks in desktop display order:

```json
{ "id": "a", "label": "Track A", "color": "blue" }
```

`id` and `label` must be unique non-empty strings. `color` is one of `blue`, `green`, `yellow`, or
`red`, mapped to the GDG halftone header and pastel card colors. Mobile cards repeat the label so
color is never the only category indicator.

## Speakers

Speakers are keyed by stable IDs:

```json
{
  "speaker-id": {
    "name": "Speaker Name",
    "role": "One public role",
    "image": "https://img.gdgs.jp/example"
  }
}
```

Only `name` is required. Omit `role` or `image` when unavailable. Never use an invented portrait or
reserve an empty avatar area. Use HTTPS image URLs; the renderer embeds the downloaded bytes in the
standalone preview before taking the screenshot.

## Entries

Each entry represents its complete duration rather than spreadsheet continuation arrows:

```json
{
  "id": "session-one",
  "kind": "session",
  "title": "Session title",
  "start": "11:00",
  "end": "11:30",
  "tracks": ["a"],
  "speakers": ["speaker-id"],
  "note": "Optional short note"
}
```

- `kind` is `session`, `break`, or `logistics`.
- Times use zero-padded 24-hour `HH:MM` strings and must end after they start.
- Track IDs must be consecutive when an entry spans more than one track. Use every track ID for a
  shared break or logistics item.
- Entries may not overlap within one track.
- `speakers` and `note` are optional. Speaker IDs must exist in `speakers`.

Desktop layout uses start/end boundaries to create vertical spans. Mobile layout groups entries by
start time and orders them by track; long sessions appear once at their start rather than being
duplicated at every intermediate boundary.
