#!/usr/bin/env python3
"""Validate repository-local Markdown links, reference definitions, and heading fragments."""

from __future__ import annotations

from html import unescape
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SKIP_PARTS = {".git", "node_modules", ".terraform"}
INLINE_LINK = re.compile(r"!? \[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)".replace(" ", "", 1))
REFERENCE_DEFINITION = re.compile(r"(?m)^\s{0,3}\[([^\]]+)\]:\s*(<[^>]+>|\S+)")
REFERENCE_USE = re.compile(r"!?\[([^\]]+)\]\[([^\]]*)\]")
HTML_ID = re.compile(r"""\b(?:id|name)\s*=\s*["']([^"']+)["']""", re.IGNORECASE)


def without_code_fences(text: str) -> str:
    """Remove fenced code blocks (backticks or tildes), preserving line numbers."""
    kept: list[str] = []
    fence_char: str | None = None
    fence_size = 0
    backtick = re.escape(chr(96))

    for line in text.splitlines(keepends=True):
        match = re.match(r"^ {0,3}(" + backtick + r"{3,}|~{3,})", line)
        if fence_char is None:
            if match:
                fence_char = match.group(1)[0]
                fence_size = len(match.group(1))
                kept.append("\n" if line.endswith("\n") else "")
            else:
                kept.append(line)
            continue

        closing = r"^ {0,3}" + re.escape(fence_char) + "{" + str(fence_size) + r",}\s*$"
        if re.match(closing, line.rstrip("\n")):
            fence_char = None
            fence_size = 0
        kept.append("\n" if line.endswith("\n") else "")

    return "".join(kept)


def heading_slug(raw: str) -> str:
    """Approximate GitHub's automatic heading-anchor algorithm."""
    value = unescape(raw)
    value = re.sub(r"<[^>]+>", "", value)
    value = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", value)
    value = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", value)
    backtick = re.escape(chr(96))
    value = re.sub(backtick + r"+([^" + backtick + r"]+?)" + backtick + r"+", r"\1", value)
    value = value.lower()
    value = re.sub(r"[^\w -]", "", value, flags=re.UNICODE)
    value = re.sub(r"\s+", "-", value)
    return re.sub(r"-+", "-", value).strip("-")


def anchors_for(markdown_file: Path) -> set[str]:
    """Collect ATX/Setext heading slugs and explicit HTML id/name anchors."""
    source = markdown_file.read_text(encoding="utf-8")
    source = re.sub(r"(?s)<!--.*?-->", "", without_code_fences(source))
    anchors = {unescape(match.group(1)) for match in HTML_ID.finditer(source)}
    lines = source.splitlines()
    counts: dict[str, int] = {}

    for index, line in enumerate(lines):
        atx = re.match(r"^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$", line)
        title: str | None = atx.group(1) if atx else None
        if title is None and index + 1 < len(lines):
            if re.match(r"^ {0,3}(?:=+|-+)\s*$", lines[index + 1]) and line.strip():
                title = line.strip()
        if title is None:
            continue

        base = heading_slug(title)
        if not base:
            continue
        occurrence = counts.get(base, 0)
        counts[base] = occurrence + 1
        anchors.add(base if occurrence == 0 else f"{base}-{occurrence}")

    return anchors


def link_target(raw: str) -> str:
    """Extract a destination from angle-bracket or bare Markdown syntax."""
    target = raw.strip()
    if target.startswith("<") and ">" in target:
        return target[1 : target.index(">")]
    return target


def validate_target(source: Path, target: str, line_no: int, errors: list[str]) -> int:
    parsed = urlsplit(target)
    if parsed.scheme or target.startswith("//"):
        return 0

    relative_path = unquote(parsed.path)
    fragment = unquote(parsed.fragment)
    if relative_path:
        if relative_path.startswith("/"):
            candidate = (ROOT / relative_path.lstrip("/")).resolve()
        else:
            candidate = (source.parent / relative_path).resolve()
    else:
        candidate = source.resolve()

    try:
        candidate.relative_to(ROOT)
    except ValueError:
        errors.append(f"{source.relative_to(ROOT)}:{line_no}: link escapes repository -> {target}")
        return 1

    if candidate.is_dir():
        readme_candidates = (candidate / "README.md", candidate / "index.md")
        candidate = next((item for item in readme_candidates if item.is_file()), candidate)

    if not candidate.exists():
        errors.append(f"{source.relative_to(ROOT)}:{line_no}: broken local link -> {target}")
        return 1

    if fragment and candidate.is_file() and candidate.suffix.lower() in {".md", ".markdown"}:
        if re.fullmatch(r"L\d+(?:-L\d+)?", fragment):
            return 1
        anchors = anchors_for(candidate)
        if fragment not in anchors:
            errors.append(
                f"{source.relative_to(ROOT)}:{line_no}: missing heading/HTML anchor "
                f"'{fragment}' in {candidate.relative_to(ROOT)}"
            )
            return 1

    return 1


def main() -> int:
    markdown_files = [
        path for path in ROOT.rglob("*")
        if path.is_file()
        and path.suffix.lower() in {".md", ".markdown"}
        and not any(part in SKIP_PARTS for part in path.parts)
    ]
    errors: list[str] = []
    checked_links = 0

    for markdown_file in markdown_files:
        original = markdown_file.read_text(encoding="utf-8")
        source = re.sub(r"(?s)<!--.*?-->", "", without_code_fences(original))
        backtick = re.escape(chr(96))
        source = re.sub(backtick + r"+[^" + backtick + r"\n]*" + backtick + r"+", "", source)

        references: dict[str, str] = {}
        for match in REFERENCE_DEFINITION.finditer(source):
            label = re.sub(r"\s+", " ", match.group(1).strip()).casefold()
            if label in references:
                errors.append(f"{markdown_file.relative_to(ROOT)}: duplicate reference definition -> {label}")
            references[label] = link_target(match.group(2))

        for match in INLINE_LINK.finditer(source):
            target = link_target(match.group(1))
            if target:
                line_no = source.count("\n", 0, match.start()) + 1
                checked_links += validate_target(markdown_file, target, line_no, errors)

        for match in REFERENCE_DEFINITION.finditer(source):
            target = link_target(match.group(2))
            line_no = source.count("\n", 0, match.start()) + 1
            checked_links += validate_target(markdown_file, target, line_no, errors)

        for match in REFERENCE_USE.finditer(source):
            label = re.sub(r"\s+", " ", (match.group(2) or match.group(1)).strip()).casefold()
            if label not in references:
                line_no = source.count("\n", 0, match.start()) + 1
                errors.append(f"{markdown_file.relative_to(ROOT)}:{line_no}: undefined Markdown reference -> {label}")

    if errors:
        print("\n".join(errors))
        return 1

    print(
        f"Markdown reference check passed: {len(markdown_files)} files and "
        f"{checked_links} local destinations checked (including heading anchors)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
