    // ======================== البيانات الكاملة ========================
    let currentDoc = 0;
    
    // قوائم المباني والملاك — تُملأ من التخزين أو الإدخال فقط
    let buildingsList = [];
    let ownersList = [];
    
    // قائمة الأثاث
    const furnitureItems = [
        "أجهزة التكييف / AC",
        "جهاز التحكم بالتكييف / AC remote",
        "طفايات الحريق / Fire extinguishers",
        "بطانية الحريق / Fire blanket",
        "مراوح السقف / Ceiling fans",
        "مراوح الشفط / Exhaust fans",
        "الإنارة / Lighting",
        "سخان الماء / Water heater",
        "الأبواب / Doors",
        "النوافذ / Windows",
        "المفاتيح / Keys",
        "جهاز توجيه الإنترنت / Internet router",
        "الحمامات / Bathrooms",
        "المطبخ / Kitchen"
    ];
    
    // البنود الكاملة من ملحق العقد (17 بنداً)
    const allClauses = [
        { num: "1", titleAr: "طريقة الاتصال الرسمية", titleEn: "Official Communication Method",
          textAr: "يجب تسليم جميع المراسلات الرسمية الكتابة باليد أو عناوين البريد الإلكتروني المسجلة في هذه الاتفاقية.",
          textEn: "All official communication must be delivered in writing by hand or the registered email addresses in this agreement." },
        { num: "2", titleAr: "وديعة الحجز غير قابلة للاسترداد", titleEn: "Non-Refundable Booking Deposit",
          textAr: "في حالة عدم قيام المستأجر باستئجار الوحدة ، سيتم مصادرة وديعة الحجز غير القابلة للاسترداد. بمجرد توقيع هذه الاتفاقية ودفع المستأجر إيجار الشهر الأول من اتفاقية الإيجار ، سيتم تحويل وديعة الحجز غير القابلة للاسترداد تلقائيًا إلى وديعة تأمين.",
          textEn: "In case the Tenant does not proceed with renting the Unit, the non-refundable booking deposit will be forfeited. Once this agreement is signed and the Tenant has paid the rent for the first month of the tenancy agreement, the non-refundable booking deposit will automatically be converted to a security deposit." },
        { num: "3", titleAr: "مبلغ التأمين", titleEn: "Security Deposit",
          textAr: "يتعين على المستأجر إيداع إيجار شهر واحد والاحتفاظ به كوديعة ضمان طوال فترة الإيجار. وديعة الضمان قابلة للاسترداد بشرط استكمال المستأجر لفترة الإيجار الكاملة وفقًا للاتفاقية وتسوية جميع مستحقاته. إذا تم إنهاء عقد الإيجار مبكرًا لأي سبب من الأسباب ، فسيتم مصادرة وديعة التأمين.",
          textEn: "The Tenant is required to deposit and maintain one month's rent as a security deposit throughout the tenancy period. The security deposit is refundable subject to the Tenant completing their full tenancy period as per the agreement and clearing all their dues. If the tenancy agreement is terminated early for any reason, the security deposit will be forfeited." },
        { num: "4", titleAr: "شروط الدفع", titleEn: "Payment Terms",
          textAr: "يجب على المستأجر دفع الإيجار المستحق في اليوم الأول من الشهر مقدمًا. يجب على المستأجر تقديم شيكات مؤجلة الدفع لكامل مدة عقد الإيجار. يجب على المستأجر تقديم 3 شيكات إضافية مفتوحة الدفع تعادل 3 أشهر من الإيجار. سيتم إيداعها من قبل المالك في حالة وجود أي إيجار مستحق أو مستحقات أخرى. إذا فضل المستأجر دفع الإيجار عن طريق التحويل المصرفي بدلاً من ذلك ، فيجب تسوية الدفع قبل ثلاثة أيام عمل على الأقل من تاريخ استحقاق الإيجار. علاوة على ذلك ، يجب على المستأجر إبلاغ المالك بمجرد اكتمال التحويل المصرفي بطريقة اتصال رسمية.",
          textEn: "The Tenant must pay the due rent on the 01st of the month in advance. The Tenant must provide post-dated cheques for the entire duration of the tenancy agreement. The Tenant must provide 3 additional open-dated cheques equivalent to 3 months of rent. These will be deposited by the Landlord in case of any outstanding rent or other dues. If the Tenant prefers to pay the rent by a bank transfer instead, the payment should be cleared at least three working days prior to the rent due date. Moreover, the Tenant should inform the Landlord once the bank transfer is completed by an official communication method." },
        { num: "5", titleAr: "الدفعات المتأخرة", titleEn: "Late Payments",
          textAr: "تاريخ إيداع الشيك هو الأول من الشهر. في حالة ارتداد الشيك الخاص بالمستأجر في اليوم الأول ، سيقوم المالك بإيداعه مرة أخرى في اليوم العاشر من الشهر ، إلا إذا قام المستأجر بتخليص الإيجار عن طريق التحويل المصرفي قبل اليوم العاشر. إذا ارتد شيك المستأجر بسبب عدم كفاية الأموال ، سيتم فرض غرامة قدرها 5 ٪ من مبلغ الشيك من قبل المالك. إذا لم يتم استلام الإيجار بحلول الخامس عشر من الشهر ، فسيتم فرض غرامة تأخير قدرها 15٪ على قيمة الشيك في الخامس عشر من الشهر. سيتم فرض غرامة إضافية بنسبة 1٪ على رسوم التأخير عن كل يوم تأخير إضافي في الإيجار بعد اليوم الخامس عشر من الشهر.",
          textEn: "The cheque deposit date is the 01st of the month. In case the Tenant's cheque bounces on the 01st, the Landlord will deposit it again on the 10th of the month, unless the Tenant has cleared the rent by bank transfer prior to the 10th. If the Tenant's cheques bounce due to insufficient funds, a penalty of 5% of the cheque amount will be charged by the Landlord. If the rent is not received by the 15th of the month, a 15% late fee penalty will be charged on the cheque value on the 15th of the month. An additional 1% late fee penalty will be charged for every additional day of delay in rent after the 15th of the month." },
        { num: "6", titleAr: "فواتير المياه والكهرباء", titleEn: "Utility Bills",
          textAr: "يتعين على المستأجر دفع جميع فواتير المرافق الخاصة بوحدته بالكامل كل شهر. إذا تراكمت فواتير المستأجر المجمعة للمياه والكهرباء لأكثر من 25٪ من الإيجار الشهري ، يحق للمالك فصل الكهرباء والمياه عن الوحدة واتخاذ الإجراءات القانونية. قد يتم أيضًا خصم مبلغ الفاتورة المعلقة من وديعة التأمين. مع تحمل المستأجر كافة التبعات القانونية والخسائر التي قد يتكبدها نتيجة قطع الخدمة عنه. في حالة قيام المالك بدفع فواتير الخدمات نيابة عن المستأجر ، سيتم فرض رسوم خدمة بنسبة 5٪ من الإيجار الشهري.",
          textEn: "The Tenant is required to pay all utility bills of their Unit in full every month. If the Tenant's combined bills for water and electricity accumulate to over 25% of their monthly rent, the Landlord has the right to disconnect the electricity and water of the Unit and take legal action. The pending bill amount may also be deducted from the security deposit. With the tenant bearing all the legal consequences and losses that he may incur as a result of cutting the service for him. In case the Landlord pays the utility bills on the Tenant's behalf, a service charge of 5% of the monthly rent will be charged." },
        { num: "7", titleAr: "شروط الإقامة", titleEn: "Conditions of Stay",
          textAr: "يجب على المستأجر الالتزام بجميع التعليمات الصادرة عن المالك ، والتي قد تتغير خلال عقد الإيجار. لا يجوز للمستأجر تأجير الوحدة من الباطن. سيتم شغل الوحدة من قبل المستأجر وعائلته المباشرة فقط ، وسيتم استخدامها فقط للأغراض السكنية. لن يقوم المستأجر بإجراء أي تغييرات على الوحدة المؤجرة دون موافقة المالك. في حالة إجراء أي تغييرات دون موافقة المالك ، يحق للمالك إلغاء عقد الإيجار. يجب على المستأجر إعادة الوحدة في نهاية عقد الإيجار إلى الحالة الأصلية التي استلمها بها في بداية عقد الإيجار. سيكون المستأجر مسؤولاً عن أي ضرر يحدث لوحدته أو العقار بأكمله والذي يحدث من قبل المستأجر أو ضيوف المستأجر أو المدعوين.",
          textEn: "The Tenant shall abide by all the instructions issued by the Landlord, which may change throughout the tenancy agreement. The Tenant is not allowed to sublet the Unit. The Unit will be occupied only by the Tenant and their immediate family, and used only for residential purposes. The Tenant will not make any changes to the leased Unit without approval from the Landlord. In case any changes are made without the Landlord's approval, the Landlord has the right to cancel the tenancy agreement. The Tenant must return the Unit at the end of their tenancy agreement in the original condition that they received it in at the start of the tenancy agreement. The Tenant will be liable for any damage occurring to their Unit or the entire Property which is done by the Tenant or the Tenant's guests or invitees." },
        { num: "8", titleAr: "مخالفات الشروط", titleEn: "Violations of Conditions",
          textAr: "في حالة عدم التزام المستأجر بأي شروط للإقامة ، يحق للمالك فرض غرامة قدرها 5٪ من الإيجار الشهري لكل مخالفة في اليوم. إذا لم يقم المستأجر بحل المخالفة على الفور ، سيتم فرض غرامة يومية قدرها 5٪ من الإيجار الشهري عن كل يوم تستمر فيه المخالفة. إذا تجاوز الانتهاك المحدد شهرًا واحدًا من تاريخ التحذير ، أو إذا تلقى المستأجر انتهاكات جسيمة خلال فترة الإيجار ، يحق للمالك إنهاء عقد الإيجار ويجب على المستأجر إخلاء الوحدة على الفور. سيؤدي عدم القيام بذلك إلى اتخاذ إجراءات قانونية. في حالة مخالفة المستأجر لوقوف السيارات ، بالإضافة إلى الغرامة اليومية البالغة 5٪ من الإيجار الشهري ، يحق للمالك ، دون سابق إنذار ، إزالة أو سحب السيارة المعنية وتحميل التكاليف على المستأجر.",
          textEn: "In case the Tenant does not abide by any conditions of stay, the Landlord has the right to impose a penalty of 5% of the monthly rent per violation, per day. If the Tenant does not resolve the violation immediately, a daily penalty of 5% of the monthly rent will be imposed for each day the violation continues. If a specific violation exceeds 1 month from the date of warning, or if the Tenant receives significant violations during their tenancy period, the Landlord has the right to terminate the lease agreement and the Tenant should vacate the unit immediately. Failure to do so will result in legal action being taken. In case of a Parking Violation by the Tenant, along with the daily penalty of 5% of the monthly rent, the Landlord shall have the right, without notice, to remove or tow away the vehicle involved and charge the costs to the Tenant." },
        { num: "9", titleAr: "بطاقات الوصول ووسائل الراحة", titleEn: "Access Cards and Building Amenities",
          textAr: "يحق للمالك فصل بطاقات الوصول إلى المبنى الخاصة بالمستأجر وجميع وسائل الراحة الأخرى في أي وقت في حالة عدم التزام المستأجر بأي من متطلبات الإيجار الخاصة بهم.",
          textEn: "The Landlord has the right to disconnect the Tenant's building access cards and all other amenities anytime in case the Tenant does not abide by any of their tenancy requirements." },
        { num: "10", titleAr: "الإجراءات القانونية", titleEn: "Legal Action",
          textAr: "سيكون المستأجر مسؤولاً عن جميع النفقات القانونية التي يتحملها المالك في حالة حدوث أي انتهاك لهذا الإيجار.",
          textEn: "The Tenant will be liable for all legal expenses borne by the Landlord in case of any violation of this tenancy." },
        { num: "11", titleAr: "الصيانة والإصلاحات", titleEn: "Maintenance and Repairs",
          textAr: "يوافق المستأجر على الحفاظ على نظافة وحدته ويتحمل مسؤولية الأضرار وتنظيف النوافذ وجميع الإصلاحات الطفيفة. تشمل الإصلاحات البسيطة استبدال البطاريات والمصابيح الكهربائية والأنابيب.",
          textEn: "Tenant agrees to keep their Unit clean and takes responsibility for damages, window cleaning and all minor repairs. Minor repairs include replacing batteries, light bulbs and tubes." },
        { num: "12", titleAr: "حق الدخول", titleEn: "Right of Entry",
          textAr: "في حالة الطوارئ ، سيحاول المالك الاتصال بالمستأجر. إذا لم يتم تلقي أي رد ، يحق للمالك دخول الوحدة.",
          textEn: "In case of emergencies, the Landlord will attempt to contact the Tenant. If no response is received, the Landlord has the right to enter the Unit." },
        { num: "13", titleAr: "تجديد الإيجار", titleEn: "Tenancy Renewal",
          textAr: "للمالك الحق في زيادة الإيجار الشهري إلى أجل غير مسمى خلال تجديد عقد الإيجار. قبل تجديد عقد الإيجار ، سيقدم المستأجر جميع المستندات المطلوبة ووديعة الضمان والشيكات المؤجلة. بدون هذه الشروط ، لن يتمكن المستأجر من تجديد عقد الإيجار الخاص به. في حالة التأخير في تجديد عقد الإيجار بسبب المستأجر ، سيكون المستأجر مسؤولاً عن رسوم تجديد البلدية وجميع غرامات البلدية.",
          textEn: "The Landlord has the right to increase the monthly rent indefinitely during the tenancy renewal. Before renewing the tenancy agreement, the Tenant will provide all required documentation, security deposit and post-dated cheques. Without these, the Tenant will be unable to renew their tenancy agreement. In case of a delay in renewal of the tenancy agreement due to the Tenant, the Tenant will be liable for the Municipality renewal fee and all Municipality fines." },
        { num: "14", titleAr: "إخلاء الوحدة", titleEn: "Vacating the Unit",
          textAr: "يجب على المستأجر إكمال الفترة الكاملة لعقد الإيجار. إذا رغب المستأجر في إخلاء الوحدة في نهاية عقد الإيجار ، فيجب تقديم إشعار لمدة 90 يومًا إلى المالك من خلال وسيلة اتصال رسمية. إذا قدم المستأجر إشعارًا مدته أقل من 90 يومًا لإخلاء الوحدة في نهاية اتفاقية الإيجار ، فسيكون المستأجر مسؤولاً عن الإيجار لمدة 90 يومًا من تاريخ إخطاره الرسمي. يحق للمالك رفض تسليم الوحدة بعد نهاية فترة الإيجار إذا لم يقم المستأجر بتصفية جميع مستحقاته بالكامل. يلتزم المستأجر بدفع فواتير الإيجار والمرافق حتى اكتمال التسليم من قبل المالك.",
          textEn: "The Tenant must complete the full period of the tenancy agreement. If the Tenant wishes to vacate the Unit at the end of their tenancy agreement, a 90-day notice must be given to the Landlord by an official communication method. If the tenant gives less than a 90-day notice to vacate the Unit at the end of their tenancy agreement, the Tenant will be liable for rent for 90 days from the date of their official notice. The Landlord has the right to refuse the handover of the Unit after the end of the tenancy period if the Tenant has not cleared all their dues in full. The Tenant will be obligated to pay rent and utility bills until the handover is completed by the Landlord." },
        { num: "15", titleAr: "تسليم الوحدة", titleEn: "Handover of Unit",
          textAr: "يجب على المستأجر إكمال نموذج التسليم وإعادة جميع المفاتيح وبطاقات الوصول إلى مكتب المالك قبل إنهاء عقد الإيجار. سيصدر المالك استمارة براءة ذمة بمجرد اكتمال ذلك. بدون نموذج التخليص ، سيظل المستأجر مسؤولاً عن جميع المستحقات ، بما في ذلك فواتير الإيجار والمرافق. يجب على المستأجر إعادة الوحدة بنفس الحالة التي تم استلامها بها في بداية عقد الإيجار. سيؤدي عدم القيام بذلك إلى فرض رسوم على المستأجر. يجب على المستأجر تنظيف الوحدة بعمق قبل التسليم. سيؤدي عدم القيام بذلك إلى فرض رسوم تنظيف على المستأجر. سيكون المستأجر مسؤولاً عن أي أضرار تلحق بوحدة الملكية العامة. إذا لم يسلم المستأجر الوحدة بعد انتهاء عقد الإيجار ، فسيكون مسؤولاً عن دفع غرامة قدرها 3٪ من الإيجار الشهري لكل يوم ، بالإضافة إلى قيمة الإيجار الفعلية لتلك الفترة.",
          textEn: "The Tenant must complete the handover form and return all keys and access cards to the Landlord's office before the tenancy agreement can be ended. The Landlord will issue a clearance form once this is completed. Without the clearance form, the Tenant will continue to be liable for all dues, including rent and utility bills. The Tenant must return the Unit in the same condition that it was received at the start of the tenancy. Failure to do so will result in charges to the Tenant. The Tenant must have the Unit deep cleaned prior to handover. Failure to do so will result in a cleaning fee charged to the Tenant. The Tenant will be responsible for any damages to the Unit or overall Property. If the Tenant does not handover the Unit after the expiration of the tenancy agreement, they will be liable for a penalty fee of 3% of the monthly rent for every day, as well as the actual rent value for that period." },
        { num: "16", titleAr: "الرسوم والضرائب", titleEn: "Fees and Taxes",
          textAr: "المستأجر مسؤول عن جميع الرسوم والضرائب التي تفرضها الحكومة ، بما في ذلك على سبيل المثال لا الحصر ضريبة القيمة المضافة.",
          textEn: "The Tenant is liable for all fees and taxes imposed by the government, including but not limited to VAT." },
        { num: "17", titleAr: "شرط الفصل", titleEn: "Severability Clause",
          textAr: "في حالة عدم صلاحية أي حكم في هذه الاتفاقية ، لن يتم المساس بصلاحية الشروط والأحكام المتبقية بأي شكل من الأشكال.",
          textEn: "In case any provision in this agreement shall be invalid, the validity of the remaining terms and conditions shall not be impaired in any way." }
    ];
    
    const docNames = [
        "01- Residential", "02- Renewal", "03- Extension Addendum", "04- Declaration",
        "05- Check-In", "06- Check-Out", "07- Cancellation", "08- Invoice",
        "09- Unit Details", "10- Index", "11- Terms & Conditions", "12- Buildings & Owners"
    ];
    const DOCUMENT_SYSTEM_CATEGORIES = [
        { key: 'contract_forms', ar: 'استمارات العقود', en: 'Contract forms' },
        { key: 'tenant_letters', ar: 'رسائل المستأجرين', en: 'Tenant letters' },
        { key: 'owner_letters', ar: 'رسائل المالك', en: 'Owner letters' }
    ];
    let activeDocumentCategory = 'contract_forms';
    const DOCUMENT_SYSTEM_LIBRARY = {
        contract_forms: docNames.slice(),
        tenant_letters: [
            'Tenant Payment Reminder',
            'Tenant Late Payment Notice',
            'Tenant Contract Compliance Notice'
        ],
        owner_letters: [
            'Owner Notice to Tenant',
            'Owner Rent Update Letter',
            'Owner Property Access Notice'
        ]
    };
    const BHD_ORGANIZATION_SETTINGS_KEY = 'bhd_organization_settings';
    const BHD_BUSINESS_DOC_TEMPLATES_KEY = 'bhd_business_doc_templates';

    const BHD_BUSINESS_DOC_TEMPLATE_DEFS = [
        { key: 'invoice', labelAr: 'فاتورة', labelEn: 'Invoice', icon: '🧾' },
        { key: 'quotation', labelAr: 'عرض سعر', labelEn: 'Quotation', icon: '📋' },
        { key: 'credit_note', labelAr: 'إشعار دائن', labelEn: 'Credit note', icon: '📄' },
        { key: 'purchase_order', labelAr: 'أمر شراء', labelEn: 'Purchase order', icon: '📦' },
        { key: 'delivery_note', labelAr: 'إشعار تسليم', labelEn: 'Delivery note', icon: '🚚' }
    ];

    let _activeBusinessDocTemplateKey = 'invoice';

    function getDefaultOrganizationSettings() {
        return {
            nameAr: 'مجموعة سيد فياض العالمية ش.م.م',
            nameEn: 'SYED FAYYAZ GROUP INTERNATIONAL L.L.C',
            linesAr: 'ص.ب: 154 ، الرمز البريدي : 111 ، سلطنة عمان\nهاتف: +968 24499484 ، فاكس: +968 24497482\nضريبة القيمة المضافة: OM1100300282',
            linesEn: 'P.O.Box: 154, P.C: 111, Sultanate of Oman\nTel: +968 24499484, Fax: +968 24497482\nVATIN: OM1100300282',
            addressAr: '',
            addressEn: '',
            email: '',
            website: '',
            crNumber: '',
            logoDataUrl: '',
            logoFileName: 'BHD_Logo_04.png',
            updatedAt: ''
        };
    }

    function loadOrganizationSettings() {
        try {
            const raw = JSON.parse(localStorage.getItem(BHD_ORGANIZATION_SETTINGS_KEY) || 'null');
            if (!raw || typeof raw !== 'object') return getDefaultOrganizationSettings();
            return { ...getDefaultOrganizationSettings(), ...raw };
        } catch (_eOrg) {
            return getDefaultOrganizationSettings();
        }
    }

    function saveOrganizationSettings(settings) {
        const next = { ...getDefaultOrganizationSettings(), ...(settings || {}), updatedAt: new Date().toISOString() };
        localStorage.setItem(BHD_ORGANIZATION_SETTINGS_KEY, JSON.stringify(next));
        try {
            applyOrganizationBrandingToUi();
        } catch (_eBrand) {}
        return next;
    }

    function getOrganizationLogoSrc(settingsOpt) {
        const s = settingsOpt || loadOrganizationSettings();
        if (toStr(s.logoDataUrl).trim()) return toStr(s.logoDataUrl).trim();
        return getPrintLogoSrc();
    }

    function formatOrgMultilineHtml(text) {
        return escHtml(toStr(text)).replace(/\n/g, '<br>');
    }

    function buildOrganizationHeaderHtml(opts = {}) {
        const s = opts.settings || loadOrganizationSettings();
        const logoSrc = getOrganizationLogoSrc(s);
        const editable = opts.editable ? ' contenteditable="true"' : '';
        return `
            <div class="doc-header" dir="rtl">
                <div class="company-box company-box-ar"${editable}>
                    <div class="company-name-ar">${escHtml(s.nameAr || '')}</div>
                    <div class="company-lines-ar">${formatOrgMultilineHtml(s.linesAr)}</div>
                </div>
                <div class="logo-box">
                    <img src="${escAttr(logoSrc)}" alt="${t('شعار المنشأة', 'Organization logo')}" width="110" height="64" style="max-height:64px;max-width:110px;object-fit:contain;display:block;margin:0 auto">
                </div>
                <div class="company-box company-box-en"${editable} dir="ltr">
                    <div class="company-name-en">${escHtml(s.nameEn || '')}</div>
                    <div class="company-lines-en">${formatOrgMultilineHtml(s.linesEn)}</div>
                </div>
            </div>
        `;
    }

    function applyOrganizationBrandingToUi() {
        const s = loadOrganizationSettings();
        const title = toStr(s.nameAr) || toStr(s.nameEn);
        document.querySelectorAll('.dashboard-header h2, .dashboard-header-main h2').forEach((el) => {
            if (!title) return;
            const prefix = el.textContent.trim().startsWith('📋') ? '📋 ' : '';
            el.textContent = `${prefix}${title}`;
            el.setAttribute('data-ar', `${prefix}${s.nameAr || title}`);
            el.setAttribute('data-en', `${prefix}${s.nameEn || title}`);
        });
    }

    function loadBusinessDocTemplatesStore() {
        try {
            const raw = JSON.parse(localStorage.getItem(BHD_BUSINESS_DOC_TEMPLATES_KEY) || '{}');
            return raw && typeof raw === 'object' ? raw : {};
        } catch (_eTpl) {
            return {};
        }
    }

    function saveBusinessDocTemplatesStore(store) {
        localStorage.setItem(BHD_BUSINESS_DOC_TEMPLATES_KEY, JSON.stringify(store || {}));
    }

    function buildDefaultBusinessDocTemplateBody(templateKey) {
        const k = toStr(templateKey);
        const titleMap = {
            invoice: { ar: 'فاتورة', en: 'Invoice' },
            quotation: { ar: 'عرض سعر', en: 'Quotation' },
            credit_note: { ar: 'إشعار دائن', en: 'Credit note' },
            purchase_order: { ar: 'أمر شراء', en: 'Purchase order' },
            delivery_note: { ar: 'إشعار تسليم', en: 'Delivery note' }
        };
        const ttl = titleMap[k] || titleMap.invoice;
        return `
            <div class="doc-title"><h2>${t(ttl.ar, ttl.en)}</h2><h3>${t('رقم المستند', 'Document no.')}: …</h3></div>
            <table class="info-table">
                <tr><th>${t('التاريخ', 'Date')}</th><td contenteditable="true">…</td><th>${t('المرجع', 'Reference')}</th><td contenteditable="true">…</td></tr>
                <tr><th>${t('الجهة', 'Party')}</th><td colspan="3" contenteditable="true">…</td></tr>
            </table>
            <div class="section-header">${t('البنود', 'Line items')}</div>
            <table class="info-table">
                <thead><tr>
                    <th>#</th>
                    <th>${t('الوصف', 'Description')}</th>
                    <th>${t('الكمية', 'Qty')}</th>
                    <th>${t('السعر', 'Price')}</th>
                    <th>${t('الإجمالي', 'Total')}</th>
                </tr></thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td contenteditable="true">…</td>
                        <td contenteditable="true">1</td>
                        <td contenteditable="true">0.000</td>
                        <td contenteditable="true">0.000</td>
                    </tr>
                </tbody>
            </table>
            <table class="info-table" style="margin-top:10px">
                <tr><th>${t('ملاحظات', 'Notes')}</th><td contenteditable="true">…</td></tr>
            </table>
        `;
    }

    function getBusinessDocTemplateRecord(templateKey) {
        const store = loadBusinessDocTemplatesStore();
        const hit = store[templateKey];
        if (hit && toStr(hit.html).trim()) return hit;
        return {
            key: templateKey,
            html: buildDefaultBusinessDocTemplateBody(templateKey),
            isCustom: false,
            importedFrom: '',
            updatedAt: ''
        };
    }

    function getBusinessDocTemplateHtml(templateKey) {
        return getBusinessDocTemplateRecord(templateKey).html || buildDefaultBusinessDocTemplateBody(templateKey);
    }

    function setBusinessDocTemplateHtml(templateKey, html, meta = {}) {
        const store = loadBusinessDocTemplatesStore();
        store[templateKey] = {
            key: templateKey,
            html: toStr(html),
            isCustom: !!meta.isCustom,
            importedFrom: toStr(meta.importedFrom),
            updatedAt: new Date().toISOString()
        };
        saveBusinessDocTemplatesStore(store);
        return store[templateKey];
    }

    function resetBusinessDocTemplate(templateKey) {
        const store = loadBusinessDocTemplatesStore();
        delete store[templateKey];
        saveBusinessDocTemplatesStore(store);
    }

    const DOCUMENT_SYSTEM_TEMPLATES = {
        reservation_form: {
            category: 'contract_forms',
            ar: 'استمارة الحجز',
            en: 'Reservation form',
            buildHtml: (reservation) => buildReservationDocumentHtml(reservation)
        }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const isViewerMode = urlParams.get('viewer') === '1';
    const pageMode = (() => {
        const m = urlParams.get('mode');
        if (m === 'contracts') return 'contracts';
        if (m === 'reservations') return 'reservations';
        if (m === 'forms') return 'forms';
        if (m === 'users') return 'users';
        if (m === 'addressbook') return 'addressbook';
        if (m === 'notifications') return 'notifications';
        if (m === 'accounting') return 'accounting';
        if (m === 'maintenance') return 'maintenance';
        if (m === 'dashboard') return 'dashboard';
        if (m === 'organization') return 'organization';
        if (m === 'doc_templates') return 'doc_templates';
        try {
            const s = sessionStorage.getItem('bhd_ui_last_mode')
                || localStorage.getItem('bhd_ui_last_mode');
            if (s === 'contracts' || s === 'reservations' || s === 'forms' || s === 'users' || s === 'addressbook' || s === 'notifications' || s === 'accounting' || s === 'maintenance' || s === 'dashboard' || s === 'organization' || s === 'doc_templates') return s;
        } catch (e) {}
        return 'dashboard';
    })();
    let appUiLanguage = localStorage.getItem('bhd_ui_language') === 'en' ? 'en' : 'ar';
    const t = (ar, en) => (appUiLanguage === 'en' ? en : ar);
    const themePalettes = {
        maroon: { primary: '#7A001F', dark: '#4D0014', light: '#A61E4D' },
        turquoise: { primary: '#0F8B8D', dark: '#0A5F61', light: '#2CA8AA' }
    };
    const LAND_USE_OPTIONS = ['سكني', 'تجاري', 'سكني تجاري', 'سياحي', 'صناعي'];
    const OMAN_LOCATION_DATA = {
        'مسقط': {
            'مسقط': ['مطرح', 'ميناء السلطان قابوس', 'الوطية'],
            'مطرح': ['مطرح', 'روي', 'دَرْسَيْت'],
            'بوشر': ['بوشر', 'الخوير', 'غلا', 'الأنصب', 'العذيبة'],
            'السيب': ['السيب', 'الموالح', 'الحيل', 'الخوض', 'المعبيلة'],
            'العامرات': ['العامرات', 'النهضة', 'مدينة النهضة'],
            'قريات': ['قريات', 'ضباب', 'فنس']
        },
        'ظفار': {
            'صلالة': ['صلالة', 'عوقد', 'السعادة', 'الحافة'],
            'طاقة': ['طاقة', 'طاقة القديمة', 'خرفوت'],
            'مرباط': ['مرباط', 'حدبين', 'سدح'],
            'رخيوت': ['رخيوت', 'شعت', 'ديم'],
            'ثمريت': ['ثمريت', 'حمرير', 'منطقة الصناعات'],
            'ضلكوت': ['ضلكوت', 'حشمان', 'رخيوت الساحل'],
            'المزيونة': ['المزيونة', 'منفذ المزيونة', 'الشارقة'],
            'مقشن': ['مقشن', 'شصر', 'صرفيت']
        },
        'مسندم': {
            'خصب': ['خصب', 'قمزار', 'خور نجد'],
            'دبا': ['دبا', 'السي', 'الروضة'],
            'بخاء': ['بخاء', 'تيبات', 'الظهرة'],
            'مدحاء': ['مدحاء', 'حرب', 'نسب']
        },
        'البريمي': {
            'البريمي': ['البريمي', 'حماسة', 'صعراء'],
            'محضة': ['محضة', 'الخضراء', 'وادي الجزي'],
            'السنينة': ['السنينة', 'الخوير', 'الجافورة']
        },
        'الداخلية': {
            'نزوى': ['نزوى', 'فرق', 'سعال'],
            'بهلاء': ['بهلاء', 'العقر', 'الغافات'],
            'منح': ['منح', 'المعرى', 'حارة البلاد'],
            'الحمراء': ['الحمراء', 'غول', 'مسفاة العبريين'],
            'أدم': ['أدم', 'الهجيرة', 'عين كلبوه'],
            'إزكي': ['إزكي', 'النزار', 'اليمن'],
            'سمائل': ['سمائل', 'الخوبار', 'فيجا']
        },
        'شمال الباطنة': {
            'صحار': ['صحار', 'العوينات', 'حفيت'],
            'شناص': ['شناص', 'الفلج', 'الحمرا'],
            'لوى': ['لوى', 'السهيلة', 'المرير'],
            'صحم': ['صحم', 'الخور', 'صيع'],
            'الخابورة': ['الخابورة', 'الغيزين', 'العقر'],
            'السويق': ['السويق', 'الثرمد', 'البطحاء']
        },
        'جنوب الباطنة': {
            'الرستاق': ['الرستاق', 'الحزم', 'وادي بني عوف'],
            'العوابي': ['العوابي', 'وكان', 'الهجار'],
            'نخل': ['نخل', 'الثرمد', 'بركة الموز'],
            'وادي المعاول': ['وادي المعاول', 'مسل', 'الرجمة'],
            'بركاء': ['بركاء', 'السوادي', 'حي عاصم'],
            'المصنعة': ['المصنعة', 'الملدة', 'وادي بني خروص']
        },
        'شمال الشرقية': {
            'إبراء': ['إبراء', 'الثابتي', 'اليحمدي'],
            'المضيبي': ['المضيبي', 'سناو', 'سمد الشأن'],
            'بدية': ['بدية', 'منترب', 'الواسط'],
            'القابل': ['القابل', 'المضيرب', 'المنجرد'],
            'وادي بني خالد': ['وادي بني خالد', 'مقل', 'حلفين'],
            'دماء والطائيين': ['دماء والطائيين', 'لما', 'بديعة']
        },
        'جنوب الشرقية': {
            'صور': ['صور', 'العيجة', 'رأس الحد'],
            'الكامل والوافي': ['الكامل والوافي', 'الوافي', 'سيح العلا'],
            'جعلان بني بو علي': ['جعلان بني بو علي', 'الأشخرة', 'السويح'],
            'جعلان بني بو حسن': ['جعلان بني بو حسن', 'الرويس', 'الجعفرية'],
            'مصيرة': ['مصيرة', 'دفيات', 'رأس هلال']
        },
        'الظاهرة': {
            'عبري': ['عبري', 'الراقي', 'العينين'],
            'ينقل': ['ينقل', 'وقبة', 'القرى'],
            'ضنك': ['ضنك', 'فدى', 'قميرا']
        },
        'الوسطى': {
            'هيما': ['هيما', 'اللكبي', 'المركبات'],
            'الدقم': ['الدقم', 'رأس مركز', 'الجديلة'],
            'محوت': ['محوت', 'حج', 'الجازر'],
            'الجازر': ['الجازر', 'الدفية', 'نيابة الحلانيات']
        }
    };

    /** لا وحدات تجريبية مضمّنة — البيانات من الاستيراد أو الإدخال فقط / No built-in demo units */
    const unitsDataset = [];
    let importedUnitsData = [];
    /** إخفاء وحدات العرض التجريبية المضمّنة في الملف بعد التصفية / Hide built-in demo units after data wipe */
    function shouldUseBuiltinDemoUnits() {
        return false;
    }
    function getBuiltinUnitsSource() {
        return shouldUseBuiltinDemoUnits() ? unitsDataset : [];
    }
    let addressBookEntries = [];
    let fileRegistry = [];
    /** حجوزات وطلبات إخلاء وربط ملاك — تُحفظ محلياً */
    let unitReservations = [];
    window._vacantUnitPickState = { building: '', keys: [] };
    let reservationCancellationLog = [];
    /** فهرس صف المحجوز المفتوح في نافذة إلغاء الحجز */
    let pendingReservationCancelIndex = null;
    let evictionRequests = [];
    let ownerBuildingMap = {};
    let buildingProfiles = {};
    let buildingProfilesShadow = {};
    let ownerProfiles = {};
    let managedUnitsData = [];
    let buildingEditorState = { open: false, originalName: '' };
    let buildingRequiredRefreshTimer = null;
    let ownerEditorState = { open: false, originalName: '' };
    let insightNavStack = [];
    let insightFilterState = {};
    let insightFilterPanelOpen = {};
    let insightColFilterRowOpen = {};
    let insightImportExportOpen = {};
    let selectedTenantExcelFile = null;
    let selectedEwtExcelFile = null;
    let selectedUnitDetailsRecord = null;
    let contractEntryContext = { mode: 'contract', unit: null };

    /** علامات متعددة (جلسة + محلي + حقل مخفي + بادئة RES-) لتثبيت مسار مسودة الحجز مهما كان نوع المستأجر شخّصاً أم شركةً */
    const BHD_RESERVATION_FORM_FLOW_KEY = 'bhd_reservation_form_flow_v1';
    const BHD_RESERVATION_FLOW_MIRROR_KEY = 'bhd_reservation_flow_mirror_v1';

    function syncInternalWorkspaceIntentDom(onReservation) {
        try {
            const el = document.getElementById('bhdInternalWorkspaceIntent');
            if (el) el.value = onReservation ? 'reservation' : 'contract';
        } catch (_) {}
    }

    function setReservationFormFlowActive(on) {
        syncInternalWorkspaceIntentDom(!!on);
        try {
            if (on) sessionStorage.setItem(BHD_RESERVATION_FORM_FLOW_KEY, '1');
            else sessionStorage.removeItem(BHD_RESERVATION_FORM_FLOW_KEY);
        } catch (_rff) {}
        try {
            if (on) localStorage.setItem(BHD_RESERVATION_FLOW_MIRROR_KEY, '1');
            else localStorage.removeItem(BHD_RESERVATION_FLOW_MIRROR_KEY);
        } catch (_ls) {}
    }

    function readReservationFlowSignals() {
        let fromHidden = false;
        try {
            const hid = document.getElementById('bhdInternalWorkspaceIntent');
            fromHidden = hid && toStr(hid.value).toLowerCase() === 'reservation';
        } catch (_) {}
        let fromSession = false;
        try {
            fromSession = sessionStorage.getItem(BHD_RESERVATION_FORM_FLOW_KEY) === '1';
        } catch (_) {}
        let fromLsMirror = false;
        try {
            fromLsMirror = localStorage.getItem(BHD_RESERVATION_FLOW_MIRROR_KEY) === '1';
        } catch (_) {}
        const fromBody = !!(document.body && document.body.classList.contains('mode-reservations'));
        return { fromHidden, fromSession, fromLsMirror, fromBody };
    }

    /** مزامنة contractEntryContext؛ إذا كان النموذج يبدأ بـ RES- فهذا حجز حتى تنحل معضلة «شركة دون مسار حجز». */
    function ensureReservationContextMatchesReservationsWorkspace() {
        try {
            /** مسار عقد صريح — لا تُقلب السياق إلى حجز بسبب بادئة RES- أثناء إعداد النموذج قبل `setWorkspaceMode('contracts')` / Explicit contract path — never flip to reservation from RES- heuristics while hydrating the form before contracts mode is applied */
            if (contractEntryContext && contractEntryContext.mode === 'contract') {
                return;
            }

            const { fromHidden, fromSession, fromLsMirror, fromBody } = readReservationFlowSignals();
            let agStr = '';
            let bFilled = '';
            let uFilled = '';
            try {
                agStr = toStr(document.getElementById('agreementNo')?.value);
                bFilled = toStr(document.getElementById('buildingNo')?.value);
                uFilled = toStr(document.getElementById('flatNo')?.value);
            } catch (_) {}
            const heuristicRes = /^RES-/i.test(agStr) && bFilled && uFilled;

            if (!fromHidden && !fromSession && !fromLsMirror && !fromBody && !heuristicRes) return;
            if (contractEntryContext && contractEntryContext.mode === 'reservation') return;

            if (heuristicRes && !(fromHidden || fromSession || fromLsMirror)) {
                setReservationFormFlowActive(true);
            }

            contractEntryContext = {
                mode: 'reservation',
                unit: contractEntryContext && contractEntryContext.unit ? contractEntryContext.unit : null
            };
        } catch (eAlign) {}
    }

    /** هل هذا الضغط على الحفظ مسودة حجز؟ */
    function shouldPersistAsReservationDraft() {
        /** مسار عقد صريح — لا يُصنَّف كمسودة حجز حتى لو بقيت إشارات جلسة/RES- مؤقتاً / Explicit contract path — never classify as reservation draft while session/RES- signals are still clearing */
        try {
            if (contractEntryContext && contractEntryContext.mode === 'contract' && !isViewerMode) {
                return false;
            }
        } catch (_) {}
        ensureReservationContextMatchesReservationsWorkspace();
        if (contractEntryContext && contractEntryContext.mode === 'reservation') return true;

        const { fromHidden, fromSession, fromLsMirror, fromBody } = readReservationFlowSignals();
        if (fromHidden || fromSession || fromLsMirror || fromBody) return true;

        try {
            const ag = toStr(document.getElementById('agreementNo')?.value);
            const b = toStr(document.getElementById('buildingNo')?.value);
            const u = toStr(document.getElementById('flatNo')?.value);
            if (/^RES-/i.test(ag) && b && u) return true;
        } catch (_) {}

        return false;
    }

    function isReservationWorkspaceContext() {
        return shouldPersistAsReservationDraft();
    }

    /** فئة الصفحة `mode-reservations` أو مسار الحجز الاحتياطي — وحدة للحفظ وواجهة زر «حفظ الحجز» */
    function isReservationsWorkspaceScreenActive() {
        try {
            return !isViewerMode && !!document.body && document.body.classList.contains('mode-reservations');
        } catch (_scr) {
            return false;
        }
    }

    function isReservationDraftSaveContext() {
        return isReservationsWorkspaceScreenActive() || shouldPersistAsReservationDraft();
    }


    /** استكمال مسودة عقد بعد الحجز — قفل المالك/المستأجر/الوحدة حتى الحفظ النهائي */
    let tenancyDraftCompletionLocked = false;
    let contractAdditionalDataMode = false;
    let contractAdditionalDataGaps = null;
    /** بعد اعتماد العقد — إلزام البلدية والمستندات قبل التفعيل / Post-approval: municipal refs + full docs before active */
    let contractActivationDataMode = false;
    let contractActivationGaps = null;
    /** تعديل كامل لعقد محفوظ من تفاصيل الوحدة — يتجاوز وضع «البيانات الإضافية فقط» / Full saved-contract edit from unit details */
    let contractFullEditMode = false;
    /** بيانات المستأجر مستوردة من دفتر العناوين — قراءة فقط حتى إعادة الاستيراد / Tenant row filled from address book; read-only until re-import */
    let tenantIdentityLockedFromAddressBook = false;
    let contractTenantAddressBookSyncPending = false;
    let contractDataGapFixes = [];
    let addressBookEditorState = { mode: 'view', index: -1 };
    let addressBookModalHydrating = false;
    let addressBookSignatoriesDraft = [];
    /** مرفقات مختارة في النموذج قبل الحفظ (قرص أو مدمجة) / Attachments picked in form before save */
    let addressBookEditorPendingAttachments = {};
    let addressBookSortState = { key: 'contact', dir: 'asc' };
    const operationsSortState = { key: 'days', dir: 'asc' };

    /** مستخدمون وصلاحيات — محلياً (لا يُعتمد عليها وحده للأمان في بيئة الإنترنت) */
    let usersRegistry = [];
    /** حساب افتراضي يُنشأ عند عدم وجود أي مستخدم في السجل المحلي / Local bootstrap admin when registry is empty */
    const BHD_DEFAULT_ADMIN_EMAIL = 'ah@bhd.om';
    const BHD_DEFAULT_ADMIN_PASSWORD = 'ah@bhd.om';
    let authSession = null;
    let usersEditorState = { editingId: '', listSearch: '' };

    const BHD_USER_ROLES = [
        { key: 'system_admin', labelAr: 'مدير النظام', labelEn: 'System administrator' },
        { key: 'admin_manager', labelAr: 'المدير الإداري', labelEn: 'Administrative manager' },
        { key: 'financial_manager', labelAr: 'مدير المالية', labelEn: 'Financial manager' },
        { key: 'system_user', labelAr: 'مستخدم للنظام', labelEn: 'System user' },
        { key: 'accountant', labelAr: 'محاسب', labelEn: 'Accountant' },
        { key: 'accounting_clerk', labelAr: 'محاسب إدخال', labelEn: 'Accounting clerk' },
        { key: 'accounting_reviewer', labelAr: 'مراجع محاسبي', labelEn: 'Accounting reviewer' },
        { key: 'operations_manager', labelAr: 'مدير العمليات', labelEn: 'Operations manager' },
        { key: 'tenant_portal', labelAr: 'بوابة مستأجر', labelEn: 'Tenant portal' },
        { key: 'owner_portal', labelAr: 'بوابة مالك', labelEn: 'Owner portal' },
        { key: 'employee_portal', labelAr: 'بوابة موظف', labelEn: 'Employee portal' },
        { key: 'client_portal', labelAr: 'بوابة عميل', labelEn: 'Client portal' },
        { key: 'vendor_portal', labelAr: 'بوابة مورد', labelEn: 'Vendor portal' }
    ];

    const BHD_PERMISSION_GROUPS = [
        { key: 'core', labelAr: 'الأساسية', labelEn: 'Core' },
        { key: 'contacts', labelAr: 'جهات الاتصال', labelEn: 'Contacts' },
        { key: 'portal', labelAr: 'بوابة المستخدم', labelEn: 'User portal' },
        { key: 'ops', labelAr: 'العمليات', labelEn: 'Operations' },
        { key: 'admin', labelAr: 'الإدارة', labelEn: 'Administration' }
    ];

    const BHD_PERMISSION_DEFS = [
        { key: 'manage_dashboard', labelAr: 'لوحة المعلومات', labelEn: 'Dashboard', group: 'core' },
        { key: 'manage_properties', labelAr: 'العقارات والمباني', labelEn: 'Properties & buildings', group: 'core' },
        { key: 'manage_owners', labelAr: 'الملاك', labelEn: 'Owners', group: 'core' },
        { key: 'manage_contracts', labelAr: 'العقود والمستندات', labelEn: 'Contracts & documents', group: 'core' },
        { key: 'edit_saved_contracts', labelAr: 'تعديل العقود والعقارات المحفوظة', labelEn: 'Edit saved contracts & property data', group: 'core' },
        { key: 'view_address_book', labelAr: 'عرض دفتر العناوين', labelEn: 'View address book', group: 'contacts' },
        { key: 'view_own_property', labelAr: 'عرض عقاري (مستأجر/مالك)', labelEn: 'View my property', group: 'portal' },
        { key: 'view_own_contract', labelAr: 'عرض عقدي', labelEn: 'View my contract', group: 'portal' },
        { key: 'request_maintenance', labelAr: 'طلب صيانة', labelEn: 'Request maintenance', group: 'portal' },
        { key: 'import_export', labelAr: 'استيراد/تصدير البيانات', labelEn: 'Import / export data', group: 'admin' },
        { key: 'approve_edit_requests', labelAr: 'الموافقة على طلبات التعديل', labelEn: 'Approve edit requests', group: 'admin' },
        { key: 'manage_users', labelAr: 'إدارة المستخدمين', labelEn: 'User management', group: 'admin' },
        { key: 'manage_accounting', labelAr: 'المحاسبة', labelEn: 'Accounting', group: 'ops' },
        { key: 'approve_accounting', labelAr: 'اعتماد معاملات المحاسبة', labelEn: 'Approve accounting transactions', group: 'ops' },
        { key: 'manage_coa', labelAr: 'شجرة الحسابات (إضافة وتعديل)', labelEn: 'Chart of accounts (add/edit)', group: 'ops' },
        { key: 'manage_maintenance', labelAr: 'إدارة الصيانة (كامل)', labelEn: 'Full maintenance management', group: 'ops' },
        { key: 'manage_tasks', labelAr: 'إدارة المهام', labelEn: 'Task management', group: 'ops' },
        { key: 'waive_cheque_penalty', labelAr: 'إعفاء/تخفيض غرامات الشيكات', labelEn: 'Waive / reduce cheque penalties', group: 'ops' }
    ];

    const BHD_MODULE_GROUPS = [
        { key: 'core', labelAr: 'الأساسية', labelEn: 'Core' },
        { key: 'contracts', labelAr: 'العقود والحجوزات', labelEn: 'Contracts & reservations' },
        { key: 'accounting', labelAr: 'المحاسبة', labelEn: 'Accounting' },
        { key: 'operations', labelAr: 'العمليات', labelEn: 'Operations' },
        { key: 'contacts', labelAr: 'جهات الاتصال', labelEn: 'Contacts' },
        { key: 'admin', labelAr: 'الإدارة', labelEn: 'Administration' },
        { key: 'portal', labelAr: 'بوابة المستخدم', labelEn: 'User portal' }
    ];

    const BHD_ACCESS_LEVELS = [
        { key: 'none', labelAr: 'بدون', labelEn: 'None', order: 0 },
        { key: 'read', labelAr: 'قراءة', labelEn: 'Read', order: 1 },
        { key: 'write', labelAr: 'قراءة وكتابة', labelEn: 'Read & write', order: 2 },
        { key: 'approve', labelAr: 'قراءة وكتابة واعتماد', labelEn: 'Read, write & approve', order: 3 }
    ];

    const BHD_ACCOUNTING_TAB_MODULE_MAP = {
        cheques: 'accounting_cheques',
        income: 'accounting_income',
        expense: 'accounting_expense',
        journals: 'accounting_journals',
        reports: 'accounting_reports',
        coa: 'accounting_coa',
        deposits: 'accounting_deposits',
        pending: 'accounting_pending',
        invoices: 'accounting_invoices',
        bankAccounts: 'accounting_bank',
        payroll: 'accounting_payroll',
        inventory: 'accounting_inventory',
        maintenance: 'accounting_maintenance_tab',
        calendar: 'accounting_calendar'
    };

    const BHD_MODULE_DEFS = [
        { key: 'module_dashboard', group: 'core', labelAr: 'لوحة المعلومات', labelEn: 'Dashboard' },
        { key: 'module_properties', group: 'core', labelAr: 'العقارات والمباني', labelEn: 'Properties & buildings' },
        { key: 'module_owners', group: 'core', labelAr: 'الملاك', labelEn: 'Owners' },
        { key: 'module_contracts', group: 'contracts', labelAr: 'العقود والمستندات', labelEn: 'Contracts & documents' },
        { key: 'module_reservations', group: 'contracts', labelAr: 'الحجوزات والإخلاء', labelEn: 'Reservations & eviction' },
        { key: 'accounting_cheques', group: 'accounting', labelAr: 'الشيكات', labelEn: 'Cheques', acctTab: 'cheques' },
        { key: 'accounting_income', group: 'accounting', labelAr: 'الإيرادات', labelEn: 'Income', acctTab: 'income' },
        { key: 'accounting_expense', group: 'accounting', labelAr: 'المصروفات', labelEn: 'Expenses', acctTab: 'expense' },
        { key: 'accounting_journals', group: 'accounting', labelAr: 'القيود اليومية', labelEn: 'Journal entries', acctTab: 'journals' },
        { key: 'accounting_reports', group: 'accounting', labelAr: 'التقارير', labelEn: 'Reports', acctTab: 'reports' },
        { key: 'accounting_coa', group: 'accounting', labelAr: 'شجرة الحسابات', labelEn: 'Chart of accounts', acctTab: 'coa' },
        { key: 'accounting_deposits', group: 'accounting', labelAr: 'الضمان', labelEn: 'Deposits', acctTab: 'deposits' },
        { key: 'accounting_pending', group: 'accounting', labelAr: 'بانتظار الاعتماد', labelEn: 'Pending approval', acctTab: 'pending' },
        { key: 'accounting_invoices', group: 'accounting', labelAr: 'الفواتير', labelEn: 'Invoices', acctTab: 'invoices' },
        { key: 'accounting_bank', group: 'accounting', labelAr: 'الحسابات البنكية', labelEn: 'Bank accounts', acctTab: 'bankAccounts' },
        { key: 'accounting_payroll', group: 'accounting', labelAr: 'الرواتب', labelEn: 'Payroll', acctTab: 'payroll' },
        { key: 'accounting_inventory', group: 'accounting', labelAr: 'المخزون', labelEn: 'Inventory', acctTab: 'inventory' },
        { key: 'accounting_maintenance_tab', group: 'accounting', labelAr: 'صيانة (تبويب المحاسبة)', labelEn: 'Maintenance (accounting tab)', acctTab: 'maintenance' },
        { key: 'accounting_calendar', group: 'accounting', labelAr: 'التقويم', labelEn: 'Calendar', acctTab: 'calendar' },
        { key: 'module_maintenance', group: 'operations', labelAr: 'الصيانة', labelEn: 'Maintenance' },
        { key: 'module_tasks', group: 'operations', labelAr: 'المهام', labelEn: 'Tasks' },
        { key: 'module_notifications', group: 'operations', labelAr: 'التنبيهات', labelEn: 'Notifications' },
        { key: 'module_address_book', group: 'contacts', labelAr: 'دفتر العناوين', labelEn: 'Address book' },
        { key: 'module_users', group: 'admin', labelAr: 'إدارة المستخدمين', labelEn: 'User management' },
        { key: 'module_import_export', group: 'admin', labelAr: 'استيراد/تصدير', labelEn: 'Import / export' },
        { key: 'module_edit_requests', group: 'admin', labelAr: 'اعتماد طلبات التعديل', labelEn: 'Approve edit requests' },
        { key: 'portal_own_property', group: 'portal', labelAr: 'عرض عقاري (مستأجر/مالك)', labelEn: 'View my property' },
        { key: 'portal_own_contract', group: 'portal', labelAr: 'عرض عقدي', labelEn: 'View my contract' },
        { key: 'portal_request_maintenance', group: 'portal', labelAr: 'طلب صيانة', labelEn: 'Request maintenance' }
    ];

    const BHD_APPROVAL_WORKFLOW_KEY = 'bhd_approval_workflows';

    const BHD_APPROVAL_WORKFLOW_PRESETS = [
        {
            key: 'accountant_only',
            labelAr: 'محاسب فقط',
            labelEn: 'Accountant only',
            stages: ['accountant']
        },
        {
            key: 'accountant_financial_manager',
            labelAr: 'محاسب ← مدير المالية',
            labelEn: 'Accountant → Financial manager',
            stages: ['accountant', 'financial_manager']
        },
        {
            key: 'accountant_fm_admin',
            labelAr: 'محاسب ← مدير المالية ← المدير الإداري',
            labelEn: 'Accountant → FM → Admin manager',
            stages: ['accountant', 'financial_manager', 'admin_manager']
        }
    ];

    function moduleAccessOrder(level) {
        const k = toStr(level).toLowerCase() || 'none';
        const def = BHD_ACCESS_LEVELS.find((x) => x.key === k);
        return def ? def.order : 0;
    }

    function defaultModuleAccessNone() {
        return BHD_MODULE_DEFS.reduce((acc, m) => {
            acc[m.key] = 'none';
            return acc;
        }, {});
    }

    function defaultModuleAccessAllApprove() {
        return BHD_MODULE_DEFS.reduce((acc, m) => {
            acc[m.key] = 'approve';
            return acc;
        }, {});
    }

    function normalizeModuleAccessLevel(raw) {
        const k = toStr(raw).toLowerCase();
        if (k === 'read' || k === 'write' || k === 'approve') return k;
        return 'none';
    }

    function deriveModuleAccessFromLegacyPermissions(perms) {
        const ma = defaultModuleAccessNone();
        if (!perms || typeof perms !== 'object') return ma;
        const setAtLeast = (key, level) => {
            if (!key) return;
            const cur = normalizeModuleAccessLevel(ma[key]);
            if (moduleAccessOrder(level) > moduleAccessOrder(cur)) ma[key] = level;
        };
        if (perms.manage_dashboard) setAtLeast('module_dashboard', 'write');
        if (perms.manage_properties) setAtLeast('module_properties', 'write');
        if (perms.manage_owners) setAtLeast('module_owners', 'write');
        if (perms.manage_contracts) setAtLeast('module_contracts', perms.edit_saved_contracts ? 'write' : 'read');
        if (perms.edit_saved_contracts) setAtLeast('module_contracts', 'write');
        if (perms.manage_contracts) setAtLeast('module_reservations', 'write');
        if (perms.view_address_book) setAtLeast('module_address_book', 'read');
        if (perms.view_own_property) setAtLeast('portal_own_property', 'read');
        if (perms.view_own_contract) setAtLeast('portal_own_contract', 'read');
        if (perms.request_maintenance) setAtLeast('portal_request_maintenance', 'write');
        if (perms.import_export) setAtLeast('module_import_export', 'write');
        if (perms.approve_edit_requests) setAtLeast('module_edit_requests', 'approve');
        if (perms.manage_users) setAtLeast('module_users', 'approve');
        if (perms.manage_maintenance) setAtLeast('module_maintenance', 'write');
        if (perms.manage_tasks) setAtLeast('module_tasks', 'write');
        if (perms.manage_accounting || perms.approve_accounting || perms.manage_coa) {
            const acctBase = perms.approve_accounting ? 'approve' : 'write';
            BHD_MODULE_DEFS.filter((m) => m.group === 'accounting').forEach((m) => setAtLeast(m.key, acctBase));
            if (perms.manage_coa) setAtLeast('accounting_coa', perms.approve_accounting ? 'approve' : 'write');
            if (perms.approve_accounting) setAtLeast('accounting_pending', 'approve');
            if (!perms.manage_coa && perms.manage_accounting) setAtLeast('accounting_coa', 'read');
        }
        if (perms.waive_cheque_penalty) setAtLeast('accounting_cheques', 'approve');
        if (
            perms.manage_dashboard ||
            perms.manage_contracts ||
            perms.manage_maintenance ||
            perms.manage_accounting ||
            perms.approve_edit_requests
        ) {
            setAtLeast('module_notifications', 'read');
        }
        return ma;
    }

    function syncLegacyPermissionsFromModuleAccess(moduleAccess) {
        const ma = moduleAccess && typeof moduleAccess === 'object' ? moduleAccess : defaultModuleAccessNone();
        const lvl = (key) => normalizeModuleAccessLevel(ma[key]);
        const atLeast = (key, min) => moduleAccessOrder(lvl(key)) >= moduleAccessOrder(min);
        const anyAccounting = BHD_MODULE_DEFS.some((m) => m.group === 'accounting' && atLeast(m.key, 'read'));
        const anyAccountingApprove = BHD_MODULE_DEFS.some((m) => m.group === 'accounting' && atLeast(m.key, 'approve'));
        return {
            manage_dashboard: atLeast('module_dashboard', 'read'),
            manage_properties: atLeast('module_properties', 'read'),
            manage_owners: atLeast('module_owners', 'read'),
            manage_contracts: atLeast('module_contracts', 'read'),
            edit_saved_contracts: atLeast('module_contracts', 'write'),
            view_address_book: atLeast('module_address_book', 'read'),
            view_own_property: atLeast('portal_own_property', 'read'),
            view_own_contract: atLeast('portal_own_contract', 'read'),
            request_maintenance: atLeast('portal_request_maintenance', 'read'),
            import_export: atLeast('module_import_export', 'read'),
            approve_edit_requests: atLeast('module_edit_requests', 'approve'),
            manage_users: atLeast('module_users', 'read'),
            manage_accounting: anyAccounting,
            approve_accounting: anyAccountingApprove || atLeast('accounting_pending', 'approve'),
            manage_coa: atLeast('accounting_coa', 'write'),
            manage_maintenance: atLeast('module_maintenance', 'read'),
            manage_tasks: atLeast('module_tasks', 'read'),
            waive_cheque_penalty: atLeast('accounting_cheques', 'approve')
        };
    }

    function getUserModuleAccess(user) {
        const u = user && typeof user === 'object' ? user : {};
        const base =
            u.moduleAccess && typeof u.moduleAccess === 'object' && Object.keys(u.moduleAccess).length
                ? { ...defaultModuleAccessNone(), ...u.moduleAccess }
                : deriveModuleAccessFromLegacyPermissions(u.permissions || {});
        BHD_MODULE_DEFS.forEach((m) => {
            base[m.key] = normalizeModuleAccessLevel(base[m.key]);
        });
        return base;
    }

    function getUserModuleAccessLevel(user, moduleKey) {
        if (!user) return 'none';
        if (userIsSystemAdmin(user)) return 'approve';
        return normalizeModuleAccessLevel(getUserModuleAccess(user)[moduleKey]);
    }

    function userModuleAccessAtLeast(user, moduleKey, minLevel) {
        if (!usersRegistryHasRows()) return true;
        if (!user) return false;
        if (userIsSystemAdmin(user)) return true;
        return moduleAccessOrder(getUserModuleAccessLevel(user, moduleKey)) >= moduleAccessOrder(minLevel);
    }

    function canReadModule(user, moduleKey) {
        return userModuleAccessAtLeast(user, moduleKey, 'read');
    }

    function canWriteModule(user, moduleKey) {
        return userModuleAccessAtLeast(user, moduleKey, 'write');
    }

    function canApproveModule(user, moduleKey) {
        return userModuleAccessAtLeast(user, moduleKey, 'approve');
    }

    function canReadAccountingTab(tabKey) {
        const mk = BHD_ACCOUNTING_TAB_MODULE_MAP[tabKey];
        if (!mk) return effectivePermission('manage_accounting');
        return effectiveModuleAccess('read', mk);
    }

    function canWriteAccountingTab(tabKey) {
        const mk = BHD_ACCOUNTING_TAB_MODULE_MAP[tabKey];
        if (!mk) return effectivePermission('manage_accounting');
        return effectiveModuleAccess('write', mk);
    }

    function canAccessAccountingWorkspace() {
        if (!usersRegistryHasRows()) return true;
        const u = getLoggedInUser();
        if (!u) return false;
        if (userIsSystemAdmin(u)) return true;
        if (effectivePermission('manage_accounting')) return true;
        return BHD_MODULE_DEFS.some((m) => m.group === 'accounting' && canReadModule(u, m.key));
    }

    function effectiveModuleAccess(minLevel, moduleKey) {
        if (!usersRegistryHasRows()) return true;
        const u = getLoggedInUser();
        if (!u) return false;
        return userModuleAccessAtLeast(u, moduleKey, minLevel);
    }

    function assertModuleAccessOrAlert(moduleKey, minLevel, msgAr, msgEn) {
        if (effectiveModuleAccess(minLevel, moduleKey)) return true;
        const mod = BHD_MODULE_DEFS.find((m) => m.key === moduleKey);
        const modLbl = mod ? t(mod.labelAr, mod.labelEn) : moduleKey;
        alert(
            `${msgAr || t(`لا تملك صلاحية كافية في: ${modLbl}`, `Insufficient access for: ${modLbl}`)}\n${
                msgEn || 'Insufficient module access.'
            }`
        );
        return false;
    }

    function loadApprovalWorkflows() {
        try {
            const raw = JSON.parse(localStorage.getItem(BHD_APPROVAL_WORKFLOW_KEY) || '{}');
            return raw && typeof raw === 'object' ? raw : {};
        } catch (_eWf) {
            return {};
        }
    }

    function saveApprovalWorkflows(workflows) {
        localStorage.setItem(BHD_APPROVAL_WORKFLOW_KEY, JSON.stringify(workflows || {}));
        try {
            persistAuthOnly();
        } catch (_ePersistWf) {}
    }

    function getDefaultApprovalWorkflows() {
        return {
            accounting_entry: 'accountant_only',
            accounting_edit: 'accountant_financial_manager',
            accounting_delete: 'accountant_fm_admin'
        };
    }

    function getApprovalWorkflowPreset(presetKey) {
        return BHD_APPROVAL_WORKFLOW_PRESETS.find((p) => p.key === presetKey) || BHD_APPROVAL_WORKFLOW_PRESETS[0];
    }

    function getAccountingApprovalStageRoles(actionType) {
        const wf = { ...getDefaultApprovalWorkflows(), ...loadApprovalWorkflows() };
        const action = toStr(actionType).toLowerCase() || 'create';
        let presetKey = wf.accounting_entry;
        if (action === 'edit') presetKey = wf.accounting_edit || wf.accounting_entry;
        if (action === 'delete') presetKey = wf.accounting_delete || wf.accounting_edit || wf.accounting_entry;
        const preset = getApprovalWorkflowPreset(presetKey);
        return Array.isArray(preset.stages) ? preset.stages.slice() : ['accountant'];
    }

    function getApprovalStageRoleLabel(roleKey) {
        const r = BHD_USER_ROLES.find((x) => x.key === roleKey);
        return r ? t(r.labelAr, r.labelEn) : roleKey;
    }

    function initAccountingApprovalChain(actionType) {
        const stages = getAccountingApprovalStageRoles(actionType);
        return {
            actionType: toStr(actionType).toLowerCase() || 'create',
            currentIndex: 0,
            stages: stages.map((roleKey, idx) => ({
                roleKey,
                roleLabelAr: (BHD_USER_ROLES.find((r) => r.key === roleKey) || {}).labelAr || roleKey,
                roleLabelEn: (BHD_USER_ROLES.find((r) => r.key === roleKey) || {}).labelEn || roleKey,
                status: idx === 0 ? 'pending' : 'waiting',
                byId: '',
                byName: '',
                at: '',
                note: ''
            }))
        };
    }

    function normalizeAccountingApprovalChain(chain) {
        if (!chain || typeof chain !== 'object' || !Array.isArray(chain.stages) || !chain.stages.length) {
            return initAccountingApprovalChain(chain?.actionType || 'create');
        }
        const out = { ...chain };
        if (typeof out.currentIndex !== 'number' || out.currentIndex < 0) out.currentIndex = 0;
        if (out.currentIndex >= out.stages.length) out.currentIndex = out.stages.length - 1;
        out.stages = out.stages.map((s, idx) => ({
            roleKey: toStr(s.roleKey) || 'accountant',
            roleLabelAr: toStr(s.roleLabelAr) || getApprovalStageRoleLabel(s.roleKey),
            roleLabelEn: toStr(s.roleLabelEn) || s.roleKey,
            status: toStr(s.status) || (idx === out.currentIndex ? 'pending' : idx < out.currentIndex ? 'approved' : 'waiting'),
            byId: toStr(s.byId),
            byName: toStr(s.byName),
            at: toStr(s.at),
            note: toStr(s.note)
        }));
        return out;
    }

    function getAccountingEntryApprovalChain(entry) {
        if (!entry) return null;
        if (entry.approvalChain) return normalizeAccountingApprovalChain(entry.approvalChain);
        if (entry.pendingRequest?.approvalChain) return normalizeAccountingApprovalChain(entry.pendingRequest.approvalChain);
        const action = entry.pendingRequest?.action || (toStr(entry.status) === 'pending_accountant' ? 'create' : 'create');
        return initAccountingApprovalChain(action);
    }

    function getCurrentAccountingApprovalStage(entry) {
        const chain = getAccountingEntryApprovalChain(entry);
        if (!chain || !chain.stages.length) return null;
        const idx = chain.currentIndex;
        return chain.stages[idx] || chain.stages[chain.stages.length - 1];
    }

    function isAccountingApprovalChainComplete(entry) {
        const chain = getAccountingEntryApprovalChain(entry);
        if (!chain) return true;
        return chain.stages.every((s) => s.status === 'approved');
    }

    function userCanApproveCurrentAccountingStage(user, entry) {
        if (!user || !entry) return false;
        if (userIsSystemAdmin(user)) return canApproveModule(user, 'accounting_pending') || effectivePermission('approve_accounting');
        const stage = getCurrentAccountingApprovalStage(entry);
        if (!stage || stage.status !== 'pending') return false;
        if (!canApproveModule(user, 'accounting_pending') && !effectivePermission('approve_accounting')) return false;
        const userRole = toStr(user.role);
        if (userRole === stage.roleKey) return true;
        if (userRole === 'system_admin' || userRole === 'admin_manager') return true;
        return false;
    }

    function accountingApprovalChainStatusLabel(entry) {
        const chain = getAccountingEntryApprovalChain(entry);
        if (!chain || !chain.stages.length) return { ar: '—', en: '—' };
        const stage = getCurrentAccountingApprovalStage(entry);
        if (!stage) return { ar: '—', en: '—' };
        if (stage.status === 'pending') {
            return {
                ar: `بانتظار اعتماد: ${stage.roleLabelAr || getApprovalStageRoleLabel(stage.roleKey)}`,
                en: `Awaiting: ${stage.roleLabelEn || stage.roleKey}`
            };
        }
        if (isAccountingApprovalChainComplete(entry)) {
            return { ar: 'اكتمل الاعتماد', en: 'Approval complete' };
        }
        return { ar: 'قيد سير الاعتماد', en: 'In approval workflow' };
    }

    function attachAccountingApprovalChainToEntry(entry, actionType) {
        if (!entry) return entry;
        const chain = initAccountingApprovalChain(actionType);
        entry.approvalChain = chain;
        if (entry.pendingRequest) entry.pendingRequest.approvalChain = chain;
        return entry;
    }

    function ensureAccountingEntryApprovalChain(entry) {
        if (!entry) return entry;
        const action = entry.pendingRequest?.action || 'create';
        if (!entry.approvalChain) attachAccountingApprovalChainToEntry(entry, action);
        else entry.approvalChain = normalizeAccountingApprovalChain(entry.approvalChain);
        if (entry.pendingRequest) entry.pendingRequest.approvalChain = entry.approvalChain;
        return entry;
    }

    function processAccountingApprovalStageAdvance(ent, actor, note, pendingAction) {
        ensureAccountingEntryApprovalChain(ent);
        const chain = ent.approvalChain;
        const stage = chain.stages[chain.currentIndex];
        if (!stage) return { finalize: true };
        stage.status = 'approved';
        stage.byId = actor.staffUserId;
        stage.byName = actor.staffName;
        stage.at = new Date().toISOString();
        stage.note = note;
        if (chain.currentIndex < chain.stages.length - 1) {
            chain.currentIndex += 1;
            chain.stages[chain.currentIndex].status = 'pending';
            if (ent.pendingRequest) ent.pendingRequest.approvalChain = chain;
            ent.updatedAt = new Date().toISOString();
            return { finalize: false, nextStage: chain.stages[chain.currentIndex] };
        }
        return { finalize: true, stageRole: stage.roleKey };
    }

    function presetModuleAccessForRole(roleKey) {
        const ma = defaultModuleAccessNone();
        const set = (key, level) => {
            ma[key] = normalizeModuleAccessLevel(level);
        };
        const setAcctAll = (level) => {
            BHD_MODULE_DEFS.filter((m) => m.group === 'accounting').forEach((m) => set(m.key, level));
        };
        if (roleKey === 'system_admin') return defaultModuleAccessAllApprove();
        if (roleKey === 'admin_manager') {
            set('module_dashboard', 'approve');
            set('module_contracts', 'approve');
            set('module_reservations', 'approve');
            set('module_notifications', 'approve');
            set('module_edit_requests', 'approve');
            set('module_address_book', 'read');
            setAcctAll('approve');
            return ma;
        }
        if (roleKey === 'financial_manager') {
            set('module_dashboard', 'read');
            set('module_contracts', 'read');
            set('module_notifications', 'approve');
            setAcctAll('approve');
            return ma;
        }
        if (roleKey === 'accountant') {
            set('module_dashboard', 'read');
            set('module_contracts', 'read');
            set('module_import_export', 'write');
            setAcctAll('write');
            set('accounting_reports', 'read');
            set('accounting_pending', 'read');
            return ma;
        }
        if (roleKey === 'accounting_clerk') {
            set('module_dashboard', 'read');
            set('accounting_cheques', 'write');
            set('accounting_income', 'write');
            set('accounting_expense', 'write');
            set('accounting_journals', 'read');
            set('accounting_invoices', 'write');
            set('accounting_deposits', 'write');
            set('accounting_reports', 'read');
            set('accounting_pending', 'read');
            return ma;
        }
        if (roleKey === 'accounting_reviewer') {
            set('module_dashboard', 'read');
            setAcctAll('read');
            return ma;
        }
        if (roleKey === 'operations_manager') {
            set('module_dashboard', 'write');
            set('module_maintenance', 'approve');
            set('module_tasks', 'approve');
            set('module_notifications', 'approve');
            set('module_contracts', 'read');
            set('module_reservations', 'read');
            return ma;
        }
        if (roleKey === 'tenant_portal') {
            set('module_dashboard', 'read');
            set('portal_own_property', 'read');
            set('portal_own_contract', 'read');
            set('portal_request_maintenance', 'write');
            return ma;
        }
        if (roleKey === 'owner_portal') {
            set('module_dashboard', 'read');
            set('portal_own_property', 'read');
            set('portal_own_contract', 'read');
            set('module_maintenance', 'read');
            return ma;
        }
        if (roleKey === 'employee_portal') {
            set('module_dashboard', 'read');
            set('module_maintenance', 'write');
            set('module_tasks', 'write');
            set('module_address_book', 'read');
            return ma;
        }
        if (roleKey === 'client_portal') {
            set('module_dashboard', 'read');
            set('portal_own_contract', 'read');
            return ma;
        }
        if (roleKey === 'vendor_portal') {
            set('module_maintenance', 'write');
            set('module_tasks', 'write');
            return ma;
        }
        set('module_dashboard', 'read');
        set('module_contracts', 'write');
        set('module_reservations', 'write');
        set('module_maintenance', 'write');
        set('module_tasks', 'write');
        set('module_notifications', 'read');
        return ma;
    }

    const BHD_ADDRESS_BOOK_BUILTIN_TYPES = [
        { key: 'tenant', labelAr: 'مستأجر', labelEn: 'Tenant', prefix: 'tn', pwdTag: 'Tenant' },
        { key: 'owner', labelAr: 'مالك', labelEn: 'Owner', prefix: 'ow', pwdTag: 'Owner' },
        { key: 'employee', labelAr: 'موظف', labelEn: 'Employee', prefix: 'em', pwdTag: 'Employee' },
        { key: 'client', labelAr: 'عميل', labelEn: 'Client', prefix: 'cl', pwdTag: 'Client' },
        { key: 'vendor', labelAr: 'مورد', labelEn: 'Vendor', prefix: 'vd', pwdTag: 'Vendor' },
        { key: 'other', labelAr: 'أخرى', labelEn: 'Other', prefix: 'ot', pwdTag: 'Other' }
    ];

    function loadAddressBookCustomTypes() {
        try {
            const raw = JSON.parse(localStorage.getItem('bhd_ab_custom_types') || '[]');
            return Array.isArray(raw) ? raw.filter((x) => x && x.key) : [];
        } catch (_e) {
            return [];
        }
    }

    function saveAddressBookCustomTypes(list) {
        localStorage.setItem('bhd_ab_custom_types', JSON.stringify(list || []));
    }

    function getAllAddressBookTypes() {
        const custom = loadAddressBookCustomTypes();
        const keys = new Set(BHD_ADDRESS_BOOK_BUILTIN_TYPES.map((x) => x.key));
        return [
            ...BHD_ADDRESS_BOOK_BUILTIN_TYPES,
            ...custom.filter((x) => x.key && !keys.has(x.key))
        ];
    }

    function getAddressBookTypeMeta(typeKey) {
        const k = toStr(typeKey).toLowerCase();
        if (k === 'company') {
            return { key: 'company', labelAr: 'شركة', labelEn: 'Company', prefix: 'co', pwdTag: 'Company' };
        }
        return getAllAddressBookTypes().find((x) => x.key === k) || null;
    }

    function addressBookTypeLabel(typeKey) {
        const meta = getAddressBookTypeMeta(typeKey);
        if (!meta) return toStr(typeKey) || '—';
        return t(meta.labelAr, meta.labelEn);
    }

    function populateAddressBookTypeSelect(selectedKey) {
        const sel = document.getElementById('abType');
        if (!sel) return;
        const want = toStr(selectedKey) || 'tenant';
        const types = getAllAddressBookTypes();
        sel.innerHTML =
            types
                .map((x) => {
                    const lbl = `${x.labelAr} / ${x.labelEn}`;
                    return `<option value="${escAttr(x.key)}" ${x.key === want ? 'selected' : ''}>${escHtml(lbl)}</option>`;
                })
                .join('') +
            `<option value="__custom__">${t('+ إضافة تصنيف...', '+ Add category...')}</option>`;
        if (types.some((x) => x.key === want)) sel.value = want;
        else if (want && want !== '__custom__') sel.value = want;
    }

    function onAddressBookTypeSelectChange() {
        const sel = document.getElementById('abType');
        if (!sel || sel.value !== '__custom__') return;
        promptAddCustomAddressBookType();
    }

    function promptAddCustomAddressBookType() {
        const ar = prompt(t('اسم التصنيف بالعربية:', 'Category name in Arabic:'));
        if (!ar || !toStr(ar).trim()) {
            populateAddressBookTypeSelect('tenant');
            return;
        }
        const en = prompt(t('اسم التصنيف بالإنجليزية:', 'Category name in English:'), toStr(ar).trim());
        const key =
            'custom_' +
            toStr(ar)
                .trim()
                .toLowerCase()
                .replace(/[^\w\u0600-\u06FF]+/g, '_')
                .replace(/^_+|_+$/g, '')
                .slice(0, 24) +
            '_' +
            Date.now().toString(36).slice(-4);
        const prefix = prompt(t('بادئة اسم المستخدم (حرفان-3):', 'Username prefix (2-3 chars):'), 'ct') || 'ct';
        const custom = loadAddressBookCustomTypes();
        custom.push({
            key,
            labelAr: toStr(ar).trim(),
            labelEn: toStr(en).trim() || toStr(ar).trim(),
            prefix: toStr(prefix).slice(0, 4).toLowerCase() || 'ct',
            pwdTag: toStr(en).trim() || toStr(ar).trim()
        });
        saveAddressBookCustomTypes(custom);
        populateAddressBookTypeSelect(key);
    }

    function normalizeAddressBookEntryType(raw) {
        const t0 = toStr(raw).toLowerCase();
        if (t0 === 'company') return 'company';
        const known = getAllAddressBookTypes().some((x) => x.key === t0);
        if (known) return t0;
        if (t0 === 'owner') return 'owner';
        return 'tenant';
    }

    function defaultPermissionsAllOn() {
        return BHD_PERMISSION_DEFS.reduce((acc, p) => {
            acc[p.key] = true;
            return acc;
        }, {});
    }

    function presetPermissionsForRole(roleKey) {
        const moduleAccess = presetModuleAccessForRole(roleKey);
        return syncLegacyPermissionsFromModuleAccess(moduleAccess);
    }

    function presetPermissionsForContactType(contactType) {
        const base = BHD_PERMISSION_DEFS.reduce((acc, p) => {
            acc[p.key] = false;
            return acc;
        }, {});
        const t0 = toStr(contactType).toLowerCase();
        if (t0 === 'tenant' || t0 === 'company') {
            return {
                ...base,
                manage_dashboard: true,
                view_own_property: true,
                view_own_contract: true,
                request_maintenance: true
            };
        }
        if (t0 === 'owner') {
            return {
                ...base,
                manage_dashboard: true,
                view_own_property: true,
                view_own_contract: true,
                manage_maintenance: true
            };
        }
        if (t0 === 'employee') {
            return {
                ...base,
                manage_dashboard: true,
                manage_maintenance: true,
                manage_tasks: true,
                view_address_book: true
            };
        }
        if (t0 === 'client') {
            return { ...base, manage_dashboard: true, view_own_contract: true };
        }
        if (t0 === 'vendor') {
            return { ...base, manage_maintenance: true, manage_tasks: true };
        }
        return { ...base, manage_dashboard: true };
    }

    function contactTypeToRole(contactType) {
        const t0 = toStr(contactType).toLowerCase();
        if (t0 === 'tenant' || t0 === 'company') return 'tenant_portal';
        if (t0 === 'owner') return 'owner_portal';
        if (t0 === 'employee') return 'employee_portal';
        if (t0 === 'client') return 'client_portal';
        if (t0 === 'vendor') return 'vendor_portal';
        return 'system_user';
    }

    function normalizeUserRecord(user) {
        if (!user || typeof user !== 'object') return user;
        const roleKey = toStr(user.role) || 'system_user';
        if (!user.moduleAccess || typeof user.moduleAccess !== 'object' || !Object.keys(user.moduleAccess).length) {
            if (!user.permissions || typeof user.permissions !== 'object') {
                user.permissions = user.contactType
                    ? presetPermissionsForContactType(user.contactType)
                    : presetPermissionsForRole(roleKey);
            }
            user.moduleAccess = deriveModuleAccessFromLegacyPermissions(user.permissions);
        } else {
            BHD_MODULE_DEFS.forEach((m) => {
                user.moduleAccess[m.key] = normalizeModuleAccessLevel(user.moduleAccess[m.key]);
            });
            user.permissions = syncLegacyPermissionsFromModuleAccess(user.moduleAccess);
        }
        if (!user.permissions || typeof user.permissions !== 'object') {
            user.permissions = syncLegacyPermissionsFromModuleAccess(user.moduleAccess);
        }
        BHD_PERMISSION_DEFS.forEach((p) => {
            if (typeof user.permissions[p.key] !== 'boolean') user.permissions[p.key] = false;
        });
        if (user.permissions.manage_accounting) user.permissions.manage_coa = user.permissions.manage_coa || moduleAccessOrder(user.moduleAccess.accounting_coa) >= 2;
        if (roleKey === 'system_admin') {
            user.moduleAccess = defaultModuleAccessAllApprove();
            user.permissions = syncLegacyPermissionsFromModuleAccess(user.moduleAccess);
            user.permissions.approve_accounting = true;
        }
        if (!toStr(user.username).trim() && toStr(user.email).trim()) {
            user.username = toStr(user.email).split('@')[0].toLowerCase();
        }
        const synced = reconcileUserRoleAndPermissions(roleKey, user.permissions);
        user.role = synced.role;
        user.permissions = synced.permissions;
        user.moduleAccess = deriveModuleAccessFromLegacyPermissions(user.permissions);
        if (roleKey === 'system_admin' || synced.role === 'system_admin') {
            user.moduleAccess = defaultModuleAccessAllApprove();
            user.permissions = syncLegacyPermissionsFromModuleAccess(user.moduleAccess);
        }
        return user;
    }

    /** الصلاحيات المفعّلة في السجل هي مصدر الحقيقة — الدور يُزامَن معها / Permissions object is source of truth */
    function reconcileUserRoleAndPermissions(role, perms) {
        const permissions = { ...perms };
        BHD_PERMISSION_DEFS.forEach((p) => {
            if (typeof permissions[p.key] !== 'boolean') permissions[p.key] = false;
        });
        const allOn = BHD_PERMISSION_DEFS.every((p) => !!permissions[p.key]);
        let roleOut = toStr(role) || 'system_user';
        if (allOn) {
            roleOut = 'system_admin';
        } else if (roleOut === 'system_admin') {
            roleOut = 'system_user';
        }
        return { role: roleOut, permissions };
    }

    function getUserRoleLabel(roleKey) {
        const r = BHD_USER_ROLES.find((x) => x.key === roleKey);
        return r ? `${r.labelAr} / ${r.labelEn}` : roleKey || '—';
    }

    /** مزامنة مع الخادم المحلي (SQLite) عند فتح الصفحة عبر http://localhost:3789 */
    const BHD_KV_KEYS = [
        'bhd_contract_full',
        'bhd_tenancy_contract_drafts',
        'bhd_saved_contracts_by_unit',
        'bhd_contract_history_by_unit',
        'bhd_tenancy_draft_cancellations',
        'bhd_contract_cancellations',
        'bhd_contract_cancellation_requests',
        'bhd_buildings_list',
        'bhd_owners_list',
        'bhd_address_book',
        'bhd_file_registry',
        'bhd_theme_mode',
        'bhd_unit_reservations',
        'bhd_reservation_cancellations',
        'bhd_eviction_requests',
        'bhd_owner_building_map',
        'bhd_building_profiles',
        'bhd_owner_profiles',
        'bhd_managed_units',
        'bhd_unit_forced_vacant_keys',
        'bhd_users_registry',
        'bhd_auth_session',
        'bhd_contract_edit_requests',
        'bhd_contract_edit_grants',
        'bhd_contract_renewal_requests',
        'bhd_contract_renewal_grants',
        'bhd_contract_renewal_drafts',
        'bhd_contract_renewal_log',
        'bhd_password_reset_requests',
        'bhd_addressbook_edit_requests',
        'bhd_addressbook_edit_grants',
        'bhd_ui_last_mode',
        'bhd_tenancy_contract_seq',
        'bhd_cleanup_keep_owner_addressbook_done',
        'bhd_use_empty_base_units',
        'bhd_reservation_form_flow_v1',
        'bhd_reservation_flow_mirror_v1',
        'bhd_system_activity_log',
        'bhd_accounting_registry',
        'bhd_maintenance_registry',
        'bhd_tasks_registry',
        'bhd_approval_workflows',
        'bhd_organization_settings',
        'bhd_business_doc_templates'
    ];

    function bhdKvIsEmptyShell(raw) {
        if (raw === null || raw === undefined) return true;
        const s = toStr(raw).trim();
        if (!s) return true;
        if (s === '[]' || s === '{}' || s === 'null') return true;
        try {
            const o = JSON.parse(s);
            if (Array.isArray(o) && o.length === 0) return true;
            if (o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length === 0) return true;
        } catch (_eEmptyKv) {}
        return false;
    }

    /** هل localStorage يحتوي بيانات فعلية؟ — لتجنب سحب SQLite كامل عند كل إقلاع مكتبي / Skip full DB pull when local cache is warm */
    function bhdLocalStorageHasSubstantiveData() {
        const probeKeys = [
            'bhd_saved_contracts_by_unit',
            'bhd_managed_units',
            'bhd_buildings_list',
            'bhd_address_book',
            'bhd_accounting_registry',
            'bhd_contract_full'
        ];
        return probeKeys.some((k) => !bhdKvIsEmptyShell(localStorage.getItem(k)));
    }

    function buildingProfileTimestamp(prof) {
        if (!prof || typeof prof !== 'object') return 0;
        const t = Date.parse(toStr(prof.updatedAt) || toStr(prof.createdAt) || '');
        return Number.isFinite(t) ? t : 0;
    }

    function mergeBuildingProfilesObjects(localProfiles, externalProfiles) {
        const local = localProfiles && typeof localProfiles === 'object' ? localProfiles : {};
        const external = externalProfiles && typeof externalProfiles === 'object' ? externalProfiles : {};
        const merged = { ...local };
        Object.keys(external).forEach((key) => {
            const ep = external[key];
            const lp = local[key];
            if (!lp || typeof lp !== 'object') {
                if (ep && typeof ep === 'object') merged[key] = { ...ep };
                return;
            }
            if (!ep || typeof ep !== 'object') return;
            merged[key] = buildingProfileTimestamp(ep) > buildingProfileTimestamp(lp) ? { ...ep } : { ...lp };
        });
        return merged;
    }

    function mergeBuildingsListArrays(localList, externalList) {
        const a = Array.isArray(localList) ? localList.map((x) => toStr(x)).filter(Boolean) : [];
        const b = Array.isArray(externalList) ? externalList.map((x) => toStr(x)).filter(Boolean) : [];
        return [...new Set([...a, ...b])];
    }

    function mergeBuildingProfilesKvJson(localRaw, externalRaw) {
        let local = {};
        let external = {};
        try {
            local = JSON.parse(localRaw || '{}');
        } catch (_eLocalBp) {}
        try {
            external = JSON.parse(externalRaw || '{}');
        } catch (_eExtBp) {}
        return JSON.stringify(mergeBuildingProfilesObjects(local, external));
    }

    function mergeBuildingsListKvJson(localRaw, externalRaw) {
        let local = [];
        let external = [];
        try {
            local = JSON.parse(localRaw || '[]');
        } catch (_eLocalBl) {}
        try {
            external = JSON.parse(externalRaw || '[]');
        } catch (_eExtBl) {}
        return JSON.stringify(mergeBuildingsListArrays(local, external));
    }

    function hydrateBhdKvPropertyKey(k, local, val) {
        if (local === null || bhdKvIsEmptyShell(local)) {
            return bhdKvIsEmptyShell(val) ? null : val;
        }
        if (bhdKvIsEmptyShell(val)) return null;
        if (k === 'bhd_building_profiles') {
            const merged = mergeBuildingProfilesKvJson(local, val);
            return merged !== local ? merged : null;
        }
        if (k === 'bhd_buildings_list') {
            const merged = mergeBuildingsListKvJson(local, val);
            return merged !== local ? merged : null;
        }
        return null;
    }

    /** استرجاع من SQLite أو IndexedDB عند غياب البيانات أو كونها قشرة فارغة في localStorage */
    function hydrateBhdKvFromExternalStore(store) {
        if (!store || typeof store !== 'object') return false;
        let any = false;
        Object.keys(store).forEach((k) => {
            if (!BHD_KV_KEYS.includes(k)) return;
            const val = store[k];
            if (typeof val !== 'string') return;
            const local = localStorage.getItem(k);
            const propertyMerged = hydrateBhdKvPropertyKey(k, local, val);
            if (propertyMerged !== null) {
                localStorage.setItem(k, propertyMerged);
                any = true;
                return;
            }
            if (local === null || (bhdKvIsEmptyShell(local) && !bhdKvIsEmptyShell(val))) {
                localStorage.setItem(k, val);
                any = true;
            }
        });
        return any;
    }

    /** تُبقى عند «تصفية كل البيانات» (حسابات + مظهر) / Kept on full data wipe */
    const BHD_KEYS_KEEP_ON_FULL_WIPE = ['bhd_users_registry', 'bhd_auth_session', 'bhd_theme_mode'];
    let bhdApiAvailable = false;
    const BHD_LOCAL_DB_NAME = 'bhd_local_db_v1';
    const BHD_LOCAL_DB_STORE = 'kv';
    const BHD_LEGACY_STORAGE_PREFIX = 'sfg_';
    const BHD_LEGACY_LOCAL_DB_NAME = 'sfg_local_db_v1';
    const BHD_BRAND_STORAGE_MIGRATION_FLAG = 'bhd_brand_storage_migration_v1';

    function migrateLegacySfgStorageKeysToBhd() {
        if (localStorage.getItem(BHD_BRAND_STORAGE_MIGRATION_FLAG) === '1') return false;
        let moved = 0;
        const migrateStore = (store) => {
            const keys = [];
            for (let i = 0; i < store.length; i++) {
                const k = store.key(i);
                if (k && k.startsWith(BHD_LEGACY_STORAGE_PREFIX)) keys.push(k);
            }
            keys.forEach((oldKey) => {
                const newKey = 'bhd_' + oldKey.slice(BHD_LEGACY_STORAGE_PREFIX.length);
                if (store.getItem(newKey) === null) store.setItem(newKey, store.getItem(oldKey));
                store.removeItem(oldKey);
                moved += 1;
            });
        };
        try {
            migrateStore(localStorage);
            migrateStore(sessionStorage);
            const usersRaw = localStorage.getItem('bhd_users_registry');
            if (usersRaw && (usersRaw.includes('@sfg.om') || usersRaw.includes('sfg.om'))) {
                localStorage.setItem(
                    'bhd_users_registry',
                    usersRaw.replace(/@sfg\.om/g, '@bhd.om').replace(/sfg\.om/g, 'bhd.om')
                );
            }
            localStorage.setItem(BHD_BRAND_STORAGE_MIGRATION_FLAG, '1');
        } catch (eMigr) {
            console.warn('migrateLegacySfgStorageKeysToBhd', eMigr);
        }
        return moved > 0;
    }

    async function dropLegacySfgIndexedDb() {
        if (!window.indexedDB) return;
        if (localStorage.getItem('bhd_brand_idb_drop_v1') === '1') return;
        try {
            await new Promise((resolve) => {
                const req = indexedDB.deleteDatabase(BHD_LEGACY_LOCAL_DB_NAME);
                req.onsuccess = () => resolve();
                req.onerror = () => resolve();
                req.onblocked = () => resolve();
            });
            localStorage.setItem('bhd_brand_idb_drop_v1', '1');
        } catch (_eIdbDrop) {}
    }

    function setBhdDbStatus(text) {
        const el = document.getElementById('bhdDbStatus');
        if (!el) return;
        const msg = toStr(text).trim();
        el.textContent = msg;
        el.hidden = !msg;
    }

    /** @internal persistence backend — never show in UI (see transparent-upgrade-architecture.mdc) */
    function _bhdPersistenceBackend() {
        if (window.bhdDesktop) return 'desktop';
        if (bhdApiAvailable) return 'kv-server';
        if (window.__bhdCloudApiActive) return 'cloud-api';
        return 'browser';
    }

    function getBhdRuntimeMode() {
        return _bhdPersistenceBackend();
    }

    function openBhdLocalDb() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB not supported'));
                return;
            }
            const req = indexedDB.open(BHD_LOCAL_DB_NAME, 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(BHD_LOCAL_DB_STORE)) {
                    db.createObjectStore(BHD_LOCAL_DB_STORE, { keyPath: 'key' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
        });
    }

    async function wipeIndexedDbCompletely() {
        return wipeIndexedDbKeys([], { clearAll: true });
    }

    async function wipeIndexedDbKeys(keysToRemove, options) {
        try {
            const db = await openBhdLocalDb();
            const keys = new Set(keysToRemove || []);
            const clearAll = !!(options && options.clearAll);
            await new Promise((resolve, reject) => {
                const tx = db.transaction(BHD_LOCAL_DB_STORE, 'readwrite');
                const store = tx.objectStore(BHD_LOCAL_DB_STORE);
                if (clearAll || !keys.size) {
                    store.clear();
                } else {
                    keys.forEach((k) => store.delete(k));
                }
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error || new Error('IndexedDB delete failed'));
            });
            db.close();
            return true;
        } catch (e) {
            console.warn('wipeIndexedDbKeys failed', e);
            return false;
        }
    }

    /** حذف المفاتيح من localStorage + IndexedDB + SQLite (سطح المكتب/خادم) / Purge keys from all storage layers */
    function purgeLocalStorageBhdExcept(keepKeys) {
        const keep = new Set(keepKeys || []);
        try {
            Object.keys(localStorage).forEach((k) => {
                if (!k.startsWith('bhd_') || keep.has(k)) return;
                localStorage.removeItem(k);
            });
        } catch (e) {}
    }

    async function purgeBhdKeysFromAllStores(keysToRemove, options) {
        const keys = [...new Set((keysToRemove || []).filter((k) => typeof k === 'string' && k.startsWith('bhd_')))];
        const doFullDbWipe = !!(options && options.wipeAllExcept);
        if (!keys.length && !doFullDbWipe) return;
        if (doFullDbWipe && options.wipeAllExcept) {
            purgeLocalStorageBhdExcept(options.wipeAllExcept);
        } else {
            keys.forEach((k) => {
                try {
                    localStorage.removeItem(k);
                } catch (e) {}
            });
        }
        try {
            sessionStorage.removeItem('bhd_ui_current_doc');
            sessionStorage.removeItem('bhd_ui_last_mode');
            if (typeof BHD_RESERVATION_FORM_FLOW_KEY === 'string') {
                sessionStorage.removeItem(BHD_RESERVATION_FORM_FLOW_KEY);
            }
        } catch (e) {}
        if (doFullDbWipe) {
            await wipeIndexedDbCompletely();
        } else {
            await wipeIndexedDbKeys(keys);
        }
        try {
            if (window.bhdDesktop && window.bhdDesktop.kvWipeAllExcept && doFullDbWipe) {
                await window.bhdDesktop.kvWipeAllExcept(options.wipeAllExcept);
            } else if (window.bhdDesktop && window.bhdDesktop.kvClearKeys && keys.length) {
                await window.bhdDesktop.kvClearKeys(keys);
            } else if (bhdApiAvailable && doFullDbWipe) {
                await fetch('/api/kv/wipe-all-except', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ keepKeys: options.wipeAllExcept || BHD_KEYS_KEEP_ON_FULL_WIPE })
                });
            } else if (bhdApiAvailable && keys.length) {
                await fetch('/api/kv/clear-keys', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ keys })
                });
            }
        } catch (e) {
            console.warn('purgeBhdKeysFromAllStores remote failed', e);
        }
        await mirrorKvFromLocalStorageToIndexedDb();
    }

    function getBhdKeysForCleanupScope(scope) {
        const allData = BHD_KV_KEYS.filter((k) => !BHD_KEYS_KEEP_ON_FULL_WIPE.includes(k));
        const extraUi = ['bhd_ui_language'];
        if (scope === 'all') return [...allData, ...extraUi];
        if (scope === 'contracts') {
            return [
                'bhd_contract_full',
                'bhd_tenancy_contract_drafts',
                'bhd_saved_contracts_by_unit',
                'bhd_contract_history_by_unit',
                'bhd_contract_renewal_drafts',
                'bhd_contract_renewal_log',
                'bhd_contract_renewal_requests',
                'bhd_contract_renewal_grants',
                'bhd_tenancy_draft_cancellations',
                'bhd_unit_forced_vacant_keys',
                'bhd_file_registry',
                'bhd_tenancy_contract_seq'
            ];
        }
        if (scope === 'buildings') {
            return [
                'bhd_buildings_list',
                'bhd_owner_building_map',
                'bhd_building_profiles',
                'bhd_managed_units',
                'bhd_use_empty_base_units',
                'bhd_contract_full',
                'bhd_tenancy_contract_drafts',
                'bhd_unit_forced_vacant_keys'
            ];
        }
        if (scope === 'tenants') return [];
        if (scope === 'reservations') {
            return [
                'bhd_unit_reservations',
                'bhd_reservation_cancellations',
                'bhd_eviction_requests',
                'bhd_reservation_form_flow_v1',
                'bhd_reservation_flow_mirror_v1'
            ];
        }
        if (scope === 'owners') {
            return ['bhd_owners_list', 'bhd_owner_profiles', 'bhd_owner_building_map'];
        }
        if (scope === 'addressbook') return ['bhd_address_book'];
        if (scope === 'accounting') return ['bhd_accounting_registry'];
        if (scope === 'maintenance') return ['bhd_maintenance_registry'];
        if (scope === 'tasks') return ['bhd_tasks_registry'];
        return [];
    }

    function getEmptyStorageDefaultsForScope(scope) {
        const base = {
            bhd_buildings_list: '[]',
            bhd_owners_list: '[]',
            bhd_address_book: '[]',
            bhd_file_registry: '[]',
            bhd_unit_reservations: '[]',
            bhd_reservation_cancellations: '[]',
            bhd_eviction_requests: '[]',
            bhd_owner_building_map: '{}',
            bhd_building_profiles: '{}',
            bhd_owner_profiles: '{}',
            bhd_managed_units: '[]',
            bhd_use_empty_base_units: '1'
        };
        if (scope === 'all') {
            return {
                ...base,
                bhd_hide_demo_units: '1',
                bhd_use_empty_base_units: '1'
            };
        }
        if (scope === 'buildings') {
            return {
                bhd_buildings_list: '[]',
                bhd_owner_building_map: '{}',
                bhd_building_profiles: '{}',
                bhd_managed_units: '[]',
                bhd_use_empty_base_units: '1'
            };
        }
        if (scope === 'reservations') {
            return {
                bhd_unit_reservations: '[]',
                bhd_reservation_cancellations: '[]',
                bhd_eviction_requests: '[]'
            };
        }
        if (scope === 'owners') {
            return { bhd_owners_list: '[]', bhd_owner_profiles: '{}', bhd_owner_building_map: '{}' };
        }
        if (scope === 'addressbook') return { bhd_address_book: '[]' };
        if (scope === 'accounting') return { bhd_accounting_registry: JSON.stringify(emptyAccountingRegistry()) };
        if (scope === 'maintenance') return { bhd_maintenance_registry: JSON.stringify(emptyMaintenanceRegistry()) };
        if (scope === 'tasks') return { bhd_tasks_registry: JSON.stringify(defaultTasksRegistry()) };
        if (scope === 'contracts') return { bhd_file_registry: '[]' };
        return {};
    }

    function applyEmptyStorageDefaultsForScope(scope) {
        const empties = getEmptyStorageDefaultsForScope(scope);
        Object.entries(empties).forEach(([k, v]) => {
            try {
                localStorage.setItem(k, v);
            } catch (e) {}
        });
    }

    function persistCleanupScopeToLocalStorage(scope) {
        if (scope === 'tenants' || scope === 'owners' || scope === 'addressbook') {
            localStorage.setItem('bhd_address_book', JSON.stringify(addressBookEntries));
        }
        if (scope === 'all' || scope === 'buildings') {
            localStorage.setItem('bhd_buildings_list', JSON.stringify(buildingsList));
            localStorage.setItem('bhd_owner_building_map', JSON.stringify(ownerBuildingMap));
            localStorage.setItem('bhd_building_profiles', JSON.stringify(buildingProfiles));
            localStorage.setItem('bhd_managed_units', JSON.stringify(managedUnitsData));
        }
        if (scope === 'all' || scope === 'owners') {
            localStorage.setItem('bhd_owners_list', JSON.stringify(ownersList));
            localStorage.setItem('bhd_owner_profiles', JSON.stringify(ownerProfiles));
        }
        if (scope === 'all' || scope === 'reservations') {
            localStorage.setItem('bhd_unit_reservations', JSON.stringify(unitReservations));
            localStorage.setItem('bhd_reservation_cancellations', JSON.stringify(reservationCancellationLog));
            localStorage.setItem('bhd_eviction_requests', JSON.stringify(evictionRequests));
        }
        if (scope === 'contracts' || scope === 'all') {
            localStorage.setItem('bhd_file_registry', JSON.stringify(fileRegistry));
        }
        if (scope === 'accounting' || scope === 'all') {
            localStorage.setItem(ACCOUNTING_REGISTRY_KEY, JSON.stringify(emptyAccountingRegistry()));
        }
        if (scope === 'maintenance' || scope === 'all') {
            localStorage.setItem(MAINTENANCE_REGISTRY_KEY, JSON.stringify(emptyMaintenanceRegistry()));
        }
        if (scope === 'tasks' || scope === 'all') {
            localStorage.setItem(TASKS_REGISTRY_KEY, JSON.stringify(defaultTasksRegistry()));
        }
    }

    async function mirrorKvFromLocalStorageToIndexedDb() {
        try {
            const db = await openBhdLocalDb();
            await new Promise((resolve, reject) => {
                const tx = db.transaction(BHD_LOCAL_DB_STORE, 'readwrite');
                const store = tx.objectStore(BHD_LOCAL_DB_STORE);
                BHD_KV_KEYS.forEach((k) => {
                    const v = localStorage.getItem(k);
                    if (v === null) store.delete(k);
                    else store.put({ key: k, value: v, updatedAt: Date.now() });
                });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
            });
            db.close();
            return true;
        } catch (e) {
            console.warn('mirrorKvFromLocalStorageToIndexedDb failed', e);
            return false;
        }
    }

    async function hydrateLocalStorageFromIndexedDb() {
        bhdAuditMute();
        try {
            const db = await openBhdLocalDb();
            const rows = await new Promise((resolve, reject) => {
                const tx = db.transaction(BHD_LOCAL_DB_STORE, 'readonly');
                const store = tx.objectStore(BHD_LOCAL_DB_STORE);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error || new Error('IndexedDB read failed'));
            });
            db.close();
            const map = {};
            rows.forEach((row) => {
                const key = toStr(row?.key);
                const value = typeof row?.value === 'string' ? row.value : '';
                if (key) map[key] = value;
            });
            return hydrateBhdKvFromExternalStore(map);
        } catch (e) {
            console.warn('hydrateLocalStorageFromIndexedDb failed', e);
            return false;
        } finally {
            bhdAuditUnmute();
        }
    }

    /** ذاكرة مؤقتة لقراءة مرفقات القرص دون إعادة طلب IPC / Cache for disk attachment data URLs */
    const _bhdDiskUrlCache = {};

    function bhdIsDesktopApp() {
        return !!(
            window.bhdDesktop &&
            (window.bhdDesktop.isDesktop === true || typeof window.bhdDesktop.kvGetBulk === 'function')
        );
    }

    function bhdFileStorageAvailable() {
        return !!(bhdIsDesktopApp() && typeof window.bhdDesktop.fileSaveAttachment === 'function');
    }

    function bhdCloudFileStorageAvailable() {
        return !!window.__bhdCloudApiActive;
    }

    function bhdExternalFileStorageAvailable() {
        return bhdFileStorageAvailable() || bhdCloudFileStorageAvailable();
    }

    function bhdIsCloudFileId(fileId) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(toStr(fileId));
    }

    async function bhdCloudUploadAttachment({ dataUrl, file, ctx }) {
        const r = await bhdCloudFetch('/files/upload', {
            method: 'POST',
            body: JSON.stringify({
                dataUrl,
                fileName: file?.name || 'attachment',
                mimeType: file?.type || 'application/octet-stream',
                building: ctx.buildingNo,
                unit: ctx.flatNo,
                agreementNo: ctx.agreementNo || '_draft',
                tenant: ctx.tenantName,
                category: ctx.category || 'other',
                docType: ctx.docType || ctx.category,
            }),
        });
        if (!r.ok) throw new Error('cloud upload failed');
        return r.json();
    }

    async function bhdCloudReadFileAsDataUrl(fileId) {
        const id = toStr(fileId).trim();
        if (!id) return '';
        const cacheKey = `cloud:${id}`;
        const cached = _bhdDiskUrlCache[cacheKey];
        if (cached) return cached;
        const r = await bhdCloudFetch(`/files/${encodeURIComponent(id)}/content`);
        if (!r.ok) return '';
        const blob = await r.blob();
        const dataUrl = await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result || ''));
            fr.onerror = () => reject(fr.error || new Error('read blob failed'));
            fr.readAsDataURL(blob);
        });
        if (dataUrl) _bhdDiskUrlCache[cacheKey] = dataUrl;
        return dataUrl;
    }

    function bhdGetContractFileContext(overrides) {
        let d = {};
        try {
            d = typeof getFormData === 'function' ? getFormData() : {};
        } catch (_eFd) {}
        const renewalAg = toStr(_contractRenewalCtx?.renewal?.agreementNo);
        return {
            buildingNo:
                overrides?.buildingNo ??
                d.buildingNo ??
                document.getElementById('buildingNo')?.value ??
                '',
            flatNo:
                overrides?.flatNo ?? d.flatNo ?? document.getElementById('flatNo')?.value ?? '',
            agreementNo:
                overrides?.agreementNo ??
                renewalAg ??
                d.agreementNo ??
                document.getElementById('agreementNo')?.value ??
                '',
            tenantName:
                overrides?.tenantName ?? d.tenantNameAr ?? d.tenantNameEn ?? ''
        };
    }

    function bhdCacheDiskDataUrl(relativePath, dataUrl) {
        const rel = toStr(relativePath).trim();
        const url = toStr(dataUrl).trim();
        if (rel && url) _bhdDiskUrlCache[rel] = url;
    }

    function bhdGetCachedDiskDataUrl(relativePath) {
        const rel = toStr(relativePath).trim();
        return rel ? toStr(_bhdDiskUrlCache[rel]) : '';
    }

    function bhdApplyFileRefToDataset(el, ref) {
        if (!el || !ref) return;
        el.dataset.attachmentName = toStr(ref.name);
        el.dataset.attachmentDataUrl = ref.storedOnDisk ? '' : toStr(ref.dataUrl);
        el.dataset.attachmentRelativePath = toStr(ref.relativePath);
        el.dataset.attachmentFileId = toStr(ref.fileId);
        el.dataset.storedOnDisk = ref.storedOnDisk ? '1' : '0';
    }

    function bhdFileRefFromDataset(el) {
        if (!el) return null;
        const relativePath = toStr(el.dataset.attachmentRelativePath);
        return {
            name: toStr(el.dataset.attachmentName),
            type: '',
            dataUrl: toStr(el.dataset.attachmentDataUrl),
            relativePath,
            fileId: toStr(el.dataset.attachmentFileId),
            storedOnDisk: el.dataset.storedOnDisk === '1' || !!relativePath
        };
    }

    function bhdStripInlineBlobFromFileRef(ref) {
        if (!ref || typeof ref !== 'object') return ref;
        const out = { ...ref };
        if (out.storedOnDisk || out.relativePath) out.dataUrl = '';
        return out;
    }

    async function bhdReadFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result || ''));
            r.onerror = () => reject(new Error('read failed'));
            r.readAsDataURL(file);
        });
    }

    async function bhdPersistUploadedFile(file, context) {
        if (!file) return null;
        const ctx = { ...bhdGetContractFileContext(), ...(context || {}) };
        const dataUrl = await bhdReadFileAsDataUrl(file);
        if (bhdFileStorageAvailable()) {
            try {
                const saved = await window.bhdDesktop.fileSaveAttachment({
                    building: ctx.buildingNo,
                    unit: ctx.flatNo,
                    agreementNo: ctx.agreementNo || '_draft',
                    category: ctx.category || 'other',
                    docType: ctx.docType || ctx.category,
                    tenant: ctx.tenantName,
                    fileName: file.name,
                    type: file.type || 'application/octet-stream',
                    dataUrl
                });
                if (saved?.relativePath) bhdCacheDiskDataUrl(saved.relativePath, dataUrl);
                return {
                    name: saved?.name || file.name,
                    type: saved?.type || file.type || 'application/octet-stream',
                    size: file.size || 0,
                    fileId: saved?.fileId || '',
                    relativePath: saved?.relativePath || '',
                    storedOnDisk: true,
                    dataUrl: ''
                };
            } catch (e) {
                console.warn('bhdPersistUploadedFile disk failed, fallback inline', e);
            }
        }
        if (bhdCloudFileStorageAvailable()) {
            try {
                const saved = await bhdCloudUploadAttachment({ dataUrl, file, ctx });
                if (saved?.fileId) bhdCacheDiskDataUrl(`cloud:${saved.fileId}`, dataUrl);
                return {
                    name: saved?.name || file.name,
                    type: saved?.type || file.type || 'application/octet-stream',
                    size: saved?.size || file.size || 0,
                    fileId: saved?.fileId || '',
                    relativePath: saved?.relativePath || '',
                    storedOnDisk: true,
                    dataUrl: ''
                };
            } catch (eCloudUp) {
                console.warn('bhdPersistUploadedFile cloud failed, fallback inline', eCloudUp);
            }
        }
        return {
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size || 0,
            dataUrl,
            storedOnDisk: false
        };
    }

    async function bhdResolveAttachmentUrl(att) {
        if (!att) return '';
        if (typeof att === 'string') {
            const s = toStr(att).trim();
            if (/^data:/i.test(s)) return s;
            return bhdGetCachedDiskDataUrl(s);
        }
        if (typeof att !== 'object') return '';
        const cached = bhdGetCachedDiskDataUrl(att.relativePath);
        if (cached) return cached;
        const inline = pickEmbeddedDataUrl(att, att.dataUrl, att.attachmentDataUrl, att.checkAttachmentDataUrl);
        if (inline) return inline;
        const rel =
            toStr(att.relativePath) ||
            toStr(att.checkAttachmentRelativePath) ||
            toStr(att.attachmentRelativePath);
        if (rel && bhdFileStorageAvailable()) {
            try {
                const url = await window.bhdDesktop.fileReadAsDataUrl(rel);
                if (url) {
                    bhdCacheDiskDataUrl(rel, url);
                    return url;
                }
            } catch (e) {
                console.warn('bhdResolveAttachmentUrl', rel, e);
            }
        }
        const fileId =
            toStr(att.fileId) ||
            toStr(att.checkAttachmentFileId) ||
            toStr(att.depositAttachmentFileId) ||
            toStr(att.attachmentFileId);
        if (fileId && bhdIsCloudFileId(fileId) && bhdCloudFileStorageAvailable()) {
            try {
                const url = await bhdCloudReadFileAsDataUrl(fileId);
                if (url) return url;
            } catch (eCloudRd) {
                console.warn('bhdResolveAttachmentUrl cloud', fileId, eCloudRd);
            }
        }
        if (fileId && bhdFileStorageAvailable() && window.bhdDesktop.fileGetEntry) {
            try {
                const entry = await window.bhdDesktop.fileGetEntry(fileId);
                const entryPath = toStr(entry?.relativePath || entry?.file_path);
                if (entryPath) {
                    const url = await window.bhdDesktop.fileReadAsDataUrl(entryPath);
                    if (url) {
                        bhdCacheDiskDataUrl(entryPath, url);
                        return url;
                    }
                }
            } catch (e) {
                console.warn('bhdResolveAttachmentUrl fileId', fileId, e);
            }
        }
        return '';
    }

    function mergeChequeRowAttachmentFields(ex, row) {
        const src = ex && typeof ex === 'object' ? ex : {};
        const base = row && typeof row === 'object' ? { ...row } : {};
        const rel = toStr(src.checkAttachmentRelativePath || src.attachmentRelativePath);
        const onDisk = !!(src.storedOnDisk || rel);
        return {
            ...base,
            checkNo: toStr(src.checkNo) || toStr(base.checkNo),
            checkAttachmentName: toStr(src.checkAttachmentName || src.attachmentName) || toStr(base.checkAttachmentName),
            checkAttachmentDataUrl: onDisk ? '' : toStr(src.checkAttachmentDataUrl || src.attachmentDataUrl) || toStr(base.checkAttachmentDataUrl),
            checkAttachmentRelativePath: rel || toStr(base.checkAttachmentRelativePath),
            checkAttachmentFileId: toStr(src.checkAttachmentFileId || src.attachmentFileId) || toStr(base.checkAttachmentFileId),
            storedOnDisk: onDisk || !!base.storedOnDisk
        };
    }

    async function repairContractPrintAttachmentItemsFromDisk(items, ctx) {
        if (!window.bhdDesktop?.fileListEntries || !Array.isArray(items) || !items.length) return items;
        let files = null;
        const allFiles = async () => {
            if (!files) {
                try {
                    files = await listContractFileEntriesForCtx(ctx);
                } catch (_eList) {
                    files = [];
                }
                const ag = sanitizePathSegmentForFile(ctx?.agreementNo);
                const scopeRenewal = ctx?.scopeDiskRepairToAgreement === true;
                if (scopeRenewal && ag && ag !== '_' && ag !== '_draft' && files.length) {
                    const prevAg = sanitizePathSegmentForFile(ctx?.previousAgreementNo);
                    files = files.filter((f) => {
                        const rel = toStr(f.file_path).replace(/\\/g, '/');
                        if (prevAg && prevAg !== '_' && rel.includes(`/contracts/${prevAg}/`)) return false;
                        return (
                            renewalFilePathMatchesAgreement(f.file_path, ag) ||
                            /\/contracts\/_draft\//i.test(rel)
                        );
                    });
                }
            }
            return files;
        };
        const out = [];
        for (const it of items) {
            const next = { ...it };
            const hasRef =
                toStr(next.relativePath).trim() ||
                pickEmbeddedDataUrl(next, next.dataUrl, next.checkAttachmentDataUrl, next.attachmentDataUrl);
            if (!hasRef) {
                const list = await allFiles();
                const key = toStr(it.key);
                const name = toStr(it.name).toLowerCase();
                let match = null;
                if (key === 'deposit_receipt') {
                    match = list.find((f) => /deposit/i.test(toStr(f.doc_type))) || null;
                } else if (key.startsWith('pay_chq_')) {
                    const m = key.slice('pay_chq_'.length);
                    match =
                        list.find((f) => toStr(f.doc_type) === `cheque_rent_month_${m}`) ||
                        list.find((f) => toStr(f.doc_type).includes(`month_${m}`)) ||
                        null;
                } else if (key.startsWith('vat_chq_')) {
                    const idx = key.slice('vat_chq_'.length);
                    match = list.find((f) => toStr(f.doc_type) === `cheque_vat_${idx}`) || null;
                }
                if (!match && name) {
                    match = list.find((f) => toStr(f.file_name).toLowerCase() === name) || null;
                }
                if (match) {
                    next.relativePath = toStr(match.file_path);
                    next.fileId = toStr(match.id);
                    next.storedOnDisk = true;
                }
            }
            out.push(next);
        }
        return out;
    }

    async function bhdHydrateAttachmentItemsForPrint(items) {
        const out = [];
        for (const it of Array.isArray(items) ? items : []) {
            const url = await bhdResolveAttachmentUrl(it);
            if (!url) continue;
            out.push({ ...it, dataUrl: url });
        }
        return out;
    }

    let _bhdPdfJsLoadPromise = null;
    function loadPdfJsForPrint() {
        if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
        if (_bhdPdfJsLoadPromise) return _bhdPdfJsLoadPromise;
        _bhdPdfJsLoadPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            s.onload = () => {
                if (window.pdfjsLib) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    resolve(window.pdfjsLib);
                } else {
                    reject(new Error('pdfjsLib missing'));
                }
            };
            s.onerror = () => reject(new Error('pdfjs load failed'));
            document.head.appendChild(s);
        });
        return _bhdPdfJsLoadPromise;
    }

    async function bhdRenderPdfDataUrlToPrintImages(dataUrl, maxPages = 30) {
        const pdfjsLib = await loadPdfJsForPrint();
        const src = toStr(dataUrl);
        let pdf;
        try {
            pdf = await pdfjsLib.getDocument(src).promise;
        } catch (_eUrl) {
            const m = /^data:([^;]+);base64,(.+)$/i.exec(src);
            if (!m) throw _eUrl;
            const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
            pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        }
        const images = [];
        const pageCount = Math.min(pdf.numPages || 0, maxPages);
        for (let p = 1; p <= pageCount; p += 1) {
            const page = await pdf.getPage(p);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            images.push(canvas.toDataURL('image/jpeg', 0.9));
        }
        return images;
    }

    async function bhdExpandPdfAttachmentsForPrint(items) {
        const out = [];
        for (const it of Array.isArray(items) ? items : []) {
            const url = toStr(it.dataUrl);
            if (isPdfAttachmentDataUrl(url, it.type, it.name)) {
                try {
                    const pages = await bhdRenderPdfDataUrlToPrintImages(url);
                    if (pages.length) {
                        pages.forEach((pageUrl, pi) => {
                            out.push({
                                ...it,
                                dataUrl: pageUrl,
                                type: 'image/jpeg',
                                label:
                                    pages.length > 1
                                        ? `${toStr(it.label)} — ${t(`صفحة ${pi + 1}`, `Page ${pi + 1}`)}`
                                        : toStr(it.label)
                            });
                        });
                        continue;
                    }
                } catch (e) {
                    console.warn('bhdExpandPdfAttachmentsForPrint', it.label, e);
                }
            }
            out.push(it);
        }
        return out;
    }

    function contractFileEntryMatchesCtx(f, ctx) {
        if (!f || typeof f !== 'object') return false;
        if (toStr(f.building).toLowerCase() === 'addressbook') return false;
        const wantB = normalizeReservationBuildingKey(ctx?.buildingNo || ctx?.building).toLowerCase();
        const wantU = normalizeUnit(ctx?.flatNo || ctx?.unit);
        if (!wantB || !wantU) return false;
        return (
            normalizeReservationBuildingKey(f.building).toLowerCase() === wantB &&
            normalizeUnit(f.unit) === wantU
        );
    }

    async function listContractFileEntriesForCtx(ctx) {
        if (!window.bhdDesktop?.fileListEntries) return [];
        const b = toStr(ctx?.buildingNo || ctx?.building);
        const u = toStr(ctx?.flatNo || ctx?.unit);
        if (!b || !u) return [];
        let files = [];
        try {
            files = await window.bhdDesktop.fileListEntries({});
        } catch (_eAll) {
            files = [];
        }
        if (!files.length) {
            try {
                files = await window.bhdDesktop.fileListEntries({ building: b, unit: u });
            } catch (_eFilt) {
                files = [];
            }
        }
        return (Array.isArray(files) ? files : []).filter((f) => contractFileEntryMatchesCtx(f, ctx));
    }

    function fileEntryToPrintAttachmentItem(f) {
        const docType = toStr(f.doc_type);
        const name = toStr(f.file_name);
        const rel = toStr(f.file_path);
        if (!rel) return null;
        let key = `disk_${toStr(f.id)}`;
        let label = name || t('مرفق / Attachment', 'Attachment / مرفق');
        const rentM = /cheque_rent_month_(\d+)/i.exec(docType);
        const vatM = /cheque_vat_(\d+)/i.exec(docType);
        if (/deposit/i.test(docType)) {
            key = 'deposit_receipt';
            label = t('إيصال التأمين / Deposit receipt', 'Deposit receipt / إيصال التأمين');
        } else if (rentM) {
            key = `pay_chq_${rentM[1]}`;
            label = t(`شيك إيجار — شهر ${rentM[1]}`, `Rent cheque — month ${rentM[1]}`);
        } else if (vatM) {
            key = `vat_chq_${vatM[1]}`;
            label = t(`شيك ضريبة — ${vatM[1]}`, `VAT cheque — ${vatM[1]}`);
        } else if (/insurance/i.test(docType)) {
            label = t('مستند تأمين / Insurance document', 'Insurance document / مستند تأمين');
        } else if (/cheque/i.test(docType)) {
            label = t('شيك / Cheque', 'Cheque / شيك');
        } else if (/mandatory/i.test(docType)) {
            label = t('مستند العقد / Contract document', 'Contract document / مستند العقد');
        }
        const item = {
            key,
            label,
            name,
            type: /\.pdf$/i.test(name) ? 'application/pdf' : '',
            relativePath: rel,
            fileId: toStr(f.id),
            storedOnDisk: true,
            dataUrl: ''
        };
        if (rentM) item.monthIndex = parseInt(rentM[1], 10) || 0;
        if (vatM) item.chequeIndex = parseInt(vatM[1], 10) || 0;
        return item;
    }

    async function collectContractAttachmentsFromDiskDirect(ctx) {
        const items = [];
        const files = await listContractFileEntriesForCtx(ctx);
        files.forEach((f) => {
            const it = fileEntryToPrintAttachmentItem(f);
            if (it) items.push(it);
        });
        return items;
    }

    async function bhdMigrateAttachmentObject(att, ctx, docType) {
        if (!att || typeof att !== 'object') return att;
        if (att.relativePath && att.storedOnDisk && !bhdIsCloudFileId(att.fileId)) {
            return bhdStripInlineBlobFromFileRef(att);
        }
        const url = pickEmbeddedDataUrl(att, att.dataUrl, att.attachmentDataUrl, att.checkAttachmentDataUrl);
        if (!url || !bhdExternalFileStorageAvailable()) return att;
        if (bhdFileStorageAvailable()) {
            try {
                const saved = await window.bhdDesktop.fileSaveAttachment({
                    building: ctx.buildingNo,
                    unit: ctx.flatNo,
                    agreementNo: ctx.agreementNo || '_draft',
                    category: ctx.category || 'other',
                    docType: docType || ctx.docType || ctx.category,
                    tenant: ctx.tenantName,
                    fileName: att.name || 'file',
                    type: att.type || 'application/octet-stream',
                    dataUrl: url
                });
                if (saved?.relativePath) bhdCacheDiskDataUrl(saved.relativePath, url);
                return {
                    ...att,
                    name: saved?.name || att.name,
                    type: saved?.type || att.type,
                    fileId: saved?.fileId || att.fileId || '',
                    relativePath: saved?.relativePath || '',
                    storedOnDisk: true,
                    dataUrl: ''
                };
            } catch (e) {
                console.warn('bhdMigrateAttachmentObject desktop', e);
            }
        }
        if (bhdCloudFileStorageAvailable()) {
            try {
                const saved = await bhdCloudUploadAttachment({
                    dataUrl: url,
                    file: { name: att.name || 'file', type: att.type || 'application/octet-stream' },
                    ctx: { ...ctx, docType: docType || ctx.docType, category: ctx.category || 'other' }
                });
                if (saved?.fileId) bhdCacheDiskDataUrl(`cloud:${saved.fileId}`, url);
                return {
                    ...att,
                    name: saved?.name || att.name,
                    type: saved?.type || att.type,
                    fileId: saved?.fileId || '',
                    relativePath: saved?.relativePath || '',
                    storedOnDisk: true,
                    dataUrl: ''
                };
            } catch (eCloud) {
                console.warn('bhdMigrateAttachmentObject cloud', eCloud);
            }
        }
        return att;
    }

    function updateBhdStorageMgmtButtonsVisibility() {
        document.querySelectorAll('.bhd-storage-mgmt-btn').forEach((btn) => {
            btn.style.display = '';
        });
    }

    function bhdStorageDesktopActionAvailable(action) {
        if (!bhdIsDesktopApp() || !window.bhdDesktop) return false;
        const map = {
            pickFolder: 'pickDataFolder',
            openFolder: 'syncOpenDataFolder',
            openExports: 'syncOpenExportsFolder',
            backup: 'syncBackupNow',
            migrate: 'fileSaveAttachment'
        };
        const key = map[action];
        return !!(key && typeof window.bhdDesktop[key] === 'function');
    }

    function bhdAlertDesktopRequired(featureLabel) {
        const batHint = t(
            'لتفعيل هذه الميزة شغّل التطبيق المكتبي (وليس المتصفح):\n\n' +
                '① من قائمة ابدأ: BHD Real Estate\n' +
                'أو ② انقر مرتين على الملف:\n' +
                '   تشغيل-التطبيق-المكتبي.bat\n' +
                '   (في مجلد المشروع الرئيسي)\n\n' +
                'الميزة: ',
            'To use this feature, run the desktop app (not the browser):\n\n' +
                '① Start menu: BHD Real Estate\n' +
                'or ② Double-click:\n' +
                '   start-desktop.bat\n' +
                '   (in the project root folder)\n\n' +
                'Feature: '
        );
        alert(batHint + featureLabel);
    }

    function syncStorageModalControlsForMode() {
        const desktop = bhdIsDesktopApp();
        const notice = document.getElementById('storageMgmtBrowserNotice');
        const launchWrap = document.getElementById('storageMgmtLaunchDesktopWrap');
        if (notice) notice.style.display = desktop ? 'none' : '';
        if (launchWrap) launchWrap.style.display = desktop ? 'none' : '';
        const styleBtn = (id, active) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.disabled = false;
            el.style.opacity = active ? '' : '0.72';
            el.style.pointerEvents = '';
            el.title = active
                ? ''
                : t('يتطلب التطبيق المكتبي — انقر للتعليمات', 'Requires desktop app — click for instructions');
        };
        styleBtn('storageMgmtPickFolderBtn', bhdStorageDesktopActionAvailable('pickFolder'));
        styleBtn('storageMgmtOpenFolderBtn', bhdStorageDesktopActionAvailable('openFolder'));
        styleBtn('storageMgmtOpenExportsBtn', bhdStorageDesktopActionAvailable('openExports'));
        styleBtn('storageMgmtBackupBtn', bhdStorageDesktopActionAvailable('backup'));
        styleBtn('storageMgmtMigrateBtn', bhdFileStorageAvailable());
    }

    async function refreshStorageManagementPanel() {
        const pathEl = document.getElementById('storageMgmtDataDirPath');
        const countEl = document.getElementById('storageMgmtFileCount');
        syncStorageModalControlsForMode();
        if (!pathEl) return;
        if (!bhdIsDesktopApp()) {
            pathEl.textContent = t(
                'المتصفح — لا يوجد مجلد بيانات محلي (استخدم تطبيق Electron)',
                'Browser — no local data folder (use the Electron desktop app)'
            );
            if (countEl) countEl.textContent = '';
            return;
        }
        try {
            const st = await window.bhdDesktop.syncGetStatus();
            const dir = toStr(st?.dataDir);
            pathEl.textContent = dir || t('لم يُحدد مجلد بعد — اضغط «تغيير مجلد البيانات»', 'No folder yet — press «Change data folder»');
            if (countEl) {
                if (typeof window.bhdDesktop.fileGetStorageInfo === 'function') {
                    const info = await window.bhdDesktop.fileGetStorageInfo();
                    const disk = Number(info?.diskFileCount) || 0;
                    const db = Number(info?.dbFileCount) || 0;
                    countEl.textContent = t(
                        `ملفات على القرص: ${disk} | مسجّلة في القاعدة: ${db}`,
                        `Files on disk: ${disk} | registered in DB: ${db}`
                    );
                } else {
                    countEl.textContent = t(
                        'حدّث التطبيق المكتبي لدعم مرفقات القرص',
                        'Update the desktop app for disk attachment support'
                    );
                }
            }
        } catch (e) {
            pathEl.textContent = '—';
            if (countEl) countEl.textContent = '';
        }
    }

    function openStorageManagementModal() {
        document.getElementById('storageManagementModal')?.classList.add('open');
        refreshStorageManagementPanel();
        const st = document.getElementById('storageMgmtStatus');
        if (st) st.textContent = '';
    }

    function closeStorageManagementModal() {
        document.getElementById('storageManagementModal')?.classList.remove('open');
    }

    function showDesktopLaunchInstructions() {
        bhdAlertDesktopRequired(t('اختيار مجلد البيانات والتخزين', 'data folder & storage'));
    }

    async function storageMgmtPickFolder() {
        if (!bhdStorageDesktopActionAvailable('pickFolder')) {
            bhdAlertDesktopRequired(t('تغيير مجلد البيانات', 'change data folder'));
            return;
        }
        const st = document.getElementById('storageMgmtStatus');
        try {
            const picked = await window.bhdDesktop.pickDataFolder();
            if (st) {
                st.textContent = picked
                    ? t('تم تغيير مجلد البيانات. أعد تحميل البيانات إن لزم.', 'Data folder changed. Reload data if needed.')
                    : t('لم يُختَر مجلد.', 'No folder selected.');
            }
            await probeBhdApi();
            await pullBhdKvFromServer();
            await refreshStorageManagementPanel();
        } catch (e) {
            if (st) st.textContent = t('تعذر تغيير المجلد.', 'Could not change folder.');
        }
    }

    async function storageMgmtOpenFolder() {
        if (!bhdStorageDesktopActionAvailable('openFolder')) {
            bhdAlertDesktopRequired(t('فتح مجلد البيانات', 'open data folder'));
            return;
        }
        try {
            await window.bhdDesktop.syncOpenDataFolder();
        } catch (e) {
            alert(t('تعذر فتح المجلد.', 'Could not open folder.'));
        }
    }

    async function storageMgmtOpenExportsFolder() {
        if (!bhdStorageDesktopActionAvailable('openExports')) {
            bhdAlertDesktopRequired(t('فتح مجلد التصدير', 'open exports folder'));
            return;
        }
        try {
            await window.bhdDesktop.syncOpenExportsFolder();
        } catch (e) {
            alert(t('تعذر فتح مجلد التصدير.', 'Could not open exports folder.'));
        }
    }

    async function storageMgmtBackupNow() {
        if (!bhdStorageDesktopActionAvailable('backup')) {
            bhdAlertDesktopRequired(t('النسخ الاحتياطي', 'backup'));
            return;
        }
        const st = document.getElementById('storageMgmtStatus');
        try {
            const res = await window.bhdDesktop.syncBackupNow();
            const dest = typeof res === 'string' ? res : res?.path;
            if (st) {
                st.textContent = dest
                    ? t(`تم النسخ الاحتياطي: ${dest}`, `Backup saved: ${dest}`)
                    : t('تم النسخ الاحتياطي.', 'Backup completed.');
            }
        } catch (e) {
            if (st) st.textContent = t('فشل النسخ الاحتياطي.', 'Backup failed.');
        }
    }

    async function runMigrateAttachmentsToDisk() {
        if (!bhdFileStorageAvailable()) {
            alert(
                t(
                    'ترحيل المرفقات إلى القرص يتطلب تطبيق Electron محدّث (يدعم fileSaveAttachment).\nأعد بناء التطبيق من مجلد desktop.',
                    'Migrating attachments to disk requires an updated Electron build (fileSaveAttachment).\nRebuild from the desktop folder.'
                )
            );
            return;
        }
        if (
            !confirm(
                t(
                    'ترحيل كل المرفقات المدمجة (base64) إلى القرص؟ قد يستغرق وقتاً.',
                    'Migrate all embedded (base64) attachments to disk? This may take a while.'
                )
            )
        ) {
            return;
        }
        const st = document.getElementById('storageMgmtStatus');
        let migrated = 0;
        let failed = 0;
        const migratePayload = async (payload) => {
            if (!payload || typeof payload !== 'object') return payload;
            const ctx = {
                buildingNo: payload.buildingNo,
                flatNo: payload.flatNo,
                agreementNo: payload.agreementNo,
                tenantName: payload.tenantNameAr || payload.tenantNameEn || ''
            };
            const p = { ...payload };
            if (pickEmbeddedDataUrl(p.depositAttachmentDataUrl) || p.depositAttachmentRelativePath) {
                const dep = await bhdMigrateAttachmentObject(
                    {
                        name: p.depositAttachmentName,
                        type: '',
                        dataUrl: p.depositAttachmentDataUrl,
                        relativePath: p.depositAttachmentRelativePath,
                        fileId: p.depositAttachmentFileId,
                        storedOnDisk: p.depositStoredOnDisk
                    },
                    { ...ctx, category: 'deposit', docType: 'deposit_receipt' },
                    'deposit_receipt'
                );
                if (dep.relativePath && dep.storedOnDisk) migrated += 1;
                p.depositAttachmentName = dep.name || p.depositAttachmentName;
                p.depositAttachmentRelativePath = dep.relativePath || '';
                p.depositAttachmentFileId = dep.fileId || '';
                p.depositStoredOnDisk = !!dep.storedOnDisk;
                p.depositAttachmentDataUrl = '';
            }
            const migRows = async (rows, category, docPrefix) => {
                if (!Array.isArray(rows)) return rows;
                const out = [];
                for (const row of rows) {
                    const r = { ...row };
                    const url = pickEmbeddedDataUrl(r.checkAttachmentDataUrl, r.attachmentDataUrl, r.dataUrl);
                    if (url || r.checkAttachmentRelativePath || r.attachmentRelativePath) {
                        const att = await bhdMigrateAttachmentObject(
                            {
                                name: r.checkAttachmentName || r.attachmentName || r.name,
                                type: r.type || '',
                                dataUrl: url || r.checkAttachmentDataUrl || r.attachmentDataUrl || r.dataUrl,
                                relativePath: r.checkAttachmentRelativePath || r.attachmentRelativePath,
                                fileId: r.checkAttachmentFileId || r.attachmentFileId,
                                storedOnDisk: r.storedOnDisk
                            },
                            { ...ctx, category, docType: `${docPrefix}_${r.monthIndex || r.chequeIndex || r.id || 'row'}` },
                            docPrefix
                        );
                        if (att.relativePath && att.storedOnDisk) migrated += 1;
                        else if (url && !att.relativePath) failed += 1;
                        r.checkAttachmentName = att.name || r.checkAttachmentName;
                        r.checkAttachmentRelativePath = att.relativePath || '';
                        r.checkAttachmentFileId = att.fileId || '';
                        r.storedOnDisk = !!att.storedOnDisk;
                        r.checkAttachmentDataUrl = '';
                        r.attachmentDataUrl = '';
                        r.dataUrl = '';
                        if (r.attachmentName !== undefined || r.attachmentRelativePath !== undefined) {
                            r.attachmentName = att.name || r.attachmentName;
                            r.attachmentRelativePath = att.relativePath || '';
                            r.attachmentFileId = att.fileId || '';
                        }
                    }
                    out.push(r);
                }
                return out;
            };
            p.paymentSchedule = await migRows(p.paymentSchedule, 'cheques', 'cheque_rent');
            p.paymentScheduleJson = JSON.stringify(p.paymentSchedule);
            p.vatChequeSchedule = await migRows(p.vatChequeSchedule, 'vat-cheques', 'cheque_vat');
            p.vatChequeScheduleJson = JSON.stringify(p.vatChequeSchedule);
            p.insuranceDepositItemsJson = JSON.stringify(
                await migRows(JSON.parse(toStr(p.insuranceDepositItemsJson) || '[]'), 'deposit', 'insurance_deposit')
            );
            try {
                const mand = JSON.parse(toStr(p.contractMandatoryDocsJson) || '{}');
                if (mand && typeof mand === 'object') {
                    for (const k of Object.keys(mand)) {
                        mand[k] = await bhdMigrateAttachmentObject(mand[k], { ...ctx, category: 'mandatory', docType: k }, k);
                        if (mand[k]?.relativePath) migrated += 1;
                    }
                    p.contractMandatoryDocsJson = JSON.stringify(mand);
                }
            } catch (_eM) {}
            try {
                const other = JSON.parse(toStr(p.contractOtherDocsJson) || '[]');
                if (Array.isArray(other)) {
                    const o2 = [];
                    for (const row of other) {
                        o2.push(await bhdMigrateAttachmentObject(row, { ...ctx, category: 'other', docType: 'other' }, 'other'));
                        if (o2[o2.length - 1]?.relativePath) migrated += 1;
                    }
                    p.contractOtherDocsJson = JSON.stringify(o2);
                }
            } catch (_eO) {}
            return p;
        };
        try {
            const mapRaw = localStorage.getItem('bhd_saved_contracts_by_unit');
            const map = mapRaw ? JSON.parse(mapRaw) : {};
            for (const k of Object.keys(map || {})) {
                map[k] = await migratePayload(map[k]);
            }
            localStorage.setItem('bhd_saved_contracts_by_unit', JSON.stringify(map));
            const fullRaw = localStorage.getItem('bhd_contract_full');
            if (fullRaw) {
                const full = await migratePayload(JSON.parse(fullRaw));
                localStorage.setItem('bhd_contract_full', JSON.stringify(full));
            }
            const abRaw = localStorage.getItem('bhd_address_book');
            if (abRaw) {
                const entries = JSON.parse(abRaw);
                if (Array.isArray(entries)) {
                    for (let i = 0; i < entries.length; i++) {
                        const e = entries[i];
                        const ctx = {
                            buildingNo: 'addressbook',
                            flatNo: toStr(e.id) || String(i),
                            agreementNo: '_contacts',
                            tenantName: e.nameAr || e.nameEn || ''
                        };
                        const z = async (att, docType) => {
                            const m = await bhdMigrateAttachmentObject(
                                att,
                                { ...ctx, category: 'addressbook', docType },
                                docType
                            );
                            if (m?.relativePath) migrated += 1;
                            return m;
                        };
                        e.idAttachment = await z(e.idAttachment, 'id');
                        e.passportAttachment = await z(e.passportAttachment, 'passport');
                        e.commercialRegAttachment = await z(e.commercialRegAttachment, 'commercial_reg');
                        e.leaseContractAttachment = await z(e.leaseContractAttachment, 'lease');
                        if (Array.isArray(e.signatories)) {
                            for (const sg of e.signatories) {
                                if (!sg) continue;
                                sg.signatoryIdAttachment = await z(sg.signatoryIdAttachment, 'signatory_id');
                                sg.signatoryPassportAttachment = await z(sg.signatoryPassportAttachment, 'signatory_passport');
                            }
                        }
                    }
                    addressBookEntries = entries;
                    localStorage.setItem('bhd_address_book', JSON.stringify(entries));
                }
            }
            await syncBhdKvToServer();
            if (st) {
                st.textContent = t(
                    `تم ترحيل ${migrated} مرفق. فشل/تخطي: ${failed}`,
                    `Migrated ${migrated} attachment(s). Failed/skipped: ${failed}`
                );
            }
            alert(
                t(
                    `اكتمل الترحيل — ${migrated} مرفق على القرص.`,
                    `Migration complete — ${migrated} attachment(s) on disk.`
                )
            );
        } catch (e) {
            console.error('runMigrateAttachmentsToDisk', e);
            if (st) st.textContent = t('فشل الترحيل.', 'Migration failed.');
            alert(t('فشل ترحيل المرفقات.', 'Attachment migration failed.'));
        }
    }

    async function probeBhdApi() {
        setBhdDbStatus('');
        if (window.bhdDesktop) {
            try {
                const st = await window.bhdDesktop.syncGetStatus();
                bhdApiAvailable = !!(st && st.dbOpen);
                console.debug('[BHD] persistence ready', { backend: 'desktop', dbOpen: bhdApiAvailable });
                updateBhdStorageMgmtButtonsVisibility();
            } catch (e) {
                bhdApiAvailable = false;
                console.warn('[BHD] persistence probe failed', e);
                updateBhdStorageMgmtButtonsVisibility();
            }
            return;
        }
        try {
            const r = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
            bhdApiAvailable = r.ok;
            console.debug('[BHD] persistence ready', { backend: 'kv-server', ok: bhdApiAvailable });
        } catch (e) {
            bhdApiAvailable = false;
            console.debug('[BHD] persistence ready', { backend: 'browser' });
        }
        updateBhdStorageMgmtButtonsVisibility();
    }

