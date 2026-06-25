# -*- coding: utf-8 -*-
import pathlib
p = next(pathlib.Path(__file__).parent.glob("عقد*.html"))
text = p.read_text(encoding="utf-8")

def sub(a, b, label):
    global text
    if a not in text:
        raise SystemExit(f"MISSING {label}")
    text = text.replace(a, b, 1)

sub("""        try {
            const s = sessionStorage.getItem('bhd_ui_last_mode');
            if (s === 'contracts' || s === 'reservations' || s === 'forms' || s === 'users' || s === 'addressbook' || s === 'dashboard') return s;
        } catch (e) {}
        return 'dashboard';
    })();""", """        try {
            const s = sessionStorage.getItem('bhd_ui_last_mode')
                || localStorage.getItem('bhd_ui_last_mode');
            if (s === 'contracts' || s === 'reservations' || s === 'forms' || s === 'users' || s === 'addressbook' || s === 'dashboard') return s;
        } catch (e) {}
        return 'dashboard';
    })();""", "pageMode")

sub("""        try {
            sessionStorage.setItem('bhd_ui_last_mode', modeParam);
        } catch (e) {}
        window.history.replaceState({}, '', `${baseUrl}?mode=${modeParam}`);""", """        try {
            sessionStorage.setItem('bhd_ui_last_mode', modeParam);
            localStorage.setItem('bhd_ui_last_mode', modeParam);
        } catch (e) {}
        window.history.replaceState({}, '', `${baseUrl}?mode=${modeParam}`);""", "setWorkspaceMode storage")

sub("""                <div class="input-group">
                    <label data-ar="اسم الشركة" data-en="Company name">اسم الشركة / Company name</label>
                    <input type="text" id="abCoName" autocomplete="organization">
                </div>
                <div class="input-group">
                    <label data-ar="رقم السجل التجاري" data-en="Commercial registration (CR) no.">رقم السجل التجاري / Commercial registration (CR) no.</label>""", """                <div class="input-group">
                    <label data-ar="اسم الشركة" data-en="Company name">اسم الشركة / Company name</label>
                    <input type="text" id="abCoName" autocomplete="organization">
                </div>
                <div class="input-group">
                    <label data-ar="اسم الشركة بالإنجليزي" data-en="Company name (English)">اسم الشركة بالإنجليزي / Company name (English)</label>
                    <input type="text" id="abCoNameEn" autocomplete="organization" dir="ltr" lang="en">
                </div>
                <div class="input-group">
                    <label data-ar="رقم السجل التجاري" data-en="Commercial registration (CR) no.">رقم السجل التجاري / Commercial registration (CR) no.</label>""", "abCoNameEn HTML")

sub("'abCoName', 'abCoCrNo',", "'abCoName', 'abCoNameEn', 'abCoCrNo',", "disabled")

sub("""            set('abCoName', toStr(e.name));
            set('abCoCrNo', toStr(e.commercialRegNo));""", """            set('abCoName', toStr(e.name));
            set('abCoNameEn', toStr(e.nameEn));
            set('abCoCrNo', toStr(e.commercialRegNo));""", "fill company")

sub("""                name: read('abCoName'),
                commercialRegNo: read('abCoCrNo'),""", """                name: read('abCoName'),
                nameEn: read('abCoNameEn'),
                commercialRegNo: read('abCoCrNo'),""", "save company")

sub("""                                type: 'company',
                                name: toStr(x.name),
                                companyAttachmentSchema: Number(x.companyAttachmentSchema) || 1,""", """                                type: 'company',
                                name: toStr(x.name),
                                nameEn: toStr(x.nameEn),
                                companyAttachmentSchema: Number(x.companyAttachmentSchema) || 1,""", "import company")

sub("""                nationality: toStr(old.nationality || r.nationality || 'عماني / Omani'),
                extraMobile: toStr(old.extraMobile || r.extraMobile),""", """                nationality: toStr(old.nationality || r.nationality || 'عماني / Omani'),
                nameEn: toStr(old.nameEn || r.nameEn),
                extraMobile: toStr(old.extraMobile || r.extraMobile),""", "merge nameEn")

# Table: company row - add English line after name div
sub("""                    <div style="margin-top:4px;font-weight:700">${escHtml(r.name || '')}</div>
                    <div style="font-size:11px;color:#5c6f7b">${t('س.ت.', 'CR')}: ${escHtml(r.commercialRegNo || '-')}</div>""", """                    <div style="margin-top:4px;font-weight:700">${escHtml(r.name || '')}</div>
                    ${toStr(r.nameEn) ? `<div style="font-size:11px;color:#6b7c88;direction:ltr">${escHtml(r.nameEn)}</div>` : ''}
                    <div style="font-size:11px;color:#5c6f7b">${t('س.ت.', 'CR')}: ${escHtml(r.commercialRegNo || '-')}</div>""", "table company")

# Filter - company contactText
sub("""                ? `company ${r.name} ${r.commercialRegNo} ${r.signatoryName} ${r.signatoryNationality} ${r.signatoryIdNo}`.toLowerCase()""", """                ? `company ${r.name} ${r.nameEn} ${r.commercialRegNo} ${r.signatoryName} ${r.signatoryNationality} ${r.signatoryIdNo}`.toLowerCase()""", "filter company")

# Print - detailCell company
sub("""            const detailCell = r.type === 'company'
                ? `${escHtml(r.name || '')}<br><small>${escHtml(toStr(r.commercialRegNo || '-'))} | ${escHtml(r.signatoryName || '-')}</small>`
                : `${escHtml(r.name || '')}<br><small>${escHtml(r.nationality || '-')} | ID: ${escHtml(r.idNo || '-')}</small>`;""", """            const detailCell = r.type === 'company'
                ? `${escHtml(r.name || '')}${toStr(r.nameEn) ? `<br><small style="direction:ltr">${escHtml(r.nameEn)}</small>` : ''}<br><small>${escHtml(toStr(r.commercialRegNo || '-'))} | ${escHtml(r.signatoryName || '-')}</small>`
                : `${escHtml(r.name || '')}<br><small>${escHtml(r.nationality || '-')} | ID: ${escHtml(r.idNo || '-')}</small>`;""", "print company")

# Related info - company line
sub("""        if (entry.type === 'company') {
            host.innerHTML = `<strong>${t('بيانات الشركة', 'Company details')}:</strong><br>${escHtml(t('السجل التجاري', 'CR'))}: ${escHtml(entry.commercialRegNo || '-')}` +
                ` | ${escHtml(t('المفوض', 'Signatory'))}: ${escHtml(entry.signatoryName || '-')}`;
            return;
        }""", """        if (entry.type === 'company') {
            const enLine = toStr(entry.nameEn) ? `<br><small style="direction:ltr">${escHtml(entry.nameEn)}</small>` : '';
            host.innerHTML = `<strong>${t('بيانات الشركة', 'Company details')}:</strong>${enLine}<br>${escHtml(t('السجل التجاري', 'CR'))}: ${escHtml(entry.commercialRegNo || '-')}` +
                ` | ${escHtml(t('المفوض', 'Signatory'))}: ${escHtml(entry.signatoryName || '-')}`;
            return;
        }""", "related info")

p.write_text(text, encoding="utf-8")
print("OK")
