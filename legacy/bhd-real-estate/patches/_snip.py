from pathlib import Path
t = Path(next(Path(".").glob("*.html"))).read_text(encoding="utf-8")
i = t.find("insightToolbarFiltersAndPrint('buildings'")
print(repr(t[i : i + 350]))
