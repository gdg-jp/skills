# Individual sticker assets

Use the SVGs in `../assets/stickers/` when the target supports vector graphics. Each file preserves the source vectors and styles, has a tight normalized `viewBox`, and includes 8 source units of transparent padding.

Matching transparent PNGs are in `../assets/stickers/png/` with the same basename. Each PNG is sRGB and 1024 pixels on its longest edge. Prefer SVG for scalable layouts and PNG for raster-only tools or exports.

Open [sticker-assets.png](sticker-assets.png) for a visual index.

## Filled shapes

- `01-ellipsis-green.svg`
- `02-square-brackets-filled-pastel-yellow.svg`
- `03-pill-pastel-blue.svg`
- `04-arrow-right-yellow.svg`
- `05-double-slash-blue.svg`
- `06-brace-left-pastel-green.svg`
- `07-brace-right-pastel-green.svg`
- `08-equals-blue.svg`
- `09-scalloped-pill-pastel-red.svg`
- `10-opening-quotes-green.svg`
- `11-closing-quotes-green.svg`
- `12-colon-blue.svg`
- `13-period-red.svg`
- `14-chevron-right-pink.svg`
- `15-chevron-left-pink.svg`
- `33-parenthesis-right-pink.svg`
- `34-parenthesis-left-yellow.svg`
- `35-multiply-pink.svg`
- `36-hash-green.svg`
- `37-plus-red.svg`
- `38-semicolon-yellow.svg`
- `39-plus-blue.svg`

## Outline shapes

- `16-hash-outline.svg`
- `17-brace-right-outline.svg`
- `18-brace-left-outline.svg`
- `19-equals-outline.svg`
- `20-at-sign-outline.svg`
- `21-multi-brace-left-outline.svg`
- `22-multi-brace-right-outline.svg`
- `23-triple-brace-left-outline.svg`
- `24-triple-brace-right-outline.svg`
- `25-parentheses-outline.svg`
- `26-square-brackets-outline.svg`
- `27-asterisk-outline.svg`
- `28-double-slash-outline.svg`
- `29-semicolon-colon-outline.svg`
- `30-arrow-right-outline.svg`
- `31-less-than-three-outline.svg`
- `32-angle-brackets-outline.svg`
- `40-globe-outline.svg`

Use paired left/right assets together when framing content, but keep them as separate files so their spacing can adapt to the layout. Do not alter internal stroke widths independently of the asset's overall scale.

## PNG regeneration

Regenerate the PNG derivatives after changing an individual SVG with:

```bash
python3 scripts/render_sticker_pngs.py assets/stickers assets/stickers/png --force
```

The script renders every top-level SVG in the input directory and ignores subdirectories.
