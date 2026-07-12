                const buildingCheck = validateBuildingProfileComplete({ ...bp, name: bp.name || resolvedBuildingKey });
                if (!buildingCheck.ok) {
                    extractValidationBullets(buildingCheck.message).forEach((line) => {
                        gaps.push({
                            text: `${t('العقار', 'Property')}: ${line}`,
                            fixText: t('استكمال بيانات العقار', 'Complete property data'),
                            action: { type: 'building', key: resolvedBuildingKey }
                        });
                    });
                }
            }

            const linkedOwners = getOwnerNamesForBuilding(resolvedBuildingKey);
            if (!linkedOwners.length) {
                gaps.push({
                    text: t('لا يوجد مالك مربوط بهذا العقار.', 'No owner linked to this property.'),
                    fixText: t('فتح شاشة الملاك', 'Open owners page'),
                    action: { type: 'ownersList' }
                });
            } else {
                linkedOwners.forEach((ownerName) => {
                    const profile = getEditableOwnerProfile(ownerName);
                    if (isReservationMode) {
                        if (!toStr(profile.fullName) && !toStr(profile.fullNameEn)) {
                            gaps.push({
                                text: `${t('المالك', 'Owner')} (${ownerName}): ${t('الاسم', 'Name')} ${t('ناقص', 'Missing')}`,
                                fixText: t('استكمال بيانات المالك', 'Complete owner data'),
                                action: { type: 'owner', key: ownerName }
                            });
                        }
                        if (!toStr(profile.civilId)) {
                            gaps.push({
                                text: `${t('المالك', 'Owner')} (${ownerName}): ${t('الرقم المدني', 'Civil ID')} ${t('ناقص', 'Missing')}`,
                                fixText: t('استكمال بيانات المالك', 'Complete owner data'),
                                action: { type: 'owner', key: ownerName }
                            });
                        }
                    } else {
                        const ownerCheck = validateOwnerProfileComplete(profile);
                        if (!ownerCheck.ok) {
                            extractValidationBullets(ownerCheck.message).forEach((line) => {
                                gaps.push({
                                    text: `${t('المالك', 'Owner')} (${ownerName}): ${line}`,
                                    fixText: t('استكمال بيانات المالك', 'Complete owner data'),
                                    action: { type: 'owner', key: ownerName }
                                });
                            });
                        }
                    }
                });
            }
        }

        prepareTenantAddressBookForContractValidation();
        const { entry: tenantEntry, index: tenantIdx } = getEffectiveTenantEntryForContractValidation(d);
        if (!tenantEntry) {
            gaps.push({
                text: t('المستأجر غير موجود في دفتر العناوين.', 'Tenant not found in address book.'),
                fixText: t('إضافة مستأجر جديد', 'Add new tenant'),
                action: { type: 'newTenant' }
            });
        } else {
            const tenantIssues = isReservationMode
                ? getAddressBookIssuesForReservation(tenantEntry)
                : getAddressBookIssues(tenantEntry, { contractBuilding: building, contractUnit: unit });
            tenantIssues.forEach((issue) => {
                gaps.push({
                    text: `${t('المستأجر', 'Tenant')} (${toStr(tenantEntry.name)}): ${issue}`,
                    fixText: t('استكمال بيانات المستأجر', 'Complete tenant data'),
                    action: { type: 'tenant', index: tenantIdx }
                });
            });
        }

        if (building && unit) {
            const matchedUnit = getUnitRecordByBuildingUnit(building, unit);
            if (!matchedUnit) {
                gaps.push({
                    text: t('الوحدة المختارة غير موجودة في بيانات النظام.', 'Selected unit is not found in system data.'),
                    fixText: t('فتح بيانات العقارات', 'Open properties'),
                    action: { type: 'building', key: resolveBuildingProfileKey(building) || building }
                });
            }
        }

        return gaps;
    }

    function openDataGapFix(index) {
        const item = contractDataGapFixes[index];
        if (!item) return;
        if (isReservationsWorkspaceScreenActive()) {
            upsertReservationFromCurrentForm({ asDraft: true, allowIncomplete: true });
            saveDashboardAux();
        }
        const action = item.action || {};
        closeDataGapsModal();
        if (action.type === 'building') {
            openDashboardWorkspace();
            openDashboardInsight('buildings');
            openBuildingEditor(action.key || '');
            return;
        }
        if (action.type === 'owner') {
            openDashboardWorkspace();
            openDashboardInsight('owners');
            openOwnerEditor(action.key || '');
            return;
        }
        if (action.type === 'ownersList') {
            openDashboardWorkspace();
            openDashboardInsight('owners');
            return;
        }
        if (action.type === 'tenant') {
            openAddressBookWorkspace();
            openAddressBookEntryModal('edit', Number(action.index));
            return;
        }
        if (action.type === 'newTenant') {
            openAddressBookWorkspace();
            openAddressBookEntryModal('add', -1);
            const typeSel = document.getElementById('abType');
            if (typeSel) typeSel.value = 'tenant';
            const fd = typeof getFormData === 'function' ? getFormData() : {};
            const es = document.getElementById('abEntityType');
            if (es) {
                es.value = toStr(fd.tenantEntityType) === 'company' ? 'company' : 'person';
                try { syncAddressBookPersonCompanyShell(); } catch (e2) {}
            }
            syncAddressBookFormRules();
        }
    }

    async function ensureRelatedDataCompletenessAsync() {
        try {
            ensurePartyInAddressBookFromFormData();
        } catch (_eEnsureParty) {}
        if (bhdSiteFileStorageAvailable()) {
            try {
                await repairAddressBookEntriesAttachmentsFromSite();
            } catch (_eRepSiteVal) {}
        }
        try {
            prepareTenantAddressBookForContractValidation();
        } catch (_ePrepAbVal) {}
        const gaps = collectContractRelatedDataGaps();
        if (!gaps.length) return true;
        contractDataGapFixes = gaps;
        const host = document.getElementById('dataGapsBody');
        if (!host) return false;
        host.innerHTML = `
            <p style="font-size:13px;margin:0 0 10px">${t('يرجى استكمال البيانات التالية أولاً:', 'Please complete the following data first:')}</p>
            <div style="display:flex;flex-direction:column;gap:8px">
                ${gaps.map((g, i) => `
                    <div style="border:1px solid #dde5eb;border-radius:10px;padding:10px;background:#fafcfe;display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
                        <div style="font-size:12px;line-height:1.6">${escHtml(g.text)}</div>
                        <button type="button" class="mini-btn" onclick="openDataGapFix(${i})">${escHtml(g.fixText)}</button>
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('dataGapsModal')?.classList.add('open');
        localizeBilingualUi();
        return false;
    }

    function ensureRelatedDataCompleteness() {
        try {
            ensurePartyInAddressBookFromFormData();
        } catch (_eEnsureParty) {}
        try {
            prepareTenantAddressBookForContractValidation();
        } catch (_ePrepAb) {}
        const gaps = collectContractRelatedDataGaps();
        if (!gaps.length) return true;
        contractDataGapFixes = gaps;
        const host = document.getElementById('dataGapsBody');
        if (!host) return false;
        host.innerHTML = `
            <p style="font-size:13px;margin:0 0 10px">${t('يرجى استكمال البيانات التالية أولاً:', 'Please complete the following data first:')}</p>
            <div style="display:flex;flex-direction:column;gap:8px">
                ${gaps.map((g, i) => `
                    <div style="border:1px solid #dde5eb;border-radius:10px;padding:10px;background:#fafcfe;display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
                        <div style="font-size:12px;line-height:1.6">${escHtml(g.text)}</div>
                        <button type="button" class="mini-btn" onclick="openDataGapFix(${i})">${escHtml(g.fixText)}</button>
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('dataGapsModal')?.classList.add('open');
        localizeBilingualUi();
        return false;
    }

    function validateContractMeterReadingsOrAlert(d) {
        if (!isContractsWorkspaceScreenActive()) return true;
        const data = d && typeof d === 'object' ? d : getFormData();
        if (!toStr(data.electricityMeterReading).trim()) {
            alert(
                t(
                    '⚠️ قراءة عداد الكهرباء مطلوبة في شاشة العقود.',
                    '⚠️ Electricity meter reading is required in the contracts workspace.'
                )
            );
            try {
                document.getElementById('electricityMeterReading')?.focus();
            } catch (_eF1) {}
            return false;
        }
        if (!toStr(data.waterMeterReading).trim()) {
            alert(
                t(
                    '⚠️ قراءة عداد الماء مطلوبة في شاشة العقود.',
                    '⚠️ Water meter reading is required in the contracts workspace.'
                )
            );
            try {
                document.getElementById('waterMeterReading')?.focus();
            } catch (_eF2) {}
            return false;
        }
        if (!payloadHasContractMeterReadingAttachment(data, 'electricity')) {
            alert(
                t(
                    '⚠️ صورة قراءة عداد الكهرباء مطلوبة.',
                    '⚠️ Electricity meter reading photo is required.'
                )
            );
            try {
                document.getElementById('electricityMeterReadingAttachmentInput')?.click();
            } catch (_eF3) {}
            return false;
        }
        if (!payloadHasContractMeterReadingAttachment(data, 'water')) {
            alert(
                t(
                    '⚠️ صورة قراءة عداد الماء مطلوبة.',
                    '⚠️ Water meter reading photo is required.'
                )
            );
            try {
                document.getElementById('waterMeterReadingAttachmentInput')?.click();
            } catch (_eF4) {}
            return false;
        }
        return true;
    }

    async function validateCoreData() {
        const isReservationMode = isReservationsWorkspaceScreenActive();
        if (isReservationMode) {
            try { refreshReservationFinancialCalculations(); } catch (_eGraceVal) {}
        } else {
            try { refreshContractFinancialCalculations(); } catch (_eFinVal) {}
        }
        const d = isReservationMode ? getReservationFormData() : getFormData();
        const isCoTenantCore = toStr(d.tenantEntityType) === 'company';
        const tenantNameOk = isCoTenantCore
            ? !!(toStr(d.tenantNameAr) || toStr(d.tenantNameEn) || toStr(d.tenantCommercialRegNo))
            : !!(toStr(d.tenantNameAr) || toStr(d.tenantNameEn));
        if (!d.agreementNo || !tenantNameOk || !d.buildingNo || !d.flatNo) {
            alert(t(
                '⚠️ يرجى تعبئة الحقول الأساسية: رقم العقد أو الحجز، اسم المستأجر أو السجل التجاري للشركة، المبنى، ورقم الوحدة.',
                '⚠️ Please fill: agreement/reservation no., tenant or company CR name, building, and unit.'
            ));
            return false;
        }
        if (isReservationMode) {
            if (!validateReservationTenantAddressBookCompleteOrAlert(d)) return false;
            if (!toStr(d.tenantMobile)) {
                alert(t('⚠️ لا يمكن إكمال الحجز بدون رقم جوال المستأجر.', '⚠️ Reservation cannot be completed without tenant mobile number.'));
                return false;
            }
            if (toStr(d.tenantEntityType) === 'company') {
                if (!toStr(d.tenantCommercialRegNo)) {
                    alert(t('⚠️ لا يمكن إكمال حجز شركة بدون رقم السجل التجاري.', '⚠️ Cannot complete a company reservation without commercial registration (CR) number.'));
                    return false;
                }
            } else if (!toStr(d.tenantId)) {
                alert(t('⚠️ لا يمكن إكمال الحجز بدون الرقم المدني للمستأجر (شخص).', '⚠️ Reservation cannot be completed without tenant civil ID (person).'));
                return false;
            }
        } else if (!assertContractRequiresReservationOrDraftOrActiveLease(d.buildingNo, d.flatNo)) {
            return false;
        }
        if (!validateGraceHandoverConsistencyOrAlert(d)) return false;
        if (!isReservationMode && !validateContractMeterReadingsOrAlert(d)) return false;
        if (!(await ensureRelatedDataCompletenessAsync())) return false;
        if (!d.startDate || !d.endDate) {
            alert('⚠️ يرجى تعبئة تاريخ بداية ونهاية العقد.');
            return false;
        }
        if (new Date(d.endDate) < new Date(d.startDate)) {
            alert('⚠️ تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية.');
            return false;
        }
        if ((parseFloat(d.monthlyRent) || 0) <= 0) {
            alert('⚠️ الإيجار الشهري يجب أن يكون أكبر من صفر.');
            return false;
        }
        if (!validateContractMandatoryDocumentsOrAlert()) return false;
        return true;
    }
    
    function createHeader() {
        return buildOrganizationHeaderHtml({ editable: true });
    }

    /** قالب طباعة الاستمارات الرسمية فقط — بدون إيصال مالي ولا مرفقات / Official form print shell only */
    function documentShellForFormPrint(bodyHtml, formData) {
        const footerHtml = buildContractPrintFooterHtml(formData || getFormData());
        return `
            <table class="doc-print-frame" role="presentation">
                <thead>
                    <tr>
                        <td class="doc-print-thead-cell">${createHeader()}</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="doc-print-tbody-cell">${bodyHtml}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td class="doc-print-tfoot-cell">${footerHtml}</td>
                    </tr>
                </tfoot>
            </table>
        `;
    }

    /** يلف المحتوى في جدول ليتكرر الهيدر في كل صفحة عند الطباعة متعددة الصفحات */
    function documentShell(bodyHtml) {
        let receiptHtml = '';
        let attachmentsHtml = '';
        try {
            receiptHtml = buildContractFinancialReceiptHtml();
        } catch (_eRcptShell) {}
        try {
            attachmentsHtml = buildContractAttachmentsSectionHtml();
        } catch (_eAttShell) {}
        const footerHtml = buildContractPrintFooterHtml(getFormData());
        return `
            <table class="doc-print-frame" role="presentation">
                <thead>
                    <tr>
                        <td class="doc-print-thead-cell">${createHeader()}</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="doc-print-tbody-cell">${bodyHtml}${receiptHtml}${attachmentsHtml}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td class="doc-print-tfoot-cell">${footerHtml}</td>
                    </tr>
                </tfoot>
            </table>
        `;
    }
    
    // المستند 01 - Residential (كامل)
    function renderResidential() {
        let d = getFormData();
        let municipal = calcMunicipalFees();
        const periodLabel = formatContractPeriodBilingual(d.startDate, d.endDate, d.contractMonths);
        return `
            <div class="doc-title">
                <h2>تأجير وحدة ( مستند رقم 1 )</h2>
                <h3>RENT A UNIT (Documents No 1)</h3>
            </div>
            <table class="info-table">
                <tr><th>النوع / Type</th><td colspan="3" contenteditable="true">${d.type}</td><th>رقم العقد / Agreement No.:</th><td colspan="3" contenteditable="true">${d.agreementNo}</td></tr>
                <tr><th>نوع العقد / Contract Type</th><td colspan="7" contenteditable="true">${d.contractType}</td></tr>
            </table>
            <div class="section-header">بيانات المؤجر (الطرف الأول) / Landlord Details (First Party)</div>
            <table class="info-table"><tr><th>الاسم / Name:</th><td colspan="7" contenteditable="true">سيد فياض بن علي - Syed Fayyaz ali</td></tr></table>
            <div class="section-header">بيانات المستأجر (الطرف الثاني) / Tenant Details (Second Party)</div>
            <table class="info-table">
                <tr><th>أسم المستأجر / Name:</th><td colspan="7" contenteditable="true">${d.tenantNameAr}</td></tr>
                <tr><th>الرقم المدني / الرقم المدني / ID No.:</th><td colspan="3" contenteditable="true">${d.tenantId}</td><th>رقم الجواز / Passport number:</th><td colspan="3" contenteditable="true">${d.tenantPassport}</td></tr>
                <tr><th>رقم النقال / Mobile No:</th><td colspan="3" contenteditable="true">${d.tenantMobile}</td><th>رقم الهاتف البديل / Alternative phone number:</th><td colspan="3" contenteditable="true"></td></tr>
                <tr><th>البريد الإلكتروني / E-mail :</th><td colspan="7" contenteditable="true">${d.tenantEmail}</td></tr>
            </table>
            <div class="section-header">بيانات العقار المستأجر / Property Details</div>
            <table class="info-table">
                <tr><th>رقم المبنى / Building No.:</th><td colspan="3" contenteditable="true">${d.buildingNo}</td><th>الوحدة / Unit (Flat,Office,Shop)</th><td colspan="3" contenteditable="true">${d.unitType}</td></tr>
                <tr><th>تفاصيل الطابق / Floor Details</th><td colspan="3" contenteditable="true">${d.floorDetails}</td><th>رقم الشقة/المحل / Flat/Shop no :</th><td colspan="3" contenteditable="true">${d.flatNo}</td></tr>
                <tr><th>رقم عداد الكهرباء / Electricity Meter Number</th><td colspan="3" contenteditable="true">${d.electricityMeter}</td><th>رقم عداد الماء / Water Meter Number</th><td colspan="3" contenteditable="true">${d.waterMeter}</td></tr>
            </table>
            <div class="section-header">مدة العقد والقيمة الإيجارية / Agreement Period & Rental Value</div>
            <table class="info-table">
                <tr><th>القيمة الإيجارية الشهرية / Monthly Rental Amount :</th><td colspan="3" contenteditable="true">${d.monthlyRent}</td><th>مدة العقد / Contract period :</th><td colspan="3" contenteditable="true">${periodLabel}</td></tr>
                <tr><th>رسوم البلدية / Municipal fees</th><td colspan="3" contenteditable="true">${municipal}</td><th>طريقة الدفع / Payment Method</th><td colspan="3" contenteditable="true">${d.paymentMethod}</td></tr>
                <tr><th>الضمان / Security</th><td colspan="3" contenteditable="true">تحويل بنكي Bank transfer</td><th>رقم الشيك أو الإيصال / check or receipt number</th><td colspan="3" contenteditable="true">4355</td></tr>
                <tr><th>مبلغ المودع / Deposit amount:</th><td colspan="3" contenteditable="true">${d.depositAmount}</td><th>يبدأ من / From :</th><td colspan="3" contenteditable="true">${formatDate(d.startDate, 'ar')}</td></tr>
                <tr><th>ينتهي في / To :</th><td colspan="7" contenteditable="true">${formatDate(d.endDate, 'ar')}</td></tr>
            </table>
            <div class="section-header">شروط وأحكام أخرى / Other terms and conditions</div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">1. هذا النموذج هو جزء لا يتجزأ من اتفاقية الإيجار ، وعقد البلدية ، وشروط الإيجار ، وبتوقيعه ، أوافق على تسجيل عقد الإيجار بالشروط المعمول بهاء أو ما سيتم تحديثه من قبل إدارة العقار. ( للإطلاع على الشروط والقوانين أمسح الباركود او اطلب نسخة رقمية عبر الواتساب 93555643 )</div><div class="text-en" contenteditable="true">1. This form is an integral part of the lease agreement, the municipal contract, and the terms of the lease, and by signing it, I agree to register the lease with the applicable terms or what will be updated by the property management.(To view the terms and conditions, scan the barcode or request a digital copy via WhatsApp 93555643)</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">2. توقيع المستأجر على هذا النموذج موافقة على توثيق العقد من قبل السلطات المختصة.</div><div class="text-en" contenteditable="true">2. The tenant's signature on this form constitutes approval of the contract documentation by the competent authorities.</div></div></div>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 02 - Renewal
    function renderRenewal() {
        let d = getFormData();
        const periodLabel = formatContractPeriodBilingual(d.startDate, d.endDate, d.contractMonths);
        return `
            <div class="doc-title"><h2>تأجير وحدة ( مستند رقم 1 ) - تجديد</h2><h3>RENT A UNIT (Documents No 1) - Renewal</h3></div>
            <table class="info-table"><tr><th>النوع / Type</th><td colspan="3" contenteditable="true">تجديد Renewal</td><th>رقم العقد / Agreement No.:</th><td colspan="3" contenteditable="true">${d.agreementNo}</td></tr></table>
            <div class="section-header">بيانات المؤجر (الطرف الأول) / Landlord Details</div>
            <table class="info-table"><tr><th>الاسم / Name:</th><td colspan="7" contenteditable="true">سيد فياض بن علي - Syed Fayyaz ali</td></tr></table>
            <div class="section-header">بيانات المستأجر (الطرف الثاني) / Tenant Details</div>
            <table class="info-table"><tr><th>أسم المستأجر / Name:</th><td colspan="7" contenteditable="true">${d.tenantNameAr}</td></tr>
            <tr><th>الرقم المدني / ID No.:</th><td colspan="3" contenteditable="true">${d.tenantId}</td><th>رقم النقال / Mobile No:</th><td colspan="3" contenteditable="true">${d.tenantMobile}</td></tr></table>
            <div class="section-header">بيانات العقار المستأجر / Property Details</div>
            <table class="info-table"><tr><th>رقم المبنى / Building No.:</th><td colspan="3" contenteditable="true">${d.buildingNo}</td><th>الوحدة / Unit</th><td colspan="3" contenteditable="true">${d.unitType} ${d.flatNo}</td></tr></table>
            <div class="section-header">مدة العقد والقيمة الإيجارية / Agreement Period & Rental Value</div>
            <table class="info-table"><tr><th>القيمة الإيجارية الشهرية / Monthly Rent :</th><td colspan="3" contenteditable="true">${d.monthlyRent}</td><th>مدة العقد / Contract period :</th><td colspan="3" contenteditable="true">${periodLabel}</td></tr>
            <tr><th>رسوم البلدية / Municipal fees</th><td colspan="3" contenteditable="true">${calcMunicipalFees()}</td><th>من / From :</th><td colspan="3" contenteditable="true">${formatDate(d.startDate, 'ar')}</td></tr>
            <tr><th>إلى / To :</th><td colspan="7" contenteditable="true">${formatDate(d.endDate, 'ar')}</td></tr></table>
            <div class="section-header">أحكام التجديد / Renewal Provisions</div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">1. يقر الطرفان، المؤجر والمستأجر، بأنهما اتفقا على تجديد عقد الإيجار المبرم بينهما، ويجوز للمؤجر أو ممثله القانوني أو أي شخص مفوض منه تفويضًا صحيحًا اتخاذ جميع الإجراءات اللازمة لإتمام التجديد والتوقيع على المستندات ذات الصلة نيابة عنه.</div><div class="text-en" contenteditable="true">1. The Parties, namely the Lessor and the Lessee, hereby acknowledge and agree that they have mutually agreed to renew the Lease Agreement previously executed between them. The Lessor, his legal representative, or any person duly authorized by him shall have the authority to complete all renewal procedures and execute any related documents on his behalf.</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">2. كما يقر الطرفان بأنهما قد اطلعا على جميع بنود وشروط وأحكام عقد الإيجار السابق، وكافة اللوائح والاشتراطات والتعليمات المنظمة للعلاقة الإيجارية، وأنهما قبلا بها والتزما بالعمل بموجبها.</div><div class="text-en" contenteditable="true">2. The Parties further acknowledge that they have read, reviewed, and understood all the terms, conditions, and provisions of the previous Lease Agreement, as well as all regulations, requirements, and instructions governing the tenancy relationship, and that they accept and undertake to comply with the same.</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">3. ويوافق الطرفان بموجب هذه الاستمارة على تجديد عقد الإيجار وفقًا للشروط والأحكام الواردة في عقد الإيجار السابق، والتي تظل سارية ونافذة وملزمة للطرفين ما لم يتم الاتفاق كتابيًا على تعديل أي منها.</div><div class="text-en" contenteditable="true">3. By signing this Renewal Form, the Parties agree to renew the Lease Agreement in accordance with the terms and conditions contained in the previous Lease Agreement, which shall remain valid, effective, and binding upon the Parties unless otherwise amended by a written agreement.</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">4. وتُعد هذه الاستمارة ملحقًا مكملًا ومتممًا لعقد الإيجار السابق وجزءًا لا يتجزأ منه، وتُقرأ وتُفسر معه كوثيقة واحدة، وتكون لها ذات القوة والأثر القانوني المترتبين على العقد الأصلي.</div><div class="text-en" contenteditable="true">4. This Renewal Form shall constitute a supplementary addendum to, and an integral part of, the previous Lease Agreement and shall be read and construed together with it as one instrument, having the same legal force and effect as the original agreement.</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">5. كما يقر الطرفان بأن توقيعهما على هذه الاستمارة يُعد موافقة صريحة ونهائية وغير مشروطة على تجديد عقد الإيجار واستمرار العلاقة الإيجارية للمدة المتفق عليها، مع بقاء جميع الحقوق والالتزامات والضمانات والتعهدات الناشئة عن عقد الإيجار السابق سارية ونافذة وملزمة للطرفين طوال مدة التجديد.</div><div class="text-en" contenteditable="true">5. The Parties further acknowledge and agree that their signatures on this Renewal Form constitute their explicit, final, and unconditional consent to the renewal of the Lease Agreement and the continuation of the tenancy relationship for the agreed renewal term, with all rights, obligations, warranties, and undertakings arising under the previous Lease Agreement remaining valid, enforceable, and binding upon the Parties throughout the renewal period.</div></div></div>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 03 - Extension Addendum (17 بنداً كاملاً)
    function renderExtension() {
        let d = getFormData();
        return `
            <div class="doc-title"><h2>ملحق عقد إيجار ( مستند رقم 2 - أ )</h2><h3>Extension of Tenancy Agreement (Document No. 2-A)</h3></div>
            <table class="info-table"><tr><th>رقم العقد / Agreement No.:</th><td colspan="7" contenteditable="true">${d.agreementNo}</td></tr></table>
            <div class="section-header">الشروط والأحكام / Terms and Conditions</div>
            ${allClauses.map(c => `
                <div class="clause-block">
                    <div class="clause-title">${c.num}. ${c.titleAr} / ${c.titleEn}</div>
                    <div class="dual-text">
                        <div class="text-ar" contenteditable="true">${c.textAr}</div>
                        <div class="text-en" contenteditable="true">${c.textEn}</div>
                    </div>
                </div>
            `).join('')}
            ${buildGracePeriodDocumentBlockHtml(d)}
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 04 - Declaration (كامل)
    function renderDeclaration() {
        let d = getFormData();
        return `
            <div class="doc-title"><h2>إقـــــــــــــــــــــــــــــرار</h2><h3>Declaration Form</h3></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">بهذا أقر أنا الموقع أدناه بأن العنوان الموضح أدناه هو عنوان إقامتي الصحيح لي لتوجيه كافة المراسلات و الإعلانات و الإخطارات إليه. كما أتعهد بأن أخطر الشركة في حالة حدوث أي تغيير في عنواني المذكور خلال سبعة أيام من تاريخ حدوث ذلك التغيير وإلا أعتبر عنواني السابق المسجل بسجلات الشركة عنواناً وصحيحاً لي للمراسلات.</div><div class="text-en" contenteditable="true">I, the undersigned do hereby declare that the address mentioned hereunder is my correct address for the purpose of sending all notices, correspondences, and publications. I do hereby undertake to give notice / inform to the company in case of any change in my address mentioned below within seven days from the date of such change, otherwise my previous recorded address in my company's records shall be considered as my address for correspondence.</div></div></div>
            <div class="section-header">العنوان الدائم / PERMANENT ADDRESS</div>
            <table class="info-table"><tr><th>الولاية / Wilayat:</th><td contenteditable="true">Bausher</td><th>المنطقة / Region:</th><td contenteditable="true">Muscat</td></tr>
            <tr><th>القرية / Village:</th><td contenteditable="true"></td><th>رقم السكة / Way No:</th><td contenteditable="true"></td></tr>
            <tr><th>الشارع / Street :</th><td contenteditable="true"></td><th>رقم المبنى / Building No:</th><td contenteditable="true">${d.buildingNo}</td></tr>
            <tr><th>أقرب معلم / Nearest Landmark:</th><td contenteditable="true"></td><th>رقم الشقة / Flat No:</th><td contenteditable="true">${d.flatNo}</td></tr>
            <tr><th>الهاتف النقال / GSM No :</th><td contenteditable="true">${d.tenantMobile}</td><th>هاتف المنزل / Office No :</th><td contenteditable="true"></td></tr>
            <tr><th>البريد الإلكتروني / E-mail :</th><td colspan="3" contenteditable="true">${d.tenantEmail}</td></tr></table>
            <div class="section-header">العنوان الحالي / CURRENT ADDRESS</div>
            <table class="info-table"><tr><th>الولاية / Wilayat:</th><td contenteditable="true"></td><th>المنطقة / Region:</th><td contenteditable="true"></td></tr>
            <tr><th>القرية / Village:</th><td contenteditable="true"></td><th>رقم السكة / Way No:</th><td contenteditable="true"></td></tr>
            <tr><th>الشارع / Street :</th><td contenteditable="true"></td><th>رقم المبنى / Building No:</th><td contenteditable="true"></td></tr></table>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 05 - Check-In (مع قائمة الأثاث الكاملة)
    function renderCheckIn() {
        let d = getFormData();
        return `
            <div class="doc-title"><h2>تسجيل دخول المستأجر ( مستند رقم 4 )</h2><h3>Tenant Check-In (Document No. 4)</h3></div>
            <table class="info-table"><tr><th>رقم العقد / Agreement No.:</th><td colspan="3" contenteditable="true">${d.agreementNo}</td><th>المستأجر / Tenant:</th><td colspan="3" contenteditable="true">${d.tenantNameAr}</td></tr>
            <tr><th>المبنى / Building No.:</th><td colspan="3" contenteditable="true">${d.buildingNo}</td><th>رقم الشقة / Flat/Shop no :</th><td colspan="3" contenteditable="true">${d.flatNo}</td></tr></table>
            <div class="section-header">الأثاث والأجهزة / Furniture and appliances</div>
            <table class="info-table furniture-table"><thead><tr><th>الوصف / Description</th><th>العلامة التجارية / Brand</th><th>الحالة / Condition</th><th>العدد / Number</th></tr></thead>
            <tbody>${furnitureItems.map(item => `<tr><td contenteditable="true">${item}</td><td contenteditable="true"></td><td contenteditable="true">صالح Valid</td><td contenteditable="true"></td></tr>`).join('')}
            <tr><td colspan="4" style="background:#f9f9f9"><strong>الملاحظات / Remarks:</strong> <span contenteditable="true"></span></td></tr></tbody></table>
            <div class="section-header">شروط وأحكام / Terms and conditions</div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">هذه الاستمارة هي جزء لا يتجزأ من اتفاقية الإيجار اللاحقة ويكملها وجميع الوثائق اللاحقة. يشار إليه باسم المستند رقم 4.</div><div class="text-en" contenteditable="true">This form is an integral part of and complements the subsequent rental agreement and all subsequent documents. It is referred to as Document #4.</div></div></div>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 06 - Check-Out
    function renderCheckOut() {
        let d = getFormData();
        return `
            <div class="doc-title"><h2>تسجيل خروج المستأجر ( مستند رقم 5 )</h2><h3>Tenant Check-Out (Document No. 5)</h3></div>
            <table class="info-table"><tr><th>رقم العقد / Agreement No.:</th><td colspan="3" contenteditable="true">${d.agreementNo}</td><th>المستأجر / Tenant:</th><td colspan="3" contenteditable="true">${d.tenantNameAr}</td></tr>
            <tr><th>المبنى / Building No.:</th><td colspan="3" contenteditable="true">${d.buildingNo}</td><th>رقم الشقة / Flat/Shop no :</th><td colspan="3" contenteditable="true">${d.flatNo}</td></tr>
            <tr><th>عداد الكهرباء / Electricity Meter</th><td colspan="3" contenteditable="true">${d.electricityMeter}</td><th>عداد الماء / Water Meter</th><td colspan="3" contenteditable="true">${d.waterMeter}</td></tr></table>
            <div class="section-header">تاريخ الإخلاء و القراءات / Eviction date and readings</div>
            <table class="info-table"><tr><th>تاريخ الإخلاء / Eviction date :</th><td contenteditable="true"></td><th>قراءة عداد الكهرباء / Electricity Meter Reading :</th><td contenteditable="true"></td><th>مبلغ الفاتورة / Bill amount :</th><td contenteditable="true"></td></tr>
            <tr><th>قراءة عداد الماء / Water Meter Reading :</th><td contenteditable="true"></td><th>مبلغ الفاتورة / Bill amount :</th><td colspan="3" contenteditable="true"></td></tr></table>
            <div class="section-header">الأثاث والأجهزة / Furniture and appliances</div>
            <table class="info-table"><thead><tr><th>الوصف</th><th>الحالة</th><th>الوصف</th><th>الحالة</th></tr></thead>
            <tbody>${furnitureItems.slice(0,7).map((item,i) => `<tr><td contenteditable="true">${item}</td><td contenteditable="true">صالح</td><td contenteditable="true">${furnitureItems[i+7] || ''}</td><td contenteditable="true">صالح</td></tr>`).join('')}</tbody></table>
            <div class="section-header">إقرارات الخروج / Check-Out Declarations</div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">هذه المستندات جزء لا يتجزأ من اتفاقية الإيجار. يشار إليه باسم المستند رقم 4. يقر المستأجر بأنه أعاد العقار في الحالة المذكورة أعلاه. يتعهد المستأجر بدفع فواتير الماء والكهرباء حتى القراءة الموضحة في هذه الوثيقة، كما يتحمل أي مبالغ تضاف بأثر رجعي نتيجة استخدامه. يتم استلام الوحدة من المستأجر بعد استكمال جميع المستندات المطلوبة وتوقيع نموذج الإلغاء وتسوية جميع الفواتير والإيجارات، ولا يتم استلام المفاتيح إلا بعد التسوية الكاملة.</div><div class="text-en" contenteditable="true">These documents are an integral part of the lease agreement and are referred to as Document No. 4. The tenant acknowledges that the unit has been returned in the condition stated above. The tenant undertakes to settle water and electricity bills up to the readings stated in this document and remains liable for any retroactive charges related to their use. The unit handover is completed only after all required documents are finished, the cancellation form is signed, and all rents and bills are fully settled.</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">يتم إرجاع مبلغ التأمين بعد تصفية جميع الالتزامات ودفع جميع الفواتير، وفي حال عدم وجود عيوب أو أضرار ناتجة عن الإهمال أو سوء الاستخدام، وذلك خلال مدة أقصاها أسبوع من توقيع هذا النموذج. تعتبر الصور المرفقة بهذه الوثيقة مكملة لها وجزءاً لا يتجزأ منها (مثل صور عدادات الخدمات وصور الوحدة).</div><div class="text-en" contenteditable="true">The security deposit is returned after settlement of all obligations and bills, and provided there are no defects or damages caused by negligence or misuse, within a maximum of one week after signing this form. Any images attached to this document are considered complementary and form an integral part of it (such as service meter photos and unit photos).</div></div></div>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 07 - Cancellation (كامل)
    function renderCancellation() {
        let d = getFormData();
        return `
            <div class="doc-title"><h2>طلب الغــاء عقــــد الايــجـــار ( مستند رقم 7 )</h2><h3>TENANCY CANCELLATION (Document No. 7)</h3></div>
            <table class="info-table"><tr><th>رقم العقد / Agreement No.:</th><td colspan="3" contenteditable="true">${d.agreementNo}</td><th>المستأجر / Tenant:</th><td colspan="3" contenteditable="true">${d.tenantNameAr}</td></tr>
            <tr><th>الرقم المدني / ID No.:</th><td colspan="3" contenteditable="true">${d.tenantId}</td><th>رقم النقال / Mobile No</th><td colspan="3" contenteditable="true">${d.tenantMobile}</td></tr>
            <tr><th>رقم المبنى / Building No.:</th><td colspan="3" contenteditable="true">${d.buildingNo}</td><th>رقم الشقة / Flat/Shop no :</th><td colspan="3" contenteditable="true">${d.flatNo}</td></tr></table>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">أنا الموقع أدناه أقر بأنني مستأجر للعقار المذكور بياناته أعلاه، وبما أنني لا أرغب في مواصلة الاستئجار فإنني أقر بإلغاء العقد المذكور. ويكون هذا الطلب باطلاً إذا لم تتم تسوية فواتير الماء والكهرباء والإيجار، وتبقى الوحدة تحت مسؤوليتي حتى سداد جميع الالتزامات والمتأخرات. كما أقر بحق المالك أو من ينوب عنه في إعادة تأجير العقار بعد توقيعي، وحقه في قطع الخدمات عند فسخ العقد دون الرجوع إليّ، وأتنازل عن أي اعتراض أو مطالبة.</div><div class="text-en" contenteditable="true">I, the undersigned, acknowledge that I am the tenant of the above-mentioned property and that I request cancellation of the tenancy contract as I do not wish to continue renting. This request is considered void if utility bills and rent are not fully settled, and the unit remains under my responsibility until all dues are paid. I also acknowledge the landlord's right (or their representative's right) to re-rent the property after my signature and to disconnect services upon termination without referring to me, and I waive any objection or claim.</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">أقر أيضًا بأن للمالك أو وكيله الحق الكامل في التصرف بمحتويات العقار (استخدامها أو التخلص منها أو إعادة بيعها) إذا لم أقم باستلامها حتى تاريخ التوقيع على هذه الوثيقة، وأتعهد بعدم المطالبة بأي حقوق مالية أو غير مالية. كما أقر بأنه بعد توقيعي لهذا الطلب لا يحق لي أي حق على العقار المذكور، وأن فسخ العقد تم على مسؤوليتي الكاملة.</div><div class="text-en" contenteditable="true">I further acknowledge that the landlord or their representative has full right to deal with the belongings remaining in the property (use, dispose of, or resell them) if I do not collect them by the date of signing this document, and I undertake not to make any financial or non-financial claims. I also acknowledge that after signing this request, I have no right of any kind in the referenced property, and that termination is under my full responsibility.</div></div></div>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    function isContractPaymentCash() {
        const p = toStr(document.getElementById('paymentMethod')?.value).toLowerCase();
        return p.includes('نقد') || p.includes('cash');
    }

    function formatInvoiceAmtOm(n) {
        return (Math.max(0, parseFloat(n) || 0)).toFixed(3);
    }

    function getInvoicePaymentScheduleRows() {
        let rows = getPaymentScheduleFromUi();
        if (!rows.length) rows = getDefaultPaymentRowsFromForm();
        return [...rows].sort((a, b) => (a.monthIndex || 0) - (b.monthIndex || 0));
    }

    function breakdownInvoiceRowAmount(row) {
        const amt = Math.max(0, parseFloat(toStr(row.amount)) || 0);
        if (!isContractSubjectToVat()) {
            return { rental: amt, vat: 0, total: amt };
        }
        if (isContractVatIncludedWithRent()) {
            const rental = amt / (1 + CONTRACT_VAT_RATE);
            const vat = amt - rental;
            return { rental, vat, total: amt };
        }
        return { rental: amt, vat: 0, total: amt };
    }

    // المستند 08 - Invoice
    function renderInvoice() {
        const d = getFormData();
        const pmLabel = escHtml(toStr(d.paymentMethod) || '—');
        const byChq = isContractPaymentByCheque();
        const byCash = isContractPaymentCash();
        const scheduleRows = getInvoicePaymentScheduleRows();
        const scheduleSectionTitle = byChq
            ? 'جدول الشيكات / Cheques Schedule'
            : byCash
              ? 'جدول الدفع النقدي / Cash Payment Schedule'
              : 'جدول الدفع / Payment Schedule';
        const dateColTitle = byChq
            ? 'تاريخ الشيك / Check date'
            : 'تاريخ الدفع / Due date';
        const totalColTitle = byChq
            ? 'مبلغ الشيك / Check amount'
            : 'المبلغ الإجمالي / Total amount';
        const extraHead = byChq
            ? '<th>رقم الشيك / Cheque no.</th>'
            : '<th>طريقة الدفع / Payment method</th>';
        let mainRows = '';
        scheduleRows.forEach((row, i) => {
            const idx = row.monthIndex || i + 1;
            const label =
                row.isExtraPeriod && row.extraDays
                    ? `${idx} (+${row.extraDays} ${t('يوم', 'd')})`
                    : String(idx);
            const br = breakdownInvoiceRowAmount(row);
            const extraCell = byChq
                ? `<td contenteditable="true">${escHtml(toStr(row.checkNo) || '—')}</td>`
                : `<td contenteditable="true">${pmLabel}</td>`;
            mainRows += `<tr>
                <td contenteditable="true">${escHtml(label)}</td>
                <td contenteditable="true">${escHtml(toStr(row.dueDate) || '—')}</td>
                <td contenteditable="true">${formatInvoiceAmtOm(br.rental)}</td>
                <td contenteditable="true">${formatInvoiceAmtOm(br.vat)}</td>
                <td contenteditable="true">${formatInvoiceAmtOm(br.total)}</td>
                ${extraCell}
            </tr>`;
        });
        if (!mainRows) {
            mainRows = `<tr><td colspan="6" contenteditable="true">${t('لا توجد بيانات جدول دفع — راجع المدة والإيجار.', 'No payment schedule — check term and rent.')}</td></tr>`;
        }
        let vatChequeBlock = '';
        if (isContractSubjectToVat() && !isContractVatIncludedWithRent()) {
            const vatRows = getVatChequeScheduleFromUi();
            if (vatRows.length) {
                let vatBody = '';
                vatRows.forEach((vr) => {
                    const vIdx = vr.chequeIndex || '';
                    const vLabel =
                        vr.isExtraPeriod && vr.extraDays
                            ? `${vIdx} (+${vr.extraDays} ${t('يوم', 'd')})`
                            : String(vIdx);
                    const vAmt = formatInvoiceAmtOm(vr.amount);
                    const vDate = escHtml(toStr(vr.dueDate) || '—');
                    const vChk = escHtml(toStr(vr.checkNo) || '—');
                    vatBody += `<tr>
                        <td contenteditable="true">${escHtml(vLabel)}</td>
                        <td contenteditable="true">${vDate}</td>
                        <td contenteditable="true">0.000</td>
                        <td contenteditable="true">${vAmt}</td>
                        <td contenteditable="true">${vAmt}</td>
                        <td contenteditable="true">${byChq ? vChk : pmLabel}</td>
                    </tr>`;
                });
                vatChequeBlock = `
            <div class="section-header">شيكات الضريبة / VAT Cheques</div>
            <table class="info-table"><thead><tr><th>#</th><th>${dateColTitle}</th><th>مبلغ الإيجار / Rental</th><th>الضريبة / VAT</th><th>${totalColTitle}</th>${extraHead}</tr></thead><tbody>${vatBody}</tbody></table>`;
            }
        }
        const depositAmt = formatInvoiceAmtOm(d.depositAmount);
        const cashNote = byCash
            ? `<div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">طريقة الدفع: نقداً — يُسدَّد كل قسط في تاريخه المحدد أعلاه نقداً حسب الاتفاق. / Payment method: Cash — each instalment is paid in cash on the due date shown above as agreed.</div><div class="text-en" contenteditable="true">Payment method: Cash — each instalment is paid in cash on the due date listed in the schedule above.</div></div></div>`
            : '';
        const chqNote = byChq
            ? `<div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">ملاحظة: شيكات الإيجار يجب أن تكون بإسم محمد سيد فياض علي<br>The Rent cheques should be under Mohammad Syed Fayyaz Ali name</div><div class="text-en" contenteditable="true">Note: Rent cheques should be under Mohammad Syed Fayyaz Ali name</div></div></div>`
            : '';
        return `
            <div class="doc-title"><h2>المتطلبات والفاتورة</h2><h3>Requirement & Invoice</h3></div>
            <table class="info-table">
                <tr><th>رقم العقد / Agreement No.:</th><td colspan="3" contenteditable="true">${escHtml(d.agreementNo)}</td><th>اسم المستأجر / Tenant Name:</th><td colspan="3" contenteditable="true">${escHtml(d.tenantNameAr)}</td></tr>
                <tr><th>طريقة الدفع / Payment method:</th><td colspan="7" contenteditable="true">${pmLabel}</td></tr>
            </table>
            <div class="section-header">${scheduleSectionTitle}</div>
            <table class="info-table"><thead><tr><th>#</th><th>${dateColTitle}</th><th>مبلغ الإيجار / Rental Amount</th><th>الضريبة / VAT</th><th>${totalColTitle}</th>${extraHead}</tr></thead><tbody>${mainRows}</tbody></table>
            ${vatChequeBlock}
            <div class="section-header">المتطلبات / Requirements</div>
            <table class="info-table"><tr>
                <td contenteditable="true">${byChq ? '1. شيكات الإيجار / Rent Cheques' : byCash ? '1. دفعات الإيجار نقداً / Cash rent payments' : '1. دفعات الإيجار / Rent payments'}</td>
                <td contenteditable="true">2. البطاقة المدنية / ID Card</td>
                <td contenteditable="true">3. شيكات الضمان / Security deposit</td>
            </tr></table>
            <div class="section-header">تفاصيل الشيكات والمبالغ الإضافية / Details of checks and additional amounts</div>
            <table class="info-table"><thead><tr><th>#</th><th>البيان / Description</th><th>المبلغ / Amount</th><th>الضريبة / VAT</th><th>الإجمالي / Total</th><th>طريقة الدفع / Payment method</th></tr></thead>
            <tbody>
                <tr><td contenteditable="true">1</td><td contenteditable="true">${t('مبلغ التأمين / Security deposit', 'Security deposit / مبلغ التأمين')}</td><td contenteditable="true">${depositAmt}</td><td contenteditable="true">0.000</td><td contenteditable="true">${depositAmt}</td><td contenteditable="true">${pmLabel}</td></tr>
            </tbody></table>
            ${cashNote}
            ${chqNote}
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">يعتبر هذا المستند جزء من العقد ، ويقرأ معه .</div><div class="text-en" contenteditable="true">This document is considered part of the contract, and it must be read with it.</div></div></div>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 09 - Unit Details
    function renderUnitDetails() {
        let d = getFormData();
        return `
            <div class="doc-title"><h2>تفاصيل الوحدة</h2><h3>Unit Details</h3></div>
            <table class="info-table">
                <tr><th>الموقع / Location,Building</th><td colspan="3" contenteditable="true">${d.buildingNo}</td></tr>
                <tr><th>الوحدة / Unit (Flat, Shop)</th><td colspan="3" contenteditable="true">${d.unitType} ${d.flatNo}</td></tr>
                <tr><th>تفاصيل الطابق / Floor Details</th><td colspan="3" contenteditable="true">${d.floorDetails}</td></tr>
                <tr><th>الرقم المسلسل / Serial Number</th><td colspan="3" contenteditable="true"></td></tr>
                <tr><th>رقم حساب الكهرباء / Electricity Account Number</th><td colspan="3" contenteditable="true">${d.electricityMeter}</td></tr>
                <tr><th>رقم حساب الماء / Water Account Number</th><td colspan="3" contenteditable="true">${d.waterMeter}</td></tr>
            </table>
            ${buildContractPartiesSignatureRowHtml(d)}
        `;
    }
    
    // المستند 10 - Index
    function renderIndex() {
        return `
            <div class="doc-title"><h2>الفهرس</h2><h3>Index</h3></div>
            <table class="info-table" style="width:80%; margin:auto">
                <thead><tr><th>رقم الصفحة / Page NO</th><th>التفاصيل / Details</th></tr></thead>
                <tbody>
                    <tr><td contenteditable="true">1</td><td contenteditable="true">Municipal Agreement / عقد البلدية</td></tr>
                    <tr><td contenteditable="true">2</td><td contenteditable="true">Tenancy Agreement Addendum / ملحق عقد الإيجار</td></tr>
                    <tr><td contenteditable="true">3</td><td contenteditable="true">Personal Guarantee Form / الضمان الشخصي</td></tr>
                    <tr><td contenteditable="true">4</td><td contenteditable="true">Declaration Form / نموذج الإقرار</td></tr>
                    <tr><td contenteditable="true">5</td><td contenteditable="true">Tenant Check-In / تسجيل الدخول</td></tr>
                    <tr><td contenteditable="true">6</td><td contenteditable="true">ID / Passport / البطاقة الشخصية / الجواز</td></tr>
                    <tr><td contenteditable="true">7</td><td contenteditable="true">CR Papers / أوراق السجل التجاري</td></tr>
                    <tr><td contenteditable="true">8</td><td contenteditable="true">PDC Cheque copies / نسخ الشيكات</td></tr>
                </tbody>
            </table>
            ${buildContractPartiesSignatureRowHtml(getFormData())}
        `;
    }
    
    // المستند 11 - Terms & Conditions (كامل)
    function renderFullTermsFromData(d, options = {}) {
        const data = d || getFormData();
        const includeSignature = options.includeSignature !== false;
        const termsSource = Array.isArray(options.clauses) && options.clauses.length ? options.clauses : allClauses;
        const showTitle = options.showTitle !== false;
        const headingHtml = showTitle
            ? `
            <div class="doc-title"><h2>الشروط والأحكام لتأجير الوحدات</h2><h3>Terms and conditions for renting units</h3></div>
            <table class="info-table"><tr><th>رقم العقد / Agreement No.:</th><td colspan="3" contenteditable="true">${data.agreementNo}</td></tr></table>
            <div class="section-header">الشروط والأحكام الكاملة / Complete Terms & Conditions</div>
            `
            : `<div class="section-header">تكملة الشروط والأحكام / Terms continuation</div>`;
        const signatureHtml = includeSignature ? buildContractPartiesSignatureRowHtml(data) : '';
        return `
            ${headingHtml}
            ${termsSource.map(c => `
                <div class="clause-block terms-clause" style="padding:8px 6px;border-bottom:1px dashed #b34a62">
                    <div class="dual-text terms-dual" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start">
                        <div class="text-ar terms-ar" contenteditable="true" style="text-align:right;direction:rtl;font-size:9.2pt;line-height:1.24">
                            <div class="clause-title" style="font-weight:800;color:#6b1f35;margin-bottom:6px">${c.num}. ${c.titleAr}</div>
                            <div>${c.textAr}</div>
                        </div>
                        <div class="text-en terms-en" contenteditable="true" style="text-align:left;direction:ltr;font-family:'Roboto',sans-serif;font-size:9.2pt;line-height:1.24">
                            <div class="clause-title" style="font-weight:800;color:#6b1f35;margin-bottom:6px">${c.num}. ${c.titleEn}</div>
                            <div>${c.textEn}</div>
                        </div>
                    </div>
                </div>
            `).join('')}
            ${signatureHtml}
        `;
    }
    function renderFullTerms() {
        return renderFullTermsFromData(getFormData());
    }
    
    // المستند 12 - Buildings & Owners
    function renderBuildingsOwners() {
        return `
            <div class="doc-title"><h2>قائمة المباني والملاك</h2><h3>Buildings & Owners List</h3></div>
            <div class="section-header">قائمة المواقع / Locations List</div>
            <table class="info-table">
                ${buildingsList.map((b, i) => `<tr><th style="width:5%">${i+1}</th><td contenteditable="true">${b}</td></tr>`).join('')}
                <tr><td colspan="2"><button class="btn-outline" style="margin-top:10px" onclick="addBuilding()">+ إضافة مبنى جديد</button></td></tr>
            </table>
            <div class="section-header">قائمة الملاك / Owners List</div>
            <table class="info-table">
                ${ownersList.map((o, i) => `<tr><th style="width:5%">${i+1}</th><td contenteditable="true">${o}</td></tr>`).join('')}
                <tr><td colspan="2"><button class="btn-outline" style="margin-top:10px" onclick="addOwner()">+ إضافة مالك جديد</button></td></tr>
            </table>
            ${buildContractPartiesSignatureRowHtml(getFormData())}
        `;
    }
    
    const renderers = [
        renderResidential, renderRenewal, renderExtension, renderDeclaration,
        renderCheckIn, renderCheckOut, renderCancellation, renderInvoice,
        renderUnitDetails, renderIndex, renderFullTerms, renderBuildingsOwners
    ];

    function renderDocumentsSystemPanel() {
        const categoriesHost = document.getElementById('documentsSystemCategories');
        const listHost = document.getElementById('documentsSystemList');
        if (!categoriesHost || !listHost) return;
        categoriesHost.innerHTML = DOCUMENT_SYSTEM_CATEGORIES.map((cat) => `
            <button type="button" class="btn-outline ${activeDocumentCategory === cat.key ? 'active' : ''}" onclick="openDocumentsCategory('${cat.key}')">
                ${t(cat.ar, cat.en)}
            </button>
        `).join('');
        const items = DOCUMENT_SYSTEM_LIBRARY[activeDocumentCategory] || [];
        const activeCategory = DOCUMENT_SYSTEM_CATEGORIES.find((c) => c.key === activeDocumentCategory) || DOCUMENT_SYSTEM_CATEGORIES[0];
        listHost.innerHTML = `
            <div><strong>${t('الفئة الحالية', 'Active category')}:</strong> ${t(activeCategory.ar, activeCategory.en)}</div>
            <div style="margin-top:6px">${items.map((name, idx) => `${idx + 1}- ${escHtml(name)}`).join(' &nbsp; | &nbsp; ') || '-'}</div>
        `;
    }

    function openDocumentsCategory(categoryKey) {
        activeDocumentCategory = categoryKey || 'contract_forms';
        renderDocumentsSystemPanel();
        if (activeDocumentCategory === 'contract_forms') {
            renderDocument(currentDoc);
            return;
        }
        const container = document.getElementById('currentDocument');
        if (!container) return;
        container.className = 'document doc-theme-royal-maroon';
        container.innerHTML = documentShell(`
            <div class="doc-title"><h2>${t('نظام المستندات', 'Documents system')}</h2><h3>${t('قوالب المراسلات', 'Letters templates')}</h3></div>
            <div class="section-header">${t('ملاحظة', 'Note')}</div>
            <table class="info-table">
                <tr>
                    <th>${t('الحالة', 'Status')}</th>
                    <td>${t('سيتم ربط هذه القوالب مباشرة بصفحة العقد لسحب بيانات المالك والمستأجر والعقار تلقائياً عند الطباعة.', 'These templates will be linked to the contract page to auto-fill owner, tenant, and property data on print.')}</td>
                </tr>
            </table>
        `);
        const tabsContainer = document.getElementById('tabsContainer');
        if (tabsContainer) {
            tabsContainer.innerHTML = `<button class="tab-btn" onclick="openDocumentsCategory('contract_forms')">${t('↩️ الرجوع إلى استمارات العقود', '↩️ Back to contract forms')}</button>`;
        }
    }
    
    async function renderDocument(index) {
        if (!isViewerMode && isContractsWorkspaceScreenActive() && !isContractWorkspaceUnlockedForCurrentUnit()) {
            renderContractsWorkspaceLockedPlaceholder();
            return;
        }
        activeDocumentCategory = 'contract_forms';
        const max = Math.max(0, (Array.isArray(renderers) ? renderers.length : 1) - 1);
        const safeIndex = Math.max(0, Math.min(typeof index === 'number' && !Number.isNaN(index) ? index : 0, max));
        currentDoc = safeIndex;
        if (!isViewerMode) {
            try {
                sessionStorage.setItem('bhd_ui_current_doc', String(safeIndex));
            } catch (e) {}
        }
        const container = document.getElementById('currentDocument');
        if(!container) return;
        container.className = 'document doc-theme-royal-maroon';
        const renderer = renderers[safeIndex];
        if (typeof renderer !== 'function') return;
        container.innerHTML = documentShell(renderer());
        
        renderDocumentsSystemPanel();
        // تحديث شريط التنقل
        const tabsContainer = document.getElementById('tabsContainer');
        if(tabsContainer) {
            const printBtn = `<button class="tab-btn" onclick="printDocument()">🖨️ طباعة المستند الحالي</button>`;
            tabsContainer.innerHTML = docNames.map((name, i) =>
                `<button class="tab-btn ${i === safeIndex ? 'active' : ''}" onclick="renderDocument(${i})">${i+1}. ${name}</button>`
            ).join('') + printBtn;
        }
        
        // تحديث قائمة المباني في select
        const buildingSelect = document.getElementById('buildingSelect');
        if(buildingSelect) {
            const buildingOptions = getActiveBuildingNames();
            buildingSelect.innerHTML =
                `<option value="">— ${t('اختر مبنى نشط', 'Select active building')} —</option>` +
                buildingOptions.map((b) => `<option value="${escHtml(b)}">${escHtml(b)}</option>`).join('');
            const currentBuilding = document.getElementById('buildingNo')?.value;
            if (currentBuilding && buildingOptions.includes(currentBuilding)) {
                buildingSelect.value = currentBuilding;
            }
        }
        updateSummaryPanel();
        renderOperationsTable();
        refreshContractDocumentAttachmentsSection().catch((e) =>
            console.warn('refreshContractDocumentAttachmentsSection', e)
        );
        refreshLedgerAttachmentPreviewButtons().catch((e) =>
            console.warn('refreshLedgerAttachmentPreviewButtons', e)
        );
    }
    
    async function printDocument() {
        if (!isViewerMode && isContractsWorkspaceScreenActive() && !isContractWorkspaceUnlockedForCurrentUnit()) {
            alertContractWorkspaceLockedOrMissingUnit();
            return;
        }
        if (!(await validateCoreData())) return;
        const d = getFormData();
        if (currentDoc === CONTRACT_CANCELLATION_FORM_07_INDEX) {
            const prefix =
                toStr(d.buildingNo) && toStr(d.flatNo) ? `${toStr(d.buildingNo)}-${toStr(d.flatNo)}` : '';
            await printContractDocumentsByIndices([CONTRACT_CANCELLATION_FORM_07_INDEX], {
                includeFinancialReceipt: false,
                hydrateAttachments: false,
                attachmentItems: [],
                unitPrefix: prefix
            });
            return;
        }
        const reservationNo = toStr(d.agreementNo) || '-';
        const baseDoc = document.querySelector('.document');
        if(!baseDoc) return;
        const printRoot = baseDoc.cloneNode(true);
        printRoot.querySelectorAll('.contract-financial-receipt, .contract-doc-preview-grid, .contract-doc-attachments-block').forEach((el) => {
            const prev = el.previousElementSibling;
            if (prev && prev.classList && prev.classList.contains('section-header')) prev.remove();
            el.remove();
        });
        const win = window.open('', '_blank');
        win.document.write(`
            <!DOCTYPE html>
            <html lang="ar"><head><meta charset="utf-8"><title>${docNames[currentDoc]} - مجموعة سيد فياض العالمية</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&family=Roboto&display=swap" rel="stylesheet">
            <style>${buildContractPrintPageMarginCss(d, reservationNo)}${getContractDocumentPrintStylesCss()}
                .contract-financial-receipt, .contract-doc-preview-grid, .contract-doc-preview-card, .contract-doc-attachments-block { display: none !important; }
            </style></head>
            <body dir="rtl">
                ${printRoot.outerHTML}
            </body></html>
        `);
        win.document.close();
        const triggerPrint = () => {
            try { win.focus(); win.print(); } catch (_ePr) {}
        };
        if (win.document.readyState === 'complete') {
            setTimeout(triggerPrint, 350);
        } else {
            win.onload = () => setTimeout(triggerPrint, 350);
        }
    }
    
    async function saveAllDataAsDraft() {
        if (!assertPermissionOrAlert('manage_contracts', 'لا تملك صلاحية حفظ بيانات العقود.', 'No permission to save contracts.')) return;
        if (isReservationsWorkspaceScreenActive()) return;
        if (_contractSaveInProgress) return;
        if (isContractsWorkspaceScreenActive() && !isContractWorkspaceUnlockedForCurrentUnit()) {
            alertContractWorkspaceLockedOrMissingUnit();
            try {
                applyContractsWorkspaceLockState();
            } catch (_eDraftLock) {}
            return;
        }
        loadDashboardAux();
        if (!(await validateCoreData())) return;
        setContractSaveDockBusy(true);
        try {
            const data = enrichPayloadWithResolvedLinkedContractUnits(collectStorableContractFullFromDom());
            try {
                ensureLinkedContractUnitsOnForm(data);
                refreshLinkedContractUnitsPanel(data);
            } catch (_eDraftLinkedUi) {}
            const primary = resolveContractWorkflowPrimaryUnit(data.buildingNo, data.flatNo, data);
            try {
                syncAccountingFromContractPayload(primary.building, primary.unit, data);
            } catch (_eSyncDraft) {}
            const ok = persistContractWorkspaceDraftSilent({ explicit: true });
            if (!ok) {
                alert(
                    t(
                        'تعذّر حفظ المسودة. تأكد من إدخال المبنى والوحدة وبيانات أساسية للمستأجر.',
                        'Could not save draft. Ensure building, unit, and basic tenant data are entered.'
                    )
                );
                return;
            }
            const lsBundle = tryPersistStandardBhdLocalStoresBundle();
            if (!lsBundle.ok) {
                console.error(lsBundle.error);
                alert(
                    t(
                        'تعذّر حفظ قوائم النظام المساعدة: مساحة التخزين المحلي ممتلئة. قد تكون مسودة العقد محفوظة؛ صغّر المرفقات أو استخدم تصفية البيانات ثم أعد المحاولة.',
                        'Could not save auxiliary lists: browser storage is full. The contract draft may already be saved; reduce attachments or use Data cleanup, then retry.'
                    )
                );
                syncBhdKvToServer();
                return;
            }
            syncBhdKvToServer();
            recordSystemActivity({
                actionKey: 'save_contract_draft',
                actionAr: 'حفظ مسودة عقد / Save contract draft',
                actionEn: 'Save contract draft / حفظ مسودة عقد',
                building: toStr(data.buildingNo),
                unit: toStr(data.flatNo),
                ref: toStr(data.agreementNo),
                note: t('حفظ مسودة بيانات العقد (قبل اعتماد المحاسب)', 'Contract data draft save (before accounting approval)')
            });
            alert(
                t(
                    '✅ تم حفظ بيانات العقد كمسودة.\n\nيمكنك العودة لاحقاً لإكمال «حفظ بيانات العقد» بعد اعتماد المحاسب على استلام الضمان وشيك الضمان (إن وُجد).',
                    '✅ Contract data saved as draft.\n\nYou can return later to complete «Save contract data» after accounting confirms deposit and deposit cheque receipt (if any).'
                )
            );
            try {
                updateSummaryPanel();
            } catch (_eSumDraft) {}
            try {
                refreshContractSaveDockAccountingGateUi();
            } catch (_eDraftGateUi) {}
        } finally {
            setContractSaveDockBusy(false);
        }
    }

    async function saveAllData() {
        if (!assertPermissionOrAlert('manage_contracts', 'لا تملك صلاحية حفظ بيانات العقود.', 'No permission to save contracts.')) return;
        if (isReservationsWorkspaceScreenActive()) {
            saveReservationData();
            return;
        }
        if (_contractSaveInProgress) return;
        if (isContractsWorkspaceScreenActive() && !isContractWorkspaceUnlockedForCurrentUnit()) {
            alertContractWorkspaceLockedOrMissingUnit();
            try { applyContractsWorkspaceLockState(); } catch (_eSavLock) {}
            return;
        }
        loadDashboardAux();
        if (isContractsWorkspaceScreenActive()) {
            const preAcctData = applyActorAuditStamp(collectStorableContractFullFromDom());
            if (!assertContractDepositAccountingApprovedForSaveOrAlert(preAcctData)) {
                try {