# -*- coding: utf-8 -*-
from pathlib import Path

p = next(Path(".").glob("*.html"))
t = p.read_text(encoding="utf-8")

def rep(old, new, label):
    global t
    if old not in t:
        raise SystemExit(f"MISS {label}")
    t = t.replace(old, new, 1)
    print("ok", label)

# Fix buildings + owners toolbar syntax
rep(
    """            if (toolbar) {
                toolbar.innerHTML = insightToolbarFiltersAndPrint('buildings', { extraHtml: '<button type="button" class="btn-outline mini-btn" onclick="openPropertyPrintMenu(\\'list\\')">🖨️ طباعة قائمة العقارات / Print list</button>'
                });
            }""",
    """            if (toolbar) {
                toolbar.innerHTML = insightToolbarFiltersAndPrint('buildings', { extraHtml: '<button type="button" class="btn-outline mini-btn" onclick="openPropertyPrintMenu(\\\\'list\\\\')">🖨️ طباعة قائمة العقارات / Print list</button>' });
            }""",
    "buildings toolbar",
)

# Actually onclick in HTML attribute uses single quotes - inside JS string we need \' for property print menu - the original was openPropertyPrintMenu(\'list\') - in Python we use double quotes for outer string. Let me read actual file bytes for buildings

p.write_text(t, encoding="utf-8")
print("saved partial")
