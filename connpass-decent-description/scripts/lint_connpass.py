#!/usr/bin/env python3
"""Check connpass event-description markup before it is pasted.

Two classes of problem are reported.

ERROR   The connpass sanitizer deletes this. The page renders, but not the way
        it looked locally -- and the most damaging cases are silent, so the
        author only finds out after publishing.

WARNING The sanitizer keeps this, but it breaks a GDG rule: panels nested more
        than one level deep, single-side accent rules, or non-Black-02 text on
        a pastel fill.

Usage:
    lint_connpass.py FILE [FILE ...]
    lint_connpass.py --extract-fences FILE.md [FILE.md ...]
    lint_connpass.py --self-test

Exit code is 1 when any ERROR or WARNING was reported, 0 otherwise.
"""

from __future__ import annotations

import argparse
import re
import sys
from html.parser import HTMLParser

# --- connpass allowlists -------------------------------------------------
# Source of truth: skills/connpass-syntax/references/syntax.md
# Kept in sync by hand; when that reference is re-measured, update this too.

ALLOWED_TAGS: dict[str, set[str]] = {
    "b": {"style", "align"},
    "blockquote": {"style"},
    "em": {"style", "align"},
    "strong": {"style", "align"},
    "strike": {"style", "align"},
    "del": set(),
    "a": {"href", "title", "rel"},
    "i": {"style", "align"},
    "br": set(),
    "ul": set(),
    "ol": set(),
    "li": set(),
    "u": set(),
    "pre": set(),
    "code": set(),
    "p": {"style", "align"},
    "h1": {"style"},
    "h2": {"style"},
    "h3": {"style"},
    "h4": {"style"},
    "h5": {"style"},
    "h6": {"style"},
    "hr": {"style"},
    "span": {"style"},
    "div": {"style", "align"},
    "font": {"size", "style", "color"},
    "table": {"style", "border"},
    "thead": set(),
    "tbody": set(),
    "tfoot": set(),
    "th": {"align", "style", "colspan", "rowspan"},
    "td": {"align", "style", "colspan", "rowspan"},
    "tr": {"style"},
    "img": {"src", "alt", "title", "width", "height", "style"},
}

ALLOWED_CSS = {
    "color", "background-color",
    "font-size", "font-style", "font-weight",
    "text-align", "text-decoration",
    "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "border", "border-top", "border-right", "border-bottom", "border-left",
}

# Stripped properties that authors reach for most, with the supported substitute.
KNOWN_SUBSTITUTES = {
    "border-radius": "square corners are fine; add roundness with a GDG sticker image",
    "border-color": "fold width/style/color into the `border` shorthand",
    "border-width": "fold width/style/color into the `border` shorthand",
    "border-style": "fold width/style/color into the `border` shorthand",
    "border-collapse": "design each cell as a standalone chip; the gaps are load-bearing",
    "border-spacing": "design each cell as a standalone chip; the gaps are load-bearing",
    "width": "use the `width` HTML attribute on <img>",
    "height": "use the `height` HTML attribute on <img>",
    "max-width": "use the `width` HTML attribute on <img>",
    "line-height": "split the text into separate <p> blocks",
    "display": "center images with `text-align:center` on the parent",
    "float": "lay content side by side with a borderless table",
    "object-fit": "crop the source image before uploading it",
    "white-space": "insert <br/> where the break must happen",
    "clip-path": "not available; drop the effect",
    "box-shadow": "not available; use a `border` instead",
    "font-family": "not available; connpass sets the font",
}

# --- GDG palette ---------------------------------------------------------
# Source of truth: skills/gdg-design/references/brand-system.md

PASTELS = {"#c3ecf6", "#ccf6c5", "#ffe7a5", "#f8d8d8"}
BLACK_02 = "#1e1e1e"

# Panel fills. White is the panel ground; Off White is the page ground behind
# them. Any other fill on a div-level element is a coloured panel, which the
# GDG rules reserve for table cells.
PANEL_FILLS = {"#ffffff", "#fff", "#f0f0f0", "white", "transparent"}

# Only div-level containers count as panels. A coloured <td> is content inside a
# panel -- that is where the timetable's track colours live -- and an <img>
# keyline or <span> highlight is not a panel either, so counting any of them
# would bury the real nesting problems in noise.
PANEL_TAGS = {"div", "blockquote", "p"}
VOID_TAGS = {"img", "br", "hr"}

SIDE_BORDERS = ("border-top", "border-right", "border-bottom", "border-left")
BLANK_BORDER = re.compile(r"^(none|0|0px)\b", re.I)


def parse_style(raw: str) -> list[tuple[str, str]]:
    """Split a style attribute into (property, value) pairs, lowercased names."""
    out = []
    for decl in raw.split(";"):
        if ":" not in decl:
            continue
        name, _, value = decl.partition(":")
        name = name.strip().lower()
        if name:
            out.append((name, value.strip()))
    return out


class Finding:
    def __init__(self, level: str, line: int, message: str):
        self.level = level
        self.line = line
        self.message = message

    def __str__(self) -> str:
        return f"  line {self.line:>4}  {self.level:<7} {self.message}"


class ConnpassLinter(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.findings: list[Finding] = []
        self.open_tags: list[str] = []
        self.panel_depth = 0
        self.panel_stack: list[str] = []

    # -- reporting --------------------------------------------------------

    def error(self, msg: str) -> None:
        self.findings.append(Finding("ERROR", self.getpos()[0], msg))

    def warn(self, msg: str) -> None:
        self.findings.append(Finding("WARNING", self.getpos()[0], msg))

    # -- checks -----------------------------------------------------------

    def check_attributes(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        allowed = ALLOWED_TAGS[tag]
        for name, _ in attrs:
            name = name.lower()
            if name in allowed:
                continue
            if name.startswith("on"):
                self.error(f"<{tag}> has event handler `{name}` -- removed by the sanitizer")
            elif name.startswith("data-"):
                self.error(f"<{tag}> has `{name}` -- data-* attributes are removed")
            elif name in ("class", "id"):
                self.error(
                    f"<{tag}> has `{name}` -- connpass strips it, so every style must be inline"
                )
            else:
                self.error(f"<{tag}> does not allow attribute `{name}`")

    def check_style(self, tag: str, style: str) -> dict[str, str]:
        """Report stripped declarations; return the surviving ones."""
        kept: dict[str, str] = {}
        for name, value in parse_style(style):
            if name in ALLOWED_CSS:
                kept[name] = value
                continue
            hint = KNOWN_SUBSTITUTES.get(name)
            if name in ("border-width", "border-style", "border-color"):
                self.error(
                    f"<{tag}> uses `{name}` -- all three longhands are stripped, so the "
                    f"border disappears entirely; {hint}"
                )
            elif hint:
                self.error(f"<{tag}> uses `{name}` -- stripped; {hint}")
            else:
                self.error(f"<{tag}> uses `{name}` -- not in the 22 supported properties")
        return kept

    def check_brand(self, tag: str, kept: dict[str, str]) -> None:
        sides = [s for s in SIDE_BORDERS if s in kept and not BLANK_BORDER.match(kept[s])]
        if sides and "border" not in kept:
            self.warn(
                f"<{tag}> draws only `{sides[0]}` -- single-side accent rules are not in the "
                f"GDG vocabulary; use `border:2px solid <Core>` with a pastel fill"
            )

        bg = kept.get("background-color", "").strip().lower()
        fg = kept.get("color", "").strip().lower()
        if bg in PASTELS and fg and fg != BLACK_02:
            self.warn(
                f"<{tag}> puts `{fg}` text on the pastel fill {bg} -- pastel fills carry "
                f"Black 02 (#1E1E1E) text"
            )
        if tag in PANEL_TAGS and bg and bg not in PANEL_FILLS:
            self.warn(
                f"<{tag}> has the fill {bg} -- panels are white with a Black 02 keyline; "
                f"colour belongs in table cells where it encodes a category"
            )

    def is_panel(self, tag: str, kept: dict[str, str]) -> bool:
        if tag not in PANEL_TAGS:
            return False
        if "background-color" in kept:
            return True
        return any(
            key in kept and not BLANK_BORDER.match(kept[key])
            for key in ("border",) + SIDE_BORDERS
        )

    # -- HTMLParser hooks -------------------------------------------------

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag not in ALLOWED_TAGS:
            self.error(f"<{tag}> is not an allowed tag -- connpass removes it")
            if tag not in VOID_TAGS:
                self.open_tags.append(tag)
                self.panel_stack.append("")
            return

        self.check_attributes(tag, attrs)
        style = ""
        for name, value in attrs:
            if name.lower() == "style" and value:
                style = value
        kept = self.check_style(tag, style) if style else {}
        if kept:
            self.check_brand(tag, kept)

        panel = self.is_panel(tag, kept)
        if panel:
            self.panel_depth += 1
            if self.panel_depth > 2:
                self.warn(
                    f"<{tag}> is a panel nested {self.panel_depth} deep -- the ground div "
                    f"plus one panel is the limit; place panels as siblings instead"
                )

        if tag not in VOID_TAGS:
            self.open_tags.append(tag)
            self.panel_stack.append(tag if panel else "")
        elif panel:
            self.panel_depth -= 1

    def handle_startendtag(self, tag, attrs):
        tag = tag.lower()
        before = len(self.open_tags)
        self.handle_starttag(tag, attrs)
        # A self-closing tag never stays open.
        while len(self.open_tags) > before:
            self.open_tags.pop()
            if self.panel_stack.pop():
                self.panel_depth -= 1

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in VOID_TAGS or tag not in self.open_tags:
            return
        while self.open_tags:
            open_tag = self.open_tags.pop()
            if self.panel_stack.pop():
                self.panel_depth -= 1
            if open_tag == tag:
                break

    def handle_decl(self, decl):
        self.error(f"<!{decl.split()[0]}> declaration -- connpass content is a fragment, not a document")


def lint_source(source: str) -> list[Finding]:
    linter = ConnpassLinter()
    linter.feed(source)
    linter.close()
    return sorted(linter.findings, key=lambda f: (f.line, f.level))


FENCE_OPEN = re.compile(r"^\s*(```+|~~~+)[ \t]*([A-Za-z0-9_+-]*)[ \t]*$")


def extract_fences(source: str) -> str:
    """Keep only ```html fenced blocks, blanking everything else.

    Line numbers are preserved so findings still point at the real line. Every
    fence is tracked, not just the HTML ones -- otherwise a ```bash block's
    closing fence would be mistaken for an opening one and the prose after it
    would be linted as markup.
    """
    lines = source.splitlines()
    out = [""] * len(lines)
    marker = ""
    language = ""
    for index, line in enumerate(lines):
        match = FENCE_OPEN.match(line)
        if marker:
            if match and match.group(1).startswith(marker) and not match.group(2):
                marker = ""
                language = ""
            elif language == "html":
                out[index] = line
            continue
        if match and match.group(2):
            marker = match.group(1)
            language = match.group(2).lower()
        elif match:
            marker = match.group(1)
            language = ""
    return "\n".join(out)


MARKDOWN_SUFFIXES = (".md", ".markdown", ".mdown")


def run(paths: list[str], fences: bool) -> int:
    total_errors = 0
    total_warnings = 0
    for path in paths:
        with open(path, encoding="utf-8") as handle:
            source = handle.read()
        # A Markdown file is prose with markup inside it. Linting the prose as
        # HTML flags things like `<Core>` written inside backticks, so only the
        # ```html blocks are checked unless the caller says otherwise.
        if fences or path.lower().endswith(MARKDOWN_SUFFIXES):
            source = extract_fences(source)
        findings = lint_source(source)
        errors = sum(1 for f in findings if f.level == "ERROR")
        warnings = len(findings) - errors
        total_errors += errors
        total_warnings += warnings
        if findings:
            print(f"{path}: {errors} error(s), {warnings} warning(s)")
            for finding in findings:
                print(finding)
        else:
            print(f"{path}: clean")
    print(f"\nTotal: {total_errors} error(s), {total_warnings} warning(s)")
    return 1 if (total_errors or total_warnings) else 0


# --- regression cases ----------------------------------------------------
# These pin the failures that are invisible in a browser but fatal on connpass,
# plus the boundaries where the brand checks must stay quiet.

SELF_TESTS: list[tuple[str, str, str | None]] = [
    (
        "border longhands vanish silently",
        '<div style="border-width:1px; border-style:solid; border-color:#000">x</div>',
        "border disappears entirely",
    ),
    (
        "border-radius is stripped",
        '<div style="border-radius:30px">x</div>',
        "border-radius",
    ),
    (
        "CSS width is stripped",
        '<img src="https://img.gdgs.jp/gdg-logo" alt="" style="width:100%" />',
        "`width` HTML attribute",
    ),
    (
        "img width/height attributes are fine",
        '<img src="https://img.gdgs.jp/gdg-logo" alt="GDG" width="1000" height="500" />',
        None,
    ),
    (
        "ground div plus one white panel is allowed",
        '<div style="background-color:#F0F0F0; padding:16px;">'
        '<div style="border:2px solid #1E1E1E; background-color:#FFFFFF;">x</div></div>',
        None,
    ),
    (
        "a panel inside a panel is flagged",
        '<div style="background-color:#F0F0F0;">'
        '<div style="border:2px solid #1E1E1E; background-color:#FFFFFF;">'
        '<div style="border:2px solid #1E1E1E; background-color:#FFFFFF;">x</div></div></div>',
        "nested 3 deep",
    ),
    (
        "sibling panels stay under the limit",
        '<div style="background-color:#F0F0F0;">'
        '<div style="border:2px solid #1E1E1E; background-color:#FFFFFF;">a</div>'
        '<div style="border:2px solid #1E1E1E; background-color:#FFFFFF;">b</div></div>',
        None,
    ),
    (
        "a coloured panel is flagged",
        '<div style="background-color:#F0F0F0;">'
        '<div style="border:2px solid #4285F4; background-color:#C3ECF6;">x</div></div>',
        "panels are white",
    ),
    (
        "timetable cells may carry track colour inside a white panel",
        '<div style="background-color:#F0F0F0;">'
        '<div style="border:2px solid #1E1E1E; background-color:#FFFFFF; padding:16px;">'
        '<table border="0"><tbody><tr>'
        '<td style="border:2px solid #4285F4; background-color:#C3ECF6; color:#1E1E1E;">x</td>'
        "</tr></tbody></table></div></div>",
        None,
    ),
    (
        "single-side accent rule is flagged",
        '<div style="border-left:6px solid #4285F4; padding:8px;">x</div>',
        "single-side accent rules",
    ),
    (
        "border:none is not an accent rule",
        '<td style="border:none; padding:0;">x</td>',
        None,
    ),
    (
        "speaker icon keyline is not a panel",
        '<div style="background-color:#F0F0F0;">'
        '<div style="border:2px solid #1E1E1E; background-color:#FFFFFF;">'
        '<table border="0"><tbody><tr><td style="border:none;">'
        '<img src="https://img.gdgs.jp/gdg-logo" alt="" width="160" '
        'style="border:3px solid #4285F4;" /></td></tr></tbody></table></div></div>',
        None,
    ),
    (
        "non-Black-02 text on a pastel cell is flagged",
        '<td style="background-color:#FFE7A5; color:#4285F4;">x</td>',
        "Black 02",
    ),
    (
        "class is stripped",
        '<div class="card">x</div>',
        "connpass strips it",
    ),
    (
        "style element is not allowed",
        "<style>.card{color:red}</style>",
        "not an allowed tag",
    ),
    (
        "event handlers are stripped",
        '<div onclick="go()">x</div>',
        "event handler",
    ),
]


def self_test() -> int:
    failures = 0
    for name, source, expected in SELF_TESTS:
        findings = lint_source(source)
        blob = " ".join(f.message for f in findings)
        if expected is None:
            ok = not findings
        else:
            ok = expected in blob
        print(f"{'PASS' if ok else 'FAIL'}  {name}")
        if not ok:
            failures += 1
            for finding in findings:
                print(finding)
            if expected:
                print(f"    expected to see: {expected}")
    print(f"\n{len(SELF_TESTS) - failures}/{len(SELF_TESTS)} passed")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", help="HTML or Markdown files to check")
    parser.add_argument(
        "--extract-fences",
        action="store_true",
        help="check only ```html blocks (applied automatically to .md files)",
    )
    parser.add_argument("--self-test", action="store_true", help="run the regression cases")
    args = parser.parse_args()

    if args.self_test:
        return self_test()
    if not args.paths:
        parser.error("give at least one file, or --self-test")
    return run(args.paths, args.extract_fences)


if __name__ == "__main__":
    sys.exit(main())
