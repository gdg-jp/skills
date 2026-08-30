# connpass supported syntax

This reference covers group and event description markup. The Markdown and HTML allowlists come
from the official connpass guide. The CSS list was measured against connpass's sanitizer on
2026-08-30; it is narrower than normal browser CSS support.

Official guide: <https://help.connpass.com/organizers/markdown>

## Markdown

Prefer these forms when they meet the need:

| Purpose | Syntax |
| --- | --- |
| Paragraph | Separate blocks with one or more blank lines |
| Headings | `#` through `######` |
| Emphasis | `*italic*` or `_italic_` |
| Strong | `**bold**` or `__bold__` |
| Strikethrough | `~~deleted~~` |
| Link | `[label](https://example.com/ "optional title")` |
| Bare URL | A URL is linked automatically |
| Unordered list | Lines beginning with `*`, `+`, or `-` |
| Ordered list | Lines beginning with `1.`, `2.`, and so on |
| Blockquote | Lines beginning with `>` |
| Inline code | Single backticks |
| Code block | Triple-backtick fences; a language identifier may follow the opening fence |
| Horizontal rule | Three or more `*`, `-`, or `_` characters in a valid rule form |
| Table | Pipe table with a separator row; colons set column alignment |
| Image | `![alt](https://example.com/image.png "optional title")` |

Use an HTML `img` tag when explicit image dimensions are required.

## Allowed HTML tags and attributes

Any attribute not listed here is removed. A dash means the tag accepts no attributes.
Attribute presence does not prove that every value or URL scheme is accepted. Use ordinary `https`
URLs for `href` and `src`; do not depend on `javascript:`, `data:`, or other active-content schemes.

| Tag | Allowed attributes |
| --- | --- |
| `b` | `style`, `align` |
| `blockquote` | `style` |
| `em` | `style`, `align` |
| `strong` | `style`, `align` |
| `strike` | `style`, `align` |
| `del` | — |
| `a` | `href`, `title`, `rel` |
| `i` | `style`, `align` |
| `br` | — |
| `ul` | — |
| `ol` | — |
| `li` | — |
| `u` | — |
| `pre` | — |
| `code` | — |
| `p` | `style`, `align` |
| `h1`–`h6` | `style` |
| `hr` | `style` |
| `span` | `style` |
| `div` | `style`, `align` |
| `font` | `size`, `style`, `color` |
| `table` | `style`, `border` |
| `thead` | — |
| `tbody` | — |
| `tfoot` | — |
| `th` | `align`, `style`, `colspan`, `rowspan` |
| `td` | `align`, `style`, `colspan`, `rowspan` |
| `tr` | `style` |
| `img` | `src`, `alt`, `title`, `width`, `height`, `style` |

Useful examples:

```html
<div style="background-color: #eef4ff; border-left: 4px solid #4285f4; padding: 12px;">
Important event information
</div>

<p style="text-align: center; color: #345; font-weight: 700;">Centered notice</p>

<img src="https://example.com/image.png" alt="Event diagram" width="600" height="338">
```

## Verified inline CSS

Only the following 22 property names survived the 2026-08-30 sanitizer probe:

| Group | Allowed properties |
| --- | --- |
| Color | `color`, `background-color` |
| Font | `font-size`, `font-style`, `font-weight` |
| Text | `text-align`, `text-decoration` |
| Margin | `margin`, `margin-top`, `margin-right`, `margin-bottom`, `margin-left` |
| Padding | `padding`, `padding-top`, `padding-right`, `padding-bottom`, `padding-left` |
| Border | `border`, `border-top`, `border-right`, `border-bottom`, `border-left` |

Property-name survival does not establish that every possible value is allowed. Prefer static,
ordinary color, length, alignment, font, and border values. Treat untested functions and unusual
URL-bearing values as unsupported until a dedicated value probe confirms them.

The probe confirmed these value behaviors:

- `color` preserved hexadecimal colors, named colors, legacy and modern `rgb()`, modern `hsl()`,
  `currentColor`, `inherit`, `initial`, `unset`, `revert`, and `!important`.
- A `var(--name)` reference was preserved syntactically, but custom-property declarations such as
  `--name: value` were removed. Do not rely on custom properties unless connpass itself defines the
  referenced name and its stability has been separately verified.
- Multiple allowed declarations and duplicate properties were preserved in their original order.
- An unknown declaration between allowed declarations was removed without discarding the allowed
  declarations around it.
- `color` survived on `span`, `p`, headings, `blockquote`, `b`, `font`, `table`, `tr`, `td`, and
  `hr`, showing that the property allowlist is not limited to one tested tag.

### Important rejected cases

The sanitizer removed all tested properties outside the 22-property list. Common traps include:

- `background`, `background-image`, gradients, and background sizing or positioning
- `font`, `font-family`, `line-height`, letter or word spacing, text shadow, and text transform
- `width`, `height`, minimum or maximum sizing, `box-sizing`, and `aspect-ratio`
- `border-color`, `border-width`, `border-style`, their side-specific longhands, `border-radius`,
  outlines, and box shadows
- `display`, flexbox, grid, gaps, floats, overflow, positioning, and `z-index`
- opacity, filters, transforms, transitions, animations, cursors, and user selection
- CSS logical properties such as `margin-inline`, `padding-block`, and `border-inline`
- CSS custom-property declarations and vendor-prefixed properties

For borders, combine width, style, and color in an allowed shorthand:

```html
<div style="border: 1px solid #dadce0; padding: 12px;">All sides</div>
<div style="border-left: 4px solid #34a853; padding-left: 12px;">Left accent</div>
```

Do not emit the following equivalent-looking form; every declaration is stripped:

```html
<div style="border-width: 1px; border-style: solid; border-color: #dadce0;">Stripped</div>
```

## Sanitizer implications

- `class` and `id` are unavailable, so every reusable-looking decoration must still be expressed
  inline on each allowed element.
- `<style>` is unavailable, so selectors, media queries, pseudo-elements, and keyframes cannot be
  used.
- A permitted `style` attribute may remain as `style=""` after all its declarations are removed.
- connpass may add wrapper paragraphs or normalize CSS semicolons while converting Markdown to
  HTML. Judge support by whether each declaration remains, not by byte-for-byte HTML equality.
