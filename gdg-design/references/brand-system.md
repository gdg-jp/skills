# GDG visual system

This reference records the source material supplied with the skill. Exact asset geometry takes precedence over prose.

## Source hierarchy

1. Preserve `../assets/gdg.svg` exactly for the GDG mark.
2. Use the palette below for newly created design elements.
3. Use the ready-to-place SVGs in `../assets/stickers/` as the canonical decorative assets. Use matching PNGs in `../assets/stickers/png/` only when the target format cannot use SVG.
4. Use the reference images in `reference-images/` for composition cues, not as templates that must be copied.

The supplied SVGs contain small value differences from the palette: the logo uses `#EA4336` and `#FAAB00`, while the pastel-green decorative SVGs use `#CCF6CF`. Do not normalize those values inside the source assets. For newly drawn elements, use the palette values below.

## Color palette

| Family | Core | Halftone | Pastel |
| --- | --- | --- | --- |
| Blue | Blue 500 `#4285F4` | `#57CAFF` | `#C3ECF6` |
| Green | Green 500 `#34A853` | `#5CDB6D` | `#CCF6C5` |
| Yellow | Yellow 600 `#F9AB00` | `#FFD427` | `#FFE7A5` |
| Red | Red 500 `#EA4335` | `#FF7DAF` | `#F8D8D8` |

Neutrals:

- Off White: `#F0F0F0`
- Black 02: `#1E1E1E`

Use Off White as the characteristic ground and Black 02 for text and keylines. White may be used for nested content panels when separation is needed. Prefer solid fills; gradients, shadows, glass effects, texture, and glossy rendering are outside the supplied visual language.

Do not rely on color alone to convey categories or state. Check contrast for functional text and controls; pastel fills generally need Black 02 text.

## Typography

Use the Google Sans family only when the font files or an authorized font source are available for the target deliverable.

- **Google Sans Display:** large event names, campaign headlines, and expressive display text.
- **Google Sans Flex:** responsive or variable typography, UI, and layouts needing optical or width flexibility.
- **Google Sans:** supporting headings, labels, body copy, and UI copy.

Favor sentence case for messages and labels. Oversized, tightly composed display type is characteristic, but body copy should remain comfortably readable. Use weight contrast before introducing extra colors. Avoid unrelated display fonts, monospaced text as decoration, condensed all-caps paragraphs, or ornamental typography.

If the required font is unavailable, stop before final production and tell the user what is missing. A temporary system-font preview may be used only when clearly labeled as a preview.

## Logo

Use `../assets/gdg.svg` as the master mark. It is a square 100×100 viewBox containing the four interlocking capsule forms with a Black 02 outline.

- Keep its aspect ratio and internal colors.
- Place it on a calm, high-contrast area with clear space at least comparable to one capsule thickness when the format permits.
- Use a size at which the black keyline remains visible.
- Do not merge it into illustrations, use it as a letter, place copy over it, or treat its four pieces as a decorative kit.
- When a wordmark or chapter lockup is needed, use an official supplied lockup. Do not synthesize one from the icon and typed text.

## Shape and stroke language

The sticker assets combine two related modes:

- **Filled stickers:** chunky brackets, braces, arrows, slashes, semicolons, quotes, math operators, pills, scalloped capsules, and circular punctuation. They use core, halftone, or pastel fills with rounded Black 02 outlines.
- **Line symbols:** arrows, braces, brackets, globes, hash marks, angle brackets, asterisks, at-signs, parentheses, and punctuation in Black 02 with no fill.

Keep new geometry simple and typographic. Match the apparent keyline weight within a composition; use rounded joins and caps where the source shape does. Use repetition and mirroring intentionally. Avoid generic tech motifs such as neon circuitry, 3D chrome, glowing gradients, stock-code backgrounds, or random confetti.

Read [sticker-assets.md](sticker-assets.md) to select an individual asset. Do not extract it from a screenshot or redraw it when the corresponding SVG already exists.

## Composition

- Build with large modules: bordered panels, pills, rounded rectangles, bracketed titles, and isolated icon groups.
- Allow asymmetry while maintaining a visible grid and strong alignment.
- Use one or two oversized anchors, then smaller symbols as punctuation.
- Brackets and braces may frame a title, message, image, location, or year.
- Use thin Black 02 borders to organize sponsor grids and messaging cards.
- Keep negative space generous. A few confident shapes are more characteristic than a dense collage.
- Photography may sit inside a simple rounded or bracketed frame; do not tint or decorate it so heavily that the subject becomes unclear.

For event branding, the event name is the primary anchor, location and year are secondary modules, and the GDG identity is a distinct signature. Sponsor marks belong in clearly labeled, neutral containers and should not be recolored.
