                    refreshContractSaveDockAccountingGateUi();
                } catch (_eAcctGateSavEarly) {}
                return;
            }
        }
        await refreshAddressBookFromSystemAsync(false);
        if (!(await validateCoreData())) {
            return;
        }
        const preSaveData = applyActorAuditStamp(collectStorableContractFullFromDom());
        setContractSaveDockBusy(true);
        let postSavePrintWin = null;
        let postSavePrintToken = '';
        if (bhdIsDesktopApp() && window.bhdDesktop?.allocPrintWindowToken) {
            try {
                postSavePrintToken = await window.bhdDesktop.allocPrintWindowToken();
            } catch (_ePreTok) {
                postSavePrintToken = '';
            }
        }
        try {
            postSavePrintWin = window.open('', '_blank');
        } catch (_ePreWin) {
            postSavePrintWin = null;
        }
        let data = applyActorAuditStamp(collectStorableContractFullFromDom());
        data.contractSavedAt = new Date().toISOString();
        data.contractSavedStatus = resolveContractLifecycleStatus(data);
        try {
            const ag0 = toStr(data.agreementNo).trim();
            if (ag0 && /^RES-/i.test(ag0)) {
                const nn = nextContractAgreementDraftNumber();
                const agEl = document.getElementById('agreementNo');
                if (agEl) agEl.value = nn;
                data = collectStorableContractFullFromDom();
                try {
                    updateSummaryPanel();
                } catch (_eSum) {}
            }
        } catch (_ePromo) {}

        const persist = tryPersistContractFullWithQuotaBackoff(data);
        if (!persist.ok) {
            if (postSavePrintWin) {
                try {
                    postSavePrintWin.close();
                } catch (_eClose1) {}
            }
            console.error(persist.error);
            const qe = persist.error;
            alert(
                t(
                    'تعذّر حفظ العقد: مساحة التخزين المحلي ممتلئة حتى بعد تخفيض مرافق العقد ذاتها. صغّر أو أزل مرفقات الشيكات والمستندات في النموذج، أو احذف بيانات قديمة عبر تصفية البيانات ثم أعد المحاولة.',
                    'Saving the contract failed: browser storage quota is full even after slimming embedded contract payloads. Reduce cheque/document attachments or use Data cleanup, then retry.'
                )
            );
            syncBhdKvToServer();
            setContractSaveDockBusy(false);
            return;
        }
        data = persist.saved;
        recordSystemActivity({
            actionKey: 'save_contract',
            actionAr: 'حفظ عقد / Save contract',
            actionEn: 'Save contract / حفظ عقد',
            building: toStr(data.buildingNo),
            unit: toStr(data.flatNo),
            ref: toStr(data.agreementNo),
            note: t('حفظ نهائي لبيانات العقد', 'Final contract data save')
        });
        if (persist.stripLevel > 0) syncDomSnapshotFromSlimContractPayload(data);
        const lsBundle = tryPersistStandardBhdLocalStoresBundle();
        if (!lsBundle.ok) {
            if (postSavePrintWin) {
                try {
                    postSavePrintWin.close();
                } catch (_eClose2) {}
            }
            console.error(lsBundle.error);
            alert(
                t(
                    'تعذّر حفظ قوائم النظام: مساحة التخزين المحلي ما زالت ممتلئة بعد تقليل الملفات المضمّنة في الدفتر أو العقارات أو نسخ الحجوزات. بيانات العقد الحالية قد تكون محفوظاً؛ استخدم تصفية البيانات أو صِغْ المرفقات ثم حاول «حفظ جميع البيانات» مرة أخرى.',
                    'Could not save auxiliary lists: browser storage is still full after trimming address book/property/reservation data. The contract record may already be saved; run Data cleanup or reduce attachments, then tap Save all data again.'
                )
            );
            syncBhdKvToServer();
            setContractSaveDockBusy(false);
            return;
        }
        syncBhdKvToServer();
        try {
            if (contractEntryContext?.renewal && contractEntryContext?.previousContractSnapshot) {
                const prev = contractEntryContext.previousContractSnapshot;
                const prevAg = toStr(prev.agreementNo);
                const newAg = toStr(data.agreementNo);
                if (prevAg && newAg && prevAg !== newAg) {
                    archiveSupersededContractPayload(prev, {
                        reason: 'renewal',
                        supersededBy: newAg
                    });
                }
                contractEntryContext = { mode: 'contract', unit: null };
            }
        } catch (_eArchRen) {}
        try {
            mirrorTenancyPayloadToLinkedUnits(data, (unitPayload, bKey, uKey) => {
                if (!bKey || !uKey) return;
                const linked = getLinkedContractUnitsFromPayload(data);
                const merged =
                    linked.length > 1
                        ? {
                              ...unitPayload,
                              linkedContractUnits: linked,
                              linkedContractUnitsJson: JSON.stringify(linked)
                          }
                        : unitPayload;
                upsertSavedContractForUnit(bKey, uKey, merged, merged.contractSavedStatus || data.contractSavedStatus);
                try {
                    revokeContractEditGrant(bKey, uKey);
                } catch (_eRevGrantEach) {}
                removeTenancyContractDraftForKeys(bKey, uKey);
            });
        } catch (_eMirrorSav) {
            upsertSavedContractForUnit(data.buildingNo, data.flatNo, data, data.contractSavedStatus);
            try {
                revokeContractEditGrant(data.buildingNo, data.flatNo);
            } catch (_eRevGrant) {}
            removeTenancyContractDraftForKeys(data.buildingNo, data.flatNo);
        }
        try {
            repairLinkedContractUnitsLifecycleConsistency();
        } catch (_eSavLinkedSync) {}
        if (data.contractSavedStatus === 'active') {
            try {
                exitContractAdditionalDataMode();
                exitContractActivationDataMode();
            } catch (_eExitAdd) {}
            contractFullEditMode = false;
        } else if (data.contractSavedStatus === 'active_pending') {
            try {
                ensureLinkedContractUnitsOnForm(data);
                refreshLinkedContractUnitsPanel(data);
            } catch (_eLinkedPending) {}
            try {
                applyContractDepositAttachmentFieldLock();
            } catch (_eDepPending) {}
            try {
                enterContractAdditionalDataMode(data);
            } catch (_eReAdd) {}
        } else if (data.contractSavedStatus === 'active_docs_pending') {
            try {
                exitContractAdditionalDataMode();
            } catch (_eExitDocs) {}
            contractFullEditMode = false;
            try {
                enterContractActivationDataMode(data);
            } catch (_eActMode) {}
            try {
                refreshPropertyDocumentsBundleSectionVisibility();
            } catch (_ePdbVis) {}
            setTimeout(() => {
                try {
                    if (
                        confirm(
                            t(
                                '✅ اكتملت بيانات العقد والشيكات.\n\nالخطوة التالية (إلزامية قبل التفعيل):\n• رقم استمارة العقد البلدي\n• رقم العقد البلدي\n• رفع أوراق العقار الكاملة (سكنر)\n\nهل تريد فتح نافذة رفع المستندات الآن؟',
                                '✅ Contract data and cheques are complete.\n\nNext step (required before activation):\n• Municipal contract form no.\n• Municipal contract no.\n• Upload full property papers (scanner)\n\nOpen the upload window now?'
                            )
                        )
                    ) {
                        openPropertyDocumentsBundleModal({
                            building: data.buildingNo,
                            unit: data.flatNo
                        });
                    }
                } catch (_ePdbPrompt) {}
            }, 400);
        } else if (data.contractSavedStatus === 'active_accounting_pending') {
            try {
                exitContractAdditionalDataMode();
                exitContractActivationDataMode();
            } catch (_eExitAcct) {}
            contractFullEditMode = false;
            setTimeout(() => {
                try {
                    alert(
                        t(
                            '✅ اكتملت بيانات العقد والمستندات.\n\nالخطوة التالية: اعتماد المحاسب على استلام الضمان وسلامة الشيكات من شاشة المحاسبة → بانتظار الاعتماد.',
                            '✅ Contract data and documents are complete.\n\nNext: accountant must confirm deposit and cheque receipt in Accounting → Pending.'
                        )
                    );
                } catch (_eAcctPrompt) {}
            }, 400);
        }
        setTenancyDraftCompletionFieldLocks(false);
        try { setTenantIdentityLockedFromAddressBook(false); } catch (_eAbClrSav) {}
        try {
            applyTenancyAndTenantFieldLocks();
        } catch (_ePostSavLock) {}
        try {
            applyContractsWorkspaceLockState();
        } catch (_ePostSavCws) {}
        const stripWarn =
            persist.stripLevel > 0
                ? t(
                      '⚠ تم حفظ العقد بتخفيض نسخ الملفات الكبيرة داخل التخزين المحلي لتفادي الامتلاء. أعد رفع أو أعد استيراد مرفقات الشيكات أو المستندات من دفتر العناوين إذا احتجت الطباعة الكاملة لهذه الجلسة.',
                      '⚠ Saved with reduced embedded copies in browser storage (quota relief). Re-upload cheque copies or pull mandatory docs again from the address book if you need full files for printing in this browser.'
                  ) + '\n\n'
                : '';
        const okSaved = t(
            `✅ تم حفظ جميع البيانات بنجاح!${
                isBhdSiteKvPersistenceActive()
                    ? ' (تم حفظها في PostgreSQL على الخادم)'
                    : bhdApiAvailable
                      ? ' (تم حفظها في قاعدة البيانات المحلية أيضاً)'
                      : ''
            }`,
            `✅ All data saved successfully!${
                isBhdSiteKvPersistenceActive()
                    ? ' (Saved to PostgreSQL on the server.)'
                    : bhdApiAvailable
                      ? ' (Also stored in the local database.)'
                      : ''
            }`
        );
        const lsReliefAny =
            lsBundle.relievedAddressBook ||
            lsBundle.relievedBuildingProfiles ||
            lsBundle.relievedOwnerProfiles ||
            lsBundle.relievedReservationSnapshots;
        const lsReliefNote =
            lsReliefAny
                ? '\n\n' +
                  t(
                      '⚠ خُفِّفت أيضاً النسخ المضمَّنة المحلّية في دفتر العناوين أو مستندات العقار أو نسخ الحجوزات لتفادي امتلاء مساحة المتصفّح؛ راجع تلك السجلات وأعد إرفاق الملفات عند الحاجة لمطابقات الطباعة.',
                      '⚠ Stored copies in the address book, building records, or reservation snapshots were also reduced to satisfy browser quota; revisit those entries and re-attach files when you need originals for printing.'
                  )
                : '';
        showContractPrintFormsPanel({ openMenu: true });
        try {
            renderOperationsTable();
        } catch (_eOps) {}
        let printResult = { ok: false };
        try {
            const printPrefix =
                toStr(data.buildingNo) && toStr(data.flatNo)
                    ? `${toStr(data.buildingNo)}-${toStr(data.flatNo)}`
                    : '';
            printResult = await printContractDocumentsByIndices(CONTRACT_POST_SAVE_PRINT_INDICES, {
                targetWindow: postSavePrintWin,
                printToken: postSavePrintToken,
                suppressAlerts: true,
                closeOnFail: true,
                attachmentItems: await resolveContractWorkspacePrintableAttachments(),
                unitPrefix: printPrefix
            });
        } catch (_ePrSav) {}
        const pendingNote =
            data.contractSavedStatus === 'active_pending'
                ? '\n\n' +
                  t(
                      'ℹ️ الحالة: نشط — مطلوب بيانات إضافية (البلدي أو الشيكات). أكملها من شاشة العقود ثم احفظ مرة أخرى.',
                      'ℹ️ Status: Active — additional data required (municipal refs or cheques). Complete them in Contracts workspace and save again.'
                  )
                : '';
        const printNote =
            printResult && printResult.ok
                ? ''
                : '\n\n' +
                  t(
                      '⚠️ لم تُفتح نافذة الطباعة تلقائياً. اسمح بالنوافذ المنبثقة لهذا الموقع، أو استخدم «طباعة مجموعة الحفظ (01+03+04+08)» من القائمة أعلاه.',
                      '⚠️ The print window did not open automatically. Allow pop-ups for this site, or use «Post-save set (01+03+04+08)» from the menu above.'
                  );
        alert(stripWarn + okSaved + lsReliefNote + pendingNote + printNote);
        if (data.contractSavedStatus === 'active') {
            try {
                openFormsWorkspace();
            } catch (_eNavForms) {}
        }
        setContractSaveDockBusy(false);
        try {
            applySavedContractEditLock();
        } catch (_ePostSavLockBtn) {}
    }

    async function exportDataFile() {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية تصدير البيانات.', 'No permission to export data.')) return;
        loadDashboardAux();
        const data = {
            contract: getFormData(),
            buildings: buildingsList,
            owners: ownersList,
            addressBookEntries,
            fileRegistry,
            unitReservations,
            evictionRequests,
            ownerBuildingMap,
            buildingProfiles,
            ownerProfiles,
            managedUnitsData,
            usersRegistry,
            contractEditRequests: loadContractEditRequests(),
            contractEditGrants: loadContractEditGrants(),
            addressBookEditRequests: loadAddressBookEditRequests(),
            addressBookEditGrants: loadAddressBookEditGrants(),
            passwordResetRequests: loadPasswordResetRequests(),
            exportedAt: new Date().toISOString()
        };
        const json = JSON.stringify(data, null, 2);
        const defaultName = `bhd-real-estate-${data.contract.agreementNo || 'draft'}-${new Date().toISOString().slice(0, 10)}.json`;
        if (window.bhdDesktop) {
            try {
                const toFolder = confirm(t(
                    'حفظ في مجلد exports داخل بيانات التطبيق؟\nموافق = مجلد البيانات، إلغاء = اختر مكان الحفظ',
                    'Save to the app data exports folder?\nOK = data folder, Cancel = pick save location'
                ));
                const dest = toFolder
                    ? await window.bhdDesktop.exportJsonToDataFolder(json, defaultName)
                    : await window.bhdDesktop.exportJsonDialog(json, defaultName);
                if (dest) alert(t('✓ تم التصدير: ', '✓ Exported: ') + dest);
            } catch (err) {
                alert(t('فشل التصدير: ', 'Export failed: ') + (err && err.message ? err.message : String(err)));
            }
            return;
        }
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
    }

    async function triggerImport() {
        if (window.bhdDesktop) {
            if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية استيراد البيانات.', 'No permission to import data.')) return;
            try {
                const text = await window.bhdDesktop.importJsonDialog();
                if (text) importDataFileFromJsonText(text);
            } catch (err) {
                alert(t('فشل الاستيراد: ', 'Import failed: ') + (err && err.message ? err.message : String(err)));
            }
            return;
        }
        const input = document.getElementById('importFileInput');
        if (input) input.click();
    }

    function importDataFileFromJsonText(text) {
            if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية استيراد البيانات.', 'No permission to import data.')) return;
            try {
                const parsed = JSON.parse(text);
                const data = parsed.contract || {};
                const skipImportKeys = new Set([
                    'extraAdjustments',
                    'extraAdjustmentsJson',
                    'insuranceDepositItems',
                    'insuranceDepositItemsJson',
                    'customRentItems',
                    'customRentItemsJson',
                    'paymentSchedule',
                    'paymentScheduleJson',
                    'type'
                ]);
                Object.keys(getFormData()).forEach((key) => {
                    if (skipImportKeys.has(key)) return;
                    const el = document.getElementById(key === 'contractType' ? 'contractTypeSelect' : key === 'type' ? 'typeSelect' : key);
                    if (el && data[key] !== undefined && data[key] !== null && typeof data[key] !== 'object') {
                        el.value = data[key];
                    }
                });
                if (!toStr(data.agreedRentPaymentDay) && data.agreedRentPaymentDate) {
                    try {
                        const dt0 = new Date(data.agreedRentPaymentDate);
                        if (!Number.isNaN(dt0.getTime())) {
                            const el0 = document.getElementById('agreedRentPaymentDay');
                            if (el0) el0.value = String(dt0.getDate());
                        }
                    } catch (e) {}
                }
                try {
                    if (data.paymentScheduleJson) {
                        const arr = JSON.parse(toStr(data.paymentScheduleJson) || '[]');
                        renderPaymentScheduleFromRows(Array.isArray(arr) ? arr : []);
                    } else if (Array.isArray(data.paymentSchedule) && data.paymentSchedule.length) {
                        renderPaymentScheduleFromRows(data.paymentSchedule);
                    }
                } catch (e2) {}
                try {
                    if (data.extraAdjustmentsJson) {
                        renderExtraAdjustmentsRows(JSON.parse(toStr(data.extraAdjustmentsJson) || '[]'));
                    }
                } catch (e3) {}
                try {
                    if (data.insuranceDepositItemsJson) {
                        renderInsuranceDepositItemsRows(JSON.parse(toStr(data.insuranceDepositItemsJson) || '[]'));
                    }
                } catch (e4) {}
                try {
                    if (data.customRentItemsJson) {
                        renderCustomRentItemsRows(JSON.parse(toStr(data.customRentItemsJson) || '[]'));
                    }
                } catch (e5) {}
                ensureTypeSelectAlwaysNew();

                if (Array.isArray(parsed.buildings) && parsed.buildings.length) {
                    buildingsList.length = 0;
                    parsed.buildings.forEach((b) => buildingsList.push(String(b)));
                }
                if (Array.isArray(parsed.owners) && parsed.owners.length) {
                    ownersList.length = 0;
                    parsed.owners.forEach((o) => ownersList.push(String(o)));
                }
                if (Array.isArray(parsed.fileRegistry)) {
                    fileRegistry = parsed.fileRegistry.map((x) => ({
                        id: x.id || `reg_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
                        building: toStr(x.building),
                        unit: toStr(x.unit),
                        tenant: toStr(x.tenant),
                        docType: toStr(x.docType) || 'Other',
                        fileName: toStr(x.fileName),
                        filePath: toStr(x.filePath),
                        source: toStr(x.source),
                        notes: toStr(x.notes),
                        updatedAt: x.updatedAt || new Date().toISOString()
                    }));
                }
                if (Array.isArray(parsed.addressBookEntries)) {
                    addressBookEntries = parsed.addressBookEntries.map((x) => {
                        if (toStr(x.type) === 'company') {
                            return {
                                type: 'company',
                                name: toStr(x.name),
                                nameEn: toStr(x.nameEn),
                                companyAttachmentSchema: Number(x.companyAttachmentSchema) || 1,
                                commercialRegNo: toStr(x.commercialRegNo),
                                commercialRegExpiryDate: toStr(x.commercialRegExpiryDate),
                                commercialRegAttachment: x.commercialRegAttachment || null,
                                leaseContractAttachment: x.leaseContractAttachment || null,
                                mobile: toStr(x.mobile),
                                extraMobile: toStr(x.extraMobile),
                                email: toStr(x.email),
                                signatories: Array.isArray(x.signatories)
                                    ? x.signatories.map((s) => ({ ...getEmptyCompanySignatory(), ...s }))
                                    : normalizeCompanySignatories({
                                        signatoryName: x.signatoryName,
                                        signatoryNationality: x.signatoryNationality,
                                        signatoryIdNo: x.signatoryIdNo,
                                        signatoryIdExpiryDate: x.signatoryIdExpiryDate,
                                        signatoryMobile: x.signatoryMobile,
                                        signatoryIdAttachment: x.signatoryIdAttachment,
                                        signatoryPassport: x.signatoryPassport,
                                        signatoryPassportExpiryDate: x.signatoryPassportExpiryDate,
                                        signatoryPassportAttachment: x.signatoryPassportAttachment
                                    }),
                                building: toStr(x.building),
                                unit: toStr(x.unit),
                                source: toStr(x.source),
                                updatedAt: toStr(x.updatedAt) || new Date().toISOString()
                            };
                        }
                        return {
                            type: toStr(x.type) === 'owner' ? 'owner' : 'tenant',
                            name: toStr(x.name),
                            nationality: toStr(x.nationality) || 'عماني / Omani',
                            nameEn: toStr(x.nameEn),
                            mobile: toStr(x.mobile),
                            extraMobile: toStr(x.extraMobile),
                            idNo: toStr(x.idNo),
                            idExpiryDate: toStr(x.idExpiryDate),
                            email: toStr(x.email),
                            passport: toStr(x.passport),
                            passportExpiryDate: toStr(x.passportExpiryDate),
                            idAttachment: x.idAttachment || null,
                            passportAttachment: x.passportAttachment || null,
                            building: toStr(x.building),
                            unit: toStr(x.unit),
                            source: toStr(x.source),
                            updatedAt: toStr(x.updatedAt) || new Date().toISOString()
                        };
                    }).filter((x) => x.name);
                }
                if (Array.isArray(parsed.unitReservations)) {
                    unitReservations = parsed.unitReservations.map((x) => ({
                        building: toStr(x.building),
                        unit: toStr(x.unit),
                        reservedBy: toStr(x.reservedBy || x.tenant || x.by),
                        phone: toStr(x.phone),
                        since: toStr(x.since || x.date) || new Date().toISOString().slice(0, 10),
                        state: toStr(x.state) === 'confirmed' ? 'confirmed' : 'draft',
                        formData: (x.formData && typeof x.formData === 'object') ? x.formData : null,
                        details: toStr(x.details)
                    }));
                }
                if (Array.isArray(parsed.evictionRequests)) {
                    evictionRequests = parsed.evictionRequests.map((x) => ({
                        building: toStr(x.building),
                        unit: toStr(x.unit),
                        tenant: toStr(x.tenant),
                        requestDate: toStr(x.requestDate) || new Date().toISOString().slice(0, 10),
                        plannedDate: toStr(x.plannedDate),
                        notes: toStr(x.notes)
                    }));
                }
                if (parsed.ownerBuildingMap && typeof parsed.ownerBuildingMap === 'object') {
                    ownerBuildingMap = Object.keys(parsed.ownerBuildingMap).reduce((acc, owner) => {
                        const key = toStr(owner);
                        const list = Array.isArray(parsed.ownerBuildingMap[owner]) ? parsed.ownerBuildingMap[owner] : [];
                        acc[key] = list.map((b) => toStr(b)).filter(Boolean);
                        return acc;
                    }, {});
                }
                if (parsed.buildingProfiles && typeof parsed.buildingProfiles === 'object') {
                    buildingProfiles = parsed.buildingProfiles;
                }
                if (parsed.ownerProfiles && typeof parsed.ownerProfiles === 'object') {
                    ownerProfiles = parsed.ownerProfiles;
                }
                if (Array.isArray(parsed.managedUnitsData)) {
                    managedUnitsData = parsed.managedUnitsData;
                } else {
                    syncManagedUnitsFromProfiles();
                }
                if (Array.isArray(parsed.usersRegistry)) {
                    const basePerm = {};
                    BHD_PERMISSION_DEFS.forEach((p) => { basePerm[p.key] = false; });
                    usersRegistry = parsed.usersRegistry
                        .map((u) => {
                            const mergedPerm = { ...basePerm, ...(typeof u.permissions === 'object' ? u.permissions : {}) };
                            return normalizeUserRecord({
                                id: toStr(u.id) || generateUserRecordId(),
                                role: toStr(u.role),
                                displayName: toStr(u.displayName),
                                email: toStr(u.email),
                                phone: toStr(u.phone),
                                notes: toStr(u.notes),
                                password: toStr(u.password),
                                permissions: mergedPerm,
                                createdAt: u.createdAt || '',
                                createdBy: toStr(u.createdBy),
                                updatedAt: u.updatedAt || '',
                                updatedBy: toStr(u.updatedBy)
                            });
                        })
                        .filter((u) => u.email);
                    validateAuthSession();
                }
                if (Array.isArray(parsed.passwordResetRequests)) {
                    localStorage.setItem('bhd_password_reset_requests', JSON.stringify(parsed.passwordResetRequests));
                }
                if (Array.isArray(parsed.addressBookEditRequests)) {
                    localStorage.setItem('bhd_addressbook_edit_requests', JSON.stringify(parsed.addressBookEditRequests));
                }
                if (parsed.addressBookEditGrants && typeof parsed.addressBookEditGrants === 'object') {
                    localStorage.setItem('bhd_addressbook_edit_grants', JSON.stringify(parsed.addressBookEditGrants));
                }
                if (Array.isArray(parsed.contractEditRequests)) {
                    localStorage.setItem('bhd_contract_edit_requests', JSON.stringify(parsed.contractEditRequests));
                }
                if (parsed.contractEditGrants && typeof parsed.contractEditGrants === 'object') {
                    localStorage.setItem('bhd_contract_edit_grants', JSON.stringify(parsed.contractEditGrants));
                }

                localStorage.setItem('bhd_unit_reservations', JSON.stringify(unitReservations));
                localStorage.setItem('bhd_eviction_requests', JSON.stringify(evictionRequests));
                localStorage.setItem('bhd_owner_building_map', JSON.stringify(ownerBuildingMap));
                localStorage.setItem('bhd_building_profiles', JSON.stringify(buildingProfiles));
                localStorage.setItem('bhd_owner_profiles', JSON.stringify(ownerProfiles));
                localStorage.setItem('bhd_address_book', JSON.stringify(addressBookEntries));
                localStorage.setItem('bhd_managed_units', JSON.stringify(managedUnitsData));
                localStorage.setItem('bhd_users_registry', JSON.stringify(usersRegistry));
                localStorage.setItem('bhd_auth_session', JSON.stringify(authSession));

                try { syncTenantEntityFieldsFromType(); } catch (eSyn) {}
                try { hydrateContractDocumentsFromStoredJson(); } catch (eHydr) {}
                try { mergeMandatoryDocsFromAddressBookAfterLoadIfMatch(); } catch (eAb2) {}

                renderDocument(currentDoc);
                updateAuthHeaderBar();
                renderAddressBookTable();
                syncBhdKvToServer();
                alert('✅ تم استيراد البيانات بنجاح.');
            } catch (err) {
                alert('❌ ملف البيانات غير صالح. يرجى اختيار ملف JSON صحيح.');
            }
    }

    function importDataFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => importDataFileFromJsonText(e.target.result);
        reader.readAsText(file, 'utf-8');
    }
    
    async function loadAllDataFromDisk() {
        if (bhdApiAvailable) await pullBhdKvFromServer();
        loadAllData(true);
    }

    function loadAllData(showAlert = true) {
        const saved = localStorage.getItem('bhd_contract_full');
        if(saved) {
            const data = JSON.parse(saved);
            document.getElementById('agreementNo').value = data.agreementNo;
            document.getElementById('contractTypeSelect').value = data.contractType;
            if (document.getElementById('municipalFormNo')) document.getElementById('municipalFormNo').value = data.municipalFormNo || '';
            if (document.getElementById('municipalContractNo')) document.getElementById('municipalContractNo').value = data.municipalContractNo || '';
            document.getElementById('typeSelect').value = data.type;
            document.getElementById('tenantNameAr').value = data.tenantNameAr;
            document.getElementById('tenantNameEn').value = data.tenantNameEn;
            document.getElementById('tenantId').value = data.tenantId;
            document.getElementById('tenantMobile').value = data.tenantMobile;
            document.getElementById('tenantPassport').value = data.tenantPassport || '';
            document.getElementById('tenantEmail').value = data.tenantEmail || '';
            if (document.getElementById('tenantEntityType')) document.getElementById('tenantEntityType').value = data.tenantEntityType || 'person';
            if (document.getElementById('tenantCommercialRegNo')) document.getElementById('tenantCommercialRegNo').value = data.tenantCommercialRegNo || '';
            if (document.getElementById('tenantCommercialRegExpiryDate')) document.getElementById('tenantCommercialRegExpiryDate').value = data.tenantCommercialRegExpiryDate || '';
            if (document.getElementById('tenantCompanyExtraMobile')) document.getElementById('tenantCompanyExtraMobile').value = data.tenantCompanyExtraMobile || '';
            if (document.getElementById('tenantCompanySignatoriesJson')) document.getElementById('tenantCompanySignatoriesJson').value = data.tenantCompanySignatoriesJson || '[]';
            if (document.getElementById('tenantNationality')) {
                try { ensureTenantNationalitySelect(false); } catch (e) {}
                document.getElementById('tenantNationality').value = data.tenantNationality || 'عماني / Omani';
            }
            if (document.getElementById('contractMandatoryDocsJson')) document.getElementById('contractMandatoryDocsJson').value = data.contractMandatoryDocsJson || '{}';
            if (document.getElementById('contractOtherDocsJson')) document.getElementById('contractOtherDocsJson').value = data.contractOtherDocsJson || '[]';
            document.getElementById('buildingNo').value = data.buildingNo;
            document.getElementById('flatNo').value = data.flatNo;
            document.getElementById('floorDetails').value = data.floorDetails;
            document.getElementById('unitType').value = data.unitType;
            if (document.getElementById('usageType')) document.getElementById('usageType').value = data.usageType || 'سكني Residential';
            document.getElementById('electricityMeter').value = data.electricityMeter;
            document.getElementById('waterMeter').value = data.waterMeter;
            document.getElementById('monthlyRent').value = data.monthlyRent;
            if (document.getElementById('rentCalcMode')) document.getElementById('rentCalcMode').value = data.rentCalcMode || 'full';
            if (document.getElementById('rentAreaSqm')) document.getElementById('rentAreaSqm').value = data.rentAreaSqm || '';
            if (document.getElementById('rentPerSqm')) document.getElementById('rentPerSqm').value = data.rentPerSqm || '';
            document.getElementById('contractMonths').value = data.contractMonths;
            document.getElementById('startDate').value = data.startDate;
            document.getElementById('endDate').value = data.endDate;
            try {
                if (toStr(data.startDate) && toStr(data.endDate)) {
                    recomputeContractPeriodFields('endDate');
                } else if (toStr(data.startDate) && toStr(data.contractMonths)) {
                    recomputeContractPeriodFields('contractMonths');
                }
            } catch (_ePeriodLoad) {}
            if (document.getElementById('unitHandoverDate')) document.getElementById('unitHandoverDate').value = data.unitHandoverDate || '';
            if (document.getElementById('agreedRentPaymentDay')) {
                let dayVal = toStr(data.agreedRentPaymentDay);
                if (!dayVal && data.agreedRentPaymentDate) {
                    try {
                        const dt = new Date(data.agreedRentPaymentDate);
                        if (!Number.isNaN(dt.getTime())) dayVal = String(dt.getDate());
                    } catch (e) {}
                }
                document.getElementById('agreedRentPaymentDay').value = dayVal || '5';
            }
            document.getElementById('paymentMethod').value = data.paymentMethod;
            if (document.getElementById('contractSubjectToVat')) {
                document.getElementById('contractSubjectToVat').value = data.contractSubjectToVat || 'no';
            }
            if (document.getElementById('vatPaymentMode')) {
                document.getElementById('vatPaymentMode').value = data.vatPaymentMode || 'with_rent';
            }
            if (document.getElementById('vatChequeCount')) {
                document.getElementById('vatChequeCount').value = data.vatChequeCount || '1';
            }
            document.getElementById('depositAmount').value = data.depositAmount;
            if (document.getElementById('depositReceiptRef')) document.getElementById('depositReceiptRef').value = data.depositReceiptRef || '';
            {
                const dar = document.getElementById('depositAttachmentRow');
                if (dar) {
                    dar.dataset.attachmentName = toStr(data.depositAttachmentName);
                    dar.dataset.attachmentDataUrl = toStr(data.depositAttachmentDataUrl);
                    const dsp = dar.querySelector('[data-deposit-att-name]');
                    if (dsp) dsp.textContent = toStr(data.depositAttachmentName) || '—';
                }
                const dinp = document.getElementById('depositAttachmentInput');
                if (dinp) dinp.value = '';
            }
            try { refreshContractFinancialCalculations(); } catch (_eGraceLoad) {}
            if (document.getElementById('otherDiscountAmount')) document.getElementById('otherDiscountAmount').value = data.otherDiscountAmount || '0';
            try { renderExtraAdjustmentsRows(JSON.parse(toStr(data.extraAdjustmentsJson) || '[]')); } catch (e) { renderExtraAdjustmentsRows([]); }
            try { renderInsuranceDepositItemsRows(JSON.parse(toStr(data.insuranceDepositItemsJson) || '[]')); } catch (e) { renderInsuranceDepositItemsRows([]); }
            try { renderCustomRentItemsRows(JSON.parse(toStr(data.customRentItemsJson) || '[]')); } catch (e) { renderCustomRentItemsRows([]); }
            try {
                hydrateContractPaymentAndVatSchedulesFromPayload(data, { refreshVatWithRent: true });
            } catch (_eVatLoad) {}
            ensureTypeSelectAlwaysNew();
            try { syncTenantEntityFieldsFromType(); } catch (e) {}
            try { hydrateContractDocumentsFromStoredJson(); } catch (eHydr) {}
            try { refreshContractFinancialCalculations(); } catch (_eLoadFin) {}
            try { syncContractPeriodDisplay(); } catch (_ePerLoad) {}
            try { renderDocument(currentDoc); } catch (_eLoadDoc) {}
        }
        const savedBuildings = localStorage.getItem('bhd_buildings_list');
        if(savedBuildings) {
            buildingsList.length = 0;
            JSON.parse(savedBuildings).forEach(b => buildingsList.push(b));
        }
        const savedOwners = localStorage.getItem('bhd_owners_list');
        if(savedOwners) {
            ownersList.length = 0;
            JSON.parse(savedOwners).forEach(o => ownersList.push(o));
        }
        const savedOwnerProfiles = localStorage.getItem('bhd_owner_profiles');
        if (savedOwnerProfiles) {
            try {
                ownerProfiles = JSON.parse(savedOwnerProfiles) || {};
            } catch (e) {
                ownerProfiles = {};
            }
        }
        const savedAddressBook = localStorage.getItem('bhd_address_book');
        if (savedAddressBook) {
            try {
                addressBookEntries = JSON.parse(savedAddressBook) || [];
                if (!Array.isArray(addressBookEntries)) addressBookEntries = [];
            } catch (e) {
                addressBookEntries = [];
            }
        }
        try { mergeMandatoryDocsFromAddressBookAfterLoadIfMatch(); } catch (eAbPost) {}
        const savedProfiles = localStorage.getItem('bhd_building_profiles');
        if (savedProfiles) {
            try {
                buildingProfiles = JSON.parse(savedProfiles) || {};
            } catch (e) {
                buildingProfiles = {};
            }
        }
        const savedManagedUnits = localStorage.getItem('bhd_managed_units');
        if (savedManagedUnits) {
            try {
                managedUnitsData = JSON.parse(savedManagedUnits) || [];
            } catch (e) {
                managedUnitsData = [];
            }
        } else {
            syncManagedUnitsFromProfiles();
        }
        const savedRegistry = localStorage.getItem('bhd_file_registry');
        if (savedRegistry) {
            try {
                const parsed = JSON.parse(savedRegistry);
                if (Array.isArray(parsed)) fileRegistry = parsed;
            } catch (e) {
                fileRegistry = [];
            }
        }
        const savedUsersReg = localStorage.getItem('bhd_users_registry');
        if (savedUsersReg) {
            try {
                usersRegistry = JSON.parse(savedUsersReg) || [];
                if (!Array.isArray(usersRegistry)) usersRegistry = [];
            } catch (e) {
                usersRegistry = [];
            }
        } else {
            usersRegistry = [];
        }
        try {
            ensureDefaultBhdAdminAccount();
        } catch (eEnsLd) {}
        try {
            authSession = JSON.parse(localStorage.getItem('bhd_auth_session') || 'null');
            if (!authSession || typeof authSession !== 'object') authSession = null;
        } catch (e) {
            authSession = null;
        }
        validateAuthSession();
        if(isViewerMode) {
            renderDocument(currentDoc);
        } else {
            updateSummaryPanel();
            updateAuthHeaderBar();
            renderOperationsTable();
            renderRegistryTable();
            renderAddressBookTable();
            try { populateAddressBookTypeSelect('tenant'); } catch (_eAbTypes) {}
        }
        if (!isViewerMode) {
            try {
                restoreTenancyCompletionLockFromStorage();
            } catch (eRestoreAfterLoad) {}
        }
        try { applyContractsWorkspaceLockState(); } catch (_eLoadLock) {}
        try {
            rememberContractWorkspaceUnitPointers(
                document.getElementById('buildingNo')?.value,
                document.getElementById('flatNo')?.value
            );
        } catch (_ePtrLoad) {}
        if (showAlert) {
            alert('📂 تم استعادة البيانات المحفوظة');
        }
    }

    function buildRuntimePayload() {
        return {
            contract: getFormData(),
            buildings: [...buildingsList],
            owners: [...ownersList],
            fileRegistry: [...fileRegistry],
            currentDoc
        };
    }

    async function openDocumentsWindow(payloadOverride = null, options = {}) {
        if (
            !isViewerMode &&
            !assertPermissionOrAlert(
                'manage_contracts',
                'لا تملك صلاحية العقود والمستندات.',
                'No permission to access contracts & documents.'
            )
        ) {
            return;
        }
        if (!isViewerMode && isContractsWorkspaceScreenActive() && !isContractWorkspaceUnlockedForCurrentUnit()) {
            alertContractWorkspaceLockedOrMissingUnit();
            try { applyContractsWorkspaceLockState(); } catch (_eDocLock) {}
            return;
        }
        if (!(await validateCoreData())) return;
        const payload = payloadOverride || buildRuntimePayload();
        const payloadKey = options.payloadKey || 'bhd_runtime_payload';
        localStorage.setItem(payloadKey, JSON.stringify(payload));
        const baseUrl = window.location.href.split('?')[0];
        const params = new URLSearchParams({ viewer: '1', payloadKey });
        if (options.autoPrint) params.set('autoprint', '1');
        window.open(`${baseUrl}?${params.toString()}`, '_blank');
    }

    function syncTopNavOffset() {
        if (isViewerMode) return;
        const nav = document.getElementById('appTopNav');
        if (!nav) return;
        const gapPx = Math.round((0.2 / 2.54) * 96); // 0.2 cm in px
        const navHeight = Math.ceil(nav.getBoundingClientRect().height || 0);
        const offsetPx = navHeight + gapPx;
        document.body.style.setProperty('--top-nav-offset', `${offsetPx}px`);
        document.body.style.setProperty('--workspace-top-gap', `${offsetPx}px`);
    }

    function pickLocalizedSegment(text) {
        const src = String(text || '');
        if (!src.includes('/')) return src;
        const parts = src.split('/').map((p) => p.trim()).filter(Boolean);
        if (parts.length < 2) return src;
        const hasArabic = (s) => /[\u0600-\u06FF]/.test(s);
        if (appUiLanguage === 'ar') {
            return parts.find((p) => hasArabic(p)) || parts[0];
        }
        return parts.find((p) => !hasArabic(p)) || parts[parts.length - 1];
    }

    function localizeBilingualUi(scopeRoot) {
        if (isViewerMode) return;
        const allRoots = ['.dashboard', '.contracts-workspace', '.reservations-workspace', '.users-workspace', '.notifications-workspace', '.addressbook-workspace', '.accounting-workspace', '.maintenance-workspace', '#addressBookEntryModal', '#dashboardInsightModal', '#unitDetailsModal', '#unitDetailsCancelDraftModal', '#unitDetailsCancellationDocsModal', '#unitHistoryEventDetailModal', '#unitAccountingDetailModal', '#accountingChequeActionModal', '#accountingManualEntryModal', '#accountingApprovalModal', '#accountingContractReceiptModal', '#accountingContractChequeBulkReceiptModal', '#accountingPropertyReviewModal', '#accountingAuditCycleModal', '#appDialogModal', '#manualEntryReceivablePickerModal', '#accountingCoaEditorModal', '#accountingUnitAccountModal', '#accountingReportModal', '#maintenanceRequestModal', '#maintenanceDetailModal', '#maintenancePrintModal', '#maintenanceCatalogModal', '#maintenanceStatusActionModal', '#maintenanceUnitHistoryModal', '#authLoginModal', '#contractEditThreadModal', '#propertyPrintMenuModal', '#dataGapsModal', '#dataCleanupModal', '#storageManagementModal', '#contractRenewalGapsModal'];
        const roots = scopeRoot ? [scopeRoot] : allRoots;
        const selector = 'h1,h2,h3,h4,h5,h6,p,small,strong,span,label,button,th,td,option,input,textarea,select';
        roots.forEach((rootSel) => {
            const root = document.querySelector(rootSel);
            if (!root) return;
            root.querySelectorAll(selector).forEach((el) => {
                if (el.hasAttribute('data-ar') && el.hasAttribute('data-en')) return;
                if (el.querySelector && el.querySelector('input,textarea,select')) return;
                if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.children.length === 0) {
                    const sourceText = el.dataset.i18nSourceText || el.textContent;
                    if (typeof sourceText === 'string' && sourceText.includes('/')) {
                        el.dataset.i18nSourceText = sourceText;
                        el.textContent = pickLocalizedSegment(sourceText);
                    }
                }
                if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.children.length > 0) {
                    const textNodes = Array.from(el.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE && toStr(n.nodeValue).trim());
                    if (textNodes.length === 1) {
                        const sourceText = el.dataset.i18nSourceText || textNodes[0].nodeValue;
                        if (typeof sourceText === 'string' && sourceText.includes('/')) {
                            el.dataset.i18nSourceText = sourceText;
                            textNodes[0].nodeValue = ` ${pickLocalizedSegment(sourceText)} `;
                        }
                    }
                }
                const placeholder = el.dataset.i18nSourcePlaceholder || el.getAttribute('placeholder');
                if (typeof placeholder === 'string' && placeholder.includes('/')) {
                    el.dataset.i18nSourcePlaceholder = placeholder;
                    el.setAttribute('placeholder', pickLocalizedSegment(placeholder));
                }
                const title = el.dataset.i18nSourceTitle || el.getAttribute('title');
                if (typeof title === 'string' && title.includes('/')) {
                    el.dataset.i18nSourceTitle = title;
                    el.setAttribute('title', pickLocalizedSegment(title));
                }
            });
        });
    }

    function applyAppLanguage(options) {
        const fast = options && options.fast === true;
        document.documentElement.lang = appUiLanguage === 'en' ? 'en' : 'ar';
        document.documentElement.dir = appUiLanguage === 'en' ? 'ltr' : 'rtl';
        document.body.style.direction = appUiLanguage === 'en' ? 'ltr' : 'rtl';
        document.body.classList.remove('lang-ar', 'lang-en');
        document.body.classList.add(appUiLanguage === 'en' ? 'lang-en' : 'lang-ar');
        const langButtons = document.querySelectorAll('[data-ar][data-en]');
        langButtons.forEach((btn) => {
            if (btn.querySelector && btn.querySelector('input,textarea,select,button,a,table,div')) return;
            btn.textContent = appUiLanguage === 'en' ? btn.dataset.en : btn.dataset.ar;
        });
        document.querySelectorAll('.app-top-nav [data-ar][data-en], .dashboard-main-nav [data-ar][data-en]').forEach((btn) => {
            btn.textContent = appUiLanguage === 'en' ? btn.dataset.en : btn.dataset.ar;
        });
        const langToggleBtn = document.getElementById('langToggleTopBtn');
        if (langToggleBtn) {
            langToggleBtn.textContent = appUiLanguage === 'en' ? '🌐 English' : '🌐 العربية';
            langToggleBtn.title = appUiLanguage === 'en'
                ? 'Change language to Arabic'
                : 'تغيير اللغة إلى الإنجليزية';
        }
        if (fast) {
            syncTopNavOffset();
            const finishLang = () => {
                try {
                    localizeBilingualUi();
                    updateAuthHeaderBar();
                } catch (_eLangIdle) {}
            };
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(finishLang, { timeout: 4000 });
            } else {
                setTimeout(finishLang, 80);
            }
            return;
        }
        localizeBilingualUi();
        updateAuthHeaderBar();
        if (!isViewerMode && document.body.classList.contains('mode-dashboard')) {
            renderOperationsTable();
            renderRegistryTable();
        }
        syncTopNavOffset();
    }

    function toggleAppLanguage() {
        appUiLanguage = appUiLanguage === 'en' ? 'ar' : 'en';
        localStorage.setItem('bhd_ui_language', appUiLanguage);
        applyAppLanguage();
    }

    function updateSideNavActive(mode) {
        const targets = document.querySelectorAll('[data-nav-target]');
        targets.forEach((btn) => {
            const isActive = btn.dataset.navTarget === mode;
            btn.classList.toggle('btn-primary', isActive);
            btn.classList.toggle('btn-outline', !isActive);
        });
        const adminBtn = document.getElementById('appTopNavAdminBtn');
        if (adminBtn) {
            const adminActive = mode === 'users' || mode === 'forms' || mode === 'organization' || mode === 'doc_templates';
            adminBtn.classList.toggle('btn-primary', adminActive);
            adminBtn.classList.toggle('btn-outline', !adminActive);
        }
    }

    function canAccessAppAdminMenu() {
        if (!usersRegistryHasRows()) return true;
        return (
            effectivePermission('manage_users') ||
            effectivePermission('import_export') ||
            effectivePermission('manage_contracts')
        );
    }

    function applyAppAdminMenuPermissions() {
        const setItemVisible = (el, ok) => {
            if (!el) return;
            el.style.display = ok ? '' : 'none';
            el.disabled = !ok;
            el.setAttribute('aria-hidden', ok ? 'false' : 'true');
        };
        document.querySelectorAll('[data-admin-perm]').forEach((el) => {
            const perm = el.getAttribute('data-admin-perm');
            let ok = true;
            if (perm === 'manage_users') ok = effectivePermission('manage_users');
            else if (perm === 'import_export') ok = effectivePermission('import_export');
            else if (perm === 'manage_contracts') ok = effectivePermission('manage_contracts');
            setItemVisible(el, ok);
        });
        document.querySelectorAll('[data-admin-perm-any]').forEach((el) => {
            const raw = toStr(el.getAttribute('data-admin-perm-any'));
            const keys = raw.split(',').map((x) => x.trim()).filter(Boolean);
            setItemVisible(el, keys.length ? effectivePermissionAny(keys) : true);
        });
        const menuOk = canAccessAppAdminMenu();
        document.querySelectorAll('.app-admin-menu-wrap').forEach((wrap) => {
            const items = wrap.querySelectorAll('[data-admin-perm], [data-admin-perm-any]');
            const anyItem = [...items].some((el) => el.style.display !== 'none');