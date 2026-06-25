# -*- coding: utf-8 -*-
"""Replace insight toolbar + add header sort + filter lens panel."""
from pathlib import Path

p = next(Path(".").glob("*.html"))
t = p.read_text(encoding="utf-8")

if "let insightFilterPanelOpen" not in t:
    t = t.replace(
        "    let insightFilterState = {};",
        "    let insightFilterState = {};\n    let insightFilterPanelOpen = {};",
        1,
    )

OLD_HELPERS = """    function insightOnBuildingChange(mode, val) {
        insightGetFilter(mode).building = val || 'all';
        renderInsightContent();
    }
    function insightOnSearchInput(mode, el) {
        insightGetFilter(mode).search = toStr(el && el.value);
        renderInsightContent();
    }
    function insightOnSortKeyChange(mode, val) {
        insightGetFilter(mode).sortKey = val;
        renderInsightContent();
    }
    function insightOnSortDirChange(mode, val) {
        insightGetFilter(mode).sortDir = val === 'desc' ? 'desc' : 'asc';
        renderInsightContent();
    }
    function insightToolbarHtml(mode, options) {
        const st = insightGetFilter(mode);
        const opts = options || {};
        const buildings = [...new Set(getUnitsData().map((u) => u.building).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
        const showB = opts.showBuilding !== false;
        const showS = opts.showSearch !== false;
        const showSort = opts.sortKeys && opts.sortKeys.length;
        const bSel = showB
            ? `<label style="font-size:12px;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;margin-inline-end:8px">المبنى / Building <select onchange="insightOnBuildingChange('${mode}', this.value)"><option value="all" ${st.building === 'all' ? 'selected' : ''}>كل المباني / All</option>${buildings.map((b) => `<option value="${escHtml(b)}" ${st.building === b ? 'selected' : ''}>${escHtml(b)}</option>`).join('')}</select></label>`
            : '';
        const search = showS
            ? `<label style="font-size:12px;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;margin-inline-end:8px">بحث / Search <input type="search" value="${escHtml(st.search)}" placeholder="نص… / Text…" onchange="insightOnSearchInput('${mode}', this)" style="min-width:160px"></label>`
            : '';
        const sort = showSort
            ? `<label style="font-size:12px;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;margin-inline-end:8px">ترتيب حسب / Sort by <select onchange="insightOnSortKeyChange('${mode}', this.value)">${opts.sortKeys.map((sk) => `<option value="${escHtml(sk.key)}" ${st.sortKey === sk.key ? 'selected' : ''}>${escHtml(sk.lab)}</option>`).join('')}</select></label><label style="font-size:12px;display:inline-flex;align-items:center;gap:6px">الاتجاه / Dir <select onchange="insightOnSortDirChange('${mode}', this.value)"><option value="asc" ${st.sortDir === 'asc' ? 'selected' : ''}>تصاعدي / Asc</option><option value="desc" ${st.sortDir === 'desc' ? 'selected' : ''}>تنازلي / Desc</option></select></label>`
            : '';
        const printBtn = opts.hidePrint ? '' : `<button type="button" class="btn-outline mini-btn" onclick="openPropertyPrintMenu('insight')">🖨️ طباعة التقرير / Print report</button>`;
        const extra = opts.extraHtml || '';
        return `<div class="insight-filter-bar" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:12px;width:100%;padding:10px 12px;background:#faf6f8;border-radius:10px;border:1px solid #e5d4da">${bSel}${search}${sort}${extra}${printBtn}</div>`;
    }"""

NEW_HELPERS = """    function insightOnBuildingChange(mode, val) {
        insightGetFilter(mode).building = val || 'all';
        renderInsightContent();
    }
    function insightOnSearchInput(mode, el) {
        insightGetFilter(mode).search = toStr(el && el.value);
        renderInsightContent();
    }
    function insightToggleFilterPanel(mode) {
        insightFilterPanelOpen[mode] = !insightFilterPanelOpen[mode];
        renderInsightContent();
    }
    function insightHeadSortClick(mode, key) {
        const st = insightGetFilter(mode);
        if (st.sortKey === key) {
            st.sortDir = st.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            st.sortKey = key;
            st.sortDir = 'asc';
        }
        renderInsightContent();
    }
    function insightSortIndicator(mode, key) {
        const st = insightGetFilter(mode);
        if (st.sortKey !== key) return '↕';
        return st.sortDir === 'asc' ? '↑' : '↓';
    }
    function insightThSort(mode, key, labelHtml) {
        const ind = insightSortIndicator(mode, key);
        return `<th><span class="sort-head insight-sort-head" role="button" tabindex="0" onclick="insightHeadSortClick('${mode}','${key}')">${labelHtml} <span class="sort-indicator">${ind}</span></span></th>`;
    }
    function insightToolbarFiltersAndPrint(mode, options) {
        const st = insightGetFilter(mode);
        const opts = options || {};
        const buildings = [...new Set(getUnitsData().map((u) => u.building).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
        const showB = opts.showBuilding !== false;
        const showS = opts.showSearch !== false;
        const open = !!insightFilterPanelOpen[mode];
        const panel = open && (showB || showS)
            ? `<div class="insight-filter-panel" style="width:100%;margin-top:8px;padding:10px 12px;background:#fff;border:1px solid #ddd;border-radius:8px;display:flex;flex-wrap:wrap;gap:10px;align-items:center">
                ${showB ? `<label style="font-size:12px;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap">المبنى / Building <select onchange="insightOnBuildingChange('${mode}', this.value)"><option value="all" ${st.building === 'all' ? 'selected' : ''}>كل المباني / All</option>${buildings.map((b) => `<option value="${escHtml(b)}" ${st.building === b ? 'selected' : ''}>${escHtml(b)}</option>`).join('')}</select></label>` : ''}
                ${showS ? `<label style="font-size:12px;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap">بحث / Search <input type="search" value="${escHtml(st.search)}" placeholder="نص… / Text…" onchange="insightOnSearchInput('${mode}', this)" style="min-width:180px"></label>` : ''}
            </div>`
            : '';
        const printBtn = opts.hidePrint ? '' : `<button type="button" class="btn-outline mini-btn" onclick="openPropertyPrintMenu('insight')">🖨️ طباعة التقرير / Print report</button>`;
        const lens = opts.showFilterToggle === false
            ? ''
            : `<button type="button" class="btn-outline mini-btn" onclick="insightToggleFilterPanel('${mode}')" title="إظهار أو إخفاء الفلاتر / Toggle filters">${open ? '▼' : '🔍'} فلاتر / Filters</button>`;
        const extra = opts.extraHtml || '';
        return `<span style="display:flex;flex-direction:column;width:100%;gap:0;align-items:stretch">
            <span style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
                ${lens}${extra}${printBtn}
            </span>
            ${panel}
        </span>`;
    }"""

if OLD_HELPERS not in t:
    raise SystemExit("OLD_HELPERS block not found")
t = t.replace(OLD_HELPERS, NEW_HELPERS, 1)

# Replace toolbar calls: insightToolbarHtml( -> insightToolbarFiltersAndPrint(
t = t.replace("insightToolbarHtml(", "insightToolbarFiltersAndPrint(", 999)

# Remove sortKeys from options objects — regex remove lines with sortKeys
import re

def strip_sortkeys_block(s):
    return re.sub(r",\s*sortKeys:\s*\[[^\]]*\]", "", s, flags=re.DOTALL)

# Too risky. Manual: replace known patterns
patterns = [
    (r"insightToolbarFiltersAndPrint\('buildings',\s*\{\s*sortKeys:\s*\[[^\]]*\]\s*,\s*", "insightToolbarFiltersAndPrint('buildings', { "),
    (r"insightToolbarFiltersAndPrint\('owners',\s*\{\s*sortKeys:\s*\[[^\]]*\]\s*,\s*", "insightToolbarFiltersAndPrint('owners', { "),
]
for pat, repl in patterns:
    t2 = re.sub(pat, repl, t, count=1, flags=re.DOTALL)
    if t2 != t:
        t = t2
        print("pat ok", pat[:40])

# For multiline sortKeys - read file and fix each call manually with simpler approach: run multiple replaces

p.write_text(t, encoding="utf-8")
print("phase1 written")
