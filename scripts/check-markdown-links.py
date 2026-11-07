#!/usr/bin/env python3
"""Check relative Markdown links and image paths without network access."""
from pathlib import Path
import re, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
for md in ROOT.rglob("*.md"):
    if any(p in {".git","node_modules"} for p in md.parts): continue
    source=md.read_text(encoding="utf-8")
    source=re.sub(r"(?ms)^\x60\x60\x60.*?^\x60\x60\x60[^\n]*$","",source)
    for target in re.findall(r"!?(?:\[[^\]]*\])\(([^)]+)\)",source):
        target=target.split()[0].strip("<>")
        if not target or target.startswith(("http://","https://","mailto:","#")): continue
        path=target.split("#",1)[0].split("?",1)[0]
        if path and not (md.parent/path).resolve().exists(): errors.append(f"{md.relative_to(ROOT)}: broken link -> {target}")
if errors: print("\n".join(errors)); sys.exit(1)
print("Markdown local-link check passed.")
