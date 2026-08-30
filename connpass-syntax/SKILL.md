---
name: connpass-syntax
description: Write or review connpass group and event descriptions using the Markdown, HTML tags, attributes, and inline CSS that connpass preserves. Use when preparing paste-ready connpass content or diagnosing stripped formatting.
---

# connpass Syntax

Create source that survives connpass's Markdown rendering and HTML/CSS sanitizer.

Read [references/syntax.md](references/syntax.md) before writing or reviewing connpass markup. It is
the source of truth for the supported syntax and the experimentally verified inline CSS allowlist.

Prefer Markdown for ordinary structure and inline formatting. Use raw HTML only for an effect that
Markdown cannot express, such as inline color, padding, borders, alignment, or explicit image size.
Put blank lines around block-level raw HTML so Markdown parsing remains predictable.

Before returning content:

- Remove or replace every tag, attribute, and CSS property absent from the reference.
- Use `background-color`, not `background`; use `border` or a side shorthand, not separate
  `border-width`, `border-style`, or `border-color` declarations.
- Use the `width` and `height` HTML attributes for images because the corresponding CSS properties
  are stripped.
- Do not generate `class`, `id`, `data-*`, event-handler attributes, `<style>`, scripts, embeds, or
  external stylesheets.
- Do not describe browser-supported CSS as connpass-supported unless it is in the verified list.
- If the requested presentation cannot be expressed with the allowlist, explain the limitation and
  offer the closest supported composition instead of emitting markup that connpass will strip.

Return paste-ready Markdown/HTML. Use a fenced code block only when presenting the source in chat;
do not include the fence itself in a file intended for direct upload or paste.
