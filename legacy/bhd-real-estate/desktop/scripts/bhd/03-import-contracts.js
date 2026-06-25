    // ========== استيراد/تصدير Excel منفصل: مباني، ملاك، وحدات ==========

    function bhdEnsureXlsxForBulkExchange() {
        if (typeof XLSX === 'undefined') {
            alert(t('⚠️ مكتبة Excel غير متاحة حالياً. تأكد من الاتصال أو أعد تشغيل التطبيق.', '⚠️ Excel library is not available. Check connection or restart the app.'));
            return false;
        }
        return true;
    }

    function bhdExcelInstructionRows(topicAr, topicEn, steps) {
        const head = [
            {
                'الموضوع / Topic': `${topicAr} / ${topicEn}`,
                'الخطوة / Step': '',
                'تعليمات عربي / Arabic': '',
                'Instructions English': ''
            }
        ];
        return head.concat(
            (steps || []).map((s, i) => ({
                'الموضوع / Topic': '',
                'الخطوة / Step': String(i + 1),
                'تعليمات عربي / Arabic': s.ar,
                'Instructions English': s.en
            }))
        );
    }

    function bhdWriteExcelWorkbook(filename, sheets) {
        const wb = XLSX.utils.book_new();
        (sheets || []).forEach((sh) => {
            const rows = Array.isArray(sh.rows) ? sh.rows : [];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), sh.name || 'Sheet1');
        });
        XLSX.writeFile(wb, filename);
    }

    function openBulkDataExchangeModal() {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية الاستيراد/التصدير.', 'No import/export permission.')) return;
        const el = document.getElementById('bulkDataExchangeModal');
        if (el) el.classList.add('open');
    }

    function closeBulkDataExchangeModal() {
        const el = document.getElementById('bulkDataExchangeModal');
        if (el) el.classList.remove('open');
    }

    function getBuildingsExcelSampleRow() {
        return buildingProfileToExcelMainRow('', getEmptyBuildingProfile());
    }

    function downloadBuildingsImportTemplate() {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية الاستيراد/التصدير.', 'No import/export permission.')) return;
        if (!bhdEnsureXlsxForBulkExchange()) return;
        const sample = getBuildingsExcelSampleRow();
        sample['مفتاح السجل / Record key'] = 'MQ Plot 369, Building 5240';
        sample['اسم العقار / Property name'] = 'MQ Plot 369, Building 5240';
        sample['نوع المبنى / Building type'] = 'متعدد الطوابق';
        sample['رقم القطعة / Plot no.'] = '369';
        sample['رقم المبنى / Building no.'] = '5240';
        bhdWriteExcelWorkbook('BHD_Buildings_Import_Template.xlsx', [
            {
                name: 'Instructions',
                rows: bhdExcelInstructionRows('المباني', 'Buildings', [
                    { ar: 'املأ ورقة Buildings — صف لكل مبنى. مفتاح السجل يجب أن يكون فريداً.', en: 'Fill Buildings sheet — one row per building. Record key must be unique.' },
                    { ar: 'يمكن ربط الملاك بأسمائهم في عمود «ملاك مرتبطون» مفصولة بـ ؛ أو |', en: 'Link owners in Linked owners column separated by ; or |' },
                    { ar: 'بعد الاستيراد أضف الوحدات من قسم الوحدات أو من شاشة تعديل العقار.', en: 'After import add units via Units section or property editor.' }
                ])
            },
            { name: 'Buildings', rows: [sample] }
        ]);
    }

    function exportBuildingsExcel() {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية تصدير البيانات.', 'No permission to export data.')) return;
        if (!bhdEnsureXlsxForBulkExchange()) return;
        loadDashboardAux();
        const keys = [...new Set([...buildingsList, ...Object.keys(buildingProfiles)])]
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'ar'));
        const rows = keys.map((k) => buildingProfileToExcelMainRow(k, buildingProfiles[k] || { ...getEmptyBuildingProfile(), name: k }));
        bhdWriteExcelWorkbook(`BHD_Buildings_Export_${new Date().toISOString().slice(0, 10)}.xlsx`, [
            {
                name: 'Instructions',
                rows: bhdExcelInstructionRows('المباني', 'Buildings', [
                    { ar: 'هذا تصدير لبيانات المباني الحالية. يمكن إعادة استيراده بعد التعديل.', en: 'Export of current buildings. Re-import after editing.' }
                ])
            },
            { name: 'Buildings', rows: rows.length ? rows : [getBuildingsExcelSampleRow()] }
        ]);
    }

    function importBuildingsExcel(file) {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية استيراد البيانات.', 'No permission to import data.')) return;
        if (!bhdEnsureXlsxForBulkExchange()) return;
        readWorkbook(file).then((wb) => {
            loadDashboardAux();
            const ws = wb.Sheets['Buildings'] || wb.Sheets['Buildings_Main'] || wb.Sheets[wb.SheetNames.find((n) => /building/i.test(n)) || ''];
            if (!ws) {
                alert(t('❌ لم يُعثر على ورقة Buildings في الملف.', '❌ Buildings sheet not found in file.'));
                return;
            }
            const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }).filter((row) => {
                const rk = toStr(excelPickRowField(row, ['مفتاح السجل', 'Record key']));
                const nm = toStr(excelPickRowField(row, ['اسم العقار', 'Property name']));
                return rk || nm;
            });
            if (!rows.length) {
                alert(t('⚠️ ورقة Buildings فارغة.', '⚠️ Buildings sheet is empty.'));
                return;
            }
            let count = 0;
            rows.forEach((mainRow) => {
                const { profile, recordKey, displayName } = buildingProfileFromExcelSheets(mainRow, {}, {});
                const finalName = displayName || recordKey;
                if (!finalName) return;
                const prev = buildingProfiles[finalName] || {};
                buildingProfiles[finalName] = {
                    ...profile,
                    floors: Array.isArray(prev.floors) && prev.floors.length ? prev.floors : profile.floors,
                    floorCount: Array.isArray(prev.floors) && prev.floors.length ? prev.floors.length : profile.floorCount
                };
                if (!buildingsList.includes(finalName)) buildingsList.push(finalName);
                const ownStr = toStr(excelPickRowField(mainRow, ['ملاك مرتبطون', 'Linked owners']));
                if (ownStr) applyExcelLinkedOwnersForBuilding(finalName, parseExcelOwnerList(ownStr));
                count++;
            });
            syncManagedUnitsFromProfiles();
            persistReferenceData(true);
            closeBulkDataExchangeModal();
            alert(t(`✅ تم استيراد/تحديث ${count} مبنى.`, `✅ Imported/updated ${count} building(s).`));
        }).catch((err) => {
            console.error(err);
            alert(t('❌ فشل قراءة ملف المباني.', '❌ Failed to read buildings file.'));
        });
    }

    function triggerBuildingsExcelImport() {
        const input = document.getElementById('bhdBuildingsExcelInput');
        if (input) {
            input.value = '';
            input.click();
        }
    }

    function ownerProfileToExcelRow(name) {
        const p = getEditableOwnerProfile(name);
        const attachment = normalizeOwnerAttachment(p.idCardAttachment);
        return {
            'اسم المالك الكامل / Full name': p.fullName || name,
            'الاسم الأول / First name': p.firstName || '',
            'الاسم الثاني / Second name': p.secondName || '',
            'الاسم الثالث / Third name': p.thirdName || '',
            'القبيلة / Tribe': p.tribe || '',
            'الرقم المدني / Civil ID': p.civilId || '',
            'تاريخ انتهاء البطاقة / ID expiry': p.idExpiryDate || '',
            'رقم الهاتف / Phone': p.phone || '',
            'البريد الإلكتروني / Email': p.email || '',
            'نسخة البطاقة — اسم الملف / ID card file name': attachment?.name || '',
            'المباني المرتبطة / Linked buildings (؛ أو |)': (ownerBuildingMap[name] || []).join(' | ')
        };
    }

    function getOwnersExcelSampleRow() {
        const row = ownerProfileToExcelRow('');
        Object.keys(row).forEach((k) => { row[k] = ''; });
        row['اسم المالك الكامل / Full name'] = 'أحمد بن سالم الهنائي';
        row['الرقم المدني / Civil ID'] = '12345678';
        row['المباني المرتبطة / Linked buildings (؛ أو |)'] = 'MQ Plot 369, Building 5240';
        return row;
    }

    function downloadOwnersImportTemplate() {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية الاستيراد/التصدير.', 'No import/export permission.')) return;
        if (!bhdEnsureXlsxForBulkExchange()) return;
        bhdWriteExcelWorkbook('BHD_Owners_Import_Template.xlsx', [
            {
                name: 'Instructions',
                rows: bhdExcelInstructionRows('الملاك', 'Owners', [
                    { ar: 'املأ ورقة Owners — صف لكل مالك. الاسم الكامل إلزامي.', en: 'Fill Owners sheet — one row per owner. Full name is required.' },
                    { ar: 'المباني المرتبطة: أسماء المباني كما في النظام، مفصولة بـ | أو ؛', en: 'Linked buildings: exact building names, separated by | or ;' }
                ])
            },
            { name: 'Owners', rows: [getOwnersExcelSampleRow()] }
        ]);
    }

    function exportOwnersExcel() {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية تصدير البيانات.', 'No permission to export data.')) return;
        if (!bhdEnsureXlsxForBulkExchange()) return;
        loadDashboardAux();
        const rows = ownersList.map((name) => ownerProfileToExcelRow(name));
        bhdWriteExcelWorkbook(`BHD_Owners_Export_${new Date().toISOString().slice(0, 10)}.xlsx`, [
            {
                name: 'Instructions',
                rows: bhdExcelInstructionRows('الملاك', 'Owners', [
                    { ar: 'تصدير بيانات الملاك الحالية.', en: 'Export of current owners.' }
                ])
            },
            { name: 'Owners', rows: rows.length ? rows : [getOwnersExcelSampleRow()] }
        ]);
    }

    function getUnitsExcelSampleRow() {
        return {
            'المبنى / Building': 'MQ Plot 369, Building 5240',
            'رقم الطابق / Floor # (1…n)': 1,
            'اسم الطابق / Floor name': 'الطابق الأرضي',
            'رقم الوحدة / Unit no.': '101',
            'نوع الوحدة / Unit type': 'Flat',
            'الإيجار الشهري (ر.ع) / Monthly rent (OMR)': '',
            'عداد كهرباء الوحدة / Unit electricity ID': '',
            'عداد ماء الوحدة / Unit water ID': ''
        };
    }

    function collectAllUnitsForExcelExport() {
        loadDashboardAux();
        try { syncManagedUnitsFromProfiles(); } catch (_e) {}
        const seen = new Set();
        const rows = [];
        const pushRow = (buildingKey, profile) => {
            flattenFloorUnitsSheetRows(buildingKey, profile).forEach((r) => {
                const b = toStr(r['المبنى / Building'] || buildingKey || excelPickRowField(r, ['مفتاح السجل', 'Record key']));
                const u = toStr(r['رقم الوحدة / Unit no.']);
                const k = `${b}\u0001${normalizeUnit(u)}`;
                if (!b || !u || seen.has(k)) return;
                seen.add(k);
                rows.push({ ...r, 'المبنى / Building': b });
            });
        };
        Object.keys(buildingProfiles).sort((a, b) => a.localeCompare(b, 'ar')).forEach((k) => pushRow(k, buildingProfiles[k]));
        getUnitsData().forEach((u) => {
            const b = toStr(u.building);
            const unit = toStr(u.unit);
            if (!b || !unit) return;
            const k = `${b}\u0001${normalizeUnit(unit)}`;
            if (seen.has(k)) return;
            seen.add(k);
            rows.push({
                'المبنى / Building': b,
                'رقم الطابق / Floor # (1…n)': '',
                'اسم الطابق / Floor name': toStr(u.floor),
                'رقم الوحدة / Unit no.': unit,
                'نوع الوحدة / Unit type': toStr(u.unitType) || 'Flat',
                'الإيجار الشهري (ر.ع) / Monthly rent (OMR)': formatRentAmountForInput(u.monthlyRent),
                'عداد كهرباء الوحدة / Unit electricity ID': toStr(u.electricity),
                'عداد ماء الوحدة / Unit water ID': toStr(u.water)
            });
        });
        return rows;
    }

    function downloadUnitsImportTemplate() {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية الاستيراد/التصدير.', 'No import/export permission.')) return;
        if (!bhdEnsureXlsxForBulkExchange()) return;
        bhdWriteExcelWorkbook('BHD_Units_Import_Template.xlsx', [
            {
                name: 'Instructions',
                rows: bhdExcelInstructionRows('الوحدات', 'Units', [
                    { ar: 'املأ ورقة Units — صف لكل وحدة. المبنى ورقم الوحدة إلزاميان.', en: 'Fill Units sheet — one row per unit. Building and unit no. are required.' },
                    { ar: 'يجب أن يكون اسم المبنى مطابقاً لما في ورقة المباني أو النظام.', en: 'Building name must match buildings sheet or system.' },
                    { ar: 'لا تُدخل بيانات المستأجر هنا — سنضيف استيراد المستأجرين لاحقاً.', en: 'Do not enter tenant data here — tenant import comes next.' }
                ])
            },
            { name: 'Units', rows: [getUnitsExcelSampleRow()] }
        ]);
    }

    function exportUnitsExcel() {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية تصدير البيانات.', 'No permission to export data.')) return;
        if (!bhdEnsureXlsxForBulkExchange()) return;
        const rows = collectAllUnitsForExcelExport();
        bhdWriteExcelWorkbook(`BHD_Units_Export_${new Date().toISOString().slice(0, 10)}.xlsx`, [
            {
                name: 'Instructions',
                rows: bhdExcelInstructionRows('الوحدات', 'Units', [
                    { ar: 'تصدير جميع الوحدات المعروفة في النظام (بدون بيانات مستأجر).', en: 'Export of all known units (no tenant data).' }
                ])
            },
            { name: 'Units', rows: rows.length ? rows : [getUnitsExcelSampleRow()] }
        ]);
    }

    function mergeUnitsExcelRowsIntoProfiles(rows) {
        const byBuilding = {};
        rows.forEach((r) => {
            const building =
                toStr(excelPickRowField(r, ['المبنى', 'Building'])) ||
                toStr(excelPickRowField(r, ['مفتاح السجل', 'Record key']));
            const unitNo = toStr(excelPickRowField(r, ['رقم الوحدة', 'Unit no']));
            if (!building || !unitNo) return;
            if (!byBuilding[building]) byBuilding[building] = [];
            byBuilding[building].push(r);
        });
        let touchedUnits = 0;
        Object.entries(byBuilding).forEach(([buildingName, unitRows]) => {
            if (!buildingsList.includes(buildingName)) buildingsList.push(buildingName);
            const prev = buildingProfiles[buildingName] || { ...getEmptyBuildingProfile(), name: buildingName };
            const floorsMap = new Map();
            (Array.isArray(prev.floors) ? prev.floors : []).forEach((f, idx) => {
                floorsMap.set(idx + 1, normalizeFloorData(f, idx));
            });
            unitRows.forEach((ur) => {
                const fi =
                    parseInt(toStr(excelPickRowField(ur, ['رقم الطابق', 'Floor #'])).replace(/[^\d]/g, ''), 10) || 1;
                const floorName = toStr(excelPickRowField(ur, ['اسم الطابق', 'Floor name']));
                if (!floorsMap.has(fi)) {
                    floorsMap.set(
                        fi,
                        normalizeFloorData(
                            {
                                name: floorName || (fi === 1 ? t('الطابق الأرضي', 'Ground floor') : t(`الطابق ${fi}`, `Floor ${fi}`)),
                                selectedTypes: ['Flat'],
                                unitCount: 0,
                                units: [],
                                unitsDetailed: []
                            },
                            fi - 1
                        )
                    );
                }
                const floor = floorsMap.get(fi);
                if (floorName) floor.name = floorName;
                const unitDet = {
                    number: toStr(excelPickRowField(ur, ['رقم الوحدة', 'Unit no'])),
                    type: toStr(excelPickRowField(ur, ['نوع الوحدة', 'Unit type'])) || 'Flat',
                    monthlyRent: formatRentAmountForInput(excelPickRowField(ur, ['الإيجار الشهري', 'Monthly rent', 'Rent'])),
                    electricity: toStr(excelPickRowField(ur, ['كهرباء الوحدة', 'Unit electricity', 'Electricity'])),
                    water: toStr(excelPickRowField(ur, ['ماء الوحدة', 'Unit water', 'Water']))
                };
                const idx = floor.unitsDetailed.findIndex((x) => normalizeUnit(x.number) === normalizeUnit(unitDet.number));
                if (idx >= 0) floor.unitsDetailed[idx] = { ...floor.unitsDetailed[idx], ...unitDet };
                else floor.unitsDetailed.push(unitDet);
                floor.units = floor.unitsDetailed.map((x) => x.number);
                floor.unitCount = floor.unitsDetailed.length;
                touchedUnits++;
            });
            prev.floors = [...floorsMap.entries()].sort((a, b) => a[0] - b[0]).map(([, f]) => f);
            prev.floorCount = prev.floors.length;
            prev.updatedAt = new Date().toISOString();
            buildingProfiles[buildingName] = prev;
        });
        return touchedUnits;
    }

    function importUnitsExcel(file) {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية استيراد البيانات.', 'No permission to import data.')) return;
        if (!bhdEnsureXlsxForBulkExchange()) return;
        readWorkbook(file).then((wb) => {
            loadDashboardAux();
            const ws =
                wb.Sheets['Units'] ||
                wb.Sheets['FloorUnits'] ||
                wb.Sheets[wb.SheetNames.find((n) => /unit/i.test(n)) || ''];
            if (!ws) {
                alert(t('❌ لم يُعثر على ورقة Units في الملف.', '❌ Units sheet not found in file.'));
                return;
            }
            const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
            if (!rows.length) {
                alert(t('⚠️ ورقة Units فارغة.', '⚠️ Units sheet is empty.'));
                return;
            }
            const count = mergeUnitsExcelRowsIntoProfiles(rows);
            syncManagedUnitsFromProfiles();
            persistReferenceData(true);
            closeBulkDataExchangeModal();
            alert(t(`✅ تم استيراد/تحديث ${count} وحدة.`, `✅ Imported/updated ${count} unit(s).`));
        }).catch((err) => {
            console.error(err);
            alert(t('❌ فشل قراءة ملف الوحدات.', '❌ Failed to read units file.'));
        });
    }

    function triggerUnitsExcelImport() {
        const input = document.getElementById('bhdUnitsExcelInput');
        if (input) {
            input.value = '';
            input.click();
        }
    }

    function exportRentedContractsExcel() {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية تصدير البيانات.', 'No permission to export data.')) return;
        if (typeof XLSX === 'undefined') {
            alert('⚠️ مكتبة Excel غير متاحة حالياً.\nExcel library is not available.');
            return;
        }
        const rows = getUnitsData().filter((u) => u.status === 'Rented').map((u) => {
            const x = buildSystemExcelRowFromUnit(u);
            return {
                'تفاصيل الطابق / Floor detail': x.FloorDetail,
                'مسلسل / Serial no.': x.SerialNo,
                'المبنى / Building': x.Building,
                'ملاك مرتبطون / Owner names': x.OwnerNames,
                'الوحدة / Unit': x.Unit,
                'نوع الوحدة / Unit type': x.UnitType,
                'الحالة / Status': x.Status,
                'المستأجر / Tenant': x.Tenant,
                'المستأجر (إنجليزي) / Tenant (EN)': x.TenantEn,
                'البطاقة المدنية / Civil ID': x.CivilCard,
                'جوال / Contact': x.ContactNo,
                'موبايل / Mobile': x.Mobile,
                'مبلغ الإيجار / Rent amount': x.RentAmount,
                'إيجار الاتفاقية / Agreement rent': x.AgreementRent,
                'رقم العقد / Agreement no.': x.AgreementNo,
                'الإيجار الشهري / Monthly rent': x.MonthlyRent,
                'تاريخ البدء / Start date': x.StartDate,
                'تاريخ الانتهاء / End date': x.EndDate,
                'أيام متبقية / Remaining days': x.RemainingDays,
                'أشهر متبقية / Months left': x.MonthsLeft,
                'تاريخ الإخلاء / Evacuation date': x.EvacuationDate,
                'كهرباء / Electricity': x.Electricity,
                'قراءة كهرباء / Electricity reading': x.ElectricityReading,
                'ماء / Water': x.Water,
                'قراءة ماء / Water reading': x.WaterReading,
                'ملاحظات / Remarks': x.Remarks
            };
        });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'RentedContracts');
        XLSX.writeFile(wb, `BHD_Rented_Contracts_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    function importRentedContractsExcel(file) {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية استيراد البيانات.', 'No permission to import data.')) return;
        if (typeof XLSX === 'undefined') {
            alert('⚠️ مكتبة Excel غير متاحة حالياً.\nExcel library is not available.');
            return;
        }
        readWorkbook(file).then((wb) => {
            const sheet = wb.Sheets['RentedContracts'] || wb.Sheets['Units'];
            if (!sheet) {
                alert('❌ يلزم ورقة RentedContracts أو Units.\nSheet RentedContracts or Units is required.');
                return;
            }
            const unitsRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            const incoming = unitsRows.map(unitRecordFromSystemExcelRow).filter((x) => x.building || x.unit || x.tenant);
            if (!incoming.length) {
                alert('❌ لا توجد صفوف صالحة في الملف.\nNo valid rows in file.');
                return;
            }
            mergeContractUnitRecordsIntoImported(incoming);
            const buildingsSet = new Set(buildingsList);
            incoming.forEach((u) => {
                if (u.building) buildingsSet.add(u.building);
            });
            buildingsList.length = 0;
            [...buildingsSet].sort((a, b) => a.localeCompare(b, 'ar')).forEach((b) => buildingsList.push(b));
            persistReferenceData(true);
            alert(`✅ تم دمج بيانات العقود (${incoming.length} صفاً).\nMerged ${incoming.length} contract row(s).`);
        }).catch((err) => {
            console.error(err);
            alert('❌ فشل استيراد ملف العقود.\nContract import failed.');
        });
    }

    function triggerRentedContractsImport() {
        const input = document.getElementById('rentedContractsExcelInput');
        if (input) input.click();
    }

    function exportSystemDataTemplate() {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية تصدير البيانات.', 'No permission to export data.')) return;
        if (typeof XLSX === 'undefined') {
            alert('⚠️ مكتبة Excel غير متاحة حالياً.');
            return;
        }
        const wb = XLSX.utils.book_new();
        const units = getUnitsData().map(buildSystemExcelRowFromUnit);
        const registry = fileRegistry.map((r) => ({
            Building: r.building || '',
            Unit: r.unit || '',
            Tenant: r.tenant || '',
            DocType: r.docType || '',
            FileName: r.fileName || '',
            FilePath: r.filePath || '',
            Source: r.source || '',
            Notes: r.notes || '',
            UpdatedAt: r.updatedAt || ''
        }));
        const settings = [
            { Key: 'AgreementNo', Value: document.getElementById('agreementNo')?.value || '' },
            { Key: 'ContractType', Value: document.getElementById('contractTypeSelect')?.value || '' },
            { Key: 'Type', Value: document.getElementById('typeSelect')?.value || '' },
            { Key: 'MunicipalFormNo', Value: document.getElementById('municipalFormNo')?.value || '' },
            { Key: 'MunicipalContractNo', Value: document.getElementById('municipalContractNo')?.value || '' },
            { Key: 'TenantNameAr', Value: document.getElementById('tenantNameAr')?.value || '' },
            { Key: 'TenantNameEn', Value: document.getElementById('tenantNameEn')?.value || '' },
            { Key: 'TenantEntityType', Value: document.getElementById('tenantEntityType')?.value || 'person' },
            { Key: 'TenantCommercialRegNo', Value: document.getElementById('tenantCommercialRegNo')?.value || '' },
            { Key: 'TenantCommercialRegExpiryDate', Value: document.getElementById('tenantCommercialRegExpiryDate')?.value || '' },
            { Key: 'TenantCompanyExtraMobile', Value: document.getElementById('tenantCompanyExtraMobile')?.value || '' },
            { Key: 'TenantCompanySignatoriesJson', Value: document.getElementById('tenantCompanySignatoriesJson')?.value || '' },
            { Key: 'TenantId', Value: document.getElementById('tenantId')?.value || '' },
            { Key: 'TenantMobile', Value: document.getElementById('tenantMobile')?.value || '' },
            { Key: 'TenantPassport', Value: document.getElementById('tenantPassport')?.value || '' },
            { Key: 'TenantEmail', Value: document.getElementById('tenantEmail')?.value || '' },
            { Key: 'BuildingNo', Value: document.getElementById('buildingNo')?.value || '' },
            { Key: 'FlatNo', Value: document.getElementById('flatNo')?.value || '' },
            { Key: 'FloorDetails', Value: document.getElementById('floorDetails')?.value || '' },
            { Key: 'UnitType', Value: document.getElementById('unitType')?.value || '' },
            { Key: 'UsageType', Value: document.getElementById('usageType')?.value || '' },
            { Key: 'ElectricityMeter', Value: document.getElementById('electricityMeter')?.value || '' },
            { Key: 'WaterMeter', Value: document.getElementById('waterMeter')?.value || '' },
            { Key: 'MonthlyRent', Value: document.getElementById('monthlyRent')?.value || '' },
            { Key: 'RentCalcMode', Value: document.getElementById('rentCalcMode')?.value || 'full' },
            { Key: 'RentAreaSqm', Value: document.getElementById('rentAreaSqm')?.value || '' },
            { Key: 'RentPerSqm', Value: document.getElementById('rentPerSqm')?.value || '' },
            { Key: 'ContractMonths', Value: document.getElementById('contractMonths')?.value || '' },
            { Key: 'StartDate', Value: document.getElementById('startDate')?.value || '' },
            { Key: 'EndDate', Value: document.getElementById('endDate')?.value || '' },
            { Key: 'UnitHandoverDate', Value: document.getElementById('unitHandoverDate')?.value || '' },
            { Key: 'AgreedRentPaymentDay', Value: document.getElementById('agreedRentPaymentDay')?.value || '' },
            { Key: 'PaymentMethod', Value: document.getElementById('paymentMethod')?.value || '' },
            { Key: 'DepositAmount', Value: document.getElementById('depositAmount')?.value || '' },
            { Key: 'GraceDays', Value: document.getElementById('graceDays')?.value || '0' },
            { Key: 'GraceAmount', Value: document.getElementById('graceAmount')?.value || '0.000' },
            { Key: 'OtherDiscountAmount', Value: document.getElementById('otherDiscountAmount')?.value || '0' },
            { Key: 'ExtraAdjustmentsJson', Value: JSON.stringify(getExtraAdjustmentsFromUi()) },
            { Key: 'InsuranceDepositItemsJson', Value: JSON.stringify(getInsuranceDepositItemsFromUi()) },
            { Key: 'CustomRentItemsJson', Value: JSON.stringify(getCustomRentItemsFromUi()) },
            { Key: 'PaymentScheduleJson', Value: JSON.stringify(getPaymentScheduleFromUi()) }
        ];

        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(units), 'Units');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(registry), 'Registry');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(settings), 'Settings');
        XLSX.writeFile(wb, `BHD_System_Data_${new Date().toISOString().slice(0,10)}.xlsx`);
    }

    function importSystemDataTemplate(file) {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية استيراد البيانات.', 'No permission to import data.')) return;
        if (typeof XLSX === 'undefined') {
            alert('⚠️ مكتبة Excel غير متاحة حالياً.');
            return;
        }
        readWorkbook(file).then((wb) => {
            const unitsWs = wb.Sheets['Units'];
            if (!unitsWs) {
                alert('❌ الملف لا يحتوي على ورقة Units المطلوبة.');
                return;
            }
            const unitsRows = XLSX.utils.sheet_to_json(unitsWs, { defval: '' });
            importedUnitsData = unitsRows.map(unitRecordFromSystemExcelRow).filter((x) => x.building || x.unit || x.tenant);

            const buildingsSet = new Set(buildingsList);
            importedUnitsData.forEach((u) => { if (u.building) buildingsSet.add(u.building); });
            buildingsList.length = 0;
            [...buildingsSet].forEach((b) => buildingsList.push(b));

            const regWs = wb.Sheets['Registry'];
            if (regWs) {
                const regRows = XLSX.utils.sheet_to_json(regWs, { defval: '' });
                fileRegistry = regRows.map((r) => ({
                    id: `reg_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
                    building: toStr(r.Building),
                    unit: toStr(r.Unit),
                    tenant: toStr(r.Tenant),
                    docType: toStr(r.DocType) || 'Other',
                    fileName: toStr(r.FileName),
                    filePath: toStr(r.FilePath),
                    source: toStr(r.Source),
                    notes: toStr(r.Notes),
                    updatedAt: toStr(r.UpdatedAt) || new Date().toISOString()
                }));
            }

            const settingsWs = wb.Sheets['Settings'];
            if (settingsWs) {
                const settingsRows = XLSX.utils.sheet_to_json(settingsWs, { defval: '' });
                const map = {};
                settingsRows.forEach((r) => { map[toStr(r.Key)] = toStr(r.Value); });
                const apply = (id, key) => {
                    const el = document.getElementById(id);
                    if (el && map[key] !== undefined) el.value = map[key];
                };
                apply('agreementNo', 'AgreementNo');
                apply('contractTypeSelect', 'ContractType');
                apply('typeSelect', 'Type');
                apply('tenantNameAr', 'TenantNameAr');
                apply('tenantNameEn', 'TenantNameEn');
                apply('tenantEntityType', 'TenantEntityType');
                apply('tenantCommercialRegNo', 'TenantCommercialRegNo');
                apply('tenantCommercialRegExpiryDate', 'TenantCommercialRegExpiryDate');
                apply('tenantCompanyExtraMobile', 'TenantCompanyExtraMobile');
                apply('tenantCompanySignatoriesJson', 'TenantCompanySignatoriesJson');
                apply('tenantId', 'TenantId');
                apply('tenantMobile', 'TenantMobile');
                apply('tenantPassport', 'TenantPassport');
                apply('tenantEmail', 'TenantEmail');
                apply('buildingNo', 'BuildingNo');
                apply('flatNo', 'FlatNo');
                apply('floorDetails', 'FloorDetails');
                apply('unitType', 'UnitType');
                apply('usageType', 'UsageType');
                apply('electricityMeter', 'ElectricityMeter');
                apply('waterMeter', 'WaterMeter');
                apply('monthlyRent', 'MonthlyRent');
                apply('rentCalcMode', 'RentCalcMode');
                apply('rentAreaSqm', 'RentAreaSqm');
                apply('rentPerSqm', 'RentPerSqm');
                apply('contractMonths', 'ContractMonths');
                apply('startDate', 'StartDate');
                apply('endDate', 'EndDate');
                apply('unitHandoverDate', 'UnitHandoverDate');
                apply('agreedRentPaymentDay', 'AgreedRentPaymentDay');
                if (map.AgreedRentPaymentDate && document.getElementById('agreedRentPaymentDay') && !toStr(map.AgreedRentPaymentDay)) {
                    try {
                        const dtl = new Date(toStr(map.AgreedRentPaymentDate));
                        if (!Number.isNaN(dtl.getTime())) {
                            document.getElementById('agreedRentPaymentDay').value = String(dtl.getDate());
                        }
                    } catch (e) {}
                }
                apply('municipalFormNo', 'MunicipalFormNo');
                apply('municipalContractNo', 'MunicipalContractNo');
                apply('paymentMethod', 'PaymentMethod');
                apply('depositAmount', 'DepositAmount');
                apply('graceDays', 'GraceDays');
                apply('graceAmount', 'GraceAmount');
                apply('otherDiscountAmount', 'OtherDiscountAmount');
                try { renderExtraAdjustmentsRows(JSON.parse(toStr(map.ExtraAdjustmentsJson) || '[]')); } catch (e) { renderExtraAdjustmentsRows([]); }
                try { renderInsuranceDepositItemsRows(JSON.parse(toStr(map.InsuranceDepositItemsJson) || '[]')); } catch (e) { renderInsuranceDepositItemsRows([]); }
                try { renderCustomRentItemsRows(JSON.parse(toStr(map.CustomRentItemsJson) || '[]')); } catch (e) { renderCustomRentItemsRows([]); }
                try {
                    const ps = map.PaymentScheduleJson;
                    if (ps) {
                        const arr = JSON.parse(toStr(ps) || '[]');
                        renderPaymentScheduleFromRows(Array.isArray(arr) ? arr : []);
                    }
                } catch (e) { try { onPaymentMethodOrDriversChanged(); } catch (e2) {} }
                ensureTypeSelectAlwaysNew();
                try { syncTenantEntityFieldsFromType(); } catch (e) {}
                updateReservationCalculations();
            }

            localStorage.setItem('bhd_file_registry', JSON.stringify(fileRegistry));
            persistReferenceData(false);
            alert(`✅ تم استيراد ملف النظام بنجاح. الوحدات: ${importedUnitsData.length}`);
        }).catch((err) => {
            console.error('System template import failed:', err);
            alert('❌ فشل استيراد ملف النظام.');
        });
    }
    
    // دوال مساعدة
    const _formDataOverrideStack = [];
    function pushFormDataOverride(data) {
        if (data && typeof data === 'object') _formDataOverrideStack.push(data);
    }
    function popFormDataOverride() {
        if (_formDataOverrideStack.length) _formDataOverrideStack.pop();
    }
    function getFormData() {
        if (_formDataOverrideStack.length) {
            return { ..._formDataOverrideStack[_formDataOverrideStack.length - 1] };
        }
        const v = (id) => toStr(document.getElementById(id)?.value);
        const extraAdjustments = getExtraAdjustmentsFromUi();
        const insuranceDepositItems = getInsuranceDepositItemsFromUi();
        const customRentItems = getCustomRentItemsFromUi();
        const paymentSchedule = getPaymentScheduleFromUi();
        return {
            agreementNo: v('agreementNo'),
            contractType: v('contractTypeSelect'),
            type: v('typeSelect'),
            municipalFormNo: document.getElementById('municipalFormNo')?.value || '',
            municipalContractNo: document.getElementById('municipalContractNo')?.value || '',
            tenantNameAr: v('tenantNameAr'),
            tenantNameEn: v('tenantNameEn'),
            tenantEntityType: document.getElementById('tenantEntityType')?.value || 'person',
            tenantCommercialRegNo: v('tenantCommercialRegNo'),
            tenantCommercialRegExpiryDate: v('tenantCommercialRegExpiryDate'),
            tenantCompanyExtraMobile: v('tenantCompanyExtraMobile'),
            tenantCompanySignatoriesJson: toStr(document.getElementById('tenantCompanySignatoriesJson')?.value),
            tenantId: v('tenantId'),
            tenantMobile: v('tenantMobile'),
            tenantPassport: v('tenantPassport'),
            tenantEmail: v('tenantEmail'),
            buildingNo: v('buildingNo'),
            flatNo: v('flatNo'),
            floorDetails: v('floorDetails'),
            unitType: v('unitType'),
            usageType: document.getElementById('usageType')?.value || '',
            electricityMeter: v('electricityMeter'),
            waterMeter: v('waterMeter'),
            monthlyRent: v('monthlyRent'),
            rentCalcMode: document.getElementById('rentCalcMode')?.value || 'full',
            rentAreaSqm: document.getElementById('rentAreaSqm')?.value || '',
            rentPerSqm: document.getElementById('rentPerSqm')?.value || '',
            contractMonths: v('contractMonths'),
            startDate: v('startDate'),
            endDate: v('endDate'),
            unitHandoverDate: document.getElementById('unitHandoverDate')?.value || '',
            agreedRentPaymentDay: document.getElementById('agreedRentPaymentDay')?.value || '',
            paymentMethod: v('paymentMethod'),
            depositReceiptRef: v('depositReceiptRef'),
            depositAttachmentName: (() => {
                const h = document.getElementById('depositAttachmentRow');
                return h && h.dataset ? toStr(h.dataset.attachmentName) : '';
            })(),
            depositAttachmentDataUrl: (() => {
                const h = document.getElementById('depositAttachmentRow');
                if (h?.dataset?.storedOnDisk === '1') return '';
                return h && h.dataset ? toStr(h.dataset.attachmentDataUrl) : '';
            })(),
            depositAttachmentRelativePath: (() => {
                const h = document.getElementById('depositAttachmentRow');
                return h?.dataset?.attachmentRelativePath ? toStr(h.dataset.attachmentRelativePath) : '';
            })(),
            depositAttachmentFileId: (() => {
                const h = document.getElementById('depositAttachmentRow');
                return h?.dataset?.attachmentFileId ? toStr(h.dataset.attachmentFileId) : '';
            })(),
            depositStoredOnDisk: (() => {
                const h = document.getElementById('depositAttachmentRow');
                return h?.dataset?.storedOnDisk === '1';
            })(),
            depositAmount: v('depositAmount'),
            graceDays: document.getElementById('graceDays')?.value || '0',
            graceAmount: document.getElementById('graceAmount')?.value || '0.000',
            otherDiscountAmount: document.getElementById('otherDiscountAmount')?.value || '0',
            extraAdjustments,
            extraAdjustmentsJson: JSON.stringify(extraAdjustments),
            insuranceDepositItems,
            insuranceDepositItemsJson: JSON.stringify(insuranceDepositItems),
            customRentItems,
            customRentItemsJson: JSON.stringify(customRentItems),
            paymentSchedule,
            paymentScheduleJson: JSON.stringify(paymentSchedule),
            contractSubjectToVat: v('contractSubjectToVat') || 'no',
            vatPaymentMode: v('vatPaymentMode') || 'with_rent',
            vatChequeCount: v('vatChequeCount') || '1',
            vatMonthlyAmount: v('vatMonthlyAmount'),
            monthlyRentInclVat: v('monthlyRentInclVat'),
            vatAnnualTotal: v('vatAnnualTotal'),
            vatChequeSchedule: getVatChequeScheduleFromUi(),
            vatChequeScheduleJson: JSON.stringify(getVatChequeScheduleFromUi()),
            tenantNationality: v('tenantNationality'),
            contractMandatoryDocsJson: toStr(document.getElementById('contractMandatoryDocsJson')?.value),
            contractOtherDocsJson: toStr(document.getElementById('contractOtherDocsJson')?.value),
            linkedContractUnitsJson: toStr(document.getElementById('linkedContractUnitsJson')?.value) || '[]'
        };
    }

    /** بيانات العقد للوحدات: النموذج الحي أو آخر عقد محفوظ (للظهور في «مؤجرة» دون الاعتماد على DOM فقط) */
    function getFormDataForUnitsTableMerge() {
        const live = getFormData();
        let saved = null;
        try {
            const raw = localStorage.getItem('bhd_contract_full');
            if (raw) saved = JSON.parse(raw);
        } catch (e) {
            saved = null;
        }
        if (saved && typeof saved === 'object' && toStr(saved.buildingNo) && toStr(saved.flatNo)) {
            const liveHas = toStr(live.buildingNo) && toStr(live.flatNo);
            const sameUnit =
                liveHas &&
                toStr(live.buildingNo) === toStr(saved.buildingNo) &&
                normalizeUnit(live.flatNo) === normalizeUnit(saved.flatNo);
            if (sameUnit) {
                return {
                    ...saved,
                    ...live,
                    extraAdjustments: live.extraAdjustments,
                    extraAdjustmentsJson: live.extraAdjustmentsJson,
                    insuranceDepositItems: live.insuranceDepositItems,
                    insuranceDepositItemsJson: live.insuranceDepositItemsJson,
                    customRentItems: live.customRentItems,
                    customRentItemsJson: live.customRentItemsJson,
                    paymentSchedule: live.paymentSchedule,
                    paymentScheduleJson: live.paymentScheduleJson,
                    tenantNationality: live.tenantNationality,
                    contractMandatoryDocsJson: live.contractMandatoryDocsJson,
                    contractOtherDocsJson: live.contractOtherDocsJson
                };
            }
            if (!liveHas) {
                return {
                    ...live,
                    ...saved,
                    extraAdjustments: live.extraAdjustments,
                    extraAdjustmentsJson: live.extraAdjustmentsJson,
                    insuranceDepositItems: live.insuranceDepositItems,
                    insuranceDepositItemsJson: live.insuranceDepositItemsJson,
                    customRentItems: live.customRentItems,
                    customRentItemsJson: live.customRentItemsJson,
                    paymentSchedule: live.paymentSchedule,
                    paymentScheduleJson: live.paymentScheduleJson,
                    tenantNationality: live.tenantNationality,
                    contractMandatoryDocsJson: live.contractMandatoryDocsJson,
                    contractOtherDocsJson: live.contractOtherDocsJson
                };
            }
            return live;
        } else if (toStr(live.buildingNo) && toStr(live.flatNo)) {
            return live;
        }
        const dm = loadTenancyContractDraftsMap();
        let best = null;
        let bestTs = '';
        Object.keys(dm).forEach((k) => {
            const e = dm[k];
            const pl = e && e.payload;
            if (!pl || !toStr(pl.buildingNo) || !toStr(pl.flatNo)) return;
            const ts = toStr(e.updatedAt);
            if (!best || ts > bestTs) {
                best = pl;
                bestTs = ts;
            }
        });
        if (best) {
            return {
                ...live,
                ...best,
                extraAdjustments: live.extraAdjustments,
                extraAdjustmentsJson: live.extraAdjustmentsJson,
                insuranceDepositItems: live.insuranceDepositItems,
                insuranceDepositItemsJson: live.insuranceDepositItemsJson,
                customRentItems: live.customRentItems,
                customRentItemsJson: live.customRentItemsJson,
                paymentSchedule: live.paymentSchedule,
                paymentScheduleJson: live.paymentScheduleJson,
                tenantNationality: live.tenantNationality,
                contractMandatoryDocsJson: live.contractMandatoryDocsJson,
                contractOtherDocsJson: live.contractOtherDocsJson
            };
        }
        return live;
    }

    /** نفس حمولة saveAllData لحقل bhd_contract_full */
    function collectStorableContractFullFromDom() {
        return {
            agreementNo: document.getElementById('agreementNo').value,
            contractType: document.getElementById('contractTypeSelect').value,
            type: document.getElementById('typeSelect').value,
            municipalFormNo: document.getElementById('municipalFormNo')?.value || '',
            municipalContractNo: document.getElementById('municipalContractNo')?.value || '',
            tenantNameAr: document.getElementById('tenantNameAr').value,
            tenantNameEn: document.getElementById('tenantNameEn').value,
            tenantEntityType: document.getElementById('tenantEntityType')?.value || 'person',
            tenantCommercialRegNo: document.getElementById('tenantCommercialRegNo')?.value || '',
            tenantCommercialRegExpiryDate: document.getElementById('tenantCommercialRegExpiryDate')?.value || '',
            tenantCompanyExtraMobile: document.getElementById('tenantCompanyExtraMobile')?.value || '',
            tenantCompanySignatoriesJson: document.getElementById('tenantCompanySignatoriesJson')?.value || '[]',
            tenantId: document.getElementById('tenantId').value,
            tenantMobile: document.getElementById('tenantMobile').value,
            tenantPassport: document.getElementById('tenantPassport').value,
            tenantEmail: document.getElementById('tenantEmail').value,
            buildingNo: document.getElementById('buildingNo').value,
            flatNo: document.getElementById('flatNo').value,
            floorDetails: document.getElementById('floorDetails').value,
            unitType: document.getElementById('unitType').value,
            usageType: document.getElementById('usageType')?.value || '',
            electricityMeter: document.getElementById('electricityMeter').value,
            waterMeter: document.getElementById('waterMeter').value,
            monthlyRent: document.getElementById('monthlyRent').value,
            rentCalcMode: document.getElementById('rentCalcMode')?.value || 'full',
            rentAreaSqm: document.getElementById('rentAreaSqm')?.value || '',
            rentPerSqm: document.getElementById('rentPerSqm')?.value || '',
            contractMonths: document.getElementById('contractMonths').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            unitHandoverDate: document.getElementById('unitHandoverDate')?.value || '',
            agreedRentPaymentDay: document.getElementById('agreedRentPaymentDay')?.value || '',
            paymentMethod: document.getElementById('paymentMethod').value,
            depositAmount: document.getElementById('depositAmount')?.value || '',
            depositReceiptRef: document.getElementById('depositReceiptRef')?.value || '',
            depositAttachmentName: (() => {
                const h = document.getElementById('depositAttachmentRow');
                return (h && h.dataset && h.dataset.attachmentName) ? toStr(h.dataset.attachmentName) : '';
            })(),
            depositAttachmentDataUrl: (() => {
                const h = document.getElementById('depositAttachmentRow');
                if (h?.dataset?.storedOnDisk === '1') return '';
                return (h && h.dataset && h.dataset.attachmentDataUrl) ? toStr(h.dataset.attachmentDataUrl) : '';
            })(),
            depositAttachmentRelativePath: (() => {
                const h = document.getElementById('depositAttachmentRow');
                return h?.dataset?.attachmentRelativePath ? toStr(h.dataset.attachmentRelativePath) : '';
            })(),
            depositAttachmentFileId: (() => {
                const h = document.getElementById('depositAttachmentRow');
                return h?.dataset?.attachmentFileId ? toStr(h.dataset.attachmentFileId) : '';
            })(),
            depositStoredOnDisk: (() => {
                const h = document.getElementById('depositAttachmentRow');
                return h?.dataset?.storedOnDisk === '1';
            })(),
            graceDays: document.getElementById('graceDays')?.value || '0',
            graceAmount: document.getElementById('graceAmount')?.value || '0.000',
            otherDiscountAmount: document.getElementById('otherDiscountAmount')?.value || '0',
            extraAdjustmentsJson: JSON.stringify(getExtraAdjustmentsFromUi()),
            insuranceDepositItemsJson: JSON.stringify(getInsuranceDepositItemsFromUi()),
            customRentItemsJson: JSON.stringify(getCustomRentItemsFromUi()),
            paymentSchedule: getPaymentScheduleFromUi(),
            paymentScheduleJson: JSON.stringify(getPaymentScheduleFromUi()),
            contractSubjectToVat: document.getElementById('contractSubjectToVat')?.value || 'no',
            vatPaymentMode: document.getElementById('vatPaymentMode')?.value || 'with_rent',
            vatChequeCount: document.getElementById('vatChequeCount')?.value || '1',
            vatMonthlyAmount: document.getElementById('vatMonthlyAmount')?.value || '',
            monthlyRentInclVat: document.getElementById('monthlyRentInclVat')?.value || '',
            vatAnnualTotal: document.getElementById('vatAnnualTotal')?.value || '',
            vatChequeSchedule: getVatChequeScheduleFromUi(),
            vatChequeScheduleJson: JSON.stringify(getVatChequeScheduleFromUi()),
            tenantNationality: document.getElementById('tenantNationality')?.value || 'عماني / Omani',
            contractMandatoryDocsJson: document.getElementById('contractMandatoryDocsJson')?.value || '{}',
            contractOtherDocsJson: document.getElementById('contractOtherDocsJson')?.value || '[]',
            linkedContractUnitsJson: document.getElementById('linkedContractUnitsJson')?.value || '[]',
            propertyDocumentsBundleJson: document.getElementById('propertyDocumentsBundleJson')?.value || '[]',
            propertyDocumentsComplete: (() => {
                try {
                    const arr = JSON.parse(document.getElementById('propertyDocumentsBundleJson')?.value || '[]');
                    return getMissingPropertyDocumentCategoriesFromDocs(Array.isArray(arr) ? arr : []).length === 0;
                } catch (_ePdc) {
                    return false;
                }
            })()
        };
    }

    /**
     * تخفيف حمولة العقد لتجاوز QuotaExceeded — يقلِّص حقول الفحص/الجدول وباقي الإدخالات المُضمّنة base64 قبل إعادة المحاولة تلقيًاً.
     * Progressive slimming when localStorage overflows — trims schedule/cheques and other inlined base64-heavy fields between retries.
     */
    function lightenStorableContractFullForQuota(original, level) {
        let payload;
        try {
            payload = JSON.parse(JSON.stringify(original));
        } catch (_eClone) {
            payload = typeof original === 'object' && original !== null ? { ...original } : {};
        }

        const attKeyRx =
            /dataurl|dataUrl|attachment|filedata|chequefile|chequeattachment|blob|base64|^file|^preview/i;

        /** حذف حقول تشبه ملفًا مدمجًا؛ minLen=0 يُفرِّغ كل سلسلة لهذا الاسم خلال المراحل المتأخرة / Drop embedded-like fields */
        function sweepRowAttachments(row, minLen, forceAllAttKeys) {
            if (!row || typeof row !== 'object') return row;
            const x = { ...row };
            const diskRef = !!(row.storedOnDisk || row.relativePath || row.checkAttachmentRelativePath || row.attachmentRelativePath);
            Object.keys(x).forEach((rk) => {
                if (rk === 'relativePath' || rk === 'fileId' || rk === 'storedOnDisk' || rk === 'checkAttachmentRelativePath' || rk === 'checkAttachmentFileId' || rk === 'attachmentRelativePath' || rk === 'attachmentFileId') return;
                const val = x[rk];
                if (typeof val !== 'string') return;
                const looksData = /^data:/i.test(val) || String(val.slice(0, 24)).toLowerCase().includes('base64');
                if (bhdFileStorageAvailable() && diskRef && (rk === 'dataUrl' || rk === 'checkAttachmentDataUrl' || rk === 'attachmentDataUrl')) {
                    x[rk] = '';
                    return;
                }
                if ((attKeyRx.test(rk) || looksData) && (forceAllAttKeys || val.length >= minLen)) x[rk] = '';
            });
            return x;
        }

        function compactJsonArrays(minLen, forceAllKeys) {
            ['extraAdjustmentsJson', 'insuranceDepositItemsJson', 'customRentItemsJson', 'paymentScheduleJson', 'vatChequeScheduleJson'].forEach((k) => {
                try {
                    const arr = JSON.parse(toStr(payload[k]) || '[]');
                    if (!Array.isArray(arr)) return;
                    payload[k] = JSON.stringify(arr.map((row) => sweepRowAttachments(row, minLen, forceAllKeys)));
                } catch (_e) {}
            });
            try {
                if (Array.isArray(payload.paymentSchedule)) {
                    payload.paymentSchedule = payload.paymentSchedule.map((row) =>
                        sweepRowAttachments(row, minLen, forceAllKeys)
                    );
                    payload.paymentScheduleJson = JSON.stringify(payload.paymentSchedule);
                }
            } catch (_ePs) {}
            try {
                if (Array.isArray(payload.vatChequeSchedule)) {
                    payload.vatChequeSchedule = payload.vatChequeSchedule.map((row) =>
                        sweepRowAttachments(row, minLen, forceAllKeys)
                    );
                    payload.vatChequeScheduleJson = JSON.stringify(payload.vatChequeSchedule);
                }
            } catch (_eVatPs) {}
        }

        /** سلاسل بحجم خطير في الجذور (توافق sanitize الحجوزات) — Large top-level pasted blobs */
        function sweepTopHugeDataStrings() {
            Object.keys(payload).forEach((k) => {
                const val = payload[k];
                if (typeof val !== 'string' || !val.length) return;
                const lowHead = String(val.slice(0, 64)).toLowerCase();
                if (val.length > 8192 && (lowHead.startsWith('data:') || lowHead.includes('base64')))
                    payload[k] = '';
            });
        }

        if (level >= 1) {
            sweepTopHugeDataStrings();
            compactJsonArrays(400, false);
        }
        if (level >= 2) {
            sweepTopHugeDataStrings();
            compactJsonArrays(0, true);
            if (!payload.depositStoredOnDisk && !payload.depositAttachmentRelativePath) payload.depositAttachmentDataUrl = '';
            else payload.depositAttachmentDataUrl = '';
        }
        if (level >= 3) {
            try {
                const o = JSON.parse(toStr(payload.contractMandatoryDocsJson) || '{}');
                if (o && typeof o === 'object') {
                    Object.keys(o).forEach((kk) => {
                        const slot = o[kk];
                        if (slot && typeof slot === 'object' && typeof slot.dataUrl === 'string')
                            slot.dataUrl = '';
                    });
                    payload.contractMandatoryDocsJson = JSON.stringify(o);
                }
            } catch (_eM) {}
        }
        if (level >= 4) {
            try {
                const a = JSON.parse(toStr(payload.contractOtherDocsJson) || '[]');
                if (Array.isArray(a)) {
                    payload.contractOtherDocsJson = JSON.stringify(
                        a.map((row) => {
                            if (!row || typeof row !== 'object') return row;
                            const xr = { ...row };
                            if (typeof xr.dataUrl === 'string') xr.dataUrl = '';
                            return xr;
                        })
                    );
                }
            } catch (_o) {}
        }
        if (level >= 5) {
            try {
                const sigsIn = JSON.parse(toStr(payload.tenantCompanySignatoriesJson) || '[]');
                if (Array.isArray(sigsIn)) {
                    payload.tenantCompanySignatoriesJson = JSON.stringify(
                        sigsIn.map((sig) => {
                            if (!sig || typeof sig !== 'object') return sig;
                            const s = { ...sig };
                            const lite = (a) =>
                                a && typeof a === 'object'
                                    ? { ...a, dataUrl: '' }
                                    : a;
                            s.signatoryIdAttachment = lite(s.signatoryIdAttachment);
                            s.signatoryPassportAttachment = lite(s.signatoryPassportAttachment);
                            return s;
                        })
                    );
                }
            } catch (_s) {}
        }
        if (level >= 6) {
            payload.contractMandatoryDocsJson = '{}';
            payload.contractOtherDocsJson = '[]';
        }

        return payload;
    }

    /**
     * حفظ bhd_contract_full مع إعادة محاولة تلقائيًا بتخفيض المرافق — يعرض رسالة واحدة عن التخفيض إن تم.
     */
    function tryPersistContractFullWithQuotaBackoff(contractFullPayload) {
        let lastErr = null;
        for (let lvl = 0; lvl <= 6; lvl += 1) {
            const cand = lvl === 0 ? contractFullPayload : lightenStorableContractFullForQuota(contractFullPayload, lvl);
            try {
                localStorage.setItem('bhd_contract_full', JSON.stringify(cand));
                return { ok: true, saved: cand, stripLevel: lvl };
            } catch (eSav) {
                lastErr = eSav;
                if (!(eSav && (eSav.name === 'QuotaExceededError' || eSav.code === 22))) throw eSav;
            }
        }
        return { ok: false, error: lastErr };
    }

    /** مزامنة DOM مع حمولة مخفَّفة (وديعة ومستندات إلزامية) لتطابق الواجهة ما حُفظ / Sync slimmed payload fields back into DOM */
    function syncDomSnapshotFromSlimContractPayload(sl) {
        try {
            if (sl.contractMandatoryDocsJson != null && document.getElementById('contractMandatoryDocsJson')) {
                document.getElementById('contractMandatoryDocsJson').value = toStr(sl.contractMandatoryDocsJson) || '{}';
            }
        } catch (_eMx) {}
        try {
            if (!toStr(sl.depositAttachmentDataUrl)) {
                const dar = document.getElementById('depositAttachmentRow');
                if (dar) dar.dataset.attachmentDataUrl = '';
            }
        } catch (_eDep) {}
        try {
            if (sl.tenantCompanySignatoriesJson != null && document.getElementById('tenantCompanySignatoriesJson'))
                document.getElementById('tenantCompanySignatoriesJson').value = toStr(sl.tenantCompanySignatoriesJson);
        } catch (_eSig) {}
        try {
            hydrateContractDocumentsFromStoredJson();
        } catch (_h) {}
        try {
            updateSummaryPanel();
        } catch (_u) {}
    }

    /** تصغير دوَر دفتر العناوين لملء الحصّة — لا يمحو الأسماء ولا وسوم الملف، فقط dataUrl الطويل */
    function lightenAddressBookEntriesStripFileBlobs(entries) {
        if (!Array.isArray(entries)) return [];
        const z = (att) => {
            if (!att || typeof att !== 'object') return att;
            if (bhdFileStorageAvailable() && (att.storedOnDisk || att.relativePath)) {
                return { ...att, dataUrl: '' };
            }
            return { ...att, dataUrl: typeof att.dataUrl === 'string' ? '' : att.dataUrl };
        };
        return entries.map((e) => {
            if (!e || typeof e !== 'object') return e;
            try {
                const o = JSON.parse(JSON.stringify(e));
                o.idAttachment = z(o.idAttachment);
                o.passportAttachment = z(o.passportAttachment);
                o.commercialRegAttachment = z(o.commercialRegAttachment);
                o.leaseContractAttachment = z(o.leaseContractAttachment);
                if (Array.isArray(o.signatories)) {
                    o.signatories = o.signatories.map((sg) =>
                        sg && typeof sg === 'object'
                            ? {
                                  ...sg,
                                  signatoryIdAttachment: z(sg.signatoryIdAttachment),
                                  signatoryPassportAttachment: z(sg.signatoryPassportAttachment)
                              }
                            : sg
                    );
                }
                return o;
            } catch (_eab0) {
                return e;
            }
        });
    }

    /** تخفيض مرافق سجلات العقار المحفوظة (سند ورسم مساحي) لتفادي QuotaExceeded */
    function lightenBuildingProfilesStripAttachments(profiles) {
        if (!profiles || typeof profiles !== 'object') return {};
        try {
            const raw = JSON.parse(JSON.stringify(profiles));
            const trim = (a) =>
                a && typeof a === 'object'
                    ? { ...a, dataUrl: typeof a.dataUrl === 'string' ? '' : a.dataUrl }
                    : a;
            Object.keys(raw).forEach((k) => {
                const p = raw[k];
                if (!p || typeof p !== 'object') return;
                if (p.titleDeedAttachment) p.titleDeedAttachment = trim(p.titleDeedAttachment);
                if (p.surveySketchAttachment) p.surveySketchAttachment = trim(p.surveySketchAttachment);
            });
            return raw;
        } catch (_eBp0) {
            return profiles;
        }
    }

    /** تخفيض نسخة البطاقة المخزّنة ضمن ملفّات المالك */
    function lightenOwnerProfilesStripAttachments(profiles) {
        if (!profiles || typeof profiles !== 'object') return {};
        try {
            const raw = JSON.parse(JSON.stringify(profiles));
            Object.keys(raw).forEach((k) => {
                const p = raw[k];
                if (!p || typeof p !== 'object') return;
                if (!p.idCardAttachment || typeof p.idCardAttachment !== 'object') return;
                raw[k] = {
                    ...p,
                    idCardAttachment: {
                        ...p.idCardAttachment,
                        dataUrl: ''
                    }
                };
            });
            return raw;
        } catch (_eOw0) {
            return profiles;
        }
    }

    /** إزالة أكبر السلاسل من formData كل حجز (بعد sanitize المعتاد) لتحرير مساحة */
    function shortenUnitReservationFormDataStringsUltra() {
        sanitizeAllUnitReservationRowsForStorage();
        if (!Array.isArray(unitReservations)) return;
        unitReservations = unitReservations.map((row) => {
            if (!row || !row.formData || typeof row.formData !== 'object') return row;
            const fd = { ...row.formData };
            Object.keys(fd).forEach((key) => {
                const val = fd[key];
                if (typeof val !== 'string') return;
                if (val.length <= 768 && !/^data:/i.test(val)) return;
                fd[key] = '';
            });
            return { ...row, formData: fd };
        });
    }

    /**
     * حفظ مجموعة القوائم القياسية في localStorage مع تخفيف تدريجي عند امتلاء الحصّة
     * (مهمًا بعد النجاح في bhd_contract_full؛ غالبًا يفشل bhd_address_book أو profiles).
     */
    function tryPersistStandardBhdLocalStoresBundle() {
        const kv = [
            ['bhd_buildings_list', () => JSON.stringify(buildingsList)],
            ['bhd_owners_list', () => JSON.stringify(ownersList)],
            ['bhd_address_book', () => JSON.stringify(addressBookEntries)],
            ['bhd_file_registry', () => JSON.stringify(fileRegistry)],
            ['bhd_unit_reservations', () => JSON.stringify(unitReservations)],
            ['bhd_reservation_cancellations', () => JSON.stringify(reservationCancellationLog)],
            ['bhd_eviction_requests', () => JSON.stringify(evictionRequests)],
            ['bhd_owner_building_map', () => JSON.stringify(ownerBuildingMap)],
            ['bhd_building_profiles', () => JSON.stringify(buildingProfiles)],
            ['bhd_owner_profiles', () => JSON.stringify(ownerProfiles)],
            ['bhd_managed_units', () => JSON.stringify(managedUnitsData)],
            ['bhd_users_registry', () => JSON.stringify(usersRegistry)],
            ['bhd_auth_session', () => JSON.stringify(authSession)],
            ['bhd_contract_edit_requests', () => JSON.stringify(loadContractEditRequests())],
            ['bhd_password_reset_requests', () => JSON.stringify(loadPasswordResetRequests())],
            ['bhd_addressbook_edit_requests', () => JSON.stringify(loadAddressBookEditRequests())],
            ['bhd_addressbook_edit_grants', () => JSON.stringify(loadAddressBookEditGrants())],
            ['bhd_contract_edit_grants', () => JSON.stringify(loadContractEditGrants())],
            ['bhd_contract_renewal_requests', () => JSON.stringify(loadContractRenewalRequests())],
            ['bhd_contract_renewal_grants', () => JSON.stringify(loadContractRenewalGrants())],
            ['bhd_contract_renewal_drafts', () => JSON.stringify(loadContractRenewalDraftsMap())],
            ['bhd_contract_renewal_log', () => JSON.stringify(loadContractRenewalLog())]
        ];
        let relievedAddressBook = false;
        let relievedBuildingProfiles = false;
        let relievedOwnerProfiles = false;
        let relievedReservationSnapshots = false;
        for (let pass = 0; pass <= 4; pass += 1) {
            if (pass >= 1) {
                addressBookEntries = lightenAddressBookEntriesStripFileBlobs(addressBookEntries);
                relievedAddressBook = true;
            }
            if (pass >= 2) {
                buildingProfiles = lightenBuildingProfilesStripAttachments(buildingProfiles);
                relievedBuildingProfiles = true;
            }
            if (pass >= 3) {
                ownerProfiles = lightenOwnerProfilesStripAttachments(ownerProfiles);
                relievedOwnerProfiles = true;
            }
            if (pass >= 4) {
                shortenUnitReservationFormDataStringsUltra();
                relievedReservationSnapshots = true;
            }
            try {
                for (let i = 0; i < kv.length; i += 1) {
                    localStorage.setItem(kv[i][0], kv[i][1]());
                }
                return {
                    ok: true,
                    relievedAddressBook,
                    relievedBuildingProfiles,
                    relievedOwnerProfiles,
                    relievedReservationSnapshots
                };
            } catch (e0) {
                if (!(e0 && (e0.name === 'QuotaExceededError' || e0.code === 22))) throw e0;
                if (pass === 4) return { ok: false, error: e0 };
            }
        }
        return { ok: false, error: null };
    }

    function _tenancyDraftStorageKey(building, unit) {
        return normalizeReservationBuildingKey(building) + '\t' + normalizeUnit(unit);
    }

    /** مطابقة مفتاح مسودة العقد (جديد وموروث قبل تطبيع المباني) */
    function getTenancyDraftMapEntry(map, building, unit) {
        if (!map || typeof map !== 'object') return null;
        const kNorm = _tenancyDraftStorageKey(building, unit);
        if (map[kNorm]) return map[kNorm];
        const kLeg = toStr(building) + '\t' + normalizeUnit(unit);
        if (map[kLeg]) return map[kLeg];
        return null;
    }

    function loadTenancyContractDraftsMap() {
        try {
            const raw = localStorage.getItem('bhd_tenancy_contract_drafts');
            const o = raw ? JSON.parse(raw) : null;
            return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
        } catch (e) {
            return {};
        }
    }

    function saveTenancyContractDraftsMap(map) {
        try {
            localStorage.setItem('bhd_tenancy_contract_drafts', JSON.stringify(map || {}));
        } catch (e) {}
    }

    function upsertTenancyContractDraftFromPayload(building, unit, payload) {
        const b = toStr(building);
        const u = toStr(unit);
        if (!b || !u || !payload || typeof payload !== 'object') return;
        const map = loadTenancyContractDraftsMap();
        const actor = getCurrentActorLedgerRecord();
        map[_tenancyDraftStorageKey(b, u)] = {
            payload,
            updatedAt: new Date().toISOString(),
            lastActorUserId: actor.staffUserId,
            lastActorName: actor.staffName
        };
        saveTenancyContractDraftsMap(map);
        try {
            removeForcedVacantUnitForKeys(b, u);
        } catch (e) {}
    }

    function removeTenancyContractDraftForKeys(buildingNo, flatNo) {
        const b = toStr(buildingNo);
        const f = normalizeUnit(flatNo);
        if (!b || !f) return;
        const map = loadTenancyContractDraftsMap();
        const bNorm = normalizeReservationBuildingKey(b);
        let changed = false;
        Object.keys(map).forEach((k) => {
            const tab = k.indexOf('\t');
            if (tab < 0) return;
            const kb = normalizeReservationBuildingKey(k.slice(0, tab));
            const ku = normalizeUnit(k.slice(tab + 1));
            if (kb === bNorm && ku === f) {
                delete map[k];
                changed = true;
            }
        });
        if (changed) saveTenancyContractDraftsMap(map);
    }

    function removeTenancyContractDraftsForTargets(targets) {
        (Array.isArray(targets) ? targets : []).forEach(({ building, unit }) => {
            removeTenancyContractDraftForKeys(building, unit);
        });
    }

    let _savedContractsMapCache = null;
    let _savedContractsMapCacheRaw = null;

    function loadSavedContractsByUnitMap(forceReload) {
        try {
            const raw = localStorage.getItem('bhd_saved_contracts_by_unit');
            if (!forceReload && _savedContractsMapCache && raw === _savedContractsMapCacheRaw) {
                return _savedContractsMapCache;
            }
            const o = raw ? JSON.parse(raw) : null;
            const map = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
            _savedContractsMapCache = map;
            _savedContractsMapCacheRaw = raw;
            return map;
        } catch (e) {
            return {};
        }
    }

    function saveSavedContractsByUnitMap(map) {
        try {
            const json = JSON.stringify(map || {});
            localStorage.setItem('bhd_saved_contracts_by_unit', json);
            _savedContractsMapCache = map;
            _savedContractsMapCacheRaw = json;
            bumpUnitsDataCache();
        } catch (e) {}
    }

    function getSavedContractMapEntry(map, building, unit) {
        if (!map || typeof map !== 'object') return null;
        const kNorm = _tenancyDraftStorageKey(building, unit);
        if (map[kNorm]) return map[kNorm];
        const kLeg = toStr(building) + '\t' + normalizeUnit(unit);
        if (map[kLeg]) return map[kLeg];
        return null;
    }

    function getSavedContractEntryForUnit(u) {
        if (!u) return null;
        return getSavedContractMapEntry(loadSavedContractsByUnitMap(), u.building, u.unit);
    }

    function getSavedContractPayloadForUnit(unit) {
        const e = getSavedContractEntryForUnit(unit);
        return e && e.payload && typeof e.payload === 'object' ? e.payload : null;
    }

    function getContractPayloadForUnit(unit) {
        return getSavedContractPayloadForUnit(unit) || getTenancyDraftPayloadForUnit(unit);
    }

    function isUnitInSavedContractsMap(u) {
        return !!getSavedContractEntryForUnit(u);
    }

    function upsertSavedContractForUnit(building, unit, payload, lifecycleStatus) {
        const b = toStr(building);
        const u = toStr(unit);
        if (!b || !u || !payload || typeof payload !== 'object') return;
        const map = loadSavedContractsByUnitMap();
        const actor = getCurrentActorLedgerRecord();
        const status =
            lifecycleStatus === 'active_pending' ||
            lifecycleStatus === 'active_docs_pending' ||
            lifecycleStatus === 'active_accounting_pending' ||
            lifecycleStatus === 'active'
                ? resolveContractLifecycleStatus(payload)
                : payloadNeedsAdditionalDataForLifecycle(payload)
                  ? 'active_pending'
                  : resolveContractLifecycleStatus(payload);
        const enriched = {
            ...payload,
            contractSavedAt: toStr(payload.contractSavedAt) || new Date().toISOString(),
            contractSavedStatus: status
        };
        map[_tenancyDraftStorageKey(b, u)] = {
            payload: enriched,
            lifecycleStatus: status,
            savedAt: enriched.contractSavedAt,
            updatedAt: new Date().toISOString(),
            lastActorUserId: actor.staffUserId,
            lastActorName: actor.staffName
        };
        saveSavedContractsByUnitMap(map);
        if (!_accountingSyncMuted) {
            try {
                syncAccountingFromContractPayload(b, u, enriched);
                const afterAcctStatus = resolveContractLifecycleStatus(enriched);
                if (afterAcctStatus !== status) {
                    enriched.contractSavedStatus = afterAcctStatus;
                    map[_tenancyDraftStorageKey(b, u)].payload = enriched;
                    map[_tenancyDraftStorageKey(b, u)].lifecycleStatus = afterAcctStatus;
                    map[_tenancyDraftStorageKey(b, u)].updatedAt = new Date().toISOString();
                    saveSavedContractsByUnitMap(map);
                }
            } catch (_eAcctSync) {}
        }
    }

    function loadContractHistoryByUnitMap() {
        try {
            const raw = localStorage.getItem('bhd_contract_history_by_unit');
            const o = raw ? JSON.parse(raw) : null;
            return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
        } catch (_eChLoad) {
            return {};
        }
    }

    function saveContractHistoryByUnitMap(map) {
        try {
            localStorage.setItem('bhd_contract_history_by_unit', JSON.stringify(map || {}));
        } catch (_eChSave) {}
    }

    function cloneContractPayloadForArchive(payload) {
        if (!payload || typeof payload !== 'object') return null;
        try {
            return JSON.parse(JSON.stringify(payload));
        } catch (_eClone) {
            return { ...payload };
        }
    }

    function archiveSupersededContractPayload(payload, meta = {}) {
        if (!payload || typeof payload !== 'object') return false;
        const b = toStr(payload.buildingNo);
        const u = toStr(payload.flatNo);
        if (!b || !u) return false;
        const snap = cloneContractPayloadForArchive(payload);
        if (!snap) return false;
        const ag = toStr(snap.agreementNo);
        const map = loadContractHistoryByUnitMap();
        const k = _tenancyDraftStorageKey(b, u);
        const list = Array.isArray(map[k]) ? map[k] : [];
        const dup = list.some(
            (row) =>
                toStr(row?.payload?.agreementNo) === ag &&
                toStr(row?.reason) === toStr(meta.reason || 'renewal')
        );
        if (dup) return false;
        const actor = getCurrentActorLedgerRecord();
        list.push({
            archivedAt: new Date().toISOString(),
            reason: toStr(meta.reason || 'renewal'),
            supersededBy: toStr(meta.supersededBy),
            archivedBy: actor.staffName,
            payload: snap
        });
        map[k] = list;
        saveContractHistoryByUnitMap(map);
        return true;
    }

    function contractVersionOrdinalAr(n) {
        const map = { 1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع', 5: 'الخامس', 6: 'السادس', 7: 'السابع', 8: 'الثامن', 9: 'التاسع', 10: 'العاشر' };
        return map[n] || String(n);
    }

    function contractVersionOrdinalEn(n) {
        const map = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: '8th', 9: '9th', 10: '10th' };
        return map[n] || `${n}th`;
    }

    /** تسمية نسخة العقد (أصلي / تجديد) / Contract version label — original vs renewal ordinal */
    function contractVersionOrdinalLabel(archiveIndex, isCurrent, totalArchived) {
        if (!isCurrent) {
            if (archiveIndex === 0) {
                return {
                    ar: 'العقد الأصلي',
                    en: 'Original contract',
                    bilingual: t('العقد الأصلي / Original contract', 'Original contract / العقد الأصلي')
                };
            }
            const n = archiveIndex;
            return {
                ar: `التجديد ${contractVersionOrdinalAr(n)}`,
                en: `${contractVersionOrdinalEn(n)} renewal`,
                bilingual: t(
                    `التجديد ${contractVersionOrdinalAr(n)} / ${contractVersionOrdinalEn(n)} renewal`,
                    `${contractVersionOrdinalEn(n)} renewal / التجديد ${contractVersionOrdinalAr(n)}`
                )
            };
        }
        if (totalArchived === 0) {
            return {
                ar: 'العقد الأصلي (حالي)',
                en: 'Original contract (current)',
                bilingual: t('العقد الأصلي (حالي) / Original contract (current)', 'Original contract (current) / العقد الأصلي (حالي)')
            };
        }
        const n = totalArchived;
        return {
            ar: `التجديد ${contractVersionOrdinalAr(n)} (حالي)`,
            en: `Current — ${contractVersionOrdinalEn(n)} renewal`,
            bilingual: t(
                `التجديد ${contractVersionOrdinalAr(n)} (حالي) / Current — ${contractVersionOrdinalEn(n)} renewal`,
                `Current — ${contractVersionOrdinalEn(n)} renewal / التجديد ${contractVersionOrdinalAr(n)} (حالي)`
            )
        };
    }

    function payloadNeedsAdditionalDataForLifecycle(payload) {
        if (!payload || typeof payload !== 'object') return true;
        if (payload.isRenewalContract === true || toStr(payload.previousAgreementNo).trim()) {
            return contractRenewalFinancialNeedsAdditionalData(payload);
        }
        return contractFinancialPayloadNeedsAdditionalData(payload);
    }

    const PROPERTY_DOCUMENT_COMBINED_BUNDLE_KEY = 'all_documents';

    const PROPERTY_DOCUMENT_CATEGORIES = [
        { key: 'contract', ar: 'عقد الإيجار', en: 'Lease contract' },
        { key: 'municipal', ar: 'عقد البلدية', en: 'Municipal contract' },
        { key: 'identity', ar: 'هوية / جواز', en: 'ID / passport' },
        { key: 'cards', ar: 'بطاقات الدخول', en: 'Access cards' },
        { key: 'cheques', ar: 'شيكات', en: 'Cheques' },
        { key: 'receipts', ar: 'إيصالات', en: 'Receipts' },
        { key: 'insurance', ar: 'تأمين / ضمان', en: 'Insurance / deposit' },
        { key: 'declaration', ar: 'إقرار / ملحق', en: 'Declaration / addendum' },
        {
            key: 'all_documents',
            ar: 'كل المستندات — ملف موحّد موقّع',
            en: 'All documents — combined signed bundle'
        },
        { key: 'other', ar: 'أخرى / إضافي', en: 'Other / additional' }
    ];

    /** تصنيفات إلزامية لكل عقد جديد أو تجديد / Mandatory categories for each new contract or renewal */
    const PROPERTY_DOCUMENT_MANDATORY_CATEGORY_KEYS = [
        'contract',
        'municipal',
        'identity',
        'cards',
        'cheques',
        'receipts',
        'insurance',
        'declaration'
    ];

    function hasPropertyDocumentCombinedBundle(docs) {
        return (Array.isArray(docs) ? docs : []).some(
            (d) => contractAttachmentPresent(d) && toStr(d.category) === PROPERTY_DOCUMENT_COMBINED_BUNDLE_KEY
        );
    }

    function getPropertyDocumentUploadModesHintText() {
        return t(
            '① المرفقات الأساسية (المالك، العقار، المستأجر) تُجلب تلقائياً من النظام · ② رفع المستندات واحداً واحداً · ③ أو ملف موحّد «كل المستندات» (موقّع من المستأجر) · ④ ملفات إضافية مستقبلية.',
            '① Core attachments (owner, property, tenant) auto-linked from system · ② Upload one by one · ③ Or one combined «All documents» file (tenant-signed) · ④ Additional files later.'
        );
    }

    function getMissingPropertyDocumentCategoriesFromDocs(docs) {
        if (hasPropertyDocumentCombinedBundle(docs)) return [];
        const uploaded = new Set();
        (Array.isArray(docs) ? docs : []).forEach((d) => {
            if (contractAttachmentPresent(d)) uploaded.add(toStr(d.category));
        });
        return PROPERTY_DOCUMENT_MANDATORY_CATEGORY_KEYS.filter((k) => !uploaded.has(k));
    }

    function getMissingPropertyDocumentCategories(payload) {
        return getMissingPropertyDocumentCategoriesFromDocs(parsePropertyDocumentsBundle(payload));
    }

    function formatMissingPropertyDocumentCategoriesList(missingKeys) {
        return (Array.isArray(missingKeys) ? missingKeys : [])
            .map((k) => propertyDocumentCategoryLabel(k))
            .join('\n• ');
    }

    function resetPropertyDocumentsForNewRenewal(payload) {
        if (!payload || typeof payload !== 'object') return;
        payload.propertyDocumentsBundle = [];
        payload.propertyDocumentsBundleJson = '[]';
        payload.propertyDocumentsComplete = false;
        delete payload.propertyDocumentsCompletedAt;
        payload.propertyDocumentsRenewalRequired = true;
    }

    function parsePropertyDocumentsBundle(payload) {
        return parsePayloadJsonArrayField(payload, 'propertyDocumentsBundleJson', 'propertyDocumentsBundle');
    }

    function contractFinancialDataComplete(payload) {
        return !payloadNeedsAdditionalDataForLifecycle(payload);
    }

    function contractPropertyDocumentsComplete(payload) {
        if (!payload || typeof payload !== 'object') return false;
        return getMissingPropertyDocumentCategories(payload).length === 0;
    }

    function contractMunicipalDataComplete(payload) {
        if (!payload || typeof payload !== 'object') return false;
        return !!(toStr(payload.municipalFormNo).trim() && toStr(payload.municipalContractNo).trim());
    }

    function contractActivationRequirementsComplete(payload) {
        return contractMunicipalDataComplete(payload) && contractPropertyDocumentsComplete(payload);
    }

    function analyzeContractActivationGaps(payload) {
        const p = payload && typeof payload === 'object' ? payload : {};
        return {
            municipalFormNo: !toStr(p.municipalFormNo).trim(),
            municipalContractNo: !toStr(p.municipalContractNo).trim(),
            propertyDocumentsIncomplete: !contractPropertyDocumentsComplete(p)
        };
    }

    function hasAnyContractActivationGaps(gaps) {
        if (!gaps) return false;
        return !!(
            gaps.municipalFormNo ||
            gaps.municipalContractNo ||
            gaps.propertyDocumentsIncomplete
        );
    }

    function formatContractActivationGapMessages(gaps, payload) {
        const msgs = [];
        if (!gaps) return msgs;
        if (gaps.municipalFormNo) {
            msgs.push(
                t(
                    'رقم استمارة العقد البلدي / Municipal contract form no.',
                    'Municipal contract form no. / رقم استمارة العقد البلدي'
                )
            );
        }
        if (gaps.municipalContractNo) {
            msgs.push(
                t(
                    'رقم العقد البلدي / Municipal contract no.',
                    'Municipal contract no. / رقم العقد البلدي'
                )
            );
        }
        if (gaps.propertyDocumentsIncomplete) {
            const missing = getMissingPropertyDocumentCategories(payload || {});
            if (missing.length) {
                msgs.push(
                    t('أوراق العقار الكاملة (سكنر):', 'Full property papers (scanner):') +
                        '\n• ' +
                        formatMissingPropertyDocumentCategoriesList(missing)
                );
            } else {
                msgs.push(t('أوراق العقار الكاملة (سكنر)', 'Full property papers (scanner)'));
            }
        }
        return msgs;
    }

    function assertContractActivationRequirementsOrAlert(payload) {
        const p = payload || collectStorableContractFullFromDom();
        const gaps = analyzeContractActivationGaps(p);
        if (!hasAnyContractActivationGaps(gaps)) return true;
        const msgs = formatContractActivationGapMessages(gaps, p);
        alert(
            t(
                'لا يمكن تفعيل العقد قبل إكمال المتطلبات التالية:\n\n• ',
                'The contract cannot become active until the following are complete:\n\n• '
            ) + msgs.join('\n• ')
        );
        return false;
    }

    function resolveContractLifecycleStatus(payload) {
        if (!payload || typeof payload !== 'object') return 'active_pending';
        if (!contractFinancialDataComplete(payload)) return 'active_pending';
        if (!contractActivationRequirementsComplete(payload)) return 'active_docs_pending';
        const acct = resolveContractWorkflowPrimaryUnit(payload.buildingNo, payload.flatNo, payload);
        if (acct.building && acct.unit && !contractAccountingApprovalsComplete(acct.building, acct.unit, payload)) {
            return 'active_accounting_pending';
        }
        return 'active';
    }

    function propertyDocumentCategoryLabel(key) {
        const cat = PROPERTY_DOCUMENT_CATEGORIES.find((c) => c.key === toStr(key));
        if (!cat) return t('أخرى / Other', 'Other / أخرى');
        return t(`${cat.ar} / ${cat.en}`, `${cat.en} / ${cat.ar}`);
    }

    let _propertyDocsCtx = null;

    function getPropertyDocBundleStoreArray() {
        try {
            const raw = document.getElementById('propertyDocumentsBundleJson')?.value || '[]';
            const arr = JSON.parse(toStr(raw) || '[]');
            return Array.isArray(arr) ? arr : [];
        } catch (_e) {
            return [];
        }
    }

    function setPropertyDocBundleStoreArray(arr) {
        const tx = document.getElementById('propertyDocumentsBundleJson');
        if (tx) tx.value = JSON.stringify(Array.isArray(arr) ? arr : []);
    }

    function getPropertyDocBundleFromPayload(payload) {
        return parsePropertyDocumentsBundle(payload || {});
    }

    function refreshPropertyDocumentsBundleSectionVisibility() {
        const sec = document.getElementById('propertyDocumentsBundleSection');
        if (!sec || !isContractsWorkspaceScreenActive()) return;
        const b = toStr(document.getElementById('buildingNo')?.value);
        const f = toStr(document.getElementById('flatNo')?.value);
        const saved = b && f ? getSavedContractMapEntry(loadSavedContractsByUnitMap(), b, f) : null;
        const payload = saved?.payload || collectStorableContractFullFromDom();
        const finOk = contractFinancialDataComplete(payload);
        const docsOk = contractPropertyDocumentsComplete(payload);
        const municipalOk = contractMunicipalDataComplete(payload);
        const unitForCore = saved ? { building: b, unit: f } : null;
        const coreCount = unitForCore ? collectPropertyDocumentCoreAttachments(unitForCore, payload).length : 0;
        const docCount = parsePropertyDocumentsBundle(payload).filter((d) => contractAttachmentPresent(d)).length;
        const show = !!(saved && finOk);
        sec.style.display = show ? '' : 'none';
        const viewBtn = document.getElementById('propertyDocumentsViewBtnCw');
        if (viewBtn) viewBtn.style.display = docCount > 0 || coreCount > 0 ? '' : 'none';
        const banner = document.getElementById('propertyDocumentsBundleBanner');
        if (banner) {
            banner.style.display = docsOk && municipalOk ? 'none' : '';
            const strong = banner.querySelector('strong');
            const span = banner.querySelector('span');
            if (strong) {
                strong.textContent = !municipalOk
                    ? t(
                          '📎 مطلوب — البلدية والمستندات قبل التفعيل',
                          '📎 Required — municipal refs & documents before activation'
                      )
                    : t(
                          '📎 نشط — مطلوب إرفاق كافة المستندات',
                          '📎 Active — attach all property documents'
                      );
            }
            if (span) {
                const municipalLine = !municipalOk
                    ? t(
                          '① أدخل رقم استمارة العقد البلدي ورقم العقد البلدي في أعلى النموذج. ② ',
                          '① Enter municipal form no. and municipal contract no. at the top of the form. ② '
                      )
                    : '';
                span.textContent =
                    municipalLine +
                    t(
                        'ارفع المستندات واحداً واحداً، أو دمجها في ملف موحّد باسم «كل المستندات» (الموقّعة من المستأجر)، أو أضف ملفات إضافية لاحقاً.',
                        'Upload documents one by one, merge them into one combined «All documents» file (tenant-signed), or add extra files later.'
                    );
            }
        }
        renderPropertyDocumentsBundleSummaryHost(getPropertyDocBundleStoreArray());
        try {
            refreshContractsAccountingReceiptPrintUi();
        } catch (_ePdbAcctPr) {}
    }

    function renderPropertyDocumentsBundleSummaryHost(docs) {
        const host = document.getElementById('propertyDocumentsBundleListHost');
        if (!host) return;
        const list = Array.isArray(docs) ? docs : [];
        const present = list.filter((d) => contractAttachmentPresent(d));
        const missing = getMissingPropertyDocumentCategoriesFromDocs(list);
        const hasBundle = hasPropertyDocumentCombinedBundle(list);
        if (!present.length && missing.length) {
            host.innerHTML = `<p style="font-size:12px;color:#666;margin:0">${t('لم تُرفع أوراق العقار بعد.', 'No property papers uploaded yet.')}</p>
                <p style="font-size:11px;color:#880e4f;margin:6px 0 0;line-height:1.45">${t('التصنيفات الإلزامية الناقصة:', 'Missing mandatory categories:')} ${escHtml(missing.map((k) => propertyDocumentCategoryLabel(k)).join(' · '))}</p>
                <p style="font-size:11px;color:#555;margin:4px 0 0;line-height:1.45">${t('أو ارفع ملفاً موحّداً باسم «كل المستندات».', 'Or upload one combined «All documents» file.')}</p>`;
            return;
        }
        const rows = present
            .map(
                (d) =>
                    `<div class="property-doc-bundle-row" style="font-size:12px;display:flex;justify-content:space-between;gap:8px;align-items:center">
                        <span><strong>${escHtml(propertyDocumentCategoryLabel(d.category))}</strong> — ${escHtml(toStr(d.titleAr || d.titleEn || d.name))}</span>
                        <span style="color:#2e7d32">✓</span>
                    </div>`
            )
            .join('');
        const missBlock = missing.length
            ? `<p style="font-size:11px;color:#880e4f;margin:8px 0 0;line-height:1.45">${t('التصنيفات الإلزامية الناقصة:', 'Missing mandatory categories:')} ${escHtml(missing.map((k) => propertyDocumentCategoryLabel(k)).join(' · '))}<br>${t('أو ارفع ملفاً موحّداً باسم «كل المستندات».', 'Or upload one combined «All documents» file.')}</p>`
            : hasBundle
              ? `<p style="font-size:11px;color:#2e7d32;margin:8px 0 0;line-height:1.45">✓ ${t('ملف موحّد «كل المستندات» — يستوفي المتطلبات الإلزامية.', 'Combined «All documents» file — mandatory requirement met.')}</p>`
              : '';
        host.innerHTML = rows + missBlock;
    }

    function refreshPropertyDocumentsBundleModalChrome(mode, payload) {
        const isAdditional = mode === 'additional';
        const isRenewal = !!(payload?.isRenewalContract || toStr(payload?.previousAgreementNo));
        const bannerTitle = document.getElementById('pdbModeBannerTitle');
        const bannerText = document.getElementById('pdbModeBannerText');
        const modesHint = document.getElementById('pdbUploadModesHint');
        const saveBtn = document.getElementById('pdbSaveBtn');
        if (modesHint) {
            modesHint.textContent = isAdditional
                ? t(
                      'مستندات إضافية اختيارية — ستُضاف إلى أوراق العقار الحالية ويمكن رفعها في أي وقت لاحقاً.',
                      'Optional additional documents — added to current property papers; may be uploaded anytime later.'
                  )
                : getPropertyDocumentUploadModesHintText();
        }
        if (bannerTitle) {
            bannerTitle.textContent = isAdditional
                ? t('اختياري — مستندات إضافية', 'Optional — additional documents')
                : t('مطلوب — جزء لا يتجزأ من العقد', 'Required — integral part of contract');
        }
        if (bannerText) {
            if (isAdditional) {
                bannerText.textContent = t(
                    'يمكنك إرفاق مستندات إضافية (تصنيف أخرى/إضافي). ستظهر ضمن أوراق العقار مع المستندات الحالية.',
                    'You may attach additional documents (Other/additional category). They will appear with existing property papers.'
                );
            } else if (isRenewal) {
                bannerText.textContent = t(
                    'تجديد العقد — ارفع المستندات واحداً واحداً، أو ملفاً موحّداً باسم «كل المستندات» (الموقّعة من المستأجر)، أو أضف ملفات إضافية لاحقاً.',
                    'Contract renewal — upload one by one, one combined «All documents» file (tenant-signed), or add extras later.'
                );
            } else {
                bannerText.textContent = t(
                    'يمكن رفع المستندات واحداً واحداً لكل تصنيف، أو دمجها في ملف موحّد باسم «كل المستندات» (الموقّعة من المستأجر). المرفقات الأساسية (المالك، العقار، المستأجر) تُجلب تلقائياً من النظام. يمكن إضافة ملفات إضافية مستقبلية.',
                    'Upload one by one per category, or merge into one «All documents» file (tenant-signed). Core attachments (owner, property, tenant) are auto-linked from the system. Additional files may be added later.'
                );
            }
        }
        if (saveBtn) {
            saveBtn.textContent = isAdditional
                ? t('💾 حفظ المستندات الإضافية / Save additional documents', '💾 Save additional documents / حفظ المستندات الإضافية')
                : t('💾 إكمال أوراق العقار وحفظها / Complete & save property papers', '💾 Complete & save property papers / إكمال أوراق العقار وحفظها');
        }
    }

    function renderPropertyDocumentsBundleModalRows(rows = []) {
        const host = document.getElementById('propertyDocumentsBundleModalList');
        if (!host) return;
        const normalized = (Array.isArray(rows) ? rows : []).map((x, i) => ({
            id: toStr(x.id) || `pdb_${Date.now()}_${i}`,
            category: PROPERTY_DOCUMENT_CATEGORIES.some((c) => c.key === toStr(x.category)) ? toStr(x.category) : 'other',
            titleAr: toStr(x.titleAr || x.title),
            titleEn: toStr(x.titleEn),
            name: toStr(x.name),
            type: toStr(x.type),
            dataUrl: toStr(x.dataUrl),
            relativePath: toStr(x.relativePath),
            fileId: toStr(x.fileId),
            storedOnDisk: !!x.storedOnDisk,
            uploadedAt: toStr(x.uploadedAt)
        }));
        const catOptsFor = (sel) =>
            PROPERTY_DOCUMENT_CATEGORIES.map(
                (c) =>
                    `<option value="${escAttr(c.key)}" ${c.key === sel ? 'selected' : ''}>${escHtml(t(`${c.ar} / ${c.en}`, `${c.en} / ${c.ar}`))}</option>`
            ).join('');
        host.innerHTML = normalized
            .map((x) => {
                const id = escHtml(x.id);
                const has = contractAttachmentPresent(x);
                return `
                <div class="property-doc-bundle-row" data-pdb-row="${id}">
                    <div style="display:grid;grid-template-columns:minmax(150px,1fr) 1fr 1fr;gap:8px;margin-bottom:8px">
                        <div>
                            <small style="display:block;font-size:10px;margin-bottom:3px;color:#555">${t('التصنيف / Category', 'Category / التصنيف')}</small>
                            <select data-pdb-category>${catOptsFor(x.category)}</select>
                        </div>
                        <div>
                            <small style="display:block;font-size:10px;margin-bottom:3px;color:#555">${t('وصف عربي / Arabic label', 'Arabic label / وصف عربي')}</small>
                            <input type="text" data-pdb-title-ar value="${escHtml(x.titleAr)}" maxlength="140" placeholder="${escHtml(t('مثال: عقد موقع', 'e.g. signed contract'))}">
                        </div>
                        <div>
                            <small style="display:block;font-size:10px;margin-bottom:3px;color:#555">${t('وصف إنجليزي / English label', 'English label / وصف إنجليزي')}</small>
                            <input type="text" data-pdb-title-en value="${escHtml(x.titleEn)}" maxlength="140" placeholder="e.g. signed contract">
                        </div>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
                        <input type="file" accept="image/*,.pdf" data-pdb-file="${id}">
                        <span data-pdb-name style="font-size:12px;color:#3b4b56">${has ? escHtml(x.name) + ' ✓' : '—'}</span>
                        ${has ? `<button type="button" class="mini-btn" data-pdb-preview="${id}" onclick="previewPropertyDocumentBundleItem('${id}')">${t('معاينة / Preview', 'Preview / معاينة')}</button>` : ''}
                        <button type="button" class="mini-btn" onclick="removePropertyDocumentBundleRow('${id}')">✖</button>
                    </div>
                </div>`;
            })
            .join('');
        normalized.forEach((item, i) => {
            const row = host.querySelectorAll('[data-pdb-row]')[i];
            if (!row) return;
            if (toStr(item.name)) row.dataset.attachmentName = toStr(item.name);
            if (toStr(item.dataUrl) && !item.storedOnDisk) row.dataset.attachmentDataUrl = toStr(item.dataUrl);
            if (toStr(item.relativePath)) row.dataset.attachmentRelativePath = toStr(item.relativePath);
            if (toStr(item.fileId)) row.dataset.attachmentFileId = toStr(item.fileId);
            if (item.storedOnDisk) row.dataset.storedOnDisk = '1';
            row.dataset.pdbId = item.id;
            row.dataset.pdbCategory = item.category;
            row.dataset.pdbTitleAr = item.titleAr;
            row.dataset.pdbTitleEn = item.titleEn;
            const fileInp = row.querySelector('[data-pdb-file]');
            if (fileInp) fileInp.addEventListener('change', (e) => onPropertyDocumentBundleFileChange(item.id, e.target.files[0]));
        });
        localizeBilingualUi();
    }

    function collectPropertyDocumentsBundleFromModalUi() {
        const host = document.getElementById('propertyDocumentsBundleModalList');
        if (!host) return [];
        const prev = _propertyDocsCtx?.draftDocs || getPropertyDocBundleStoreArray();
        const map = {};
        prev.forEach((x) => {
            map[toStr(x.id)] = x;
        });
        const out = [];
        host.querySelectorAll('[data-pdb-row]').forEach((row) => {
            const id = toStr(row.getAttribute('data-pdb-row'));
            const old = map[id] || {};
            out.push({
                id,
                category: toStr(row.querySelector('[data-pdb-category]')?.value) || 'other',
                titleAr: toStr(row.querySelector('[data-pdb-title-ar]')?.value),
                titleEn: toStr(row.querySelector('[data-pdb-title-en]')?.value),
                name: toStr(old.name || row.dataset.attachmentName),
                type: toStr(old.type),
                dataUrl: old.storedOnDisk ? '' : toStr(old.dataUrl || row.dataset.attachmentDataUrl),
                relativePath: toStr(old.relativePath || row.dataset.attachmentRelativePath),
                fileId: toStr(old.fileId || row.dataset.attachmentFileId),
                storedOnDisk: !!(old.storedOnDisk || row.dataset.storedOnDisk === '1'),
                uploadedAt: toStr(old.uploadedAt) || new Date().toISOString()
            });
        });
        return out;
    }

    function findOrCreatePropertyDocumentCombinedBundleRowId() {
        const rows = _propertyDocsCtx?.draftDocs || collectPropertyDocumentsBundleFromModalUi();
        let row = rows.find((x) => toStr(x.category) === PROPERTY_DOCUMENT_COMBINED_BUNDLE_KEY);
        if (row) return toStr(row.id);
        const newRow = {
            id: `pdb_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            category: PROPERTY_DOCUMENT_COMBINED_BUNDLE_KEY,
            titleAr: 'كل المستندات — موقّعة من المستأجر',
            titleEn: 'All documents — tenant signed'
        };
        rows.push(newRow);
        if (_propertyDocsCtx) _propertyDocsCtx.draftDocs = rows;
        renderPropertyDocumentsBundleModalRows(rows);
        return newRow.id;
    }

    async function onPropertyDocumentsCombinedBundleFileChange(input) {
        const f = input?.files?.[0];
        if (!f) return;
        const rowId = findOrCreatePropertyDocumentCombinedBundleRowId();
        await onPropertyDocumentBundleFileChange(rowId, f);
        if (input) input.value = '';
    }

    function addPropertyDocumentBundleRow(prefill) {
        const rows = _propertyDocsCtx?.draftDocs || collectPropertyDocumentsBundleFromModalUi();
        rows.push(
            prefill || {
                id: `pdb_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                category: 'other',
                titleAr: '',
                titleEn: ''
            }
        );
        if (_propertyDocsCtx) _propertyDocsCtx.draftDocs = rows;
        renderPropertyDocumentsBundleModalRows(rows);
    }

    function removePropertyDocumentBundleRow(id) {
        const rows = collectPropertyDocumentsBundleFromModalUi().filter((x) => toStr(x.id) !== toStr(id));
        if (_propertyDocsCtx) _propertyDocsCtx.draftDocs = rows;
        renderPropertyDocumentsBundleModalRows(rows);
    }

    async function onPropertyDocumentBundleFileChange(rowId, f) {
        if (!f) return;
        const rows = collectPropertyDocumentsBundleFromModalUi();
        let i = rows.findIndex((x) => toStr(x.id) === toStr(rowId));
        const base = i >= 0 ? { ...rows[i] } : { id: rowId, category: 'other', titleAr: '', titleEn: '' };
        try {
            const ref = await bhdPersistUploadedFile(f, { category: 'property_bundle', docType: 'property_scan' });
            Object.assign(base, bhdStripInlineBlobFromFileRef(ref));
            base.uploadedAt = new Date().toISOString();
            if (toStr(base.category) === PROPERTY_DOCUMENT_COMBINED_BUNDLE_KEY) {
                if (!toStr(base.titleAr)) base.titleAr = 'كل المستندات — موقّعة من المستأجر';
                if (!toStr(base.titleEn)) base.titleEn = 'All documents — tenant signed';
            } else if (!toStr(base.titleAr) && !toStr(base.titleEn)) {
                base.titleAr = f.name.replace(/\.[^.]+$/, '');
            }
            i = rows.findIndex((x) => toStr(x.id) === toStr(rowId));
            if (i >= 0) rows[i] = base;
            else rows.push(base);
            if (_propertyDocsCtx) _propertyDocsCtx.draftDocs = rows;
            renderPropertyDocumentsBundleModalRows(rows);
        } catch (_e) {
            alert(t('تعذر رفع الملف.', 'Could not upload the file.'));
        }
    }

    async function onPropertyDocumentsBulkFileChange(input) {
        const files = input?.files ? [...input.files] : [];
        if (!files.length) return;
        for (const f of files) {
            addPropertyDocumentBundleRow();
            const rows = _propertyDocsCtx?.draftDocs || [];
            const last = rows[rows.length - 1];
            if (last) await onPropertyDocumentBundleFileChange(last.id, f);
        }
        if (input) input.value = '';
    }

    function resolvePropertyDocsUnit(unitOpt) {
        if (unitOpt) return unitOpt;
        if (_propertyDocsCtx?.unit) return _propertyDocsCtx.unit;
        if (selectedUnitDetailsRecord) return selectedUnitDetailsRecord;
        const b = toStr(document.getElementById('buildingNo')?.value);
        const f = toStr(document.getElementById('flatNo')?.value);
        if (b && f) return { building: b, unit: f };
        return null;
    }

    function openPropertyDocumentsBundleModal(unitOpt, opt) {
        const unit = resolvePropertyDocsUnit(unitOpt);
        if (!unit) {
            alert(t('حدّد الوحدة أولاً.', 'Select the unit first.'));
            return;
        }
        if (!assertPermissionOrAlert('manage_contracts', 'لا تملك صلاحية العقود.', 'No permission for contracts.')) return;
        const payload = getSavedContractPayloadForUnit(unit) || {};
        const mode = opt?.mode === 'additional' ? 'additional' : 'required';
        if (mode !== 'additional' && !contractFinancialDataComplete(payload)) {
            alert(
                t(
                    'أكمل بيانات العقد والشيكات والإيصالات أولاً قبل رفع أوراق العقار.',
                    'Complete contract data, cheques, and receipts before uploading property papers.'
                )
            );
            return;
        }
        const docs = getPropertyDocBundleFromPayload(payload);
        _propertyDocsCtx = { unit, draftDocs: docs.slice(), mode, fromViewer: opt?.fromViewer === true };
        const title = document.getElementById('pdbTitle');
        if (title) {
            title.textContent =
                mode === 'additional'
                    ? `${t('مستندات إضافية — أوراق العقار', 'Additional documents — property papers')} — ${toStr(unit.unit)} | ${toStr(unit.building)}`
                    : `${t('أوراق العقار الكاملة', 'Full property papers')} — ${toStr(unit.unit)} | ${toStr(unit.building)}`;
        }
        const sub = document.getElementById('pdbSubtitle');
        if (sub) {
            if (mode === 'additional') {
                sub.textContent = t(
                    `عقد ${toStr(payload.agreementNo || unit.agreementNo)} — إرفاق مستندات إضافية اختيارية.`,
                    `Contract ${toStr(payload.agreementNo || unit.agreementNo)} — attach optional additional documents.`
                );
            } else if (payload.isRenewalContract || toStr(payload.previousAgreementNo)) {
                sub.textContent = t(
                    `تجديد ${toStr(payload.agreementNo || unit.agreementNo)} — ارفع كل مستندات التجديد الإلزامية.`,
                    `Renewal ${toStr(payload.agreementNo || unit.agreementNo)} — upload all mandatory renewal documents.`
                );
            } else {
                sub.textContent = t(
                    `عقد ${toStr(payload.agreementNo || unit.agreementNo)} — ارفع كل الأوراق الممسوحة ضوئياً.`,
                    `Contract ${toStr(payload.agreementNo || unit.agreementNo)} — upload all scanned papers.`
                );
            }
        }
        refreshPropertyDocumentsBundleModalChrome(mode, payload);
        renderPropertyDocumentCoreAttachmentsBlock(unit, payload, 'propertyDocumentsCoreHost');
        renderPropertyDocumentsBundleModalRows(docs);
        if (!docs.length || mode === 'additional') addPropertyDocumentBundleRow({ category: 'other', titleAr: '', titleEn: '' });
        document.getElementById('propertyDocumentsBundleModal')?.classList.add('open');
    }

    function openPropertyDocumentsAdditionalFromViewer() {
        if (!assertPermissionOrAlert('manage_contracts', 'لا تملك صلاحية العقود.', 'No permission for contracts.')) return;
        const unit = _propertyDocsCtx?.unit;
        if (!unit) return;
        openPropertyDocumentsBundleModal(unit, { mode: 'additional', fromViewer: true });
    }

    function openPropertyDocumentsBundleModalFromDetails() {
        if (!selectedUnitDetailsRecord) return;
        openPropertyDocumentsBundleModal(selectedUnitDetailsRecord);
    }

    function openPropertyDocumentsBundleModalForUnit(rowIndex) {
        const unit = (window._unitsViewRows || [])[rowIndex];
        if (!unit) return;
        openPropertyDocumentsBundleModal(unit);
    }

    function openPropertyDocumentsBundleByKey(buildingNo, flatNo) {
        const b = toStr(buildingNo);
        const f = toStr(flatNo);
        if (!b || !f) return;
        openPropertyDocumentsBundleModal({ building: b, unit: f });
    }

    function closePropertyDocumentsBundleModal() {
        document.getElementById('propertyDocumentsBundleModal')?.classList.remove('open');
        _propertyDocsCtx = null;
    }

    async function savePropertyDocumentsBundleFromModal() {
        const ctx = _propertyDocsCtx;
        if (!ctx?.unit) return;
        const mode = ctx.mode || 'required';
        const docs = collectPropertyDocumentsBundleFromModalUi().filter((d) => contractAttachmentPresent(d));
        if (!docs.length) {
            alert(
                t(
                    'ارفع مستنداً واحداً على الأقل (سكنر) قبل الحفظ.',
                    'Upload at least one scanned document before saving.'
                )
            );
            return;
        }
        const unit = ctx.unit;
        const payload = getSavedContractPayloadForUnit(unit) || {};
        const municipalFormNo =
            toStr(document.getElementById('municipalFormNo')?.value).trim() || toStr(payload.municipalFormNo).trim();
        const municipalContractNo =
            toStr(document.getElementById('municipalContractNo')?.value).trim() || toStr(payload.municipalContractNo).trim();
        if (mode === 'required' && (!municipalFormNo || !municipalContractNo)) {
            alert(
                t(
                    'يجب إدخال رقم استمارة العقد البلدي ورقم العقد البلدي قبل إتمام المستندات وتفعيل العقد.',
                    'Enter municipal contract form no. and municipal contract no. before completing documents and activating the contract.'
                )
            );
            return;
        }
        const missing = getMissingPropertyDocumentCategoriesFromDocs(docs);
        if (mode === 'required' && missing.length) {
            alert(
                `${t('تصنيفات إلزامية ناقصة — يجب إرفاق مستند لكل تصنيف:', 'Missing mandatory categories — upload a document for each:')}\n\n• ${formatMissingPropertyDocumentCategoriesList(missing)}\n\n${t('أو ارفع ملفاً موحّداً باسم «كل المستندات» (الملفات الموقّعة من المستأجر).', 'Or upload one combined «All documents» file (tenant-signed bundle).')}`
            );
            return;
        }
        const docsComplete = missing.length === 0;
        const merged = {
            ...payload,
            municipalFormNo,
            municipalContractNo,
            propertyDocumentsBundle: docs,
            propertyDocumentsBundleJson: JSON.stringify(docs),
            propertyDocumentsComplete: docsComplete,
            propertyDocumentsCompletedAt: docsComplete ? new Date().toISOString() : toStr(payload.propertyDocumentsCompletedAt)
        };
        if (docsComplete) {
            merged.propertyDocumentsRenewalRequired = false;
        }
        const lifecycle = resolveContractLifecycleStatus(merged);
        merged.contractSavedStatus = lifecycle;
        upsertSavedContractForUnit(unit.building, unit.unit, merged, lifecycle);
        setPropertyDocBundleStoreArray(docs);
        const mfEl = document.getElementById('municipalFormNo');
        const mcEl = document.getElementById('municipalContractNo');
        if (mfEl && municipalFormNo) mfEl.value = municipalFormNo;
        if (mcEl && municipalContractNo) mcEl.value = municipalContractNo;
        try {
            syncBhdKvToServer();
        } catch (_eKvPdb) {}
        try {
            renderOperationsTable();
        } catch (_eOpsPdb) {}
        const fromViewer = ctx.fromViewer === true;
        closePropertyDocumentsBundleModal();
        refreshPropertyDocumentsBundleSectionVisibility();
        try {
            if (lifecycle === 'active') {
                exitContractActivationDataMode();
            } else if (lifecycle === 'active_docs_pending') {
                enterContractActivationDataMode(merged);
            }
        } catch (_ePdbAct) {}
        if (fromViewer) {
            openPropertyDocumentsBundleViewer(unit);
        }
        if (mode === 'additional') {
            alert(
                t(
                    '✅ تم حفظ المستندات الإضافية — ستظهر ضمن أوراق العقار.',
                    '✅ Additional documents saved — they now appear in property papers.'
                )
            );
            return;
        }
        if (docsComplete) {
            if (lifecycle === 'active') {
                alert(
                    t(
                        '✅ اكتملت بيانات البلدية والمستندات — العقد نشط الآن.',
                        '✅ Municipal refs and documents are complete — the contract is now active.'
                    )
                );
            } else {
                alert(
                    t(
                        '✅ اكتملت أوراق العقار — بانتظار اعتماد المحاسب لتفعيل العقد.',
                        '✅ Property papers complete — awaiting accountant approval to activate the contract.'
                    )
                );
            }
        } else {
            alert(
                t(
                    'تم حفظ المستندات. أكمل التصنيفات الإلزامية الناقصة أو ارفع ملفاً موحّداً باسم «كل المستندات» لإتمام العقد.',
                    'Documents saved. Complete missing categories or upload one combined «All documents» file to finish the contract.'
                )
            );
        }
    }

    function resolvePropertyDocsTenantEntry(unit, payload) {
        try {
            refreshAddressBookFromSystem(false);
        } catch (_eAbRef) {}
        let entry = findAddressBookEntryForUnit(unit);
        if (!entry && payload) {
            const ix = findAddressBookTenantIndexForData(payload);
            if (ix >= 0) entry = addressBookEntries[ix];
        }
        return entry || null;
    }

    function resolveTenantMandatoryAttForPropertyDocs(payload, slotKey, entry) {
        let store = {};
        try {
            const raw = JSON.parse(toStr(payload?.contractMandatoryDocsJson) || '{}');
            if (raw && typeof raw === 'object' && !Array.isArray(raw)) store = raw;
        } catch (_eMand) {}
        if (contractAttachmentPresent(store[slotKey])) return cloneContractDocMeta(store[slotKey]);
        if (entry) return cloneContractDocMeta(lookupMandatoryAttachmentFromAddressBook(slotKey, entry));
        return null;
    }

    function pushPropertyDocumentCoreItem(items, seen, key, label, att) {
        const norm = normalizeContractAttachmentRef(att);
        if (!norm || !contractAttachmentPresent(norm)) return;
        const dedupe = toStr(norm.relativePath) || toStr(norm.dataUrl) || `${toStr(norm.fileId)}|${toStr(norm.name)}`;
        if (!dedupe || seen.has(dedupe)) return;
        seen.add(dedupe);
        items.push({
            key,
            label,
            name: toStr(norm.name),
            type: toStr(norm.type),
            dataUrl: toStr(norm.dataUrl),
            relativePath: toStr(norm.relativePath),
            fileId: toStr(norm.fileId),
            storedOnDisk: !!norm.storedOnDisk,
            source: 'core',
            isCore: true
        });
    }

    function resolveCompanySignatoriesForPropertyDocs(entry, payload) {
        if (entry && Array.isArray(entry.signatories) && entry.signatories.length) {
            return normalizeCompanySignatories(entry);
        }
        try {
            const sigs = JSON.parse(toStr(payload?.tenantCompanySignatoriesJson) || '[]');
            if (Array.isArray(sigs) && sigs.length) {
                return normalizeCompanySignatories({ signatories: sigs });
            }
        } catch (_eSigJson) {}
        return normalizeCompanySignatories(entry || {});
    }

    function collectPropertyDocumentCoreAttachments(unit, payload) {
        const items = [];
        const seen = new Set();
        if (!unit) return items;
        const building = toStr(unit.building) || toStr(payload?.buildingNo);
        const u = unit;
        const p = payload && typeof payload === 'object' ? payload : {};

        getOwnerNamesForBuilding(building).forEach((ownerName, oi) => {
            const owner = getEditableOwnerProfile(ownerName);
            const att = owner?.idCardAttachment;
            pushPropertyDocumentCoreItem(
                items,
                seen,
                `core_owner_id_${oi}`,
                t(`بطاقة المالك — ${toStr(ownerName)} / Owner ID — ${toStr(ownerName)}`, `Owner ID — ${toStr(ownerName)} / بطاقة المالك`),
                att
            );
        });

        const bProfile = getBuildingProfile(building);
        if (bProfile) {
            pushPropertyDocumentCoreItem(
                items,
                seen,
                'core_title_deed',
                t('مستندات العقار الملكية — سند الملكية / Property title deed', 'Property title deed / سند الملكية'),
                bProfile.titleDeedAttachment
            );
            pushPropertyDocumentCoreItem(
                items,
                seen,
                'core_survey_sketch',
                t('الرسم المساحي / Survey sketch', 'Survey sketch / الرسم المساحي'),
                bProfile.surveySketchAttachment
            );
        }

        const entry = resolvePropertyDocsTenantEntry(u, p);
        const isCompany = toStr(entry?.type) === 'company' || toStr(p.tenantEntityType) === 'company';

        if (isCompany) {
            pushPropertyDocumentCoreItem(
                items,
                seen,
                'core_company_cr',
                t('السجل التجاري للشركة / Company commercial registration', 'Company CR / السجل التجاري'),
                resolveTenantMandatoryAttForPropertyDocs(p, 'tenant_company_cr', entry) ||
                    entry?.commercialRegAttachment ||
                    entry?.leaseContractAttachment
            );
            const sigRows = resolveCompanySignatoriesForPropertyDocs(entry, p);
            const seenCivil = new Set();
            sigRows.forEach((sg, idx) => {
                const name = toStr(sg.signatoryName) || `${t('مفوض', 'Signatory')} ${idx + 1}`;
                const civil = toStr(sg.signatoryIdNo).trim();
                const slug = civil ? slugifyCivilForDocKey(civil) : `row_${idx}`;
                const nat = toStr(sg.signatoryNationality) || 'عماني / Omani';
                if (civil && !seenCivil.has(civil)) {
                    seenCivil.add(civil);
                    const idKey = `co_sig_${slug}_id`;
                    pushPropertyDocumentCoreItem(
                        items,
                        seen,
                        `core_sig_id_${slug}`,
                        t(`بطاقة المفوض — ${name} / Signatory ID — ${name}`, `Signatory ID — ${name} / بطاقة المفوض`),
                        resolveTenantMandatoryAttForPropertyDocs(p, idKey, entry) || sg.signatoryIdAttachment
                    );
                    if (!isOmaniNationality(nat)) {
                        const passKey = `co_sig_${slug}_passport`;
                        pushPropertyDocumentCoreItem(
                            items,
                            seen,
                            `core_sig_pass_${slug}`,
                            t(`جواز المفوض — ${name} / Signatory passport — ${name}`, `Signatory passport — ${name} / جواز المفوض`),
                            resolveTenantMandatoryAttForPropertyDocs(p, passKey, entry) || sg.signatoryPassportAttachment
                        );
                    }
                } else if (!civil) {
                    pushPropertyDocumentCoreItem(
                        items,
                        seen,
                        `core_sig_row_id_${idx}`,
                        t(`بطاقة المفوض — ${name} / Signatory ID — ${name}`, `Signatory ID — ${name} / بطاقة المفوض`),
                        resolveTenantMandatoryAttForPropertyDocs(p, `co_sig_row_${idx}_id`, entry) || sg.signatoryIdAttachment
                    );
                    if (!isOmaniNationality(nat)) {
                        pushPropertyDocumentCoreItem(
                            items,
                            seen,
                            `core_sig_row_pass_${idx}`,
                            t(`جواز المفوض — ${name} / Signatory passport — ${name}`, `Signatory passport — ${name} / جواز المفوض`),
                            resolveTenantMandatoryAttForPropertyDocs(p, `co_sig_row_${idx}_passport`, entry) ||
                                sg.signatoryPassportAttachment
                        );
                    }
                }
            });
        } else {
            pushPropertyDocumentCoreItem(
                items,
                seen,
                'core_tenant_id',
                t('بطاقة المستأجر / Tenant ID card', 'Tenant ID card / بطاقة المستأجر'),
                resolveTenantMandatoryAttForPropertyDocs(p, 'tenant_person_id', entry) || entry?.idAttachment
            );
            const nat = toStr(entry?.nationality || p.tenantNationality);
            const passAtt =
                resolveTenantMandatoryAttForPropertyDocs(p, 'tenant_person_passport', entry) || entry?.passportAttachment;
            if (contractAttachmentPresent(passAtt) || !isOmaniNationality(nat)) {
                pushPropertyDocumentCoreItem(
                    items,
                    seen,
                    'core_tenant_passport',
                    t('جواز المستأجر / Tenant passport', 'Tenant passport / جواز المستأجر'),
                    passAtt
                );
            }
        }
        return items;
    }

    function renderPropertyDocumentCoreAttachmentsBlock(unit, payload, hostId) {
        const host = document.getElementById(hostId);
        if (!host) return [];
        const core = collectPropertyDocumentCoreAttachments(unit, payload);
        if (!core.length) {
            host.style.display = 'none';
            host.innerHTML = '';
            return core;
        }
        host.style.display = '';
        host.innerHTML = `
            <strong style="font-size:12px;color:#1565c0;display:block;margin-bottom:8px">${t('مرفقات أساسية للعقد (تُجلب تلقائياً) / Core contract attachments (auto-linked)', 'Core contract attachments (auto-linked) / مرفقات أساسية للعقد')}</strong>
            <div style="display:flex;flex-direction:column;gap:6px">
                ${core
                    .map(
                        (it) => `
                    <div style="font-size:12px;display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
                        <span>${escHtml(it.label)} <span class="property-doc-core-badge">${t('أساسي / Core', 'Core / أساسي')}</span></span>
                        <span style="color:#2e7d32;font-size:11px">✓ ${escHtml(toStr(it.name) || '—')}</span>
                    </div>`
                    )
                    .join('')}
            </div>`;
        return core;
    }

    function propertyDocumentViewerCardHtml(it) {
        const coreCls = it.isCore ? ' property-docs-viewer-card--core' : '';
        const coreBadge = it.isCore
            ? `<span class="property-doc-core-badge">${t('أساسي / Core', 'Core / أساسي')}</span>`
            : '';
        return `
                <div class="property-docs-viewer-card${coreCls}">
                    ${coreBadge}
                    <strong style="font-size:12px;line-height:1.4">${escHtml(it.label)}</strong>
                    <span style="font-size:11px;color:#555;word-break:break-all">${escHtml(it.name || '—')}</span>
                    <div style="display:flex;flex-wrap:wrap;gap:6px">
                        <button type="button" class="mini-btn" onclick="previewPropertyDocumentViewerItem('${escAttr(it.key)}')">${t('معاينة / Preview', 'Preview / معاينة')}</button>
                        <button type="button" class="mini-btn" onclick="downloadPropertyDocumentViewerItem('${escAttr(it.key)}')">${t('تحميل / Download', 'Download / تحميل')}</button>
                    </div>
                </div>`;
    }

    function collectPropertyDocumentsForViewer(payload, unitOpt) {
        const unit =
            unitOpt ||
            (payload
                ? { building: toStr(payload.buildingNo), unit: toStr(payload.flatNo) }
                : null);
        const items = [];
        const seen = new Set();
        const push = (it) => {
            if (!it || !contractAttachmentPresent(it)) return;
            const dedupe = toStr(it.relativePath) || toStr(it.dataUrl) || `${toStr(it.fileId)}|${toStr(it.name)}|${toStr(it.key)}`;
            if (dedupe && seen.has(dedupe)) return;
            if (dedupe) seen.add(dedupe);
            items.push(it);
        };
        collectPropertyDocumentCoreAttachments(unit, payload).forEach((it) => push(it));
        parsePropertyDocumentsBundle(payload).forEach((d) => {
            push({
                key: `pdb_${toStr(d.id)}`,
                label: `${propertyDocumentCategoryLabel(d.category)} — ${toStr(d.titleAr || d.titleEn || d.name)}`,
                name: toStr(d.name),
                type: toStr(d.type),
                dataUrl: toStr(d.dataUrl),
                relativePath: toStr(d.relativePath),
                fileId: toStr(d.fileId),
                storedOnDisk: !!d.storedOnDisk,
                source: 'bundle'
            });
        });
        return items;
    }

    function openPropertyDocumentsBundleViewer(unitOpt) {
        const unit = resolvePropertyDocsUnit(unitOpt);
        if (!unit) return;
        const payload = getSavedContractPayloadForUnit(unit) || {};
        const items = collectPropertyDocumentsForViewer(payload, unit);
        if (!items.length) {
            alert(
                t(
                    'لا توجد أوراق عقار أو مرفقات أساسية متاحة بعد. تأكد من بيانات المالك والمبنى والمستأجر في النظام.',
                    'No property papers or core attachments available yet. Ensure owner, building, and tenant data exist in the system.'
                )
            );
            return;
        }
        const coreCount = items.filter((x) => x.isCore).length;
        const bundleCount = items.length - coreCount;
        _propertyDocsCtx = { unit, viewerItems: items };
        const addBtn = document.getElementById('pdvAttachAdditionalBtn');
        if (addBtn) addBtn.style.display = effectivePermission('manage_contracts') ? '' : 'none';
        const title = document.getElementById('pdvTitle');
        if (title) {
            title.textContent = `${t('أوراق العقار الكاملة', 'Full property papers')} — ${toStr(unit.unit)} | ${toStr(unit.building)}`;
        }
        const sub = document.getElementById('pdvSubtitle');
        if (sub) {
            sub.textContent = t(
                `${coreCount ? `${coreCount} أساسي` : ''}${coreCount && bundleCount ? ' + ' : ''}${bundleCount ? `${bundleCount} ممسوح` : ''} — عقد ${toStr(payload.agreementNo || unit.agreementNo)}`,
                `${[coreCount ? `${coreCount} core` : '', bundleCount ? `${bundleCount} scanned` : ''].filter(Boolean).join(' + ')} — contract ${toStr(payload.agreementNo || unit.agreementNo)}`
            );
        }
        const grid = document.getElementById('propertyDocumentsViewerGrid');
        if (grid) {
            grid.innerHTML = items.map((it) => propertyDocumentViewerCardHtml(it)).join('');
        }
        document.getElementById('propertyDocumentsViewerModal')?.classList.add('open');
    }

    function openPropertyDocumentsBundleViewerFromDetails() {
        if (!selectedUnitDetailsRecord) return;
        openPropertyDocumentsBundleViewer(selectedUnitDetailsRecord);
    }

    function closePropertyDocumentsViewerModal() {
        document.getElementById('propertyDocumentsViewerModal')?.classList.remove('open');
    }

    function previewPropertyDocumentBundleItem(id) {
        const docs = collectPropertyDocumentsBundleFromModalUi();
        const d = docs.find((x) => toStr(x.id) === toStr(id));
        if (!d) return;
        previewPropertyDocumentAttachment(d);
    }

    function previewPropertyDocumentViewerItem(key) {
        const it = (_propertyDocsCtx?.viewerItems || []).find((x) => toStr(x.key) === toStr(key));
        if (!it) return;
        previewPropertyDocumentAttachment(it);
    }

    async function previewPropertyDocumentAttachment(att) {
        await openAttachmentPreviewModal(att, t('معاينة المستند', 'Document preview'));
    }

    async function downloadPropertyDocumentViewerItem(key) {
        const it = (_propertyDocsCtx?.viewerItems || []).find((x) => toStr(x.key) === toStr(key));
        if (!it) return;
        await downloadAttachmentRef(it);
    }

    async function downloadPropertyDocumentsBundleAll() {
        const items = _propertyDocsCtx?.viewerItems || [];
        if (!items.length) return;
        let n = 0;
        for (const it of items) {
            if (await downloadAttachmentRef(it, `property_doc_${n + 1}`)) n++;
            await new Promise((r) => setTimeout(r, 350));
        }
        if (!n) {
            alert(t('لا توجد ملفات قابلة للتحميل في هذه الجلسة.', 'No downloadable files in this session.'));
        }
    }

    function renderUnitPropertyDocumentsStatusSection(unit) {
        const payload = getSavedContractPayloadForUnit(unit);
        if (!payload || !contractFinancialDataComplete(payload)) return '';
        const docsOk = contractPropertyDocumentsComplete(payload);
        const municipalOk = contractMunicipalDataComplete(payload);
        const activationOk = docsOk && municipalOk;
        const docs = parsePropertyDocumentsBundle(payload);
        const count = docs.filter((d) => contractAttachmentPresent(d)).length;
        const coreCount = collectPropertyDocumentCoreAttachments(unit, payload).length;
        const missing = getMissingPropertyDocumentCategories(payload);
        const isRenewal = !!(payload.isRenewalContract || toStr(payload.previousAgreementNo));
        const hasBundle = hasPropertyDocumentCombinedBundle(docs);
        if (activationOk) {
            return `<div class="details-section">
                <h5>${t('أوراق العقار الكاملة / Full property papers', 'Full property papers / أوراق العقار الكاملة')}</h5>
                <p style="font-size:12px;color:#2e7d32;margin:0;line-height:1.5">✅ ${t(`مكتمل — ${count} ممسوح${coreCount ? ` + ${coreCount} أساسي` : ''}`, `Complete — ${count} scanned${coreCount ? ` + ${coreCount} core` : ''}`)}${hasBundle ? ' · ' + t('ملف موحّد', 'Combined file') : ''}</p>
            </div>`;
        }
        const municipalLine = !municipalOk
            ? `<p style="font-size:11px;color:#880e4f;margin:6px 0 0;line-height:1.45">${t('مطلوب: رقم استمارة العقد البلدي ورقم العقد البلدي.', 'Required: municipal contract form no. and municipal contract no.')}</p>`
            : '';
        const missLine = missing.length
            ? `<p style="font-size:11px;color:#880e4f;margin:6px 0 0;line-height:1.45">${t('التصنيفات الإلزامية الناقصة:', 'Missing mandatory categories:')} ${escHtml(missing.map((k) => propertyDocumentCategoryLabel(k)).join(' · '))}<br>${t('أو ارفع ملفاً موحّداً باسم «كل المستندات».', 'Or upload one combined «All documents» file.')}</p>`
            : '';
        const renewalHint = isRenewal
            ? t('تجديد العقد — أدخل البلدية وارفع المستندات واحداً واحداً أو ملفاً موحّداً «كل المستندات».', 'Contract renewal — enter municipal refs and upload one by one or one combined «All documents» file.')
            : getPropertyDocumentUploadModesHintText();
        return `<div class="details-section">
            <h5>${t('أوراق العقار الكاملة / Full property papers', 'Full property papers / أوراق العقار الكاملة')}</h5>
            <div class="property-docs-pending-banner" style="margin:0">
                <strong>${t('نشط — مطلوب البلدية والمستندات الكاملة', 'Active — municipal refs & full documents required')}</strong>
                <span>${renewalHint}</span>
            </div>
            ${municipalLine}
            ${missLine}
        </div>`;
    }

    function normalizeRenewalPayloadUnitKeys(payload, unit) {
        if (!payload || typeof payload !== 'object' || !unit) return payload;
        payload.buildingNo = toStr(unit.building) || toStr(payload.buildingNo);
        payload.flatNo = toStr(unit.unit) || toStr(payload.flatNo);
        return payload;
    }

    /** سجل نسخ العقود للوحدة (أرشيف + حالي + مسودة تجديد) / Unit contract versions — archive, current, renewal draft */
    function collectUnitContractVersionRows(unit) {
        const rows = [];
        if (!unit) return rows;
        const hk = _tenancyDraftStorageKey(unit.building, unit.unit);
        const hmap = loadContractHistoryByUnitMap();
        const archived = (Array.isArray(hmap[hk]) ? hmap[hk] : [])
            .slice()
            .sort((a, b) => ledgerEventTimeMs(a.archivedAt) - ledgerEventTimeMs(b.archivedAt));
        archived.forEach((row, idx) => {
            const p = row?.payload;
            if (!p || typeof p !== 'object') return;
            const lbl = contractVersionOrdinalLabel(idx, false, archived.length);
            rows.push({
                key: `archive:${idx}`,
                kind: 'archived',
                labelBilingual: lbl.bilingual,
                agreementNo: toStr(p.agreementNo),
                startDate: toStr(p.startDate),
                endDate: toStr(p.endDate),
                monthlyRent: formatOMR(p.monthlyRent),
                statusBilingual: t('مؤرشف / منتهي / Archived / ended', 'Archived / ended / مؤرشف / منتهي'),
                archivedAt: toStr(row.archivedAt),
                supersededBy: toStr(row.supersededBy),
                payload: p
            });
        });
        const currentPayload = getSavedContractPayloadForUnit(unit);
        if (currentPayload) {
            const lbl = contractVersionOrdinalLabel(archived.length, true, archived.length);
            rows.push({
                key: 'current',
                kind: 'current',
                labelBilingual: lbl.bilingual,
                agreementNo: toStr(currentPayload.agreementNo),
                startDate: toStr(currentPayload.startDate),
                endDate: toStr(currentPayload.endDate),
                monthlyRent: formatOMR(currentPayload.monthlyRent),
                statusBilingual: t('حالي / نشط / Current / active', 'Current / active / حالي / نشط'),
                archivedAt: '',
                supersededBy: toStr(currentPayload.previousAgreementNo),
                payload: currentPayload
            });
        }
        const draft = getContractRenewalDraftEntryForUnit(unit);
        if (draft?.payload) {
            const p = draft.payload;
            rows.push({
                key: 'draft',
                kind: 'draft',
                labelBilingual: t('مسودة تجديد / Renewal draft', 'Renewal draft / مسودة تجديد'),
                agreementNo: toStr(draft.renewal?.agreementNo || p.agreementNo),
                startDate: toStr(draft.renewal?.newStart || p.startDate),
                endDate: toStr(draft.renewal?.newEnd || p.endDate),
                monthlyRent: formatOMR(p.monthlyRent),
                statusBilingual: t('مسودة تجديد / Renewal draft', 'Renewal draft / مسودة تجديد'),
                archivedAt: '',
                supersededBy: toStr(draft.previousSnapshot?.agreementNo || p.previousAgreementNo),
                payload: p
            });
        }
        return rows;
    }

    function contractVersionStatusChip(kind) {
        const map = {
            archived: {
                className: 'ud-cv-status-archived',
                ar: 'مؤرشف',
                en: 'Archived'
            },
            current: {
                className: 'ud-cv-status-active',
                ar: 'حالي / نشط',
                en: 'Current / active'
            },
            draft: {
                className: 'ud-cv-status-draft',
                ar: 'مسودة تجديد',
                en: 'Renewal draft'
            },
            cancelled: {
                className: 'ud-cv-status-cancelled',
                ar: 'ملغي',
                en: 'Cancelled'
            },
            pending: {
                className: 'ud-cv-status-pending',
                ar: 'معلق',
                en: 'Pending'
            },
            expired: {
                className: 'ud-cv-status-expired',
                ar: 'منتهي',
                en: 'Expired'
            }
        };
        const m = map[kind] || map.archived;
        const label = t(`${m.ar} / ${m.en}`, `${m.en} / ${m.ar}`);
        return `<span class="ud-cv-status-chip ${m.className}">${escHtml(label)}</span>`;
    }

    function isContractVersionStillActive(version) {
        if (!version) return false;
        if (version.kind === 'draft') return true;
        const end = toStr(version.endDate);
        if (!end) return version.kind === 'current';
        const d = daysUntil(end);
        return d === null || d >= 0;
    }

    function resolveContractVersionEditMode(unit, version) {
        if (!unit || !version) return 'none';
        if (!effectivePermission('manage_contracts')) return 'none';
        if (!canEditSavedContractForUnit(unit.building, unit.unit)) return 'none';
        if (version.kind === 'draft') return 'renewal_draft';
        if (version.kind === 'current') {
            if (!isContractVersionStillActive(version)) return 'none';
            const archivedCount = collectUnitContractVersionRows(unit).filter((v) => v.kind === 'archived').length;
            if (archivedCount > 0 || isSavedRenewalContractPayload(version.payload)) return 'current_renewal';
            return 'current_original';
        }
        if (version.kind === 'archived' && toStr(version.key).startsWith('archive:')) {
            const idx = parseInt(toStr(version.key).split(':')[1], 10);
            if (idx === 0) return 'deposit_only';
        }
        return 'none';
    }

    function contractVersionEditButtonLabel(mode) {
        if (mode === 'deposit_only') {
            return t('تعديل الضمان / Edit deposit', 'Edit deposit / تعديل الضمان');
        }
        if (mode === 'renewal_draft' || mode === 'current_renewal' || mode === 'current_original') {
            return t('تعديل / Edit', 'Edit / تعديل');
        }
        return '';
    }

    function buildContractVersionsTableHtml(unit, opt = {}) {
        const versions = collectUnitContractVersionRows(unit);
        if (!versions.length) return '';
        const showDetailsBtn = opt.showDetailsBtn !== false;
        const showEditBtn = opt.showEditBtn !== false;
        const tableClass = toStr(opt.tableClass) || 'ops-table ud-contract-versions-table';
        const actionHeader = showDetailsBtn || showEditBtn
            ? `<th>${t('إجراء / Action', 'Action / إجراء')}</th>`
            : '';
        const rowsHtml = versions
            .map((v) => {
                const rowClass =
                    v.kind === 'current'
                        ? 'ud-contract-version-row ud-contract-version-row--current'
                        : 'ud-contract-version-row';
                const supersededNote = v.supersededBy
                    ? `<div style="font-size:10px;color:#666;margin-top:2px">${t('السابق', 'Previous')}: ${escHtml(v.supersededBy)}</div>`
                    : '';
                const editMode = showEditBtn ? resolveContractVersionEditMode(unit, v) : 'none';
                const editBtn =
                    editMode !== 'none'
                        ? `<button type="button" class="mini-btn" style="margin-inline-start:6px" onclick="openContractVersionEdit('${escAttr(v.key)}')">${escHtml(contractVersionEditButtonLabel(editMode))}</button>`
                        : '';
                const detailsBtn = showDetailsBtn
                    ? `<button type="button" class="mini-btn" onclick="openUnitContractVersionDetails('${escAttr(v.key)}')">${t('تفاصيل / Details', 'Details / تفاصيل')}</button>${editBtn}`
                    : editBtn
                        ? editBtn
                        : '';
                const actionCell = showDetailsBtn || showEditBtn ? `<td style="white-space:nowrap">${detailsBtn}</td>` : '';
                return `<tr class="${rowClass}">
                    <td><strong>${escHtml(v.labelBilingual)}</strong>${supersededNote}</td>
                    <td>${escHtml(v.agreementNo || '—')}</td>
                    <td>${escHtml(v.startDate || '—')}</td>
                    <td>${escHtml(v.endDate || '—')}</td>
                    <td>${escHtml(v.monthlyRent || '—')}</td>
                    <td>${contractVersionStatusChip(v.kind)}</td>
                    ${actionCell}
                </tr>`;
            })
            .join('');
        return `<table class="${escAttr(tableClass)}">
            <thead>
                <tr>
                    <th>${t('النسخة / Version', 'Version / النسخة')}</th>
                    <th>${t('رقم العقد / Agreement no.', 'Agreement no. / رقم العقد')}</th>
                    <th>${t('من / From', 'From / من')}</th>
                    <th>${t('إلى / To', 'To / إلى')}</th>
                    <th>${t('الإيجار / Rent', 'Rent / الإيجار')}</th>
                    <th>${t('الحالة / Status', 'Status / الحالة')}</th>
                    ${actionHeader}
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>`;
    }

    function renderUnitContractVersionsSection(unit) {
        const versions = collectUnitContractVersionRows(unit);
        if (!versions.length) {
            return `<div class="details-section">
                <h5>${t('سجل العقود / Contract versions', 'Contract versions / سجل العقود')}</h5>
                <p style="font-size:12px;color:#666;margin:0">${t('لا يوجد عقد محفوظ لهذه الوحدة بعد.', 'No saved contract for this unit yet.')}</p>
            </div>`;
        }
        const tableHtml = buildContractVersionsTableHtml(unit, { showDetailsBtn: true });
        return `<div class="details-section">
            <h5>${t('سجل العقود / Contract versions', 'Contract versions / سجل العقود')}</h5>
            <p style="margin:6px 0 10px;font-size:11px;color:#555;line-height:1.45">${t(
                'العقد الأصلي والتجديدات السابقة والعقد الحالي. «تفاصيل» للعرض — «تعديل» حسب النسخة: العقد الحالي الساري (فترة وإيجار وشيكات) أو الضمان فقط للعقد الأصلي المؤرشف.',
                'Original contract, past renewals, and current contract. Details = view. Edit per version: active current (period, rent, cheques) or deposit only on archived original.'
            )}</p>
            <div class="table-shell" style="overflow:auto">${tableHtml}</div>
        </div>`;
    }

    function renderContractVersionsBlockForFullView(unit) {
        const tableHtml = buildContractVersionsTableHtml(unit, { showDetailsBtn: false, tableClass: 'ops-table ud-contract-versions-table cfv-contract-versions-table' });
        if (!tableHtml) {
            return `<p style="font-size:12px;color:#666;margin:12px 0 0">${t('لا يوجد سجل عقود لهذه الوحدة بعد.', 'No contract history for this unit yet.')}</p>`;
        }
        return `<div class="cfv-contract-versions-block" style="margin-top:14px">
            <p style="font-weight:700;font-size:12px;margin:0 0 8px;color:var(--primary)">${t('سجل العقود / Contract versions', 'Contract versions / سجل العقود')}</p>
            <p style="margin:0 0 10px;font-size:11px;color:#555;line-height:1.45">${t(
                'العقد الأصلي وعقود التجديد بالترتيب — كما في تفاصيل الوحدة.',
                'Original contract and renewals in order — same as unit details.'
            )}</p>
            <div class="table-shell" style="overflow:auto">${tableHtml}</div>
        </div>`;
    }

    function openUnitContractVersionDetails(versionKey) {
        const unit = selectedUnitDetailsRecord;
        if (!unit) return;
        if (
            !assertPermissionOrAlert(
                'manage_contracts',
                'لا تملك صلاحية عرض العقود والمستندات.',
                'No permission to view contracts & documents.'
            )
        ) {
            return;
        }
        const ver = collectUnitContractVersionRows(unit).find((v) => v.key === versionKey);
        if (!ver?.payload) {
            alert(t('تعذّر العثور على نسخة العقد.', 'Could not find the contract version.'));
            return;
        }
        openContractFullViewModal(unit, { payload: ver.payload, versionLabel: ver.labelBilingual });
    }

    function openContractVersionEdit(versionKey) {
        const unit = selectedUnitDetailsRecord;
        if (!unit) return;
        if (
            !assertPermissionOrAlert(
                'manage_contracts',
                'لا تملك صلاحية تعديل العقود.',
                'No permission to edit contracts.'
            )
        ) {
            return;
        }
        const ver = collectUnitContractVersionRows(unit).find((v) => v.key === versionKey);
        if (!ver) {
            alert(t('تعذّر العثور على نسخة العقد.', 'Could not find the contract version.'));
            return;
        }
        const mode = resolveContractVersionEditMode(unit, ver);
        if (mode === 'none') {
            if (!canEditSavedContractForUnit(unit.building, unit.unit)) {
                alert(
                    t(
                        'لا تملك صلاحية «تعديل العقود المحفوظة».',
                        'You do not have permission to edit saved contracts.'
                    )
                );
            } else if (!isContractVersionStillActive(ver) && ver.kind !== 'archived') {
                alert(
                    t(
                        'لا يمكن تعديل عقد منتهٍ — التعديل متاح للعقد الحالي الساري فقط.',
                        'An ended contract cannot be edited — only the active current contract.'
                    )
                );
            } else {
                alert(
                    t('لا يمكن تعديل هذه النسخة.', 'This version cannot be edited.')
                );
            }
            return;
        }
        if (mode === 'deposit_only') {
            openOriginalContractDepositEdit(unit, ver);
            return;
        }
        if (mode === 'renewal_draft' || mode === 'current_renewal') {
            openContractRenewalEditForUnit(unit);
            return;
        }
        if (mode === 'current_original') {
            openCurrentContractFinancialEdit(unit);
        }
    }

    let _contractDepositEditCtx = null;

    function updateArchivedContractPayloadAtIndex(buildingNo, flatNo, archiveIndex, patch) {
        const b = toStr(buildingNo);
        const f = toStr(flatNo);
        const idx = parseInt(archiveIndex, 10);
        if (!b || !f || idx < 0 || !patch || typeof patch !== 'object') return false;
        const map = loadContractHistoryByUnitMap();
        const k = _tenancyDraftStorageKey(b, f);
        const list = Array.isArray(map[k]) ? map[k].slice() : [];
        if (idx >= list.length || !list[idx]?.payload) return false;
        list[idx] = {
            ...list[idx],
            payload: { ...list[idx].payload, ...patch },
            updatedAt: new Date().toISOString()
        };
        map[k] = list;
        saveContractHistoryByUnitMap(map);
        return true;
    }

    function renderCdeInsuranceDepositItemsRows(rows = []) {
        const list = document.getElementById('cdeInsuranceDepositItemsList');
        if (!list) return;
        const normalized = Array.isArray(rows) ? rows : [];
        list.innerHTML = normalized
            .map((x, i) => {
                const id = escHtml(toStr(x.id) || `cde_ins_${Date.now()}_${i}`);
                const payType = ['cheque', 'cheque_group', 'other'].includes(toStr(x.payType)) ? toStr(x.payType) : 'other';
                const amount = escHtml(toStr(x.amount || '0'));
                const reference = escHtml(toStr(x.reference));
                return `
                <div data-insurance-row="${id}" style="display:grid;grid-template-columns:minmax(120px,154px) 96px minmax(100px,1fr) auto;gap:8px;align-items:end">
                    <select data-insurance-paytype>
                        <option value="cheque" ${payType === 'cheque' ? 'selected' : ''}>${t('شيك / Cheque', 'Cheque / شيك')}</option>
                        <option value="cheque_group" ${payType === 'cheque_group' ? 'selected' : ''}>${t('مجموعة شيكات / Cheque batch', 'Cheque batch / مجموعة شيكات')}</option>
                        <option value="other" ${payType === 'other' ? 'selected' : ''}>${t('أخرى / Other', 'Other / أخرى')}</option>
                    </select>
                    <input type="number" data-insurance-amount min="0" step="0.001" value="${amount}">
                    <input type="text" data-insurance-ref value="${reference}" placeholder="${escHtml(t('رقم الشيك / Cheque no.', 'Cheque no. / رقم الشيك'))}">
                    <button type="button" class="mini-btn" onclick="removeCdeInsuranceDepositItemRow('${id}')">✖</button>
                </div>`;
            })
            .join('');
        normalized.forEach((item, i) => {
            const row = list.querySelectorAll('[data-insurance-row]')[i];
            if (!row) return;
            if (toStr(item.attachmentName)) row.dataset.attachmentName = toStr(item.attachmentName);
            if (toStr(item.attachmentDataUrl) && !item.storedOnDisk) row.dataset.attachmentDataUrl = toStr(item.attachmentDataUrl);
            if (toStr(item.attachmentRelativePath)) row.dataset.attachmentRelativePath = toStr(item.attachmentRelativePath);
            if (toStr(item.attachmentFileId)) row.dataset.attachmentFileId = toStr(item.attachmentFileId);
            if (item.storedOnDisk) row.dataset.storedOnDisk = '1';
        });
        localizeBilingualUi();
    }

    function getCdeInsuranceDepositItemsFromUi() {
        const list = document.getElementById('cdeInsuranceDepositItemsList');
        if (!list) return [];
        return [...list.querySelectorAll('[data-insurance-row]')].map((row) => ({
            id: toStr(row.getAttribute('data-insurance-row')),
            payType: toStr(row.querySelector('[data-insurance-paytype]')?.value) || 'other',
            amount: toStr(row.querySelector('[data-insurance-amount]')?.value || '0'),
            reference: toStr(row.querySelector('[data-insurance-ref]')?.value),
            attachmentName: toStr(row.dataset.attachmentName),
            attachmentDataUrl: row.dataset.storedOnDisk === '1' ? '' : toStr(row.dataset.attachmentDataUrl),
            attachmentRelativePath: toStr(row.dataset.attachmentRelativePath),
            attachmentFileId: toStr(row.dataset.attachmentFileId),
            storedOnDisk: row.dataset.storedOnDisk === '1'
        }));
    }

    function addCdeInsuranceDepositItemRow() {
        const rows = getCdeInsuranceDepositItemsFromUi();
        rows.push({ id: `cde_ins_${Date.now()}`, payType: 'cheque', amount: '0', reference: '' });
        renderCdeInsuranceDepositItemsRows(rows);
    }

    function removeCdeInsuranceDepositItemRow(id) {
        const rows = getCdeInsuranceDepositItemsFromUi().filter((x) => toStr(x.id) !== toStr(id));
        renderCdeInsuranceDepositItemsRows(rows);
    }

    function openOriginalContractDepositEdit(unit, version) {
        if (!unit || !version?.payload) return;
        const idx = parseInt(toStr(version.key).split(':')[1], 10);
        if (Number.isNaN(idx) || idx < 0) return;
        _contractDepositEditCtx = { unit, archiveIndex: idx, version };
        const p = version.payload;
        const title = document.getElementById('cdeTitle');
        if (title) {
            title.textContent = `${t('تعديل الضمان — العقد الأصلي', 'Edit deposit — original contract')} — ${toStr(unit.unit)} | ${toStr(unit.building)}`;
        }
        const lbl = document.getElementById('cdeVersionLabel');
        if (lbl) lbl.textContent = toStr(version.labelBilingual);
        const amt = document.getElementById('cdeDepositAmount');
        if (amt) amt.value = toStr(p.depositAmount || '0');
        const ref = document.getElementById('cdeDepositReceiptRef');
        if (ref) ref.value = toStr(p.depositReceiptRef);
        const insRows = parsePayloadJsonArrayField(p, 'insuranceDepositItemsJson', 'insuranceDepositItems');
        renderCdeInsuranceDepositItemsRows(insRows);
        document.getElementById('contractDepositEditModal')?.classList.add('open');
    }

    function closeContractDepositEditModal() {
        document.getElementById('contractDepositEditModal')?.classList.remove('open');
        _contractDepositEditCtx = null;
    }

    function saveOriginalContractDepositEdit() {
        const ctx = _contractDepositEditCtx;
        if (!ctx?.unit) return;
        if (
            !assertPermissionOrAlert(
                'manage_contracts',
                'لا تملك صلاحية العقود.',
                'No permission for contracts.'
            )
        ) {
            return;
        }
        if (!canEditSavedContractForUnit(ctx.unit.building, ctx.unit.unit)) {
            alert(
                t(
                    'لا تملك صلاحية تعديل العقود المحفوظة.',
                    'You do not have permission to edit saved contracts.'
                )
            );
            return;
        }
        const insItems = getCdeInsuranceDepositItemsFromUi();
        const patch = {
            depositAmount: toStr(document.getElementById('cdeDepositAmount')?.value || '0'),
            depositReceiptRef: toStr(document.getElementById('cdeDepositReceiptRef')?.value),
            insuranceDepositItems: insItems,
            insuranceDepositItemsJson: JSON.stringify(insItems)
        };
        const ok = updateArchivedContractPayloadAtIndex(
            ctx.unit.building,
            ctx.unit.unit,
            ctx.archiveIndex,
            patch
        );
        if (!ok) {
            alert(t('تعذّر حفظ بيانات الضمان.', 'Could not save deposit data.'));
            return;
        }
        try {
            syncBhdKvToServer();
        } catch (_eKvDep) {}
        closeContractDepositEditModal();
        try {
            if (selectedUnitDetailsRecord) {
                const idx = (window._unitsViewRows || []).findIndex(
                    (u) =>
                        toStr(u.building) === toStr(ctx.unit.building) &&
                        normalizeUnit(u.unit) === normalizeUnit(ctx.unit.unit)
                );
                if (idx >= 0) openUnitDetailsModal(idx);
            }
        } catch (_eReopen) {}
        alert(
            t(
                '✅ تم حفظ بيانات الضمان للعقد الأصلي.',
                '✅ Original contract deposit data saved.'
            )
        );
    }

    function openCurrentContractFinancialEdit(unit) {
        unit = unit || selectedUnitDetailsRecord;
        if (!unit) return;
        const payload = getSavedContractPayloadForUnit(unit);
        if (!payload) {
            alert(t('لا يوجد عقد محفوظ.', 'No saved contract.'));
            return;
        }
        if (!isContractVersionStillActive({ endDate: payload.endDate, kind: 'current' })) {
            alert(
                t(
                    'لا يمكن تعديل عقد منتهٍ — التعديل متاح للعقد الساري فقط.',
                    'Ended contracts cannot be edited — only active contracts.'
                )
            );
            return;
        }
        const period = computeContractPeriodMonthsAndExtraDays(
            payload.startDate,
            payload.endDate,
            payload.contractMonths
        );
        const renewal = {
            agreementNo: toStr(payload.agreementNo),
            newStart: toStr(payload.startDate),
            newEnd: toStr(payload.endDate),
            newMonths: period.months || parseInt(toStr(payload.contractMonths), 10) || 12,
            newExtraDays: period.extraDays || 0,
            monthlyRent: formatRentAmountForInput(payload.monthlyRent),
            municipalFormNo: toStr(payload.municipalFormNo),
            municipalContractNo: toStr(payload.municipalContractNo),
            graceDays: toStr(payload.graceDays) || '0',
            graceAmount: toStr(payload.graceAmount) || '0.000'
        };
        closeUnitDetailsModal();
        wireRenewalMunicipalFieldHandlers();
        document.getElementById('contractRenewalFinancialModal')?.classList.remove('open');
        initContractRenewalWizardFromUnit(unit, { preserveRenewal: renewal, draftPayload: payload });
        if (_contractRenewalCtx) {
            _contractRenewalCtx.isCurrentContractEdit = true;
            _contractRenewalCtx.previousSnapshot = payload;
            _contractRenewalCtx.basePayload = payload;
        }
        const title = document.getElementById('contractRenewalTitle');
        if (title) {
            title.textContent = `${t('تعديل العقد الحالي', 'Edit current contract')} — ${toStr(unit.unit)} | ${toStr(unit.building)}`;
        }
        const newStartEl = document.getElementById('crnNewStart');
        if (newStartEl) newStartEl.readOnly = false;
        setRenewalAgreementNoInput(toStr(payload.agreementNo));
        document.getElementById('contractRenewalStepPill1')?.classList.add('active');
        document.getElementById('contractRenewalStepPill2')?.classList.remove('active');
        document.getElementById('contractRenewalModal')?.classList.add('open');
        refreshRenewalWizardEditModeUi();
        ensureRenewalMunicipalFieldsEditable();
    }

    function refreshRenewalWizardEditModeUi() {
        const isCurrent = _contractRenewalCtx?.isCurrentContractEdit === true;
        const prevBlock = document.getElementById('crnPrevContractBlock');
        if (prevBlock) prevBlock.style.display = isCurrent ? 'none' : '';
        const newTitle = document.getElementById('crnNewContractBlockTitle');
        if (newTitle) {
            newTitle.textContent = isCurrent
                ? t('فترة العقد الحالي / Current contract period', 'Current contract period / فترة العقد الحالي')
                : t('العقد الجديد / New contract', 'New contract / العقد الجديد');
        }
        const hint = document.getElementById('crnNewContractHint');
        if (hint) {
            hint.textContent = isCurrent
                ? t(
                      'عدّل فترة العقد الحالي والإيجار ثم انتقل إلى الشيكات والمبالغ.',
                      'Edit the current contract period and rent, then continue to cheques & amounts.'
                  )
                : t(
                      'يبدأ العقد الجديد في اليوم التالي لانتهاء العقد السابق.',
                      'The new contract starts the day after the previous contract ends.'
                  );
        }
        const fwd = document.getElementById('crnForwardBtn');
        if (fwd) {
            fwd.textContent = isCurrent
                ? t('تقدم → الشيكات والإيجار / Forward → cheques & rent', 'Forward → cheques & rent / تقدم → الشيكات والإيجار')
                : t('تقدم → الشيكات والمبالغ / Forward → cheques & amounts', 'Forward → cheques & amounts / تقدم → الشيكات والمبالغ');
        }
    }

    function refreshRenewalFinancialModalToolbar() {
        const ctx = _contractRenewalCtx;
        const isCurrent = ctx?.isCurrentContractEdit === true;
        const isEdit = ctx?.isEditExistingRenewal === true;
        const cancelBtn = document.querySelector('#contractRenewalFinancialModal .crn-btn-danger');
        const draftBtn = document.getElementById('crnfDraftBtn');
        const forwardBtn = document.getElementById('crnfForwardBtn');
        const backBtn = document.getElementById('crnfBackBtn');
        if (cancelBtn) cancelBtn.style.display = isCurrent || isEdit ? 'none' : '';
        if (draftBtn) draftBtn.style.display = isCurrent || isEdit ? 'none' : '';
        if (backBtn) backBtn.style.display = isCurrent ? '' : '';
        if (forwardBtn) {
            forwardBtn.textContent = isCurrent
                ? t('💾 حفظ التعديلات / Save changes', 'Save changes / 💾 حفظ التعديلات')
                : isEdit
                  ? t('💾 حفظ التعديلات / Save changes', 'Save changes / 💾 حفظ التعديلات')
                  : t('حفظ التجديد → / Save renewal →', 'Save renewal → / حفظ التجديد →');
        }
        const banner = document.querySelector('#contractRenewalFinancialModal .crn-renewal-fin-banner');
        if (banner) {
            banner.textContent = isCurrent
                ? t(
                      'عدّل شيكات وفترة الإيجار للعقد الحالي الساري فقط.',
                      'Edit cheques and rent schedule for the active current contract only.'
                  )
                : t(
                      'أدخل شيكات فترة التجديد الجديدة فقط. شيكات العقد السابق محفوظة في الأرشيف ولن تُحذف.',
                      'Enter cheques for the new renewal period only. Previous contract cheques remain archived and are not deleted.'
                  );
        }
    }

    function removeSavedContractForKeys(buildingNo, flatNo) {
        const b = toStr(buildingNo);
        const f = toStr(flatNo);
        if (!b || !f) return;
        const map = loadSavedContractsByUnitMap();
        const kNorm = _tenancyDraftStorageKey(b, f);
        const kLeg = b + '\t' + normalizeUnit(f);
        if (!map[kNorm] && !map[kLeg]) return;
        delete map[kNorm];
        delete map[kLeg];
        saveSavedContractsByUnitMap(map);
    }

    function isPaymentMethodCheque(pm) {
        const p = toStr(pm).toLowerCase();
        return p.includes('شيك') || p.includes('chq') || p.includes('cheq');
    }

    function payloadHasDepositAttachment(payload) {
        if (!payload || typeof payload !== 'object') return false;
        if (toStr(payload.depositAttachmentName).trim()) return true;
        if (pickEmbeddedDataUrl(payload.depositAttachmentDataUrl)) return true;
        if (toStr(payload.depositAttachmentRelativePath).trim()) return true;
        return false;
    }

    function readDepositAttachmentFieldsFromDomRow(rowId) {
        const h = document.getElementById(rowId || 'depositAttachmentRow');
        if (!h?.dataset) {
            return {
                depositAttachmentName: '',
                depositAttachmentDataUrl: '',
                depositAttachmentRelativePath: '',
                depositAttachmentFileId: '',
                depositStoredOnDisk: false
            };
        }
        return {
            depositAttachmentName: toStr(h.dataset.attachmentName),
            depositAttachmentDataUrl: h.dataset.storedOnDisk === '1' ? '' : toStr(h.dataset.attachmentDataUrl),
            depositAttachmentRelativePath: toStr(h.dataset.attachmentRelativePath),
            depositAttachmentFileId: toStr(h.dataset.attachmentFileId),
            depositStoredOnDisk: h.dataset.storedOnDisk === '1'
        };
    }

    function getAccountingSecurityDepositForUnit(building, unit, regOpt) {
        const unitKey = accountingUnitKey(building, unit);
        const reg = regOpt || loadAccountingRegistry();
        return (reg.deposits || []).find((d) => d.unitKey === unitKey && d.type === 'security') || null;
    }

    function depositAttachmentFieldsFromAccountingDeposit(dep) {
        if (!dep) return null;
        const fields = {
            depositAttachmentName: toStr(dep.attachmentName),
            depositAttachmentRelativePath: toStr(dep.attachmentRelativePath),
            depositAttachmentFileId: toStr(dep.attachmentFileId),
            depositStoredOnDisk: !!dep.storedOnDisk,
            depositAttachmentDataUrl: ''
        };
        return payloadHasDepositAttachment(fields) ? fields : null;
    }

    function getDepositAttachmentFieldsForUnit(building, unit) {
        const payload = getContractPayloadForUnit({ building, unit });
        if (payload && payloadHasDepositAttachment(payload)) {
            return {
                depositAttachmentName: toStr(payload.depositAttachmentName),
                depositAttachmentRelativePath: toStr(payload.depositAttachmentRelativePath),
                depositAttachmentFileId: toStr(payload.depositAttachmentFileId),
                depositStoredOnDisk: !!payload.depositStoredOnDisk,
                depositAttachmentDataUrl: ''
            };
        }
        const rv = findUnitReservationRecordFromRow({ building, unit });
        const fd = rv?.formData;
        if (fd && payloadHasDepositAttachment(fd)) {
            return {
                depositAttachmentName: toStr(fd.depositAttachmentName),
                depositAttachmentRelativePath: toStr(fd.depositAttachmentRelativePath),
                depositAttachmentFileId: toStr(fd.depositAttachmentFileId),
                depositStoredOnDisk: !!fd.depositStoredOnDisk,
                depositAttachmentDataUrl: ''
            };
        }
        return depositAttachmentFieldsFromAccountingDeposit(getAccountingSecurityDepositForUnit(building, unit));
    }

    /** التأمين مُغطّى من المحاسبة (بانتظار أو معتمد) أو مرفق من الحجز — لا يُطلب إعادة إدخاله عند توثيق العقد / Deposit covered by accounting queue or reservation upload */
    function payloadDepositSatisfiedByAccounting(payload) {
        if (!payload || typeof payload !== 'object') return false;
        const amt = parseFloat(payload.depositAmount) || 0;
        if (amt <= 0) return true;
        const primary = resolveContractWorkflowPrimaryUnit(payload.buildingNo, payload.flatNo, payload);
        const dep = getAccountingSecurityDepositForUnit(primary.building, primary.unit);
        if (dep && isAccountingDepositReceiptConfirmed(dep)) return true;
        if (toStr(payload.depositReceiptRef).trim() && payloadHasDepositAttachment(payload)) return true;
        if (payloadHasDepositAttachment(payload) && dep) return true;
        if (!dep) return false;
        if (isAccountingDepositPendingReceipt(dep.status)) {
            return (
                payloadHasDepositAttachment(payload) ||
                !!(toStr(dep.attachmentRelativePath).trim() || toStr(dep.attachmentName).trim())
            );
        }
        return false;
    }

    function enrichPayloadDepositFromAccounting(payload) {
        if (!payload || typeof payload !== 'object') return payload;
        const b = toStr(payload.buildingNo);
        const u = toStr(payload.flatNo);
        if (!b || !u) return payload;
        const out = { ...payload };
        const dep = getAccountingSecurityDepositForUnit(b, u);
        if (dep) {
            if (toStr(dep.reference) && !toStr(out.depositReceiptRef).trim()) {
                out.depositReceiptRef = toStr(dep.reference);
            }
            if (!payloadHasDepositAttachment(out)) {
                const att = depositAttachmentFieldsFromAccountingDeposit(dep) || getDepositAttachmentFieldsForUnit(b, u);
                if (att) Object.assign(out, att);
            }
        } else if (!payloadHasDepositAttachment(out)) {
            const att = getDepositAttachmentFieldsForUnit(b, u);
            if (att) Object.assign(out, att);
        }
        return out;
    }

    function syncAccountingDepositFromReservationPayload(building, unit, formData) {
        const b = toStr(building);
        const u = toStr(unit);
        if (!b || !u || !formData || typeof formData !== 'object') return false;
        const depositAmount = parseFloat(formData.depositAmount) || 0;
        if (depositAmount <= 0) return false;
        const reg = loadAccountingRegistry();
        const unitKey = accountingUnitKey(b, u);
        const linkedKey = accountingDepositLinkedKey(b, u, 'security');
        const existing = (reg.deposits || []).find((d) => d.linkedKey === linkedKey);
        const agreementNo = toStr(formData.agreementNo);
        const tenant = toStr(formData.tenantNameAr || formData.tenantNameEn);
        const dep = {
            id: existing?.id || newAccountingId('dep'),
            unitKey,
            building: b,
            unit: u,
            linkedKey,
            type: 'security',
            amount: depositAmount,
            reference: toStr(formData.depositReceiptRef) || toStr(existing?.reference),
            status: existing?.status || 'pending_receipt',
            agreementNo: agreementNo || existing?.agreementNo,
            tenant: tenant || existing?.tenant,
            attachmentName: toStr(formData.depositAttachmentName) || toStr(existing?.attachmentName),
            attachmentRelativePath: toStr(formData.depositAttachmentRelativePath) || toStr(existing?.attachmentRelativePath),
            attachmentFileId: toStr(formData.depositAttachmentFileId) || toStr(existing?.attachmentFileId),
            storedOnDisk: formData.depositStoredOnDisk || existing?.storedOnDisk,
            receiptBankAccountId: existing?.receiptBankAccountId || '',
            receiptApprovedAt: existing?.receiptApprovedAt,
            receiptApprovedByName: existing?.receiptApprovedByName,
            receiptApprovalNote: existing?.receiptApprovalNote,
            updatedAt: new Date().toISOString()
        };
        if (existing && isAccountingDepositHeldStatus(existing.status)) {
            dep.status = existing.status;
            dep.reference = toStr(existing.reference) || dep.reference;
        }
        const idx = (reg.deposits || []).findIndex((d) => d.linkedKey === linkedKey);
        if (idx >= 0) reg.deposits[idx] = dep;
        else reg.deposits.push(dep);
        saveAccountingRegistry(reg);
        return true;
    }

    function updateReservationDepositFieldsForUnit(building, unit, patch) {
        const idx = findReservationIndexForUnit(building, unit);
        if (idx < 0 || !patch || typeof patch !== 'object') return;
        const r = unitReservations[idx];
        if (!r.formData || typeof r.formData !== 'object') r.formData = {};
        Object.assign(r.formData, patch);
        try {
            saveDashboardAux();
        } catch (_eResDep) {}
    }

    function paymentScheduleRowHasGap(r, isCheque) {
        if (!r || typeof r !== 'object') return true;
        if (isCheque) {
            return (
                !toStr(r.checkNo).trim() ||
                !(
                    toStr(r.checkAttachmentName).trim() ||
                    pickEmbeddedDataUrl(r.checkAttachmentDataUrl, r.attachmentDataUrl, r.dataUrl) ||
                    toStr(r.checkAttachmentRelativePath || r.attachmentRelativePath).trim()
                )
            );
        }
        return !toStr(r.dueDate).trim() || !toStr(r.amount).trim();
    }

    function vatChequeRowHasGap(r) {
        if (!r || typeof r !== 'object') return true;
        return (
            !toStr(r.checkNo).trim() ||
            !(
                toStr(r.checkAttachmentName).trim() ||
                pickEmbeddedDataUrl(r.checkAttachmentDataUrl, r.attachmentDataUrl, r.dataUrl) ||
                toStr(r.checkAttachmentRelativePath || r.attachmentRelativePath).trim()
            )
        );
    }

    function contractRentChequeRowReadyForAccounting(row, payload) {
        if (!row || typeof row !== 'object') return false;
        if (!isPaymentMethodCheque(payload?.paymentMethod)) return false;
        return !paymentScheduleRowHasGap(row, true);
    }

    function contractVatChequeRowReadyForAccounting(row, payload) {
        if (!row || typeof row !== 'object') return false;
        if (toStr(payload?.contractSubjectToVat) !== 'yes') return false;
        if (toStr(payload?.vatPaymentMode) !== 'separate') return false;
        return !vatChequeRowHasGap(row);
    }

    function resolveAccountingChequeStatusOnContractSync(existing, incoming) {
        const inc = toStr(incoming?.status) || 'awaiting_contract_data';
        if (!existing) return inc;
        const ex = toStr(existing.status);
        if (inc === 'awaiting_contract_data') {
            if (ex === 'pending_receipt' || ex === 'awaiting_contract_data' || ex === 'receipt_rejected') return 'awaiting_contract_data';
            return ex || 'awaiting_contract_data';
        }
        if (inc === 'pending_receipt') {
            if (!ex || ex === 'awaiting_contract_data' || ex === 'pending_receipt' || ex === 'receipt_rejected') return 'pending_receipt';
            return ex;
        }
        return ex || inc;
    }

    function isAccountingChequeAwaitingContractData(status) {
        return toStr(status) === 'awaiting_contract_data';
    }

    function isAccountingChequeVisibleInWorkspace(c) {
        if (!c) return false;
        return !isAccountingChequeAwaitingContractData(c.status);
    }

    function insuranceDepositItemHasGap(it) {
        if (!it || typeof it !== 'object') return false;
        const pt = toStr(it.payType);
        if (pt !== 'cheque' && pt !== 'cheque_group') return false;
        return (
            !toStr(it.reference).trim() ||
            !(toStr(it.attachmentName).trim() || toStr(it.attachmentDataUrl).trim())
        );
    }

    function parsePayloadJsonArrayField(payload, jsonKey, arrayKey) {
        let arr = payload && payload[arrayKey];
        if (!Array.isArray(arr) && payload && payload[jsonKey]) {
            try {
                arr = JSON.parse(toStr(payload[jsonKey]) || '[]');
            } catch (_e) {
                arr = [];
            }
        }
        return Array.isArray(arr) ? arr : [];
    }

    /** هل العقد المحفوظ يحتاج بيانات مالية إضافية (شيكات/ضمان)؟ — بدون البلدية / Financial gaps only (excludes municipal) */
    function contractFinancialPayloadNeedsAdditionalData(payload) {
        if (!payload || typeof payload !== 'object') return true;
        const p = enrichPayloadDepositFromAccounting(payload);
        const depositAmt = parseFloat(p.depositAmount) || 0;
        if (depositAmt > 0 && !payloadHasDepositAttachment(p) && !payloadDepositSatisfiedByAccounting(p)) {
            return true;
        }
        const pm = toStr(payload.paymentMethod).trim();
        const byChq = isPaymentMethodCheque(payload.paymentMethod);
        if (pm) {
            const schedule = parsePayloadJsonArrayField(payload, 'paymentScheduleJson', 'paymentSchedule');
            if (!schedule.length) return true;
            if (schedule.some((r) => paymentScheduleRowHasGap(r, byChq))) return true;
        }
        if (toStr(payload.contractSubjectToVat) === 'yes' && toStr(payload.vatPaymentMode) === 'separate') {
            const vatSchedule = parsePayloadJsonArrayField(payload, 'vatChequeScheduleJson', 'vatChequeSchedule');
            const count = Math.max(1, parseInt(toStr(payload.vatChequeCount), 10) || 1);
            if (vatSchedule.length < count) return true;
            if (vatSchedule.some((r) => vatChequeRowHasGap(r))) return true;
        }
        const insItems = parsePayloadJsonArrayField(payload, 'insuranceDepositItemsJson', 'insuranceDepositItems');
        if (insItems.some((it) => insuranceDepositItemHasGap(it))) return true;
        return false;
    }

    /** هل العقد المحفوظ يحتاج بيانات إضافية مالية؟ / Saved contract missing deposit or schedule data */
    function contractPayloadNeedsAdditionalData(payload) {
        return contractFinancialPayloadNeedsAdditionalData(payload);
    }

    function analyzeContractAdditionalDataGaps(payload) {
        const p = enrichPayloadDepositFromAccounting(payload || {});
        const gaps = {
            depositReceiptRef: false,
            depositAttachment: false,
            paymentScheduleIncomplete: false,
            paymentScheduleMonthIndices: [],
            vatChequeIndices: [],
            insuranceDepositRowIds: []
        };
        if (!payload || typeof payload !== 'object') {
            gaps.depositReceiptRef = false;
            gaps.depositAttachment = true;
            gaps.paymentScheduleIncomplete = true;
            return gaps;
        }
        gaps.depositReceiptRef = false;
        const depositAmt = parseFloat(p.depositAmount) || 0;
        gaps.depositAttachment =
            depositAmt > 0 && !payloadHasDepositAttachment(p) && !payloadDepositSatisfiedByAccounting(p);
        const pm = toStr(p.paymentMethod).trim();
        const byChq = isPaymentMethodCheque(p.paymentMethod);
        if (pm) {
            const schedule = parsePayloadJsonArrayField(p, 'paymentScheduleJson', 'paymentSchedule');
            if (!schedule.length) {
                gaps.paymentScheduleIncomplete = true;
            } else {
                schedule.forEach((r) => {
                    if (paymentScheduleRowHasGap(r, byChq)) {
                        gaps.paymentScheduleMonthIndices.push(parseInt(r.monthIndex, 10) || 0);
                    }
                });
            }
        }
        if (toStr(p.contractSubjectToVat) === 'yes' && toStr(p.vatPaymentMode) === 'separate') {
            const vatSchedule = parsePayloadJsonArrayField(p, 'vatChequeScheduleJson', 'vatChequeSchedule');
            vatSchedule.forEach((r) => {
                if (vatChequeRowHasGap(r)) gaps.vatChequeIndices.push(parseInt(r.chequeIndex, 10) || 0);
            });
        }
        const insItems = parsePayloadJsonArrayField(p, 'insuranceDepositItemsJson', 'insuranceDepositItems');
        insItems.forEach((it) => {
            if (insuranceDepositItemHasGap(it)) gaps.insuranceDepositRowIds.push(toStr(it.id));
        });
        return gaps;
    }

    function hasAnyContractAdditionalDataGaps(gaps) {
        if (!gaps) return false;
        return (
            !!gaps.depositReceiptRef ||
            !!gaps.depositAttachment ||
            !!gaps.paymentScheduleIncomplete ||
            (gaps.paymentScheduleMonthIndices && gaps.paymentScheduleMonthIndices.length > 0) ||
            (gaps.vatChequeIndices && gaps.vatChequeIndices.length > 0) ||
            (gaps.insuranceDepositRowIds && gaps.insuranceDepositRowIds.length > 0)
        );
    }

    function migrateLegacySavedContractToRegistry() {
        try {
            const raw = localStorage.getItem('bhd_contract_full');
            if (!raw) return;
            const o = JSON.parse(raw);
            if (!isMeaningfulContractPayload(o)) return;
            const b = toStr(o.buildingNo);
            const u = toStr(o.flatNo);
            if (!b || !u) return;
            if (getSavedContractMapEntry(loadSavedContractsByUnitMap(), b, u)) return;
            if (getTenancyDraftMapEntry(loadTenancyContractDraftsMap(), b, u)) return;
            if (!o.contractSavedAt && !/^TC-/i.test(toStr(o.agreementNo))) return;
            const st = o.contractSavedStatus || resolveContractLifecycleStatus(o);
            upsertSavedContractForUnit(b, u, o, st);
        } catch (_e) {}
    }

    /** بعد إلغاء مسودة بدون عقد مُسجّل: فرض ظهور الوحدة ضمن «شاغرة» حتى لو الصف التجريبي/المستورد كان «مؤجراً» / Force unit as Vacant in dashboards when draft is cancelled */
    function loadForcedVacantUnitKeysMap() {
        try {
            const raw = localStorage.getItem('bhd_unit_forced_vacant_keys');
            const o = raw ? JSON.parse(raw) : null;
            return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
        } catch (e) {
            return {};
        }
    }

    function saveForcedVacantUnitKeysMap(map) {
        try {
            localStorage.setItem('bhd_unit_forced_vacant_keys', JSON.stringify(map || {}));
        } catch (e) {}
    }

    function upsertForcedVacantUnit(buildingNo, flatNo) {
        const b = toStr(buildingNo);
        const f = toStr(flatNo);
        if (!b || !f) return;
        const map = loadForcedVacantUnitKeysMap();
        map[_tenancyDraftStorageKey(b, f)] = new Date().toISOString();
        saveForcedVacantUnitKeysMap(map);
    }

    function removeForcedVacantUnitForKeys(buildingNo, flatNo) {
        const b = toStr(buildingNo);
        const f = toStr(flatNo);
        if (!b || !f) return;
        const map = loadForcedVacantUnitKeysMap();
        const k = _tenancyDraftStorageKey(b, f);
        if (!map[k]) return;
        delete map[k];
        saveForcedVacantUnitKeysMap(map);
    }

    function stripUnitRowToVacantPreserveShell(u) {
        const ur = u || {};
        return {
            ...ur,
            status: 'Vacant',
            tenant: '',
            tenantEn: '',
            civilCard: '',
            contactNo: '',
            mobile: '',
            agreementNo: '',
            monthlyRent: 0,
            agreementRent: 0,
            startDate: '',
            endDate: '',
            remainingDays: '',
            monthsLeft: '',
            evacuationDate: ''
        };
    }

    function unitRowHasActiveTenantLikeBinding(row) {
        if (!row) return false;
        return !!(
            toStr(row.tenant).trim() ||
            toStr(row.mobile).trim() ||
            toStr(row.contactNo).trim()
        );
    }

    /** تطبيق فرض الشغور على مجموعة صفوف جدول الوحدات (بعد كل الدمج) / Apply vacancy overrides last */
    function applyForcedVacancyPatchesToUnitsRows(rows) {
        const fv = loadForcedVacantUnitKeysMap();
        const keys = Object.keys(fv);
        if (!keys.length || !Array.isArray(rows)) return rows;
        return rows.map((u) => {
            const k = _tenancyDraftStorageKey(u.building, u.unit);
            if (!fv[k]) return u;
            if (unitRowHasActiveTenantLikeBinding(u)) return u;
            return stripUnitRowToVacantPreserveShell(u);
        });
    }

    function isUnitInTenancyContractDraftMap(u) {
        if (!u) return false;
        if (!toStr(u.building) || !toStr(u.unit)) return false;
        const m = loadTenancyContractDraftsMap();
        return !!getTenancyDraftMapEntry(m, u.building, u.unit);
    }
    /** @returns {'draft'|'active'|'active_pending'|'renewal_pending'|'cancelled'|'reservation_draft'|'reservation_confirmed'} */
    function findLinkedContractPrimaryForUnitInSavedMap(u) {
        if (!u || !toStr(u.building) || !toStr(u.unit)) return null;
        const savedMap = loadSavedContractsByUnitMap();
        for (const sk of Object.keys(savedMap)) {
            const p = savedMap[sk]?.payload;
            if (!p) continue;
            const linked = getLinkedContractUnitsFromPayload(p);
            if (linked.length <= 1) continue;
            const b = toStr(p.buildingNo);
            if (normalizeReservationBuildingKey(b) !== normalizeReservationBuildingKey(u.building)) continue;
            const match = linked.some((lu) => normalizeUnit(lu.unit) === normalizeUnit(u.unit));
            if (!match) continue;
            const primary = resolveContractWorkflowPrimaryUnit(b, p.flatNo, p);
            if (normalizeUnit(primary.unit) !== normalizeUnit(u.unit)) {
                return { building: primary.building, unit: primary.unit };
            }
        }
        const selfEntry = getSavedContractMapEntry(savedMap, u.building, u.unit);
        const selfAg = toStr(selfEntry?.payload?.agreementNo).trim();
        const selfB = normalizeReservationBuildingKey(u.building);
        if (selfAg && selfAg !== '_draft') {
            const siblings = [];
            Object.values(savedMap).forEach((entry) => {
                const p = entry?.payload;
                if (!p) return;
                if (normalizeReservationBuildingKey(p.buildingNo) !== selfB) return;
                if (toStr(p.agreementNo).trim() !== selfAg) return;
                siblings.push(normalizeUnit(p.flatNo));
            });
            const unique = [...new Set(siblings.filter(Boolean))].sort((a, b) => compareSmart(a, b));
            if (unique.length > 1 && !unique.includes(normalizeUnit(u.unit))) return null;
            if (unique.length > 1) {
                const primaryUnit = unique[0];
                if (normalizeUnit(primaryUnit) !== normalizeUnit(u.unit)) {
                    return { building: toStr(u.building), unit: primaryUnit };
                }
            }
        }
        return null;
    }

    function getLinkedContractPrimaryLifecycleUnit(u) {
        if (!u || !toStr(u.building) || !toStr(u.unit)) return null;
        const payload = getSavedContractPayloadForUnit(u) || getTenancyDraftPayloadForUnit(u);
        if (!payload) return findLinkedContractPrimaryForUnitInSavedMap(u);
        const linked = getLinkedContractUnitsFromPayload(payload);
        if (linked.length <= 1) return findLinkedContractPrimaryForUnitInSavedMap(u);
        const primary = resolveContractWorkflowPrimaryUnit(u.building, u.unit, payload);
        if (normalizeUnit(primary.unit) === normalizeUnit(u.unit)) return null;
        return { building: primary.building, unit: primary.unit };
    }

    function getContractLifecycleStateKey(u, depth) {
        if (!u) return 'active';
        if (!depth) {
            const prim = getLinkedContractPrimaryLifecycleUnit(u);
            if (prim) return getContractLifecycleStateKey(prim, 1);
        }
        const renewalDraft = getContractRenewalDraftEntryForUnit(u);
        if (renewalDraft) return 'renewal_pending';
        const cancelReq = getContractCancellationRequestForUnit(u);
        if (cancelReq && toStr(cancelReq.status) === 'pending') return 'cancellation_pending';
        const saved = getSavedContractEntryForUnit(u);
        if (saved) {
            const payload = saved.payload;
            if (payload && !contractFinancialDataComplete(payload)) return 'active_pending';
            if (payload && !contractActivationRequirementsComplete(payload)) return 'active_docs_pending';
            const acct = resolveContractWorkflowPrimaryUnit(u.building, u.unit, payload);
            if (acct.building && acct.unit && !contractAccountingApprovalsComplete(acct.building, acct.unit, payload)) {
                return 'active_accounting_pending';
            }
            return 'active';
        }
        if (isUnitInTenancyContractDraftMap(u)) return 'draft';
        const rv = findUnitReservationRecordFromRow(u);
        if (rv && !isUnitInTenancyContractDraftMap(u)) {
            return toStr(rv.state) === 'confirmed' ? 'reservation_confirmed' : 'reservation_draft';
        }
        const st = toStr(u && u.status).toLowerCase();
        if (st === 'vacant') return 'cancelled';
        return 'active';
    }

    function getContractLifecycleStateRank(k) {
        if (k === 'draft') return 0;
        if (k === 'reservation_draft') return 1;
        if (k === 'reservation_confirmed') return 2;
        if (k === 'renewal_pending') return 7;
        if (k === 'cancellation_pending') return 6;
        if (k === 'active_pending') return 8;
        if (k === 'active_docs_pending') return 9;
        if (k === 'active_accounting_pending') return 9;
        if (k === 'active') return 10;
        return 9;
    }

    function getContractLifecycleLabelForKey(k) {
        if (k === 'cancelled') return t('ملغي', 'Cancelled');
        if (k === 'draft') return t('مسودة عقد', 'Contract draft');
        if (k === 'reservation_draft') return t('مسودة حجز', 'Reservation draft');
        if (k === 'reservation_confirmed') return t('حجز مؤكّد', 'Confirmed reservation');
        if (k === 'renewal_pending') return t('تجديد — مطلوب بيانات إضافية', 'Renewal — additional data required');
        if (k === 'cancellation_pending') return t('في انتظار إلغاء العقد', 'Awaiting contract cancellation');
        if (k === 'active_pending') return t('نشط — مطلوب بيانات إضافية', 'Active — additional data required');
        if (k === 'active_docs_pending') {
            return t('نشط — مطلوب البلدية والمستندات الكاملة', 'Active — municipal refs & full documents required');
        }
        if (k === 'active_accounting_pending') {
            return t('نشط — بانتظار اعتماد المحاسب', 'Active — awaiting accountant approval');
        }
        return t('نشط', 'Active');
    }

    function getContractLifecycleSearchBlob(u) {
        const k = getContractLifecycleStateKey(u);
        return (k + ' ' + toStr(getContractLifecycleLabelForKey(k))).toLowerCase();
    }

    function contractStoragePayloadToRentedTableRow(d) {
        if (!d || typeof d !== 'object') return null;
        if (!toStr(d.buildingNo) || !toStr(d.flatNo)) return null;
        const slice = getLinkedContractUnitSlice(d, d.flatNo);
        return {
            serialNo: '',
            building: d.buildingNo || '',
            unit: d.flatNo || '',
            floor: slice.floorDetails || d.floorDetails || '',
            unitType: slice.unitType || d.unitType || '',
            status: 'Rented',
            tenant: d.tenantNameAr || '',
            tenantEn: d.tenantNameEn || '',
            civilCard: d.tenantId || '',
            contactNo: d.tenantMobile || '',
            mobile: d.tenantMobile || '',
            agreementNo: d.agreementNo || '',
            monthlyRent: slice.monthlyRent || parseFloat(d.monthlyRent) || 0,
            agreementRent: slice.monthlyRent || parseFloat(d.monthlyRent) || 0,
            startDate: d.startDate || '',
            endDate: d.endDate || '',
            remainingDays: daysUntil(d.endDate),
            monthsLeft: d.endDate ? (daysUntil(d.endDate) !== null ? (daysUntil(d.endDate) / 30) : null) : null,
            evacuationDate: '',
            electricity: slice.electricityMeter || d.electricityMeter || '',
            electricityReading: '',
            water: slice.waterMeter || d.waterMeter || '',
            waterReading: '',
            remarks: '',
            ownerNames: formatOwnerNamesForBuilding(d.buildingNo || '')
        };
    }

    
    function formatDate(dateStr, lang) {
        if(!dateStr) return '';
        let d = new Date(dateStr);
        if(lang === 'ar') {
            return d.toLocaleDateString('ar-OM', { year:'numeric', month:'long', day:'numeric' });
        } else {
            return d.toLocaleDateString('en-GB', { year:'numeric', month:'long', day:'numeric' });
        }
    }
    
    function calcMunicipalFees() {
        let rent = parseFloat(getFormData().monthlyRent) || 0;
        let months = parseInt(getFormData().contractMonths) || 12;
        return (rent * months * 0.03).toFixed(3);
    }

    function daysUntil(dateStr) {
        if (!dateStr) return null;
        const target = new Date(dateStr);
        if (Number.isNaN(target.getTime())) return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);
        return Math.floor((target - now) / 86400000);
    }

    function getUnitsData() {
        if (_unitsDataCache) return _unitsDataCache;
        loadDashboardAux();
        try {
            migrateLegacySavedContractToRegistry();
        } catch (_eMigUnits) {}
        const useEmptyBaseUnits = localStorage.getItem('bhd_use_empty_base_units') === '1';
        if (buildingProfiles && typeof buildingProfiles === 'object') {
            try { syncManagedUnitsFromProfiles(); } catch (e) {}
        }
        const d = getFormDataForUnitsTableMerge();
        const hasContractUnit = toStr(d.buildingNo) && toStr(d.flatNo);
        /** أثناء شاشة الحجز لا نعتبر الوحدة «مؤجرة» ظاهرياً قبل «تحويل الحجز»؛ نفس المعيار لشخص أو شركة (بدون اشتراط السجل التجاري وحده). / During Reservations workspace do not treat unit as rented before «Convert tenancy contract»; same rule for person or company (CR alone is not enough). */
        const inReservationCtx = isReservationDraftSaveContext();
        const hasLeasePreviewBind =
            toStr(d.tenantNameAr).trim() ||
            toStr(d.tenantNameEn).trim() ||
            toStr(d.tenantMobile).trim();
        const hasActiveContractBind = inReservationCtx ? false : hasLeasePreviewBind;
        const dynamicRow = hasContractUnit
            ? {
            serialNo: '',
            building: d.buildingNo || "",
            unit: d.flatNo || "",
            floor: d.floorDetails || "",
            unitType: d.unitType || "",
            status: hasActiveContractBind ? "Rented" : "Vacant",
            tenant: d.tenantNameAr || "",
            tenantEn: d.tenantNameEn || "",
            civilCard: d.tenantId || "",
            contactNo: d.tenantMobile || "",
            mobile: d.tenantMobile || "",
            agreementNo: d.agreementNo || "",
            monthlyRent: parseFloat(d.monthlyRent) || 0,
            agreementRent: parseFloat(d.monthlyRent) || 0,
            startDate: d.startDate || "",
            endDate: d.endDate || "",
            remainingDays: daysUntil(d.endDate),
            monthsLeft: d.endDate ? (daysUntil(d.endDate) !== null ? (daysUntil(d.endDate) / 30) : null) : null,
            evacuationDate: '',
            electricity: d.electricityMeter || "",
            electricityReading: '',
            water: d.waterMeter || "",
            waterReading: '',
            remarks: '',
            ownerNames: formatOwnerNamesForBuilding(d.buildingNo || '')
        } : null;

        const source = (importedUnitsData.length
            ? importedUnitsData
            : useEmptyBaseUnits || !shouldUseBuiltinDemoUnits()
              ? []
              : unitsDataset
        ).filter((x) => isBuildingNameActive(x.building));
        const managedBuildingSet = new Set((managedUnitsData || []).map((u) => toStr(u.building)).filter(Boolean));
        const combined = source.filter((x) => !managedBuildingSet.has(toStr(x.building)));
        managedUnitsData.forEach((u) => {
            const ownerNames = u.ownerNames || formatOwnerNamesForBuilding(u.building);
            combined.push({ ...u, ownerNames });
        });
        const hasStoredContract = !!localStorage.getItem('bhd_contract_full');
        if (dynamicRow && hasStoredContract && isBuildingNameActive(dynamicRow.building)) {
            const existingIdx = combined.findIndex(
                (u) =>
                    normalizeReservationBuildingKey(u.building) === normalizeReservationBuildingKey(dynamicRow.building) &&
                    normalizeUnit(u.unit) === normalizeUnit(dynamicRow.unit)
            );
            if (existingIdx >= 0) {
                combined[existingIdx] = dynamicRow;
            } else if (dynamicRow.building && dynamicRow.unit) {
                combined.unshift(dynamicRow);
            }
        }
        {
            const smap = loadSavedContractsByUnitMap();
            Object.keys(smap).forEach((sk) => {
                const e = smap[sk];
                if (!e || !e.payload) return;
                const dr0 = contractStoragePayloadToRentedTableRow(e.payload);
                if (!dr0) return;
                if (!isBuildingNameActive(dr0.building)) return;
                dr0.status = 'Rented';
                const j = combined.findIndex(
                    (u) =>
                        normalizeReservationBuildingKey(u.building) === normalizeReservationBuildingKey(dr0.building) &&
                        normalizeUnit(u.unit) === normalizeUnit(dr0.unit)
                );
                if (j >= 0) {
                    combined[j] = { ...combined[j], ...dr0, status: 'Rented' };
                } else {
                    combined.unshift(dr0);
                }
            });
        }
        {
            const dmap = loadTenancyContractDraftsMap();
            const savedMap = loadSavedContractsByUnitMap();
            const appliedActive =
                hasStoredContract &&
                dynamicRow &&
                toStr(dynamicRow.building) &&
                toStr(dynamicRow.unit) &&
                _tenancyDraftStorageKey(dynamicRow.building, dynamicRow.unit);
            Object.keys(dmap).forEach((dk) => {
                const e = dmap[dk];
                if (!e || !e.payload) return;
                const dr0 = contractStoragePayloadToRentedTableRow(e.payload);
                if (!dr0) return;
                if (!isBuildingNameActive(dr0.building)) return;
                if (getSavedContractMapEntry(savedMap, dr0.building, dr0.unit)) return;
                const dk2 = _tenancyDraftStorageKey(dr0.building, dr0.unit);
                if (
                    appliedActive &&
                    dk2 === appliedActive &&
                    dynamicRow &&
                    toStr(dynamicRow.status) === 'Rented' &&
                    unitRowHasActiveTenantLikeBinding(dynamicRow)
                )
                    return;
                const j = combined.findIndex(
                    (u) =>
                        normalizeReservationBuildingKey(u.building) === normalizeReservationBuildingKey(dr0.building) &&
                        normalizeUnit(u.unit) === normalizeUnit(dr0.unit)
                );
                if (j >= 0) {
                    combined[j] = dr0;
                } else {
                    combined.unshift(dr0);
                }
            });
        }
        const withRenewalDraftDates = combined.map((u) => {
            const draft = getContractRenewalDraftEntryForUnit(u);
            if (!draft) return u;
            const r = draft.renewal && typeof draft.renewal === 'object' ? draft.renewal : {};
            const p = draft.payload && typeof draft.payload === 'object' ? draft.payload : {};
            const endDate = toStr(r.newEnd || p.endDate) || u.endDate;
            const startDate = toStr(r.newStart || p.startDate) || u.startDate;
            const agreementNo = toStr(r.agreementNo || p.agreementNo) || u.agreementNo;
            const monthlyRent = parseFloat(p.monthlyRent) || u.monthlyRent;
            return {
                ...u,
                startDate,
                endDate,
                agreementNo,
                monthlyRent,
                remainingDays: daysUntil(endDate),
                monthsLeft: endDate && daysUntil(endDate) !== null ? daysUntil(endDate) / 30 : u.monthsLeft
            };
        });
        const deduped = [];
        const unitRowKeys = new Set();
        withRenewalDraftDates.forEach((row) => {
            const rk = normalizeReservationBuildingKey(row.building) + '\t' + normalizeUnit(row.unit);
            if (unitRowKeys.has(rk)) return;
            unitRowKeys.add(rk);
            deduped.push(row);
        });
        _unitsDataCache = filterUnitsToActiveBuildingsOnly(applyForcedVacancyPatchesToUnitsRows(deduped));
        return _unitsDataCache;
    }

    function getExpiringUnits(maxDays = 30) {
        return getUnitsData().filter((u) => {
            const d = daysUntil(u.endDate);
            return d !== null && d >= 0 && d <= maxDays && toStr(u.tenant);
        });
    }

    function addressBookRowKey(type, name, mobile, idNo) {
        return [toStr(type).toLowerCase(), toStr(name).toLowerCase(), toStr(mobile), toStr(idNo)].join('|');
    }

    function addressBookEntryKey(r) {
        if (!r) return '';
        if (toStr(r.type).toLowerCase() === 'company') {
            return ['company', toStr(r.commercialRegNo).toLowerCase(), toStr(r.name).toLowerCase(), toStr(r.mobile)].join('|');
        }
        return addressBookRowKey(r.type, r.name, r.mobile, r.idNo);
    }

    function isOmaniNationality(v) {
        const n = toStr(v).toLowerCase();
        return !n || n.includes('oman') || n.includes('عماني');
    }

    function addressBookAttachmentPresent(att) {
        if (!att || typeof att !== 'object') return false;
        if (toStr(att.dataUrl).trim()) return true;
        if (toStr(att.relativePath).trim()) return true;
        if (toStr(att.checkAttachmentRelativePath).trim()) return true;
        if (toStr(att.attachmentRelativePath).trim()) return true;
        if (toStr(att.fileId).trim()) return true;
        if (toStr(att.checkAttachmentFileId).trim()) return true;
        if (toStr(att.attachmentFileId).trim()) return true;
        return !!(att.storedOnDisk && toStr(att.name).trim());
    }

    function addressBookAttachmentRefFromFileEntry(row) {
        if (!row) return null;
        return {
            name: toStr(row.file_name) || 'attachment',
            type: '',
            fileId: toStr(row.id),
            relativePath: toStr(row.file_path),
            storedOnDisk: true,
            dataUrl: ''
        };
    }

    function setAddressBookAttachmentRef(kind, ref) {
        if (!addressBookEditorPendingAttachments) addressBookEditorPendingAttachments = {};
        const hidMap = {
            idAttachment: 'abIdAttachmentJson',
            passportAttachment: 'abPassportAttachmentJson',
            commercialRegAttachment: 'abCoCrAttachmentJson'
        };
        if (ref && addressBookAttachmentPresent(ref)) {
            addressBookEditorPendingAttachments[kind] = ref;
        } else {
            delete addressBookEditorPendingAttachments[kind];
        }
        const hid = document.getElementById(hidMap[kind]);
        if (hid) hid.value = ref && addressBookAttachmentPresent(ref) ? JSON.stringify(ref) : '';
        updateAddressBookAttachmentStatusLabel(kind, ref);
    }

    function getAddressBookAttachmentRefFromForm(kind) {
        const hidMap = {
            idAttachment: 'abIdAttachmentJson',
            passportAttachment: 'abPassportAttachmentJson',
            commercialRegAttachment: 'abCoCrAttachmentJson'
        };
        const hid = document.getElementById(hidMap[kind]);
        if (hid?.value) {
            try {
                const parsed = JSON.parse(hid.value);
                if (addressBookAttachmentPresent(parsed)) return parsed;
            } catch (_eJson) {}
        }
        const pend = addressBookEditorPendingAttachments?.[kind];
        if (addressBookAttachmentPresent(pend)) return pend;
        return null;
    }

    async function repairAddressBookEntriesAttachments() {
        if (!window.bhdDesktop?.fileListEntries) return false;
        let changed = false;
        for (const entry of addressBookEntries) {
            if (!entry || toStr(entry.type) === 'company') continue;
            if (!addressBookAttachmentPresent(entry.idAttachment)) {
                const idNo = toStr(entry.idNo);
                const name = toStr(entry.name);
                let rows = idNo
                    ? await window.bhdDesktop.fileListEntries({ building: 'addressbook', unit: idNo })
                    : [];
                let match = rows.find((r) => /id|abIdAttachment/i.test(toStr(r.doc_type)));
                if (!match) {
                    rows = await window.bhdDesktop.fileListEntries({ building: 'addressbook', docType: 'abIdAttachmentFile' });
                    match =
                        rows.find((r) => idNo && toStr(r.unit) === idNo) ||
                        rows.find((r) => toStr(r.unit) === 'abIdAttachmentFile' && name && toStr(r.tenant) === name) ||
                        rows[0];
                }
                if (match) {
                    entry.idAttachment = addressBookAttachmentRefFromFileEntry(match);
                    changed = true;
                }
            }
            if (!addressBookAttachmentPresent(entry.passportAttachment)) {
                const idNo = toStr(entry.idNo);
                let rows = idNo
                    ? await window.bhdDesktop.fileListEntries({ building: 'addressbook', unit: idNo, docType: 'passport' })
                    : await window.bhdDesktop.fileListEntries({ building: 'addressbook', docType: 'abPassportAttachmentFile' });
                const match = rows[0];
                if (match) {
                    entry.passportAttachment = addressBookAttachmentRefFromFileEntry(match);
                    changed = true;
                }
            }
        }
        if (changed) {
            localStorage.setItem('bhd_address_book', JSON.stringify(addressBookEntries));
            try {
                await syncBhdKvToServer();
            } catch (_eRep) {}
        }
        return changed;
    }

    function getAddressBookCompanyIssues(entry) {
        const issues = [];
        const requireField = (label, value) => {
            if (!toStr(value)) issues.push(`${label}: ${t('ناقص', 'Missing')}`);
        };
        const checkDate = (label, value, { required = true } = {}) => {
            if (!toStr(value)) {
                if (required) issues.push(`${label}: ${t('تاريخ غير مدخل', 'Missing date')}`);
                return;
            }
            const d = daysUntil(value);
            if (d === null) {
                if (required) issues.push(`${label}: ${t('تاريخ غير صالح', 'Invalid date')}`);
                return;
            }
            if (d < 0) issues.push(`${label}: ${t('منتهي', 'Expired')}`);
            else if (d <= 30) issues.push(`${label}: ${t(`ينتهي خلال ${d} يوم`, `Expires in ${d} days`)}`);
        };
        requireField(t('اسم الشركة', 'Company name'), entry?.name);
        requireField(t('رقم السجل التجاري', 'CR no.'), entry?.commercialRegNo);
        checkDate(t('انتهاء السجل التجاري', 'CR expiry'), entry?.commercialRegExpiryDate);
        if (!addressBookAttachmentPresent(entry?.commercialRegAttachment)) {
            issues.push(`${t('مرفق السجل التجاري', 'CR certificate attachment')}: ${t('ناقص', 'Missing')}`);
        }
        requireField(t('هاتف الشركة', 'Company phone'), entry?.mobile);
        requireField(t('البريد الإلكتروني', 'Email'), entry?.email);
        const all = normalizeCompanySignatories(entry);
        const namedSigRows = all.filter((s) => toStr(s.signatoryName));
        if (!namedSigRows.length) {
            issues.push(`${t('المفوض بالتوقيع', 'Authorized signatory')}: ${t('ناقص', 'Missing')}`);
        }
        all.forEach((sg, xi) => {
            if (!toStr(sg.signatoryName)) return;
            const lbl = `${t('المفوض', 'Sig.')} #${xi + 1}`;
            requireField(`${lbl} — ${t('الاسم', 'Name')}`, sg.signatoryName);
            const sigNat = toStr(sg.signatoryNationality);
            const sigOmani = isOmaniNationality(sigNat);
            const requireSigCivil = () => {
                requireField(`${lbl} — ${t('الرقم المدني', 'Civil ID')}`, sg.signatoryIdNo);
                checkDate(`${lbl} — ${t('بطاقة', 'ID')}`, sg.signatoryIdExpiryDate);
                requireField(`${lbl} — ${t('الهاتف', 'Phone')}`, sg.signatoryMobile);
                if (!addressBookAttachmentPresent(sg.signatoryIdAttachment)) {
                    issues.push(`${lbl} ${t('مرفق بطاقة', 'ID file')}: ${t('ناقص', 'Missing')}`);
                }
            };
            const requireSigPassport = () => {
                requireField(`${lbl} — ${t('الجواز', 'Passport')}`, sg.signatoryPassport);
                checkDate(`${lbl} — ${t('جواز', 'Passport')}`, sg.signatoryPassportExpiryDate);
                if (!addressBookAttachmentPresent(sg.signatoryPassportAttachment)) {
                    issues.push(`${lbl} ${t('مرفق جواز', 'Passport file')}: ${t('ناقص', 'Missing')}`);
                }
            };
            if (sigOmani) {
                requireSigCivil();
            } else {
                requireSigCivil();
                requireSigPassport();
            }
            const mode = toStr(sg.signatoryAuthorityMode);
            if (mode === 'joint') {
                const namedCnt = all.filter((s) => toStr(s.signatoryName)).length;
                if (namedCnt < 2) {
                    issues.push(`${lbl}: ${t('التوقيع المتحد يتطلب مفوضين اثنين على الأقل بأسماء مسجّلة', 'Joint signing requires at least two named signatories.')}`);
                }
                const pc = toStr(sg.signatoryJointPartnerCivilId);
                if (!pc) {
                    issues.push(`${lbl}: ${t('اختر المفوض المرتبط بالتوقيع المتحد', 'Select the linked joint signatory.')}`);
                } else {
                    const partner = all.find((p, pi) => pi !== xi && toStr(p.signatoryIdNo) === pc && toStr(p.signatoryName));
                    if (!partner) {
                        issues.push(`${lbl}: ${t('المفوض المرتبط غير موجود أو رقم مدني غير متطابق', 'Linked joint signatory not found or civil ID mismatch.')}`);
                    }
                }
            }
        });
        return issues;
    }

    function getAddressBookIssues(entry, options = {}) {
        const forReservation = options.forReservation === true;
        const issues = [];
        if (toStr(entry?.type) === 'company') {
            return getAddressBookCompanyIssues(entry);
        }
        const requireField = (label, value) => {
            if (!toStr(value)) issues.push(`${label}: ${t('ناقص', 'Missing')}`);
        };
        const checkDate = (label, value, { required = false } = {}) => {
            if (!toStr(value)) {
                if (required) issues.push(`${label}: ${t('تاريخ غير مدخل', 'Missing date')}`);
                return;
            }
            const d = daysUntil(value);
            if (d === null) {
                if (required) issues.push(`${label}: ${t('تاريخ غير صالح', 'Invalid date')}`);
                return;
            }
            if (d < 0) issues.push(`${label}: ${t('منتهي', 'Expired')}`);
            else if (d <= 30) issues.push(`${label}: ${t(`ينتهي خلال ${d} يوم`, `Expires in ${d} days`)}`);
        };

        const isOwner = toStr(entry?.type) === 'owner';
        const omani = isOmaniNationality(entry?.nationality);
        const hasPassportNumber = !!toStr(entry?.passport);
        const requiresPassport = !omani || hasPassportNumber;

        requireField(t('الاسم', 'Name'), entry?.name);
        requireField(t('الجوال', 'Mobile'), entry?.mobile);
        requireField(t('الرقم المدني', 'ID'), entry?.idNo);
        if (!isOwner && !forReservation && toStr(entry?.source) !== 'manual') {
            requireField(t('العقار', 'Property'), entry?.building);
        }

        checkDate(t('البطاقة', 'ID'), entry?.idExpiryDate, { required: true });
        if (!addressBookAttachmentPresent(entry?.idAttachment)) {
            issues.push(`${t('مرفق البطاقة', 'ID attachment')}: ${t('ناقص', 'Missing')}`);
        }

        if (requiresPassport) {
            requireField(t('رقم الجواز', 'Passport number'), entry?.passport);
            checkDate(t('الجواز', 'Passport'), entry?.passportExpiryDate, { required: true });
            if (!addressBookAttachmentPresent(entry?.passportAttachment)) {
                issues.push(`${t('مرفق الجواز', 'Passport attachment')}: ${t('ناقص', 'Missing')}`);
            }
        }
        return issues;
    }

    function getAddressBookIssuesForReservation(entry) {
        if (!entry || !toStr(entry.name)) {
            return [`${t('المستأجر', 'Tenant')}: ${t('غير موجود في الدفتر أو النوع غير صالح.', 'Not found in address book or invalid.')}`];
        }
        if (toStr(entry.type) === 'company') {
            /* للحجز: أساسيات فقط (اسم شركة، سجل، جوال) / Reservation company: basics only */
            const issues = [];
            const requireField = (label, value) => {
                if (!toStr(value)) issues.push(`${label}: ${t('ناقص', 'Missing')}`);
            };
            requireField(t('اسم الشركة', 'Company name'), entry?.name);
            requireField(t('رقم السجل التجاري', 'CR no.'), entry?.commercialRegNo);
            requireField(t('هاتف الشركة', 'Company phone'), entry?.mobile);
            return issues;
        }
        const issues = [];
        const requireField = (label, value) => {
            if (!toStr(value)) issues.push(`${label}: ${t('ناقص', 'Missing')}`);
        };
        requireField(t('الاسم', 'Name'), entry?.name);
        requireField(t('الجوال', 'Mobile'), entry?.mobile);
        requireField(t('الرقم المدني', 'ID'), entry?.idNo);
        return issues;
    }

    function updateTenantCompanySignatoriesPreviewFromJson() {
        const pv = document.getElementById('tenantCompanySignatoriesPreview');
        const hx = document.getElementById('tenantCompanySignatoriesJson');
        if (!pv || !hx) return;
        try {
            const arr = JSON.parse(toStr(hx.value) || '[]');
            if (!Array.isArray(arr) || !arr.length) {
                pv.innerHTML = `<span style="opacity:.85">${escHtml(t('لم يتم تحميل المفوضين — استورد من دفتر العناوين.', 'No signatories — import from address book.'))}</span>`;
                return;
            }
            pv.innerHTML = formatCompanySignatoriesListHtml({ signatories: arr });
        } catch (err) {
            pv.textContent = '—';
        }
    }

    function syncTenantEntityFieldsFromType() {
        const sel = document.getElementById('tenantEntityType');
        const entity = sel && sel.value === 'company' ? 'company' : 'person';
        const lblAr = document.getElementById('lblTenantNameAr');
        const lblEn = document.getElementById('lblTenantNameEn');
        const lblId = document.getElementById('lblTenantId');
        if (lblAr) {
            lblAr.textContent = entity === 'company'
                ? t('اسم الشركة (عربي) / Company name (Arabic)', 'اسم الشركة (عربي) / Company name (Arabic)')
                : t('اسم المستأجر (عربي) / Tenant name (Arabic)', 'اسم المستأجر (عربي) / Tenant name (Arabic)');
        }
        if (lblEn) {
            lblEn.textContent = entity === 'company'
                ? t('اسم الشركة بالإنجليزية / Company name (English)', 'اسم الشركة بالإنجليزية / Company name (English)')
                : t('اسم المستأجر بالإنجليزية / Tenant name (English)', 'اسم المستأجر بالإنجليزية / Tenant name (English)');
        }
        if (lblId) {
            lblId.textContent = entity === 'company'
                ? '(غير مستخدم للشركة) / (Not used when Company)'
                : t('الرقم المدني / Civil ID no.', 'الرقم المدني / Civil ID no.');
        }
        const pb = document.getElementById('tenantPersonFieldsBlock');
        if (pb) pb.style.display = entity === 'person' ? 'contents' : 'none';
        const cb = document.getElementById('tenantCompanyFieldsBlock');
        if (cb) cb.style.display = entity === 'company' ? 'grid' : 'none';
        const ntw = document.getElementById('tenantNationalityWrap');
        if (ntw) ntw.style.display = entity === 'person' ? '' : 'none';
        if (entity === 'company') updateTenantCompanySignatoriesPreviewFromJson();
        try { ensureTenantNationalitySelect(true); } catch (e) {}
        try { renderContractMandatoryDocsUi(true); } catch (e2) {}
        try { updateSummaryPanel(); } catch (e) {}
        try { renderDocument(currentDoc); } catch (e) {}
        try { localizeBilingualUi(); } catch (e) {}
        try { updateContractWorkspaceContextUi(); } catch (eUcx) {}
    }

    function formatDocAlert(entry) {
        return getAddressBookIssues(entry).join(' | ');
    }

    function formatDocAlertCompact(entry, max = 2) {
        const issues = getAddressBookIssues(entry);
        if (!issues.length) return t('سليم', 'OK');
        const head = issues.slice(0, max).join(' | ');
        const more = issues.length - max;
        return more > 0 ? `${head} | +${more}...` : head;
    }

    const AB_CONTACT_FIELD_IDS = ['abMobile', 'abExtraMobile', 'abEmail', 'abCoMobile', 'abCoExtraMobile', 'abCoEmail'];
    const AB_DOCUMENT_FIELD_IDS = [
        'abIdExpiryDate',
        'abPassportExpiryDate',
        'abIdAttachmentFile',
        'abPassportAttachmentFile',
        'abCoCrExpiry',
        'abCoCrFile'
    ];
    const AB_PROTECTED_FIELD_IDS = [
        'abEntityType',
        'abType',
        'abName',
        'abNameEn',
        'abNationality',
        'abIdNo',
        'abBirthDate',
        'abPassport',
        'abBuilding',
        'abUnit',
        'abCoName',
        'abCoNameEn',
        'abCoCrNo',
        'abCoBuilding',
        'abCoUnit'
    ];

    function classifyAddressBookField(fieldId) {
        if (AB_CONTACT_FIELD_IDS.includes(fieldId)) return 'contact';
        if (AB_DOCUMENT_FIELD_IDS.includes(fieldId)) return 'document';
        return 'identity';
    }

    function addressBookEntryIsHealthy(entry) {
        if (!entry) return true;
        if (toStr(entry.type) === 'company') return getAddressBookCompanyIssues(entry).length === 0;
        return getAddressBookIssues(entry).length === 0;
    }

    function canAdminFullyEditAddressBook(user) {
        if (!user) return false;
        return userIsSystemAdmin(user) || userHasPermission(user, 'manage_owners');
    }

    function canApproveAddressBookEditRequests(user) {
        if (!user) return false;
        return (
            userIsSystemAdmin(user) ||
            userHasPermission(user, 'manage_owners') ||
            userHasPermission(user, 'approve_edit_requests')
        );
    }

    function loadAddressBookEditRequests() {
        try {
            const raw = localStorage.getItem('bhd_addressbook_edit_requests');
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (_e) {
            return [];
        }
    }

    function saveAddressBookEditRequests(arr) {
        localStorage.setItem('bhd_addressbook_edit_requests', JSON.stringify(Array.isArray(arr) ? arr : []));
        syncBhdKvToServer();
    }

    function loadAddressBookEditGrants() {
        try {
            const raw = localStorage.getItem('bhd_addressbook_edit_grants');
            const o = raw ? JSON.parse(raw) : null;
            return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
        } catch (_e) {
            return {};
        }
    }

    function saveAddressBookEditGrants(grants) {
        localStorage.setItem('bhd_addressbook_edit_grants', JSON.stringify(grants && typeof grants === 'object' ? grants : {}));
        syncBhdKvToServer();
    }

    function getActiveAddressBookEditGrant(entry, userId) {
        const grants = loadAddressBookEditGrants();
        const key = addressBookEntryKey(entry);
        const g = grants[key];
        if (!g || typeof g !== 'object') return null;
        if (userId && toStr(g.userId) !== toStr(userId)) return null;
        return g;
    }

    function canFullyEditAddressBookEntry(entry, user) {
        if (!user || !entry) return false;
        if (canAdminFullyEditAddressBook(user)) return true;
        return !!getActiveAddressBookEditGrant(entry, user.id);
    }

    function canEditAddressBookFormField(fieldId, entry, user) {
        if (!effectivePermissionAny(['manage_owners', 'manage_contracts'])) return false;
        if (!user || !entry) return false;
        if (canFullyEditAddressBookEntry(entry, user)) return true;
        const group = classifyAddressBookField(fieldId);
        if (group === 'contact') return true;
        if (group === 'document') return !addressBookEntryIsHealthy(entry);
        return false;
    }

    function hasPendingAddressBookEditRequest(entry, userId) {
        const key = addressBookEntryKey(entry);
        return loadAddressBookEditRequests().some(
            (r) =>
                r &&
                r.status === 'pending' &&
                toStr(r.entryKey) === key &&
                (!userId || toStr(r.requestedBy) === toStr(userId))
        );
    }

    function generateAddressBookEditRequestId() {
        return `aber_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    }

    function submitAddressBookEditRequestFromModal() {
        const idx = addressBookEditorState.index;
        const entry = idx >= 0 ? addressBookEntries[idx] : null;
        if (!entry) return;
        const u = getLoggedInUser();
        if (!u) {
            openAuthLoginModal();
            return;
        }
        if (canFullyEditAddressBookEntry(entry, u)) {
            alert(t('لديك صلاحية التعديل بالفعل.', 'You already have edit permission.'));
            return;
        }
        if (hasPendingAddressBookEditRequest(entry, u.id)) {
            alert(t('يوجد طلب موافقة معلّق لهذا السجل.', 'A pending approval request exists for this record.'));
            return;
        }
        const note = prompt(
            t('ما البيانات التي تريد تعديلها؟ (اختياري)', 'Which data do you want to edit? (optional)'),
            ''
        );
        if (note === null) return;
        const requests = loadAddressBookEditRequests();
        requests.push({
            id: generateAddressBookEditRequestId(),
            entryKey: addressBookEntryKey(entry),
            entryIndex: idx,
            entryName: toStr(entry.name),
            entryType: toStr(entry.type),
            building: toStr(entry.building),
            unit: toStr(entry.unit),
            requestedBy: u.id,
            requestedByName: toStr(u.displayName) || toStr(u.email) || u.id,
            requestedAt: new Date().toISOString(),
            status: 'pending',
            note: toStr(note)
        });
        saveAddressBookEditRequests(requests);
        try {
            refreshNotificationsIfVisible();
        } catch (_eN) {}
        applyAddressBookEditFieldLocks(entry);
        alert(
            t(
                'تم إرسال طلب الموافقة للمسؤول. يمكنك تعديل الهاتف والبريد الآن؛ وبعد الموافقة ستُفتح باقي الحقول.',
                'Approval request sent. You can edit phone and email now; other fields unlock after approval.'
            )
        );
    }

    function approveAddressBookEditRequest(requestId) {
        if (!canApproveAddressBookEditRequests(getLoggedInUser())) {
            alert(t('لا تملك صلاحية الموافقة.', 'No permission to approve.'));
            return;
        }
        const admin = getLoggedInUser();
        const requests = loadAddressBookEditRequests();
        const idx = requests.findIndex((r) => r && r.id === requestId);
        if (idx < 0) return;
        const req = requests[idx];
        if (req.status !== 'pending') return;
        const grants = loadAddressBookEditGrants();
        grants[toStr(req.entryKey)] = {
            userId: req.requestedBy,
            grantedBy: admin ? admin.id : '',
            grantedAt: new Date().toISOString(),
            requestId: req.id
        };
        saveAddressBookEditGrants(grants);
        requests[idx] = {
            ...req,
            status: 'approved',
            resolvedAt: new Date().toISOString(),
            resolvedBy: admin ? admin.id : ''
        };
        saveAddressBookEditRequests(requests);
        try {
            refreshNotificationsIfVisible();
        } catch (_eN) {}
        if (addressBookEditorState.index >= 0) {
            try {
                applyAddressBookEditFieldLocks(addressBookEntries[addressBookEditorState.index]);
            } catch (_eL) {}
        }
        alert(
            t(
                `تم منح صلاحية تعديل لمرة واحدة للسجل: ${toStr(req.entryName)}`,
                `One-time edit granted for record: ${toStr(req.entryName)}`
            )
        );
    }

    function promptMandatoryAdminRejectionNote(contextLabelAr, contextLabelEn) {
        const label = t(contextLabelAr, contextLabelEn);
        for (let attempt = 0; attempt < 3; attempt++) {
            const note = prompt(
                t(
                    `سبب الرفض إلزامي — أدخل ملاحظة الرفض والسبب لـ: ${label}`,
                    `Rejection reason is required — enter rejection note and reason for: ${label}`
                ),
                ''
            );
            if (note === null) return null;
            const trimmed = toStr(note);
            if (trimmed) return trimmed;
            alert(
                t(
                    'ملاحظة الرفض مطلوبة. لا يمكن إتمام الرفض بدون توضيح السبب للمستخدم.',
                    'Rejection note is required. Rejection cannot proceed without explaining the reason to the user.'
                )
            );
        }
        return null;
    }

    function rejectAddressBookEditRequest(requestId) {
        if (!canApproveAddressBookEditRequests(getLoggedInUser())) {
            alert(t('لا تملك صلاحية الرفض.', 'No permission to reject.'));
            return;
        }
        const admin = getLoggedInUser();
        const requests = loadAddressBookEditRequests();
        const idx = requests.findIndex((r) => r && r.id === requestId);
        if (idx < 0) return;
        const req = requests[idx];
        if (req.status !== 'pending') return;
        const entryLabel = `${toStr(req.entryName) || '—'} — ${toStr(req.building)}/${toStr(req.unit)}`;
        const rejectionNote = promptMandatoryAdminRejectionNote(
            `طلب تعديل دفتر العناوين (${entryLabel})`,
            `address book edit request (${entryLabel})`
        );
        if (!rejectionNote) return;
        requests[idx] = {
            ...req,
            status: 'rejected',
            resolvedAt: new Date().toISOString(),
            resolvedBy: admin ? admin.id : '',
            rejectionNote
        };
        saveAddressBookEditRequests(requests);
        try {
            refreshNotificationsIfVisible();
        } catch (_eN) {}
        alert(t('تم رفض طلب التعديل مع تسجيل سبب الرفض.', 'Edit request rejected; rejection reason was recorded.'));
    }

    function revokeAddressBookEditGrantForEntry(entry) {
        const key = addressBookEntryKey(entry);
        if (!key) return;
        const grants = loadAddressBookEditGrants();
        if (!grants[key]) return;
        delete grants[key];
        saveAddressBookEditGrants(grants);
    }

    function applyAddressBookEditFieldLocks(entry) {
        const u = getLoggedInUser();
        const mode = addressBookEditorState.mode;
        if (mode === 'add') return;
        const policyNote = document.getElementById('addressBookEditPolicyNote');
        const requestBtn = document.getElementById('addressBookRequestEditBtn');
        const isCompany = toStr(entry?.type) === 'company';
        const allFieldIds = isCompany
            ? [
                'abEntityType',
                ...AB_CONTACT_FIELD_IDS.filter((x) => x.startsWith('abCo')),
                ...AB_DOCUMENT_FIELD_IDS.filter((x) => x.startsWith('abCo')),
                'abCoName',
                'abCoNameEn',
                'abCoCrNo',
                'abCoBuilding',
                'abCoUnit'
            ]
            : ['abEntityType', 'abType', ...AB_CONTACT_FIELD_IDS.filter((x) => !x.startsWith('abCo')), ...AB_DOCUMENT_FIELD_IDS.filter((x) => !x.startsWith('abCo')), ...AB_PROTECTED_FIELD_IDS.filter((x) => !x.startsWith('abCo'))];

        if (mode === 'view') {
            setAddressBookFormDisabled(true);
            if (policyNote) {
                policyNote.style.display = 'none';
                policyNote.setAttribute('hidden', 'hidden');
            }
            if (requestBtn) {
                requestBtn.style.display = 'none';
                requestBtn.hidden = true;
            }
            return;
        }

        setAddressBookFormDisabled(false);
        allFieldIds.forEach((fid) => {
            const el = document.getElementById(fid);
            if (!el) return;
            const ok = canEditAddressBookFormField(fid, entry, u);
            el.disabled = !ok;
            if (el.type === 'file') el.disabled = !ok;
        });
        document.querySelectorAll('#abSignatoriesMount input, #abSignatoriesMount select, #abSignatoriesMount button').forEach((el) => {
            const ok = canFullyEditAddressBookEntry(entry, u);
            el.disabled = !ok;
        });
        const addBtn = document.getElementById('abAddSignatoryBtn');
        if (addBtn) addBtn.disabled = !canFullyEditAddressBookEntry(entry, u);

        const healthy = addressBookEntryIsHealthy(entry);
        const full = canFullyEditAddressBookEntry(entry, u);
        const pending = u && hasPendingAddressBookEditRequest(entry, u.id);
        let msg = '';
        if (full) {
            msg = t('✓ لديك صلاحية تعديل كاملة لهذا السجل.', '✓ You have full edit access for this record.');
        } else if (healthy) {
            msg = t(
                'السجل سليم — يمكنك تعديل الهاتف والبريد مباشرة. لتعديل الاسم أو الوثائق السارية اطلب موافقة المسؤول.',
                'Record is OK — you may edit phone and email directly. To change name or valid documents, request administrator approval.'
            );
        } else {
            msg = t(
                'يوجد نقص أو انتهاء في الوثائق — يمكنك تحديث تواريخ الوثائق والمرفقات مباشرة، وتعديل الهاتف والبريد. باقي البيانات تحتاج موافقة المسؤول.',
                'Documents need renewal — you may update document dates/attachments and contact info directly. Other fields need administrator approval.'
            );
        }
        if (pending) {
            msg += ` ${t('(طلب موافقة معلّق)', '(Approval pending)')}`;
        }
        if (policyNote) {
            policyNote.textContent = msg;
            policyNote.style.display = 'block';
            policyNote.removeAttribute('hidden');
        }
        if (requestBtn) {
            const showReq = !full && !pending && effectivePermissionAny(['manage_owners', 'manage_contracts']);
            requestBtn.style.display = showReq ? '' : 'none';
            requestBtn.hidden = !showReq;
        }
    }

    function mergeAddressBookEntryWithEditPolicy(oldEntry, newEntry, user) {
        if (!oldEntry || !newEntry) return newEntry;
        if (canFullyEditAddressBookEntry(oldEntry, user)) return newEntry;
        const merged = { ...newEntry };
        const isCompany = toStr(newEntry.type) === 'company';
        const fieldMap = isCompany
            ? {
                name: 'abCoName',
                nameEn: 'abCoNameEn',
                commercialRegNo: 'abCoCrNo',
                commercialRegExpiryDate: 'abCoCrExpiry',
                commercialRegAttachment: '__file_abCoCrFile',
                mobile: 'abCoMobile',
                extraMobile: 'abCoExtraMobile',
                email: 'abCoEmail',
                building: 'abCoBuilding',
                unit: 'abCoUnit',
                signatories: '__signatories'
            }
            : {
                type: 'abType',
                name: 'abName',
                nameEn: 'abNameEn',
                nationality: 'abNationality',
                idNo: 'abIdNo',
                birthDate: 'abBirthDate',
                idExpiryDate: 'abIdExpiryDate',
                passport: 'abPassport',
                passportExpiryDate: 'abPassportExpiryDate',
                idAttachment: '__file_abIdAttachmentFile',
                passportAttachment: '__file_abPassportAttachmentFile',
                mobile: 'abMobile',
                extraMobile: 'abExtraMobile',
                email: 'abEmail',
                building: 'abBuilding',
                unit: 'abUnit'
            };
        Object.keys(fieldMap).forEach((prop) => {
            const fid = fieldMap[prop];
            if (prop === 'signatories') {
                if (!canFullyEditAddressBookEntry(oldEntry, user)) merged.signatories = oldEntry.signatories;
                return;
            }
            if (fid.startsWith('__file_')) {
                const realId = fid.replace('__file_', '');
                if (!canEditAddressBookFormField(realId, oldEntry, user)) merged[prop] = oldEntry[prop];
                return;
            }
            if (!canEditAddressBookFormField(fid, oldEntry, user)) merged[prop] = oldEntry[prop];
        });
        return merged;
    }

    function formatDocAlertLines(entry, max = 3) {
        const issues = getAddressBookIssues(entry);
        if (!issues.length) return `<div>${t('سليم', 'OK')}</div>`;
        const shown = issues.slice(0, max).map((x) => `<div>• ${escHtml(x)}</div>`).join('');
        const more = issues.length - max;
        return more > 0 ? `${shown}<div>+${more}...</div>` : shown;
    }

    function toggleAddressBookFilterRow() {
        const row = document.getElementById('addressBookFilterRow');
        if (!row) return;
        row.hidden = !row.hidden;
        if (!row.hidden) {
            const inp = document.getElementById('abFilterContact');
            if (inp) inp.focus();
        }
    }

    function setAddressBookSort(key) {
        if (addressBookSortState.key === key) {
            addressBookSortState.dir = addressBookSortState.dir === 'asc' ? 'desc' : 'asc';
        } else {
            addressBookSortState.key = key;
            addressBookSortState.dir = 'asc';
        }
        renderAddressBookTable();
    }

    function closeAddressBookPrintMenu() {
        const p = document.getElementById('addressBookPrintPanel');
        if (p) p.hidden = true;
    }

    function toggleAddressBookPrintMenu(event) {
        if (event) event.stopPropagation();
        const p = document.getElementById('addressBookPrintPanel');
        if (!p) return;
        p.hidden = !p.hidden;
    }

    function buildCountryOptions() {
        const isoCountries = [
            'AF','AL','DZ','AS','AD','AO','AI','AQ','AG','AR','AM','AW','AU','AT','AZ','BS','BH','BD','BB','BY','BE','BZ','BJ','BM','BT','BO','BQ','BA','BW','BV','BR','IO','BN','BG','BF','BI','CV','KH','CM','CA','KY','CF','TD','CL','CN','CX','CC','CO','KM','CG','CD','CK','CR','CI','HR','CU','CW','CY','CZ','DK','DJ','DM','DO','EC','EG','SV','GQ','ER','EE','SZ','ET','FK','FO','FJ','FI','FR','GF','PF','TF','GA','GM','GE','DE','GH','GI','GR','GL','GD','GP','GU','GT','GG','GN','GW','GY','HT','HM','VA','HN','HK','HU','IS','IN','ID','IR','IQ','IE','IM','IL','IT','JM','JP','JE','JO','KZ','KE','KI','KP','KR','KW','KG','LA','LV','LB','LS','LR','LY','LI','LT','LU','MO','MG','MW','MY','MV','ML','MT','MH','MQ','MR','MU','YT','MX','FM','MD','MC','MN','ME','MS','MA','MZ','MM','NA','NR','NP','NL','NC','NZ','NI','NE','NG','NU','NF','MK','MP','NO','OM','PK','PW','PS','PA','PG','PY','PE','PH','PN','PL','PT','PR','QA','RE','RO','RU','RW','BL','SH','KN','LC','MF','PM','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SX','SK','SI','SB','SO','ZA','GS','SS','ES','LK','SD','SR','SJ','SE','CH','SY','TW','TJ','TZ','TH','TL','TG','TK','TO','TT','TN','TR','TM','TC','TV','UG','UA','AE','GB','US','UM','UY','UZ','VU','VE','VN','VG','VI','WF','EH','YE','ZM','ZW'
        ];
        try {
            const dnEn = new Intl.DisplayNames(['en'], { type: 'region' });
            const dnAr = new Intl.DisplayNames(['ar'], { type: 'region' });
            const list = isoCountries.map((code) => {
                const en = dnEn.of(code) || code;
                const ar = dnAr.of(code) || code;
                return `${ar} / ${en}`.trim();
            }).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ar'));
            return ['عماني / Omani', ...list.filter((x) => !x.includes(' / Oman') && !x.includes('عُمان'))];
        } catch (e) {
            return ['عماني / Omani', ...isoCountries.filter((c) => c !== 'OM')];
        }
    }

    function ensureAddressBookCountryOptions() {
        const opts = buildCountryOptions().map((c) => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
        const sel = document.getElementById('abNationality');
        if (sel && !sel.options.length) {
            sel.innerHTML = opts;
        }
    }

    /** --------- مستندات العقد الإلزامية والإضافية / Contract attachments --------- */
    function cssEscAttr(s) {
        return (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(String(s)) : String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    function slugifyCivilForDocKey(c) {
        return String(c || '').trim().replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_').slice(0, 80) || 'na';
    }

    function contractAttachmentPresent(att) {
        return addressBookAttachmentPresent(att);
    }

    /** نفس بنية بطاقة المستأجر — يوحّد حقول الشيكات والإيصالات / Same shape as tenant ID card attachment ref */
    function normalizeContractAttachmentRef(att) {
        if (!att || typeof att !== 'object') return null;
        const relativePath =
            toStr(att.relativePath) ||
            toStr(att.checkAttachmentRelativePath) ||
            toStr(att.attachmentRelativePath);
        const fileId =
            toStr(att.fileId) ||
            toStr(att.checkAttachmentFileId) ||
            toStr(att.attachmentFileId);
        const name =
            toStr(att.name) ||
            toStr(att.checkAttachmentName) ||
            toStr(att.attachmentName);
        const storedOnDisk = !!(att.storedOnDisk || relativePath || fileId);
        const dataUrl = storedOnDisk
            ? ''
            : pickEmbeddedDataUrl(att, att.dataUrl, att.attachmentDataUrl, att.checkAttachmentDataUrl);
        return {
            name,
            type: toStr(att.type) || 'application/octet-stream',
            size: att.size || 0,
            fileId,
            relativePath,
            storedOnDisk,
            dataUrl
        };
    }

    function cloneContractDocMeta(att) {
        const norm = normalizeContractAttachmentRef(att);
        if (!norm || !contractAttachmentPresent(norm)) return null;
        const relativePath = toStr(norm.relativePath);
        const fileId = toStr(norm.fileId);
        const dataUrl = toStr(norm.dataUrl);
        if (relativePath || fileId) {
            return {
                name: toStr(norm.name) || '',
                type: toStr(norm.type) || 'application/octet-stream',
                size: norm.size || 0,
                fileId,
                relativePath,
                storedOnDisk: true,
                dataUrl: ''
            };
        }
        if (!dataUrl) return null;
        return {
            name: toStr(norm.name) || '',
            type: toStr(norm.type) || 'application/octet-stream',
            size: norm.size || 0,
            dataUrl
        };
    }

    function pushPrintAttachmentToStore(store, key, ref) {
        const meta = cloneContractDocMeta(ref);
        if (meta) store[key] = meta;
        else if (key && store[key]) delete store[key];
    }

    /** يزامن إيصال التأمين والشيكات إلى contractMandatoryDocsJson — نفس ربط البطاقة الشخصية / Sync deposit & cheques into mandatory docs store like ID card */
    function syncContractPrintAttachmentsFromPayload(payload) {
        if (!payload || typeof payload !== 'object') return;
        const store = { ...getMandatoryDocStoreObject() };
        Object.keys(store).forEach((k) => {
            if (/^(deposit_receipt|pay_chq_|vat_chq_|ins_print_)/.test(k)) delete store[k];
        });
        pushPrintAttachmentToStore(store, 'deposit_receipt', {
            name: payload.depositAttachmentName,
            dataUrl: payload.depositAttachmentDataUrl,
            relativePath: payload.depositAttachmentRelativePath,
            fileId: payload.depositAttachmentFileId,
            storedOnDisk: payload.depositStoredOnDisk
        });
        parsePayloadJsonArrayField(payload, 'paymentScheduleJson', 'paymentSchedule').forEach((r) => {
            pushPrintAttachmentToStore(store, `pay_chq_${r.monthIndex || 0}`, r);
        });
        parsePayloadJsonArrayField(payload, 'vatChequeScheduleJson', 'vatChequeSchedule').forEach((r) => {
            pushPrintAttachmentToStore(store, `vat_chq_${r.chequeIndex || 0}`, r);
        });
        parsePayloadJsonArrayField(payload, 'insuranceDepositItemsJson', 'insuranceDepositItems').forEach((it) => {
            pushPrintAttachmentToStore(store, `ins_print_${toStr(it.id)}`, {
                name: it.attachmentName,
                dataUrl: it.attachmentDataUrl,
                relativePath: it.attachmentRelativePath,
                fileId: it.attachmentFileId,
                storedOnDisk: it.storedOnDisk
            });
        });
        setMandatoryDocStoreObject(store);
    }

    function syncContractPrintAttachmentsToStore() {
        const store = { ...getMandatoryDocStoreObject() };
        const depRef = bhdFileRefFromDataset(document.getElementById('depositAttachmentRow'));
        if (contractAttachmentPresent(depRef)) {
            pushPrintAttachmentToStore(store, 'deposit_receipt', depRef);
        }
        getPaymentScheduleFromUi().forEach((r) => {
            const k = `pay_chq_${r.monthIndex || 0}`;
            if (contractAttachmentPresent(normalizeContractAttachmentRef(r))) {
                pushPrintAttachmentToStore(store, k, r);
            }
        });
        getVatChequeScheduleFromUi().forEach((r) => {
            const k = `vat_chq_${r.chequeIndex || 0}`;
            if (contractAttachmentPresent(normalizeContractAttachmentRef(r))) {
                pushPrintAttachmentToStore(store, k, r);
            }
        });
        getInsuranceDepositItemsFromUi().forEach((it) => {
            const ref = {
                name: it.attachmentName,
                dataUrl: it.attachmentDataUrl,
                relativePath: it.attachmentRelativePath,
                fileId: it.attachmentFileId,
                storedOnDisk: it.storedOnDisk
            };
            if (contractAttachmentPresent(ref)) {
                pushPrintAttachmentToStore(store, `ins_print_${toStr(it.id)}`, ref);
            }
        });
        setMandatoryDocStoreObject(store);
    }

    function getContractPrintAttachmentSlotMeta() {
        const slots = [
            {
                key: 'deposit_receipt',
                label: t('إيصال التأمين / Deposit receipt', 'Deposit receipt / إيصال التأمين')
            }
        ];
        getPaymentScheduleFromUi().forEach((r) => {
            const m = r.monthIndex || 0;
            const chk = toStr(r.checkNo).trim();
            slots.push({
                key: `pay_chq_${m}`,
                label:
                    t(`شيك إيجار — شهر ${m}`, `Rent cheque — month ${m}`) + (chk ? ` (${chk})` : '')
            });
        });
        getVatChequeScheduleFromUi().forEach((r) => {
            const idx = r.chequeIndex || 0;
            const chk = toStr(r.checkNo).trim();
            slots.push({
                key: `vat_chq_${idx}`,
                label:
                    t(`شيك ضريبة — ${idx}`, `VAT cheque — ${idx}`) + (chk ? ` (${chk})` : '')
            });
        });
        getInsuranceDepositItemsFromUi().forEach((it) => {
            const ref = toStr(it.reference).trim();
            const payType = toStr(it.payType);
            const typeLabel =
                payType === 'cheque'
                    ? t('شيك تأمين', 'Insurance cheque')
                    : payType === 'cheque_group'
                      ? t('مجموعة شيكات تأمين', 'Insurance cheque batch')
                      : t('مستند تأمين', 'Insurance document');
            slots.push({
                key: `ins_print_${toStr(it.id)}`,
                label: typeLabel + (ref ? ` (${ref})` : '')
            });
        });
        const seen = new Set(slots.map((s) => s.key));
        const store = getMandatoryDocStoreObject();
        Object.keys(store).forEach((key) => {
            if (seen.has(key) || !/^(deposit_receipt|pay_chq_|vat_chq_|ins_print_)/.test(key)) return;
            seen.add(key);
            let label = mandatoryDocKeyFallbackLabel(key);
            const payM = /^pay_chq_(\d+)$/.exec(key);
            const vatM = /^vat_chq_(\d+)$/.exec(key);
            if (payM) label = t(`شيك إيجار — شهر ${payM[1]}`, `Rent cheque — month ${payM[1]}`);
            else if (vatM) label = t(`شيك ضريبة — ${vatM[1]}`, `VAT cheque — ${vatM[1]}`);
            else if (key === 'deposit_receipt') {
                label = t('إيصال التأمين / Deposit receipt', 'Deposit receipt / إيصال التأمين');
            }
            slots.push({ key, label });
        });
        return slots;
    }

    /** يطابق المستأجر في حمولة العقد مع سجل دفتر العناوين / Match contract tenant payload to address book row */
    function findAddressBookTenantIndexForData(d) {
        const name = toStr(d?.tenantNameAr);
        if (!name) return -1;
        const isCo = toStr(d.tenantEntityType) === 'company';
        const candidates = addressBookEntries
            .map((e, i) => ({ e, i }))
            .filter(({ e }) => {
                if (toStr(e.type) !== 'tenant' && toStr(e.type) !== 'company') return false;
                if ((isCo && e.type !== 'company') || (!isCo && e.type !== 'tenant')) return false;
                return toStr(e.name) === name;
            });
        if (!candidates.length) return -1;
        const civilOk = (e) => (isCo
            ? (!toStr(d.tenantCommercialRegNo) || toStr(e.commercialRegNo) === toStr(d.tenantCommercialRegNo))
            : (!toStr(d.tenantId) || toStr(e.idNo) === toStr(d.tenantId)));
        const withCivil = candidates.filter(({ e }) => civilOk(e));
        const pool = withCivil.length ? withCivil : candidates;
        const mobile = toStr(d.tenantMobile);
        if (mobile) {
            const mob = pool.find(({ e }) => toStr(e.mobile) === mobile || toStr(e.extraMobile) === mobile);
            if (mob) return mob.i;
        }
        return pool[0].i;
    }

    function findAddressBookTenantIndexForContract() {
        return findAddressBookTenantIndexForData(getFormData());
    }

    /** يجلب مرفقاً من دفتر العناوين لمفتاح خانة إلزامية / Map mandatory slot key → address book attachment */
    function lookupMandatoryAttachmentFromAddressBook(slotKey, entry) {
        if (!entry) return null;
        if (slotKey === 'tenant_person_id') return entry.idAttachment || null;
        if (slotKey === 'tenant_person_passport') return entry.passportAttachment || null;
        if (slotKey === 'tenant_company_cr') {
            return entry.commercialRegAttachment || entry.leaseContractAttachment || null;
        }
        const row = /^co_sig_row_(\d+)_(id|passport)$/.exec(slotKey);
        if (row) {
            const idx = parseInt(row[1], 10);
            const part = row[2];
            const sigs = normalizeCompanySignatories(entry);
            const s = sigs[idx];
            if (!s) return null;
            return part === 'id' ? (s.signatoryIdAttachment || null) : (s.signatoryPassportAttachment || null);
        }
        const co = /^co_sig_(.+)_(id|passport)$/.exec(slotKey);
        if (!co) return null;
        const slugWant = co[1];
        const wantPass = co[2] === 'passport';
        const normalized = normalizeCompanySignatories(entry);
        const all = new Set();
        normalized.forEach((s) => {
            const c = toStr(s.signatoryIdNo).trim();
            if (c) all.add(c);
            if (toStr(s.signatoryAuthorityMode) === 'joint') {
                const pc = toStr(s.signatoryJointPartnerCivilId).trim();
                if (pc) all.add(pc);
            }
        });
        let sRow = null;
        all.forEach((civil) => {
            if (slugifyCivilForDocKey(civil) !== slugWant) return;
            const found = normalized.find((s) => toStr(s.signatoryIdNo).trim() === civil);
            if (found) sRow = found;
        });
        if (!sRow) return null;
        return wantPass ? (sRow.signatoryPassportAttachment || null) : (sRow.signatoryIdAttachment || null);
    }

    /** يدمج مرفقات الدفتر في حقول مستندات العقد (استيراد / تحميل) / Merge AB attachments into contract mandatory JSON */
    function mergeMandatoryDocsFromAddressBook(entry, opts) {
        const force = opts && opts.forceOverwriteFromAb;
        const slots = getContractMandatoryDocSlots();
        let store = { ...getMandatoryDocStoreObject() };
        slots.forEach((sl) => {
            const ab = lookupMandatoryAttachmentFromAddressBook(sl.key, entry);
            if (!contractAttachmentPresent(ab)) return;
            if (!force && contractAttachmentPresent(store[sl.key])) return;
            const c = cloneContractDocMeta(ab);
            if (c) store[sl.key] = c;
        });
        setMandatoryDocStoreObject(store);
        try {
            renderContractMandatoryDocsUi(false);
        } catch (_eMrgUi) {}
    }

    function updateCompanySignatoriesForMandatoryContractKey(norm, key, doc) {
        const out = norm.map((s) => ({ ...getEmptyCompanySignatory(), ...s }));
        const row = /^co_sig_row_(\d+)_(id|passport)$/.exec(key);
        if (row) {
            const idx = parseInt(row[1], 10);
            const part = row[2];
            if (!out[idx]) return out;
            if (part === 'id') out[idx].signatoryIdAttachment = doc;
            else out[idx].signatoryPassportAttachment = doc;
            return out;
        }
        const co = /^co_sig_(.+)_(id|passport)$/.exec(key);
        if (!co) return out;
        const slugWant = co[1];
        const wantPass = co[2] === 'passport';
        out.forEach((s, idx) => {
            const civil = toStr(s.signatoryIdNo).trim();
            if (!civil || slugifyCivilForDocKey(civil) !== slugWant) return;
            if (wantPass) out[idx].signatoryPassportAttachment = doc;
            else out[idx].signatoryIdAttachment = doc;
        });
        return out;
    }

    /** يكتب مستندًا مرفوعًا في العقد إلى دفتر العناوين عند وجود مطابقة / Push contract mandatory upload → address book */
    function persistMandatoryContractUploadToAddressBook(contractKey, docRaw) {
        try {
            if (contractEntryContext && contractEntryContext.mode === 'reservation') return;
            const doc = cloneContractDocMeta(docRaw);
            if (!contractAttachmentPresent(doc)) return;
            const ix = findAddressBookTenantIndexForContract();
            if (ix < 0) return;
            const prev = addressBookEntries[ix];
            let ent = { ...prev, updatedAt: new Date().toISOString() };
            if (toStr(ent.type) !== 'company') {
                if (contractKey === 'tenant_person_id') ent.idAttachment = doc;
                else if (contractKey === 'tenant_person_passport') ent.passportAttachment = doc;
            } else {
                if (contractKey === 'tenant_company_cr') {
                    ent.commercialRegAttachment = doc;
                } else if (contractKey.startsWith('co_sig_')) {
                    let sigs = normalizeCompanySignatories(ent);
                    sigs = updateCompanySignatoriesForMandatoryContractKey(sigs, contractKey, doc);
                    ent.signatories = sigs;
                }
            }
            addressBookEntries[ix] = ent;
            localStorage.setItem('bhd_address_book', JSON.stringify(addressBookEntries));
            renderAddressBookTable();
        } catch (ePersistAb) {}
    }

    function mergeMandatoryDocsFromAddressBookAfterLoadIfMatch() {
        const ix = findAddressBookTenantIndexForContract();
        if (ix < 0) {
            try {
                setTenantIdentityLockedFromAddressBook(false);
            } catch (_eRl) {}
            return;
        }
        mergeMandatoryDocsFromAddressBook(addressBookEntries[ix], { forceOverwriteFromAb: false });
        try { renderContractMandatoryDocsUi(true); } catch (eR) {}
        try {
            setTenantIdentityLockedFromAddressBook(true);
        } catch (_eRl2) {}
    }

    function toggleContractDocumentsPanel() {
        const pan = document.getElementById('contractDocumentsPanel');
        const btn = document.getElementById('contractDocumentsToggleBtn');
        if (!pan) return;
        const hide = pan.style.display === 'none';
        pan.style.display = hide ? 'block' : 'none';
        if (btn) btn.textContent = hide
            ? '▼ ' + t('المستندات مفتوحة', 'Documents expanded')
            : '▸ ' + t('عرض المستندات', 'Show documents');
        if (hide) try { renderContractMandatoryDocsUi(true); } catch (e) {}
    }

    /** طي/توسيع أقسام دفتر الإيجار: إيجارات مخصصة وجدول الدفع الشهري / Collapse custom rent & monthly schedule */
    function toggleReservationLedgerSubsection(which) {
        const bodyId =
            which === 'customRent'
                ? 'customRentSectionBody'
                : which === 'vatCheques'
                  ? 'vatChequeScheduleSectionBody'
                  : 'paymentScheduleSectionBody';
        const btnId =
            which === 'customRent'
                ? 'customRentSectionToggleBtn'
                : which === 'vatCheques'
                  ? 'vatChequeScheduleSectionToggleBtn'
                  : 'paymentScheduleSectionToggleBtn';
        const pan = document.getElementById(bodyId);
        const btn = document.getElementById(btnId);
        if (!pan) return;
        const isHidden = pan.style.display === 'none';
        pan.style.display = isHidden ? 'block' : 'none';
        const nowVisible = isHidden;
        const arTitle =
            which === 'customRent' ? 'إيجارات مخصصة' : which === 'vatCheques' ? 'شيكات الضريبة' : 'جدول الدفع الشهري';
        const enTitle =
            which === 'customRent' ? 'Custom rent' : which === 'vatCheques' ? 'VAT cheques' : 'Monthly schedule';
        if (btn) {
            btn.setAttribute('aria-expanded', nowVisible ? 'true' : 'false');
            if (nowVisible) {
                btn.textContent = '▸ طي — ' + arTitle + ' / Collapse — ' + enTitle;
                btn.title =
                    which === 'customRent'
                        ? 'طي أو توسيع القسم / Collapse or expand section'
                        : 'طي أو توسيع الجدول / Collapse or expand schedule';
            } else {
                btn.textContent = '▼ توسيع — ' + arTitle + ' / Expand — ' + enTitle;
                btn.title =
                    which === 'customRent'
                        ? 'توسيع القسم / Expand section'
                        : 'توسيع الجدول / Expand schedule';
            }
        }
    }

    function ensureTenantNationalitySelect(preserveValue) {
        const sel = document.getElementById('tenantNationality');
        if (!sel) return;
        const cur = preserveValue ? toStr(sel.value) : toStr(sel.value || 'عماني / Omani');
        const opts = buildCountryOptions().map((c) => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
        sel.innerHTML = opts;
        if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
        else sel.value = 'عماني / Omani';
    }

    function getMandatoryDocStoreObject() {
        const tx = document.getElementById('contractMandatoryDocsJson');
        try {
            const o = JSON.parse(toStr(tx?.value) || '{}');
            return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
        } catch (e) {
            return {};
        }
    }

    function setMandatoryDocStoreObject(obj) {
        const tx = document.getElementById('contractMandatoryDocsJson');
        if (tx) tx.value = JSON.stringify(obj || {});
    }

    function getOtherDocStoreArray() {
        const tx = document.getElementById('contractOtherDocsJson');
        try {
            const a = JSON.parse(toStr(tx?.value) || '[]');
            return Array.isArray(a) ? a : [];
        } catch (e) {
            return [];
        }
    }

    function setOtherDocStoreArray(arr) {
        const tx = document.getElementById('contractOtherDocsJson');
        if (tx) tx.value = JSON.stringify(Array.isArray(arr) ? arr : []);
    }

    function getContractMandatoryDocSlotsFromData(d) {
        d = d && typeof d === 'object' ? d : getFormData();
        const slots = [];
        const isCo = toStr(d.tenantEntityType) === 'company';
        if (!isCo) {
            slots.push({
                key: 'tenant_person_id',
                label: t('بطاقة المستأجر الشخصية (إلزامي)', 'Tenant civil ID card (required)')
            });
            const nat = toStr(d.tenantNationality);
            if (!isOmaniNationality(nat)) {
                slots.push({
                    key: 'tenant_person_passport',
                    label: t('جواز المستأجر (إلزامي للوافد)', 'Tenant passport (required for non‑Omani)')
                });
            }
            return slots;
        }
        slots.push({
            key: 'tenant_company_cr',
            label: t('السجل التجاري للشركة (إلزامي)', 'Company commercial registration / CR (required)')
        });
        let sigs = [];
        try {
            sigs = JSON.parse(toStr(d.tenantCompanySignatoriesJson) || '[]');
        } catch (e) {
            sigs = [];
        }
        const normalized = normalizeCompanySignatories({ signatories: Array.isArray(sigs) ? sigs : [] });
        const byCivil = {};
        normalized.forEach((s) => {
            const c = toStr(s.signatoryIdNo).trim();
            if (c) byCivil[c] = s;
        });
        /** @type Map<string,{ nat: string, label: string }> */
        const civilsNeeded = new Map();
        const addCivil = (civil, nameHint, nat) => {
            const c = toStr(civil).trim();
            if (!c) return;
            if (!civilsNeeded.has(c)) {
                civilsNeeded.set(c, {
                    nat: toStr(nat) || 'عماني / Omani',
                    label: nameHint ? toStr(nameHint) : c
                });
            }
        };
        normalized.forEach((sig, idx) => {
            const name = toStr(sig.signatoryName);
            if (!name) return;
            const civil = toStr(sig.signatoryIdNo).trim();
            if (civil) {
                addCivil(civil, name, sig.signatoryNationality);
            } else {
                slots.push({
                    key: `co_sig_row_${idx}_id`,
                    label: t('بطاقة المفوض رقم', 'Signatory ID') + ` ${idx + 1} — ${name} (${t('أدخل الرقم المدني في لقطة المفوضين', 'Add civil ID in signatories snapshot')})`
                });
                const sigNat = toStr(sig.signatoryNationality) || 'عماني / Omani';
                if (!isOmaniNationality(sigNat)) {
                    slots.push({
                        key: `co_sig_row_${idx}_passport`,
                        label: t('جواز المفوض رقم', 'Signatory passport') + ` ${idx + 1} — ${name}`
                    });
                }
            }
            if (toStr(sig.signatoryAuthorityMode) === 'joint') {
                const pc = toStr(sig.signatoryJointPartnerCivilId).trim();
                if (pc) {
                    const partner = byCivil[pc];
                    addCivil(pc, partner ? toStr(partner.signatoryName) : pc, partner ? toStr(partner.signatoryNationality) : 'عماني / Omani');
                }
            }
        });
        civilsNeeded.forEach((info, civil) => {
            const slug = slugifyCivilForDocKey(civil);
            const disp = info.label;
            slots.push({
                key: `co_sig_${slug}_id`,
                label: `${t('بطاقة المفوض', 'Signatory ID')} — ${disp} (${civil})`
            });
            if (!isOmaniNationality(info.nat)) {
                slots.push({
                    key: `co_sig_${slug}_passport`,
                    label: `${t('جواز المفوض', 'Signatory passport')} — ${disp}`
                });
            }
        });
        return slots;
    }

    function getContractMandatoryDocSlots() {
        return getContractMandatoryDocSlotsFromData(getFormData());
    }

    function renderContractMandatoryDocsHints(slots, isCo) {
        const h = document.getElementById('contractMandatoryDocsHints');
        if (!h) return;
        if (isCo && !slots.some((s) => s.key.startsWith('co_sig_'))) {
            h.innerHTML = `<span style="color:#8a3b1c">⚠ ${escHtml(t('أضف مفوضين في دفتر العناوين ثم استورد الشركة، أو حدّث نسخة المفوضين.', 'Add signatories in the address book and import the company, or update the signatories snapshot.'))}</span>`;
            return;
        }
        h.innerHTML = `<span style="opacity:.9">${escHtml(t('متحد: يُشترط بطاقة كل مفوض مذكور (بما في ذلك المفوض المرتبط). وافد: بطاقة + جواز لكل مفوض غير عماني.', 'Joint: each signatory (including the linked partner) needs an ID. Non‑Omani: ID + passport.'))}</span>`;
    }

    function renderContractMandatoryDocsUi(pruneOrphans) {
        const host = document.getElementById('contractMandatoryDocsHost');
        if (!host) return;
        const d = getFormData();
        const isCo = toStr(d.tenantEntityType) === 'company';
        let store = getMandatoryDocStoreObject();
        const slots = getContractMandatoryDocSlots();
        const validKeys = new Set(slots.map((s) => s.key));
        if (pruneOrphans) {
            Object.keys(store).forEach((k) => {
                if (!validKeys.has(k)) delete store[k];
            });
            setMandatoryDocStoreObject(store);
        }
        renderContractMandatoryDocsHints(slots, isCo);
        host.innerHTML = slots.map((sl) => {
            const att = store[sl.key] || {};
            const fn = toStr(att.name) || '—';
            const has = contractAttachmentPresent(att);
            const dataUrl = toStr(att.dataUrl) || bhdGetCachedDiskDataUrl(att.relativePath);
            const isImg = has && isImageAttachmentDataUrl(dataUrl, att.type, att.name);
            const previewBlock = has
                ? isImg
                    ? `<img class="contract-mand-doc-thumb" src="${escHtml(dataUrl)}" alt="" title="${t('معاينة / Preview', 'Preview / معاينة')}" data-preview-key="${escHtml(sl.key)}" onclick="openContractAttachmentPreviewFromStoreKey(this.getAttribute('data-preview-key'))">`
                    : `<button type="button" class="mini-btn" data-preview-key="${escHtml(sl.key)}" onclick="openContractAttachmentPreviewFromStoreKey(this.getAttribute('data-preview-key'))">${t('معاينة / Preview', 'Preview / معاينة')}</button>`
                : '';
            return `
            <div class="contract-mand-doc-row" style="border:1px solid #e6edf3;border-radius:8px;padding:8px 10px;background:#fff">
                <div style="font-weight:700;margin-bottom:6px;color:#2a3f4d">${escHtml(sl.label)}</div>
                <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px">
                    <input type="file" accept="image/*,.pdf" data-contract-doc-key="${escHtml(sl.key)}" style="max-width:min(100%,320px)">
                    <span data-contract-doc-name="${escHtml(sl.key)}" data-preview-key="${escHtml(sl.key)}" style="font-size:12px;color:#3b4b56;word-break:break-all;cursor:${has ? 'pointer' : 'default'}" ${has ? `onclick="openContractAttachmentPreviewFromStoreKey(this.getAttribute('data-preview-key'))"` : ''}>${escHtml(fn)}${has ? ' ✓' : ''}</span>
                    ${previewBlock}
                    <button type="button" class="mini-btn" data-contract-doc-clear="${escHtml(sl.key)}">${t('مسح', 'Clear')}</button>
                </div>
            </div>`;
        }).join('');
        try {
            syncContractMandatoryDocsInteractionLock();
        } catch (_eSyncM) {}
        host.querySelectorAll('input[type="file"][data-contract-doc-key]').forEach((inp) => {
            inp.addEventListener('change', () => onContractMandatoryFileChange(inp));
        });
        host.querySelectorAll('[data-contract-doc-clear]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const k = btn.getAttribute('data-contract-doc-clear');
                const st = getMandatoryDocStoreObject();
                delete st[k];
                setMandatoryDocStoreObject(st);
                renderContractMandatoryDocsUi(false);
            });
        });
    }

    async function onContractMandatoryFileChange(inp) {
        const key = inp.getAttribute('data-contract-doc-key');
        const f = inp.files && inp.files[0];
        const st = getMandatoryDocStoreObject();
        if (!key) return;
        if (!f) {
            delete st[key];
            setMandatoryDocStoreObject(st);
            renderContractMandatoryDocsUi(false);
            return;
        }
        try {
            const ref = await bhdPersistUploadedFile(f, {
                category: 'mandatory',
                docType: key
            });
            st[key] = bhdStripInlineBlobFromFileRef(ref);
            setMandatoryDocStoreObject(st);
            try {
                persistMandatoryContractUploadToAddressBook(key, st[key]);
            } catch (eAb) {}
            const nameEl = document.querySelector('[data-contract-doc-name="' + cssEscAttr(key) + '"]');
            if (nameEl) nameEl.textContent = f.name + ' ✓';
            try {
                renderContractMandatoryDocsUi(false);
            } catch (_eRm) {}
            try {
                renderDocument(currentDoc);
            } catch (e) {}
        } catch (e) {
            alert(t('تعذر قراءة الملف.', 'Could not read the file.'));
        }
    }

    function addContractOtherDocRow(prefill) {
        const host = document.getElementById('contractOtherDocsHost');
        if (!host) return;
        const rid = prefill?.id || `cod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const row = document.createElement('div');
        row.setAttribute('data-other-doc-row', rid);
        row.style.border = '1px solid #e6edf3';
        row.style.borderRadius = '8px';
        row.style.padding = '8px 10px';
        row.style.background = '#fff';
        row.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px">
                <div class="input-group" style="margin:0"><label data-ar="وصف مختصر عربي" data-en="Short label (Arabic)">وصف مختصر عربي / Short label (AR)</label>
                <input type="text" data-other-ar maxlength="140" placeholder="مثال: خطاب بنك"></div>
                <div class="input-group" style="margin:0"><label data-ar="Short label English" data-en="Short label (English)">وصف مختصر إنجليزي / Short label (EN)</label>
                <input type="text" data-other-en maxlength="140" placeholder="e.g. bank letter"></div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
                <input type="file" accept="image/*,.pdf" data-other-file="${escHtml(rid)}">
                <span data-other-name style="font-size:12px;color:#3b4b56"></span>
                <button type="button" class="mini-btn" data-other-preview="${escHtml(rid)}" data-preview-key="other_${escHtml(rid)}" style="display:none" onclick="openContractAttachmentPreviewFromStoreKey(this.getAttribute('data-preview-key'))">${t('معاينة / Preview', 'Preview / معاينة')}</button>
                <button type="button" class="mini-btn" data-other-remove="${escHtml(rid)}">${t('إزالة', 'Remove')}</button>
            </div>`;
        if (prefill && prefill.titleAr) row.querySelector('[data-other-ar]').value = prefill.titleAr;
        if (prefill && prefill.titleEn) row.querySelector('[data-other-en]').value = prefill.titleEn;
        host.appendChild(row);
        row.querySelector('[data-other-remove]').addEventListener('click', () => {
            row.remove();
            serializeContractOtherDocsFromUi();
            try {
                renderDocument(currentDoc);
            } catch (e) {}
        });
        row.querySelector('[data-other-file]').addEventListener('change', (e) => onContractOtherFileChange(rid, e.target.files[0]));
        row.querySelectorAll('[data-other-ar],[data-other-en]').forEach((el) => {
            el.addEventListener('input', () => serializeContractOtherDocsFromUi());
        });
        if (prefill?.name && contractAttachmentPresent(prefill)) {
            const sp = row.querySelector('[data-other-name]');
            if (sp) sp.textContent = prefill.name + ' ✓';
            const pb = row.querySelector('[data-other-preview]');
            if (pb) pb.style.display = '';
        }
    }

    async function onContractOtherFileChange(rowId, f) {
        const arr = getOtherDocStoreArray();
        let i = arr.findIndex((x) => x.id === rowId);
        const base = i >= 0 ? { ...arr[i] } : { id: rowId, titleAr: '', titleEn: '' };
        if (!f) {
            base.dataUrl = '';
            base.name = '';
            base.type = '';
            base.relativePath = '';
            base.fileId = '';
            base.storedOnDisk = false;
            if (i >= 0) arr[i] = base;
            setOtherDocStoreArray(arr);
            serializeContractOtherDocsFromUi();
            return;
        }
        try {
            const ref = await bhdPersistUploadedFile(f, { category: 'other', docType: 'other' });
            Object.assign(base, bhdStripInlineBlobFromFileRef(ref));
            const rowEl = document.querySelector('[data-other-doc-row="' + cssEscAttr(rowId) + '"]');
            if (rowEl) {
                const lblAr = rowEl.querySelector('[data-other-ar]')?.value || '';
                const lblEn = rowEl.querySelector('[data-other-en]')?.value || '';
                base.titleAr = lblAr;
                base.titleEn = lblEn;
            }
            i = arr.findIndex((x) => x.id === rowId);
            if (i >= 0) arr[i] = base;
            else arr.push(base);
            setOtherDocStoreArray(arr);
            const rowEl2 = document.querySelector('[data-other-doc-row="' + cssEscAttr(rowId) + '"]');
            const nm = rowEl2?.querySelector('[data-other-name]');
            if (nm) nm.textContent = f.name + ' ✓';
            const previewBtn = rowEl2?.querySelector('[data-other-preview]');
            if (previewBtn) previewBtn.style.display = '';
            try {
                renderDocument(currentDoc);
            } catch (e) {}
        } catch (e) {
            alert(t('تعذر قراءة الملف.', 'Could not read the file.'));
        }
    }

    function serializeContractOtherDocsFromUi() {
        const host = document.getElementById('contractOtherDocsHost');
        if (!host) return;
        const prev = getOtherDocStoreArray();
        const map = {};
        prev.forEach((x) => { map[x.id] = x; });
        const out = [];
        host.querySelectorAll('[data-other-doc-row]').forEach((row) => {
            const id = row.getAttribute('data-other-doc-row');
            if (!id) return;
            const titleAr = toStr(row.querySelector('[data-other-ar]')?.value);
            const titleEn = toStr(row.querySelector('[data-other-en]')?.value);
            const old = map[id] || {};
            out.push({
                id,
                titleAr,
                titleEn,
                name: old.name || '',
                type: old.type || '',
                size: old.size || 0,
                dataUrl: old.dataUrl || ''
            });
        });
        setOtherDocStoreArray(out);
    }

    function hydrateContractDocumentsFromStoredJson() {
        const host = document.getElementById('contractOtherDocsHost');
        if (host) host.innerHTML = '';
        const prev = getOtherDocStoreArray();
        prev.forEach((x) => {
            addContractOtherDocRow(x);
            const rowEl = document.querySelector('[data-other-doc-row="' + cssEscAttr(x.id) + '"]');
            if (!rowEl) return;
            if (x.titleAr) rowEl.querySelector('[data-other-ar]').value = x.titleAr;
            if (x.titleEn) rowEl.querySelector('[data-other-en]').value = x.titleEn;
            const nm = rowEl.querySelector('[data-other-name]');
            if (nm && x.name) nm.textContent = x.name + (contractAttachmentPresent(x) ? ' ✓' : '');
        });
        try {
            renderContractMandatoryDocsUi(true);
        } catch (e) {}
    }

    function validateContractMandatoryDocumentsOrAlert() {
        if (isReservationsWorkspaceScreenActive()) return true;
        try {
            mergeMandatoryDocsFromAddressBookAfterLoadIfMatch();
        } catch (_eValM1) {}

        let store = { ...getMandatoryDocStoreObject() };
        const slots = getContractMandatoryDocSlots();
        const ixAb = findAddressBookTenantIndexForContract();
        const miss = [];
        slots.forEach((sl) => {
            if (contractAttachmentPresent(store[sl.key])) return;
            if (ixAb >= 0) {
                const abAtt = lookupMandatoryAttachmentFromAddressBook(sl.key, addressBookEntries[ixAb]);
                const c = cloneContractDocMeta(abAtt);
                if (contractAttachmentPresent(c)) {
                    store[sl.key] = c;
                    return;
                }
            }
            miss.push(sl.label);
        });
        setMandatoryDocStoreObject(store);
        try {
            renderContractMandatoryDocsUi(false);
        } catch (_eValR) {}

        if (miss.length) {
            const plain = miss.map((x) => String(x).replace(/<[^>]+>/g, ''));
            alert(`${t('مستندات إلزامية ناقصة:', 'Missing required documents:')}\n\n• ${plain.join('\n• ')}`);
            return false;
        }
        return true;
    }

function getEmptyCompanySignatory() {
        return {
            signatoryName: '',
            signatoryNationality: 'عماني / Omani',
            signatoryIdNo: '',
            signatoryIdExpiryDate: '',
            signatoryMobile: '',
            signatoryIdAttachment: null,
            signatoryPassport: '',
            signatoryPassportExpiryDate: '',
            signatoryPassportAttachment: null,
            /** '' | 'individual' | 'joint' — optional signing authority scope */
            signatoryAuthorityMode: '',
            /** Civil ID of the other signatory when mode is `joint` */
            signatoryJointPartnerCivilId: ''
        };
    }

    function mergeAddressBookCompanySignatories(oldRow, newRow) {
        const ao = normalizeCompanySignatories(oldRow);
        const an = normalizeCompanySignatories(newRow);
        const out = ao.map((o, ix) => {
            const n = an[ix];
            const merged = { ...getEmptyCompanySignatory(), ...(n || {}), ...o };
            return {
                ...merged,
                signatoryIdAttachment: o.signatoryIdAttachment || (n && n.signatoryIdAttachment) || null,
                signatoryPassportAttachment: o.signatoryPassportAttachment || (n && n.signatoryPassportAttachment) || null
            };
        });
        while (out.length < an.length) {
            const n = an[out.length];
            out.push({ ...getEmptyCompanySignatory(), ...(n || {}) });
        }
        return out;
    }

    function normalizeCompanySignatories(entry) {
        if (!entry) return [getEmptyCompanySignatory()];
        if (Array.isArray(entry.signatories) && entry.signatories.length > 0) {
            return entry.signatories.map((s) => ({ ...getEmptyCompanySignatory(), ...s }));
        }
        if (toStr(entry.signatoryName) || toStr(entry.signatoryIdNo)) {
            return [{
                signatoryName: toStr(entry.signatoryName),
                signatoryNationality: toStr(entry.signatoryNationality) || 'عماني / Omani',
                signatoryIdNo: toStr(entry.signatoryIdNo),
                signatoryIdExpiryDate: toStr(entry.signatoryIdExpiryDate),
                signatoryMobile: toStr(entry.signatoryMobile),
                signatoryIdAttachment: entry.signatoryIdAttachment || null,
                signatoryPassport: toStr(entry.signatoryPassport),
                signatoryPassportExpiryDate: toStr(entry.signatoryPassportExpiryDate),
                signatoryPassportAttachment: entry.signatoryPassportAttachment || null
            }];
        }
        return [getEmptyCompanySignatory()];
    }

    function syncAddressBookSignatoryPasport(cardEl) {
        if (!cardEl) return;
        const nat = toStr(cardEl.querySelector('[data-ab-field="sigNat"]')?.value);
        const omani = isOmaniNationality(nat);
        const passWrap = cardEl.querySelector('[data-ab-passport-wrap]');
        if (passWrap) passWrap.style.display = omani ? 'none' : '';
    }

    function syncAddressBookSignatoryPasportFromEvent(ev) {
        const card = ev?.target?.closest('.ab-signatory-card');
        syncAddressBookSignatoryPasport(card);
    }

    function addressBookOnSignatoryAuthModeChange(ev) {
        const card = ev?.target?.closest('.ab-signatory-card');
        const mode = toStr(card?.querySelector('[data-ab-field="sigAuthMode"]')?.value);
        const wrap = card?.querySelector('[data-ab-joint-wrap]');
        if (wrap) wrap.style.display = mode === 'joint' ? '' : 'none';
        const mount = document.getElementById('abSignatoriesMount');
        if (mount) addressBookPopulateJointPartnerSelects(mount);
    }

    function addressBookRefreshJointPartnerSelects() {
        const mount = document.getElementById('abSignatoriesMount');
        if (mount) addressBookPopulateJointPartnerSelects(mount);
    }

    function addressBookPopulateJointPartnerSelects(mount) {
        const cards = [...mount.querySelectorAll('.ab-signatory-card')];
        cards.forEach((card, idx) => {
            const selJoint = card.querySelector('[data-ab-field="sigJointPartner"]');
            const selAuth = card.querySelector('[data-ab-field="sigAuthMode"]');
            const wrap = card.querySelector('[data-ab-joint-wrap]');
            if (!selJoint || !wrap) return;
            const prev = selJoint.value;
            const rows = cards.map((c) => ({
                name: toStr(c.querySelector('[data-ab-field="sigName"]')?.value),
                civil: toStr(c.querySelector('[data-ab-field="sigIdNo"]')?.value)
            }));
            let opts = `<option value="">— ${t('اختر المفوض المرتبط', 'Select linked signatory')} —</option>`;
            rows.forEach((row, j) => {
                if (j === idx) return;
                if (!toStr(row.name)) return;
                if (!toStr(row.civil)) return;
                opts += `<option value="${escHtml(row.civil)}">${j + 1}. ${escHtml(row.name)} · ${escHtml(row.civil)}</option>`;
            });
            selJoint.innerHTML = opts;
            if (prev && [...selJoint.options].some((o) => o.value === prev)) {
                selJoint.value = prev;
            }
            const mode = toStr(selAuth?.value);
            wrap.style.display = mode === 'joint' ? '' : 'none';
        });
    }

    function addressBookCompanySignatoryCardHtml(idx, natOpts) {
        const n = idx + 1;
        return `
            <div class="ab-signatory-card" data-ab-sig-idx="${idx}" style="grid-column:1/-1;border:1px solid #e2eaf0;border-radius:10px;padding:12px 14px;margin-bottom:10px;background:#fafcfe">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;flex-wrap:wrap">
                    <span style="display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 8px;border-radius:999px;background:var(--primary);color:#fff;font-weight:800;font-size:13px">${n}</span>
                    <button type="button" class="mini-btn ab-sig-remove" onclick="addressBookRemoveSignatoryRow(${idx})">🗑️</button>
                </div>
                <div class="row-2cols">
                    <div class="input-group">
                        <label data-ar="اسم المفوض بالتوقيع" data-en="Signatory name">اسم المفوض بالتوقيع / Signatory name</label>
                        <input type="text" data-ab-field="sigName" autocomplete="name" onblur="addressBookRefreshJointPartnerSelects()">
                    </div>
                    <div class="input-group">
                        <label data-ar="جنسية المفوض" data-en="Signatory nationality">جنسية المفوض / Signatory nationality</label>
                        <select data-ab-field="sigNat" onchange="syncAddressBookSignatoryPasportFromEvent(event)">${natOpts}</select>
                    </div>
                    <div class="input-group">
                        <label data-ar="الرقم المدني (المفوض)" data-en="Signatory civil ID no.">الرقم المدني (المفوض) / Signatory civil ID no.</label>
                        <input type="text" data-ab-field="sigIdNo" onblur="addressBookRefreshJointPartnerSelects()">
                    </div>
                    <div class="input-group">
                        <label data-ar="انتهاء البطاقة (المفوض)" data-en="Signatory ID expiry">انتهاء البطاقة (المفوض) / Signatory ID expiry</label>
                        <input type="date" data-ab-field="sigIdExp">
                    </div>
                    <div class="input-group">
                        <label data-ar="هاتف المفوض" data-en="Signatory phone">هاتف المفوض / Signatory phone</label>
                        <input type="text" data-ab-field="sigMob">
                    </div>
                    <div class="input-group">
                        <label data-ar="صلاحية التوقيع (اختياري)" data-en="Signing authority (optional)">صلاحية التوقيع (اختياري) / Signing authority (optional)</label>
                        <select data-ab-field="sigAuthMode" onchange="addressBookOnSignatoryAuthModeChange(event)">
                            <option value="">— ${t('غير محدد', 'Not specified')} —</option>
                            <option value="individual">${t('منفرد', 'Individual')}</option>
                            <option value="joint">${t('متحد', 'Joint')}</option>
                        </select>
                    </div>
                    <div class="input-group" data-ab-joint-wrap style="grid-column:1/-1;display:none">
                        <label data-ar="المفوض المرتبط بالتوقيع المتحد" data-en="Linked signatory (joint)">المفوض المرتبط بالتوقيع المتحد / Linked signatory (joint signing)</label>
                        <select data-ab-field="sigJointPartner"></select>
                        <small style="opacity:.85;display:block;margin-top:6px" data-ar="يُعرض هنا المفوضون الآخرون الذين لديهم اسم ورقم مدني. التوقيع المتحد يتطلب مفوضين على الأقل." data-en="Shows other signatories who have both name and civil ID. Joint signing requires at least two signatories."></small>
                    </div>
                    <div class="input-group" style="grid-column:1/-1">
                        <label data-ar="مرفق بطاقة المفوض" data-en="Signatory ID attachment">مرفق بطاقة المفوض / Signatory ID attachment</label>
                        <input type="file" id="abSigIdFile_${idx}" accept="image/*,application/pdf">
                        <button type="button" class="mini-btn" style="margin-top:6px" onclick="openAddressBookCompanyAttachment('sigId', ${idx})">فتح المرفق / Open attachment</button>
                    </div>
                    <div data-ab-passport-wrap class="row-2cols" style="display:contents">
                        <div class="input-group">
                            <label data-ar="جواز السفر (المفوض)" data-en="Signatory passport no.">جواز السفر (المفوض) / Signatory passport no.</label>
                            <input type="text" data-ab-field="sigPassport">
                        </div>
                        <div class="input-group">
                            <label data-ar="انتهاء الجواز (المفوض)" data-en="Signatory passport expiry">انتهاء الجواز (المفوض) / Signatory passport expiry</label>
                            <input type="date" data-ab-field="sigPassExp">
                        </div>
                        <div class="input-group" style="grid-column:1/-1">
                            <label data-ar="مرفق جواز المفوض" data-en="Signatory passport attachment">مرفق جواز المفوض / Signatory passport attachment</label>
                            <input type="file" id="abSigPassportFile_${idx}" accept="image/*,application/pdf">
                            <button type="button" class="mini-btn" style="margin-top:6px" onclick="openAddressBookCompanyAttachment('sigPass', ${idx})">فتح المرفق / Open attachment</button>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function addressBookSignatoriesSnapshotFromDom(storageEntryFlat) {
        const base = (addressBookSignatoriesDraft && addressBookSignatoriesDraft.length)
            ? addressBookSignatoriesDraft
            : normalizeCompanySignatories(storageEntryFlat || {});
        const mount = document.getElementById('abSignatoriesMount');
        if (!mount) return base.slice();
        const cards = [...mount.querySelectorAll('.ab-signatory-card')];
        return cards.map((card, idx) => {
            const gv = (f) => toStr(card.querySelector(`[data-ab-field="${f}"]`)?.value);
            return {
                signatoryName: gv('sigName'),
                signatoryNationality: gv('sigNat') || 'عماني / Omani',
                signatoryIdNo: gv('sigIdNo'),
                signatoryIdExpiryDate: gv('sigIdExp'),
                signatoryMobile: gv('sigMob'),
                signatoryPassport: gv('sigPassport'),
                signatoryPassportExpiryDate: gv('sigPassExp'),
                signatoryAuthorityMode: gv('sigAuthMode'),
                signatoryJointPartnerCivilId: gv('sigJointPartner'),
                signatoryIdAttachment: base[idx]?.signatoryIdAttachment || null,
                signatoryPassportAttachment: base[idx]?.signatoryPassportAttachment || null
            };
        });
    }

    function addressBookRenderCompanySignatoryEditor() {
        ensureAddressBookCountryOptions();
        if (!addressBookSignatoriesDraft || !addressBookSignatoriesDraft.length) {
            addressBookSignatoriesDraft = [getEmptyCompanySignatory()];
        }
        const mount = document.getElementById('abSignatoriesMount');
        if (!mount) return;
        const natOpts = document.getElementById('abNationality')?.innerHTML || '';
        mount.innerHTML = addressBookSignatoriesDraft.map((_, ix) => addressBookCompanySignatoryCardHtml(ix, natOpts)).join('');
        mount.querySelectorAll('.ab-signatory-card').forEach((card, ix) => {
            const row = addressBookSignatoriesDraft[ix];
            const setEl = (f, v) => {
                const el = card.querySelector(`[data-ab-field="${f}"]`);
                if (el) el.value = v || '';
            };
            setEl('sigName', row.signatoryName);
            setEl('sigNat', row.signatoryNationality || 'عماني / Omani');
            setEl('sigIdNo', row.signatoryIdNo);
            setEl('sigIdExp', row.signatoryIdExpiryDate);
            setEl('sigMob', row.signatoryMobile);
            setEl('sigPassport', row.signatoryPassport);
            setEl('sigPassExp', row.signatoryPassportExpiryDate);
            setEl('sigAuthMode', row.signatoryAuthorityMode || '');
            syncAddressBookSignatoryPasport(card);
        });
        addressBookPopulateJointPartnerSelects(mount);
        mount.querySelectorAll('.ab-signatory-card').forEach((card, ix) => {
            const row = addressBookSignatoriesDraft[ix];
            const jsel = card.querySelector('[data-ab-field="sigJointPartner"]');
            const pc = toStr(row.signatoryJointPartnerCivilId);
            if (jsel && pc) {
                if ([...jsel.options].some((o) => o.value === pc)) jsel.value = pc;
            }
        });
    }

    function addressBookAddSignatoryRow() {
        const ix = Number(addressBookEditorState.index);
        const oldFlat = (ix >= 0 ? addressBookEntries[ix] : {}) || {};
        addressBookSignatoriesDraft = addressBookSignatoriesSnapshotFromDom(oldFlat);
        addressBookSignatoriesDraft.push(getEmptyCompanySignatory());
        addressBookRenderCompanySignatoryEditor();
    }

    function addressBookRemoveSignatoryRow(ix) {
        if (addressBookSignatoriesDraft.length <= 1) {
            alert(t('يجب الإبقاء على مفوض واحد على الأقل.', 'At least one signatory must remain.'));
            return;
        }
        const i2 = Number(addressBookEditorState.index);
        const oldFlat = (i2 >= 0 ? addressBookEntries[i2] : {}) || {};
        addressBookSignatoriesDraft = addressBookSignatoriesSnapshotFromDom(oldFlat);
        addressBookSignatoriesDraft.splice(ix, 1);
        addressBookRenderCompanySignatoryEditor();
    }

    async function addressBookFinalizeCompanySignatories(storageFlat) {
        const rows = addressBookSignatoriesSnapshotFromDom(storageFlat);
        const base = normalizeCompanySignatories(storageFlat || {});
        const out = [];
        for (let idx = 0; idx < rows.length; idx++) {
            const r = rows[idx];
            const legacy = base[idx] || {};
            const idAtt = await readAddressBookAttachment(`abSigIdFile_${idx}`);
            const pasAtt = await readAddressBookAttachment(`abSigPassportFile_${idx}`);
            const authMode = toStr(r.signatoryAuthorityMode);
            out.push({
                ...getEmptyCompanySignatory(),
                ...r,
                signatoryAuthorityMode: authMode === 'individual' || authMode === 'joint' ? authMode : '',
                signatoryJointPartnerCivilId: authMode === 'joint' ? toStr(r.signatoryJointPartnerCivilId) : '',
                signatoryIdAttachment: idAtt || legacy.signatoryIdAttachment || r.signatoryIdAttachment || null,
                signatoryPassportAttachment: pasAtt || legacy.signatoryPassportAttachment || r.signatoryPassportAttachment || null
            });
        }
        return out;
    }

    function formatCompanySignatoryAuthoritySuffix(s, list) {
        const mode = toStr(s.signatoryAuthorityMode);
        if (mode === 'individual') return ` · ${t('منفرد', 'Individual')}`;
        if (mode === 'joint') {
            const pc = toStr(s.signatoryJointPartnerCivilId);
            const partner = list.find((p) => toStr(p.signatoryIdNo) === pc && toStr(p.signatoryName));
            const ptag = partner ? escHtml(toStr(partner.signatoryName)) : (pc ? escHtml(pc) : '?');
            return ` · ${t('متحد مع', 'Joint with')} ${ptag}`;
        }
        return '';
    }

    function formatCompanySignatoriesListHtml(entry) {
        const list = normalizeCompanySignatories(entry);
        const shown = list.filter((s) => toStr(s.signatoryName));
        if (!shown.length) return escHtml('-');
        return `<ol style="margin:4px 0;padding-inline-start:20px;line-height:1.5;font-size:11px;color:#324a59">${
            shown.map((s, i) =>
                `<li style="margin-bottom:4px"><strong>${i + 1}.</strong> ${escHtml(toStr(s.signatoryName) || '-')} · ${t('مدني', 'ID')} ${escHtml(toStr(s.signatoryIdNo) || '-')} · 📱 ${escHtml(toStr(s.signatoryMobile) || '-')}${formatCompanySignatoryAuthoritySuffix(s, list)}</li>`
            ).join('')}</ol>`;
    }

    function syncAddressBookPersonCompanyShell() {
        const sel = document.getElementById('abEntityType');
        const entity = sel && toStr(sel.value) === 'company' ? 'company' : 'person';
        const personSec = document.getElementById('abPersonSection');
        const companySec = document.getElementById('abCompanySection');
        if (personSec) {
            const hide = entity === 'company';
            personSec.hidden = hide;
            personSec.style.display = hide ? 'none' : '';
        }
        if (companySec) {
            const show = entity === 'company';
            companySec.hidden = !show;
            companySec.style.display = show ? '' : 'none';
        }
        if (entity !== 'company') {
            addressBookSignatoriesDraft = [];
            const ms = document.getElementById('abSignatoriesMount');
            if (ms) ms.innerHTML = '';
        }
        try { refreshAddressBookRelatedInfoFromForm(); } catch (_eAbRel) {}
    }

    function collectAddressBookRowsFromSystem() {
        const rows = [];
        const nowIso = new Date().toISOString();

        ownersList.forEach((ownerName) => {
            const name = toStr(ownerName);
            if (!name) return;
            const p = ownerProfiles[name] || {};
            const linkedBuildings = (ownerBuildingMap[name] || []).join('، ');
            rows.push({
                type: 'owner',
                name,
                mobile: toStr(p.phone),
                extraMobile: '',
                idNo: toStr(p.civilId),
                nationality: toStr(p.nationality) || 'عماني / Omani',
                idExpiryDate: toStr(p.idExpiryDate),
                email: toStr(p.email),
                passport: '',
                passportExpiryDate: '',
                idAttachment: null,
                passportAttachment: null,
                building: linkedBuildings,
                unit: '',
                source: 'owners',
                updatedAt: nowIso
            });
        });

        getUnitsData().forEach((u) => {
            const tenantName = toStr(u.tenant);
            if (!tenantName) return;
            rows.push({
                type: 'tenant',
                name: tenantName,
                nameEn: toStr(u.tenantEn),
                mobile: toStr(u.mobile || u.contactNo),
                extraMobile: '',
                idNo: toStr(u.civilCard),
                nationality: 'عماني / Omani',
                idExpiryDate: '',
                email: '',
                passport: '',
                passportExpiryDate: '',
                idAttachment: null,
                passportAttachment: null,
                building: toStr(u.building),
                unit: toStr(u.unit),
                source: 'units',
                updatedAt: nowIso
            });
        });

        const d = getFormData();
        if (toStr(d.tenantNameAr)) {
            rows.push({
                type: 'tenant',
                name: toStr(d.tenantNameAr),
                nameEn: toStr(d.tenantNameEn),
                mobile: toStr(d.tenantMobile),
                extraMobile: '',
                idNo: toStr(d.tenantId),
                nationality: 'عماني / Omani',
                idExpiryDate: '',
                email: toStr(d.tenantEmail),
                passport: toStr(d.tenantPassport),
                passportExpiryDate: '',
                idAttachment: null,
                passportAttachment: null,
                building: toStr(d.buildingNo),
                unit: toStr(d.flatNo),
                source: 'contract_form',
                updatedAt: nowIso
            });
        }

        try {
            if (isReservationsWorkspaceScreenActive()) {
                const rd = getReservationFormData();
                const isCo = toStr(rd.tenantEntityType) === 'company';
                const partyName = isCo ? toStr(rd.tenantNameAr) : toStr(rd.tenantNameAr || rd.tenantNameEn);
                if (partyName) {
                    rows.push({
                        type: isCo ? 'company' : 'tenant',
                        name: partyName,
                        nameEn: toStr(rd.tenantNameEn),
                        mobile: toStr(rd.tenantMobile),
                        extraMobile: toStr(rd.tenantCompanyExtraMobile),
                        idNo: isCo ? '' : toStr(rd.tenantId),
                        commercialRegNo: isCo ? toStr(rd.tenantCommercialRegNo) : '',
                        commercialRegExpiryDate: isCo ? toStr(rd.tenantCommercialRegExpiryDate) : '',
                        nationality: toStr(rd.tenantNationality) || 'عماني / Omani',
                        idExpiryDate: '',
                        email: toStr(rd.tenantEmail),
                        passport: toStr(rd.tenantPassport),
                        passportExpiryDate: '',
                        idAttachment: null,
                        passportAttachment: null,
                        building: toStr(rd.buildingNo),
                        unit: toStr(rd.flatNo),
                        source: 'reservation_form',
                        updatedAt: nowIso
                    });
                }
            }
        } catch (_eResAb) {}

        (unitReservations || []).forEach((r) => {
            const fd = r.formData && typeof r.formData === 'object' ? r.formData : {};
            const isCo = toStr(fd.tenantEntityType) === 'company';
            const partyName = toStr(r.reservedBy || fd.tenantNameAr || fd.tenantNameEn);
            if (!partyName) return;
            rows.push({
                type: isCo ? 'company' : 'tenant',
                name: partyName,
                nameEn: toStr(fd.tenantNameEn),
                mobile: toStr(r.phone || fd.tenantMobile),
                extraMobile: toStr(fd.tenantCompanyExtraMobile),
                idNo: isCo ? '' : toStr(fd.tenantId),
                commercialRegNo: isCo ? toStr(fd.tenantCommercialRegNo) : '',
                commercialRegExpiryDate: isCo ? toStr(fd.tenantCommercialRegExpiryDate) : '',
                nationality: toStr(fd.tenantNationality) || 'عماني / Omani',
                idExpiryDate: '',
                email: toStr(fd.tenantEmail),
                passport: toStr(fd.tenantPassport),
                passportExpiryDate: '',
                idAttachment: null,
                passportAttachment: null,
                building: toStr(r.building || fd.buildingNo),
                unit: toStr(r.unit || fd.flatNo),
                source: 'reservation',
                updatedAt: nowIso
            });
        });

        const unique = new Map();
        rows.forEach((r) => {
            const key = addressBookEntryKey(r);
            if (!toStr(r.name)) return;
            const prev = unique.get(key) || {};
            unique.set(key, {
                ...prev,
                ...r,
                nationality: toStr(prev.nationality || r.nationality || 'عماني / Omani'),
                email: toStr(prev.email || r.email),
                passport: toStr(prev.passport || r.passport),
                birthDate: toStr(prev.birthDate || r.birthDate),
                idExpiryDate: toStr(prev.idExpiryDate || r.idExpiryDate),
                passportExpiryDate: toStr(prev.passportExpiryDate || r.passportExpiryDate),
                extraMobile: toStr(prev.extraMobile || r.extraMobile),
                idAttachment: prev.idAttachment || r.idAttachment || null,
                passportAttachment: prev.passportAttachment || r.passportAttachment || null,
                building: toStr(prev.building || r.building),
                unit: toStr(prev.unit || r.unit),
                updatedAt: nowIso
            });
        });
        return [...unique.values()].sort((a, b) => {
            if (a.type !== b.type) return a.type.localeCompare(b.type);
            return toStr(a.name).localeCompare(toStr(b.name), 'ar');
        });
    }

    function buildAddressBookTenantSelectOptionsHtml() {
        const partyRows = addressBookEntries
            .map((r, ix) => ({ r, ix }))
            .filter(({ r }) => (r.type === 'tenant' || r.type === 'company') && toStr(r.name));
        return [
            `<option value="">${t('اختر جهة من دفتر العناوين — شخص أو شركة', 'Select from address book — person or company')}</option>`,
            ...partyRows.map(({ r, ix }) => {
                const tag = r.type === 'company' ? `🏢 ${t('شركة', 'Co')}` : `👤 ${t('شخص', 'Pers.')}`;
                const extra = r.type === 'company'
                    ? (toStr(r.commercialRegNo) ? ` | ${t('س.ت.', 'CR')} ${toStr(r.commercialRegNo)}` : '')
                    : (toStr(r.idNo) ? ` | ID: ${toStr(r.idNo)}` : '');
                const mobPart = toStr(r.mobile) ? ` | 📱 ${toStr(r.mobile)}` : '';
                const locPart = toStr(r.building) ? ` | ${toStr(r.building)} ${toStr(r.unit) ? `- ${toStr(r.unit)}` : ''}` : '';
                return `<option value="${ix}">${tag} ${escHtml(`${r.name}${extra}${mobPart}${locPart}`)}</option>`;
            })
        ].join('');
    }

    function renderAddressBookTenantSelect() {
        const html = buildAddressBookTenantSelectOptionsHtml();
        ['tenantAddressBookSelect', 'resTenantAddressBookSelect'].forEach((id) => {
            const sel = document.getElementById(id);
            if (!sel) return;
            const cur = sel.value;
            sel.innerHTML = html;
            if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
        });
    }

    function resolveAddressBookEntryIndex(entry) {
        if (!entry) return -1;
        const direct = addressBookEntries.indexOf(entry);
        if (direct >= 0) return direct;
        const key = addressBookEntryKey(entry);
        if (!key) return -1;
        return addressBookEntries.findIndex((e) => addressBookEntryKey(e) === key);
    }

    function initAddressBookTableActionHandlers() {
        const tbody = document.getElementById('addressBookTableBody');
        if (!tbody || tbody.dataset.abActionsWired === '1') return;
        tbody.dataset.abActionsWired = '1';
        tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-ab-action]');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            const action = btn.getAttribute('data-ab-action');
            const idx = parseInt(btn.getAttribute('data-ab-index'), 10);
            if (Number.isNaN(idx) || idx < 0 || !addressBookEntries[idx]) {
                alert(t('لم يُعثر على السجل في دفتر العناوين.', 'Record not found in the address book.'));
                return;
            }
            try {
                if (action === 'view') openAddressBookEntryModal('view', idx);
                else if (action === 'edit') openAddressBookEntryModal('edit', idx);
                else if (action === 'import') importAddressBookTenantToContract(idx);
            } catch (errAb) {
                console.error('addressBook table action', action, errAb);
                alert(
                    t(
                        'تعذّر تنفيذ الإجراء على السجل. راجع وحدة التحكم للتفاصيل.',
                        'Could not run this action on the record. See the console for details.'
                    )
                );
            }
        });
    }

    function importAddressBookTenantToContract(index) {
        const entry = addressBookEntries[index];
        if (!entry || (toStr(entry.type) !== 'tenant' && toStr(entry.type) !== 'company')) return;
        if (
            !assertPermissionOrAlert(
                'manage_contracts',
                'لا تملك صلاحية استيراد المستأجر إلى شاشة العقود.',
                'No permission to import tenant into contracts workspace.'
            )
        ) {
            return;
        }
        applyAddressBookTenantToForm(entry);
        try {
            openContractsWorkspace();
        } catch (_eCw) {}
        alert(
            t(
                `تم استيراد «${toStr(entry.name)}» إلى شاشة العقود.`,
                `Imported «${toStr(entry.name)}» into the contracts workspace.`
            )
        );
    }

    function renderAddressBookTable() {
        const tbody = document.getElementById('addressBookTableBody');
        if (!tbody) return;
        initAddressBookTableActionHandlers();
        const rows = getAddressBookFilteredRows();
        window._addressBookViewRows = rows;
        tbody.innerHTML = rows.map((r) => {
            const entryIdx = resolveAddressBookEntryIndex(r);
            const typeTag = addressBookTypeLabel(r.type);
            const contactCol = r.type === 'company'
                ? `
                <td style="white-space:normal;line-height:1.5">
                    <div><span class="addressbook-tag">${typeTag}</span></div>
                    <div style="margin-top:4px;font-weight:700">${escHtml(r.name || '')}</div>
                    ${toStr(r.nameEn) ? `<div style="font-size:11px;color:#6b7c88;direction:ltr">${escHtml(r.nameEn)}</div>` : ''}
                    <div style="font-size:11px;color:#5c6f7b">${t('س.ت.', 'CR')}: ${escHtml(r.commercialRegNo || '-')}</div>
                    <div>${formatCompanySignatoriesListHtml(r)}</div>
                </td>
                <td style="white-space:normal;line-height:1.5">
                    <div>📱 ${escHtml(r.mobile || '-')}</div>
                    <div>📞 ${escHtml(r.extraMobile || '-')}</div>
                    <div style="font-size:11px;color:#5c6f7b">${escHtml(r.email || '-')}</div>
                </td>`
                : `
                <td style="white-space:normal;line-height:1.5">
                    <div><span class="addressbook-tag">${typeTag}</span></div>
                    <div style="margin-top:4px;font-weight:700">${escHtml(r.name || '')}</div>
                    <div style="font-size:11px;color:#5c6f7b">${escHtml(r.nationality || '-')}</div>
                    <div style="font-size:11px;color:#5c6f7b">ID: ${escHtml(r.idNo || '-')}</div>
                    ${toStr(r.birthDate) ? `<div style="font-size:11px;color:#5c6f7b">${t('ميلاد', 'DOB')}: ${escHtml(r.birthDate)}</div>` : ''}
                </td>
                <td style="white-space:normal;line-height:1.5">
                    <div>📱 ${escHtml(r.mobile || '-')}</div>
                    <div>📞 ${escHtml(r.extraMobile || '-')}</div>
                    <div style="font-size:11px;color:#5c6f7b">${escHtml(r.email || '-')}</div>
                </td>`;
            const locCol = `
                <td style="white-space:normal;line-height:1.5">
                    <div>${escHtml(r.building || '-')}</div>
                    <div style="font-size:11px;color:#5c6f7b">Unit: ${escHtml(r.unit || '-')}</div>
                </td>`;
            return `
            <tr>
                ${contactCol}
                ${locCol}
                <td style="font-size:11px;color:${formatDocAlert(r) ? '#9b1c1c' : '#3b4b56'};line-height:1.45">${formatDocAlertLines(r)}</td>
                <td>
                    <div class="inline-actions">
                        ${entryIdx >= 0 ? `
                        <button type="button" class="mini-btn" data-ab-action="view" data-ab-index="${entryIdx}">${t('فتح', 'Open')}</button>
                        <button type="button" class="mini-btn" data-ab-action="edit" data-ab-index="${entryIdx}">${t('تعديل', 'Edit')}</button>
                        ${(r.type === 'tenant' || r.type === 'company') ? `<button type="button" class="mini-btn" data-ab-action="import" data-ab-index="${entryIdx}">${t('استيراد للعقد', 'Import')}</button>` : ''}
                        ` : `<span style="font-size:11px;color:#888">${t('—', '—')}</span>`}
                    </div>
                </td>
            </tr>`;
        }).join('');
        const stats = document.getElementById('addressBookStats');
        if (stats) {
            const ownersCount = rows.filter((x) => toStr(x.type) === 'owner').length;
            const tenantsCount = rows.filter((x) => toStr(x.type) === 'tenant').length;
            const companiesCount = rows.filter((x) => toStr(x.type) === 'company').length;
            const employeesCount = rows.filter((x) => toStr(x.type) === 'employee').length;
            const clientsCount = rows.filter((x) => toStr(x.type) === 'client').length;
            const vendorsCount = rows.filter((x) => toStr(x.type) === 'vendor').length;
            stats.textContent = appUiLanguage === 'en'
                ? `Records: ${rows.length} | Owners: ${ownersCount} | Tenants: ${tenantsCount} | Companies: ${companiesCount} | Employees: ${employeesCount} | Clients: ${clientsCount} | Vendors: ${vendorsCount}`
                : `إجمالي السجلات: ${rows.length} | ملاك: ${ownersCount} | مستأجرون: ${tenantsCount} | شركات: ${companiesCount} | موظفون: ${employeesCount} | عملاء: ${clientsCount} | موردون: ${vendorsCount}`;
        }
        const alertsHost = document.getElementById('addressBookAlerts');
        if (alertsHost) {
            const withIssues = rows
                .map((r) => ({ name: r.name, issues: getAddressBookIssues(r) }))
                .filter((x) => x.issues.length > 0);
            if (!withIssues.length) {
                alertsHost.textContent = appUiLanguage === 'en'
                    ? '✅ No expired or near-expiry documents.'
                    : '✅ لا توجد مستندات منتهية أو قريبة الانتهاء.';
            } else {
                const totalIssues = withIssues.reduce((s, x) => s + x.issues.length, 0);
                const top = withIssues.slice(0, 5).map((x) => `• ${x.name} (${x.issues.length})`).join(' | ');
                alertsHost.textContent = appUiLanguage === 'en'
                    ? `⚠️ Records needing updates: ${withIssues.length} | Total issues: ${totalIssues} | Examples: ${top}`
                    : `⚠️ السجلات التي تحتاج تحديث: ${withIssues.length} | مجموع الملاحظات: ${totalIssues} | أمثلة: ${top}`;
            }
        }
        renderAddressBookTenantSelect();
    }

    function getAddressBookFilteredRows() {
        const q = toStr(document.getElementById('addressBookSearch')?.value).toLowerCase();
        const fContact = toStr(document.getElementById('abFilterContact')?.value).toLowerCase();
        const fComm = toStr(document.getElementById('abFilterComm')?.value).toLowerCase();
        const fLoc = toStr(document.getElementById('abFilterLocation')?.value).toLowerCase();
        const fDocs = toStr(document.getElementById('abFilterDocs')?.value).toLowerCase();
        const rows = addressBookEntries.filter((r) => {
            const isCo = toStr(r.type) === 'company';
            const contactText = isCo
                ? (`company ${r.name} ${r.nameEn} ${r.commercialRegNo} ` + normalizeCompanySignatories(r).map((s) => `${s.signatoryName} ${s.signatoryNationality} ${s.signatoryIdNo} ${s.signatoryAuthorityMode || ''} ${s.signatoryJointPartnerCivilId || ''}`).join(' ')).toLowerCase()
                : `${r.type} ${r.name} ${r.nationality} ${r.idNo} ${r.birthDate || ''}`.toLowerCase();
            const commText = isCo
                ? (`${r.mobile} ${r.extraMobile} ${r.email} ` + normalizeCompanySignatories(r).map((s) => s.signatoryMobile).join(' ')).toLowerCase()
                : `${r.mobile} ${r.extraMobile} ${r.email}`.toLowerCase();
            const locText = `${r.building} ${r.unit}`.toLowerCase();
            const docsText = `${formatDocAlert(r)}`.toLowerCase();
            const allText = `${contactText} ${commText} ${locText} ${docsText}`;
            const passGlobal = !q || allText.includes(q);
            const passContact = !fContact || contactText.includes(fContact);
            const passComm = !fComm || commText.includes(fComm);
            const passLoc = !fLoc || locText.includes(fLoc);
            const passDocs = !fDocs || docsText.includes(fDocs);
            return passGlobal && passContact && passComm && passLoc && passDocs;
        });
        rows.sort((a, b) => {
            const dir = addressBookSortState.dir === 'asc' ? 1 : -1;
            if (addressBookSortState.key === 'doc_alert') {
                const aa = formatDocAlert(a) ? 1 : 0;
                const bb = formatDocAlert(b) ? 1 : 0;
                if (aa !== bb) return (aa - bb) * -dir;
                return toStr(a.name).localeCompare(toStr(b.name), 'ar');
            }
            if (addressBookSortState.key === 'location') {
                return (`${toStr(a.building)} ${toStr(a.unit)}`).localeCompare(`${toStr(b.building)} ${toStr(b.unit)}`, 'ar') * dir;
            }
            if (addressBookSortState.key === 'contactInfo') {
                return (`${toStr(a.mobile)} ${toStr(a.extraMobile)} ${toStr(a.email)}`).localeCompare(`${toStr(b.mobile)} ${toStr(b.extraMobile)} ${toStr(b.email)}`, 'ar') * dir;
            }
            return toStr(a.name).localeCompare(toStr(b.name), 'ar') * dir;
        });
        return rows;
    }

    function printAddressBookReport(printAll = false) {
        const rows = printAll ? [...addressBookEntries] : getAddressBookFilteredRows();
        if (!rows.length) {
            alert('لا توجد بيانات للطباعة / No address book records to print.');
            return;
        }
        const tableRows = rows.map((r, i) => {
            const typeLabel = r.type === 'owner' ? t('مالك', 'Owner')
                : r.type === 'company' ? t('شركة', 'Company') : t('مستأجر', 'Tenant');
            const detailCell = r.type === 'company'
                ? `${escHtml(r.name || '')}${toStr(r.nameEn) ? `<br><small style="direction:ltr">${escHtml(r.nameEn)}</small>` : ''}<br><small>${escHtml(toStr(r.commercialRegNo || '-'))}</small>${formatCompanySignatoriesListHtml(r)}`
                : `${escHtml(r.name || '')}<br><small>${escHtml(r.nationality || '-')} | ID: ${escHtml(r.idNo || '-')}${toStr(r.birthDate) ? ` | ${t('ميلاد', 'DOB')}: ${escHtml(r.birthDate)}` : ''}</small>`;
            return `
            <tr>
                <td>${i + 1}</td>
                <td>${escHtml(typeLabel)}</td>
                <td>${detailCell}</td>
                <td>${escHtml(r.mobile || '-')}<br><small>${escHtml(r.extraMobile || '-')}</small><br><small>${escHtml(r.email || '-')}</small></td>
                <td>${escHtml(r.building || '-')}<br><small>${escHtml(r.unit || '-')}</small></td>
                <td>${getAddressBookIssues(r).length ? getAddressBookIssues(r).map((x) => `• ${escHtml(x)}`).join('<br>') : t('سليم', 'OK')}</td>
            </tr>`;
        }).join('');
        const bodyHtml = `
            <div class="section-header property-section-h">${t('كشف دفتر العناوين', 'Address book report')}</div>
            <p class="property-report-meta">${t('عدد السجلات', 'Records')}: ${rows.length}</p>
            <table class="info-table property-report-table print-zebra">
                <thead><tr><th class="print-num">#</th><th>${t('النوع', 'Type')}</th><th>${t('بيانات جهة الاتصال', 'Contact details')}</th><th>${t('التواصل', 'Contact info')}</th><th>${t('الموقع', 'Location')}</th><th>${t('تنبيه المستندات', 'Docs alert')}</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
        printWithSiteStandard(
            { ar: 'دفتر العناوين', en: 'Address Book' },
            bodyHtml,
            {}
        );
    }

    function getEmptyAddressBookEntry() {
        return {
            type: 'tenant',
            name: '',
            nameEn: '',
            mobile: '',
            extraMobile: '',
            idNo: '',
            birthDate: '',
            nationality: 'عماني / Omani',
            idExpiryDate: '',
            email: '',
            passport: '',
            passportExpiryDate: '',
            idAttachment: null,
            passportAttachment: null,
            building: '',
            unit: '',
            source: 'manual',
            updatedAt: new Date().toISOString()
        };
    }

    function setAddressBookFormDisabled(disabled) {
        ['abEntityType', 'abType', 'abName', 'abNationality', 'abNameEn', 'abMobile', 'abExtraMobile', 'abIdNo', 'abBirthDate', 'abIdExpiryDate', 'abEmail', 'abPassport', 'abPassportExpiryDate', 'abBuilding', 'abUnit', 'abSource', 'abIdAttachmentFile', 'abPassportAttachmentFile', 'abCoName', 'abCoNameEn', 'abCoCrNo', 'abCoCrExpiry', 'abCoCrFile', 'abCoMobile', 'abCoExtraMobile', 'abCoEmail', 'abCoBuilding', 'abCoUnit', 'abCoSource'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.disabled = !!disabled;
        });
        document.querySelectorAll('#abSignatoriesMount input, #abSignatoriesMount select, #abSignatoriesMount button').forEach((el) => {
            el.disabled = !!disabled;
        });
        const addBtn = document.getElementById('abAddSignatoryBtn');
        if (addBtn) addBtn.disabled = !!disabled;
        const saveBtn = document.getElementById('addressBookSaveBtn');
        if (saveBtn) saveBtn.style.display = disabled ? 'none' : 'inline-flex';
    }

    function fillAddressBookForm(entry) {
        const e = entry || getEmptyAddressBookEntry();
        ensureAddressBookCountryOptions();
        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };
        const isCompany = toStr(e.type) === 'company';
        set('abEntityType', isCompany ? 'company' : 'person');
        if (isCompany) {
            set('abCoName', toStr(e.name));
            set('abCoNameEn', toStr(e.nameEn) || transliterateArToEn(toStr(e.name)));
            set('abCoCrNo', toStr(e.commercialRegNo));
            set('abCoCrExpiry', toStr(e.commercialRegExpiryDate));
            set('abCoMobile', toStr(e.mobile));
            set('abCoExtraMobile', toStr(e.extraMobile));
            set('abCoEmail', toStr(e.email));
            addressBookSignatoriesDraft = normalizeCompanySignatories(e);
            addressBookRenderCompanySignatoryEditor();
            set('abCoBuilding', toStr(e.building));
            set('abCoUnit', toStr(e.unit));
            set('abCoSource', toStr(e.source || 'manual'));
            set('abCoCrFile', '');
        } else {
            set('abType', normalizeAddressBookEntryType(e.type));
            populateAddressBookTypeSelect(normalizeAddressBookEntryType(e.type));
            set('abName', toStr(e.name));
            set('abNationality', toStr(e.nationality || 'عماني / Omani'));
            set('abNameEn', toStr(e.nameEn) || transliterateArToEn(toStr(e.name)));
            set('abMobile', toStr(e.mobile));
            set('abExtraMobile', toStr(e.extraMobile));
            set('abIdNo', toStr(e.idNo));
            set('abBirthDate', toStr(e.birthDate));
            set('abIdExpiryDate', toStr(e.idExpiryDate));
            set('abEmail', toStr(e.email));
            set('abPassport', toStr(e.passport));
            set('abPassportExpiryDate', toStr(e.passportExpiryDate));
            set('abBuilding', toStr(e.building));
            set('abUnit', toStr(e.unit));
            set('abSource', toStr(e.source || 'manual'));
            set('abIdAttachmentFile', '');
            set('abPassportAttachmentFile', '');
            setAddressBookAttachmentRef('idAttachment', addressBookAttachmentPresent(e.idAttachment) ? e.idAttachment : null);
            setAddressBookAttachmentRef(
                'passportAttachment',
                addressBookAttachmentPresent(e.passportAttachment) ? e.passportAttachment : null
            );
            syncAddressBookFormRules();
        }
        syncAddressBookPersonCompanyShell();
        if (isCompany) addressBookRenderCompanySignatoryEditor();
    }

    function syncAddressBookFormRules() {
        const nat = toStr(document.getElementById('abNationality')?.value);
        const passportInput = document.getElementById('abPassport');
        if (!passportInput) return;
        const mustPassport = !isOmaniNationality(nat);
        passportInput.required = mustPassport;
        passportInput.placeholder = mustPassport
            ? 'مطلوب لغير العماني / Required for non-Omani'
            : '';
    }

    const AR_NAME_TO_EN = {
        'محمد': 'Mohammed', 'أحمد': 'Ahmed', 'احمد': 'Ahmed', 'محمود': 'Mahmoud', 'مهند': 'Muhanad',
        'عبدالله': 'Abdullah', 'عبد': 'Abd', 'عبدالرحمن': 'Abdurrahman', 'عبدالرحيم': 'Abdurrahim',
        'عبدالعزيز': 'Abdulaziz', 'عبدالكريم': 'Abdulkarim', 'عبدالوهاب': 'Abdulwahab', 'عبدالحميد': 'Abdulhamid',
        'عبدالملك': 'Abdulmalik', 'عبدالهادي': 'Abdulhadi', 'عبدالناصر': 'Abdulnasser', 'عبدالسلام': 'Abdulsalam',
        'عبدالغني': 'Abdulghani', 'عبدالباقي': 'Abdulbaqi', 'عبدالفتاح': 'Abdulfattah', 'عبدالمجيد': 'Abdulmajid',
        'علي': 'Ali', 'حسن': 'Hasan', 'حسين': 'Hussein', 'حسام': 'Hussam', 'حمد': 'Hamad', 'حمدان': 'Hamdan',
        'سعيد': 'Saeed', 'سالم': 'Salim', 'سليم': 'Salim', 'سليمان': 'Sulaiman', 'سلطان': 'Sultan', 'سعود': 'Saud',
        'فياض': 'Fayyaz', 'فايز': 'Faiz', 'فهد': 'Fahad', 'فاطمة': 'Fatima', 'فارس': 'Faris', 'فيصل': 'Faisal',
        'خميس': 'Khamis', 'خالد': 'Khalid', 'خليفة': 'Khalifa', 'خلفان': 'Khalfan', 'خالدية': 'Khalidiya',
        'سيد': 'Syed', 'سعيدة': 'Saeeda', 'ناصر': 'Nasser', 'ناصرة': 'Nassera', 'نوف': 'Nouf', 'نواف': 'Nawaf',
        'عمر': 'Omar', 'عمار': 'Ammar', 'عائشة': 'Aisha', 'عبدالرزاق': 'Abdulrazzaq', 'عبدالمحسن': 'Abdulmohsen',
        'يوسف': 'Yousuf', 'ياسر': 'Yasser', 'يحيى': 'Yahya', 'ياسين': 'Yaseen', 'إبراهيم': 'Ibrahim', 'ابراهيم': 'Ibrahim',
        'إسماعيل': 'Ismail', 'اسماعيل': 'Ismail', 'إسحاق': 'Ishaq', 'اسحاق': 'Ishaq', 'إياد': 'Iyad', 'اياد': 'Iyad',
        'بن': 'Bin', 'بنت': 'Bint', 'ابن': 'Bin', 'ابو': 'Abu', 'أبو': 'Abu', 'ام': 'Um', 'أم': 'Um', 'ال': 'Al',
        'راشد': 'Rashid', 'راشدة': 'Rashida', 'رائد': 'Raed', 'ريم': 'Reem', 'رنا': 'Rana', 'روان': 'Rawan',
        'ماجد': 'Majid', 'ماجدة': 'Majida', 'منصور': 'Mansour', 'مريم': 'Maryam', 'مها': 'Maha',
        'موسى': 'Musa', 'معاذ': 'Muath', 'مازن': 'Mazen', 'مشعل': 'Mishaal', 'مبارك': 'Mubarak', 'منى': 'Mona',
        'طارق': 'Tariq', 'طلال': 'Talal', 'طيبة': 'Taiba', 'تركي': 'Turki', 'تميم': 'Tamim', 'توفيق': 'Tawfiq',
        'جاسم': 'Jassim', 'جابر': 'Jaber', 'جمال': 'Jamal', 'جلال': 'Jalal', 'جواهر': 'Jawaher', 'جمانة': 'Jumana',
        'هيثم': 'Haitham', 'هند': 'Hind', 'هناء': 'Hanaa', 'هاني': 'Hani', 'حبيب': 'Habib', 'حميد': 'Humaid',
        'حمدة': 'Hamda', 'حسينة': 'Husaina', 'حارث': 'Harith', 'حسينه': 'Husaina', 'هيام': 'Hiyam',
        'زايد': 'Zayed', 'زينب': 'Zainab', 'زياد': 'Ziyad', 'زهراء': 'Zahraa', 'زكريا': 'Zakariya',
        'بدر': 'Badr', 'بدور': 'Badour', 'بشرى': 'Bushra', 'بلال': 'Bilal', 'باسم': 'Basem', 'باسمة': 'Basema',
        'شابان': 'Shabib', 'شمسة': 'Shamsa', 'شريفة': 'Sharifa', 'شذى': 'Shatha', 'شيماء': 'Shaima',
        'كريم': 'Kareem', 'كامل': 'Kamel', 'كوثر': 'Kawthar', 'خلود': 'Khulood', 'خولة': 'Khawla',
        'ليلى': 'Layla', 'لطيفة': 'Latifa', 'لمياء': 'Lamya', 'لولوة': 'Lulwa', 'لبنى': 'Lubna',
        'عادل': 'Adel', 'عائلة': 'Aila', 'عزيز': 'Aziz', 'عزيزة': 'Aziza', 'عفاف': 'Afaf', 'علياء': 'Alia',
        'أمل': 'Amal', 'امل': 'Amal', 'أنور': 'Anwar', 'انور': 'Anwar', 'أنس': 'Anas', 'انس': 'Anas',
        'وائل': 'Wael', 'وليد': 'Waleed', 'وداد': 'Widad', 'وفاء': 'Wafaa', 'وسام': 'Wissam', 'وسيم': 'Waseem',
        'قاسم': 'Qasim', 'قيس': 'Qais', 'قمر': 'Qamar',
        'دلال': 'Dalal', 'دانة': 'Dana', 'دينا': 'Dina', 'دعاء': 'Doaa',
        'نورة': 'Noura', 'نورا': 'Noura', 'نادية': 'Nadia', 'نجلاء': 'Najlaa', 'نجاح': 'Najah', 'نبيل': 'Nabeel',
        'مجموعة': 'Group', 'شركة': 'Company', 'مؤسسة': 'Establishment', 'مؤسسه': 'Establishment',
        'العالمية': 'International', 'العالميه': 'International', 'التجارية': 'Trading', 'التجاريه': 'Trading',
        'للتجارة': 'Trading', 'للخدمات': 'Services', 'العقارية': 'Real Estate', 'العقاريه': 'Real Estate',
        'الخليج': 'Gulf', 'عمان': 'Oman', 'عمانية': 'Omani', 'عمانيه': 'Omani', 'العمانية': 'Omani', 'العمانيه': 'Omani'
    };

    const AR_ABD_SUFFIX_TO_EN = {
        'الله': 'Abdullah', 'الرحمن': 'Abdurrahman', 'الرحيم': 'Abdurrahim', 'العزيز': 'Abdulaziz',
        'الكريم': 'Abdulkarim', 'الوهاب': 'Abdulwahab', 'الحميد': 'Abdulhamid', 'الملك': 'Abdulmalik',
        'الهادي': 'Abdulhadi', 'الناصر': 'Abdulnasser', 'السلام': 'Abdulsalam', 'الغني': 'Abdulghani',
        'الباقي': 'Abdulbaqi', 'الفتاح': 'Abdulfattah', 'المجيد': 'Abdulmajid', 'المحسن': 'Abdulmohsen',
        'الرزاق': 'Abdulrazzaq', 'الستار': 'Abdulsattar', 'اللطيف': 'Abdullateef', 'الحفيظ': 'Abdulhafeez',
        'القيوم': 'Abdulqayyum', 'الخالق': 'Abdulkhaliq', 'الرافع': 'Abdulrafi', 'الواحد': 'Abdulwahid'
    };

    const EN_NAME_TO_AR = {
        'mohammed': 'محمد', 'muhammad': 'محمد', 'mohamed': 'محمد', 'ahmed': 'أحمد', 'mahmoud': 'محمود',
        'abdullah': 'عبدالله', 'abdul': 'عبد', 'abdurrahman': 'عبدالرحمن', 'abdurrahim': 'عبدالرحيم',
        'abdulaziz': 'عبدالعزيز', 'abdulkarim': 'عبدالكريم', 'abdulwahab': 'عبدالوهاب', 'abdulhamid': 'عبدالحميد',
        'ali': 'علي', 'hasan': 'حسن', 'hassan': 'حسن', 'hussein': 'حسين', 'hussain': 'حسين', 'hamad': 'حمد',
        'saeed': 'سعيد', 'salim': 'سالم', 'sulaiman': 'سليمان', 'sultan': 'سلطان', 'saud': 'سعود',
        'fayyaz': 'فياض', 'faiz': 'فايز', 'fahad': 'فهد', 'fatima': 'فاطمة', 'faisal': 'فيصل',
        'khamis': 'خميس', 'khalid': 'خالد', 'khalifa': 'خليفة', 'khalfan': 'خلفان',
        'syed': 'سيد', 'sayed': 'سيد', 'nasser': 'ناصر', 'nawaf': 'نواف', 'omar': 'عمر', 'ammar': 'عمار',
        'yousuf': 'يوسف', 'yusuf': 'يوسف', 'yasser': 'ياسر', 'ibrahim': 'إبراهيم', 'ismail': 'إسماعيل',
        'bin': 'بن', 'bint': 'بنت', 'abu': 'أبو', 'um': 'أم', 'al': 'ال',
        'rashid': 'راشد', 'raed': 'رائد', 'reem': 'ريم', 'majid': 'ماجد', 'mansour': 'منصور', 'maryam': 'مريم',
        'musa': 'موسى', 'mubarak': 'مبارك', 'tariq': 'طارق', 'talal': 'طلال', 'turki': 'تركي',
        'jassim': 'جاسم', 'jaber': 'جابر', 'jamal': 'جمال', 'haitham': 'هيثم', 'habib': 'حبيب', 'humaid': 'حميد',
        'zayed': 'زايد', 'zainab': 'زينب', 'badr': 'بدر', 'bilal': 'بلال', 'kareem': 'كريم',
        'layla': 'ليلى', 'latifa': 'لطيفة', 'adel': 'عادل', 'amjad': 'أمجد', 'anwar': 'أنور', 'anas': 'أنس',
        'waleed': 'وليد', 'wael': 'وائل', 'qasim': 'قاسم', 'noura': 'نورة', 'nabeel': 'نبيل',
        'group': 'مجموعة', 'company': 'شركة', 'international': 'العالمية', 'trading': 'للتجارة',
        'services': 'للخدمات', 'oman': 'عمان', 'omani': 'عمانية', 'gulf': 'الخليج', 'llc': 'ش.م.م'
    };

    function normalizeArabicNameToken(word) {
        return String(word || '')
            .replace(/[ًٌٍَُِّْـ]/g, '')
            .replace(/[أإآ]/g, 'ا')
            .replace(/ى/g, 'ي')
            .replace(/ؤ/g, 'و')
            .replace(/ئ/g, 'ي')
            .replace(/ة/g, 'ه')
            .trim();
    }

    function normalizeArabicNamePhrase(text) {
        return String(text || '')
            .replace(/[ًٌٍَُِّْـ]/g, '')
            .replace(/[أإآ]/g, 'ا')
            .replace(/ى/g, 'ي')
            .replace(/\s+/g, ' ')
            .trim();
    }

    const BHD_LEARNED_NAME_PAIRS_KEY = 'bhd_learned_name_pairs';
    let _learnedNamePairsCache = null;

    function loadLearnedNamePairs() {
        if (_learnedNamePairsCache) return _learnedNamePairsCache;
        try {
            const raw = JSON.parse(localStorage.getItem(BHD_LEARNED_NAME_PAIRS_KEY) || '{}');
            _learnedNamePairsCache = raw && typeof raw === 'object' ? raw : {};
        } catch (_eLearn) {
            _learnedNamePairsCache = {};
        }
        return _learnedNamePairsCache;
    }

    function persistLearnedNamePairs() {
        if (!_learnedNamePairsCache) return;
        try {
            localStorage.setItem(BHD_LEARNED_NAME_PAIRS_KEY, JSON.stringify(_learnedNamePairsCache));
        } catch (_eSaveLearn) {}
    }

    function rememberLearnedNamePair(arName, enName) {
        const ar = normalizeArabicNameToken(arName);
        const en = toStr(enName).trim();
        if (!ar || !en || en.length < 2) return;
        const map = loadLearnedNamePairs();
        if (map[ar] === en) return;
        map[ar] = en;
        persistLearnedNamePairs();
    }

    function rememberLearnedNamePhrase(arText, enText) {
        const arPhrase = normalizeArabicNamePhrase(arText);
        const enPhrase = toStr(enText).trim().replace(/\s+/g, ' ');
        if (!arPhrase || !enPhrase || enPhrase.length < 2) return;
        const map = loadLearnedNamePairs();
        map[arPhrase] = enPhrase;
        const arParts = arPhrase.split(/\s+/);
        const enParts = enPhrase.split(/\s+/);
        if (arParts.length === enParts.length) {
            arParts.forEach((part, i) => {
                if (part && enParts[i]) map[part] = enParts[i];
            });
        }
        persistLearnedNamePairs();
    }

    function seedLearnedNamePairsFromExistingData() {
        if (localStorage.getItem('bhd_learned_name_pairs_seeded_v1')) return;
        const map = loadLearnedNamePairs();
        let changed = false;
        const remember = (ar, en) => {
            const arPhrase = normalizeArabicNamePhrase(ar);
            const enPhrase = toStr(en).trim().replace(/\s+/g, ' ');
            if (!arPhrase || !enPhrase) return;
            if (!map[arPhrase]) {
                map[arPhrase] = enPhrase;
                changed = true;
            }
            const arParts = arPhrase.split(/\s+/);
            const enParts = enPhrase.split(/\s+/);
            if (arParts.length === enParts.length) {
                arParts.forEach((part, i) => {
                    if (part && enParts[i] && !map[part]) {
                        map[part] = enParts[i];
                        changed = true;
                    }
                });
            }
        };
        (addressBookEntries || []).forEach((entry) => {
            if (entry?.name && entry?.nameEn) remember(entry.name, entry.nameEn);
        });
        Object.values(ownerProfiles || {}).forEach((profile) => {
            if (profile?.fullName && profile?.fullNameEn) remember(profile.fullName, profile.fullNameEn);
        });
        if (changed) persistLearnedNamePairs();
        localStorage.setItem('bhd_learned_name_pairs_seeded_v1', '1');
    }

    function titleCaseNameEn(word) {
        const w = toStr(word).trim();
        if (!w) return '';
        if (/^(al|bin|bint|abu|um|abd|abdul)$/i.test(w)) {
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        }
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }

    function lookupArNameWord(rawWord) {
        const w = normalizeArabicNameToken(rawWord);
        if (!w) return '';
        const learned = loadLearnedNamePairs()[w];
        if (learned) return learned;
        if (AR_NAME_TO_EN[w]) return AR_NAME_TO_EN[w];
        if (w.startsWith('عبد') && w.length > 3) {
            const suffix = w.slice(3);
            if (AR_ABD_SUFFIX_TO_EN[suffix]) return AR_ABD_SUFFIX_TO_EN[suffix];
            const suffixEn = lookupArNameWord(suffix) || transliterateArWordPhonetic(suffix);
            if (suffixEn) return 'Abdul' + suffixEn.replace(/^(Al|Abdul)/i, '');
        }
        if (w.startsWith('ال') && w.length > 3) {
            const rest = w.slice(2);
            const restEn = lookupArNameWord(rest) || transliterateArWordPhonetic(rest);
            return restEn ? 'Al ' + restEn.replace(/^Al\s+/i, '') : '';
        }
        if (w.startsWith('ابو') && w.length > 3) {
            const rest = w.slice(3);
            const restEn = lookupArNameWord(rest) || transliterateArWordPhonetic(rest);
            return restEn ? 'Abu ' + restEn : 'Abu';
        }
        if (w.startsWith('ام') && w.length > 2) {
            const rest = w.slice(2);
            const restEn = lookupArNameWord(rest) || transliterateArWordPhonetic(rest);
            return restEn ? 'Um ' + restEn : 'Um';
        }
        return '';
    }

    function transliterateArWordPhonetic(word) {
        const w = normalizeArabicNameToken(word);
        if (!w) return '';
        const digraphs = [
            ['ش', 'sh'], ['خ', 'kh'], ['غ', 'gh'], ['ث', 'th'], ['ذ', 'dh'], ['ض', 'd'], ['ط', 't'], ['ظ', 'z']
        ];
        const singles = {
            'ا': 'a', 'ب': 'b', 'ت': 't', 'ج': 'j', 'ح': 'h', 'د': 'd', 'ر': 'r', 'ز': 'z', 'س': 's', 'ص': 's',
            'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y', 'ء': '',
            'ع': 'a', 'ة': 'a', 'پ': 'p', 'گ': 'g', 'ڤ': 'v', 'چ': 'ch'
        };
        let out = '';
        for (let i = 0; i < w.length;) {
            let matched = false;
            for (const [ar, en] of digraphs) {
                if (w.startsWith(ar, i)) {
                    out += en;
                    i += ar.length;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                out += singles[w[i]] ?? w[i];
                i += 1;
            }
        }
        out = out
            .replace(/^aa/, 'a')
            .replace(/aa/g, 'a')
            .replace(/iy$/i, 'i')
            .replace(/uw$/i, 'u')
            .replace(/ah$/i, 'ah')
            .replace(/oo/g, 'u');
        return titleCaseNameEn(out);
    }

    function transliterateArNameWord(rawWord) {
        return lookupArNameWord(rawWord) || transliterateArWordPhonetic(rawWord);
    }

    function transliterateArToEn(text) {
        const clean = String(text || '').replace(/[ًٌٍَُِّْـ]/g, '').trim();
        if (!clean) return '';
        const phraseKey = normalizeArabicNamePhrase(clean);
        const learnedPhrase = loadLearnedNamePairs()[phraseKey];
        if (learnedPhrase) return learnedPhrase;
        return clean
            .split(/\s+/)
            .map((word) => transliterateArNameWord(word))
            .filter(Boolean)
            .join(' ');
    }

    function lookupEnNameWord(rawWord) {
        const w = toStr(rawWord).toLowerCase().replace(/[.'']/g, '');
        if (!w) return '';
        if (EN_NAME_TO_AR[w]) return EN_NAME_TO_AR[w];
        const compact = w.replace(/[^a-z]/g, '');
        if (EN_NAME_TO_AR[compact]) return EN_NAME_TO_AR[compact];
        for (const [ar, enVal] of Object.entries(AR_NAME_TO_EN)) {
            if (w === enVal.toLowerCase()) return ar;
            if (compact && compact === enVal.toLowerCase().replace(/\s+/g, '')) return ar;
        }
        for (const [suffix, enFull] of Object.entries(AR_ABD_SUFFIX_TO_EN)) {
            if (w === enFull.toLowerCase() || compact === enFull.toLowerCase().replace(/\s+/g, '')) {
                return 'عبد' + suffix;
            }
            if (w.startsWith('abdul') && w.slice(5) === enFull.toLowerCase().replace(/^abdul/, '')) {
                return 'عبد' + suffix;
            }
        }
        return '';
    }

    function transliterateEnWordPhonetic(word) {
        const w = toStr(word).toLowerCase();
        if (!w) return '';
        let out = w
            .replaceAll('sh', 'ش').replaceAll('kh', 'خ').replaceAll('th', 'ث').replaceAll('dh', 'ذ').replaceAll('gh', 'غ')
            .replaceAll('ch', 'تش').replaceAll('ph', 'ف').replaceAll('ou', 'و').replaceAll('oo', 'و').replaceAll('ee', 'ي');
        const map = {
            a: 'ا', b: 'ب', c: 'ك', d: 'د', e: 'ي', f: 'ف', g: 'ج', h: 'ه', i: 'ي', j: 'ج', k: 'ك', l: 'ل', m: 'م',
            n: 'ن', o: 'و', p: 'ب', q: 'ق', r: 'ر', s: 'س', t: 'ت', u: 'و', v: 'ف', w: 'و', x: 'كس', y: 'ي', z: 'ز'
        };
        return out
            .split('')
            .map((ch) => map[ch] ?? ch)
            .join('');
    }

    function transliterateEnToAr(text) {
        const source = String(text || '').trim();
        if (!source) return '';
        return source
            .split(/\s+/)
            .map((word) => lookupEnNameWord(word) || transliterateEnWordPhonetic(word))
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    let _bilingualNameTranslateLock = false;
    function translateLinkedBilingualName(ar, en, liveCheckbox, direction, force = false) {
        if (_bilingualNameTranslateLock) return;
        if (!ar || !en) return;
        if (!force && liveCheckbox && !liveCheckbox.checked) return;
        _bilingualNameTranslateLock = true;
        if (direction === 'ar2en') en.value = transliterateArToEn(ar.value);
        else ar.value = transliterateEnToAr(en.value);
        _bilingualNameTranslateLock = false;
    }

    function getAddressBookNameFieldPair() {
        const isCompany = toStr(document.getElementById('abEntityType')?.value) === 'company';
        return {
            ar: document.getElementById(isCompany ? 'abCoName' : 'abName'),
            en: document.getElementById(isCompany ? 'abCoNameEn' : 'abNameEn')
        };
    }

    function translateAddressBookName(direction, force = false) {
        const { ar, en } = getAddressBookNameFieldPair();
        const live = document.getElementById('abLiveTranslate');
        translateLinkedBilingualName(ar, en, live, direction, force);
    }

    function readAddressBookEntryPreviewFromForm() {
        const read = (id) => toStr(document.getElementById(id)?.value);
        const isCompany = read('abEntityType') === 'company';
        if (isCompany) {
            return {
                type: 'company',
                name: read('abCoName'),
                nameEn: read('abCoNameEn'),
                commercialRegNo: read('abCoCrNo'),
                mobile: read('abCoMobile'),
                extraMobile: read('abCoExtraMobile'),
                email: read('abCoEmail'),
                building: read('abCoBuilding'),
                unit: read('abCoUnit')
            };
        }
        return {
            type: read('abType') || 'tenant',
            name: read('abName'),
            nameEn: read('abNameEn'),
            mobile: read('abMobile'),
            extraMobile: read('abExtraMobile'),
            idNo: read('abIdNo'),
            email: read('abEmail'),
            building: read('abBuilding'),
            unit: read('abUnit')
        };
    }

    function addressBookEntryHasLookupIdentity(entry) {
        if (!entry) return false;
        if (toStr(entry.type) === 'company') {
            return !!(
                toStr(entry.name).trim() ||
                toStr(entry.nameEn).trim() ||
                toStr(entry.commercialRegNo).trim() ||
                toStr(entry.mobile).trim()
            );
        }
        return !!(
            toStr(entry.name).trim() ||
            toStr(entry.nameEn).trim() ||
            toStr(entry.idNo).trim() ||
            toStr(entry.mobile).trim()
        );
    }

    function addressBookLookupToken(s) {
        return toStr(s).trim().toLowerCase();
    }

    function addressBookEntryMatchesContractPayload(entry, payload) {
        if (!entry || !payload || typeof payload !== 'object') return false;
        const nameAr = addressBookLookupToken(entry.name);
        const nameEn = addressBookLookupToken(entry.nameEn);
        const mobile = addressBookLookupToken(entry.mobile);
        const idNo = addressBookLookupToken(entry.idNo);
        const cr = normalizeCommercialRegComparable(entry.commercialRegNo);
        const pNameAr = addressBookLookupToken(payload.tenantNameAr);
        const pNameEn = addressBookLookupToken(payload.tenantNameEn);
        const pMobile = addressBookLookupToken(payload.tenantMobile);
        const pId = addressBookLookupToken(payload.tenantId);
        const pCr = normalizeCommercialRegComparable(payload.tenantCommercialRegNo);
        if (toStr(entry.type) === 'company') {
            if (cr && pCr && cr === pCr) return true;
            if (nameAr && pNameAr && nameAr === pNameAr) return true;
            if (nameEn && pNameEn && nameEn === pNameEn) return true;
            if (mobile && pMobile && mobile === pMobile) return true;
            return false;
        }
        if (nameAr && pNameAr && nameAr === pNameAr) return true;
        if (nameEn && pNameEn && nameEn === pNameEn) return true;
        if (nameAr && pNameEn && nameAr === pNameEn) return true;
        if (nameEn && pNameAr && nameEn === pNameAr) return true;
        if (idNo && pId && idNo === pId) return true;
        if (mobile && pMobile && mobile === pMobile) return true;
        return false;
    }

    function addressBookEntryMatchesUnitRow(entry, u) {
        if (!entry || !u) return false;
        const payloadLike = {
            tenantNameAr: u.tenant,
            tenantNameEn: u.tenantEn,
            tenantMobile: u.mobile || u.contactNo,
            tenantId: u.civilCard,
            tenantCommercialRegNo: ''
        };
        return addressBookEntryMatchesContractPayload(entry, payloadLike);
    }

    function addressBookEntryMatchesReservation(entry, r) {
        if (!entry || !r) return false;
        const fd = r.formData && typeof r.formData === 'object' ? r.formData : {};
        const payloadLike = {
            tenantNameAr: fd.tenantNameAr || r.reservedBy,
            tenantNameEn: fd.tenantNameEn,
            tenantMobile: fd.tenantMobile || r.phone,
            tenantId: fd.tenantId,
            tenantCommercialRegNo: fd.tenantCommercialRegNo
        };
        return addressBookEntryMatchesContractPayload(entry, payloadLike);
    }

    function collectAddressBookTenantContractHistory(entry) {
        if (!addressBookEntryHasLookupIdentity(entry)) return [];
        const rows = [];
        const seen = new Set();
        const pushRow = (item) => {
            const key = [item.kind, item.building, item.unit, item.agreementNo, item.startDate].join('\t');
            if (seen.has(key)) return;
            seen.add(key);
            rows.push(item);
        };

        getUnitsData().forEach((u) => {
            if (!addressBookEntryMatchesUnitRow(entry, u)) return;
            const stateKey = getContractLifecycleStateKey(u);
            const isReservationOnly = stateKey === 'reservation_draft' || stateKey === 'reservation_confirmed';
            if (!unitRowHasActiveTenantLikeBinding(u) && !isReservationOnly && stateKey !== 'draft') return;
            pushRow({
                kind: stateKey,
                agreementNo: toStr(u.agreementNo) || '—',
                building: toStr(u.building) || '—',
                unit: toStr(u.unit) || '—',
                startDate: toStr(u.startDate) || '—',
                endDate: toStr(u.endDate) || '—',
                stateLabel: getContractLifecycleLabelForKey(stateKey)
            });
        });

        (unitReservations || []).forEach((r) => {
            if (!addressBookEntryMatchesReservation(entry, r)) return;
            const stateKey = toStr(r.state) === 'confirmed' ? 'reservation_confirmed' : 'reservation_draft';
            const unitsLabel = getReservationUnitsList(r)
                .map((x) => x.unit)
                .join(', ');
            pushRow({
                kind: stateKey,
                agreementNo: toStr(r.agreementNo) || '—',
                building: toStr(r.building) || '—',
                unit: unitsLabel || toStr(r.unit) || '—',
                startDate: toStr(r.since) || '—',
                endDate: '—',
                stateLabel: getContractLifecycleLabelForKey(stateKey)
            });
        });

        try {
            const dmap = loadTenancyContractDraftsMap();
            Object.keys(dmap).forEach((dk) => {
                const payload = dmap[dk]?.payload;
                if (!payload || !addressBookEntryMatchesContractPayload(entry, payload)) return;
                const u = contractStoragePayloadToRentedTableRow(payload);
                if (!u) return;
                const stateKey = 'draft';
                pushRow({
                    kind: stateKey,
                    agreementNo: toStr(payload.agreementNo) || '—',
                    building: toStr(payload.buildingNo) || '—',
                    unit: toStr(payload.flatNo) || '—',
                    startDate: toStr(payload.startDate) || '—',
                    endDate: toStr(payload.endDate) || '—',
                    stateLabel: getContractLifecycleLabelForKey(stateKey)
                });
            });
        } catch (_eDrafts) {}

        try {
            const smap = loadSavedContractsByUnitMap();
            Object.keys(smap).forEach((sk) => {
                const entry0 = smap[sk];
                const payload = entry0?.payload;
                if (!payload || !addressBookEntryMatchesContractPayload(entry, payload)) return;
                const stateKey =
                    toStr(entry0.lifecycleStatus) === 'active_pending' ||
                    contractPayloadNeedsAdditionalData(payload)
                        ? 'active_pending'
                        : 'active';
                pushRow({
                    kind: stateKey,
                    agreementNo: toStr(payload.agreementNo) || '—',
                    building: toStr(payload.buildingNo) || '—',
                    unit: toStr(payload.flatNo) || '—',
                    startDate: toStr(payload.startDate) || '—',
                    endDate: toStr(payload.endDate) || '—',
                    stateLabel: getContractLifecycleLabelForKey(stateKey)
                });
            });
        } catch (_eSavedMap) {}

        try {
            const raw = localStorage.getItem('bhd_contract_full');
            if (raw) {
                const payload = JSON.parse(raw);
                if (payload && addressBookEntryMatchesContractPayload(entry, payload)) {
                    const b = toStr(payload.buildingNo);
                    const u = toStr(payload.flatNo);
                    if (getSavedContractMapEntry(loadSavedContractsByUnitMap(), b, u)) return;
                    const stateKey = payload.contractSavedAt
                        ? payload.contractSavedStatus === 'active_pending' ||
                          contractPayloadNeedsAdditionalData(payload)
                            ? 'active_pending'
                            : 'active'
                        : 'active';
                    pushRow({
                        kind: stateKey,
                        agreementNo: toStr(payload.agreementNo) || '—',
                        building: b || '—',
                        unit: u || '—',
                        startDate: toStr(payload.startDate) || '—',
                        endDate: toStr(payload.endDate) || '—',
                        stateLabel: getContractLifecycleLabelForKey(stateKey)
                    });
                }
            }
        } catch (_eFull) {}

        return rows;
    }

    function refreshAddressBookRelatedInfoFromForm() {
        if (addressBookModalHydrating) return;
        const idx = addressBookEditorState.index;
        const saved = idx >= 0 ? addressBookEntries[idx] : null;
        const preview = readAddressBookEntryPreviewFromForm();
        renderAddressBookRelatedInfo({ ...(saved || {}), ...preview });
    }

    function renderAddressBookRelatedInfo(entry) {
        const host = document.getElementById('addressBookRelatedInfo');
        if (!host) return;
        const eff = entry || readAddressBookEntryPreviewFromForm();
        if (!eff) {
            host.textContent = '';
            return;
        }
        if (eff.type === 'company') {
            const enLine = toStr(eff.nameEn) ? `<br><small style="direction:ltr">${escHtml(eff.nameEn)}</small>` : '';
            const hist = collectAddressBookTenantContractHistory(eff);
            const histHtml = hist.length
                ? hist.map((row) => escHtml(`${row.stateLabel} | ${row.agreementNo} | ${row.building}-${row.unit} | ${row.startDate} → ${row.endDate}`)).join('<br>')
                : (addressBookEntryHasLookupIdentity(eff)
                    ? t('لا يوجد عقود أو حجوزات مرتبطة بهذه الشركة بعد', 'No linked contracts or reservations for this company yet')
                    : t('أدخل اسم الشركة أو السجل التجاري لعرض السجل المرتبط', 'Enter company name or CR no. to show linked records'));
            host.innerHTML = `<strong>${t('بيانات الشركة', 'Company details')}:</strong>${enLine}<br>${escHtml(t('السجل التجاري', 'CR'))}: ${escHtml(eff.commercialRegNo || '-')}` +
                `<br>${formatCompanySignatoriesListHtml(eff)}` +
                `<br><br><strong>${t('سجل عقود الشركة:', 'Company contract history:')}</strong><br>${histHtml}` +
                renderAddressBookBankAccountsBlock(eff.name);
            return;
        }
        if (eff.type === 'owner') {
            const ownerName = toStr(eff.name).trim();
            if (!ownerName) {
                host.innerHTML = `<strong>${t('بيانات عقارات المالك:', 'Owner properties:')}</strong><br>${t('أدخل اسم المالك لعرض العقارات المرتبطة', 'Enter owner name to show linked properties')}`;
                return;
            }
            const buildings = (ownerBuildingMap[ownerName] || []).filter(Boolean);
            const details = buildings.map((b) => {
                const units = getUnitsData().filter((u) => toStr(u.building) === b);
                const rented = units.filter((u) => toStr(u.status).toLowerCase() !== 'vacant').length;
                return appUiLanguage === 'en'
                    ? `${b} (Units: ${units.length} | Rented: ${rented})`
                    : `${b} (وحدات: ${units.length} | مؤجر: ${rented})`;
            });
            host.innerHTML = `<strong>${t('بيانات عقارات المالك:', 'Owner properties:')}</strong><br>${details.map((x) => escHtml(x)).join('<br>') || t('لا توجد عقارات مرتبطة', 'No linked properties')}` +
                renderAddressBookBankAccountsBlock(ownerName);
            return;
        }
        const hist = collectAddressBookTenantContractHistory(eff);
        const histHtml = hist.length
            ? hist.map((row) => escHtml(`${row.stateLabel} | ${row.agreementNo} | ${row.building}-${row.unit} | ${row.startDate} → ${row.endDate}`)).join('<br>')
            : (addressBookEntryHasLookupIdentity(eff)
                ? t('لا يوجد عقود أو حجوزات مرتبطة بهذا المستأجر بعد', 'No linked contracts or reservations for this tenant yet')
                : t('أدخل اسم المستأجر أو الرقم المدني أو الجوال لعرض السجل المرتبط', 'Enter tenant name, civil ID, or mobile to show linked records'));
        const bankBlock = renderAddressBookBankAccountsBlock(eff.name);
        host.innerHTML = `<strong>${t('سجل عقود المستأجر:', 'Tenant contract history:')}</strong><br>${histHtml}${bankBlock}`;
    }

    async function readAddressBookAttachment(inputId) {
        const input = document.getElementById(inputId);
        const file = input?.files?.[0];
        if (!file) return null;
        const idx = addressBookEditorState.index;
        const entry = idx >= 0 ? addressBookEntries[idx] : null;
        const readName = () =>
            toStr(document.getElementById('abName')?.value) ||
            toStr(document.getElementById('abCoName')?.value) ||
            toStr(entry?.name) ||
            '';
        const readIdNo = () => toStr(document.getElementById('abIdNo')?.value) || toStr(entry?.idNo) || '';
        try {
            const ref = await bhdPersistUploadedFile(file, {
                buildingNo: 'addressbook',
                flatNo: readIdNo() || inputId,
                agreementNo: '_contacts',
                category: 'addressbook',
                docType: inputId,
                tenantName: readName()
            });
            if (!ref) throw new Error('empty ref');
            return bhdStripInlineBlobFromFileRef(ref);
        } catch (e) {
            console.warn('readAddressBookAttachment', inputId, e);
            return null;
        }
    }

    function updateAddressBookAttachmentStatusLabel(kind, ref) {
        const idMap = {
            idAttachment: 'abIdAttachmentStatus',
            passportAttachment: 'abPassportAttachmentStatus',
            commercialRegAttachment: 'abCoCrAttachmentStatus'
        };
        const el = document.getElementById(idMap[kind]);
        if (!el) return;
        if (!addressBookAttachmentPresent(ref)) {
            el.textContent = '';
            return;
        }
        const disk = ref.storedOnDisk || ref.relativePath;
        el.textContent =
            (toStr(ref.name) || t('مرفق', 'Attachment')) +
            ' ✓' +
            (disk ? ` (${t('على القرص', 'on disk')})` : '');
        el.style.color = '#2d6a4f';
    }

    async function onAddressBookAttachmentInputChange(inputId, kind) {
        const input = document.getElementById(inputId);
        if (!input?.files?.[0]) {
            setAddressBookAttachmentRef(kind, null);
            return;
        }
        const ref = await readAddressBookAttachment(inputId);
        if (!ref) {
            alert(
                t(
                    'تعذر حفظ المرفق. تأكد من تشغيل التطبيق المكتبي واختيار مجلد البيانات.',
                    'Could not save the attachment. Ensure the desktop app is running with a data folder selected.'
                )
            );
            input.value = '';
            updateAddressBookAttachmentStatusLabel(kind, null);
            return;
        }
        setAddressBookAttachmentRef(kind, ref);
    }

    async function openAddressBookAttachment(kind) {
        const idx = addressBookEditorState.index;
        const entry = idx >= 0 ? addressBookEntries[idx] : null;
        const pending = addressBookEditorPendingAttachments || {};
        const att =
            kind === 'passportAttachment'
                ? pending.passportAttachment || entry?.passportAttachment
                : pending.idAttachment || entry?.idAttachment;
        if (!addressBookAttachmentPresent(att)) {
            alert('لا يوجد مرفق محفوظ لهذه الجهة حالياً / No saved attachment for this contact yet.');
            return;
        }
        const resolved = { ...att, dataUrl: await bhdResolveAttachmentUrl(att) };
        openStoredAttachment(resolved, kind === 'passportAttachment' ? 'Passport Attachment' : 'ID Attachment');
    }

    function openAddressBookCompanyAttachment(kind, sigIndex = 0) {
        const idx = addressBookEditorState.index;
        const entry = idx >= 0 ? addressBookEntries[idx] : null;
        const si = Number(sigIndex) || 0;
        const sigRows = normalizeCompanySignatories(entry || {});
        const sg = sigRows[si];
        if (!entry || toStr(entry.type) !== 'company') {
            alert('لا يوجد مرفق محفوظ لهذه الجهة حالياً / No saved attachment for this contact yet.');
            return;
        }
        if ((kind === 'sigId' || kind === 'sigPass') && !sg) {
            alert(t('لا يوجد مفوض في هذا الموضع.', 'No signatory at this slot.'));
            return;
        }
        const idxLabel = `${si + 1}`;
        const map = {
            crCert: { att: entry.commercialRegAttachment || entry.leaseContractAttachment, labelAr: 'السجل التجاري', labelEn: 'Commercial registration (CR)' },
            lease: { att: entry.leaseContractAttachment, labelAr: 'عقد الإيجار', labelEn: 'Lease contract' },
            sigId: { att: sg?.signatoryIdAttachment || entry.signatoryIdAttachment, labelAr: `بطاقة المفوض #${idxLabel}`, labelEn: `Signatory ID #${idxLabel}` },
            sigPass: { att: sg?.signatoryPassportAttachment || entry.signatoryPassportAttachment, labelAr: `جواز المفوض #${idxLabel}`, labelEn: `Signatory passport #${idxLabel}` }
        };
        const m = map[kind];
        if (!m || !addressBookAttachmentPresent(m.att)) {
            alert('لا يوجد مرفق محفوظ لهذا الحقل حالياً / No saved attachment for this field yet.');
            return;
        }
        const title = appUiLanguage === 'en' ? m.labelEn : m.labelAr;
        openStoredAttachment(m.att, title);
    }

    function openAddressBookEntryModal(mode = 'view', index = -1) {
        const m = mode === 'add' ? 'add' : mode === 'edit' ? 'edit' : 'view';
        if (m === 'view') {
            if (
                !assertPermissionAnyOrAlert(
                    ['manage_owners', 'manage_contracts', 'view_address_book'],
                    'لا تملك صلاحية الوصول إلى دفتر العناوين.',
                    'No permission to access the address book.'
                )
            ) {
                return;
            }
        } else if (
            !assertPermissionAnyOrAlert(
                ['manage_owners', 'manage_contracts'],
                'لا تملك صلاحية الوصول إلى دفتر العناوين.',
                'No permission to access the address book.'
            )
        ) {
            return;
        }
        if (m === 'edit' || m === 'add') {
            if (
                !assertPermissionAnyOrAlert(
                    ['manage_owners', 'manage_contracts'],
                    'لا تملك صلاحية تعديل دفتر العناوين.',
                    'No permission to edit the address book.'
                )
            ) {
                return;
            }
        }
        const i = Number(index);
        const entry =
            i >= 0 && addressBookEntries[i]
                ? { ...addressBookEntries[i] }
                : getEmptyAddressBookEntry();
        addressBookEditorState = { mode: m, index: i >= 0 ? i : -1 };
        addressBookEditorPendingAttachments = {};
        const modal = document.getElementById('addressBookEntryModal');
        if (modal && modal.parentElement !== document.body) {
            document.body.appendChild(modal);
        }
        const title = document.getElementById('addressBookEntryModalTitle');
        if (title) {
            const titleText = m === 'add'
                ? t('إضافة جهة اتصال جديدة', 'Add new contact')
                : m === 'edit'
                    ? t('تعديل جهة اتصال', 'Edit contact')
                    : t('بيانات جهة الاتصال', 'Contact details');
            title.textContent = titleText;
        }
        if (modal) modal.classList.add('open');
        addressBookModalHydrating = true;
        try {
            fillAddressBookForm(entry);
            if (m === 'view') {
                applyAddressBookEditFieldLocks(entry);
            } else if (m === 'add') {
                setAddressBookFormDisabled(false);
                const policyNote = document.getElementById('addressBookEditPolicyNote');
                const requestBtn = document.getElementById('addressBookRequestEditBtn');
                if (policyNote) {
                    policyNote.style.display = 'none';
                    policyNote.setAttribute('hidden', 'hidden');
                }
                if (requestBtn) {
                    requestBtn.style.display = 'none';
                    requestBtn.hidden = true;
                }
            } else {
                applyAddressBookEditFieldLocks(entry);
            }
            try {
                renderAddressBookRelatedInfo(entry);
            } catch (errRel) {
                console.warn('renderAddressBookRelatedInfo failed', errRel);
                const host = document.getElementById('addressBookRelatedInfo');
                if (host) {
                    host.textContent = t(
                        'تعذّر تحميل السجل المرتبط.',
                        'Could not load linked history.'
                    );
                }
            }
        } catch (errOpen) {
            console.error('openAddressBookEntryModal', errOpen);
            alert(
                t(
                    'تعذّر فتح نافذة السجل. حاول تحديث الصفحة.',
                    'Could not open the record window. Try refreshing the page.'
                )
            );
            if (modal) modal.classList.remove('open');
            return;
        } finally {
            addressBookModalHydrating = false;
        }
        try {
            localizeBilingualUi();
        } catch (_eLocAb) {}
    }

    function closeAddressBookEntryModal() {
        document.getElementById('addressBookEntryModal')?.classList.remove('open');
    }

    async function saveAddressBookEntry() {
        if (addressBookEditorState.mode === 'view') return;
        if (
            !assertPermissionAnyOrAlert(
                ['manage_owners', 'manage_contracts'],
                'لا تملك صلاحية حفظ بيانات دفتر العناوين.',
                'No permission to save address book data.'
            )
        ) {
            return;
        }
        const read = (id) => toStr(document.getElementById(id)?.value);
        const oldEntry = (addressBookEditorState.mode === 'edit' && addressBookEditorState.index >= 0) ? (addressBookEntries[addressBookEditorState.index] || {}) : {};
        const isCompanyForm = read('abEntityType') === 'company';
        if (isCompanyForm) {
            const crAtt =
                getAddressBookAttachmentRefFromForm('commercialRegAttachment') ||
                (await readAddressBookAttachment('abCoCrFile')) ||
                oldEntry.commercialRegAttachment ||
                null;
            const sigList = await addressBookFinalizeCompanySignatories(oldEntry);
            const entry = {
                type: 'company',
                companyAttachmentSchema: 2,
                name: read('abCoName'),
                nameEn: read('abCoNameEn'),
                commercialRegNo: read('abCoCrNo'),
                commercialRegExpiryDate: read('abCoCrExpiry'),
                commercialRegAttachment: crAtt,
                leaseContractAttachment: oldEntry.leaseContractAttachment || null,
                mobile: read('abCoMobile'),
                extraMobile: read('abCoExtraMobile'),
                email: read('abCoEmail'),
                signatories: sigList,
                building: read('abCoBuilding'),
                unit: read('abCoUnit'),
                source: read('abCoSource') || 'manual',
                updatedAt: new Date().toISOString()
            };
            if (!entry.name) {
                alert(t('اسم الشركة مطلوب', 'Company name is required.'));
                return;
            }
            const coIssues = getAddressBookCompanyIssues(entry);
            if (coIssues.length) {
                alert(coIssues.slice(0, 12).join('\n') + (coIssues.length > 12 ? `\n… +${coIssues.length - 12}` : ''));
                return;
            }
            const user = getLoggedInUser();
            const finalCoEntry = applyActorAuditStamp(
                addressBookEditorState.mode === 'edit' && oldEntry && Object.keys(oldEntry).length
                    ? mergeAddressBookEntryWithEditPolicy(oldEntry, entry, user)
                    : entry
            );
            if (addressBookEditorState.mode === 'edit' && addressBookEditorState.index >= 0 && addressBookEntries[addressBookEditorState.index]) {
                addressBookEntries[addressBookEditorState.index] = finalCoEntry;
                revokeAddressBookEditGrantForEntry(finalCoEntry);
                linkAddressBookEntryWithProvisionedUser(finalCoEntry, false, addressBookEditorState.index);
            } else {
                addressBookEntries.unshift(finalCoEntry);
                const newUser = linkAddressBookEntryWithProvisionedUser(finalCoEntry, true, 0);
                if (newUser) {
                    alert(
                        t(
                            `تم إنشاء حساب مستخدم تلقائياً:\nرقم: ${newUser.userNo}\nاسم المستخدم: ${newUser.username}\nكلمة المرور: ${newUser.password}`,
                            `User account auto-created:\nNo: ${newUser.userNo}\nUsername: ${newUser.username}\nPassword: ${newUser.password}`
                        )
                    );
                }
            }
            localStorage.setItem('bhd_address_book', JSON.stringify(addressBookEntries));
            rememberLearnedNamePhrase(finalCoEntry.name, finalCoEntry.nameEn);
            addressBookEditorPendingAttachments = {};
            renderAddressBookTable();
            try {
                await syncBhdKvToServer();
            } catch (_eAbCoSync) {}
            const coIdx =
                addressBookEditorState.mode === 'edit' && addressBookEditorState.index >= 0
                    ? addressBookEditorState.index
                    : 0;
            const syncedCo = syncContractTenantFromAddressBookIfPending(coIdx);
            closeAddressBookEntryModal();
            if (syncedCo) {
                try {
                    openContractsWorkspace();
                } catch (_eRetCo) {}
            }
            return;
        }
        const idAttachment =
            getAddressBookAttachmentRefFromForm('idAttachment') ||
            (await readAddressBookAttachment('abIdAttachmentFile')) ||
            oldEntry.idAttachment ||
            null;
        const passportAttachment =
            getAddressBookAttachmentRefFromForm('passportAttachment') ||
            (await readAddressBookAttachment('abPassportAttachmentFile')) ||
            oldEntry.passportAttachment ||
            null;
        const entry = {
            type: normalizeAddressBookEntryType(read('abType')),
            name: read('abName'),
            nationality: read('abNationality') || 'عماني / Omani',
            nameEn: read('abNameEn'),
            mobile: read('abMobile'),
            extraMobile: read('abExtraMobile'),
            idNo: read('abIdNo'),
            birthDate: read('abBirthDate'),
            idExpiryDate: read('abIdExpiryDate'),
            email: read('abEmail'),
            passport: read('abPassport'),
            passportExpiryDate: read('abPassportExpiryDate'),
            idAttachment,
            passportAttachment,
            building: read('abBuilding'),
            unit: read('abUnit'),
            source: read('abSource') || 'manual',
            updatedAt: new Date().toISOString()
        };
        if (!entry.name) {
            alert('اسم جهة الاتصال مطلوب / Contact name is required.');
            return;
        }
        if (!isOmaniNationality(entry.nationality) && !toStr(entry.passport)) {
            alert('الجواز إجباري إذا كانت الجنسية غير عماني / Passport is required for non-Omani nationality.');
            return;
        }
        const user = getLoggedInUser();
        const finalEntry = applyActorAuditStamp(
            addressBookEditorState.mode === 'edit' && oldEntry && Object.keys(oldEntry).length
                ? mergeAddressBookEntryWithEditPolicy(oldEntry, entry, user)
                : entry
        );
        if (addressBookEditorState.mode === 'edit' && addressBookEditorState.index >= 0 && addressBookEntries[addressBookEditorState.index]) {
            addressBookEntries[addressBookEditorState.index] = finalEntry;
            revokeAddressBookEditGrantForEntry(finalEntry);
            linkAddressBookEntryWithProvisionedUser(finalEntry, false, addressBookEditorState.index);
        } else {
            addressBookEntries.unshift(finalEntry);
            const newUser = linkAddressBookEntryWithProvisionedUser(finalEntry, true, 0);
            if (newUser) {
                alert(
                    t(
                        `تم إنشاء حساب مستخدم تلقائياً:\nرقم: ${newUser.userNo}\nاسم المستخدم: ${newUser.username}\nكلمة المرور: ${newUser.password}`,
                        `User account auto-created:\nNo: ${newUser.userNo}\nUsername: ${newUser.username}\nPassword: ${newUser.password}`
                    )
                );
            }
        }
        localStorage.setItem('bhd_address_book', JSON.stringify(addressBookEntries));
        rememberLearnedNamePhrase(finalEntry.name, finalEntry.nameEn);
        addressBookEditorPendingAttachments = {};
        renderAddressBookTable();
        try {
            await syncBhdKvToServer();
        } catch (_eAbSync) {}
        const savedIdx =
            addressBookEditorState.mode === 'edit' && addressBookEditorState.index >= 0
                ? addressBookEditorState.index
                : 0;
        const synced = syncContractTenantFromAddressBookIfPending(savedIdx);
        closeAddressBookEntryModal();
        if (synced) {
            try {
                openContractsWorkspace();
            } catch (_eRet) {}
        }
    }

    function refreshAddressBookFromSystem(showAlert = false) {
        const oldRows = Array.isArray(addressBookEntries) ? addressBookEntries : [];
        const oldMap = new Map();
        oldRows.forEach((r) => {
            oldMap.set(addressBookEntryKey(r), r);
        });
        const fromSystem = collectAddressBookRowsFromSystem();
        const merged = fromSystem.map((r) => {
            const old = oldMap.get(addressBookEntryKey(r)) || {};
            return {
                ...old,
                ...r,
                nationality: toStr(old.nationality || r.nationality || 'عماني / Omani'),
                nameEn: toStr(old.nameEn || r.nameEn),
                extraMobile: toStr(old.extraMobile || r.extraMobile),
                idExpiryDate: toStr(old.idExpiryDate || r.idExpiryDate),
                passportExpiryDate: toStr(old.passportExpiryDate || r.passportExpiryDate),
                idAttachment: old.idAttachment || r.idAttachment || null,
                passportAttachment: old.passportAttachment || r.passportAttachment || null,
                commercialRegNo: toStr(old.commercialRegNo || r.commercialRegNo),
                commercialRegExpiryDate: toStr(old.commercialRegExpiryDate || r.commercialRegExpiryDate),
                companyAttachmentSchema: Number(old.companyAttachmentSchema || r.companyAttachmentSchema) || 1,
                commercialRegAttachment: old.commercialRegAttachment || r.commercialRegAttachment || null,
                leaseContractAttachment: old.leaseContractAttachment || r.leaseContractAttachment || null,
                signatories: mergeAddressBookCompanySignatories(old, r)            };
        });
        oldRows.forEach((r) => {
            const key = addressBookEntryKey(r);
            if (!merged.some((x) => addressBookEntryKey(x) === key)) {
                merged.push(r);
            }
        });
        addressBookEntries = merged;
        localStorage.setItem('bhd_address_book', JSON.stringify(addressBookEntries));
        renderAddressBookTable();
        if (showAlert) alert(`✅ تم تحديث دفتر العناوين. إجمالي السجلات: ${addressBookEntries.length}`);
    }

    function isContractTenantAddressBookSyncPending() {
        if (contractTenantAddressBookSyncPending) return true;
        try {
            return sessionStorage.getItem('bhd_contract_ab_sync_pending') === '1';
        } catch (_e) {
            return false;
        }
    }

    function setContractTenantAddressBookSyncPending(pending) {
        contractTenantAddressBookSyncPending = !!pending;
        try {
            if (pending) sessionStorage.setItem('bhd_contract_ab_sync_pending', '1');
            else sessionStorage.removeItem('bhd_contract_ab_sync_pending');
        } catch (_e) {}
    }

    function findContractTenantAddressBookIndex() {
        refreshAddressBookFromSystem(false);
        let idx = findTenantAddressBookIndexByFormName();
        if (idx >= 0) return idx;
        const entry = findTenantAddressBookEntryForReservation(null, getFormData());
        if (!entry) return -1;
        idx = addressBookEntries.indexOf(entry);
        return idx >= 0 ? idx : -1;
    }

    function openLinkedTenantInAddressBookForContractUpdate() {
        if (!isContractsWorkspaceScreenActive()) return;
        const idx = findContractTenantAddressBookIndex();
        if (idx < 0) {
            alert(
                t(
                    'لم يُعثر على المستأجر في دفتر العناوين. أضفه أو أكمل بياناته في الدفتر أولاً.',
                    'Tenant was not found in the address book. Add or complete their record in the address book first.'
                )
            );
            return;
        }
        setContractTenantAddressBookSyncPending(true);
        openAddressBookWorkspace();
        openAddressBookEntryModal('edit', idx);
    }

    function syncContractTenantFromAddressBookIfPending(entryOrIndex) {
        if (!isContractTenantAddressBookSyncPending()) return false;
        let entry = entryOrIndex;
        if (typeof entryOrIndex === 'number') {
            entry = addressBookEntries[entryOrIndex];
        }
        if (!entry || (toStr(entry.type) !== 'tenant' && toStr(entry.type) !== 'company')) return false;
        setContractTenantAddressBookSyncPending(false);
        applyAddressBookTenantToForm(entry, { allowWhenDraftLocked: true, skipBuildingUnit: true });
        try {
            scheduleContractWorkspaceDataRefresh();
        } catch (_eSch) {}
        try {
            flushContractWorkspaceDraftSave();
        } catch (_eSav) {}
        try {
            const domPayload = collectStorableContractFullFromDom();
            const b = toStr(domPayload.buildingNo);
            const u = toStr(domPayload.flatNo);
            if (b && u && getSavedContractMapEntry(loadSavedContractsByUnitMap(), b, u)) {
                const st = resolveContractLifecycleStatus(domPayload);
                upsertSavedContractForUnit(b, u, domPayload, st);
            } else {
                upsertTenancyContractDraftFromPayload(b, u, domPayload);
            }
        } catch (_eDraft) {}
        alert(
            t(
                '✅ تم تحديث بيانات المستأجر في العقد من دفتر العناوين.',
                '✅ Contract tenant data was updated from the address book.'
            )
        );
        return true;
    }

    function applyAddressBookTenantToForm(entry, opt = {}) {
        if (!entry || (toStr(entry.type) !== 'tenant' && toStr(entry.type) !== 'company')) return;
        const allowWhenDraftLocked = opt.allowWhenDraftLocked === true;
        const skipBuildingUnit = opt.skipBuildingUnit === true;
        const bLoc = toStr(document.getElementById('buildingNo')?.value);
        const uLoc = toStr(document.getElementById('flatNo')?.value);
        const fromReservationFlow =
            tenancyDraftCompletionLocked ||
            (isContractsWorkspaceScreenActive() &&
                bLoc &&
                uLoc &&
                unitHasTenancyDraftForUnit(bLoc, uLoc));
        if (fromReservationFlow && !allowWhenDraftLocked) {
            alert(
                t(
                    'بيانات المستأجر مقفلة لأنها مأخوذة من مسودة الحجز. استخدم «تحديث بيانات المستأجر» لفتح الدفتر.',
                    'Tenant data is locked from the reservation draft. Use «Update tenant data» to open the address book.'
                )
            );
            return;
        }
        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.value = v || '';
        };
        const isCo = toStr(entry.type) === 'company';
        set('tenantEntityType', isCo ? 'company' : 'person');
        set('tenantNameAr', toStr(entry.name));
        set('tenantNameEn', toStr(entry.nameEn || entry.name));
        set('tenantMobile', toStr(entry.mobile));
        set('tenantEmail', toStr(entry.email));
        if (isCo) {
            set('tenantId', '');
            set('tenantPassport', '');
            set('tenantCommercialRegNo', toStr(entry.commercialRegNo));
            set('tenantCommercialRegExpiryDate', toStr(entry.commercialRegExpiryDate));
            set('tenantCompanyExtraMobile', toStr(entry.extraMobile));
            const sigs = Array.isArray(entry.signatories) ? entry.signatories : [];
            set('tenantCompanySignatoriesJson', JSON.stringify(sigs));
            if (document.getElementById('tenantNationality')) document.getElementById('tenantNationality').value = 'عماني / Omani';
        } else {
            set('tenantId', toStr(entry.idNo));
            set('tenantPassport', toStr(entry.passport));
            set('tenantCommercialRegNo', '');
            set('tenantCommercialRegExpiryDate', '');
            set('tenantCompanyExtraMobile', '');
            set('tenantCompanySignatoriesJson', '[]');
            try {
                ensureTenantNationalitySelect(false);
            } catch (e) {}
            if (document.getElementById('tenantNationality')) {
                document.getElementById('tenantNationality').value = toStr(entry.nationality) || 'عماني / Omani';
            }
        }
        try {
            mergeMandatoryDocsFromAddressBook(entry, { forceOverwriteFromAb: true });
        } catch (eAb) {}
        try {
            hydrateContractDocumentsFromStoredJson();
        } catch (_eHydrDocs) {}
        if (!tenancyDraftCompletionLocked) {
            try {
                setTenantIdentityLockedFromAddressBook(true);
            } catch (eLock) {}
        }
        syncTenantEntityFieldsFromType();
        if (!skipBuildingUnit && contractEntryContext.mode !== 'reservation') {
            if (toStr(entry.building)) set('buildingNo', toStr(entry.building));
            if (toStr(entry.unit)) set('flatNo', toStr(entry.unit));
        }
        updateSummaryPanel();
        renderDocument(currentDoc);
        try {
            scheduleContractWorkspaceDraftSave();
        } catch (_eAbSav) {}
    }

    function applyAddressBookTenantToFormByName(name) {
        const n = toStr(name);
        if (!n) return;
        const row = addressBookEntries.find((x) =>
            (toStr(x.type) === 'tenant' || toStr(x.type) === 'company') && toStr(x.name) === n
        );
        if (!row) return;
        applyAddressBookTenantToForm(row);
    }

    function applySelectedAddressBookTenantToForm() {
        const sel = document.getElementById('tenantAddressBookSelect');
        if (!sel || sel.value === '') {
            alert(t('اختر جهة أولاً من دفتر العناوين (شخص أو شركة).', 'Select a party from the address book first (person or company).'));
            return;
        }
        const idx = parseInt(sel.value, 10);
        if (Number.isNaN(idx)) return;
        const entry = addressBookEntries[idx];
        if (!entry) return;
        applyAddressBookTenantToForm(entry);
    }

    function openQuickAddTenantForContract() {
        openAddressBookEntryModal('add', -1);
        const typeSel = document.getElementById('abType');
        if (typeSel) typeSel.value = 'tenant';
        const ent = document.getElementById('abEntityType');
        if (ent) ent.value = 'person';
        syncAddressBookPersonCompanyShell();
        const sourceInp = document.getElementById('abSource');
        if (sourceInp && !toStr(sourceInp.value)) sourceInp.value = 'manual';
        syncAddressBookFormRules();
    }

    function openQuickAddCompanyTenantForContract() {
        openAddressBookEntryModal('add', -1);
        const ent = document.getElementById('abEntityType');
        if (ent) ent.value = 'company';
        syncAddressBookPersonCompanyShell();
        const sourceInp = document.getElementById('abSource');
        if (sourceInp && !toStr(sourceInp.value)) sourceInp.value = 'manual';
        localizeBilingualUi();
    }

    function getUnitRecordByBuildingUnit(building, unit) {
        const b = toStr(building);
        const u = normalizeUnit(unit);
        if (!b || !u) return null;
        return getUnitsData().find((row) => toStr(row.building) === b && normalizeUnit(row.unit) === u) || null;
    }

    function syncUnitDerivedFieldsFromSelection() {
        if (tenancyDraftCompletionLocked) return;
        const building = toStr(document.getElementById('buildingNo')?.value);
        const unit = toStr(document.getElementById('flatNo')?.value);
        const matched = getUnitRecordByBuildingUnit(building, unit);
        if (!matched) return;
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };
        set('floorDetails', toStr(matched.floor));
        set('unitType', toStr(matched.unitType));
        set('electricityMeter', toStr(matched.electricity));
        set('waterMeter', toStr(matched.water));
        if (toStr(matched.unitType).toLowerCase() === 'office' || toStr(matched.unitType).toLowerCase() === 'shop') {
            set('usageType', 'تجاري Commercial');
            set('contractTypeSelect', 'تجاري Commercial');
        } else {
            set('usageType', 'سكني Residential');
            set('contractTypeSelect', 'سكني Residential');
        }
    }

    function applyLockToFormField(el, locked, lockTitle, unlockTitle) {
        if (!el) return;
        if (isRenewalMunicipalField(el)) return;
        // لا تقفل الحقل أثناء الكتابة — يُعاد تقييم القفل عند blur / Keep field editable while focused
        if (locked && document.activeElement === el) locked = false;
        if (el.tagName === 'SELECT' || el.type === 'file') el.disabled = !!locked;
        else el.readOnly = !!locked;
        const grp = el.closest('.input-group');
        const isGapField = !locked && contractAdditionalDataMode;
        if (grp) {
            grp.classList.toggle('input-group--additional-editable', isGapField);
            grp.classList.toggle('input-group--additional-gap', isGapField);
        }
        el.classList.toggle('field-additional-gap', isGapField);
        if (locked) {
            el.title = lockTitle;
            el.classList.add('field-locked-tenancy-draft');
        } else {
            el.title = unlockTitle || '';
            el.classList.remove('field-locked-tenancy-draft');
        }
    }

    function markContractAdditionalGapRow(tr, hasGap) {
        if (!tr) return;
        tr.classList.toggle('contract-additional-gap-row', !!hasGap);
    }

    function applyLockToFieldId(id, locked, lockTitle, unlockTitle) {
        applyLockToFormField(document.getElementById(id), locked, lockTitle, unlockTitle);
    }

    function applyContractAdditionalDataFieldLocks() {
        try {
            syncContractDepositFieldsFromAccountingToDom();
        } catch (_eDepSyncLock) {}
        try {
            applyContractDepositAttachmentFieldLock();
        } catch (_eDepAttLock) {}
        const gaps = analyzeContractAdditionalDataGaps(collectStorableContractFullFromDom());
        contractAdditionalDataGaps = gaps;
        const lockTitle = t('مقفل — العقد محفوظ؛ أكمل البيانات الإضافية فقط', 'Locked — contract saved; complete additional data only');
        const unlockTitle = t('مطلوب — أكمل هذا الحقل', 'Required — complete this field');

        document.querySelectorAll('.input-group--additional-editable, .input-group--additional-gap').forEach((g) => {
            g.classList.remove('input-group--additional-editable');
            g.classList.remove('input-group--additional-gap');
        });
        document.querySelectorAll('.bhd-section--additional-gap').forEach((s) => {
            s.classList.remove('bhd-section--additional-gap');
        });
        document.querySelectorAll('.contract-additional-gap-row').forEach((tr) => {
            tr.classList.remove('contract-additional-gap-row');
        });
        document.querySelectorAll('.field-additional-gap').forEach((el) => {
            el.classList.remove('field-additional-gap');
        });

        const coreLockIds = [
            'contractTypeSelect',
            'tenantNameAr',
            'tenantNameEn',
            'tenantId',
            'tenantMobile',
            'tenantPassport',
            'tenantEmail',
            'tenantEntityType',
            'tenantCommercialRegNo',
            'tenantCommercialRegExpiryDate',
            'tenantCompanyExtraMobile',
            'tenantNationality',
            'buildingNo',
            'flatNo',
            'floorDetails',
            'unitType',
            'usageType',
            'electricityMeter',
            'waterMeter',
            'monthlyRent',
            'rentCalcMode',
            'rentAreaSqm',
            'rentPerSqm',
            'contractMonths',
            'startDate',
            'endDate',
            'unitHandoverDate',
            'agreedRentPaymentDay',
            'paymentMethod',
            'depositAmount',
            'graceDays',
            'graceAmount',
            'otherDiscountAmount',
            'contractSubjectToVat',
            'vatPaymentMode',
            'vatChequeCount'
        ];
        coreLockIds.forEach((id) => applyLockToFieldId(id, true, lockTitle));

        applyLockToFieldId('municipalFormNo', true, lockTitle);
        applyLockToFieldId('municipalContractNo', true, lockTitle);
        applyLockToFieldId('depositReceiptRef', !gaps.depositReceiptRef, lockTitle, unlockTitle);
        applyLockToFormField(
            document.getElementById('depositAttachmentInput'),
            !gaps.depositAttachment,
            lockTitle,
            unlockTitle
        );

        const insDepSec = document.getElementById('insuranceDepositSection');
        if (insDepSec) {
            insDepSec.classList.toggle(
                'bhd-section--additional-gap',
                !!(gaps.depositReceiptRef || gaps.depositAttachment)
            );
        }

        const buildingSelect = document.getElementById('buildingSelect');
        if (buildingSelect) {
            buildingSelect.disabled = true;
            buildingSelect.classList.add('field-locked-tenancy-draft');
            buildingSelect.title = lockTitle;
        }
        const abs = document.getElementById('tenantAddressBookSelect');
        if (abs) {
            abs.disabled = true;
            abs.classList.add('field-locked-tenancy-draft');
            abs.title = lockTitle;
        }
        document.querySelectorAll('#tenantAddressBookImportToolbar button, #tenantAddressBookUpdateToolbar button').forEach((btn) => {
            btn.disabled = true;
        });

        const psSec = document.getElementById('paymentScheduleSection');
        const psHasGap =
            !!gaps.paymentScheduleIncomplete ||
            !!(gaps.paymentScheduleMonthIndices && gaps.paymentScheduleMonthIndices.length);
        if (psSec) {
            psSec.classList.toggle('bhd-section--additional-gap', psHasGap);
        }
        const byChq = isContractPaymentByCheque();
        const psWrap = document.getElementById('paymentScheduleTableWrap');
        if (psWrap) {
            const gapMonths = new Set((gaps.paymentScheduleMonthIndices || []).map((n) => parseInt(n, 10)));
            psWrap.querySelectorAll('tbody tr[data-schedule-month]').forEach((tr) => {
                const m = parseInt(tr.getAttribute('data-schedule-month'), 10) || 0;
                const editable = gapMonths.has(m);
                markContractAdditionalGapRow(tr, editable);
                tr.querySelectorAll('[data-schedule-date], [data-schedule-amount]').forEach((el) => {
                    applyLockToFormField(el, true, lockTitle);
                });
                if (byChq) {
                    const chk = tr.querySelector('[data-schedule-check]');
                    applyLockToFormField(chk, !editable, lockTitle, unlockTitle);
                    const file = tr.querySelector('[data-schedule-file]');
                    if (file) applyLockToFormField(file, !editable, lockTitle, unlockTitle);
                } else {
                    tr.querySelectorAll('[data-schedule-date], [data-schedule-amount]').forEach((el) => {
                        applyLockToFormField(el, !editable, lockTitle, unlockTitle);
                    });
                }
            });
        }

        const vatSec = document.getElementById('vatChequeScheduleSection');
        if (vatSec) {
            vatSec.classList.toggle(
                'bhd-section--additional-gap',
                !!(gaps.vatChequeIndices && gaps.vatChequeIndices.length)
            );
        }
        const vatWrap = document.getElementById('vatChequeScheduleTableWrap');
        if (vatWrap) {
            const gapIdx = new Set((gaps.vatChequeIndices || []).map((n) => parseInt(n, 10)));
            vatWrap.querySelectorAll('tbody tr[data-vat-cheque-index]').forEach((tr) => {
                const idx = parseInt(tr.getAttribute('data-vat-cheque-index'), 10) || 0;
                const editable = gapIdx.has(idx);
                markContractAdditionalGapRow(tr, editable);
                tr.querySelectorAll('[data-vat-schedule-date], [data-vat-schedule-amount]').forEach((el) => {
                    applyLockToFormField(el, true, lockTitle);
                });
                const chk = tr.querySelector('[data-vat-schedule-check]');
                applyLockToFormField(chk, !editable, lockTitle, unlockTitle);
                const file = tr.querySelector('[data-vat-schedule-file]');
                if (file) applyLockToFormField(file, !editable, lockTitle, unlockTitle);
            });
        }

        const insList = document.getElementById('insuranceDepositItemsList');
        if (insList) {
            const gapIds = new Set((gaps.insuranceDepositRowIds || []).map((x) => toStr(x)));
            insList.querySelectorAll('[data-insurance-row]').forEach((row) => {
                const rid = toStr(row.getAttribute('data-insurance-row'));
                const editable = gapIds.has(rid);
                markContractAdditionalGapRow(row, editable);
                if (editable) row.style.padding = '4px';
                row.querySelectorAll('[data-insurance-paytype], [data-insurance-amount]').forEach((el) => {
                    applyLockToFormField(el, true, lockTitle);
                });
                const ref = row.querySelector('[data-insurance-ref]');
                applyLockToFormField(ref, !editable, lockTitle, unlockTitle);
                const file = row.querySelector('[data-insurance-file]');
                if (file) applyLockToFormField(file, !editable, lockTitle, unlockTitle);
                const rm = row.querySelector('button[onclick*="removeInsuranceDepositItemRow"]');
                if (rm) rm.disabled = true;
            });
        }

        document
            .querySelectorAll(
                '#paymentScheduleSection .mini-btn, #vatChequeScheduleSection .mini-btn, #insuranceDepositSection .mini-btn, #customRentSection .mini-btn, #extraAdjustmentsSection .mini-btn, button[onclick*="rebuildPaymentSchedule"], button[onclick*="rebuildVatCheque"], button[onclick*="addInsuranceDeposit"], button[onclick*="addCustomRent"], button[onclick*="addExtraAdjustment"]'
            )
            .forEach((btn) => {
                btn.disabled = true;
            });

        const note = document.getElementById('contractAdditionalDataLockNote');
        if (note) {
            const ar = toStr(note.getAttribute('data-ar'));
            const en = toStr(note.getAttribute('data-en'));
            note.textContent = ar && en ? `${ar} / ${en}` : ar || en;
            note.style.display = 'block';
            note.removeAttribute('hidden');
        }
        const draftNote = document.getElementById('tenancyDraftFieldsLockNote');
        if (draftNote) {
            draftNote.style.display = 'none';
            draftNote.setAttribute('hidden', 'hidden');
        }

        syncContractMandatoryDocsInteractionLock();
    }

    function enterContractAdditionalDataMode(payloadOrUnit) {
        if (contractFullEditMode) return false;
        try {
            exitContractActivationDataMode();
        } catch (_eExitAct) {}
        let payload = null;
        if (payloadOrUnit && typeof payloadOrUnit === 'object') {
            if (toStr(payloadOrUnit.buildingNo) || toStr(payloadOrUnit.flatNo) || toStr(payloadOrUnit.agreementNo)) {
                payload = payloadOrUnit;
            } else if (toStr(payloadOrUnit.building) && toStr(payloadOrUnit.unit)) {
                payload = getContractPayloadForUnit(payloadOrUnit);
            }
        }
        if (!payload) payload = collectStorableContractFullFromDom();
        if (!payload || typeof payload !== 'object') return false;
        payload = enrichPayloadDepositFromAccounting(payload);
        payload = enrichPayloadWithResolvedLinkedContractUnits(payload);
        try {
            ensureLinkedContractUnitsOnForm(payload);
            refreshLinkedContractUnitsPanel(payload);
        } catch (_eLinkedAdd) {}
        const gaps = analyzeContractAdditionalDataGaps(payload);
        if (!hasAnyContractAdditionalDataGaps(gaps)) {
            exitContractAdditionalDataMode();
            return false;
        }
        contractAdditionalDataMode = true;
        contractAdditionalDataGaps = gaps;
        setTenancyDraftCompletionFieldLocks(false);
        try {
            setTenantIdentityLockedFromAddressBook(false);
        } catch (_eAb) {}
        try {
            const b = toStr(payload.buildingNo);
            const u = toStr(payload.flatNo);
            if (b && u) {
                localStorage.setItem(
                    'bhd_contract_additional_data_mode_v1',
                    JSON.stringify({ buildingNo: b, flatNo: u })
                );
            }
        } catch (_eSt) {}
        applyContractAdditionalDataFieldLocks();
        try {
            let scrollEl = null;
            if (gaps.depositReceiptRef) scrollEl = document.getElementById('depositReceiptRef');
            else if (gaps.depositAttachment) scrollEl = document.getElementById('depositAttachmentInput');
            else if (gaps.paymentScheduleIncomplete) scrollEl = document.getElementById('paymentScheduleSection');
            else if (gaps.paymentScheduleMonthIndices && gaps.paymentScheduleMonthIndices.length) {
                const m0 = gaps.paymentScheduleMonthIndices[0];
                scrollEl = document.querySelector(`#paymentScheduleTableWrap tr[data-schedule-month="${m0}"] [data-schedule-check]`);
            } else if (gaps.vatChequeIndices && gaps.vatChequeIndices.length) {
                const i0 = gaps.vatChequeIndices[0];
                scrollEl = document.querySelector(`#vatChequeScheduleTableWrap tr[data-vat-cheque-index="${i0}"] [data-vat-schedule-check]`);
            } else if (gaps.insuranceDepositRowIds && gaps.insuranceDepositRowIds.length) {
                const id0 = gaps.insuranceDepositRowIds[0];
                scrollEl = document.querySelector(`[data-insurance-row="${id0}"] [data-insurance-ref]`);
            }
            if (scrollEl) scrollEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (_eScr) {}
        return true;
    }

    function applyContractActivationFieldLocks() {
        const gaps = contractActivationGaps || analyzeContractActivationGaps(collectStorableContractFullFromDom());
        contractActivationGaps = gaps;
        const lockTitle = t(
            'مقفل — أكمل البلدية والمستندات فقط لتفعيل العقد',
            'Locked — complete municipal refs and documents only to activate the contract'
        );
        const unlockTitle = t('مطلوب قبل تفعيل العقد', 'Required before contract activation');

        document.querySelectorAll('.input-group--additional-editable, .input-group--additional-gap').forEach((g) => {
            g.classList.remove('input-group--additional-editable');
            g.classList.remove('input-group--additional-gap');
        });
        document.querySelectorAll('.bhd-section--additional-gap').forEach((s) => {
            s.classList.remove('bhd-section--additional-gap');
        });
        document.querySelectorAll('.contract-additional-gap-row').forEach((tr) => {
            tr.classList.remove('contract-additional-gap-row');
        });
        document.querySelectorAll('.field-additional-gap').forEach((el) => {
            el.classList.remove('field-additional-gap');
        });

        const coreLockIds = [
            'contractTypeSelect',
            'tenantNameAr',
            'tenantNameEn',
            'tenantId',
            'tenantMobile',
            'tenantPassport',
            'tenantEmail',
            'tenantEntityType',
            'tenantCommercialRegNo',
            'tenantCommercialRegExpiryDate',
            'tenantCompanyExtraMobile',
            'tenantNationality',
            'buildingNo',
            'flatNo',
            'floorDetails',
            'unitType',
            'usageType',
            'electricityMeter',
            'waterMeter',
            'monthlyRent',
            'rentCalcMode',
            'rentAreaSqm',
            'rentPerSqm',
            'contractMonths',
            'startDate',
            'endDate',
            'unitHandoverDate',
            'agreedRentPaymentDay',
            'paymentMethod',
            'depositAmount',
            'graceDays',
            'graceAmount',
            'otherDiscountAmount',
            'contractSubjectToVat',
            'vatPaymentMode',
            'vatChequeCount'
        ];
        coreLockIds.forEach((id) => applyLockToFieldId(id, true, lockTitle));
        applyLockToFieldId('depositReceiptRef', true, lockTitle);
        applyLockToFormField(document.getElementById('depositAttachmentInput'), true, lockTitle);
        applyLockToFieldId('municipalFormNo', !gaps.municipalFormNo, lockTitle, unlockTitle);
        applyLockToFieldId('municipalContractNo', !gaps.municipalContractNo, lockTitle, unlockTitle);
        ['municipalFormNoGroup', 'municipalContractNoGroup'].forEach((gid) => {
            const grp = document.getElementById(gid);
            if (!grp) return;
            const isGap =
                (gid === 'municipalFormNoGroup' && gaps.municipalFormNo) ||
                (gid === 'municipalContractNoGroup' && gaps.municipalContractNo);
            grp.classList.toggle('input-group--additional-gap', !!isGap);
            grp.classList.toggle('input-group--additional-editable', !!isGap);
        });
        const note = document.getElementById('contractActivationLockNote');
        if (note) {
            const ar = toStr(note.getAttribute('data-ar'));
            const en = toStr(note.getAttribute('data-en'));
            note.textContent = ar && en ? `${ar} / ${en}` : ar || en;
            note.style.display = 'block';
            note.removeAttribute('hidden');
        }
        const addNote = document.getElementById('contractAdditionalDataLockNote');
        if (addNote) {
            addNote.style.display = 'none';
            addNote.setAttribute('hidden', 'hidden');
        }
        try {
            refreshPropertyDocumentsBundleSectionVisibility();
        } catch (_ePdbActLock) {}
        syncContractMandatoryDocsInteractionLock();
    }

    function enterContractActivationDataMode(payloadOrUnit) {
        if (contractFullEditMode) return false;
        let payload = null;
        if (payloadOrUnit && typeof payloadOrUnit === 'object') {
            if (toStr(payloadOrUnit.buildingNo) || toStr(payloadOrUnit.flatNo) || toStr(payloadOrUnit.agreementNo)) {
                payload = payloadOrUnit;
            } else if (toStr(payloadOrUnit.building) && toStr(payloadOrUnit.unit)) {
                payload = getContractPayloadForUnit(payloadOrUnit);
            }
        }
        if (!payload) payload = collectStorableContractFullFromDom();
        payload = enrichPayloadDepositFromAccounting(payload);
        payload = enrichPayloadWithResolvedLinkedContractUnits(payload);
        if (!contractFinancialDataComplete(payload)) return false;
        try {
            ensureLinkedContractUnitsOnForm(payload);
            refreshLinkedContractUnitsPanel(payload);
        } catch (_eActLinked) {}
        const gaps = analyzeContractActivationGaps(payload);
        if (!hasAnyContractActivationGaps(gaps)) {
            exitContractActivationDataMode();
            return false;
        }
        try {
            exitContractAdditionalDataMode();
        } catch (_eExitAdd) {}
        contractActivationDataMode = true;
        contractActivationGaps = gaps;
        setTenancyDraftCompletionFieldLocks(false);
        applyContractActivationFieldLocks();
        try {
            let scrollEl = null;
            if (gaps.municipalFormNo) scrollEl = document.getElementById('municipalFormNo');
            else if (gaps.municipalContractNo) scrollEl = document.getElementById('municipalContractNo');
            else scrollEl = document.getElementById('propertyDocumentsBundleSection');
            if (scrollEl) scrollEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (_eActScr) {}
        return true;
    }

    function exitContractActivationDataMode() {
        contractActivationDataMode = false;
        contractActivationGaps = null;
        ['municipalFormNoGroup', 'municipalContractNoGroup'].forEach((gid) => {
            const grp = document.getElementById(gid);
            if (!grp) return;
            grp.classList.remove('input-group--additional-gap', 'input-group--additional-editable');
        });
        const note = document.getElementById('contractActivationLockNote');
        if (note) {
            note.style.display = 'none';
            note.setAttribute('hidden', 'hidden');
        }
        applyTenancyAndTenantFieldLocks();
    }

    function exitContractAdditionalDataMode() {
        contractAdditionalDataMode = false;
        contractAdditionalDataGaps = null;
        try {
            localStorage.removeItem('bhd_contract_additional_data_mode_v1');
        } catch (_eRm) {}
        document.querySelectorAll('.input-group--additional-editable, .input-group--additional-gap').forEach((g) => {
            g.classList.remove('input-group--additional-editable');
            g.classList.remove('input-group--additional-gap');
        });
        document.querySelectorAll('.bhd-section--additional-gap').forEach((s) => {
            s.classList.remove('bhd-section--additional-gap');
        });
        document.querySelectorAll('.contract-additional-gap-row').forEach((tr) => {
            tr.classList.remove('contract-additional-gap-row');
        });
        document.querySelectorAll('.field-additional-gap').forEach((el) => {
            el.classList.remove('field-additional-gap');
        });
        document.querySelectorAll('#insuranceDepositItemsList [data-insurance-row]').forEach((row) => {
            row.style.padding = '';
        });
        const note = document.getElementById('contractAdditionalDataLockNote');
        if (note) {
            note.style.display = 'none';
            note.setAttribute('hidden', 'hidden');
        }
        document
            .querySelectorAll(
                '#paymentScheduleSection .mini-btn, #vatChequeScheduleSection .mini-btn, #insuranceDepositSection .mini-btn, #customRentSection .mini-btn, #extraAdjustmentsSection .mini-btn'
            )
            .forEach((btn) => {
                btn.disabled = false;
            });
        applyTenancyAndTenantFieldLocks();
    }

    function unlockContractFormForFullEdit() {
        contractFullEditMode = true;
        exitContractAdditionalDataMode();
        exitContractActivationDataMode();
        setTenancyDraftCompletionFieldLocks(false);
        try {
            setTenantIdentityLockedFromAddressBook(false);
        } catch (_eAbFull) {}
        const scope = document.querySelector('#contractsWorkspace .data-entry');
        if (scope) {
            scope.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach((el) => {
                if (el.tagName === 'SELECT' || el.type === 'file') el.disabled = false;
                else el.readOnly = false;
                el.classList.remove('field-locked-tenancy-draft', 'field-locked-saved-contract', 'field-additional-gap');
                el.removeAttribute('title');
            });
            scope.querySelectorAll('button.mini-btn').forEach((btn) => {
                btn.disabled = false;
            });
        }
        try {
            applyContractsWorkspaceLockState();
        } catch (_eCwsFull) {}
        try {
            applyTenancyAndTenantFieldLocks();
        } catch (_eTenFull) {}
        try {
            applySavedContractEditLock();
        } catch (_eSavFull) {}
        try {
            syncContractMandatoryDocsInteractionLock();
        } catch (_eDocFull) {}
    }

    function restoreContractAdditionalDataModeFromStorage() {
        if (typeof isViewerMode !== 'undefined' && isViewerMode) return;
        try {
            const raw = localStorage.getItem('bhd_contract_additional_data_mode_v1');
            if (!raw) return;
            const o = JSON.parse(raw);
            const bSaved = toStr(o.buildingNo);
            const fSaved = toStr(o.flatNo);
            const bDom = toStr(document.getElementById('buildingNo')?.value);
            const fDom = toStr(document.getElementById('flatNo')?.value);
            const unitMatch =
                bSaved &&
                fSaved &&
                bDom &&
                fDom &&
                normalizeReservationBuildingKey(bSaved) === normalizeReservationBuildingKey(bDom) &&
                normalizeUnit(fSaved) === normalizeUnit(fDom);
            if (!unitMatch) {
                localStorage.removeItem('bhd_contract_additional_data_mode_v1');
                return;
            }
            const life = getContractLifecycleStateKey({ building: bDom, unit: fDom });
            if (life === 'active_pending') {
                enterContractAdditionalDataMode(collectStorableContractFullFromDom());
            } else if (life === 'active_docs_pending') {
                enterContractActivationDataMode(collectStorableContractFullFromDom());
            } else {
                exitContractAdditionalDataMode();
                exitContractActivationDataMode();
            }
        } catch (_eRes) {
            try {
                localStorage.removeItem('bhd_contract_additional_data_mode_v1');
            } catch (_eRm) {}
        }
    }

    function syncContractMandatoryDocsInteractionLock() {
        const deny =
            tenancyDraftCompletionLocked ||
            tenantIdentityLockedFromAddressBook ||
            (contractAdditionalDataMode && !contractFullEditMode);
        const host = document.getElementById('contractMandatoryDocsHost');
        if (!host) return;
        host.querySelectorAll('input[type="file"][data-contract-doc-key], [data-contract-doc-clear]').forEach((el) => {
            try {
                el.disabled = !!deny;
            } catch (e) {}
        });
    }

    /** تطبيق القفل لهيكل العقد + حقول المستأجر (مسودة الحجز أو استيراد الدفتر) / Apply draft + tenant field locks */
    function applyTenancyAndTenantFieldLocks() {
        if (contractAdditionalDataMode) {
            applyContractAdditionalDataFieldLocks();
            updateContractEditRequestBarUi();
            return;
        }
        if (contractActivationDataMode) {
            applyContractActivationFieldLocks();
            updateContractEditRequestBarUi();
            return;
        }
        const draftLocked = tenancyDraftCompletionLocked;
        const abLocked = tenantIdentityLockedFromAddressBook;
        const onContractsScreen = isContractsWorkspaceScreenActive();
        const bLoc = toStr(document.getElementById('buildingNo')?.value);
        const uLoc = toStr(document.getElementById('flatNo')?.value);
        const hasTenancyDraft =
            bLoc && uLoc && unitHasTenancyDraftForUnit(bLoc, uLoc);
        const postReservationTenantUi =
            onContractsScreen && (draftLocked || hasTenancyDraft) && !contractFullEditMode;
        const tenantLocked = draftLocked || abLocked || postReservationTenantUi;
        const lockTitleDraft = t('مقفل — بيانات من مسودة الحجز', 'Locked — from reservation draft');
        const lockTitleAb = t('مقفل — تم الاستيراد من دفتر العناوين', 'Locked — imported from address book');
        const lockTitleTenant = postReservationTenantUi
            ? t('مقفل — حدّث من دفتر العناوين', 'Locked — update via address book')
            : draftLocked
              ? lockTitleDraft
              : lockTitleAb;

        const draftStructureIds = [
            'agreementNo',
            'contractTypeSelect',
            'floorDetails',
            'unitType',
            'electricityMeter',
            'waterMeter',
            'usageType'
        ];
        draftStructureIds.forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.tagName === 'SELECT') el.disabled = draftLocked;
            else el.readOnly = draftLocked;
            if (draftLocked) {
                el.title = lockTitleDraft;
                el.classList.add('field-locked-tenancy-draft');
            } else {
                el.removeAttribute('title');
                el.classList.remove('field-locked-tenancy-draft');
            }
        });

        const tenantFieldIds = [
            'tenantNameAr',
            'tenantNameEn',
            'tenantId',
            'tenantMobile',
            'tenantPassport',
            'tenantEmail',
            'tenantEntityType',
            'tenantCommercialRegNo',
            'tenantCommercialRegExpiryDate',
            'tenantCompanyExtraMobile',
            'tenantNationality'
        ];
        tenantFieldIds.forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.tagName === 'SELECT') el.disabled = tenantLocked;
            else el.readOnly = tenantLocked;
            if (tenantLocked) {
                el.title = lockTitleTenant;
                el.classList.add('field-locked-tenancy-draft');
            } else {
                el.removeAttribute('title');
                el.classList.remove('field-locked-tenancy-draft');
            }
        });

        const abs = document.getElementById('tenantAddressBookSelect');
        if (abs) {
            abs.disabled = draftLocked;
            if (draftLocked) {
                abs.title = lockTitleDraft;
                abs.classList.add('field-locked-tenancy-draft');
            } else {
                abs.removeAttribute('title');
                abs.classList.remove('field-locked-tenancy-draft');
            }
        }

        const importLabel = document.getElementById('tenantAddressBookImportLabel');
        const importToolbar = document.getElementById('tenantAddressBookImportToolbar');
        const updateToolbar = document.getElementById('tenantAddressBookUpdateToolbar');
        if (importLabel) importLabel.style.display = postReservationTenantUi ? 'none' : '';
        if (importToolbar) importToolbar.style.display = postReservationTenantUi ? 'none' : 'flex';
        if (updateToolbar) updateToolbar.style.display = postReservationTenantUi ? 'flex' : 'none';

        const note = document.getElementById('tenancyDraftFieldsLockNote');
        if (note) {
            const ar = toStr(note.getAttribute('data-ar'));
            const en = toStr(note.getAttribute('data-en'));
            note.textContent = ar && en ? `${ar} / ${en}` : (ar || en);
            if (postReservationTenantUi) {
                note.style.display = 'block';
                note.removeAttribute('hidden');
            } else {
                note.style.display = 'none';
                note.setAttribute('hidden', 'hidden');
            }
        }
        const noteAb = document.getElementById('tenantAddressBookImportLockNote');
        if (noteAb) {
            const arAb = toStr(noteAb.getAttribute('data-ar'));
            const enAb = toStr(noteAb.getAttribute('data-en'));
            noteAb.textContent = arAb && enAb ? `${arAb} / ${enAb}` : (arAb || enAb);
            if (abLocked && !postReservationTenantUi) {
                noteAb.style.display = 'block';
                noteAb.removeAttribute('hidden');
            } else {
                noteAb.style.display = 'none';
                noteAb.setAttribute('hidden', 'hidden');
            }
        }

        updateContractWorkspaceContextUi();
        syncContractMandatoryDocsInteractionLock();
        try {
            const tenancyCompletionLockKey = 'bhd_tenancy_completion_locked_unit_v1';
            if (draftLocked) {
                const bLoc = toStr(document.getElementById('buildingNo')?.value);
                const fLoc = toStr(document.getElementById('flatNo')?.value);
                if (bLoc && fLoc) {
                    localStorage.setItem(tenancyCompletionLockKey, JSON.stringify({ buildingNo: bLoc, flatNo: fLoc }));
                }
            } else {
                localStorage.removeItem(tenancyCompletionLockKey);
            }
        } catch (eTenancyLockPersist) {}
        applySavedContractEditLock();
    }

    function setTenantIdentityLockedFromAddressBook(locked) {
        tenantIdentityLockedFromAddressBook = !!locked;
        applyTenancyAndTenantFieldLocks();
    }

    function setTenancyDraftCompletionFieldLocks(locked) {
        tenancyDraftCompletionLocked = !!locked;
        applyTenancyAndTenantFieldLocks();
    }

    /** بعد تحديث الصفحة: إعادة قفل حقول مسودة «استكمال بيانات التعاقد» إن وُجدت حالة محفوظة ومسودة العقد قائمة */
    function restoreTenancyCompletionLockFromStorage() {
        if (typeof isViewerMode !== 'undefined' && isViewerMode) return;
        try {
            const tenancyCompletionLockKey = 'bhd_tenancy_completion_locked_unit_v1';
            const raw = localStorage.getItem(tenancyCompletionLockKey);
            if (!raw) return;
            const o = JSON.parse(raw);
            const bSaved = toStr(o.buildingNo);
            const fSaved = toStr(o.flatNo);
            const bDom = toStr(document.getElementById('buildingNo')?.value);
            const fDom = toStr(document.getElementById('flatNo')?.value);
            const unitMatch =
                bSaved &&
                fSaved &&
                bDom &&
                fDom &&
                toStr(bSaved) === toStr(bDom) &&
                normalizeUnit(fSaved) === normalizeUnit(fDom);
            const draftAlive =
                unitMatch && isUnitInTenancyContractDraftMap({ building: bDom, unit: fDom });
            if (unitMatch && draftAlive) {
                setTenancyDraftCompletionFieldLocks(true);
            } else {
                localStorage.removeItem(tenancyCompletionLockKey);
                setTenancyDraftCompletionFieldLocks(false);
            }
        } catch (eRestoreTenancyLock) {
            try {
                localStorage.removeItem('bhd_tenancy_completion_locked_unit_v1');
            } catch (eRl) {}
            try {
                setTenancyDraftCompletionFieldLocks(false);
            } catch (eRu) {}
        }
    }

    function nextReservationNumber() {
        const key = 'bhd_reservation_seq';
        const next = (parseInt(localStorage.getItem(key) || '1000', 10) || 1000) + 1;
        localStorage.setItem(key, String(next));
        return `RES-${next}`;
    }

    function formatTcAgreementNumber(seq, refDateYmd) {
        const d = parseYmdToLocalDate(refDateYmd);
        const ref = d && !Number.isNaN(d.getTime()) ? d : new Date();
        const mm = String(ref.getMonth() + 1).padStart(2, '0');
        const yyyy = ref.getFullYear();
        const n = Math.max(1, parseInt(seq, 10) || 1);
        return `TC-${mm}-${yyyy}-${n}`;
    }

    function peekNextContractSeqNumber() {
        return (parseInt(localStorage.getItem('bhd_tenancy_contract_seq') || '5000', 10) || 5000) + 1;
    }

    /** شهر/سنة رقم TC = تاريخ إنشاء المعاملة (اليوم) وليس تاريخ بداية العقد / TC month-year = transaction date (today) */
    function getTcAgreementReferenceDateYmd() {
        return formatDateYmdLocal(new Date());
    }

    function nextContractAgreementDraftNumber(refDateYmd) {
        const key = 'bhd_tenancy_contract_seq';
        const next = peekNextContractSeqNumber();
        localStorage.setItem(key, String(next));
        const ref = toStr(refDateYmd).trim() || getTcAgreementReferenceDateYmd();
        return formatTcAgreementNumber(next, ref);
    }

    function proposeContractRenewalAgreementNumber() {
        return formatTcAgreementNumber(peekNextContractSeqNumber(), getTcAgreementReferenceDateYmd());
    }

    function setRenewalAgreementNoInput(agreementNo) {
        const el = document.getElementById('crnNewAgreementNo');
        if (!el) return;
        el.value = toStr(agreementNo);
        el.readOnly = true;
    }

    /** تخصيص رقم العقد المتسلسل للتجديد (مرة واحدة) / Allocate sequential renewal agreement number */
    function ensureRenewalAgreementNumberAllocated(renewal, unit) {
        const proposedAg = proposeContractRenewalAgreementNumber();
        const cur = toStr(renewal?.agreementNo);
        if (cur && cur !== proposedAg && /^TC-\d{2}-\d{4}-\d+$/i.test(cur)) {
            setRenewalAgreementNoInput(cur);
            return cur;
        }
        const draftAg = toStr(getContractRenewalDraftEntryForUnit(unit)?.renewal?.agreementNo);
        if (draftAg && draftAg !== proposedAg && /^TC-\d{2}-\d{4}-\d+$/i.test(draftAg)) {
            renewal.agreementNo = draftAg;
            setRenewalAgreementNoInput(draftAg);
            return draftAg;
        }
        const ag = nextContractAgreementDraftNumber();
        renewal.agreementNo = ag;
        setRenewalAgreementNoInput(ag);
        return ag;
    }

    function hydrateContractPaymentAndVatSchedulesFromPayload(data, opt = {}) {
        if (!data || typeof data !== 'object') return;
        const rebuildIfMissing = opt.rebuildIfMissing !== false;
        const refreshVatWithRent = opt.refreshVatWithRent === true;
        try {
            if (data.paymentScheduleJson) {
                const arr = JSON.parse(toStr(data.paymentScheduleJson) || '[]');
                renderPaymentScheduleFromRows(Array.isArray(arr) ? arr : []);
            } else if (Array.isArray(data.paymentSchedule) && data.paymentSchedule.length) {
                renderPaymentScheduleFromRows(data.paymentSchedule);
            } else if (rebuildIfMissing) {
                onPaymentMethodOrDriversChanged();
            }
        } catch (_ePayHydr) {
            if (rebuildIfMissing) {
                try {
                    onPaymentMethodOrDriversChanged();
                } catch (_ePayHydr2) {}
            }
        }
        try {
            syncContractVatUi({ skipPayRebuild: true, skipVatRebuild: true });
            if (refreshVatWithRent) {
                refreshPaymentSchedulesForVatWithRent();
            }
            if (toStr(data.contractSubjectToVat) === 'yes' && toStr(data.vatPaymentMode) === 'separate') {
                let vatRows = [];
                if (data.vatChequeScheduleJson) {
                    vatRows = JSON.parse(toStr(data.vatChequeScheduleJson) || '[]');
                } else if (Array.isArray(data.vatChequeSchedule)) {
                    vatRows = data.vatChequeSchedule;
                }
                if (Array.isArray(vatRows) && vatRows.length) {
                    renderVatChequeScheduleFromRows(vatRows);
                } else if (rebuildIfMissing) {
                    rebuildVatChequeScheduleFromDefaults({ preserveExisting: false });
                }
            }
        } catch (_eVatHydr) {}
    }

    function applyObjectToContractFormFields(d, opt = {}) {
        if (!d || typeof d !== 'object') return;
        const hydratingFromSaved = opt.hydratingFromSaved === true;
        const skip = new Set(['extraAdjustments', 'extraAdjustmentsJson', 'insuranceDepositItems', 'insuranceDepositItemsJson', 'customRentItems', 'customRentItemsJson', 'paymentSchedule', 'paymentScheduleJson', 'vatChequeSchedule', 'vatChequeScheduleJson', 'type']);
        const keySet = new Set();
        try {
            Object.keys(getFormData()).forEach((k) => keySet.add(k));
        } catch (e) {}
        Object.keys(d).forEach((k) => keySet.add(k));
        keySet.forEach((key) => {
            if (skip.has(key)) return;
            if (!Object.prototype.hasOwnProperty.call(d, key)) return;
            const mappedId = key === 'contractType' ? 'contractTypeSelect' : key === 'type' ? 'typeSelect' : key;
            const el = document.getElementById(mappedId);
            if (el && d[key] !== undefined && d[key] !== null) el.value = d[key];
        });
        if (d.extraAdjustmentsJson) {
            try {
                renderExtraAdjustmentsRows(JSON.parse(toStr(d.extraAdjustmentsJson) || '[]'));
            } catch (e) {
                renderExtraAdjustmentsRows([]);
            }
        } else if (Array.isArray(d.extraAdjustments) && d.extraAdjustments.length) {
            try {
                renderExtraAdjustmentsRows(d.extraAdjustments);
            } catch (e) {
                renderExtraAdjustmentsRows([]);
            }
        }
        if (d.insuranceDepositItemsJson) {
            try {
                renderInsuranceDepositItemsRows(JSON.parse(toStr(d.insuranceDepositItemsJson) || '[]'));
            } catch (e) {
                renderInsuranceDepositItemsRows([]);
            }
        } else if (Array.isArray(d.insuranceDepositItems) && d.insuranceDepositItems.length) {
            try {
                renderInsuranceDepositItemsRows(d.insuranceDepositItems);
            } catch (e) {
                renderInsuranceDepositItemsRows([]);
            }
        }
        if (d.customRentItemsJson) {
            try {
                renderCustomRentItemsRows(JSON.parse(toStr(d.customRentItemsJson) || '[]'));
            } catch (e) {
                renderCustomRentItemsRows([]);
            }
        } else if (Array.isArray(d.customRentItems) && d.customRentItems.length) {
            try {
                renderCustomRentItemsRows(d.customRentItems);
            } catch (e) {
                renderCustomRentItemsRows([]);
            }
        }
        if (!opt.skipPaymentSchedules) {
            if (hydratingFromSaved) {
                try {
                    hydrateContractPaymentAndVatSchedulesFromPayload(d, { rebuildIfMissing: false });
                } catch (_eSchedHydr) {}
            } else if (d.paymentScheduleJson) {
                try {
                    const arr = JSON.parse(toStr(d.paymentScheduleJson) || '[]');
                    renderPaymentScheduleFromRows(Array.isArray(arr) ? arr : []);
                } catch (e) {
                    renderPaymentScheduleFromRows([]);
                }
            } else if (Array.isArray(d.paymentSchedule) && d.paymentSchedule.length) {
                renderPaymentScheduleFromRows(d.paymentSchedule);
            }
        }
        try {
            const dar = document.getElementById('depositAttachmentRow');
            if (
                dar &&
                d &&
                (Object.prototype.hasOwnProperty.call(d, 'depositAttachmentName') ||
                    Object.prototype.hasOwnProperty.call(d, 'depositAttachmentDataUrl') ||
                    Object.prototype.hasOwnProperty.call(d, 'depositAttachmentRelativePath'))
            ) {
                dar.dataset.attachmentName = toStr(d.depositAttachmentName);
                dar.dataset.attachmentDataUrl = d.depositStoredOnDisk ? '' : toStr(d.depositAttachmentDataUrl);
                dar.dataset.attachmentRelativePath = toStr(d.depositAttachmentRelativePath);
                dar.dataset.attachmentFileId = toStr(d.depositAttachmentFileId);
                dar.dataset.storedOnDisk = d.depositStoredOnDisk ? '1' : '0';
                const dsp = dar.querySelector('[data-deposit-att-name]');
                if (dsp) dsp.textContent = toStr(d.depositAttachmentName) || '—';
            }
            const dinp = document.getElementById('depositAttachmentInput');
            if (dinp) dinp.value = '';
        } catch (eDepositHydrate) {}
        ensureTypeSelectAlwaysNew();
        /** تعبئة المستندات الإلزامية من دفتر العناوين وإعادة رسم الواجهة — وإلا تبقى واجهة قديمة مع JSON فارغ بعد تحميل مسودة / Pull mandatory docs from address book & re-render UI after payload hydrate — stale ✓ markers with empty textarea otherwise */
        try {
            mergeMandatoryDocsFromAddressBookAfterLoadIfMatch();
        } catch (_eAbHydr) {}
        try {
            hydrateContractDocumentsFromStoredJson();
        } catch (_eDocsHy) {}
        try {
            const pdbTx = document.getElementById('propertyDocumentsBundleJson');
            if (pdbTx) {
                pdbTx.value = toStr(d.propertyDocumentsBundleJson) || '[]';
            }
            refreshPropertyDocumentsBundleSectionVisibility();
        } catch (_ePdbHy) {}
        try {
            if (hydratingFromSaved) syncContractPrintAttachmentsFromPayload(d);
            syncContractPrintAttachmentsToStore();
        } catch (_ePrintAttHy) {}
        try {
            refreshLedgerAttachmentPreviewButtons().catch(() => {});
            refreshContractDocumentAttachmentsSection().catch(() => {});
        } catch (_eAttUiHy) {}
        try {
            refreshContractFinancialCalculations({
                skipPayRebuild: hydratingFromSaved,
                skipVatRebuild: hydratingFromSaved
            });
        } catch (_eGraceHy) {}
        if (hydratingFromSaved) {
            try { syncContractPeriodDisplay(); } catch (_ePerHy) {}
        } else {
            try { refreshPaymentSchedulesForVatWithRent(); } catch (_eVatHy) {}
            try { scheduleContractWorkspaceDataRefresh(); } catch (_eHySch) {}
            try { persistContractWorkspaceDraftSilent(); } catch (_eHySav) {}
        }
        try {
            if (d.linkedContractUnitsJson !== undefined) {
                const el = document.getElementById('linkedContractUnitsJson');
                if (el) el.value = toStr(d.linkedContractUnitsJson);
            } else if (Array.isArray(d.linkedContractUnits)) {
                const el = document.getElementById('linkedContractUnitsJson');
                if (el) el.value = JSON.stringify(d.linkedContractUnits);
            }
            const enrichedLinked = enrichPayloadWithResolvedLinkedContractUnits(d);
            if (enrichedLinked !== d) {
                const el = document.getElementById('linkedContractUnitsJson');
                if (el) el.value = toStr(enrichedLinked.linkedContractUnitsJson);
            }
            refreshLinkedContractUnitsPanel(enrichedLinked);
        } catch (_eLinkedHy) {}
        try {
            applyContractDepositAttachmentFieldLock();
        } catch (_eDepHyLock) {}
    }

    /** تعيين حقول نموذج الحجز المنفصل / Map logical keys to reservation workspace DOM ids */
    const RESERVATION_FORM_DOM = {
        agreementNo: 'resAgreementNo',
        contractType: 'resContractType',
        type: null,
        tenantNameAr: 'resTenantNameAr',
        tenantNameEn: 'resTenantNameEn',
        tenantEntityType: 'resTenantEntityType',
        tenantCommercialRegNo: 'resTenantCommercialRegNo',
        tenantCommercialRegExpiryDate: 'resTenantCommercialRegExpiryDate',
        tenantCompanyExtraMobile: 'resTenantCompanyExtraMobile',
        tenantCompanySignatoriesJson: 'resTenantCompanySignatoriesJson',
        tenantId: 'resTenantId',
        tenantMobile: 'resTenantMobile',
        tenantPassport: 'resTenantPassport',
        tenantEmail: 'resTenantEmail',
        buildingNo: 'resBuildingNo',
        flatNo: 'resFlatNo',
        floorDetails: 'resFloorDetails',
        unitType: 'resUnitType',
        usageType: 'resUsageType',
        electricityMeter: 'resElectricityMeter',
        waterMeter: 'resWaterMeter',
        monthlyRent: 'resMonthlyRent',
        depositAmount: 'resDepositAmount',
        depositReceiptRef: 'resDepositReceiptRef',
        unitHandoverDate: 'resUnitHandoverDate',
        graceDays: 'resGraceDays',
        startDate: 'resStartDate',
        graceAmount: 'resGraceAmount',
        tenantNationality: 'resTenantNationality'
    };

    function resFormEl(key) {
        const domId = RESERVATION_FORM_DOM[key];
        return domId ? document.getElementById(domId) : null;
    }

    function resFormSet(key, val) {
        const el = resFormEl(key);
        if (el) el.value = val == null ? '' : val;
    }

    function resFormVal(key) {
        return toStr(resFormEl(key)?.value);
    }

    function ensureReservationTenantNationalitySelect(preserveValue) {
        const sel = document.getElementById('resTenantNationality');
        if (!sel) return;
        const cur = preserveValue ? toStr(sel.value) : toStr(sel.value || 'عماني / Omani');
        const opts = buildCountryOptions().map((c) => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
        sel.innerHTML = opts;
        if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
        else sel.value = 'عماني / Omani';
    }

    function getReservationFormData() {
        return {
            agreementNo: resFormVal('agreementNo'),
            contractType: resFormVal('contractType'),
            type: 'جديد New',
            municipalFormNo: '',
            municipalContractNo: '',
            tenantNameAr: resFormVal('tenantNameAr'),
            tenantNameEn: resFormVal('tenantNameEn'),
            tenantEntityType: resFormVal('tenantEntityType') || 'person',
            tenantCommercialRegNo: resFormVal('tenantCommercialRegNo'),
            tenantCommercialRegExpiryDate: resFormVal('tenantCommercialRegExpiryDate'),
            tenantCompanyExtraMobile: resFormVal('tenantCompanyExtraMobile'),
            tenantCompanySignatoriesJson: toStr(document.getElementById('resTenantCompanySignatoriesJson')?.value),
            tenantId: resFormVal('tenantId'),
            tenantMobile: resFormVal('tenantMobile'),
            tenantPassport: resFormVal('tenantPassport'),
            tenantEmail: resFormVal('tenantEmail'),
            buildingNo: resFormVal('buildingNo'),
            flatNo: resFormVal('flatNo'),
            floorDetails: resFormVal('floorDetails'),
            unitType: resFormVal('unitType'),
            usageType: resFormVal('usageType'),
            electricityMeter: resFormVal('electricityMeter'),
            waterMeter: resFormVal('waterMeter'),
            monthlyRent: resFormVal('monthlyRent'),
            rentCalcMode: 'full',
            rentAreaSqm: '',
            rentPerSqm: '',
            contractMonths: '12',
            startDate: resFormVal('startDate'),
            endDate: '',
            unitHandoverDate: resFormVal('unitHandoverDate'),
            agreedRentPaymentDay: '5',
            paymentMethod: 'شيك CHQ',
            depositReceiptRef: resFormVal('depositReceiptRef'),
            depositAttachmentName: '',
            depositAttachmentDataUrl: '',
            depositAttachmentRelativePath: '',
            depositAttachmentFileId: '',
            depositStoredOnDisk: false,
            depositAmount: resFormVal('depositAmount'),
            graceDays: resFormVal('graceDays') || '0',
            graceAmount: resFormVal('graceAmount') || '0.000',
            otherDiscountAmount: '0',
            extraAdjustments: [],
            extraAdjustmentsJson: '[]',
            insuranceDepositItems: [],
            insuranceDepositItemsJson: '[]',
            customRentItems: [],
            customRentItemsJson: '[]',
            paymentSchedule: [],
            paymentScheduleJson: '[]',
            tenantNationality: resFormVal('tenantNationality'),
            contractMandatoryDocsJson: '{}',
            contractOtherDocsJson: '[]'
        };
    }

    function applyObjectToReservationFormFields(d) {
        if (!d || typeof d !== 'object') return;
        Object.keys(RESERVATION_FORM_DOM).forEach((key) => {
            if (!Object.prototype.hasOwnProperty.call(d, key)) return;
            const mappedKey = key === 'contractType' ? 'contractType' : key;
            if (d[mappedKey] !== undefined && d[mappedKey] !== null) resFormSet(key, d[mappedKey]);
        });
        if (d.contractType !== undefined) resFormSet('contractType', d.contractType);
        try { syncReservationTenantEntityFieldsFromType(); } catch (_e) {}
        try { updateReservationCompanySignatoriesPreviewFromJson(); } catch (_e2) {}
        try { refreshReservationFinancialCalculations(); } catch (_eGraceRes) {}
        try {
            if (d.linkedUnitsJson) {
                const parsed = JSON.parse(toStr(d.linkedUnitsJson) || '[]');
                if (Array.isArray(parsed) && parsed.length) {
                    setActiveReservationLinkedUnits(parsed, toStr(d.buildingNo));
                }
            }
        } catch (_eLinkedRes) {}
        try {
            applyReservationDepositAttachmentFieldLock();
        } catch (_eResDepHy) {}
        updateReservationSummaryPanel();
    }

    function resetReservationWorkspaceForm() {
        contractEntryContext = { mode: 'reservation', unit: null, linkedUnits: [] };
        window._vacantUnitPickState = { building: '', keys: [] };
        resFormSet('agreementNo', nextReservationNumber());
        ['buildingNo', 'flatNo', 'floorDetails', 'electricityMeter', 'waterMeter', 'tenantNameAr', 'tenantNameEn', 'tenantId', 'tenantMobile', 'tenantPassport', 'tenantEmail', 'depositReceiptRef', 'unitHandoverDate', 'startDate'].forEach((k) => resFormSet(k, ''));
        resFormSet('tenantEntityType', 'person');
        resFormSet('tenantCommercialRegNo', '');
        resFormSet('tenantCommercialRegExpiryDate', '');
        resFormSet('tenantCompanyExtraMobile', '');
        resFormSet('tenantCompanySignatoriesJson', '[]');
        resFormSet('unitType', 'Flat');
        resFormSet('usageType', 'سكني Residential');
        resFormSet('contractType', 'سكني Residential');
        resFormSet('monthlyRent', '');
        resFormSet('depositAmount', '325');
        resFormSet('graceDays', '0');
        resFormSet('graceAmount', '0.000');
        const dep = document.getElementById('resDepositAmount');
        if (dep) delete dep.dataset.manualDeposit;
        try { syncReservationTenantEntityFieldsFromType(); } catch (_e) {}
        updateReservationFormCalculations();
        refreshReservationLinkedUnitsPanel();
        updateReservationSummaryPanel();
    }

    function updateReservationCompanySignatoriesPreviewFromJson() {
        const host = document.getElementById('resTenantCompanySignatoriesPreview');
        const raw = document.getElementById('resTenantCompanySignatoriesJson');
        if (!host || !raw) return;
        let sigs = [];
        try { sigs = JSON.parse(toStr(raw.value) || '[]'); } catch (e) { sigs = []; }
        if (!Array.isArray(sigs) || !sigs.length) {
            host.textContent = t('— لا مفوضين —', '— No signatories —');
            return;
        }
        host.innerHTML = sigs.map((s) => `<div>${escHtml(toStr(s.name || s.fullName || s))}</div>`).join('');
    }

    function syncReservationTenantEntityFieldsFromType() {
        const sel = document.getElementById('resTenantEntityType');
        const entity = sel && sel.value === 'company' ? 'company' : 'person';
        const lblAr = document.getElementById('resLblTenantNameAr');
        const lblEn = document.getElementById('resLblTenantNameEn');
        const lblId = document.getElementById('resLblTenantId');
        if (lblAr) {
            lblAr.textContent = entity === 'company'
                ? t('اسم الشركة (عربي) / Company name (Arabic)', 'اسم الشركة (عربي) / Company name (Arabic)')
                : t('اسم المستأجر (عربي) / Tenant name (Arabic)', 'اسم المستأجر (عربي) / Tenant name (Arabic)');
        }
        if (lblEn) {
            lblEn.textContent = entity === 'company'
                ? t('اسم الشركة بالإنجليزية / Company name (English)', 'اسم الشركة بالإنجليزية / Company name (English)')
                : t('اسم المستأجر بالإنجليزية / Tenant name (English)', 'اسم المستأجر بالإنجليزية / Tenant name (English)');
        }
        if (lblId) {
            lblId.textContent = entity === 'company'
                ? '(غير مستخدم للشركة) / (Not used when Company)'
                : t('الرقم المدني / Civil ID no.', 'الرقم المدني / Civil ID no.');
        }
        const pb = document.getElementById('resTenantPersonFieldsBlock');
        if (pb) pb.style.display = entity === 'person' ? 'contents' : 'none';
        const cb = document.getElementById('resTenantCompanyFieldsBlock');
        if (cb) cb.style.display = entity === 'company' ? 'grid' : 'none';
        const ntw = document.getElementById('resTenantNationalityWrap');
        if (ntw) ntw.style.display = entity === 'person' ? '' : 'none';
        if (entity === 'company') updateReservationCompanySignatoriesPreviewFromJson();
        try { ensureReservationTenantNationalitySelect(true); } catch (e) {}
        try { localizeBilingualUi(); } catch (e2) {}
        updateReservationFormCalculations();
    }

    function updateReservationFormCalculations() {
        const monthlyEl = document.getElementById('resMonthlyRent');
        const graceDaysEl = document.getElementById('resGraceDays');
        const graceAmountEl = document.getElementById('resGraceAmount');
        const depositEl = document.getElementById('resDepositAmount');
        if (!monthlyEl) return;
        const linked = getActiveReservationLinkedUnits();
        const monthlyBase =
            linked.length > 1 ? sumReservationUnitsMonthlyRent(linked) : parseFloat(toStr(monthlyEl.value)) || 0;
        if (depositEl && depositEl.dataset.manualDeposit !== '1') {
            depositEl.value = formatGraceAmountOm(monthlyBase);
        }
        applyGraceAmountToField(
            graceAmountEl,
            monthlyBase,
            Math.max(0, parseInt(toStr(graceDaysEl?.value), 10) || 0)
        );
        updateReservationSummaryPanel();
    }

    function onReservationMonthlyRentInput() {
        const units = getActiveReservationLinkedUnits();
        const val = resFormVal('monthlyRent');
        if (units.length === 1) {
            const next = [{ ...units[0], monthlyRent: val }];
            if (!contractEntryContext || contractEntryContext.mode !== 'reservation') {
                contractEntryContext = { mode: 'reservation', unit: null, linkedUnits: next };
            } else {
                contractEntryContext.linkedUnits = next;
            }
            const inp = document.querySelector('.res-linked-unit-rent[data-idx="0"]');
            if (inp && document.activeElement !== inp) inp.value = val;
        }
        updateReservationFormCalculations();
    }

    function updateReservationSummaryPanel() {
        const panel = document.getElementById('resSmartSummary');
        if (!panel) return;
        const d = getReservationFormData();
        const building = toStr(d.buildingNo) || '—';
        const linked = getActiveReservationLinkedUnits();
        const unitLabel =
            linked.length > 1
                ? linked.map((x) => x.unit).join(', ') + ` (${linked.length} ${t('وحدات', 'units')})`
                : toStr(d.flatNo) || '—';
        const tenant = toStr(d.tenantNameAr) || toStr(d.tenantNameEn) || '—';
        const monthly = (
            linked.length > 1 ? sumReservationUnitsMonthlyRent(linked) : parseFloat(d.monthlyRent) || 0
        ).toFixed(3);
        const deposit = (parseFloat(d.depositAmount) || 0).toFixed(3);
        const rentBreakdown =
            linked.length > 1
                ? `<div style="margin-top:4px;font-size:11px;color:#555">${linked
                      .map((u) => `${escHtml(u.unit)}: ${(parseFloat(u.monthlyRent) || 0).toFixed(3)} OMR`)
                      .join(' · ')}</div>`
                : '';
        panel.innerHTML = `
            <div style="font-weight:700;color:var(--primary-dark);margin-bottom:6px;border-bottom:1px solid #dfe7ee;padding-bottom:4px">${t('ملخص الحجز / Reservation summary', 'ملخص الحجز / Reservation summary')}</div>
            <div><b>${t('رقم الحجز:', 'Reservation no.:')}</b> ${escHtml(toStr(d.agreementNo) || '—')}</div>
            <div><b>${t('المبنى / الوحدة:', 'Building / Unit:')}</b> ${escHtml(building)} / ${escHtml(unitLabel)}</div>
            <div><b>${t('المستأجر:', 'Tenant:')}</b> ${escHtml(tenant)}</div>
            <div><b>${t('الإيجار الشهري:', 'Monthly rent:')}</b> ${monthly} OMR${rentBreakdown}</div>
            <div><b>${t('فترة السماح:', 'Grace period:')}</b> ${escHtml(toStr(d.graceDays) || '0')} ${t('يوم', 'day(s)')}</div>
            <div><b>${t('مبلغ السماح:', 'Grace amount:')}</b> ${(parseFloat(d.graceAmount) || 0).toFixed(3)} OMR</div>
            <div><b>${t('التأمين (مرجعي):', 'Deposit (ref.):')}</b> ${deposit} OMR</div>
        `;
    }

    function updateReservationsWorkspaceUi() {
        const ag = document.getElementById('resAgreementNo');
        if (ag && !toStr(ag.value).trim()) ag.value = nextReservationNumber();
        try { ensureReservationTenantNationalitySelect(true); } catch (_e) {}
        try { renderAddressBookTenantSelect(); } catch (_e2) {}
        try { refreshReservationFinancialCalculations(); } catch (_eGraceUi) {}
    }

    function applyAddressBookTenantToReservationForm(entry) {
        if (!entry || (toStr(entry.type) !== 'tenant' && toStr(entry.type) !== 'company')) return;
        const isCo = toStr(entry.type) === 'company';
        resFormSet('tenantEntityType', isCo ? 'company' : 'person');
        resFormSet('tenantNameAr', toStr(entry.name));
        resFormSet('tenantNameEn', toStr(entry.nameEn || entry.name));
        resFormSet('tenantMobile', toStr(entry.mobile));
        resFormSet('tenantEmail', toStr(entry.email));
        if (isCo) {
            resFormSet('tenantId', '');
            resFormSet('tenantPassport', '');
            resFormSet('tenantCommercialRegNo', toStr(entry.commercialRegNo));
            resFormSet('tenantCommercialRegExpiryDate', toStr(entry.commercialRegExpiryDate));
            resFormSet('tenantCompanyExtraMobile', toStr(entry.extraMobile));
            resFormSet('tenantCompanySignatoriesJson', JSON.stringify(Array.isArray(entry.signatories) ? entry.signatories : []));
            resFormSet('tenantNationality', 'عماني / Omani');
        } else {
            resFormSet('tenantId', toStr(entry.idNo));
            resFormSet('tenantPassport', toStr(entry.passport));
            resFormSet('tenantCommercialRegNo', '');
            resFormSet('tenantCommercialRegExpiryDate', '');
            resFormSet('tenantCompanyExtraMobile', '');
            resFormSet('tenantCompanySignatoriesJson', '[]');
            try { ensureReservationTenantNationalitySelect(false); } catch (e) {}
            resFormSet('tenantNationality', toStr(entry.nationality) || 'عماني / Omani');
        }
        try { syncReservationTenantEntityFieldsFromType(); } catch (e2) {}
        updateReservationSummaryPanel();
    }

    function applySelectedAddressBookTenantToReservationForm() {
        const sel = document.getElementById('resTenantAddressBookSelect');
        if (!sel || sel.value === '') {
            alert(t('اختر جهة أولاً من دفتر العناوين (شخص أو شركة).', 'Select a party from the address book first (person or company).'));
            return;
        }
        const idx = parseInt(sel.value, 10);
        if (Number.isNaN(idx)) return;
        const entry = addressBookEntries[idx];
        if (!entry) return;
        const issues = getAddressBookIssues(entry, { forReservation: true });
        if (issues.length) {
            alert(
                t(
                    '⚠️ بيانات هذه الجهة في دفتر العناوين غير مكتملة — أكملها قبل الحجز:\n\n• ',
                    '⚠️ This party\'s address book data is incomplete — complete it before reserving:\n\n• '
                ) + issues.join('\n• ')
            );
            openAddressBookEntryModal('edit', idx);
            return;
        }
        applyAddressBookTenantToReservationForm(entry);
    }

    function saveReservationData() {
        if (!assertPermissionOrAlert('manage_contracts', 'لا تملك صلاحية حفظ الحجوزات.', 'No permission to save reservations.')) return;
        if (!isReservationsWorkspaceScreenActive()) {
            alert(t('افتح صفحة الحجوزات أولاً.', 'Open the Reservations page first.'));
            return;
        }
        loadDashboardAux();
        try { refreshReservationFinancialCalculations(); } catch (_eGraceSav) {}
        const vdGrace = getReservationFormData();
        if (!validateReservationTenantAddressBookCompleteOrAlert(vdGrace)) {
            syncBhdKvToServer();
            return;
        }
        if (!validateGraceHandoverConsistencyOrAlert(vdGrace)) {
            syncBhdKvToServer();
            return;
        }
        const draftOk = upsertReservationFromCurrentForm({ asDraft: true, allowIncomplete: true });
        if (!draftOk) {
            alert(
                t(
                    'تعذّر حفظ الحجز: لا يوجد مبنى ووحدة مرتبطان. افتح الحجز من «وحدات شاغرة» (حجز)، أو أكمل المبنى والوحدة في النموذج.',
                    'Could not save reservation: no building/unit. Start from Vacant units (Reserve), or enter building and unit in the form.'
                )
            );
            syncBhdKvToServer();
            return;
        }
        sanitizeAllUnitReservationRowsForStorage();
        try {
            repairReservationMultiUnitRows();
        } catch (_eRepResSav) {}
        const lsBundleRes = tryPersistStandardBhdLocalStoresBundle();
        if (!lsBundleRes.ok) {
            console.error(lsBundleRes.error);
            alert(
                t(
                    'تعذّر حفظ الحجز: مساحة التخزين المحلي ممتلئة. استخدم «تصفية البيانات» أو صَغِّر المرفقات ثم أعد المحاولة.',
                    'Could not save reservation: local storage quota is full. Use Data cleanup or reduce attachments, then retry.'
                )
            );
            syncBhdKvToServer();
            return;
        }
        syncBhdKvToServer();
        recordSystemActivity({
            actionKey: 'save_reservation',
            actionAr: 'حفظ حجز / Save reservation',
            actionEn: 'Save reservation / حفظ حجز',
            building: toStr(vdGrace.buildingNo),
            unit: toStr(vdGrace.flatNo),
            ref: toStr(vdGrace.agreementNo),
            note: t('حفظ مسودة حجز', 'Save reservation draft')
        });
        alert(
            t(
                '💾 تم حفظ الحجز كمسودة ضمن «وحدات محجوزة». عند الجاهزية استخدم «تحويل عقد الإيجار» ثم أكمل من شاشة العقود.',
                '💾 Reservation saved under Reserved units. When ready, use Convert tenancy contract, then complete in Contracts workspace.'
            )
        );
        try { clearBhdContractFullIfMatchesUnit(vdGrace.buildingNo, vdGrace.flatNo); } catch (eClr2) {}
        openDashboardInsight('reserved');
    }

    function updateContractWorkspaceContextUi() {
        const lockCtx = tenancyDraftCompletionLocked || contractAdditionalDataMode;
        const agreementNoEl = document.getElementById('agreementNo');
        if (agreementNoEl) {
            if (typeof isViewerMode === 'undefined' || !isViewerMode) {
                agreementNoEl.readOnly = true;
                if (lockCtx) {
                    agreementNoEl.title = t('مقفل — بيانات من مسودة الحجز', 'Locked — from reservation draft');
                    agreementNoEl.classList.add('field-locked-tenancy-draft');
                } else {
                    agreementNoEl.classList.remove('field-locked-tenancy-draft');
                    agreementNoEl.title = t('رقم العقد من النظام — غير قابل للتحرير', 'Contract no. from system — not editable');
                }
                if (!lockCtx && !toStr(agreementNoEl.value).trim()) {
                    agreementNoEl.value = nextContractAgreementDraftNumber();
                }
            } else {
                agreementNoEl.readOnly = true;
            }
        }
        const typeSel = document.getElementById('typeSelect');
        if (typeSel) {
            typeSel.value = 'جديد New';
            typeSel.disabled = true;
        }
        const buildingSelect = document.getElementById('buildingSelect');
        const buildingNo = document.getElementById('buildingNo');
        const flatNo = document.getElementById('flatNo');
        if (buildingSelect) buildingSelect.disabled = lockCtx;
        if (buildingNo) buildingNo.readOnly = lockCtx;
        if (flatNo) flatNo.readOnly = lockCtx;
        try {
            const crBody = document.getElementById('customRentSectionBody');
            const psBody = document.getElementById('paymentScheduleSectionBody');
            if (crBody) crBody.style.display = 'block';
            if (psBody) psBody.style.display = 'block';
        } catch (_eLedgerExpand) {}
        try { refreshContractFinancialCalculations(); } catch (_eCwsUiFin) {}
        try { applyContractsWorkspaceLockState(); } catch (_eCwsUi) {}
    }

    function enterReservationModeForUnit(unit) {
        const snap = unitSnapshotFromUnitRow(unit);
        const existingCtx = contractEntryContext;
        const linkedUnits =
            existingCtx?.mode === 'reservation' && Array.isArray(existingCtx.linkedUnits) && existingCtx.linkedUnits.length
                ? existingCtx.linkedUnits
                : snap
                  ? [snap]
                  : [];
        contractEntryContext = {
            mode: 'reservation',
            unit: { ...unit },
            linkedUnits,
            reservationGroupId: existingCtx?.reservationGroupId || null
        };
        try { setReservationFormFlowActive(true); } catch (_eEnt) {}
        resFormSet('agreementNo', nextReservationNumber());
        resFormSet('buildingNo', toStr(unit?.building));
        resFormSet('flatNo', toStr(unit?.unit));
        resFormSet('floorDetails', toStr(unit?.floor));
        resFormSet('unitType', toStr(unit?.unitType || 'Flat'));
        resFormSet('electricityMeter', toStr(unit?.electricity));
        resFormSet('waterMeter', toStr(unit?.water));
        const isCommercial = toStr(unit?.unitType).toLowerCase() === 'office' || toStr(unit?.unitType).toLowerCase() === 'shop';
        resFormSet('usageType', isCommercial ? 'تجاري Commercial' : 'سكني Residential');
        resFormSet('contractType', isCommercial ? 'تجاري Commercial' : 'سكني Residential');
        resFormSet('tenantNameAr', '');
        resFormSet('tenantNameEn', '');
        resFormSet('tenantId', '');
        resFormSet('tenantMobile', '');
        resFormSet('tenantPassport', '');
        resFormSet('tenantEmail', '');
        resFormSet('tenantEntityType', 'person');
        resFormSet('tenantCommercialRegNo', '');
        resFormSet('tenantCommercialRegExpiryDate', '');
        resFormSet('tenantCompanyExtraMobile', '');
        resFormSet('tenantCompanySignatoriesJson', '[]');
        try { syncReservationTenantEntityFieldsFromType(); } catch (e) {}
        resFormSet('monthlyRent', resolveUnitMonthlyRentForReservation(unit));
        const depositEl = document.getElementById('resDepositAmount');
        if (depositEl) delete depositEl.dataset.manualDeposit;
        updateReservationsWorkspaceUi();
        refreshReservationLinkedUnitsPanel();
        updateReservationSummaryPanel();
    }

    function getExpiringUnitsByBuilding(maxDays = 30, building = "all") {
        return getExpiringUnits(maxDays).filter((u) => building === "all" || u.building === building);
    }

    function getFiltersState() {
        return {
            search: document.getElementById('unitsSearchInput')?.value?.trim().toLowerCase() || "",
            building: document.getElementById('unitsBuildingFilter')?.value || "all",
            status: document.getElementById('unitsStatusFilter')?.value || "all",
            expire: document.getElementById('unitsExpireFilter')?.value || "all",
            utilities: document.getElementById('unitsUtilitiesFilter')?.value || "all"
        };
    }

    function resetOperationsFilters() {
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };
        setValue('unitsSearchInput', '');
        setValue('unitsBuildingFilter', 'all');
        setValue('unitsStatusFilter', 'all');
        setValue('unitsExpireFilter', 'all');
        setValue('unitsUtilitiesFilter', 'all');
        _operationsPageIndex = 0;
        renderOperationsTable();
    }

    function setOperationsSort(key) {
        if (operationsSortState.key === key) {
            operationsSortState.dir = operationsSortState.dir === 'asc' ? 'desc' : 'asc';
        } else {
            operationsSortState.key = key;
            operationsSortState.dir = key === 'days' ? 'asc' : 'asc';
        }
        _operationsPageIndex = 0;
        renderOperationsTable();
    }

    function updateSortIndicators() {
        const keys = ['building', 'owner', 'unit', 'tenant', 'status', 'contractState', 'endDate', 'days', 'electricity', 'water'];
        keys.forEach((k) => {
            const el = document.getElementById(`sort-${k}`);
            if (!el) return;
            if (operationsSortState.key === k) {
                el.textContent = operationsSortState.dir === 'asc' ? '↑' : '↓';
                el.style.color = '#123';
            } else {
                el.textContent = '↕';
                el.style.color = '#678';
            }
        });
    }

    function getStatusToken(u, days) {
        if (!u.endDate) {
            const st = toStr(u.status).toLowerCase();
            if (st === 'vacant') return 'Vacant';
            if (st === 'rented') return 'Rented';
            return 'NoEndDate';
        }
        if (days !== null && days < 0) return 'Overdue';
        if (days !== null && days >= 0 && days <= 90) return 'Expiring';
        return u.status || 'Rented';
    }

    function compareSmart(a, b) {
        const ax = (a ?? '').toString().toLowerCase();
        const bx = (b ?? '').toString().toLowerCase();
        const na = parseFloat(ax);
        const nb = parseFloat(bx);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return ax.localeCompare(bx, 'ar');
    }

    function getRegistryFormData() {
        return {
            building: toStr(document.getElementById('regBuilding')?.value),
            unit: toStr(document.getElementById('regUnit')?.value),
            tenant: toStr(document.getElementById('regTenant')?.value),
            docType: toStr(document.getElementById('regDocType')?.value) || 'Other',
            fileName: toStr(document.getElementById('regFileName')?.value),
            filePath: toStr(document.getElementById('regFilePath')?.value),
            source: toStr(document.getElementById('regSource')?.value),
            notes: toStr(document.getElementById('regNotes')?.value)
        };
    }

    function prefillRegistryFromForm() {
        const d = getFormData();
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };
        set('regBuilding', d.buildingNo);
        set('regUnit', d.flatNo);
        set('regTenant', d.tenantNameAr);
        set('regSource', 'Dropbox');
    }

    function addRegistryEntry() {
        const entry = getRegistryFormData();
        if (!entry.building || !entry.unit || !entry.tenant || !entry.fileName) {
            alert('⚠️ أكمل الحقول الأساسية: المبنى، الوحدة، المستأجر، واسم الملف.');
            return;
        }
        fileRegistry.unshift({
            id: `reg_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
            ...entry,
            updatedAt: new Date().toISOString()
        });
        renderRegistryTable();
        localStorage.setItem('bhd_file_registry', JSON.stringify(fileRegistry));
        document.getElementById('regFileName').value = '';
        document.getElementById('regFilePath').value = '';
        document.getElementById('regNotes').value = '';
    }

    function removeRegistryEntry(id) {
        fileRegistry = fileRegistry.filter((x) => x.id !== id);
        renderRegistryTable();
        localStorage.setItem('bhd_file_registry', JSON.stringify(fileRegistry));
    }

    function renderRegistryTable() {
        if (isViewerMode) return;
        const tbody = document.getElementById('registryTableBody');
        if (!tbody) return;
        const query = toStr(document.getElementById('registrySearch')?.value).toLowerCase();
        const rows = fileRegistry.filter((r) => {
            if (!query) return true;
            const text = `${r.building} ${r.unit} ${r.tenant} ${r.docType} ${r.fileName} ${r.source} ${r.filePath} ${r.notes}`.toLowerCase();
            return text.includes(query);
        });
        tbody.innerHTML = rows.map((r) => `
            <tr>
                <td>${escHtml(r.building || '')}</td>
                <td>${escHtml(r.unit || '')}</td>
                <td>${escHtml(r.tenant || '')}</td>
                <td>${escHtml(r.docType || '')}</td>
                <td title="${escAttr(r.filePath || '')}">${escHtml(r.fileName || '')}</td>
                <td>${escHtml(r.source || '-')}</td>
                <td>${escHtml((r.updatedAt || '').slice(0, 10))}</td>
                <td><button class="mini-btn" ${safeOnClick('removeRegistryEntry', r.id)}>${t('حذف', 'Delete')}</button></td>
            </tr>
        `).join('');
    }

    function usersRegistryHasRows() {
        return Array.isArray(usersRegistry) && usersRegistry.length > 0;
    }

    function getUserById(id) {
        return usersRegistry.find((u) => u && u.id === id) || null;
    }

    function validateAuthSession() {
        if (!authSession || !authSession.userId) {
            authSession = null;
            return;
        }
        if (!getUserById(authSession.userId)) {
            authSession = null;
            localStorage.removeItem('bhd_auth_session');
        }
    }

    function getLoggedInUser() {
        validateAuthSession();
        if (!authSession || !authSession.userId) return null;
        const u = getUserById(authSession.userId);
        return u ? normalizeUserRecord(u) : null;
    }

    function getCurrentActorLabel() {
        const u = getLoggedInUser();
        if (u) {
            const name = toStr(u.displayName) || toStr(u.email) || u.id;
            return appUiLanguage === 'en' ? `${name} (User)` : `${name} (مستخدم)`;
        }
        if (!usersRegistryHasRows()) return t('بدون مستخدمين مسجلين (وضع مفتوح)', 'No users yet (open access)');
        return t('غير مسجّل الدخول', 'Not signed in');
    }

    /** اسم المستخدم ومُعرِّفه لتسجيل الحركة في السجل / Session user snapshot for ledger audit rows */
    function getCurrentActorLedgerRecord() {
        try {
            validateAuthSession();
            const uid = authSession && authSession.userId ? toStr(authSession.userId) : '';
            const usr = uid ? getUserById(uid) : null;
            let nm = usr ? toStr(usr.displayName) || toStr(usr.email) || uid : '';
            if (!nm) {
                nm = !usersRegistryHasRows()
                    ? t('وضع مفتوح / Open mode', 'Open mode / وضع مفتوح')
                    : t('غير مسجّل الدخول / Not signed in', 'Not signed in / غير مسجّل الدخول');
            }
            return { staffUserId: uid || '', staffName: nm || '' };
        } catch (_) {
            return {
                staffUserId: '',
                staffName: t('غير مسجّل الدخول / Not signed in', 'Not signed in / غير مسجّل الدخول')
            };
        }
    }

    const SYSTEM_ACTIVITY_LOG_KEY = 'bhd_system_activity_log';
    const SYSTEM_ACTIVITY_LOG_MAX = 8000;
    let _bhdAuditMuted = 0;
    let _bhdAuditWriting = false;

    const BHD_AUDIT_SKIP_KEYS = new Set([
        SYSTEM_ACTIVITY_LOG_KEY,
        'bhd_auth_session',
        'bhd_theme_mode',
        'bhd_ui_last_mode',
        'bhd_tenancy_contract_seq',
        'bhd_cleanup_keep_owner_addressbook_done',
        'bhd_use_empty_base_units',
        'bhd_reservation_form_flow_v1',
        'bhd_reservation_flow_mirror_v1'
    ]);

    /** مفاتيح ضخمة — تسجيل خفيف دون مقارنة JSON كاملة / Large keys — light audit without full JSON diff */
    const BHD_AUDIT_HEAVY_KEYS = new Set([
        'bhd_accounting_registry',
        'bhd_saved_contracts_by_unit',
        'bhd_tasks_registry',
        'bhd_contract_full',
        'bhd_address_book',
        'bhd_managed_units',
        'bhd_building_profiles',
        'bhd_contract_history_by_unit',
        'bhd_unit_reservations',
        'bhd_file_registry',
        'bhd_maintenance_registry'
    ]);

    const BHD_KV_ACTIVITY_LABELS = {
        bhd_contract_full: { ar: 'حفظ بيانات العقد', en: 'Save contract data' },
        bhd_tenancy_contract_drafts: { ar: 'تحديث مسودة عقد', en: 'Update tenancy draft' },
        bhd_saved_contracts_by_unit: { ar: 'تحديث عقد محفوظ', en: 'Update saved contract' },
        bhd_contract_history_by_unit: { ar: 'أرشفة عقد', en: 'Archive contract' },
        bhd_tenancy_draft_cancellations: { ar: 'إلغاء مسودة عقد', en: 'Cancel tenancy draft' },
        bhd_contract_cancellations: { ar: 'إلغاء عقد', en: 'Cancel contract' },
        bhd_contract_cancellation_requests: { ar: 'طلب إلغاء عقد', en: 'Contract cancellation request' },
        bhd_buildings_list: { ar: 'تحديث قائمة المباني', en: 'Update buildings list' },
        bhd_owners_list: { ar: 'تحديث قائمة الملاك', en: 'Update owners list' },
        bhd_address_book: { ar: 'تحديث دفتر العناوين', en: 'Update address book' },
        bhd_file_registry: { ar: 'تحديث سجل الملفات', en: 'Update file registry' },
        bhd_unit_reservations: { ar: 'تحديث الحجوزات', en: 'Update reservations' },
        bhd_reservation_cancellations: { ar: 'إلغاء حجز', en: 'Cancel reservation' },
        bhd_eviction_requests: { ar: 'تحديث طلبات الإخلاء', en: 'Update eviction requests' },
        bhd_owner_building_map: { ar: 'ربط مالك بمبنى', en: 'Link owner to building' },
        bhd_building_profiles: { ar: 'تحديث بيانات مبنى', en: 'Update building profile' },
        bhd_owner_profiles: { ar: 'تحديث بيانات مالك', en: 'Update owner profile' },
        bhd_managed_units: { ar: 'تحديث الوحدات', en: 'Update managed units' },
        bhd_unit_forced_vacant_keys: { ar: 'تحديث حالة شاغر', en: 'Update vacant status' },
        bhd_users_registry: { ar: 'تحديث المستخدمين', en: 'Update users' },
        bhd_contract_edit_requests: { ar: 'طلب تعديل عقد', en: 'Contract edit request' },
        bhd_contract_edit_grants: { ar: 'منح تعديل عقد', en: 'Contract edit grant' },
        bhd_contract_renewal_requests: { ar: 'طلب تجديد مبكر', en: 'Early renewal request' },
        bhd_contract_renewal_grants: { ar: 'منح تجديد', en: 'Renewal grant' },
        bhd_contract_renewal_drafts: { ar: 'مسودة تجديد عقد', en: 'Contract renewal draft' },
        bhd_contract_renewal_log: { ar: 'سجل تجديد عقد', en: 'Contract renewal log' },
        bhd_password_reset_requests: { ar: 'طلب إعادة كلمة مرور', en: 'Password reset request' },
        bhd_addressbook_edit_requests: { ar: 'طلب تعديل دفتر عناوين', en: 'Address book edit request' },
        bhd_addressbook_edit_grants: { ar: 'منح تعديل دفتر عناوين', en: 'Address book edit grant' },
        bhd_accounting_registry: { ar: 'تحديث بيانات المحاسبة', en: 'Update accounting data' },
        bhd_tasks_registry: { ar: 'تحديث المهام', en: 'Update tasks' },
        bhd_maintenance_registry: { ar: 'تحديث الصيانة', en: 'Update maintenance' }
    };

    function bhdAuditMute() {
        _bhdAuditMuted += 1;
    }

    function bhdAuditUnmute() {
        _bhdAuditMuted = Math.max(0, _bhdAuditMuted - 1);
    }

    let _systemActivityLogCache = null;
    let _systemActivityPersistTimer = 0;

    function loadSystemActivityLogFromStorage() {
        try {
            const raw = localStorage.getItem(SYSTEM_ACTIVITY_LOG_KEY);
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (_eSal) {
            return [];
        }
    }

    function loadSystemActivityLog() {
        if (_systemActivityLogCache) return _systemActivityLogCache.slice();
        return loadSystemActivityLogFromStorage();
    }

    function flushSystemActivityLogToStorage() {
        _systemActivityPersistTimer = 0;
        if (!_systemActivityLogCache) return;
        _bhdAuditWriting = true;
        try {
            localStorage.setItem(SYSTEM_ACTIVITY_LOG_KEY, JSON.stringify(_systemActivityLogCache));
        } catch (_eW) {
        } finally {
            _bhdAuditWriting = false;
        }
    }

    function appendSystemActivityEntry(entry) {
        if (!entry || typeof entry !== 'object') return;
        if (!_systemActivityLogCache) {
            _systemActivityLogCache = loadSystemActivityLogFromStorage();
        }
        _systemActivityLogCache.unshift(entry);
        if (_systemActivityLogCache.length > SYSTEM_ACTIVITY_LOG_MAX) {
            _systemActivityLogCache.length = SYSTEM_ACTIVITY_LOG_MAX;
        }
        clearTimeout(_systemActivityPersistTimer);
        _systemActivityPersistTimer = setTimeout(flushSystemActivityLogToStorage, 500);
    }

    /** تسجيل حركة نظام مع المستخدم والتاريخ فوراً / Record system action with actor and timestamp */
    function recordSystemActivity(partial) {
        const actor = getCurrentActorLedgerRecord();
        const now = new Date().toISOString();
        const p = partial && typeof partial === 'object' ? partial : {};
        const entry = {
            id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            at: now,
            actedAt: now,
            staffUserId: actor.staffUserId,
            staffName: actor.staffName,
            actionAr: toStr(p.actionAr),
            actionEn: toStr(p.actionEn),
            building: toStr(p.building),
            unit: toStr(p.unit),
            ref: toStr(p.ref),
            note: toStr(p.note),
            storageKey: toStr(p.storageKey),
            actionKey: toStr(p.actionKey),
            ...p,
            at: now,
            actedAt: now,
            staffUserId: actor.staffUserId,
            staffName: actor.staffName
        };
        appendSystemActivityEntry(entry);
        return entry;
    }

    /** إلحاق بيانات المستخدم والوقت بأي سجل يُحفظ / Stamp user + timestamp on persisted records */
    function applyActorAuditStamp(record, opt) {
        const o = opt && typeof opt === 'object' ? opt : {};
        const actor = getCurrentActorLedgerRecord();
        const now = new Date().toISOString();
        const out = record && typeof record === 'object' ? { ...record } : {};
        const prefix = toStr(o.prefix);
        if (!toStr(out[`${prefix}staffUserId`])) out[`${prefix}staffUserId`] = actor.staffUserId;
        if (!toStr(out[`${prefix}staffName`])) out[`${prefix}staffName`] = actor.staffName;
        if (!toStr(out[`${prefix}actedAt`])) out[`${prefix}actedAt`] = now;
        if (!prefix) {
            if (!toStr(out.updatedAt)) out.updatedAt = now;
            if (!toStr(out.lastActorUserId)) out.lastActorUserId = actor.staffUserId;
            if (!toStr(out.lastActorName)) out.lastActorName = actor.staffName;
            if (!toStr(out.savedByUserId)) out.savedByUserId = actor.staffUserId;
            if (!toStr(out.savedByName)) out.savedByName = actor.staffName;
            if (!toStr(out.savedAt)) out.savedAt = now;
        }
        return out;
    }

    function dedupeAuditUnitHints(hints) {
        const seen = new Set();
        const out = [];
        (Array.isArray(hints) ? hints : []).forEach((h) => {
            const b = toStr(h?.building);
            const u = toStr(h?.unit);
            const key = `${b}|${u}`;
            if (!b && !u) return;
            if (seen.has(key)) return;
            seen.add(key);
            out.push({ building: b, unit: u });
        });
        return out;
    }

    function extractAuditUnitHintsFromMapKey(mapKey, entry) {
        const hints = [];
        const parts = toStr(mapKey).split('\t');
        if (parts.length >= 2 && parts[0] && parts[1]) {
            hints.push({ building: parts[0], unit: parts[1] });
        }
        const p = entry?.payload && typeof entry.payload === 'object' ? entry.payload : entry;
        if (p && typeof p === 'object') {
            const b = toStr(p.buildingNo || p.building);
            const u = toStr(p.flatNo || p.unit);
            if (b && u) hints.push({ building: b, unit: u });
        }
        return hints;
    }

    function diffKvUnitHints(key, oldRaw, newRaw) {
        const hints = [];
        try {
            const oldP = oldRaw ? JSON.parse(oldRaw) : null;
            const newP = newRaw ? JSON.parse(newRaw) : null;
            if (newP && typeof newP === 'object' && !Array.isArray(newP)) {
                const oldObj = oldP && typeof oldP === 'object' && !Array.isArray(oldP) ? oldP : {};
                const keys = new Set([...Object.keys(oldObj), ...Object.keys(newP)]);
                keys.forEach((k) => {
                    if (JSON.stringify(oldObj[k]) !== JSON.stringify(newP[k])) {
                        hints.push(...extractAuditUnitHintsFromMapKey(k, newP[k]));
                    }
                });
                return dedupeAuditUnitHints(hints);
            }
            if (Array.isArray(newP)) {
                const oldArr = Array.isArray(oldP) ? oldP : [];
                const oldSig = new Set(oldArr.map((x) => JSON.stringify(x)));
                newP.forEach((row) => {
                    if (!oldSig.has(JSON.stringify(row))) {
                        const b = toStr(row.building || row.buildingNo);
                        const u = toStr(row.unit || row.flatNo);
                        if (b && u) hints.push({ building: b, unit: u });
                    }
                });
                return dedupeAuditUnitHints(hints);
            }
            if (newP && typeof newP === 'object') {
                const b = toStr(newP.buildingNo || newP.building);
                const u = toStr(newP.flatNo || newP.unit);
                if (b && u) hints.push({ building: b, unit: u });
            }
        } catch (_eDiff) {}
        return dedupeAuditUnitHints(hints);
    }

    function recordKvChangeActivity(storageKey, newValue, oldValue) {
        const labels = BHD_KV_ACTIVITY_LABELS[storageKey] || {
            ar: `تحديث بيانات — ${storageKey}`,
            en: `Data update — ${storageKey}`
        };
        if (BHD_AUDIT_HEAVY_KEYS.has(storageKey)) {
            recordSystemActivity({
                storageKey,
                actionKey: storageKey,
                actionAr: labels.ar,
                actionEn: labels.en
            });
            return;
        }
        const hints = diffKvUnitHints(storageKey, oldValue, newValue);
        const base = {
            storageKey,
            actionKey: storageKey,
            actionAr: labels.ar,
            actionEn: labels.en
        };
        if (!hints.length) {
            recordSystemActivity(base);
            return;
        }
        hints.forEach((h) => {
            recordSystemActivity({
                ...base,
                building: h.building,
                unit: h.unit
            });
        });
    }

    function installBhdActivityAuditor() {
        if (window._bhdActivityAuditorInstalled) return;
        window._bhdActivityAuditorInstalled = true;
        const nativeSetItem = localStorage.setItem.bind(localStorage);
        localStorage.setItem = function auditedSetItem(key, value) {
            const k = String(key || '');
            let shouldAudit = false;
            let prev = null;
            if (
                !_bhdAuditMuted &&
                !_bhdAuditWriting &&
                k.startsWith('bhd_') &&
                !BHD_AUDIT_SKIP_KEYS.has(k) &&
                BHD_KV_KEYS.includes(k)
            ) {
                try {
                    prev = localStorage.getItem(k);
                    shouldAudit = prev !== value;
                } catch (_ePrev) {
                    shouldAudit = false;
                }
            }
            const ret = nativeSetItem(k, value);
            if (shouldAudit) {
                try {
                    recordKvChangeActivity(k, value, prev);
                } catch (_eAud) {}
            }
            return ret;
        };
    }

    installBhdActivityAuditor();
    installGlobalUiErrorShield();
    wireAccountingReportsDelegation();

    /** لعرض منشئ التقرير في مستندات الطباعة (اسم المستخدم المسجّل) */
    function getReportPreparedByHtml() {
        validateAuthSession();
        const u = getLoggedInUser();
        if (u) {
            const name = toStr(u.displayName) || toStr(u.email) || u.id;
            const email = toStr(u.email);
            if (email && name !== email) {
                return `${escHtml(name)} <span dir="ltr" style="font-size:10px">(${escHtml(email)})</span>`;
            }
            return escHtml(name);
        }
        if (!usersRegistryHasRows()) {
            return escHtml('وضع مفتوح — لا مستخدمون مسجّلون / Open mode — no user accounts');
        }
        return escHtml('غير مسجّل الدخول / Not signed in');
    }

    function userHasPermission(user, permKey) {
        if (!user || !user.permissions) return false;
        return !!user.permissions[permKey];
    }

    function isPortalScopedUser(user) {
        if (!user) return false;
        if (userIsSystemAdmin(user)) return false;
        if (userHasPermission(user, 'manage_properties')) return false;
        return userHasPermission(user, 'view_own_property') || userHasPermission(user, 'view_own_contract');
    }

    function getLoggedInUserAddressBookEntry() {
        const u = getLoggedInUser();
        if (!u || !toStr(u.addressBookKey).trim()) return null;
        const key = toStr(u.addressBookKey);
        return (addressBookEntries || []).find((e) => addressBookEntryKey(e) === key) || null;
    }

    function getPortalScopedBuildingUnit() {
        const ab = getLoggedInUserAddressBookEntry();
        if (!ab) return { building: '', unit: '' };
        return { building: toStr(ab.building), unit: toStr(ab.unit) };
    }

    function unitPassesPortalScope(building, unit) {
        const u = getLoggedInUser();
        if (!u) return !usersRegistryHasRows();
        if (userIsSystemAdmin(u)) return true;
        if (userHasPermission(u, 'manage_properties') || userHasPermission(u, 'manage_contracts')) return true;
        if (!isPortalScopedUser(u)) return true;
        const scope = getPortalScopedBuildingUnit();
        if (!scope.building && !scope.unit) return false;
        return toStr(scope.building) === toStr(building) && normalizeUnit(scope.unit) === normalizeUnit(unit);
    }

    function canAccessMaintenanceWorkspace() {
        return effectivePermissionAny(['manage_maintenance', 'request_maintenance']);
    }

    function userIsSystemAdmin(user) {
        if (!user || !user.permissions) return false;
        return user.role === 'system_admin' && !!user.permissions.manage_users;
    }

    function userCanPermanentlyEditSavedContracts(user) {
        if (!usersRegistryHasRows()) return true;
        if (!user) return false;
        if (userIsSystemAdmin(user)) return true;
        return userHasPermission(user, 'edit_saved_contracts');
    }

    /** هل يُسمح بفتح العقد للتعديل من تفاصيل الوحدة؟ / May open unit contract for editing from details modal */
    function unitDetailsAllowsContractEdit(unit) {
        if (!unit || !effectivePermission('manage_contracts')) return false;
        if (unitDetailsIsIncompleteTenancyDraft(unit)) return true;
        const b = toStr(unit.building);
        const f = toStr(unit.unit);
        if (unitHasSavedContractRecord(b, f)) {
            return canEditSavedContractForUnit(b, f);
        }
        if (unitDetailsNeedsAdditionalContractData(unit)) return false;
        return true;
    }

    function isSavedRenewalContractPayload(payload) {
        if (!payload || typeof payload !== 'object') return false;
        if (payload.isRenewalContract === true) return true;
        return !!toStr(payload.previousAgreementNo).trim();
    }

    function resolveRenewalPreviousSnapshotFromHistory(unit, currentPayload) {
        if (!unit || !currentPayload) return null;
        const prevAg = toStr(currentPayload.previousAgreementNo);
        const hk = _tenancyDraftStorageKey(unit.building, unit.unit);
        const hmap = loadContractHistoryByUnitMap();
        const archived = Array.isArray(hmap[hk]) ? hmap[hk] : [];
        if (prevAg) {
            for (let i = archived.length - 1; i >= 0; i--) {
                const p = archived[i]?.payload;
                if (p && toStr(p.agreementNo) === prevAg) {
                    return cloneContractPayloadForArchive(p);
                }
            }
        }
        if (archived.length) {
            const last = archived[archived.length - 1]?.payload;
            if (last) return cloneContractPayloadForArchive(last);
        }
        return null;
    }

    function buildRenewalObjectFromSavedPayload(payload, previousSnapshot) {
        const period = computeContractPeriodMonthsAndExtraDays(
            payload.startDate,
            payload.endDate,
            payload.contractMonths
        );
        return {
            agreementNo: toStr(payload.agreementNo),
            newStart: toStr(payload.startDate),
            newEnd: toStr(payload.endDate),
            newMonths: period.months || parseInt(toStr(payload.contractMonths), 10) || 12,
            newExtraDays: period.extraDays || 0,
            monthlyRent: formatRentAmountForInput(payload.monthlyRent),
            municipalFormNo: toStr(payload.municipalFormNo),
            municipalContractNo: toStr(payload.municipalContractNo),
            graceDays: toStr(payload.graceDays) || '0',
            graceAmount: toStr(payload.graceAmount) || '0.000',
            prevStart: toStr(previousSnapshot?.startDate),
            prevEnd: toStr(previousSnapshot?.endDate)
        };
    }

    function unitDetailsAllowsRenewalDataEdit(unit) {
        if (!unit || !effectivePermission('manage_contracts')) return false;
        if (unitDetailsHasRenewalDraft(unit)) return true;
        const payload = getSavedContractPayloadForUnit(unit);
        if (!isSavedRenewalContractPayload(payload)) return false;
        return canEditSavedContractForUnit(unit.building, unit.unit);
    }

    function canApproveContractEditRequests(user) {
        if (!user) return false;
        return userIsSystemAdmin(user) || userHasPermission(user, 'approve_edit_requests');
    }

    function contractEditUnitKey(buildingNo, flatNo) {
        return `${normalizeReservationBuildingKey(buildingNo)}|${normalizeUnit(flatNo)}`;
    }

    function loadContractEditRequests() {
        try {
            const raw = localStorage.getItem('bhd_contract_edit_requests');
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (_e) {
            return [];
        }
    }

    function saveContractEditRequests(list) {
        const arr = Array.isArray(list) ? list : [];
        localStorage.setItem('bhd_contract_edit_requests', JSON.stringify(arr));
        syncBhdKvToServer();
    }

    let contractEditThreadOpenId = '';

    function normalizeContractEditRequest(req) {
        if (!req || typeof req !== 'object') return req;
        if (!Array.isArray(req.thread)) {
            const seed = [];
            if (toStr(req.note)) {
                seed.push({
                    id: `msg_${toStr(req.id) || 'legacy'}_0`,
                    byUserId: toStr(req.requestedBy),
                    byUserName: toStr(req.requestedByName) || toStr(req.requestedBy),
                    role: 'requester',
                    text: toStr(req.note),
                    at: toStr(req.requestedAt) || new Date().toISOString()
                });
            }
            req.thread = seed;
        }
        if (!req.clarificationAwaitingFrom) req.clarificationAwaitingFrom = null;
        return req;
    }

    function getContractEditRequestById(requestId) {
        const id = toStr(requestId);
        if (!id) return null;
        const req = loadContractEditRequests().find((r) => r && toStr(r.id) === id);
        return req ? normalizeContractEditRequest({ ...req }) : null;
    }

    function updateContractEditRequestById(requestId, updater) {
        const id = toStr(requestId);
        if (!id || typeof updater !== 'function') return null;
        const requests = loadContractEditRequests();
        const idx = requests.findIndex((r) => r && toStr(r.id) === id);
        if (idx < 0) return null;
        const next = normalizeContractEditRequest(updater(normalizeContractEditRequest({ ...requests[idx] })));
        requests[idx] = next;
        saveContractEditRequests(requests);
        return next;
    }

    function generateContractEditThreadMessageId() {
        return `cem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    }

    function getContractEditRequestStatusLabels(req) {
        if (!req) return { ar: '—', en: '—' };
        if (req.status === 'approved') return { ar: 'موافق عليه', en: 'Approved' };
        if (req.status === 'rejected') return { ar: 'مرفوض', en: 'Rejected' };
        if (req.clarificationAwaitingFrom === 'requester') {
            return { ar: 'بانتظار رد مقدم الطلب', en: 'Awaiting requester reply' };
        }
        if (req.clarificationAwaitingFrom === 'admin') {
            return { ar: 'بانتظار رد المسؤول', en: 'Awaiting admin reply' };
        }
        return { ar: 'قيد المراجعة', en: 'Under review' };
    }

    function canComposeOnContractEditThread(req, user) {
        if (!req || !user || req.status !== 'pending') return false;
        const uid = toStr(user.id);
        if (canApproveContractEditRequests(user)) return true;
        if (toStr(req.requestedBy) === uid && req.clarificationAwaitingFrom === 'requester') return true;
        return false;
    }

    function getContractEditThreadComposeHint(req, user) {
        if (!req || !user) return '';
        if (canApproveContractEditRequests(user)) {
            return t(
                'اطلب توضيحاً عن نوع التعديل أو البيانات المطلوبة. ستصل الرسالة لمقدم الطلب.',
                'Ask for clarification about the edit type or required data. The message will reach the requester.'
            );
        }
        return t('أجب على استفسار المسؤول بأكبر قدر من التفاصيل.', 'Reply to the administrator’s question with as much detail as possible.');
    }

    function appendContractEditRequestMessage(requestId, text, options = {}) {
        const body = toStr(text).trim();
        if (!body) return null;
        const u = getLoggedInUser();
        if (!u) {
            openAuthLoginModal();
            return null;
        }
        const isAdmin = canApproveContractEditRequests(u);
        const role = options.role || (isAdmin ? 'admin' : 'requester');
        const msg = {
            id: generateContractEditThreadMessageId(),
            byUserId: u.id,
            byUserName: toStr(u.displayName) || toStr(u.email) || u.id,
            role,
            text: body,
            at: new Date().toISOString()
        };
        const updated = updateContractEditRequestById(requestId, (req) => {
            const thread = Array.isArray(req.thread) ? [...req.thread] : [];
            thread.push(msg);
            let clarificationAwaitingFrom = req.clarificationAwaitingFrom || null;
            if (role === 'admin') clarificationAwaitingFrom = 'requester';
            else if (role === 'requester') clarificationAwaitingFrom = 'admin';
            return { ...req, thread, clarificationAwaitingFrom, lastMessageAt: msg.at };
        });
        try {
            refreshNotificationsIfVisible();
        } catch (_eN) {}
        try {
            if (selectedUnitDetailsRecord) renderUnitHistory(selectedUnitDetailsRecord);
        } catch (_eUh) {}
        return updated;
    }

    function requestContractEditClarification(requestId) {
        if (!canApproveContractEditRequests(getLoggedInUser())) {
            alert(t('لا تملك صلاحية طلب التفاصيل.', 'No permission to request details.'));
            return;
        }
        openContractEditRequestThreadModal(requestId, { focusCompose: true });
    }

    function replyToContractEditClarification(requestId) {
        openContractEditRequestThreadModal(requestId, { focusCompose: true });
    }

    function renderContractEditThreadModalContent(requestId, options = {}) {
        const req = getContractEditRequestById(requestId);
        const titleEl = document.getElementById('contractEditThreadTitle');
        const metaEl = document.getElementById('contractEditThreadMeta');
        const msgsEl = document.getElementById('contractEditThreadMessages');
        const composeEl = document.getElementById('contractEditThreadCompose');
        const inputEl = document.getElementById('contractEditThreadInput');
        const labelEl = document.getElementById('contractEditThreadComposeLabel');
        if (!req || !titleEl || !metaEl || !msgsEl) return;
        contractEditThreadOpenId = requestId;
        const agr = toStr(req.agreementNo) || getAgreementNoForSavedUnit(req.buildingNo, req.flatNo);
        const st = getContractEditRequestStatusLabels(req);
        titleEl.textContent = t(`محادثة طلب التعديل — ${agr}`, `Edit request conversation — ${agr}`);
        metaEl.innerHTML = `
            <div><strong>${t('الوحدة', 'Unit')}:</strong> ${escHtml(toStr(req.unitLabel) || `${req.buildingNo} / ${req.flatNo}`)}</div>
            <div><strong>${t('مقدم الطلب', 'Requester')}:</strong> ${escHtml(toStr(req.requestedByName) || req.requestedBy || '—')}</div>
            <div><strong>${t('الحالة', 'Status')}:</strong> ${escHtml(t(st.ar, st.en))}</div>
            <div><strong>${t('تاريخ الطلب', 'Requested')}:</strong> ${escHtml(toStr(req.requestedAt).slice(0, 19).replace('T', ' '))}</div>
        `;
        const thread = Array.isArray(req.thread) ? req.thread : [];
        msgsEl.innerHTML = thread.length
            ? thread
                .map((m) => {
                    const who = toStr(m.byUserName) || toStr(m.byUserId) || '—';
                    const when = toStr(m.at).slice(0, 19).replace('T', ' ');
                    const roleCls = m.role === 'admin' ? 'edit-request-msg--admin' : 'edit-request-msg--requester';
                    const roleLbl =
                        m.role === 'admin'
                            ? t('المسؤول / Admin', 'Admin / المسؤول')
                            : t('مقدم الطلب / Requester', 'Requester / مقدم الطلب');
                    return `
                    <div class="edit-request-msg ${roleCls}">
                        <div class="edit-request-msg-meta"><strong>${escHtml(who)}</strong> · ${escHtml(roleLbl)} · ${escHtml(when)}</div>
                        <div>${escHtml(toStr(m.text))}</div>
                    </div>`;
                })
                .join('')
            : `<p style="margin:0;color:#666;font-size:12px">${t('لا توجد رسائل بعد.', 'No messages yet.')}</p>`;
        const u = getLoggedInUser();
        const canCompose = canComposeOnContractEditThread(req, u);
        if (composeEl) composeEl.style.display = canCompose ? 'block' : 'none';
        if (labelEl && canCompose) {
            labelEl.textContent = canApproveContractEditRequests(u)
                ? t('طلب تفاصيل إضافية / Request details', 'Request details / طلب تفاصيل')
                : t('ردك / Your reply', 'Your reply / ردك');
        }
        if (inputEl) {
            if (!canCompose) inputEl.value = '';
            else if (options.prefill) inputEl.value = options.prefill;
            if (options.focusCompose && canCompose) {
                setTimeout(() => {
                    try {
                        inputEl.focus();
                    } catch (_eF) {}
                }, 80);
            }
        }
        const hintEl = document.getElementById('contractEditThreadComposeHint');
        if (hintEl) {
            hintEl.textContent = canCompose ? getContractEditThreadComposeHint(req, u) : '';
            hintEl.style.display = canCompose ? 'block' : 'none';
        }
        msgsEl.scrollTop = msgsEl.scrollHeight;
    }

    function openContractEditRequestThreadModal(requestId, options = {}) {
        const req = getContractEditRequestById(requestId);
        if (!req) {
            alert(t('لم يُعثر على الطلب.', 'Request not found.'));
            return;
        }
        renderContractEditThreadModalContent(requestId, options);
        document.getElementById('contractEditThreadModal')?.classList.add('open');
    }

    function closeContractEditThreadModal() {
        contractEditThreadOpenId = '';
        document.getElementById('contractEditThreadModal')?.classList.remove('open');
    }

    function submitContractEditThreadMessage() {
        const requestId = contractEditThreadOpenId;
        const text = toStr(document.getElementById('contractEditThreadInput')?.value);
        if (!requestId) return;
        const req = getContractEditRequestById(requestId);
        const u = getLoggedInUser();
        if (!req || !u || !canComposeOnContractEditThread(req, u)) {
            alert(t('لا يمكنك إرسال رسالة على هذا الطلب.', 'You cannot send a message on this request.'));
            return;
        }
        if (!text.trim()) {
            alert(t('اكتب الرسالة أولاً.', 'Enter a message first.'));
            return;
        }
        const isAdmin = canApproveContractEditRequests(u);
        appendContractEditRequestMessage(requestId, text, { role: isAdmin ? 'admin' : 'requester' });
        const inputEl = document.getElementById('contractEditThreadInput');
        if (inputEl) inputEl.value = '';
        renderContractEditThreadModalContent(requestId);
        alert(
            isAdmin
                ? t('تم إرسال طلب التفاصيل إلى مقدم الطلب.', 'Details request sent to the requester.')
                : t('تم إرسال ردك إلى المسؤول.', 'Your reply was sent to the administrator.')
        );
    }

    function loadContractEditGrants() {
        try {
            const raw = localStorage.getItem('bhd_contract_edit_grants');
            const o = raw ? JSON.parse(raw) : null;
            return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
        } catch (_e) {
            return {};
        }
    }

    function saveContractEditGrants(map) {
        localStorage.setItem('bhd_contract_edit_grants', JSON.stringify(map && typeof map === 'object' ? map : {}));
        syncBhdKvToServer();
    }

    function unitHasSavedContractRecord(buildingNo, flatNo) {
        return !!getSavedContractMapEntry(loadSavedContractsByUnitMap(), buildingNo, flatNo);
    }

    function getActiveOneTimeEditGrant(buildingNo, flatNo, userId) {
        const grants = loadContractEditGrants();
        const key = contractEditUnitKey(buildingNo, flatNo);
        const g = grants[key];
        if (!g || typeof g !== 'object') return null;
        if (userId && toStr(g.userId) !== toStr(userId)) return null;
        return g;
    }

    function getActiveOneTimeEditGrantForCurrentUnit() {
        const u = getLoggedInUser();
        const b = toStr(document.getElementById('buildingNo')?.value);
        const f = toStr(document.getElementById('flatNo')?.value);
        if (!u || !b || !f) return null;
        return getActiveOneTimeEditGrant(b, f, u.id);
    }

    function hasPendingContractEditRequest(buildingNo, flatNo, userId) {
        const key = contractEditUnitKey(buildingNo, flatNo);
        return loadContractEditRequests().some(
            (r) =>
                r &&
                r.status === 'pending' &&
                contractEditUnitKey(r.buildingNo, r.flatNo) === key &&
                (!userId || toStr(r.requestedBy) === toStr(userId))
        );
    }

    const RENEWAL_EARLY_MAX_REMAINING_MONTHS = 6;

    function getContractRemainingCalendarMonths(endDateYmd) {
        const end = toStr(endDateYmd).trim();
        if (!end) return 0;
        const days = daysUntil(end);
        if (days === null || days <= 0) return 0;
        const today = formatDateYmdLocal(new Date());
        const { months, extraDays } = computeContractPeriodMonthsAndExtraDays(today, end);
        if (!months && !extraDays) return 0;
        return months + (extraDays > 0 ? extraDays / 30 : 0);
    }

    function formatContractRemainingMonthsLabel(endDateYmd) {
        const end = toStr(endDateYmd).trim();
        if (!end) return '—';
        const days = daysUntil(end);
        if (days === null || days <= 0) {
            return t('منتهي / Ended', 'Ended / منتهي');
        }
        const today = formatDateYmdLocal(new Date());
        const period = formatContractPeriodBilingual(today, end);
        const approx = getContractRemainingCalendarMonths(end);
        const approxLabel = approx
            ? t(`≈ ${approx.toFixed(1)} شهر`, `≈ ${approx.toFixed(1)} mo`)
            : '';
        return `${period}${approxLabel ? ` (${approxLabel})` : ''}`;
    }

    function contractRenewalNeedsAdminApproval(unit) {
        if (!unit) return false;
        const payload = getContractPayloadForUnit(unit);
        const endDate = toStr(unit.endDate || payload?.endDate);
        const remaining = getContractRemainingCalendarMonths(endDate);
        return remaining > RENEWAL_EARLY_MAX_REMAINING_MONTHS;
    }

    function loadContractRenewalRequests() {
        try {
            const raw = localStorage.getItem('bhd_contract_renewal_requests');
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (_eRr) {
            return [];
        }
    }

    function saveContractRenewalRequests(list) {
        localStorage.setItem('bhd_contract_renewal_requests', JSON.stringify(Array.isArray(list) ? list : []));
        syncBhdKvToServer();
    }

    function loadContractRenewalGrants() {
        try {
            const raw = localStorage.getItem('bhd_contract_renewal_grants');
            const o = raw ? JSON.parse(raw) : null;
            return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
        } catch (_eRg) {
            return {};
        }
    }

    function saveContractRenewalGrants(map) {
        localStorage.setItem('bhd_contract_renewal_grants', JSON.stringify(map && typeof map === 'object' ? map : {}));
        syncBhdKvToServer();
    }

    function getActiveContractRenewalGrant(buildingNo, flatNo, userId) {
        const grants = loadContractRenewalGrants();
        const key = contractEditUnitKey(buildingNo, flatNo);
        const g = grants[key];
        if (!g || typeof g !== 'object') return null;
        if (userId && toStr(g.userId) !== toStr(userId)) return null;
        return g;
    }

    function consumeContractRenewalGrant(buildingNo, flatNo, userId) {
        const grants = loadContractRenewalGrants();
        const key = contractEditUnitKey(buildingNo, flatNo);
        const g = grants[key];
        if (!g || (userId && toStr(g.userId) !== toStr(userId))) return;
        delete grants[key];
        saveContractRenewalGrants(grants);
    }

    function hasPendingContractRenewalRequest(buildingNo, flatNo, userId) {
        const key = contractEditUnitKey(buildingNo, flatNo);
        return loadContractRenewalRequests().some(
            (r) =>
                r &&
                r.status === 'pending' &&
                contractEditUnitKey(r.buildingNo, r.flatNo) === key &&
                (!userId || toStr(r.requestedBy) === toStr(userId))
        );
    }

    function generateContractRenewalRequestId() {
        return `crr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    }

    function submitContractRenewalApprovalRequest(unit, options = {}) {
        if (!unit) return;
        if (!assertPermissionOrAlert('manage_contracts', 'لا تملك صلاحية العقود.', 'No permission for contracts.')) {
            return;
        }
        const u = getLoggedInUser();
        if (!u) {
            openAuthLoginModal();
            return;
        }
        const b = toStr(unit.building);
        const f = toStr(unit.unit);
        if (!contractRenewalNeedsAdminApproval(unit)) {
            alert(
                t(
                    'التجديد مسموح مباشرة — المتبقي 6 أشهر أو أقل.',
                    'Renewal is allowed directly — 6 months or less remaining.'
                )
            );
            return;
        }
        if (canApproveContractEditRequests(u)) {
            alert(t('لديك صلاحية الموافقة — يمكنك التجديد مباشرة.', 'You may approve renewals — proceed directly.'));
            return;
        }
        if (getActiveContractRenewalGrant(b, f, u.id)) {
            alert(t('لديك موافقة تجديد نشطة لهذه الوحدة.', 'You already have an active renewal approval for this unit.'));
            return;
        }
        if (hasPendingContractRenewalRequest(b, f, u.id)) {
            alert(
                t(
                    'يوجد طلب تجديد مبكر معلّق بانتظار موافقة الإدارة.',
                    'An early renewal request is already pending administrator approval.'
                )
            );
            return;
        }
        const skipPrompt = options.skipPrompt === true;
        const payload = getContractPayloadForUnit(unit) || {};
        const endDate = toStr(unit.endDate || payload.endDate);
        const remaining = getContractRemainingCalendarMonths(endDate);
        const defaultNote = t(
            `طلب تجديد مبكر — المتبقي ≈ ${remaining.toFixed(1)} شهراً (أكثر من ${RENEWAL_EARLY_MAX_REMAINING_MONTHS} أشهر).`,
            `Early renewal request — ≈ ${remaining.toFixed(1)} month(s) remaining (more than ${RENEWAL_EARLY_MAX_REMAINING_MONTHS} months).`
        );
        const note = skipPrompt
            ? defaultNote
            : prompt(
                  t('سبب طلب التجديد المبكر (اختياري):', 'Reason for early renewal (optional):'),
                  defaultNote
              );
        if (note === null && !skipPrompt) return;
        const agreementNo = toStr(unit.agreementNo || payload.agreementNo) || getAgreementNoForSavedUnit(b, f);
        const requests = loadContractRenewalRequests();
        const nowIso = new Date().toISOString();
        const req = {
            id: generateContractRenewalRequestId(),
            buildingNo: b,
            flatNo: f,
            unitLabel: `${b} / ${f}`,
            agreementNo,
            contractEndDate: endDate,
            remainingMonthsApprox: remaining,
            requestedBy: u.id,
            requestedByName: toStr(u.displayName) || toStr(u.email) || u.id,
            requestedAt: nowIso,
            status: 'pending',
            note: toStr(note) || defaultNote
        };
        requests.push(req);
        saveContractRenewalRequests(requests);
        notifyApproverAboutRenewalRequest(req, { force: true });
        try {
            refreshNotificationsIfVisible();
        } catch (_eRnNot) {}
        try {
            updateUnitDetailsToolbarForDraft();
        } catch (_eUdRn) {}
        alert(
            t(
                `تم إرسال طلب تجديد مبكر إلى الإدارة.\nرقم العقد: ${agreementNo}\nالمتبقي: ≈ ${remaining.toFixed(1)} شهراً\nسيُفعَّل زر التجديد بعد الموافقة.`,
                `Early renewal request sent to administration.\nContract no.: ${agreementNo}\nRemaining: ≈ ${remaining.toFixed(1)} month(s)\nRenew will be enabled after approval.`
            )
        );
    }

    function notifyApproverAboutRenewalRequest(req, options = {}) {
        if (!req || req.status !== 'pending') return;
        const u = getLoggedInUser();
        if (!canApproveContractEditRequests(u)) return;
        if (!options.force && loadAdminSeenRenewalRequestIds().includes(toStr(req.id))) return;
        markRenewalRequestSeenByAdmin(req.id);
        const agr = toStr(req.agreementNo);
        const who = toStr(req.requestedByName) || toStr(req.requestedBy) || '—';
        const rem = req.remainingMonthsApprox != null ? Number(req.remainingMonthsApprox).toFixed(1) : '—';
        alert(
            t(
                `📬 طلب تجديد عقد مبكر\n\nمن: ${who}\nالعقد: ${agr}\nالوحدة: ${toStr(req.unitLabel)}\nالمتبقي: ≈ ${rem} شهراً\n\nافتح «التنبيهات» للموافقة أو الرفض.`,
                `📬 Early contract renewal request\n\nFrom: ${who}\nContract: ${agr}\nUnit: ${toStr(req.unitLabel)}\nRemaining: ≈ ${rem} month(s)\n\nOpen «Notifications» to approve or reject.`
            )
        );
        try {
            updateAuthHeaderBar();
        } catch (_eHdrRn) {}
    }

    function loadAdminSeenRenewalRequestIds() {
        try {
            const raw = localStorage.getItem('bhd_admin_seen_renewal_req_ids');
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr.map((x) => toStr(x)).filter(Boolean) : [];
        } catch (_e) {
            return [];
        }
    }

    function markRenewalRequestSeenByAdmin(requestId) {
        const id = toStr(requestId);
        if (!id) return;
        const seen = loadAdminSeenRenewalRequestIds();
        if (!seen.includes(id)) seen.push(id);
        try {
            localStorage.setItem('bhd_admin_seen_renewal_req_ids', JSON.stringify(seen.slice(-200)));
        } catch (_e) {}
    }

    function approveContractRenewalRequest(requestId) {
        if (!canApproveContractEditRequests(getLoggedInUser())) {
            alert(t('لا تملك صلاحية الموافقة.', 'No permission to approve.'));
            return;
        }
        const admin = getLoggedInUser();
        const requests = loadContractRenewalRequests();
        const idx = requests.findIndex((r) => r && r.id === requestId);
        if (idx < 0) return;
        const req = requests[idx];
        if (req.status !== 'pending') return;
        const grants = loadContractRenewalGrants();
        const key = contractEditUnitKey(req.buildingNo, req.flatNo);
        grants[key] = {
            userId: req.requestedBy,
            grantedBy: admin ? admin.id : '',
            grantedAt: new Date().toISOString(),
            requestId: req.id
        };
        saveContractRenewalGrants(grants);
        requests[idx] = {
            ...req,
            status: 'approved',
            resolvedAt: new Date().toISOString(),
            resolvedBy: admin ? admin.id : ''
        };
        saveContractRenewalRequests(requests);
        try {
            refreshNotificationsIfVisible();
        } catch (_eRnApr) {}
        try {
            updateUnitDetailsToolbarForDraft();
        } catch (_eUdApr) {}
        alert(
            t(
                `تمت الموافقة على التجديد المبكر.\nالمستخدم: ${toStr(req.requestedByName)}\nالوحدة: ${toStr(req.unitLabel)}`,
                `Early renewal approved.\nUser: ${toStr(req.requestedByName)}\nUnit: ${toStr(req.unitLabel)}`
            )
        );
    }

    function rejectContractRenewalRequest(requestId) {
        if (!canApproveContractEditRequests(getLoggedInUser())) {
            alert(t('لا تملك صلاحية الرفض.', 'No permission to reject.'));
            return;
        }
        const admin = getLoggedInUser();
        const requests = loadContractRenewalRequests();
        const idx = requests.findIndex((r) => r && r.id === requestId);
        if (idx < 0) return;
        const req = requests[idx];
        if (req.status !== 'pending') return;
        const agr = toStr(req.agreementNo);
        const rejectionNote = promptMandatoryAdminRejectionNote(
            `طلب تجديد مبكر ${agr} — ${toStr(req.unitLabel)}`,
            `early renewal ${agr} — ${toStr(req.unitLabel)}`
        );
        if (!rejectionNote) return;
        requests[idx] = {
            ...req,
            status: 'rejected',
            resolvedAt: new Date().toISOString(),
            resolvedBy: admin ? admin.id : '',
            rejectionNote
        };
        saveContractRenewalRequests(requests);
        try {
            refreshNotificationsIfVisible();
        } catch (_eRnRej) {}
        alert(t('تم رفض طلب التجديد المبكر.', 'Early renewal request rejected.'));
    }

    function canProceedWithContractRenewal(unit) {
        if (!contractRenewalNeedsAdminApproval(unit)) return { ok: true };
        const u = getLoggedInUser();
        if (!u) return { ok: false, reason: 'login' };
        if (canApproveContractEditRequests(u)) return { ok: true, adminBypass: true };
        if (getActiveContractRenewalGrant(unit.building, unit.unit, u.id)) {
            return { ok: true, granted: true };
        }
        return { ok: false, reason: 'approval_required' };
    }

    function assertContractRenewalAllowedOrPrompt(unit) {
        const check = canProceedWithContractRenewal(unit);
        if (check.ok) {
            if (check.granted) {
                consumeContractRenewalGrant(unit.building, unit.unit, getLoggedInUser()?.id);
            }
            return true;
        }
        if (check.reason === 'login') {
            openAuthLoginModal();
            return false;
        }
        const u = getLoggedInUser();
        const b = unit.building;
        const f = unit.unit;
        if (hasPendingContractRenewalRequest(b, f, u?.id)) {
            alert(
                t(
                    'يوجد طلب تجديد مبكر معلّق بانتظار موافقة الإدارة.',
                    'An early renewal request is pending administrator approval.'
                )
            );
            return false;
        }
        const endDate = toStr(unit.endDate || getContractPayloadForUnit(unit)?.endDate);
        const remaining = getContractRemainingCalendarMonths(endDate);
        const msg = t(
            `لا يمكن تجديد العقد الآن.\nالمتبقي في العقد السابق ≈ ${remaining.toFixed(1)} شهراً (أكثر من ${RENEWAL_EARLY_MAX_REMAINING_MONTHS} أشهر).\n\nهل تريد إرسال طلب موافقة للإدارة؟`,
            `Renewal is not allowed now.\nRemaining on current contract ≈ ${remaining.toFixed(1)} month(s) (more than ${RENEWAL_EARLY_MAX_REMAINING_MONTHS} months).\n\nSend an approval request to administration?`
        );
        if (!confirm(msg)) return false;
        submitContractRenewalApprovalRequest(unit);
        return false;
    }

    function formatContractEndDateBilingual(endDateYmd) {
        const end = toStr(endDateYmd).trim();
        if (!end) return '—';
        const ar = formatDate(end, 'ar') || end;
        const en = formatDate(end, 'en') || end;
        return `${ar} / ${en}`;
    }

    /** تنبيه قبل التجديد — للجميع بما فيهم مسؤول النظام / Pre-renewal notice for all users including admin */
    function confirmContractRenewalContinuationWarnings(unit) {
        if (!unit) return false;
        const payload = getContractPayloadForUnit(unit);
        const endDate = toStr(unit.endDate || payload?.endDate);
        if (!endDate) return true;
        const remaining = getContractRemainingCalendarMonths(endDate);
        const days = daysUntil(endDate);
        const endLabel = formatContractEndDateBilingual(endDate);

        if (remaining > RENEWAL_EARLY_MAX_REMAINING_MONTHS) {
            return confirm(
                t(
                    `تنبيه: مدة العقد المتبقية أكثر من ${RENEWAL_EARLY_MAX_REMAINING_MONTHS} أشهر (≈ ${remaining.toFixed(1)} شهراً، والانتهاء ${endLabel}).\n\nهل تريد الاستمرار بالتجديد؟`,
                    `Notice: More than ${RENEWAL_EARLY_MAX_REMAINING_MONTHS} months remain on the contract (≈ ${remaining.toFixed(1)} month(s); ends ${endLabel}).\n\nContinue with renewal?`
                )
            );
        }

        if (days !== null && days > 0) {
            return confirm(
                t(
                    `تنبيه: العقد ما زال سارياً حتى تاريخ ${endLabel}.\n\nهل تريد الاستمرار بالتجديد؟`,
                    `Notice: The contract is still active until ${endLabel}.\n\nContinue with renewal?`
                )
            );
        }

        return true;
    }

    function canEditSavedContractForUnit(buildingNo, flatNo) {
        if (!usersRegistryHasRows()) return true;
        if (!unitHasSavedContractRecord(buildingNo, flatNo)) return true;
        const u = getLoggedInUser();
        if (userCanPermanentlyEditSavedContracts(u)) return true;
        if (u && getActiveOneTimeEditGrant(buildingNo, flatNo, u.id)) return true;
        return false;
    }

    function isCurrentUnitSavedContractLocked() {
        if (contractAdditionalDataMode || contractActivationDataMode) return false;
        if (!isContractsWorkspaceScreenActive()) return false;
        const b = toStr(document.getElementById('buildingNo')?.value);
        const f = toStr(document.getElementById('flatNo')?.value);
        if (!b || !f || !unitHasSavedContractRecord(b, f)) return false;
        if (contractFullEditMode && canEditSavedContractForUnit(b, f)) return false;
        return !canEditSavedContractForUnit(b, f);
    }

    function revokeContractEditGrant(buildingNo, flatNo) {
        const grants = loadContractEditGrants();
        const key = contractEditUnitKey(buildingNo, flatNo);
        if (!grants[key]) return;
        delete grants[key];
        saveContractEditGrants(grants);
    }

    function generateContractEditRequestId() {
        return `cer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    }

    function getAgreementNoForSavedUnit(buildingNo, flatNo) {
        const entry = getSavedContractMapEntry(loadSavedContractsByUnitMap(), buildingNo, flatNo);
        const p = entry && entry.payload;
        return toStr(p && p.agreementNo).trim() || '—';
    }

    function loadAdminSeenEditRequestIds() {
        try {
            const raw = localStorage.getItem('bhd_admin_seen_edit_req_ids');
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr.map((x) => toStr(x)).filter(Boolean) : [];
        } catch (_e) {
            return [];
        }
    }

    function markEditRequestSeenByAdmin(requestId) {
        const id = toStr(requestId);
        if (!id) return;
        const seen = loadAdminSeenEditRequestIds();
        if (!seen.includes(id)) seen.push(id);
        try {
            localStorage.setItem('bhd_admin_seen_edit_req_ids', JSON.stringify(seen.slice(-200)));
        } catch (_e) {}
    }

    function notifyApproverAboutEditRequest(req, options = {}) {
        if (!req || req.status !== 'pending') return;
        const u = getLoggedInUser();
        if (!canApproveContractEditRequests(u)) return;
        const seen = loadAdminSeenEditRequestIds();
        if (!options.force && seen.includes(toStr(req.id))) return;
        markEditRequestSeenByAdmin(req.id);
        const agr = toStr(req.agreementNo) || getAgreementNoForSavedUnit(req.buildingNo, req.flatNo);
        const who = toStr(req.requestedByName) || toStr(req.requestedBy) || '—';
        alert(
            t(
                `📬 طلب تعديل عقد إيجار\n\nمن المستخدم: ${who}\nرقم العقد: ${agr}\nالوحدة: ${toStr(req.unitLabel) || `${req.buildingNo} / ${req.flatNo}`}\n\nافتح صفحة «التنبيهات» للموافقة أو الرفض.`,
                `📬 Lease contract edit request\n\nFrom user: ${who}\nContract no.: ${agr}\nUnit: ${toStr(req.unitLabel) || `${req.buildingNo} / ${req.flatNo}`}\n\nOpen «Notifications» to approve or reject.`
            )
        );
        try {
            updateAuthHeaderBar();
        } catch (_eHdr) {}
    }

    function pollEditRequestNotificationsForApprovers() {
        const u = getLoggedInUser();
        if (!canApproveContractEditRequests(u)) return;
        const pending = loadContractEditRequests()
            .filter((r) => r && r.status === 'pending')
            .sort((a, b) => toStr(b.requestedAt).localeCompare(toStr(a.requestedAt)));
        pending.forEach((req) => notifyApproverAboutEditRequest(req));
        const pendingRenew = loadContractRenewalRequests()
            .filter((r) => r && r.status === 'pending')
            .sort((a, b) => toStr(b.requestedAt).localeCompare(toStr(a.requestedAt)));
        pendingRenew.forEach((req) => notifyApproverAboutRenewalRequest(req));
    }

    function loadNotifiedEditGrantRequestIds() {
        try {
            const raw = sessionStorage.getItem('bhd_notified_edit_grant_req_ids');
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr.map((x) => toStr(x)).filter(Boolean) : [];
        } catch (_e) {
            return [];
        }
    }

    function markEditGrantRequestNotified(requestId) {
        const id = toStr(requestId);
        if (!id) return;
        const seen = loadNotifiedEditGrantRequestIds();
        if (!seen.includes(id)) seen.push(id);
        try {
            sessionStorage.setItem('bhd_notified_edit_grant_req_ids', JSON.stringify(seen.slice(-100)));
        } catch (_e) {}
    }

    function pollEditGrantApprovalForCurrentUser() {
        const u = getLoggedInUser();
        if (!u) return;
        const unit = selectedUnitDetailsRecord;
        const modalOpen = document.getElementById('unitDetailsModal')?.classList.contains('open');
        if (!unit || !modalOpen) return;
        const b = toStr(unit.building);
        const f = toStr(unit.unit);
        if (!b || !f) return;
        const grant = getActiveOneTimeEditGrant(b, f, u.id);
        if (!grant || !grant.requestId) return;
        const notified = loadNotifiedEditGrantRequestIds();
        if (notified.includes(toStr(grant.requestId))) return;
        markEditGrantRequestNotified(grant.requestId);
        try {
            updateUnitDetailsToolbarForDraft();
        } catch (_eUd) {}
        const agr = getAgreementNoForSavedUnit(b, f);
        alert(
            t(
                `✅ وافق المسؤول على طلبك — يمكنك الآن الضغط على «تعديل» (عقد ${agr}).`,
                `✅ Your edit request was approved — you can now press «Edit» (contract ${agr}).`
            )
        );
    }

    function initContractEditRequestNotifications() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'bhd_contract_edit_requests') {
                try {
                    const reqs = e.newValue ? JSON.parse(e.newValue) : [];
                    if (!Array.isArray(reqs)) return;
                    reqs
                        .filter((r) => r && r.status === 'pending')
                        .forEach((req) => notifyApproverAboutEditRequest(req));
                } catch (_eSt) {}
            }
            if (e.key === 'bhd_contract_edit_grants') {
                try {
                    pollEditGrantApprovalForCurrentUser();
                    updateUnitDetailsToolbarForDraft();
                } catch (_eGr) {}
            }
            if (e.key === 'bhd_password_reset_requests') {
                try {
                    const reqs = e.newValue ? JSON.parse(e.newValue) : [];
                    if (!Array.isArray(reqs)) return;
                    reqs
                        .filter((r) => r && r.status === 'pending')
                        .forEach((req) => notifyAdminAboutPasswordResetRequest(req));
                    refreshNotificationsIfVisible();
                } catch (_ePwdSt) {}
            }
        });
        setInterval(() => {
            try {
                pollEditRequestNotificationsForApprovers();
                pollPasswordResetNotificationsForAdmins();
                pollEditGrantApprovalForCurrentUser();
                updateNotificationsNavBadge();
            } catch (_ePoll) {}
        }, 15000);
        setTimeout(() => {
            try {
                pollEditRequestNotificationsForApprovers();
                pollPasswordResetNotificationsForAdmins();
            } catch (_eInit) {}
        }, 1200);
    }

    function unitDetailsShouldShowRequestEditButton(unit) {
        if (!unit || !effectivePermission('manage_contracts')) return false;
        if (unitDetailsAllowsContractEdit(unit)) return false;
        const b = toStr(unit.building);
        const f = toStr(unit.unit);
        return !!(b && f && unitHasSavedContractRecord(b, f));
    }

    function submitContractEditRequest(options = {}) {
        if (!assertPermissionOrAlert('manage_contracts', 'لا تملك صلاحية عرض العقود.', 'No permission to view contracts.')) return;
        const u = getLoggedInUser();
        if (!u) {
            openAuthLoginModal();
            return;
        }
        const b = toStr(options.buildingNo) || toStr(document.getElementById('buildingNo')?.value);
        const f = toStr(options.flatNo) || toStr(document.getElementById('flatNo')?.value);
        if (!b || !f) {
            alert(t('حدّد المبنى والوحدة أولاً.', 'Select building and unit first.'));
            return;
        }
        if (!unitHasSavedContractRecord(b, f)) {
            alert(t('لا يوجد عقد محفوظ لهذه الوحدة بعد.', 'No saved contract for this unit yet.'));
            return;
        }
        if (userCanPermanentlyEditSavedContracts(u)) {
            alert(t('لديك صلاحية التعديل بالفعل.', 'You already have edit permission.'));
            return;
        }
        if (getActiveOneTimeEditGrant(b, f, u.id)) {
            alert(t('لديك صلاحية تعديل مؤقتة نشطة.', 'You already have an active one-time edit grant.'));
            return;
        }
        if (hasPendingContractEditRequest(b, f, u.id)) {
            alert(t('يوجد طلب تعديل معلّق لهذه الوحدة.', 'A pending edit request already exists for this unit.'));
            return;
        }
        const skipPrompt = options.skipPrompt === true;
        const note = skipPrompt
            ? ''
            : prompt(t('سبب طلب التعديل (اختياري):', 'Reason for edit request (optional):'), '');
        if (note === null && !skipPrompt) return;
        const agreementNo = getAgreementNoForSavedUnit(b, f);
        const requests = loadContractEditRequests();
        const nowIso = new Date().toISOString();
        const thread = [];
        if (toStr(note)) {
            thread.push({
                id: generateContractEditThreadMessageId(),
                byUserId: u.id,
                byUserName: toStr(u.displayName) || toStr(u.email) || u.id,
                role: 'requester',
                text: toStr(note),
                at: nowIso
            });
        }
        const req = {
            id: generateContractEditRequestId(),
            buildingNo: b,
            flatNo: f,
            unitLabel: `${b} / ${f}`,
            agreementNo,
            requestedBy: u.id,
            requestedByName: toStr(u.displayName) || toStr(u.email) || u.id,
            requestedAt: nowIso,
            status: 'pending',
            note: toStr(note),
            thread,
            clarificationAwaitingFrom: null,
            lastMessageAt: thread.length ? nowIso : ''
        };
        requests.push(req);
        saveContractEditRequests(requests);
        notifyApproverAboutEditRequest(req, { force: true });
        updateContractEditRequestBarUi();
        try {
            refreshNotificationsIfVisible();
        } catch (_eNotSub) {}
        try {
            updateUnitDetailsToolbarForDraft();
        } catch (_eUd) {}
        alert(
            t(
                `تم إرسال طلب التعديل إلى المسؤول.\nرقم العقد: ${agreementNo}\nسيظهر زر التعديل لديك بعد الموافقة.`,
                `Edit request sent to the administrator.\nContract no.: ${agreementNo}\nThe Edit button will appear after approval.`
            )
        );
    }

    function submitContractEditRequestFromUnitDetails() {
        if (!selectedUnitDetailsRecord) return;
        submitContractEditRequest({
            buildingNo: selectedUnitDetailsRecord.building,
            flatNo: selectedUnitDetailsRecord.unit,
            skipPrompt: false
        });
    }

    function approveContractEditRequest(requestId) {
        if (!canApproveContractEditRequests(getLoggedInUser())) {
            alert(t('لا تملك صلاحية الموافقة على طلبات التعديل.', 'No permission to approve edit requests.'));
            return;
        }
        const admin = getLoggedInUser();
        const requests = loadContractEditRequests();
        const idx = requests.findIndex((r) => r && r.id === requestId);
        if (idx < 0) return;
        const req = requests[idx];
        if (req.status !== 'pending') return;
        const grants = loadContractEditGrants();
        const key = contractEditUnitKey(req.buildingNo, req.flatNo);
        grants[key] = {
            userId: req.requestedBy,
            grantedBy: admin ? admin.id : '',
            grantedAt: new Date().toISOString(),
            requestId: req.id
        };
        saveContractEditGrants(grants);
        requests[idx] = {
            ...req,
            status: 'approved',
            resolvedAt: new Date().toISOString(),
            resolvedBy: admin ? admin.id : ''
        };
        saveContractEditRequests(requests);
        try {
            refreshNotificationsIfVisible();
        } catch (_eNotApr) {}
        updateContractEditRequestBarUi();
        try {
            updateAuthHeaderBar();
        } catch (_eHdrApr) {}
        try {
            applyTenancyAndTenantFieldLocks();
        } catch (_eLock) {}
        try {
            updateUnitDetailsToolbarForDraft();
        } catch (_eUdApr) {}
        try {
            if (selectedUnitDetailsRecord) renderUnitHistory(selectedUnitDetailsRecord);
        } catch (_eUhApr) {}
        const agr = toStr(req.agreementNo) || getAgreementNoForSavedUnit(req.buildingNo, req.flatNo);
        alert(
            t(
                `تم منح صلاحية تعديل لمرة واحدة.\nالمستخدم: ${toStr(req.requestedByName)}\nرقم العقد: ${agr}\nالوحدة: ${req.unitLabel || key}`,
                `One-time edit granted.\nUser: ${toStr(req.requestedByName)}\nContract no.: ${agr}\nUnit: ${req.unitLabel || key}`
            )
        );
        try {
            markEditGrantRequestNotified(req.id);
            const cur = getLoggedInUser();
            if (cur && toStr(cur.id) === toStr(req.requestedBy)) {
                alert(
                    t(
                        '✅ وافق المسؤول على طلبك — يمكنك الآن الضغط على «تعديل» لإكمال التعديل ثم الحفظ.',
                        '✅ Your request was approved — you can now press «Edit», make changes, then save.'
                    )
                );
            }
        } catch (_eReqN) {}
    }

    function rejectContractEditRequest(requestId) {
        if (!canApproveContractEditRequests(getLoggedInUser())) {
            alert(t('لا تملك صلاحية رفض طلبات التعديل.', 'No permission to reject edit requests.'));
            return;
        }
        const admin = getLoggedInUser();
        const requests = loadContractEditRequests();
        const idx = requests.findIndex((r) => r && r.id === requestId);
        if (idx < 0) return;
        const req = requests[idx];
        if (req.status !== 'pending') return;
        const agr = toStr(req.agreementNo) || getAgreementNoForSavedUnit(req.buildingNo, req.flatNo);
        const unitLabel = toStr(req.unitLabel) || `${req.buildingNo} / ${req.flatNo}`;
        const rejectionNote = promptMandatoryAdminRejectionNote(
            `طلب تعديل عقد ${agr} — ${unitLabel}`,
            `contract edit request ${agr} — ${unitLabel}`
        );
        if (!rejectionNote) return;
        requests[idx] = {
            ...req,
            status: 'rejected',
            resolvedAt: new Date().toISOString(),
            resolvedBy: admin ? admin.id : '',
            rejectionNote
        };
        saveContractEditRequests(requests);
        try {
            refreshNotificationsIfVisible();
        } catch (_eNotRej) {}
        updateContractEditRequestBarUi();
        try {
            updateAuthHeaderBar();
        } catch (_eHdrRej) {}
        try {
            if (selectedUnitDetailsRecord) renderUnitHistory(selectedUnitDetailsRecord);
        } catch (_eUhRej) {}
        alert(t('تم رفض طلب التعديل مع تسجيل سبب الرفض.', 'Edit request rejected; rejection reason was recorded.'));
    }

    function loadPasswordResetRequests() {
        try {
            const raw = localStorage.getItem('bhd_password_reset_requests');
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (_e) {
            return [];
        }
    }

    function savePasswordResetRequests(arr) {
        localStorage.setItem('bhd_password_reset_requests', JSON.stringify(arr));
        try {
            persistKvSnapshotBestEffort();
        } catch (_eKv) {}
    }

    function generatePasswordResetRequestId() {
        return `prr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    }

    function canManagePasswordResetRequests(user) {
        if (!user) return false;
        return userIsSystemAdmin(user) || userHasPermission(user, 'manage_users');
    }

    function hasPendingPasswordResetRequest(userId) {
        const uid = toStr(userId);
        if (!uid) return false;
        return loadPasswordResetRequests().some((r) => r && r.status === 'pending' && toStr(r.userId) === uid);
    }

    function loadAdminSeenPasswordResetIds() {
        try {
            const raw = localStorage.getItem('bhd_admin_seen_pwd_req_ids');
            const arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr.map((x) => toStr(x)).filter(Boolean) : [];
        } catch (_e) {
            return [];
        }
    }

    function markPasswordResetSeenByAdmin(requestId) {
        const id = toStr(requestId);
        if (!id) return;
        const seen = loadAdminSeenPasswordResetIds();
        if (!seen.includes(id)) seen.push(id);
        try {
            localStorage.setItem('bhd_admin_seen_pwd_req_ids', JSON.stringify(seen.slice(-200)));
        } catch (_e) {}
    }

    function notifyAdminAboutPasswordResetRequest(req, options = {}) {
        if (!req || req.status !== 'pending') return;
        const u = getLoggedInUser();
        if (!canManagePasswordResetRequests(u)) return;
        const seen = loadAdminSeenPasswordResetIds();
        if (!options.force && seen.includes(toStr(req.id))) return;
        markPasswordResetSeenByAdmin(req.id);
        const who = toStr(req.displayName) || toStr(req.email) || toStr(req.userId) || '—';
        alert(
            t(
                `🔑 طلب إعادة ضبط كلمة المرور\n\nالمستخدم: ${who}\nالبريد: ${toStr(req.email)}\n\nافتح «التنبيهات» أو «إدارة المستخدمين» لتغيير كلمة المرور وإرسالها يدوياً للمستخدم.`,
                `🔑 Password reset request\n\nUser: ${who}\nEmail: ${toStr(req.email)}\n\nOpen «Notifications» or «Users» to set a new password and send it manually to the user.`
            )
        );
        try {
            updateAuthHeaderBar();
        } catch (_eHdr) {}
    }

    function pollPasswordResetNotificationsForAdmins() {
        const u = getLoggedInUser();
        if (!canManagePasswordResetRequests(u)) return;
        loadPasswordResetRequests()
            .filter((r) => r && r.status === 'pending')
            .sort((a, b) => toStr(b.requestedAt).localeCompare(toStr(a.requestedAt)))
            .forEach((req) => notifyAdminAboutPasswordResetRequest(req));
    }

    function submitPasswordResetRequest() {
        reloadUsersRegistryFromStorageForAuth();
        const identifier = toStr(document.getElementById('authLoginEmail')?.value).trim();
        if (!identifier) {
            alert(t('أدخل اسم المستخدم أو البريد أولاً.', 'Enter username or email first.'));
            return;
        }
        const target = findUserByLoginIdentifier(identifier);
        if (!target) {
            alert(
                t(
                    'البريد غير مسجّل في النظام. تواصل مع مدير النظام.',
                    'Email is not registered. Contact the system administrator.'
                )
            );
            return;
        }
        if (hasPendingPasswordResetRequest(target.id)) {
            alert(
                t(
                    'يوجد طلب إعادة ضبط معلّق لهذا الحساب. سيصلك الرد من المسؤول قريباً.',
                    'A password reset request is already pending for this account. The administrator will respond soon.'
                )
            );
            return;
        }
        const note = prompt(
            t('ملاحظة اختيارية للمسؤول:', 'Optional note for the administrator:'),
            ''
        );
        if (note === null) return;
        const req = {
            id: generatePasswordResetRequestId(),
            userId: target.id,
            email: toStr(target.email),
            displayName: toStr(target.displayName) || toStr(target.email),
            requestedAt: new Date().toISOString(),
            status: 'pending',
            note: toStr(note)
        };
        const requests = loadPasswordResetRequests();
        requests.push(req);
        savePasswordResetRequests(requests);
        notifyAdminAboutPasswordResetRequest(req, { force: true });
        try {
            refreshNotificationsIfVisible();
        } catch (_eNotPwd) {}
        alert(
            t(
                'تم إرسال طلب إعادة ضبط كلمة المرور إلى مدير النظام.\nسيغيّر المسؤول كلمة المرور ويرسلها لك يدوياً.',
                'Password reset request sent to the system administrator.\nThey will set a new password and send it to you manually.'
            )
        );
    }

    function openUserEditForPasswordReset(requestId) {
        const req = loadPasswordResetRequests().find((r) => r && r.id === requestId);
        if (!req) return;
        if (!canManagePasswordResetRequests(getLoggedInUser())) {
            alert(t('لا تملك صلاحية إدارة المستخدمين.', 'No permission to manage users.'));
            return;
        }
        try {
            closeAppAdminMenus();
        } catch (_eAdm) {}
        openUsersWorkspace();
        startEditUser(req.userId);
    }

    function resolvePasswordResetRequest(requestId) {
        if (!canManagePasswordResetRequests(getLoggedInUser())) {
            alert(t('لا تملك صلاحية معالجة طلبات كلمة المرور.', 'No permission to handle password reset requests.'));
            return;
        }
        const admin = getLoggedInUser();
        const requests = loadPasswordResetRequests();
        const idx = requests.findIndex((r) => r && r.id === requestId);
        if (idx < 0) return;
        const req = requests[idx];
        if (req.status !== 'pending') return;
        if (
            !confirm(
                t(
                    `تأكيد: تم تغيير كلمة المرور وإرسالها يدوياً للمستخدم ${toStr(req.displayName)}؟`,
                    `Confirm: password changed and sent manually to ${toStr(req.displayName)}?`
                )
            )
        ) {
            return;
        }
        requests[idx] = {
            ...req,
            status: 'resolved',
            resolvedAt: new Date().toISOString(),
            resolvedBy: admin ? admin.id : ''
        };
        savePasswordResetRequests(requests);
        try {
            refreshNotificationsIfVisible();
        } catch (_eNotRes) {}
        try {
            updateAuthHeaderBar();
        } catch (_eHdrRes) {}
        alert(t('تم إغلاق طلب إعادة ضبط كلمة المرور.', 'Password reset request closed.'));
    }

    function rejectPasswordResetRequest(requestId) {
        if (!canManagePasswordResetRequests(getLoggedInUser())) {
            alert(t('لا تملك صلاحية رفض طلبات كلمة المرور.', 'No permission to reject password reset requests.'));
            return;
        }
        const admin = getLoggedInUser();
        const requests = loadPasswordResetRequests();
        const idx = requests.findIndex((r) => r && r.id === requestId);
        if (idx < 0) return;
        const req = requests[idx];
        if (req.status !== 'pending') return;
        requests[idx] = {
            ...req,
            status: 'rejected',
            resolvedAt: new Date().toISOString(),
            resolvedBy: admin ? admin.id : ''
        };
        savePasswordResetRequests(requests);
        try {
            refreshNotificationsIfVisible();
        } catch (_eNotRejPwd) {}
        try {
            updateAuthHeaderBar();
        } catch (_eHdrRejPwd) {}
        alert(t('تم رفض طلب إعادة ضبط كلمة المرور.', 'Password reset request rejected.'));
    }

    function autoResolvePasswordResetRequestsForUser(userId) {
        const uid = toStr(userId);
        if (!uid) return;
        const requests = loadPasswordResetRequests();
        let changed = false;
        const admin = getLoggedInUser();
        const next = requests.map((r) => {
            if (!r || r.status !== 'pending' || toStr(r.userId) !== uid) return r;
            changed = true;
            return {
                ...r,
                status: 'resolved',
                resolvedAt: new Date().toISOString(),
                resolvedBy: admin ? admin.id : 'user-save'
            };
        });
        if (changed) savePasswordResetRequests(next);
    }

    function updateContractEditRequestBarUi() {
        const bar = document.getElementById('contractEditRequestBar');
        const statusEl = document.getElementById('contractEditRequestStatus');
        const btn = document.getElementById('contractEditRequestBtn');
        const lockNote = document.getElementById('savedContractEditLockNote');
        const oneTimeNote = document.getElementById('savedContractOneTimeEditNote');
        if (!bar || !statusEl) return;
        const locked = isCurrentUnitSavedContractLocked();
        const oneTime = getActiveOneTimeEditGrantForCurrentUnit();
        const b = toStr(document.getElementById('buildingNo')?.value);
        const f = toStr(document.getElementById('flatNo')?.value);
        const u = getLoggedInUser();
        const hasSaved = b && f && unitHasSavedContractRecord(b, f);
        const pending = hasSaved && u && hasPendingContractEditRequest(b, f, u.id);

        if (lockNote) {
            if (locked) {
                const ar = toStr(lockNote.getAttribute('data-ar'));
                const en = toStr(lockNote.getAttribute('data-en'));
                lockNote.textContent = ar && en ? `${ar} / ${en}` : ar || en;
                lockNote.style.display = 'block';
                lockNote.removeAttribute('hidden');
            } else {
                lockNote.style.display = 'none';
                lockNote.setAttribute('hidden', 'hidden');
            }
        }
        if (oneTimeNote) {
            if (oneTime && !locked) {
                const ar = toStr(oneTimeNote.getAttribute('data-ar'));
                const en = toStr(oneTimeNote.getAttribute('data-en'));
                oneTimeNote.textContent = ar && en ? `${ar} / ${en}` : ar || en;
                oneTimeNote.style.display = 'block';
                oneTimeNote.removeAttribute('hidden');
            } else {
                oneTimeNote.style.display = 'none';
                oneTimeNote.setAttribute('hidden', 'hidden');
            }
        }

        const showBar = hasSaved && usersRegistryHasRows() && u && !userCanPermanentlyEditSavedContracts(u);
        if (!showBar) {
            bar.style.display = 'none';
            bar.setAttribute('hidden', 'hidden');
            return;
        }
        bar.style.display = 'flex';
        bar.removeAttribute('hidden');
        if (btn) {
            btn.disabled = !!oneTime || !!pending || contractAdditionalDataMode;
            btn.style.display = locked || pending || oneTime ? '' : 'none';
        }
        if (oneTime && !locked) {
            statusEl.textContent = t(
                'صلاحية تعديل لمرة واحدة نشطة — عدّل ثم احفظ.',
                'One-time edit active — edit then save.'
            );
        } else if (pending) {
            statusEl.textContent = t(
                'طلب التعديل قيد المراجعة لدى المدير.',
                'Edit request pending administrator review.'
            );
        } else if (locked) {
            statusEl.textContent = t(
                'لا تملك صلاحية تعديل هذا العقد المحفوظ. يمكنك طلب موافقة المدير.',
                'You cannot edit this saved contract. Request administrator approval.'
            );
        } else {
            statusEl.textContent = '';
        }
    }

    function clearSavedContractFieldLock(el) {
        if (!el || !el.classList.contains('field-locked-saved-contract')) return;
        el.classList.remove('field-locked-saved-contract');
        if (!el.classList.contains('field-locked-tenancy-draft')) {
            if (el.tagName === 'SELECT' || el.type === 'file') el.disabled = false;
            else el.readOnly = false;
            const t0 = toStr(el.title);
            if (t0.includes('محفوظ') || t0.includes('saved contract')) el.removeAttribute('title');
        }
    }

    function applySavedContractEditLock() {
        updateContractEditRequestBarUi();
        const locked = isCurrentUnitSavedContractLocked();
        const lockTitle = t(
            'مقفل — عقد محفوظ. يتطلب صلاحية تعديل أو موافقة المدير (مرة واحدة).',
            'Locked — saved contract. Requires edit permission or one-time admin approval.'
        );
        const saveBtn = document.getElementById('contractsSaveDockPrimaryBtn');
        if (saveBtn) saveBtn.disabled = !!(locked && !contractAdditionalDataMode && !contractActivationDataMode);
        try {
            refreshContractSaveDockAccountingGateUi();
        } catch (_eAcctGateLock) {}

        const scope = document.querySelector('#contractsWorkspace .data-entry');
        if (!scope) return;

        scope.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach((el) => {
            if (locked) {
                if (el.tagName === 'SELECT' || el.type === 'file') el.disabled = true;
                else el.readOnly = true;
                el.title = lockTitle;
                el.classList.add('field-locked-saved-contract');
            } else {
                clearSavedContractFieldLock(el);
            }
        });

        if (locked) {
            scope.querySelectorAll('button.mini-btn').forEach((btn) => {
                btn.disabled = true;
            });
            scope.querySelectorAll(
                'button[onclick*="rebuildPaymentSchedule"], button[onclick*="rebuildVatCheque"], button[onclick*="addInsuranceDeposit"], button[onclick*="addCustomRent"], button[onclick*="addExtraAdjustment"]'
            ).forEach((btn) => {
                btn.disabled = true;
            });
        }
    }

    function effectivePermission(permKey) {
        if (!usersRegistryHasRows()) return true;
        const u = getLoggedInUser();
        if (!u) return false;
        return userHasPermission(u, permKey);
    }

    function effectivePermissionAny(permKeys) {
        if (!usersRegistryHasRows()) return true;
        const list = Array.isArray(permKeys) ? permKeys : [permKeys];
        return list.some((k) => effectivePermission(k));
    }

    function getPermissionDeniedMessage(permKey) {
        const def = BHD_PERMISSION_DEFS.find((p) => p.key === permKey);
        return {
            ar: def ? `لا تملك صلاحية: ${def.labelAr}` : `لا تملك الصلاحية المطلوبة (${permKey}).`,
            en: def ? `You do not have permission: ${def.labelEn}` : `Required permission missing (${permKey}).`
        };
    }

    function applyPermissionNavUi() {
        syncAuthStateFromStorage();
        const navPermByTarget = {
            dashboard: 'manage_dashboard',
            contracts: 'manage_contracts',
            reservations: 'manage_contracts',
            forms: 'manage_contracts',
            users: 'manage_users',
            accounting: null,
            maintenance: null,
            notifications: null
        };
        const setPermElVisible = (el, ok, opts = {}) => {
            const disableBtn = opts.disableBtn !== false;
            if (!el) return;
            el.classList.toggle('bhd-perm-denied', !ok);
            el.style.display = ok ? '' : 'none';
            el.setAttribute('aria-hidden', ok ? 'false' : 'true');
            if (el.tagName === 'BUTTON' && disableBtn) el.disabled = !ok;
        };
        document.querySelectorAll('.app-top-nav .nav-item[data-nav-target]').forEach((btn) => {
            const target = btn.getAttribute('data-nav-target');
            let ok = true;
            if (target === 'addressbook') {
                ok = effectiveModuleAccess('read', 'module_address_book') || effectivePermissionAny(['manage_owners', 'manage_contracts', 'view_address_book']);
            } else if (target === 'notifications') {
                ok = canAccessNotificationsPage();
            } else if (target === 'maintenance') {
                ok = canAccessMaintenanceWorkspace();
            } else if (target === 'contracts' || target === 'reservations' || target === 'forms') {
                if (target === 'reservations') {
                    ok = effectiveModuleAccess('read', 'module_reservations') || effectivePermissionAny(['manage_contracts', 'view_own_contract']);
                } else {
                    ok = effectiveModuleAccess('read', 'module_contracts') || effectivePermissionAny(['manage_contracts', 'view_own_contract']);
                }
            } else if (target === 'accounting') {
                ok = canAccessAccountingWorkspace();
            } else if (navPermByTarget[target]) {
                ok = effectivePermission(navPermByTarget[target]);
            }
            setPermElVisible(btn, ok);
        });
        document.querySelectorAll('[data-nav-perm]').forEach((btn) => {
            const perm = btn.getAttribute('data-nav-perm');
            if (!perm) return;
            let ok = effectivePermission(perm);
            if (perm === 'manage_maintenance') ok = canAccessMaintenanceWorkspace();
            setPermElVisible(btn, ok);
        });
        try {
            applyAppAdminMenuPermissions();
        } catch (_eAdminPerm) {}
        document.querySelectorAll('.stat-card.stat-card--click').forEach((card) => {
            const ok = !usersRegistryHasRows() || effectivePermission('manage_dashboard');
            setPermElVisible(card, ok);
        });
    }

    function clickEditBuilding(name) {
        if (
            !assertPermissionOrAlert(
                'manage_properties',
                'لا تملك صلاحية تعديل العقارات والمباني.',
                'No permission to edit properties & buildings.'
            )
        ) {
            return;
        }
        openBuildingEditor(name || '');
    }

    function clickEditOwner(name) {
        if (
            !assertPermissionOrAlert(
                'manage_owners',
                'لا تملك صلاحية تعديل بيانات الملاك.',
                'No permission to edit owners.'
            )
        ) {
            return;
        }
        openOwnerEditor(name || '');
    }

    function openAddressBookEditFromNotification(entryKey) {
        const idx = addressBookEntries.findIndex((e) => addressBookEntryKey(e) === toStr(entryKey));
        if (idx < 0) {
            alert(t('لم يُعثر على السجل في دفتر العناوين.', 'Record not found in address book.'));
            return;
        }
        try {
            openAddressBookWorkspace();
        } catch (_eW) {}
        openAddressBookEntryModal('edit', idx);
    }

    function clickEditAddressBookEntry(index) {
        if (
            !assertPermissionAnyOrAlert(
                ['manage_owners', 'manage_contracts'],
                'لا تملك صلاحية تعديل دفتر العناوين.',
                'No permission to edit the address book.'
            )
        ) {
            return;
        }
        openAddressBookEntryModal('edit', index);
    }

    function clickAddAddressBookEntry() {
        if (
            !assertPermissionAnyOrAlert(
                ['manage_owners', 'manage_contracts'],
                'لا تملك صلاحية إضافة جهات اتصال في الدفتر.',
                'No permission to add address book contacts.'
            )
        ) {
            return;
        }
        openAddressBookEntryModal('add', -1);
    }

    function clickEditUser(id) {
        if (
            !assertPermissionOrAlert(
                'manage_users',
                'لا تملك صلاحية إدارة المستخدمين.',
                'No permission to manage users.'
            )
        ) {
            return;
        }
        startEditUser(id);
    }

    function generateRandomPassword(len = 12) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
        let s = '';
        for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
    }

    function generateUserRecordId() {
        return `bhd_u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function loadUsersSeqState() {
        try {
            const raw = JSON.parse(localStorage.getItem('bhd_users_seq') || '{}');
            return raw && typeof raw === 'object' ? raw : { yearSeq: {} };
        } catch (_e) {
            return { yearSeq: {} };
        }
    }

    function saveUsersSeqState(st) {
        localStorage.setItem('bhd_users_seq', JSON.stringify(st || { yearSeq: {} }));
    }

    function nextUserNo() {
        const st = loadUsersSeqState();
        const year = new Date().getFullYear();
        if (!st.yearSeq || typeof st.yearSeq !== 'object') st.yearSeq = {};
        st.yearSeq[year] = (Number(st.yearSeq[year]) || 0) + 1;
        saveUsersSeqState(st);
        return `USR-${year}-${String(st.yearSeq[year]).padStart(4, '0')}`;
    }

    function slugifyForUsername(s) {
        return (
            toStr(s)
                .toLowerCase()
                .replace(/[^\w\u0600-\u06FF]+/g, '.')
                .replace(/\.+/g, '.')
                .replace(/^\.|\.$/g, '')
                .slice(0, 18) || 'user'
        );
    }

    function generateUniqueUsername(entry) {
        const meta = getAddressBookTypeMeta(toStr(entry.type));
        const prefix = meta?.prefix || 'usr';
        const slug = slugifyForUsername(entry.name || entry.nameEn || 'contact');
        let base = `${prefix}.${slug}`;
        let candidate = base;
        let n = 1;
        while (usersRegistry.some((u) => toStr(u.username).toLowerCase() === candidate.toLowerCase())) {
            candidate = `${base}${n}`;
            n += 1;
        }
        return candidate;
    }

    function generatePasswordForContactType(contactType) {
        const meta = getAddressBookTypeMeta(contactType);
        const tag = toStr(meta?.pwdTag || 'User').replace(/\s+/g, '');
        return `${tag}${new Date().getFullYear()}!${generateRandomPassword(4)}`;
    }

    function findUserByAddressBookKey(entryKey) {
        const k = toStr(entryKey);
        if (!k) return null;
        return usersRegistry.find((u) => u && toStr(u.addressBookKey) === k) || null;
    }

    function findUserByLoginIdentifier(identifier) {
        const raw = toStr(identifier).trim();
        if (!raw) return null;
        const em = normalizeAuthEmailInput(raw);
        const un = raw.toLowerCase();
        return (
            usersRegistry.find(
                (x) =>
                    x &&
                    (normalizeAuthEmailInput(x.email) === em || toStr(x.username).toLowerCase() === un)
            ) || null
        );
    }

    function syncLinkedUserFromAddressBookEntry(entry, entryIndex) {
        if (!entry) return null;
        reloadUsersRegistryFromStorageForAuth();
        const entryKey = addressBookEntryKey(entry);
        let user = findUserByAddressBookKey(entryKey);
        if (!user && toStr(entry.linkedUserId).trim()) {
            user = getUserById(entry.linkedUserId);
        }
        if (!user) return null;
        const idx = usersRegistry.findIndex((u) => u && u.id === user.id);
        if (idx < 0) return user;
        const contactType = normalizeAddressBookEntryType(entry.type);
        usersRegistry[idx] = normalizeUserRecord({
            ...usersRegistry[idx],
            displayName: toStr(entry.name) || toStr(entry.nameEn) || usersRegistry[idx].displayName,
            email: toStr(entry.email) || usersRegistry[idx].email,
            phone: toStr(entry.mobile) || usersRegistry[idx].phone,
            birthDate: toStr(entry.birthDate) || usersRegistry[idx].birthDate,
            contactType,
            addressBookKey: entryKey,
            updatedAt: new Date().toISOString()
        });
        if (entryIndex >= 0 && addressBookEntries[entryIndex]) {
            addressBookEntries[entryIndex].linkedUserId = usersRegistry[idx].id;
        }
        entry.linkedUserId = usersRegistry[idx].id;
        persistAuthOnly();
        return usersRegistry[idx];
    }

    function provisionUserFromAddressBookEntry(entry, opts = {}) {
        if (!entry) return null;
        reloadUsersRegistryFromStorageForAuth();
        const entryKey = addressBookEntryKey(entry);
        const existing = findUserByAddressBookKey(entryKey);
        if (existing && !opts.forceNew) {
            return syncLinkedUserFromAddressBookEntry(entry, opts.entryIndex);
        }
        const contactType = normalizeAddressBookEntryType(entry.type);
        const username = generateUniqueUsername(entry);
        const password = generatePasswordForContactType(contactType);
        const email = toStr(entry.email).trim() || `${username}@bhd.local`;
        const dupEmail = usersRegistry.some((u) => normalizeAuthEmailInput(u.email) === normalizeAuthEmailInput(email));
        const finalEmail = dupEmail ? `${username}@bhd.local` : email;
        const now = new Date().toISOString();
        const role = contactTypeToRole(contactType);
        const user = normalizeUserRecord({
            id: generateUserRecordId(),
            userNo: nextUserNo(),
            username,
            role,
            contactType,
            addressBookKey: entryKey,
            displayName: toStr(entry.name) || toStr(entry.nameEn) || username,
            email: finalEmail,
            phone: toStr(entry.mobile),
            birthDate: toStr(entry.birthDate),
            notes: t('مُنشأ تلقائياً من دفتر العناوين', 'Auto-provisioned from address book'),
            password,
            permissions: presetPermissionsForContactType(contactType),
            provisionedFromAddressBook: true,
            createdAt: now,
            createdBy: getCurrentActorLabel(),
            updatedAt: now,
            updatedBy: getCurrentActorLabel()
        });
        usersRegistry.push(user);
        entry.linkedUserId = user.id;
        if (typeof opts.entryIndex === 'number' && opts.entryIndex >= 0 && addressBookEntries[opts.entryIndex]) {
            addressBookEntries[opts.entryIndex].linkedUserId = user.id;
        }
        try {
            ensureCoaForUser(user);
            if (toStr(entry.building) && toStr(entry.unit)) ensureCoaForPropertyUnit(entry.building, entry.unit);
        } catch (_eCoaProv) {}
        persistAuthOnly();
        return user;
    }

    function linkAddressBookEntryWithProvisionedUser(entry, isNew, entryIndex) {
        if (!entry) return null;
        if (!isNew) return syncLinkedUserFromAddressBookEntry(entry, entryIndex);
        try {
            return provisionUserFromAddressBookEntry(entry, { entryIndex });
        } catch (_eProv) {
            return null;
        }
    }

    function persistAuthOnly() {
        localStorage.setItem('bhd_users_registry', JSON.stringify(usersRegistry));
        localStorage.setItem('bhd_auth_session', JSON.stringify(authSession));
        syncBhdKvToServer();
    }

    /** تطبيع البريد لمطابقة الدخول (مسافات، @ العريض، أحرف عديمة العرض) / Normalize email for sign-in comparison */
    function normalizeAuthEmailInput(raw) {
        return toStr(raw)
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/\uFF20/g, '@')
            .toLowerCase();
    }

    function reloadUsersRegistryFromStorageForAuth() {
        try {
            usersRegistry = JSON.parse(localStorage.getItem('bhd_users_registry') || '[]');
            if (!Array.isArray(usersRegistry)) usersRegistry = [];
            usersRegistry = usersRegistry.map((u) => normalizeUserRecord(u));
        } catch (e) {
            usersRegistry = [];
        }
        try {
            ensureDefaultBhdAdminAccount();
        } catch (eEns) {}
    }

    async function reloadUsersRegistryFromAllStoresForAuth() {
        if (window.bhdDesktop && typeof window.bhdDesktop.kvGetBulk === 'function') {
            try {
                const all = await window.bhdDesktop.kvGetBulk();
                const raw = all && all.bhd_users_registry;
                if (typeof raw === 'string' && raw.length) {
                    localStorage.setItem('bhd_users_registry', raw);
                }
            } catch (_eKvUsr) {}
        }
        reloadUsersRegistryFromStorageForAuth();
    }

    function verifyPasswordForUserId(userId, password) {
        const pw = toStr(password);
        if (!pw || !userId) return false;
        const u = usersRegistry.find((x) => x && x.id === userId);
        if (u && toStr(u.password) === pw) return true;
        const loginIds = [u?.username, u?.email].map((x) => toStr(x).trim()).filter(Boolean);
        for (const id of loginIds) {
            const found = findUserByLoginIdentifier(id);
            if (found && found.id === userId && toStr(found.password) === pw) return true;
        }
        return false;
    }

    /** مزامنة المستخدمين والجلسة من التخزين قبل أي فحص صلاحية / Sync auth from storage before permission checks */
    function syncAuthStateFromStorage() {
        reloadUsersRegistryFromStorageForAuth();
        try {
            authSession = JSON.parse(localStorage.getItem('bhd_auth_session') || 'null');
            if (!authSession || typeof authSession !== 'object') authSession = null;
        } catch (e) {
            authSession = null;
        }
        validateAuthSession();
    }

    /**
     * استعادة الدخول بالمسؤول الافتراضي (يُنشئ الحساب أو يعيد كلمة المرور الافتراضية ثم يسجّل الدخول).
     * Recover access: ensure default admin exists, reset password to default, sign in.
     */
    function recoverDefaultAdminAccess(options = {}) {
        const silent = !!(options && options.silent);
        syncAuthStateFromStorage();
        if (getLoggedInUser()) return true;
        try {
            ensureDefaultBhdAdminAccount();
        } catch (eEns) {}
        const em = normalizeAuthEmailInput(BHD_DEFAULT_ADMIN_EMAIL);
        let u = usersRegistry.find((x) => x && normalizeAuthEmailInput(x.email) === em);
        if (!u) {
            try {
                ensureDefaultBhdAdminAccount();
            } catch (eEns2) {}
            u = usersRegistry.find((x) => x && normalizeAuthEmailInput(x.email) === em);
        }
        if (!u) {
            if (!silent) {
                alert(t(
                    'تعذّر إنشاء حساب المسؤول الافتراضي. حدّث الصفحة (Ctrl+F5) ثم أعد المحاولة.',
                    'Could not create the default admin account. Refresh (Ctrl+F5) and try again.'
                ));
            }
            return false;
        }
        const now = new Date().toISOString();
        u.password = BHD_DEFAULT_ADMIN_PASSWORD;
        u.role = 'system_admin';
        u.permissions = defaultPermissionsAllOn();
        u.displayName = u.displayName || t('مسؤول النظام (افتراضي)', 'System admin (default)');
        u.updatedAt = now;
        u.updatedBy = 'access-recovery';
        authSession = { userId: u.id, loggedInAt: now };
        persistAuthOnly();
        bhdCloudSyncLoginBridge(u.email || BHD_DEFAULT_ADMIN_EMAIL, BHD_DEFAULT_ADMIN_PASSWORD).catch(() => {});
        recordSystemActivity({
            actionKey: 'auth_login_admin',
            actionAr: 'دخول مسؤول النظام / Admin sign-in',
            actionEn: 'Admin sign-in / دخول مسؤول النظام',
            note: u.displayName || u.email || u.id
        });
        updateAuthHeaderBar();
        if (!silent) {
            closeAuthLoginModal();
            alert(t(
                'تم الدخول كمسؤول النظام.\n\nالبريد: ah@bhd.om\nكلمة المرور: ah@bhd.om\n\nيمكنك تغييرها لاحقاً من «إدارة المستخدمين».',
                'Signed in as system admin.\n\nEmail: ah@bhd.om\nPassword: ah@bhd.om\n\nYou can change these later under Users.'
            ));
        }
        return true;
    }

    function tryAutoSignInDefaultAdminIfNeeded() {
        if (getLoggedInUser()) return true;
        return false;
    }

    function attemptLogin(identifier, password) {
        reloadUsersRegistryFromStorageForAuth();
        const pw = toStr(password);
        const u = findUserByLoginIdentifier(identifier);
        const storedPw = u ? toStr(u.password) : '';
        if (!u || storedPw !== pw) {
            return {
                ok: false,
                msg: `${t(
                    'بيانات الدخول غير صحيحة. استخدم اسم المستخدم أو البريد مع كلمة المرور من إدارة المستخدمين.',
                    'Invalid credentials. Use username or email with the password from User management.'
                )}`
            };
        }
        authSession = { userId: u.id, loggedInAt: new Date().toISOString() };
        persistAuthOnly();
        bhdCloudSyncLoginBridge(identifier, password).catch(() => {});
        recordSystemActivity({
            actionKey: 'auth_login',
            actionAr: 'تسجيل دخول / Sign in',
            actionEn: 'Sign in / تسجيل دخول',
            note: toStr(u.displayName) || toStr(u.email) || u.id
        });
        try {
            applyPermissionNavUi();
        } catch (_ePermLogin) {}
        return { ok: true };
    }

    function logoutAuth() {
        const actor = getCurrentActorLedgerRecord();
        recordSystemActivity({
            actionKey: 'auth_logout',
            actionAr: 'تسجيل خروج / Sign out',
            actionEn: 'Sign out / تسجيل خروج',
            note: actor.staffName
        });
        authSession = null;
        localStorage.removeItem('bhd_auth_session');
        bhdCloudClearSession();
        persistAuthOnly();
        try {
            applyPermissionNavUi();
        } catch (_eNavLogout) {}
    }

    function updateAuthHeaderBar() {
        const hosts = document.querySelectorAll('[data-auth-bar]');
        if (!hosts.length) return;
        const u = getLoggedInUser();
        const needLogin = usersRegistryHasRows() && !u;
        const label = getCurrentActorLabel();
        const pendingEdits = canApproveContractEditRequests(u)
            ? loadContractEditRequests().filter((r) => r && r.status === 'pending').length
            : 0;
        const notifyCount = getNotificationsBadgeCount();
        const pendingBadge =
            notifyCount > 0
                ? `<button type="button" onclick="openNotificationsWorkspace()" style="background:#c62828;color:#fff;border:none;border-radius:999px;padding:2px 10px;font-size:10px;font-weight:700;cursor:pointer">${notifyCount} ${t('تنبيه', 'alert')}</button>`
                : '';
        const html = `
            <span style="opacity:0.95;display:flex;align-items:center;gap:8px;flex-wrap:wrap">${t('المستخدم الحالي', 'Current')}: <strong>${escHtml(label)}</strong>${pendingBadge}</span>
            <span style="display:flex;flex-wrap:wrap;gap:6px">
                ${needLogin ? `<button type="button" class="btn-primary" style="padding:4px 12px;font-size:11px" onclick="recoverDefaultAdminAccess({silent:false})">${t('دخول مسؤول النظام', 'Admin sign-in')}</button>` : ''}
                ${needLogin ? `<button type="button" class="btn-outline" style="padding:4px 12px;font-size:11px" onclick="openAuthLoginModal()">${t('دخول يدوي', 'Manual sign-in')}</button>` : ''}
                ${u ? `<button type="button" class="btn-outline" style="padding:4px 12px;font-size:11px" onclick="logoutAuth(); updateAuthHeaderBar(); if(typeof renderUsersManagementPage==='function') renderUsersManagementPage();">${t('خروج', 'Logout')}</button>` : ''}
            </span>
        `;
        hosts.forEach((host) => { host.innerHTML = html; });
        try {
            applyPermissionNavUi();
        } catch (_eNavPerm) {}
        try {
            updateNotificationsNavBadge();
        } catch (_eNavBadge) {}
    }

    function openAuthLoginModal() {
        syncAuthStateFromStorage();
        const emailEl = document.getElementById('authLoginEmail');
        const pwEl = document.getElementById('authLoginPassword');
        if (emailEl && !toStr(emailEl.value)) emailEl.value = BHD_DEFAULT_ADMIN_EMAIL;
        if (pwEl) pwEl.value = '';
        document.getElementById('authLoginModal')?.classList.add('open');
    }

    function submitAuthLoginAsDefaultAdmin() {
        recoverDefaultAdminAccess({ silent: false });
        if (typeof renderUsersManagementPage === 'function') renderUsersManagementPage();
    }

    function closeAuthLoginModal() {
        document.getElementById('authLoginModal')?.classList.remove('open');
    }

    function submitAuthLogin() {
        const email = document.getElementById('authLoginEmail')?.value || '';
        const password = document.getElementById('authLoginPassword')?.value || '';
        const r = attemptLogin(email, password);
        if (!r.ok) {
            alert(r.msg);
            return;
        }
        closeAuthLoginModal();
        updateAuthHeaderBar();
        try {
            applyPermissionNavUi();
        } catch (_eNavLogin) {}
        if (typeof renderUsersManagementPage === 'function') renderUsersManagementPage();
        try {
            pollEditRequestNotificationsForApprovers();
        } catch (_ePollLogin) {}
        try {
            updateNotificationsNavBadge();
        } catch (_eNavLoginBadge) {}
        alert('تم تسجيل الدخول / Signed in');
    }

    function canAccessUserManagementPage() {
        if (!usersRegistryHasRows()) return true;
        const u = getLoggedInUser();
        return u && userHasPermission(u, 'manage_users');
    }

    function assertPermissionOrAlert(permKey, msgAr, msgEn) {
        syncAuthStateFromStorage();
        if (!usersRegistryHasRows()) return true;
        const u = getLoggedInUser();
        if (!u) {
            alert(
                t(
                    'يجب تسجيل الدخول أولاً للوصول إلى هذه الميزة.',
                    'You must sign in to access this feature.'
                )
            );
            try {
                openAuthLoginModal();
            } catch (_eLogin) {}
            return false;
        }
        if (effectivePermission(permKey)) return true;
        const def = getPermissionDeniedMessage(permKey);
        alert(`${msgAr || def.ar}\n${msgEn || def.en}`);
        return false;
    }

    function assertPermissionAnyOrAlert(permKeys, msgAr, msgEn) {
        syncAuthStateFromStorage();
        if (!usersRegistryHasRows()) return true;
        const u = getLoggedInUser();
        if (!u) {
            alert(
                t(
                    'يجب تسجيل الدخول أولاً للوصول إلى هذه الميزة.',
                    'You must sign in to access this feature.'
                )
            );
            try {
                openAuthLoginModal();
            } catch (_eLogin) {}
            return false;
        }
        if (effectivePermissionAny(permKeys)) return true;
        alert(
            `${msgAr || t('لا تملك الصلاحية المطلوبة.', 'You do not have the required permission.')}\n${
                msgEn || 'You do not have the required permission.'
            }`
        );
        return false;
    }

    function onUserRolePresetChange(applyPreset) {
        const roleEl = document.getElementById('userRoleSelect');
        if (!roleEl) return;
        if (applyPreset !== true) return;
        applyUserModuleAccessToGrid(presetModuleAccessForRole(toStr(roleEl.value) || 'system_user'));
    }

    function applyUserModuleAccessToGrid(moduleAccess) {
        const grid = document.getElementById('userPermGrid');
        if (!grid || !moduleAccess) return;
        grid.querySelectorAll('input[data-module-key]').forEach((inp) => {
            const k = inp.getAttribute('data-module-key');
            const lvl = inp.getAttribute('data-access-level');
            if (!k || !lvl) return;
            inp.checked = normalizeModuleAccessLevel(moduleAccess[k]) === lvl;
        });
    }

    const notificationsPageState = {
        category: 'all',
        search: '',
        sortKey: 'at',
        sortDir: 'desc',
        view: 'alerts',
        calendarMonth: ''
    };

    function canAccessNotificationsPage() {
        if (!usersRegistryHasRows()) return true;
        const u = getLoggedInUser();
        if (!u) return false;
        return effectivePermissionAny([
            'manage_dashboard',
            'manage_contracts',
            'approve_edit_requests',
            'manage_users',
            'manage_maintenance',
            'manage_accounting'
        ]);
    }

    let _appDialogResolver = null;

    function finishAppDialog(result) {
        const modal = document.getElementById('appDialogModal');
        modal?.classList.remove('open');
        const resolver = _appDialogResolver;
        _appDialogResolver = null;
        if (resolver) resolver(result);
    }

    function cancelAppDialog() {
        finishAppDialog({ confirmed: false, note: '' });
    }

    function submitAppConfirmDialog() {
        finishAppDialog({ confirmed: true, note: '' });
    }

    function submitAppRequestNoteDialog() {
        const note = toStr(document.getElementById('appDialogNoteInput')?.value).trim();
        finishAppDialog({ confirmed: true, note });
    }

    function submitAppPasswordConfirmDialog() {
        const pw = toStr(document.getElementById('appDialogPasswordInput')?.value);
        finishAppDialog({ confirmed: !!pw, note: pw });
    }

    function showAppPasswordConfirmDialog({ title, message, passwordLabel }) {
        return new Promise((resolve) => {
            _appDialogResolver = resolve;
            const modal = document.getElementById('appDialogModal');
            const body = document.getElementById('appDialogBody');
            const head = document.getElementById('appDialogTitle');
            if (!modal || !body) {
                resolve({ confirmed: false, note: '' });
                return;
            }
            if (head) head.textContent = title || t('تأكيد', 'Confirm');
            body.innerHTML = `
                <p style="margin:0 0 10px;line-height:1.6">${escHtml(message)}</p>
                <div class="input-group" style="margin-bottom:12px">
                    <label>${passwordLabel || t('كلمة المرور', 'Password')}</label>
                    <input type="password" id="appDialogPasswordInput" autocomplete="current-password" style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:6px" placeholder="${t('أدخل كلمة المرور', 'Enter password')}">
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
                    <button type="button" class="btn-outline" onclick="cancelAppDialog()">${t('إلغاء', 'Cancel')}</button>
                    <button type="button" class="btn-primary" onclick="submitAppPasswordConfirmDialog()">${t('متابعة', 'Continue')}</button>
                </div>`;
            modal.classList.add('open');
            try { localizeBilingualUi(); } catch (_e) {}
            setTimeout(() => document.getElementById('appDialogPasswordInput')?.focus(), 80);
        });
    }

    function showAppConfirmDialog(message, title) {
        return new Promise((resolve) => {
            _appDialogResolver = resolve;
            const modal = document.getElementById('appDialogModal');
            const body = document.getElementById('appDialogBody');
            const head = document.getElementById('appDialogTitle');
            if (!modal || !body) {
                resolve({ confirmed: false, note: '' });
                return;
            }
            if (head) head.textContent = title || t('تأكيد', 'Confirm');
            body.innerHTML = `
                <p style="margin:0 0 12px;line-height:1.6">${escHtml(message)}</p>
                <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
                    <button type="button" class="btn-outline" onclick="cancelAppDialog()">${t('إلغاء', 'Cancel')}</button>
                    <button type="button" class="btn-primary" onclick="submitAppConfirmDialog()">${t('موافق', 'OK')}</button>
                </div>`;
            modal.classList.add('open');
            try { localizeBilingualUi(); } catch (_e) {}
        });
    }

    function showAppRequestNoteDialog({ title, message, reasonLabel, defaultValue }) {
        return new Promise((resolve) => {
            _appDialogResolver = resolve;
            const modal = document.getElementById('appDialogModal');
            const body = document.getElementById('appDialogBody');
            const head = document.getElementById('appDialogTitle');
            if (!modal || !body) {
                resolve({ confirmed: false, note: '' });
                return;
            }
            if (head) head.textContent = title || t('تأكيد', 'Confirm');
            body.innerHTML = `
                <p style="margin:0 0 10px;line-height:1.6">${escHtml(message)}</p>
                <div class="input-group" style="margin-bottom:12px">
                    <label>${reasonLabel || t('ملاحظة (اختياري)', 'Note (optional)')}</label>
                    <textarea id="appDialogNoteInput" rows="3" style="width:100%;resize:vertical" placeholder="${t('اكتب السبب أو التعليق...', 'Enter reason or comment...')}"></textarea>
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
                    <button type="button" class="btn-outline" onclick="cancelAppDialog()">${t('إلغاء', 'Cancel')}</button>
                    <button type="button" class="btn-primary" onclick="submitAppRequestNoteDialog()">${t('متابعة', 'Continue')}</button>
                </div>`;
            modal.classList.add('open');
            try { localizeBilingualUi(); } catch (_e) {}
            setTimeout(() => {
                const inp = document.getElementById('appDialogNoteInput');
                if (inp && defaultValue) inp.value = defaultValue;
                inp?.focus();
            }, 80);
        });
    }

    function collectAccountingApprovalNotificationItems() {
        const items = [];
        const u = getLoggedInUser();
        const uid = u ? toStr(u.id) : '';
        const canApprove = canApproveAccountingEntry();
        const canAccounting = effectivePermission('manage_accounting');
        if (!canApprove && !canAccounting) return items;
        const reg = loadAccountingRegistry();
        (reg.deposits || []).forEach((d) => {
            if (!isAccountingDepositPendingReceipt(d.status)) return;
            const submittedAt = d.updatedAt || '';
            items.push({
                id: `acct-dep-rcpt-${d.id}`,
                category: 'accounting',
                priority: 'high',
                at: submittedAt,
                title: t(`اعتماد استلام ضمان — ${d.building} / ${d.unit}`, `Confirm deposit receipt — ${d.building} / ${d.unit}`),
                body: t(
                    `${d.type === 'security' ? 'ضمان' : 'تأمين'} ${summaryAmtOm(d.amount)} — عقد ${toStr(d.agreementNo) || '—'} — ${toStr(d.tenant) || '—'}`,
                    `${d.type === 'security' ? 'Security' : 'Insurance'} ${summaryAmtOm(d.amount)} — contract ${toStr(d.agreementNo) || '—'} — ${toStr(d.tenant) || '—'}`
                ),
                searchText: `${d.building} ${d.unit} ${d.tenant} deposit receipt accounting`.toLowerCase(),
                actions: canApprove
                    ? [
                          {
                              label: t('اعتماد الاستلام', 'Confirm receipt'),
                              onclick: `openAccountingContractReceiptApprovalModal('deposit',${JSON.stringify(d.id)})`,
                              primary: true
                          },
                          {
                              label: t('بانتظار الاعتماد', 'Pending'),
                              onclick: `_accountingUiState.tab='pending'; setWorkspaceMode('accounting'); renderAccountingWorkspace();`
                          }
                      ]
                    : []
            });
        });
        (reg.cheques || []).forEach((c) => {
            if (!isAccountingChequePendingReceipt(c.status)) return;
            const submittedAt = c.updatedAt || '';
            items.push({
                id: `acct-chq-rcpt-${c.id}`,
                category: 'accounting',
                priority: 'high',
                at: submittedAt,
                title: t(`اعتماد استلام شيك — ${c.chequeNo || '—'}`, `Confirm cheque receipt — ${c.chequeNo || '—'}`),
                body: t(
                    `${c.building} / ${c.unit} — ${summaryAmtOm(c.amount)} — استحقاق ${toStr(c.dueDate) || '—'}`,
                    `${c.building} / ${c.unit} — ${summaryAmtOm(c.amount)} — due ${toStr(c.dueDate) || '—'}`
                ),
                searchText: `${c.chequeNo} ${c.building} ${c.unit} cheque receipt accounting`.toLowerCase(),
                actions: canApprove
                    ? [
                          {
                              label: t('اعتماد الاستلام', 'Confirm receipt'),
                              onclick: `openAccountingContractReceiptApprovalModal('cheque',${JSON.stringify(c.id)})`,
                              primary: true
                          },
                          {
                              label: t('بانتظار الاعتماد', 'Pending'),
                              onclick: `_accountingUiState.tab='pending'; setWorkspaceMode('accounting'); renderAccountingWorkspace();`
                          }
                      ]
                    : []
            });
        });
        (reg.entries || []).forEach((e) => {
            if (!e || !e.manualEntry) return;
            if (!isAccountingEntryPendingApproval(e)) return;
            const actionLbl = accountingPendingActionLabel(e);
            const voucher = toStr(e.voucherNo) || toStr(e.title) || '—';
            const party = toStr(e.partyName) || '—';
            const submittedAt = e.pendingRequest?.submittedAt || e.createdByAt || e.updatedAt || e.dueDate;
            const submitter = toStr(e.pendingRequest?.submittedByName) || toStr(e.createdByName) || '—';
            const submitNote = toStr(e.pendingRequest?.submitNote);
            const requestNo = getAccountingEntryActiveRequestNo(e);
            const bodyTxt = t(
                `${requestNo ? `${requestNo} — ` : ''}${actionLbl} — ${summaryAmtOm(e.amount)} — ${party} — ${t('من', 'from')} ${submitter}${submitNote ? ` — ${submitNote}` : ''}`,
                `${requestNo ? `${requestNo} — ` : ''}${actionLbl} — ${summaryAmtOm(e.amount)} — ${party} — ${t('from', 'from')} ${submitter}${submitNote ? ` — ${submitNote}` : ''}`
            );
            const openPending = `_accountingUiState.tab='pending'; setWorkspaceMode('accounting'); renderAccountingWorkspace();`;
            if (canApprove) {
                items.push({
                    id: `acct-approve-${e.id}-${toStr(e.pendingRequest?.submittedAt || e.updatedAt)}`,
                    category: 'accounting',
                    priority: 'high',
                    at: submittedAt,
                    title: t(`اعتماد محاسبي — ${voucher}${requestNo ? ` (${requestNo})` : ''}`, `Accounting approval — ${voucher}${requestNo ? ` (${requestNo})` : ''}`),
                    body: bodyTxt,
                    searchText: `${requestNo} ${voucher} ${party} ${submitter} ${submitNote} accounting`.toLowerCase(),
                    actions: [
                        {
                            label: t('اعتماد / رفض', 'Approve / reject'),
                            onclick: `openAccountingApprovalModal(${JSON.stringify(e.id)})`,
                            primary: true
                        },
                        {
                            label: t('طلب إيضاح', 'Ask clarification'),
                            onclick: `openAccountingApprovalModal(${JSON.stringify(e.id)}); setTimeout(function(){ focusAccountingPendingClarification(${JSON.stringify(e.id)}); }, 300);`
                        },
                        {
                            label: t('معاملات العقار', 'Property transactions'),
                            onclick: `openAccountingPropertyReviewModal(${JSON.stringify(e.id)})`
                        },
                        {
                            label: t('تفاصيل', 'Details'),
                            onclick: `openAccountingReceiptDetailModal(${JSON.stringify(e.id)})`
                        },
                        {
                            label: t('بانتظار الاعتماد', 'Pending'),
                            onclick: openPending
                        }
                    ]
                });
            }
            const submittedById = toStr(e.pendingRequest?.submittedById) || toStr(e.createdById);
            const normPr = e.pendingRequest ? normalizeAccountingPendingRequest({ ...e.pendingRequest }) : null;
            const thread = normPr && Array.isArray(normPr.thread) ? normPr.thread : [];
            const lastMsg = thread.length ? thread[thread.length - 1] : null;
            const threadPreview = lastMsg ? toStr(lastMsg.text).slice(0, 120) : '';
            if (canApprove && normPr && normPr.clarificationAwaitingFrom === 'admin') {
                items.push({
                    id: `acct-clarify-admin-${e.id}-${toStr(normPr.lastMessageAt || normPr.submittedAt)}`,
                    category: 'accounting',
                    priority: 'high',
                    at: normPr.lastMessageAt || normPr.submittedAt,
                    title: t(`رد توضيح — ${voucher}`, `Clarification reply — ${voucher}`),
                    body: t(
                        `بانتظار ردك على طلب التوضيح — ${party}${threadPreview ? ` — ${threadPreview}` : ''}`,
                        `Awaiting your reply to clarification — ${party}${threadPreview ? ` — ${threadPreview}` : ''}`
                    ),
                    searchText: `${voucher} clarification accounting`.toLowerCase(),
                    actions: [
                        {
                            label: t('فتح السجل / الرد', 'Open log / reply'),
                            onclick: `openAccountingApprovalModal(${JSON.stringify(e.id)})`,
                            primary: true
                        },
                        {
                            label: t('تفاصيل', 'Details'),
                            onclick: `openAccountingReceiptDetailModal(${JSON.stringify(e.id)})`
                        }
                    ]
                });
            }
            if (uid && submittedById && submittedById === uid && (e.pendingRequest || toStr(e.status) === 'pending_accountant')) {
                const needsReply = normPr && normPr.clarificationAwaitingFrom === 'requester';
                items.push({
                    id: `acct-mine-${e.id}-${toStr(e.pendingRequest?.submittedAt || e.updatedAt)}`,
                    category: needsReply ? 'accounting' : 'note',
                    priority: needsReply ? 'high' : 'normal',
                    at: normPr?.lastMessageAt || submittedAt,
                    title: needsReply
                        ? t(`مطلوب توضيح — ${voucher}`, `Clarification needed — ${voucher}`)
                        : t(`طلبك قيد الاعتماد — ${voucher}`, `Your request is pending — ${voucher}`),
                    body: needsReply
                        ? t(
                              `المسؤول يطلب مزيداً من الإيضاحات${threadPreview ? ` — ${threadPreview}` : ''}`,
                              `Manager requests more clarification${threadPreview ? ` — ${threadPreview}` : ''}`
                          )
                        : bodyTxt,
                    searchText: `${voucher} pending accounting mine`.toLowerCase(),
                    actions: [
                        {
                            label: needsReply ? t('الرد الآن', 'Reply now') : t('بانتظار الاعتماد', 'Pending'),
                            onclick: needsReply
                                ? `openAccountingReceiptDetailModal(${JSON.stringify(e.id)}); setTimeout(function(){ focusAccountingPendingClarification(${JSON.stringify(e.id)}); }, 300);`
                                : openPending,
                            primary: needsReply
                        },
                        {
                            label: t('تفاصيل', 'Details'),
                            onclick: `openAccountingReceiptDetailModal(${JSON.stringify(e.id)})`
                        }
                    ]
                });
            }
        });
        return items;
    }

    function notificationCategoryLabel(cat) {
        if (cat === 'edit_request') return t('طلب تعديل / Edit request', 'Edit request / طلب تعديل');
        if (cat === 'renewal_request') return t('طلب تجديد مبكر / Early renewal', 'Early renewal / تجديد مبكر');
        if (cat === 'addressbook_edit') return t('تعديل دفتر العناوين / Address book', 'Address book edit / دفتر العناوين');
        if (cat === 'accounting') return t('اعتماد محاسبي / Accounting', 'Accounting approval / اعتماد محاسبي');
        if (cat === 'task') return t('مهمة / Task', 'Task / مهمة');
        if (cat === 'task_alert') return t('إشعار مهمة / Task alert', 'Task alert / إشعار مهمة');
        if (cat === 'alert') return t('تنبيه / Alert', 'Alert / تنبيه');
        if (cat === 'note') return t('ملاحظة / Note', 'Note / ملاحظة');
        if (cat === 'password_reset') return t('إعادة ضبط كلمة المرور / Password reset', 'Password reset / إعادة ضبط');
        return cat;
    }

    function openContractAdditionalDataByKey(building, unit) {
        const all = getUnitsData();
        window._unitsViewRows = all;
        const idx = all.findIndex(
            (u) => u.building === building && normalizeUnit(String(u.unit)) === normalizeUnit(String(unit))
        );
        if (idx < 0) {
            alert(t('لا توجد بيانات وحدة مطابقة.', 'No matching unit data.'));
            return;
        }
        openContractForAdditionalData(idx);
    }

    function collectSystemNotificationItems() {
        const items = [];
        const u = getLoggedInUser();
        const uid = u ? toStr(u.id) : '';
        const canApprove = canApproveContractEditRequests(u);
        const canAbApprove = canApproveAddressBookEditRequests(u);
        const canPwdAdmin = canManagePasswordResetRequests(u);
        const canContracts = effectivePermission('manage_contracts');
        const canDashboard = effectivePermission('manage_dashboard');

        loadAddressBookEditRequests().forEach((r) => {
            if (!r) return;
            const entryLabel = `${toStr(r.entryName) || '—'} — ${toStr(r.building)}/${toStr(r.unit)}`;
            if (r.status === 'pending' && canAbApprove) {
                items.push({
                    id: `ab-edit-req-${r.id}`,
                    category: 'addressbook_edit',
                    priority: 'high',
                    at: r.requestedAt,
                    title: t('طلب تعديل دفتر العناوين', 'Address book edit request'),
                    body: t(
                        `من ${toStr(r.requestedByName) || r.requestedBy} — ${entryLabel}${r.note ? ` — ${r.note}` : ''}`,
                        `From ${toStr(r.requestedByName) || r.requestedBy} — ${entryLabel}${r.note ? ` — ${r.note}` : ''}`
                    ),
                    searchText: `${r.entryName} ${r.building} ${r.unit} ${r.requestedByName} ${r.note || ''} addressbook`.toLowerCase(),
                    actions: [
                        {
                            label: t('منح تعديل / Grant', 'Grant / منح'),
                            onclick: `approveAddressBookEditRequest(${JSON.stringify(r.id)})`,
                            primary: true
                        },
                        {
                            label: t('فتح السجل / Open', 'Open record / فتح'),
                            onclick: `openAddressBookEditFromNotification(${JSON.stringify(r.entryKey)})`
                        },
                        {
                            label: t('رفض / Reject', 'Reject / رفض'),
                            onclick: `rejectAddressBookEditRequest(${JSON.stringify(r.id)})`
                        }
                    ]
                });
            }
            if (uid && toStr(r.requestedBy) === uid && r.status === 'pending') {
                items.push({
                    id: `ab-edit-req-mine-${r.id}`,
                    category: 'note',
                    priority: 'normal',
                    at: r.requestedAt,
                    title: t('طلب تعديل دفتر العناوين قيد المراجعة', 'Address book edit request pending'),
                    body: t(entryLabel, entryLabel),
                    searchText: `${r.entryName} pending addressbook`.toLowerCase(),
                    actions: [
                        {
                            label: t('فتح السجل / Open', 'Open record / فتح'),
                            onclick: `openAddressBookEditFromNotification(${JSON.stringify(r.entryKey)})`
                        }
                    ]
                });
            }
            if (uid && toStr(r.requestedBy) === uid && r.status !== 'pending') {
                const st =
                    r.status === 'approved'
                        ? t('موافق عليه — يمكنك التعديل الآن', 'Approved — you may edit now')
                        : t('مرفوض', 'Rejected');
                const rejectDetail = r.status === 'rejected' && toStr(r.rejectionNote)
                    ? t(`سبب الرفض: ${r.rejectionNote}`, `Rejection reason: ${r.rejectionNote}`)
                    : '';
                items.push({
                    id: `ab-edit-req-status-${r.id}`,
                    category: r.status === 'rejected' ? 'alert' : 'note',
                    priority: r.status === 'rejected' ? 'high' : 'normal',
                    at: r.resolvedAt || r.requestedAt,
                    title: t(`حالة طلب تعديل الدفتر — ${st}`, `Address book edit — ${st}`),
                    body: t(
                        `${entryLabel}${rejectDetail ? ` — ${rejectDetail}` : ''}`,
                        `${entryLabel}${rejectDetail ? ` — ${rejectDetail}` : ''}`
                    ),
                    searchText: `${r.entryName} ${r.status} ${r.rejectionNote || ''} addressbook`.toLowerCase(),
                    actions: [
                        {
                            label: t('فتح السجل / Open', 'Open record / فتح'),
                            onclick: `openAddressBookEditFromNotification(${JSON.stringify(r.entryKey)})`
                        }
                    ]
                });
            }
        });

        loadPasswordResetRequests().forEach((r) => {
            if (!r) return;
            if (r.status === 'pending' && canPwdAdmin) {
                items.push({
                    id: `pwd-req-${r.id}`,
                    category: 'password_reset',
                    priority: 'high',
                    at: r.requestedAt,
                    title: t('طلب إعادة ضبط كلمة المرور', 'Password reset request'),
                    body: t(
                        `${toStr(r.displayName)} — ${toStr(r.email)}${r.note ? ` — ${r.note}` : ''}`,
                        `${toStr(r.displayName)} — ${toStr(r.email)}${r.note ? ` — ${r.note}` : ''}`
                    ),
                    searchText: `${r.displayName} ${r.email} password reset ${r.note || ''}`.toLowerCase(),
                    actions: [
                        {
                            label: t('تعديل المستخدم / Edit user', 'Edit user / تعديل'),
                            onclick: `openUserEditForPasswordReset(${JSON.stringify(r.id)})`,
                            primary: true
                        },
                        {
                            label: t('تم الإرسال يدوياً / Sent manually', 'Sent manually / تم الإرسال'),
                            onclick: `resolvePasswordResetRequest(${JSON.stringify(r.id)})`
                        },
                        {
                            label: t('رفض / Reject', 'Reject / رفض'),
                            onclick: `rejectPasswordResetRequest(${JSON.stringify(r.id)})`
                        }
                    ]
                });
            }
            if (uid && toStr(r.userId) === uid && r.status === 'pending') {
                items.push({
                    id: `pwd-req-mine-${r.id}`,
                    category: 'note',
                    priority: 'normal',
                    at: r.requestedAt,
                    title: t('طلب إعادة ضبط كلمة المرور قيد المعالجة', 'Password reset request pending'),
                    body: t(
                        'سيغيّر مدير النظام كلمة المرور ويرسلها لك يدوياً.',
                        'The system administrator will set a new password and send it to you manually.'
                    ),
                    searchText: 'password reset pending'.toLowerCase(),
                    actions: []
                });
            }
            if (uid && toStr(r.userId) === uid && r.status === 'resolved') {
                items.push({
                    id: `pwd-req-done-${r.id}`,
                    category: 'note',
                    priority: 'normal',
                    at: r.resolvedAt || r.requestedAt,
                    title: t('تمت معالجة طلب كلمة المرور', 'Password reset request handled'),
                    body: t(
                        'تواصل مع المسؤول إن لم تستلم كلمة المرور الجديدة بعد.',
                        'Contact the administrator if you have not received the new password yet.'
                    ),
                    searchText: 'password reset resolved'.toLowerCase(),
                    actions: []
                });
            }
        });

        loadContractRenewalRequests().forEach((r) => {
            if (!r) return;
            const agr = toStr(r.agreementNo);
            const unitLabel = toStr(r.unitLabel) || `${r.buildingNo} / ${r.flatNo}`;
            const rem =
                r.remainingMonthsApprox != null ? Number(r.remainingMonthsApprox).toFixed(1) : '—';
            if (r.status === 'pending' && canApprove) {
                items.push({
                    id: `renew-req-${r.id}`,
                    category: 'renewal_request',
                    priority: 'high',
                    at: r.requestedAt,
                    title: t(`طلب تجديد مبكر — ${agr}`, `Early renewal — ${agr}`),
                    body: t(
                        `من ${toStr(r.requestedByName) || r.requestedBy} — ${unitLabel} — المتبقي ≈ ${rem} شهراً${r.note ? ` — ${r.note}` : ''}`,
                        `From ${toStr(r.requestedByName) || r.requestedBy} — ${unitLabel} — ≈ ${rem} month(s) left${r.note ? ` — ${r.note}` : ''}`
                    ),
                    searchText: `${agr} ${unitLabel} renewal ${r.note || ''}`.toLowerCase(),
                    actions: [
                        {
                            label: t('موافقة / Approve', 'Approve / موافقة'),
                            onclick: `approveContractRenewalRequest(${JSON.stringify(r.id)})`,
                            primary: true
                        },
                        {
                            label: t('رفض / Reject', 'Reject / رفض'),
                            onclick: `rejectContractRenewalRequest(${JSON.stringify(r.id)})`
                        },
                        {
                            label: t('تفاصيل الوحدة / Unit', 'Unit details / تفاصيل'),
                            onclick: `openUnitDetailsByKey(${JSON.stringify(r.buildingNo)}, ${JSON.stringify(r.flatNo)})`
                        }
                    ]
                });
            }
            if (uid && toStr(r.requestedBy) === uid && r.status === 'pending') {
                items.push({
                    id: `renew-req-mine-${r.id}`,
                    category: 'note',
                    priority: 'normal',
                    at: r.requestedAt,
                    title: t(`طلب تجديد مبكر قيد المراجعة — ${agr}`, `Early renewal pending — ${agr}`),
                    body: t(
                        `${unitLabel} — المتبقي ≈ ${rem} شهراً`,
                        `${unitLabel} — ≈ ${rem} month(s) remaining`
                    ),
                    searchText: `${agr} renewal pending`.toLowerCase(),
                    actions: [
                        {
                            label: t('تفاصيل الوحدة / Unit', 'Unit details / تفاصيل'),
                            onclick: `openUnitDetailsByKey(${JSON.stringify(r.buildingNo)}, ${JSON.stringify(r.flatNo)})`
                        }
                    ]
                });
            }
            if (uid && toStr(r.requestedBy) === uid && r.status !== 'pending') {
                const st =
                    r.status === 'approved'
                        ? t('موافق عليه — يمكنك التجديد', 'Approved — you may renew')
                        : t('مرفوض', 'Rejected');
                const rejectDetail =
                    r.status === 'rejected' && toStr(r.rejectionNote)
                        ? t(`سبب الرفض: ${r.rejectionNote}`, `Rejection: ${r.rejectionNote}`)
                        : '';
                items.push({
                    id: `renew-req-status-${r.id}`,
                    category: r.status === 'rejected' ? 'alert' : 'note',
                    priority: r.status === 'rejected' ? 'high' : 'normal',
                    at: r.resolvedAt || r.requestedAt,
                    title: t(`حالة طلب التجديد — ${st}`, `Renewal request — ${st}`),
                    body: t(
                        `عقد ${agr} — ${unitLabel}${rejectDetail ? ` — ${rejectDetail}` : ''}`,
                        `Contract ${agr} — ${unitLabel}${rejectDetail ? ` — ${rejectDetail}` : ''}`
                    ),
                    searchText: `${agr} renewal ${r.status}`.toLowerCase(),
                    actions: [
                        {
                            label: t('تفاصيل الوحدة / Unit', 'Unit details / تفاصيل'),
                            onclick: `openUnitDetailsByKey(${JSON.stringify(r.buildingNo)}, ${JSON.stringify(r.flatNo)})`
                        }
                    ]
                });
            }
        });

        loadContractEditRequests().forEach((r) => {
            if (!r) return;
            const agr = toStr(r.agreementNo) || getAgreementNoForSavedUnit(r.buildingNo, r.flatNo);
            const unitLabel = toStr(r.unitLabel) || `${r.buildingNo} / ${r.flatNo}`;
            const normReq = normalizeContractEditRequest({ ...r });
            const thread = Array.isArray(normReq.thread) ? normReq.thread : [];
            const lastMsg = thread.length ? thread[thread.length - 1] : null;
            const threadPreview = lastMsg ? toStr(lastMsg.text).slice(0, 120) : '';
            if (r.status === 'pending' && canApprove) {
                items.push({
                    id: `edit-req-${r.id}`,
                    category: 'edit_request',
                    priority: normReq.clarificationAwaitingFrom === 'admin' ? 'high' : 'high',
                    at: normReq.lastMessageAt || r.requestedAt,
                    title: t(`طلب تعديل عقد ${agr}`, `Edit request — contract ${agr}`),
                    body: t(
                        `من ${toStr(r.requestedByName) || r.requestedBy} — الوحدة ${unitLabel}${threadPreview ? ` — ${threadPreview}` : r.note ? ` — ${r.note}` : ''}`,
                        `From ${toStr(r.requestedByName) || r.requestedBy} — unit ${unitLabel}${threadPreview ? ` — ${threadPreview}` : r.note ? ` — ${r.note}` : ''}`
                    ),
                    searchText: `${agr} ${unitLabel} ${r.requestedByName} ${r.note || ''} ${threadPreview}`.toLowerCase(),
                    actions: [
                        {
                            label: t('منح تعديل / Grant', 'Grant / منح'),
                            onclick: `approveContractEditRequest(${JSON.stringify(r.id)})`,
                            primary: true
                        },
                        {
                            label: t('طلب تفاصيل إضافية / Ask details', 'Ask details / طلب تفاصيل'),
                            onclick: `requestContractEditClarification(${JSON.stringify(r.id)})`
                        },
                        {
                            label: t('عرض المحادثة / View thread', 'View thread / محادثة'),
                            onclick: `openContractEditRequestThreadModal(${JSON.stringify(r.id)})`
                        },
                        {
                            label: t('رفض / Reject', 'Reject / رفض'),
                            onclick: `rejectContractEditRequest(${JSON.stringify(r.id)})`
                        },
                        {
                            label: t('تفاصيل الوحدة / Unit', 'Unit details / تفاصيل'),
                            onclick: `openUnitDetailsByKey(${JSON.stringify(r.buildingNo)}, ${JSON.stringify(r.flatNo)})`
                        }
                    ]
                });
            }
            if (uid && toStr(r.requestedBy) === uid && r.status !== 'pending') {
                const st =
                    r.status === 'approved'
                        ? t('موافق عليه', 'Approved')
                        : t('مرفوض', 'Rejected');
                const rejectDetail = r.status === 'rejected' && toStr(r.rejectionNote)
                    ? t(`سبب الرفض: ${r.rejectionNote}`, `Rejection reason: ${r.rejectionNote}`)
                    : '';
                items.push({
                    id: `edit-req-status-${r.id}`,
                    category: r.status === 'rejected' ? 'alert' : 'note',
                    priority: r.status === 'rejected' ? 'high' : 'normal',
                    at: r.resolvedAt || r.requestedAt,
                    title: t(`حالة طلب التعديل — ${st}`, `Edit request status — ${st}`),
                    body: t(
                        `عقد ${agr} — ${unitLabel}${rejectDetail ? ` — ${rejectDetail}` : ''}`,
                        `Contract ${agr} — ${unitLabel}${rejectDetail ? ` — ${rejectDetail}` : ''}`
                    ),
                    searchText: `${agr} ${unitLabel} ${st} ${r.rejectionNote || ''}`.toLowerCase(),
                    actions: [
                        {
                            label: t('عرض المحادثة / View thread', 'View thread / محادثة'),
                            onclick: `openContractEditRequestThreadModal(${JSON.stringify(r.id)})`
                        },
                        {
                            label: t('تفاصيل الوحدة / Unit', 'Unit details / تفاصيل'),
                            onclick: `openUnitDetailsByKey(${JSON.stringify(r.buildingNo)}, ${JSON.stringify(r.flatNo)})`
                        }
                    ]
                });
            }
            if (uid && toStr(r.requestedBy) === uid && r.status === 'pending') {
                const needsReply = normReq.clarificationAwaitingFrom === 'requester';
                items.push({
                    id: `edit-req-mine-${r.id}`,
                    category: needsReply ? 'alert' : 'note',
                    priority: needsReply ? 'high' : 'normal',
                    at: normReq.lastMessageAt || r.requestedAt,
                    title: needsReply
                        ? t(`استفسار من المسؤول — عقد ${agr}`, `Administrator question — contract ${agr}`)
                        : t(`طلبك قيد المراجعة — عقد ${agr}`, `Your request is pending — contract ${agr}`),
                    body: t(
                        `الوحدة ${unitLabel}${threadPreview ? ` — ${threadPreview}` : r.note ? ` — ${r.note}` : ''}`,
                        `Unit ${unitLabel}${threadPreview ? ` — ${threadPreview}` : r.note ? ` — ${r.note}` : ''}`
                    ),
                    searchText: `${agr} ${unitLabel} pending ${threadPreview}`.toLowerCase(),
                    actions: [
                        ...(needsReply
                            ? [
                                {
                                    label: t('رد / Reply', 'Reply / رد'),
                                    onclick: `replyToContractEditClarification(${JSON.stringify(r.id)})`,
                                    primary: true
                                }
                            ]
                            : []),
                        {
                            label: t('عرض المحادثة / View thread', 'View thread / محادثة'),
                            onclick: `openContractEditRequestThreadModal(${JSON.stringify(r.id)})`
                        },
                        {
                            label: t('تفاصيل الوحدة / Unit', 'Unit details / تفاصيل'),
                            onclick: `openUnitDetailsByKey(${JSON.stringify(r.buildingNo)}, ${JSON.stringify(r.flatNo)})`
                        }
                    ]
                });
            }
        });

        if (canContracts || canDashboard) {
            getUnitsData().forEach((unit) => {
                const life = getContractLifecycleStateKey(unit);
                const b = toStr(unit.building);
                const un = toStr(unit.unit);
                const label = `${b} / ${un}`;
                if (life === 'active_pending' && canContracts) {
                    const agr = toStr(unit.agreementNo) || getAgreementNoForSavedUnit(b, un);
                    items.push({
                        id: `task-addl-${b}-${un}`,
                        category: 'task',
                        priority: 'high',
                        at: unit.contractSavedAt || '',
                        title: t('إكمال بيانات عقد إضافية', 'Complete additional contract data'),
                        body: t(`عقد ${agr} — ${label} — ${toStr(unit.tenant) || '—'}`, `Contract ${agr} — ${label} — ${toStr(unit.tenant) || '—'}`),
                        searchText: `${agr} ${label} ${unit.tenant} additional`.toLowerCase(),
                        actions: [
                            {
                                label: t('إكمال البيانات / Complete', 'Complete / إكمال'),
                                onclick: `openContractAdditionalDataByKey(${JSON.stringify(b)}, ${JSON.stringify(un)})`,
                                primary: true
                            },
                            {
                                label: t('تفاصيل الوحدة / Unit', 'Unit details / تفاصيل'),
                                onclick: `openUnitDetailsByKey(${JSON.stringify(b)}, ${JSON.stringify(un)})`
                            }
                        ]
                    });
                }
                if (life === 'active_docs_pending' && canContracts) {
                    const agr = toStr(unit.agreementNo) || getAgreementNoForSavedUnit(b, un);
                    items.push({
                        id: `task-pdocs-${b}-${un}`,
                        category: 'task',
                        priority: 'high',
                        at: unit.contractSavedAt || '',
                        title: t('إكمال البلدية والمستندات قبل التفعيل', 'Complete municipal refs & docs before activation'),
                        body: t(
                            `عقد ${agr} — ${label} — مطلوب: رقم استمارة العقد البلدي، رقم العقد البلدي، ورفع المستندات الكاملة`,
                            `Contract ${agr} — ${label} — required: municipal form no., municipal contract no., and full document upload`
                        ),
                        searchText: `${agr} ${label} ${unit.tenant} property documents scanner`.toLowerCase(),
                        actions: [
                            {
                                label: t('رفع الأوراق / Upload papers', 'Upload papers / رفع الأوراق'),
                                onclick: `openPropertyDocumentsBundleByKey(${JSON.stringify(b)}, ${JSON.stringify(un)})`,
                                primary: true
                            },
                            {
                                label: t('تفاصيل الوحدة / Unit', 'Unit details / تفاصيل'),
                                onclick: `openUnitDetailsByKey(${JSON.stringify(b)}, ${JSON.stringify(un)})`
                            }
                        ]
                    });
                }
                if (life === 'active_accounting_pending' && (canApproveAccountingEntry() || canContracts)) {
                    const agr = toStr(unit.agreementNo) || getAgreementNoForSavedUnit(b, un);
                    items.push({
                        id: `task-acct-rcpt-${b}-${un}`,
                        category: 'task',
                        priority: 'high',
                        at: unit.contractSavedAt || '',
                        title: t('اعتماد استلام الضمان والشيكات', 'Confirm deposit & cheque receipt'),
                        body: t(
                            `عقد ${agr} — ${label} — بانتظار اعتماد المحاسب على استلام الضمان وسلامة الشيكات`,
                            `Contract ${agr} — ${label} — awaiting accountant confirmation of deposit and cheques`
                        ),
                        searchText: `${agr} ${label} ${unit.tenant} accounting receipt`.toLowerCase(),
                        actions: [
                            {
                                label: t('المحاسبة / Accounting', 'Accounting / المحاسبة'),
                                onclick: `_accountingUiState.tab='pending'; setWorkspaceMode('accounting'); renderAccountingWorkspace();`,
                                primary: true
                            },
                            {
                                label: t('تفاصيل الوحدة / Unit', 'Unit details / تفاصيل'),
                                onclick: `openUnitDetailsByKey(${JSON.stringify(b)}, ${JSON.stringify(un)})`
                            }
                        ]
                    });
                }
                if (life === 'renewal_pending' && canContracts) {
                    const agr = toStr(unit.agreementNo) || getAgreementNoForSavedUnit(b, un);
                    items.push({
                        id: `task-renew-${b}-${un}`,
                        category: 'task',
                        priority: 'high',
                        at: '',
                        title: t('متابعة تجديد العقد — الشيكات', 'Continue contract renewal — cheques'),
                        body: t(`تجديد ${agr} — ${label} — ${toStr(unit.tenant) || '—'}`, `Renewal ${agr} — ${label} — ${toStr(unit.tenant) || '—'}`),
                        searchText: `${agr} ${label} ${unit.tenant} renewal`.toLowerCase(),
                        actions: [
                            {
                                label: t('متابعة التجديد / Continue renewal', 'Continue renewal / متابعة'),
                                onclick: `openContractRenewalFinancialByKey(${JSON.stringify(b)}, ${JSON.stringify(un)})`,
                                primary: true
                            },
                            {
                                label: t('تفاصيل الوحدة / Unit', 'Unit details / تفاصيل'),
                                onclick: `openUnitDetailsByKey(${JSON.stringify(b)}, ${JSON.stringify(un)})`
                            }
                        ]
                    });
                }
                if (unitDetailsIsIncompleteTenancyDraft(unit) && canContracts) {
                    items.push({
                        id: `task-draft-${b}-${un}`,
                        category: 'task',
                        priority: 'normal',
                        at: '',
                        title: t('استكمال مسودة تعاقد', 'Complete tenancy draft'),
                        body: t(`${label} — ${toStr(unit.tenant) || '—'}`, `${label} — ${toStr(unit.tenant) || '—'}`),
                        searchText: `${label} ${unit.tenant} draft`.toLowerCase(),
                        actions: [
                            {
                                label: t('تفاصيل الوحدة / Unit', 'Unit details / تفاصيل'),
                                onclick: `openUnitDetailsByKey(${JSON.stringify(b)}, ${JSON.stringify(un)})`,
                                primary: true
                            }
                        ]
                    });
                }
                if (life === 'reservation_draft' && canContracts) {
                    items.push({
                        id: `task-res-${b}-${un}`,
                        category: 'task',
                        priority: 'normal',
                        at: '',
                        title: t('حجز بانتظار التحويل لعقد', 'Reservation pending conversion'),
                        body: t(`${label} — ${toStr(unit.tenant) || '—'}`, `${label} — ${toStr(unit.tenant) || '—'}`),
                        searchText: `${label} ${unit.tenant} reservation`.toLowerCase(),
                        actions: [
                            {
                                label: t('صفحة الحجوزات / Reservations', 'Reservations / حجوزات'),
                                onclick: 'openReservationsWorkspace()',
                                primary: true
                            },
                            {
                                label: t('تفاصيل الوحدة / Unit', 'Unit details / تفاصيل'),
                                onclick: `openUnitDetailsByKey(${JSON.stringify(b)}, ${JSON.stringify(un)})`
                            }
                        ]
                    });
                }
                const days = daysUntil(unit.endDate);
                if (
                    canDashboard &&
                    toStr(unit.status).toLowerCase() === 'rented' &&
                    days !== null &&
                    days >= 0 &&
                    days <= 90
                ) {
                    items.push({
                        id: `alert-exp-${b}-${un}`,
                        category: 'alert',
                        priority: days <= 30 ? 'high' : 'normal',
                        at: unit.endDate || '',
                        title: t(`عقد ينتهي خلال ${days} يوم`, `Contract expires in ${days} days`),
                        body: t(
                            `${label} — عقد ${toStr(unit.agreementNo) || '—'} — ${toStr(unit.tenant) || '—'}`,
                            `${label} — contract ${toStr(unit.agreementNo) || '—'} — ${toStr(unit.tenant) || '—'}`
                        ),
                        searchText: `${label} ${unit.agreementNo} ${unit.tenant} expire`.toLowerCase(),
                        actions: [
                            {
                                label: t('تفاصيل الوحدة / Unit', 'Unit details / تفاصيل'),
                                onclick: `openUnitDetailsByKey(${JSON.stringify(b)}, ${JSON.stringify(un)})`,
                                primary: true
                            }
                        ]
                    });
                }
            });
        }

        if (uid) {
            collectTaskUserAlertNotificationItems(uid).forEach((it) => items.push(it));
            collectRegistryTaskNotificationItems(uid).forEach((it) => items.push(it));
        }

        collectAccountingApprovalNotificationItems().forEach((it) => items.push(it));

        return items.sort((a, b) => {
            const pri = { high: 0, normal: 1, low: 2 };
            const pd = (pri[a.priority] || 9) - (pri[b.priority] || 9);
            if (pd !== 0) return pd;
            return toStr(b.at).localeCompare(toStr(a.at));
        });
    }

    function getNotificationsBadgeCount() {
        return collectSystemNotificationItems().filter(
            (it) =>
                it.priority === 'high' ||
                it.category === 'edit_request' ||
                it.category === 'renewal_request' ||
                it.category === 'password_reset' ||
                it.category === 'task_alert' ||
                (it.category === 'task' && toStr(it.id).startsWith('registry-task-'))
        ).length;
    }

    function updateNotificationsNavBadge() {
        const btn = document.getElementById('navNotificationsBtn');
        if (!btn) return;
        const count = getNotificationsBadgeCount();
        const baseAr = '🔔 التنبيهات';
        const baseEn = '🔔 Notifications';
        btn.innerHTML = count > 0
            ? `${t(baseAr, baseEn)}<span class="nav-notify-badge">${count}</span>`
            : t(baseAr, baseEn);
    }

    function setNotificationsCategory(cat) {
        notificationsPageState.category = cat || 'all';
        renderNotificationsPage();
    }

    function setNotificationsSort(key) {
        if (notificationsPageState.sortKey === key) {
            notificationsPageState.sortDir = notificationsPageState.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            notificationsPageState.sortKey = key;
            notificationsPageState.sortDir = 'desc';
        }
        renderNotificationsPage();
    }

    function getFilteredNotificationItems() {
        const allItems = collectSystemNotificationItems();
        const q = toStr(notificationsPageState.search).toLowerCase();
        const cat = notificationsPageState.category;
        let filtered = allItems.filter((it) => {
            if (cat !== 'all' && it.category !== cat) return false;
            if (q && !it.searchText.includes(q) && !toStr(it.title).toLowerCase().includes(q) && !toStr(it.body).toLowerCase().includes(q)) {
                return false;
            }
            return true;
        });
        const sk = notificationsPageState.sortKey;
        const sd = notificationsPageState.sortDir === 'asc' ? 1 : -1;
        return filtered.slice().sort((a, b) => {
            if (sk === 'category') return sd * toStr(a.category).localeCompare(toStr(b.category));
            if (sk === 'priority') {
                const pri = { high: 0, normal: 1, low: 2 };
                return sd * ((pri[a.priority] || 9) - (pri[b.priority] || 9));
            }
            return sd * toStr(a.at).localeCompare(toStr(b.at));
        });
    }

    function buildNotificationRowsHtml(filtered) {
        if (!filtered.length) {
            return `<p style="margin:0;padding:16px 0;text-align:center;color:#666;font-size:13px">${t('لا توجد عناصر مطابقة / No matching items', 'No matching items / لا توجد عناصر مطابقة')}</p>`;
        }
        return filtered
            .map((it) => {
                const priClass = it.priority === 'high' ? 'notification-row-priority-high' : 'notification-row-priority-normal';
                const actions = (it.actions || [])
                    .map(
                        (a) =>
                            `<button type="button" class="${a.primary ? 'btn-primary' : 'btn-outline'} mini-btn" onclick='${String(a.onclick).replace(/'/g, "\\'")}'>${escHtml(a.label)}</button>`
                    )
                    .join('');
                const when = toStr(it.at).slice(0, 19).replace('T', ' ') || '—';
                return `
                <div class="notification-row ${priClass}">
                    <div style="flex:1;min-width:220px;font-size:12px;line-height:1.55">
                        <span class="notification-cat-badge notification-cat-${escHtml(it.category)}">${escHtml(notificationCategoryLabel(it.category))}</span><br>
                        <strong style="font-size:13px">${escHtml(it.title)}</strong><br>
                        <span style="color:#555">${escHtml(it.body)}</span>
                    </div>
                    <div style="font-size:11px;color:#666;min-width:120px">${escHtml(when)}</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start">${actions}</div>
                </div>
            `;
            })
            .join('');
    }

    function updateNotificationsListOnly() {
        const listHost = document.getElementById('notificationsListBody');
        if (!listHost) {
            renderNotificationsPage();
            return;
        }
        listHost.innerHTML = buildNotificationRowsHtml(getFilteredNotificationItems());
    }

    function renderNotificationsPage() {
        const host = document.getElementById('notificationsPanelHost');
        if (!host) return;
        updateNotificationsNavBadge();
        if (!canAccessNotificationsPage()) {
            host.innerHTML = `
                <div class="insight-nested" style="padding:16px;border:1px solid #e8c4c4;background:#fff8f8;border-radius:10px">
                    <p style="margin:0 0 8px;font-weight:700">${t('تسجيل الدخول مطلوب / Sign-in required', 'Sign-in required / تسجيل الدخول مطلوب')}</p>
                    <p style="font-size:13px;color:#444;margin:0">${t('سجّل الدخول لعرض التنبيهات والمهام.', 'Sign in to view notifications and tasks.')}</p>
                    <button type="button" class="btn-primary" style="margin-top:12px" onclick="openAuthLoginModal()">${t('تسجيل الدخول / Sign in', 'Sign in / تسجيل الدخول')}</button>
                </div>
            `;
            return;
        }

        const allItems = collectSystemNotificationItems();
        const cat = notificationsPageState.category;
        const counts = {
            all: allItems.length,
            edit_request: allItems.filter((x) => x.category === 'edit_request').length,
            renewal_request: allItems.filter((x) => x.category === 'renewal_request').length,
            password_reset: allItems.filter((x) => x.category === 'password_reset').length,
            accounting: allItems.filter((x) => x.category === 'accounting').length,
            task: allItems.filter((x) => x.category === 'task').length,
            alert: allItems.filter((x) => x.category === 'alert').length,
            note: allItems.filter((x) => x.category === 'note').length
        };
        const filtered = getFilteredNotificationItems();
        const view = notificationsPageState.view || 'alerts';

        let mainBody = '';
        if (view === 'tasks') {
            syncAllAutoTasksIfStale();
            const tasks = getFilteredRegistryTasks();
            mainBody = `
                <div class="accounting-filter-panel" style="margin-bottom:10px">
                    <input type="search" placeholder="${t('بحث في المهام... / Search tasks...', 'Search tasks... / بحث')}" value="${escHtml(_tasksUiState.search)}" oninput="_tasksUiState.search=this.value; renderTasksRegistryPanelIfVisible()" style="min-width:200px">
                    <select onchange="_tasksUiState.team=this.value; renderTasksRegistryPanelIfVisible()">
                        <option value="all">${t('كل الفرق', 'All teams')}</option>
                        <option value="admin" ${_tasksUiState.team === 'admin' ? 'selected' : ''}>${t('الإدارة', 'Admin')}</option>
                        <option value="maintenance" ${_tasksUiState.team === 'maintenance' ? 'selected' : ''}>${t('الصيانة', 'Maintenance')}</option>
                        <option value="accounting" ${_tasksUiState.team === 'accounting' ? 'selected' : ''}>${t('المحاسبة', 'Accounting')}</option>
                    </select>
                    <select onchange="_tasksUiState.status=this.value; renderTasksRegistryPanelIfVisible()">
                        <option value="open" ${_tasksUiState.status === 'open' ? 'selected' : ''}>${t('مفتوحة', 'Open')}</option>
                        <option value="completed" ${_tasksUiState.status === 'completed' ? 'selected' : ''}>${t('مكتملة', 'Completed')}</option>
                        <option value="all" ${_tasksUiState.status === 'all' ? 'selected' : ''}>${t('الكل', 'All')}</option>
                    </select>
                    <button type="button" class="btn-primary mini-btn" onclick="openTaskCreateModal()">${t('مهمة جديدة / New task', 'New task / مهمة جديدة')}</button>
                    <button type="button" class="btn-outline mini-btn" onclick="syncAllAutoTasks(); renderNotificationsPage()">${t('تحديث المهام / Refresh tasks', 'Refresh tasks / تحديث')}</button>
                    ${isMaintenanceSystemAdmin() ? `<button type="button" class="btn-outline mini-btn" onclick="openTaskSettingsModal()">${t('إعدادات / Settings', 'Settings / إعدادات')}</button>` : ''}
                </div>
                <div id="tasksRegistryListBody">${buildTaskRowsHtml(tasks)}</div>`;
        } else if (view === 'calendar') {
            mainBody = `<div class="bhd-calendar-panel" style="margin:0;border:none;background:transparent;padding:0">${buildBhdCalendarHtml('admin')}</div>`;
        } else {
            mainBody = `
            <div class="notifications-summary" id="notificationsSummaryBar">
                <span class="notifications-summary-chip">${t('الكل', 'All')}: <strong>${counts.all}</strong></span>
                <span class="notifications-summary-chip">${t('طلبات تعديل', 'Edit req.')}: <strong>${counts.edit_request}</strong></span>
                <span class="notifications-summary-chip">${t('تجديد مبكر', 'Renewal')}: <strong>${counts.renewal_request}</strong></span>
                <span class="notifications-summary-chip">${t('كلمات المرور', 'Passwords')}: <strong>${counts.password_reset}</strong></span>
                <span class="notifications-summary-chip">${t('المحاسبة', 'Accounting')}: <strong>${counts.accounting}</strong></span>
                <span class="notifications-summary-chip">${t('مهام', 'Tasks')}: <strong>${counts.task}</strong></span>
                <span class="notifications-summary-chip">${t('تنبيهات', 'Alerts')}: <strong>${counts.alert}</strong></span>
                <span class="notifications-summary-chip">${t('ملاحظات', 'Notes')}: <strong>${counts.note}</strong></span>
            </div>
            <div class="notifications-toolbar">
                <input id="notificationsSearchInput" placeholder="${t('بحث في التنبيهات والمهام... / Search notifications...', 'Search notifications... / بحث...')}" value="${escHtml(notificationsPageState.search)}" style="min-width:260px;padding:8px 10px;border-radius:8px;border:1px solid #ced8df;font-family:'Tajawal',sans-serif">
                <select id="notificationsCategorySelect" style="padding:8px 10px;border-radius:8px;border:1px solid #ced8df;font-family:'Tajawal',sans-serif">
                    <option value="all" ${cat === 'all' ? 'selected' : ''}>${t('كل الأنواع / All types', 'All types / كل الأنواع')}</option>
                    <option value="edit_request" ${cat === 'edit_request' ? 'selected' : ''}>${t('طلبات التعديل / Edit requests', 'Edit requests / طلبات')}</option>
                    <option value="renewal_request" ${cat === 'renewal_request' ? 'selected' : ''}>${t('تجديد مبكر / Early renewal', 'Early renewal / تجديد مبكر')}</option>
                    <option value="password_reset" ${cat === 'password_reset' ? 'selected' : ''}>${t('إعادة ضبط كلمة المرور / Password reset', 'Password reset / كلمة المرور')}</option>
                    <option value="accounting" ${cat === 'accounting' ? 'selected' : ''}>${t('اعتماد محاسبي / Accounting', 'Accounting approval / محاسبة')}</option>
                    <option value="task" ${cat === 'task' ? 'selected' : ''}>${t('مهام / Tasks', 'Tasks / مهام')}</option>
                    <option value="alert" ${cat === 'alert' ? 'selected' : ''}>${t('تنبيهات / Alerts', 'Alerts / تنبيهات')}</option>
                    <option value="note" ${cat === 'note' ? 'selected' : ''}>${t('ملاحظات / Notes', 'Notes / ملاحظات')}</option>
                </select>
                <button type="button" class="btn-outline mini-btn" onclick="renderNotificationsPage()">${t('تحديث / Refresh', 'Refresh / تحديث')}</button>
            </div>
            <div class="edit-requests-panel" style="margin-bottom:0">
                <div style="display:flex;flex-wrap:wrap;gap:12px;padding-bottom:8px;border-bottom:1px solid #e8edf2;font-size:12px;font-weight:700;color:#445">
                    <span class="sort-head" style="cursor:pointer" onclick="setNotificationsSort('category')">${t('النوع / Type', 'Type / النوع')} ${notificationsPageState.sortKey === 'category' ? (notificationsPageState.sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                    <span style="flex:1;min-width:180px">${t('التفاصيل / Details', 'Details / التفاصيل')}</span>
                    <span class="sort-head" style="cursor:pointer;min-width:120px" onclick="setNotificationsSort('at')">${t('التاريخ / Date', 'Date / التاريخ')} ${notificationsPageState.sortKey === 'at' ? (notificationsPageState.sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                    <span style="min-width:140px">${t('إجراءات / Actions', 'Actions / إجراءات')}</span>
                </div>
                <div id="notificationsListBody">${buildNotificationRowsHtml(filtered)}</div>
            </div>`;
        }

        host.innerHTML = `
            <div class="bhd-tasks-view-tabs">
                <button type="button" class="btn-outline${view === 'alerts' ? ' active' : ''}" onclick="setTasksRegistryView('alerts')">${t('التنبيهات / Alerts', 'Alerts / تنبيهات')}</button>
                <button type="button" class="btn-outline${view === 'tasks' ? ' active' : ''}" onclick="setTasksRegistryView('tasks')">${t('سجل المهام / Tasks', 'Tasks registry / مهام')}</button>
                <button type="button" class="btn-outline${view === 'calendar' ? ' active' : ''}" onclick="setTasksRegistryView('calendar')">${t('التقويم / Calendar', 'Calendar / تقويم')}</button>
            </div>
            ${mainBody}
        `;

        if (view === 'alerts') {
            const searchEl = document.getElementById('notificationsSearchInput');
            if (searchEl) {
                searchEl.addEventListener('input', () => {
                    notificationsPageState.search = searchEl.value;
                    updateNotificationsListOnly();
                });
            }
            const catEl = document.getElementById('notificationsCategorySelect');
            if (catEl) {
                catEl.addEventListener('change', () => setNotificationsCategory(catEl.value));
            }
        }
    }

    function refreshNotificationsIfVisible() {
        try {
            updateNotificationsNavBadge();
            if (document.body.classList.contains('mode-notifications')) {
                renderNotificationsPage();
            }
        } catch (_eRef) {}
    }

