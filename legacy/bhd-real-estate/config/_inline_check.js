
    // ======================== البيانات الكاملة ========================
    let currentDoc = 0;
    
    // قوائم المباني والملاك
    const buildingsList = [
        "Azaiba Plot 54, Building 65",
        "Barka Plot 1248, Building 999",
        "MQ Plot 36, Building 2645",
        "Azaiba Plot 170, Building 638",
        "Azaiba Plot 108, Building 449",
        "Al Khuwair Plot 410, Building 88",
        "Darsait Plot 109, Building 536",
        "Ghubrah Plot 160/2, Building 1114",
        "Ghubrah Plot 160/3, Building 1116",
        "Ghubrah Plot 840, Building 225",
        "Ghubrah Plot 1608, Building 7100",
        "Mabella Plot 11, Building 75",
        "Ruwi Plot 381, Building 37",
        "Ruwi Plot 140, Building 771",
        "Ali Salim Properties - Various",
        "Wafa Ali Salim Villa",
        "Zakat FLAT 506 BUILDING 1440",
        "Mabella Plot 3, Building 180",
        "MQ Plot 369, Building 5240"
    ];
    
    // قائمة الملاك
    const ownersList = [
        "سيد فياض بن علي - Syed Fayyaz ali",
        "هناء بنت سيد فياض - Hana Syed Fayyaz",
        "علي بن سالم السناني - Ali Salim Al Sinani",
        "أحمد بن هاشل المسكري - Ahmad Hashil Al Muskri",
        "سيد فياض و عبد القادر - Syed Fayyad & Abdul Qader",
        "وفاء بنت علي بن سالم السناني - Wafa Ali Salim Al Sinani",
        "زكية بنت محمد بن خميس الزدجالي - Zakat Muhammad Khamis Al-Zadjali",
        "محمد بن سيد فياض - Mohammad Syed Fayyaz",
        "حسين بن علي السناني - Husin Ali Al Sinani"
    ];
    
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
        if (m === 'dashboard') return 'dashboard';
        try {
            const s = sessionStorage.getItem('sfg_ui_last_mode');
            if (s === 'contracts' || s === 'reservations' || s === 'forms' || s === 'users' || s === 'addressbook' || s === 'dashboard') return s;
        } catch (e) {}
        return 'dashboard';
    })();
    let appUiLanguage = localStorage.getItem('sfg_ui_language') === 'en' ? 'en' : 'ar';
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

    const unitsDataset = [
        { building: "MQ Plot 369, Building 5240", unit: "301", floor: "Third Floor", unitType: "Flat", status: "Rented", tenant: "Ljina Sultan Sulaiman AlMahrouqi", mobile: "91707091", agreementNo: "20241115892", monthlyRent: 325, startDate: "2025-12-01", endDate: "2026-11-30", electricity: "Q137673", water: "90517548" },
        { building: "Azaiba Plot 170, Building 638", unit: "21", floor: "2nd Floor", unitType: "Flat", status: "Rented", tenant: "AL-haider", mobile: "99331998", agreementNo: "638-2025-21", monthlyRent: 250, startDate: "2025-05-01", endDate: "2026-04-30", electricity: "Q79552", water: "D62196" },
        { building: "Barka Plot 1248, Building 999", unit: "FF-3", floor: "1st Floor", unitType: "Office", status: "Vacant", tenant: "", mobile: "", agreementNo: "", monthlyRent: 0, startDate: "", endDate: "", electricity: "", water: "" },
        { building: "Mabella Plot 11, Building 75", unit: "41", floor: "4th Floor", unitType: "Flat", status: "Vacant", tenant: "", mobile: "", agreementNo: "", monthlyRent: 150, startDate: "", endDate: "", electricity: "S123370", water: "E78422" },
        { building: "Darsait Plot 109, Building 536", unit: "22", floor: "1 Floor", unitType: "Flat", status: "Rented", tenant: "Faiyazur Rahman", mobile: "76786889", agreementNo: "536-2025-22", monthlyRent: 190, startDate: "2025-05-01", endDate: "2026-04-30", electricity: "T17899", water: "C34165" },
        { building: "Mabella Plot 3, Building 180", unit: "A-201", floor: "2nd Floor", unitType: "Flat", status: "Rented", tenant: "Tenant Pending Renewal", mobile: "90000000", agreementNo: "180-2025-201", monthlyRent: 260, startDate: "2025-06-01", endDate: "2026-05-31", electricity: "M180E201", water: "M180W201" }
    ];
    let importedUnitsData = [];
    let addressBookEntries = [];
    let fileRegistry = [];
    /** حجوزات وطلبات إخلاء وربط ملاك — تُحفظ محلياً */
    let unitReservations = [];
    let evictionRequests = [];
    let ownerBuildingMap = {};
    let buildingProfiles = {};
    let buildingProfilesShadow = {};
    let ownerProfiles = {};
    let managedUnitsData = [];
    let buildingEditorState = { open: false, originalName: '' };
    let ownerEditorState = { open: false, originalName: '' };
    let insightNavStack = [];
    let insightFilterState = {};
    let insightFilterPanelOpen = {};
    let insightImportExportOpen = {};
    let selectedTenantExcelFile = null;
    let selectedEwtExcelFile = null;
    let selectedUnitDetailsRecord = null;
    let contractEntryContext = { mode: 'contract', unit: null };
    /** استكمال مسودة عقد بعد الحجز — قفل المالك/المستأجر/الوحدة حتى الحفظ النهائي */
    let tenancyDraftCompletionLocked = false;
    let contractDataGapFixes = [];
    let addressBookEditorState = { mode: 'view', index: -1 };
    let addressBookSortState = { key: 'contact', dir: 'asc' };
    const operationsSortState = { key: 'days', dir: 'asc' };

    /** مستخدمون وصلاحيات — محلياً (لا يُعتمد عليها وحده للأمان في بيئة الإنترنت) */
    let usersRegistry = [];
    let authSession = null;
    let usersEditorState = { editingId: '' };

    const SFG_PERMISSION_DEFS = [
        { key: 'manage_dashboard', labelAr: 'لوحة المعلومات', labelEn: 'Dashboard' },
        { key: 'manage_properties', labelAr: 'العقارات والمباني', labelEn: 'Properties & buildings' },
        { key: 'manage_owners', labelAr: 'الملاك', labelEn: 'Owners' },
        { key: 'manage_contracts', labelAr: 'العقود والمستندات', labelEn: 'Contracts & documents' },
        { key: 'import_export', labelAr: 'استيراد/تصدير البيانات', labelEn: 'Import / export data' },
        { key: 'manage_users', labelAr: 'إدارة المستخدمين', labelEn: 'User management' }
    ];

    function defaultPermissionsAllOn() {
        return SFG_PERMISSION_DEFS.reduce((acc, p) => {
            acc[p.key] = true;
            return acc;
        }, {});
    }

    /** مزامنة مع الخادم المحلي (SQLite) عند فتح الصفحة عبر http://localhost:3789 */
    const SFG_KV_KEYS = [
        'sfg_contract_full',
        'sfg_tenancy_contract_drafts',
        'sfg_tenancy_draft_cancellations',
        'sfg_buildings_list',
        'sfg_owners_list',
        'sfg_address_book',
        'sfg_file_registry',
        'sfg_theme_mode',
        'sfg_unit_reservations',
        'sfg_eviction_requests',
        'sfg_owner_building_map',
        'sfg_building_profiles',
        'sfg_owner_profiles',
        'sfg_managed_units',
        'sfg_users_registry',
        'sfg_auth_session'
    ];
    let sfgApiAvailable = false;
    const SFG_LOCAL_DB_NAME = 'sfg_local_db_v1';
    const SFG_LOCAL_DB_STORE = 'kv';

    function setSfgDbStatus(text) {
        const el = document.getElementById('sfgDbStatus');
        if (el) el.textContent = text || '';
    }

    function openSfgLocalDb() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB not supported'));
                return;
            }
            const req = indexedDB.open(SFG_LOCAL_DB_NAME, 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(SFG_LOCAL_DB_STORE)) {
                    db.createObjectStore(SFG_LOCAL_DB_STORE, { keyPath: 'key' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
        });
    }

    async function mirrorKvFromLocalStorageToIndexedDb() {
        try {
            const db = await openSfgLocalDb();
            await new Promise((resolve, reject) => {
                const tx = db.transaction(SFG_LOCAL_DB_STORE, 'readwrite');
                const store = tx.objectStore(SFG_LOCAL_DB_STORE);
                SFG_KV_KEYS.forEach((k) => {
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
        try {
            const db = await openSfgLocalDb();
            const rows = await new Promise((resolve, reject) => {
                const tx = db.transaction(SFG_LOCAL_DB_STORE, 'readonly');
                const store = tx.objectStore(SFG_LOCAL_DB_STORE);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error || new Error('IndexedDB read failed'));
            });
            db.close();
            let any = false;
            rows.forEach((row) => {
                const key = toStr(row?.key);
                const value = typeof row?.value === 'string' ? row.value : '';
                if (key && SFG_KV_KEYS.includes(key)) {
                    // Never overwrite existing localStorage on startup.
                    // IndexedDB is used here only as fallback for missing keys.
                    if (localStorage.getItem(key) === null) {
                        localStorage.setItem(key, value);
                        any = true;
                    }
                }
            });
            return any;
        } catch (e) {
            console.warn('hydrateLocalStorageFromIndexedDb failed', e);
            return false;
        }
    }

    async function probeSfgApi() {
        try {
            const r = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
            sfgApiAvailable = r.ok;
            setSfgDbStatus(sfgApiAvailable ? '🗄️ متصل بقاعدة البيانات المحلية' : '');
        } catch (e) {
            sfgApiAvailable = false;
            setSfgDbStatus('');
        }
    }

    async function syncSfgKvToServer() {
        await mirrorKvFromLocalStorageToIndexedDb();
        if (!sfgApiAvailable) return;
        try {
            const payload = {};
            SFG_KV_KEYS.forEach((k) => {
                const v = localStorage.getItem(k);
                if (v !== null) payload[k] = v;
            });
            await fetch('/api/kv/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.warn('syncSfgKvToServer failed', e);
        }
    }

    async function pullSfgKvFromServer() {
        if (!sfgApiAvailable) return false;
        try {
            const r = await fetch('/api/kv?prefix=sfg_', { cache: 'no-store' });
            if (!r.ok) return false;
            const all = await r.json();
            let any = false;
            Object.keys(all).forEach((k) => {
                if (SFG_KV_KEYS.includes(k) && typeof all[k] === 'string') {
                    localStorage.setItem(k, all[k]);
                    any = true;
                }
            });
            await mirrorKvFromLocalStorageToIndexedDb();
            return any;
        } catch (e) {
            console.warn('pullSfgKvFromServer failed', e);
            return false;
        }
    }

    function toStr(v) {
        if (v === null || v === undefined) return '';
        return String(v).trim();
    }

    function normalizeUnit(u) {
        return toStr(u).replace(/\s+/g, '').replace(/[-_]/g, '').toUpperCase();
    }

    function normalizeDate(value) {
        if (!value && value !== 0) return '';
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value.toISOString().slice(0, 10);
        }
        if (typeof value === 'number') {
            const parsed = XLSX.SSF.parse_date_code(value);
            if (parsed) {
                const d = new Date(parsed.y, parsed.m - 1, parsed.d);
                return d.toISOString().slice(0, 10);
            }
        }
        const txt = toStr(value);
        const d = new Date(txt);
        if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        return '';
    }

    function detectColumnIndex(headers, aliases) {
        const normalized = headers.map((h) => toStr(h).toLowerCase());
        for (const alias of aliases) {
            const idx = normalized.findIndex((h) => h.includes(alias));
            if (idx >= 0) return idx;
        }
        return -1;
    }

    function readWorkbook(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                    resolve(wb);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    function parseTenantWorkbook(workbook) {
        const records = [];
        workbook.SheetNames.forEach((sheetName) => {
            const ws = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (!rows.length) return;

            let currentBuilding = sheetName;
            for (let i = 0; i < rows.length; i++) {
                const headers = rows[i].map(toStr);
                const pIdx = headers.findIndex((c) => c.toLowerCase() === 'property:' || c.toLowerCase() === 'property');
                if (pIdx >= 0 && headers[pIdx + 1]) {
                    currentBuilding = headers[pIdx + 1];
                }
                const unitIdx = detectColumnIndex(headers, ['flat no', 'unit no', 'unit', 's.no', 'رقم الشقة', 'الوحدة']);
                const tenantIdx = detectColumnIndex(headers, ['tenant name', 'tenant', 'name', 'اسم المستأجر', 'المستأجر']);
                const endIdx = detectColumnIndex(headers, ['end date', 'to', 'تاريخ النهاية', 'ينتهي']);
                const statusIdx = detectColumnIndex(headers, ['status', 'الحالة']);
                const mobileIdx = detectColumnIndex(headers, ['contact no', 'mobile', 'رقم النقال', 'رقم الجوال']);
                const tenantEnIdx = detectColumnIndex(headers, ['tenant name en', 'english name']);
                const civilIdx = detectColumnIndex(headers, ['civil card', 'civil no', 'id', 'الرقم المدني']);
                const rentIdx = detectColumnIndex(headers, ['rent amount', 'agreement  rent', 'agreement rent', 'monthly rent', 'الإيجار']);
                const agreementRentIdx = detectColumnIndex(headers, ['agreement rent', 'agreement  rent']);
                const startIdx = detectColumnIndex(headers, ['start date', 'from', 'تاريخ البداية', 'يبدأ']);
                const elecIdx = detectColumnIndex(headers, ['electricity account no', 'electricity account', 'electric a/c', 'electricity', 'عداد الكهرباء']);
                const elecReadingIdx = detectColumnIndex(headers, ['electricity reading', 'قراءة الكهرباء']);
                const waterIdx = detectColumnIndex(headers, ['water account no', 'water account', 'water a/c', 'water', 'عداد الماء']);
                const waterReadingIdx = detectColumnIndex(headers, ['water reading', 'قراءة الماء']);
                const floorIdx = detectColumnIndex(headers, ['floor details', 'floor', 'الطابق']);
                const unitDetailsIdx = detectColumnIndex(headers, ['unit details', 'type', 'نوع الوحدة']);
                const remainingIdx = detectColumnIndex(headers, ['remaining days', 'متبقي']);
                const monthsLeftIdx = detectColumnIndex(headers, ['months left', 'الشهور المتبقية']);
                const evacuationIdx = detectColumnIndex(headers, ['evacuation date', 'تاريخ الاخلاء']);
                const remarksIdx = detectColumnIndex(headers, ['remarks', 'ملاحظات']);
                if (unitIdx === -1) continue;

                let emptyStreak = 0;
                let lastDataRow = i;
                for (let r = i + 1; r < rows.length; r++) {
                    const row = rows[r].map(toStr);
                    const rowPropertyIdx = row.findIndex((c) => c.toLowerCase() === 'property:' || c.toLowerCase() === 'property');
                    if (rowPropertyIdx >= 0) break;

                    const possibleHeader = detectColumnIndex(row, ['tenant name', 'status', 'end date', 'اسم المستأجر', 'تاريخ النهاية']) !== -1
                        && detectColumnIndex(row, ['unit', 's.no', 'flat no', 'رقم الشقة']) !== -1;
                    if (possibleHeader) break;

                    const unit = toStr(row[unitIdx]);
                    const tenant = tenantIdx >= 0 ? toStr(row[tenantIdx]) : '';
                    const endDate = endIdx >= 0 ? normalizeDate(row[endIdx]) : '';
                    const startDate = startIdx >= 0 ? normalizeDate(row[startIdx]) : '';
                    const status = statusIdx >= 0 ? toStr(row[statusIdx]) : '';
                    if (!unit && !tenant && !endDate && !startDate) {
                        emptyStreak += 1;
                        if (emptyStreak >= 3) break;
                        continue;
                    }
                    emptyStreak = 0;
                    if (!unit) continue;
                    if (unit.toLowerCase().includes('total') || unit === 'S.No' || unit === 'Sr.') continue;
                    records.push({
                        serialNo: unit,
                        building: currentBuilding,
                        unit,
                        floor: floorIdx >= 0 ? toStr(row[floorIdx]) : '',
                        unitType: unitDetailsIdx >= 0 ? toStr(row[unitDetailsIdx]) : '',
                        status: status || (tenant ? 'Rented' : 'Vacant'),
                        tenant,
                        tenantEn: tenantEnIdx >= 0 ? toStr(row[tenantEnIdx]) : '',
                        civilCard: civilIdx >= 0 ? toStr(row[civilIdx]) : '',
                        contactNo: mobileIdx >= 0 ? toStr(row[mobileIdx]) : '',
                        mobile: mobileIdx >= 0 ? toStr(row[mobileIdx]) : '',
                        agreementNo: '',
                        monthlyRent: rentIdx >= 0 ? (parseFloat(toStr(row[rentIdx]).replace(/[^\d.]/g, '')) || 0) : 0,
                        agreementRent: agreementRentIdx >= 0 ? (parseFloat(toStr(row[agreementRentIdx]).replace(/[^\d.]/g, '')) || 0) : 0,
                        startDate,
                        endDate,
                        remainingDays: remainingIdx >= 0 ? toStr(row[remainingIdx]) : '',
                        monthsLeft: monthsLeftIdx >= 0 ? toStr(row[monthsLeftIdx]) : '',
                        evacuationDate: evacuationIdx >= 0 ? normalizeDate(row[evacuationIdx]) : '',
                        electricity: elecIdx >= 0 ? toStr(row[elecIdx]) : '',
                        electricityReading: elecReadingIdx >= 0 ? toStr(row[elecReadingIdx]) : '',
                        water: waterIdx >= 0 ? toStr(row[waterIdx]) : '',
                        waterReading: waterReadingIdx >= 0 ? toStr(row[waterReadingIdx]) : '',
                        remarks: remarksIdx >= 0 ? toStr(row[remarksIdx]) : ''
                    });
                    lastDataRow = r;
                }
                i = Math.max(i, lastDataRow);
            }
        });

        // إزالة التكرار على مستوى (المبنى + الوحدة) مع تفضيل الصف الأكثر اكتمالاً
        const dedupMap = new Map();
        records.forEach((rec) => {
            const key = `${toStr(rec.building)}::${normalizeUnit(rec.unit)}`;
            const prev = dedupMap.get(key);
            if (!prev) {
                dedupMap.set(key, rec);
                return;
            }
            const score = (x) => [x.tenant, x.startDate, x.endDate, x.electricity, x.water].filter(Boolean).length;
            if (score(rec) >= score(prev)) {
                dedupMap.set(key, rec);
            }
        });
        return [...dedupMap.values()];
    }

    function parseEwtWorkbook(workbook) {
        const map = new Map();
        workbook.SheetNames.forEach((sheetName) => {
            const ws = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (!rows.length) return;
            for (let i = 0; i < rows.length; i++) {
                const headers = rows[i].map(toStr);
                const unitIdx = detectColumnIndex(headers, ['unit', 'flat no']);
                const elecIdx = detectColumnIndex(headers, ['electricity', 'electric a/c', 'electric account']);
                const waterIdx = detectColumnIndex(headers, ['water', 'water a/c', 'water account']);
                if (unitIdx === -1 || (elecIdx === -1 && waterIdx === -1)) continue;

                for (let r = i + 1; r < rows.length; r++) {
                    const row = rows[r];
                    const unit = toStr(row[unitIdx]);
                    if (!unit) continue;
                    const key = `${sheetName}::${normalizeUnit(unit)}`;
                    map.set(key, {
                        building: sheetName,
                        unit,
                        electricity: elecIdx >= 0 ? toStr(row[elecIdx]) : '',
                        water: waterIdx >= 0 ? toStr(row[waterIdx]) : ''
                    });
                }
                break;
            }
        });
        return map;
    }

    async function importExcelData() {
        if (typeof XLSX === 'undefined') {
            alert('⚠️ مكتبة Excel غير متاحة حالياً. تأكد من الاتصال بالإنترنت أو أعد تحميل الصفحة.');
            return;
        }
        const tenantInput = document.getElementById('tenantExcelInput');
        const ewtInput = document.getElementById('ewtExcelInput');
        const tenantFile = selectedTenantExcelFile || tenantInput?.files?.item(0) || null;
        const ewtFile = selectedEwtExcelFile || ewtInput?.files?.item(0) || null;
        if (!tenantFile) {
            if (tenantInput) tenantInput.click();
            alert('⚠️ يرجى اختيار ملف Tenant Details.xlsx أولاً (تم فتح نافذة اختيار الملف).');
            return;
        }
        try {
            const tenantWb = await readWorkbook(tenantFile);
            const tenantRecords = parseTenantWorkbook(tenantWb);

            if (ewtFile) {
                const ewtWb = await readWorkbook(ewtFile);
                const ewtMap = parseEwtWorkbook(ewtWb);
                importedUnitsData = tenantRecords.map((rec) => {
                    const keyBySheet = `${rec.building}::${normalizeUnit(rec.unit)}`;
                    const meter = ewtMap.get(keyBySheet);
                    return {
                        ...rec,
                        electricity: rec.electricity || meter?.electricity || '',
                        water: rec.water || meter?.water || ''
                    };
                });
            } else {
                importedUnitsData = tenantRecords;
            }
            renderOperationsTable();
            refreshAddressBookFromSystem(false);
            alert(`✅ تم استيراد بيانات Tenant Details بنجاح. عدد الوحدات المستوردة: ${importedUnitsData.length}${ewtFile ? '' : ' (بدون دمج E.W.T)'}`);
        } catch (err) {
            console.error('Excel import failed:', err);
            alert('❌ فشل في قراءة ملفات Excel. تأكد من اختيار الملفات الصحيحة.');
        }
    }

    function clearImportedData() {
        importedUnitsData = [];
        renderOperationsTable();
        refreshAddressBookFromSystem(false);
        alert('🧹 تم مسح البيانات المستوردة والعودة للبيانات الأساسية.');
    }

    /** صف Excel موحّد للوحدات (نفس أعمدة ملف النظام) / Unified unit row for Excel */
    function buildSystemExcelRowFromUnit(u) {
        return {
            FloorDetail: u.floor || '',
            SerialNo: u.serialNo || '',
            Building: u.building || '',
            OwnerNames: u.ownerNames || formatOwnerNamesForBuilding(u.building) || '',
            Unit: u.unit || '',
            UnitType: u.unitType || '',
            Status: u.status || '',
            Tenant: u.tenant || '',
            TenantEn: u.tenantEn || '',
            CivilCard: u.civilCard || '',
            ContactNo: u.contactNo || u.mobile || '',
            Mobile: u.mobile || '',
            RentAmount: u.monthlyRent || 0,
            AgreementRent: u.agreementRent || u.monthlyRent || 0,
            AgreementNo: u.agreementNo || '',
            MonthlyRent: u.monthlyRent || 0,
            StartDate: u.startDate || '',
            EndDate: u.endDate || '',
            RemainingDays: u.remainingDays || '',
            MonthsLeft: u.monthsLeft || '',
            EvacuationDate: u.evacuationDate || '',
            Electricity: u.electricity || '',
            ElectricityReading: u.electricityReading || '',
            Water: u.water || '',
            WaterReading: u.waterReading || '',
            Remarks: u.remarks || ''
        };
    }

    function excelRowPick(r, shortEn, needles) {
        if (!r || typeof r !== 'object') return '';
        if (r[shortEn] !== undefined && toStr(r[shortEn]) !== '') return r[shortEn];
        const keys = Object.keys(r);
        for (const n of needles) {
            const k = keys.find((x) => x.replace(/\s+/g, ' ').includes(n));
            if (k !== undefined && toStr(r[k]) !== '') return r[k];
        }
        return '';
    }

    function unitRecordFromSystemExcelRow(r) {
        const n = (en, fr) => toStr(excelRowPick(r, en, fr));
        const num = (en, fr) => parseFloat(toStr(excelRowPick(r, en, fr)).replace(/[^\d.]/g, '')) || 0;
        return {
            serialNo: n('SerialNo', ['مسلسل', 'Serial']) || n('S.No', ['S.No']),
            building: n('Building', ['المبنى']),
            unit: n('Unit', ['الوحدة']),
            floor: n('FloorDetail', ['الطابق', 'Floor']) || n('Floor', ['Floor']),
            unitType: n('UnitType', ['نوع الوحدة', 'Unit type']),
            status: n('Status', ['الحالة']) || 'Rented',
            tenant: n('Tenant', ['المستأجر']),
            tenantEn: n('TenantEn', ['Tenant EN', 'إنجليزي']),
            civilCard: n('CivilCard', ['مدنية', 'Civil']) || n('CivilCardId', []),
            contactNo: n('ContactNo', ['جوال', 'Contact']) || n('Mobile', ['موبايل', 'Mobile']),
            mobile: n('Mobile', ['موبايل', 'Mobile']) || n('ContactNo', ['Contact']),
            agreementNo: n('AgreementNo', ['رقم العقد', 'Agreement']),
            rentAmount: num('RentAmount', ['مبلغ الإيجار', 'Rent amount']),
            monthlyRent: num('MonthlyRent', ['الإيجار الشهري', 'Monthly']),
            agreementRent: num('AgreementRent', ['اتفاقية', 'Agreement rent']),
            startDate: normalizeDate(excelRowPick(r, 'StartDate', ['البداية', 'Start date', 'Start'])),
            endDate: normalizeDate(excelRowPick(r, 'EndDate', ['الانتهاء', 'End date', 'End'])),
            remainingDays: n('RemainingDays', ['متبقية', 'Remaining']),
            monthsLeft: n('MonthsLeft', ['أشهر', 'Months']),
            evacuationDate: normalizeDate(excelRowPick(r, 'EvacuationDate', ['إخلاء', 'Evacuation'])),
            electricity: n('Electricity', ['كهرباء']),
            electricityReading: n('ElectricityReading', ['قراءة كهرباء']),
            water: n('Water', ['ماء', 'Water']),
            waterReading: n('WaterReading', ['قراءة ماء']),
            remarks: n('Remarks', ['ملاحظات', 'Remarks'])
        };
    }

    function mergeContractUnitRecordsIntoImported(incoming) {
        const keyOf = (u) => `${toStr(u.building)}\u0001${normalizeUnit(u.unit)}`;
        const map = new Map();
        importedUnitsData.forEach((u) => map.set(keyOf(u), { ...u }));
        incoming.forEach((u) => {
            const k = keyOf(u);
            map.set(k, { ...(map.get(k) || {}), ...u });
        });
        importedUnitsData = [...map.values()];
    }

    function sanitizeBuildingProfileForExport(profile) {
        if (!profile || typeof profile !== 'object') return profile;
        try {
            const p = JSON.parse(JSON.stringify(profile));
            const trimAtt = (a) => {
                if (!a || typeof a !== 'object') return a;
                const o = { ...a };
                if (o.dataUrl && String(o.dataUrl).length > 80) {
                    o.dataUrl = '';
                    o._exportNoteAr = 'تم حذف الملف الثنائي من التصدير — أعد الرفع من شاشة العقار';
                    o._exportNoteEn = 'Binary omitted in export — re-upload from property screen';
                }
                return o;
            };
            p.titleDeedAttachment = trimAtt(p.titleDeedAttachment);
            p.surveySketchAttachment = trimAtt(p.surveySketchAttachment);
            return p;
        } catch (e) {
            return profile;
        }
    }

    function buildingAttachmentExcelName(att) {
        const a = normalizeBuildingAttachment(att);
        return a ? toStr(a.name) : '';
    }

    function buildingProfileToExcelMainRow(buildingKey, profile) {
        const p = profile || {};
        const label = makeBuildingLabel(p) || buildingKey;
        const owners = getOwnerNamesForBuilding(label).join('؛ ');
        return {
            'مفتاح السجل / Record key': buildingKey,
            'اسم العقار / Property name': toStr(p.name || label),
            'نوع المبنى / Building type': toStr(p.buildingType),
            'رقم المبنى / Building no.': toStr(p.buildingNo),
            'رقم القطعة / Plot no.': toStr(p.plotNo),
            'رقم المجمع / Complex no.': toStr(p.complexNo),
            'نوع استعمال الأرض / Land use': toStr(p.landUse),
            'سند الملكية — اسم الملف / Title deed — file name': buildingAttachmentExcelName(p.titleDeedAttachment),
            'الرسم المساحي — اسم الملف / Survey sketch — file name': buildingAttachmentExcelName(p.surveySketchAttachment),
            'رابط خرائط جوجل / Google Maps URL': toStr(p.googleMapsUrl),
            'عداد الكهرباء / Electricity meter': toStr(p.electricityMeter),
            'عداد الماء / Water meter': toStr(p.waterMeter),
            'رقم الإنترنت / Internet no.': toStr(p.internetNo),
            'عداد ماء الحريق / Fire water meter': toStr(p.fireWaterMeter),
            'عداد كهرباء الحريق / Fire electricity meter': toStr(p.fireElectricityMeter),
            'رقم السكة أو الزقاق / Way no.': toStr(p.wayNo),
            'رقم الرسم المساحي (الكروكي) / Sketch no.': toStr(p.sketchNo),
            'المحافظة / Governorate': toStr(p.governorate),
            'الولاية / Wilayat': toStr(p.wilayat),
            'المنطقة / Area': toStr(p.area),
            'عدد الطوابق / Floor count': p.floorCount != null && p.floorCount !== '' ? p.floorCount : (Array.isArray(p.floors) ? p.floors.length : ''),
            'ملاك مرتبطون / Linked owners (؛)': owners,
            'أنشئ في / Created at': toStr(p.createdAt),
            'عُدّل في / Updated at': toStr(p.updatedAt),
            'أنشئ بواسطة / Created by': toStr(p.createdBy),
            'عُدّل بواسطة / Updated by': toStr(p.updatedBy)
        };
    }

    function flattenFloorsSheetRows(buildingKey, profile) {
        const floors = Array.isArray(profile.floors) ? profile.floors : [];
        return floors.map((f, idx) => ({
            'مفتاح السجل / Record key': buildingKey,
            'رقم الطابق / Floor # (1…n)': idx + 1,
            'اسم الطابق / Floor name': toStr(f.name),
            'عدد الوحدات / Unit count': f.unitCount != null ? f.unitCount : ((f.unitsDetailed || []).length),
            'أنواع الوحدات (مفصولة بفاصلة) / Unit types (comma)': (Array.isArray(f.selectedTypes) ? f.selectedTypes : []).join(', ')
        }));
    }

    function flattenFloorUnitsSheetRows(buildingKey, profile) {
        const out = [];
        const floors = Array.isArray(profile.floors) ? profile.floors : [];
        floors.forEach((f, fi) => {
            const detailed = Array.isArray(f.unitsDetailed) ? f.unitsDetailed : [];
            detailed.forEach((u) => {
                out.push({
                    'مفتاح السجل / Record key': buildingKey,
                    'رقم الطابق / Floor # (1…n)': fi + 1,
                    'رقم الوحدة / Unit no.': toStr(u.number),
                    'نوع الوحدة / Unit type': toStr(u.type) || 'Flat',
                    'عداد كهرباء الوحدة / Unit electricity ID': toStr(u.electricity),
                    'عداد ماء الوحدة / Unit water ID': toStr(u.water)
                });
            });
        });
        return out;
    }

    function excelPickRowField(row, needles) {
        const keys = Object.keys(row || {});
        for (const n of needles) {
            const k = keys.find((x) => x.replace(/\s+/g, ' ').includes(n));
            if (k !== undefined) return row[k];
        }
        return '';
    }

    function parseExcelOwnerList(text) {
        return toStr(text)
            .split(/[؛;,،\n\r]+/)
            .map((x) => toStr(x).trim())
            .filter(Boolean);
    }

    function applyExcelLinkedOwnersForBuilding(buildingName, ownerNames) {
        const b = toStr(buildingName);
        if (!b) return;
        ownerNames.forEach((owner) => {
            if (!ownersList.includes(owner)) ownersList.push(owner);
            if (!ownerBuildingMap[owner]) ownerBuildingMap[owner] = [];
            if (!ownerBuildingMap[owner].includes(b)) ownerBuildingMap[owner].push(b);
        });
    }

    function buildingProfileFromExcelSheets(mainRow, floorRowsByKey, unitRowsByKeyFloor) {
        const rk = toStr(excelPickRowField(mainRow, ['مفتاح السجل', 'Record key']));
        const name = toStr(excelPickRowField(mainRow, ['اسم العقار', 'Property name'])) || rk;
        const prev = buildingProfiles[rk] || buildingProfiles[name] || {};
        const profile = {
            ...getEmptyBuildingProfile(),
            ...prev,
            name,
            buildingType: toStr(excelPickRowField(mainRow, ['نوع المبنى', 'Building type'])) || 'متعدد الطوابق',
            buildingNo: toStr(excelPickRowField(mainRow, ['رقم المبنى', 'Building no'])),
            plotNo: toStr(excelPickRowField(mainRow, ['رقم القطعة', 'Plot no'])),
            complexNo: toStr(excelPickRowField(mainRow, ['رقم المجمع', 'Complex no'])),
            landUse: toStr(excelPickRowField(mainRow, ['نوع استعمال', 'Land use'])),
            googleMapsUrl: toStr(excelPickRowField(mainRow, ['خرائط جوجل', 'Google Maps', 'maps.google'])),
            electricityMeter: toStr(excelPickRowField(mainRow, ['عداد الكهرباء', 'Electricity meter'])),
            waterMeter: toStr(excelPickRowField(mainRow, ['عداد الماء', 'Water meter'])),
            internetNo: toStr(excelPickRowField(mainRow, ['الإنترنت', 'Internet no'])),
            fireWaterMeter: toStr(excelPickRowField(mainRow, ['ماء الحريق', 'Fire water'])),
            fireElectricityMeter: toStr(excelPickRowField(mainRow, ['كهرباء الحريق', 'Fire electricity'])),
            wayNo: toStr(excelPickRowField(mainRow, ['السكة', 'الزقاق', 'Way no'])),
            sketchNo: toStr(excelPickRowField(mainRow, ['الرسم المساحي', 'Sketch no'])),
            governorate: toStr(excelPickRowField(mainRow, ['المحافظة', 'Governorate'])),
            wilayat: toStr(excelPickRowField(mainRow, ['الولاية', 'Wilayat'])),
            area: toStr(excelPickRowField(mainRow, ['المنطقة', 'Area']))
        };
        const fcStr = toStr(excelPickRowField(mainRow, ['عدد الطوابق', 'Floor count']));
        const fcNum = parseInt(fcStr.replace(/[^\d]/g, ''), 10);
        profile.floorCount = !Number.isNaN(fcNum) && fcStr ? fcNum : 0;

        const fRows = floorRowsByKey[rk] || [];
        const uMap = unitRowsByKeyFloor[rk] || {};
        const maxFloorFromSheets = Math.max(
            0,
            ...fRows.map((r) => parseInt(toStr(excelPickRowField(r, ['رقم الطابق', 'Floor #'])).replace(/[^\d]/g, ''), 10) || 0),
            ...Object.keys(uMap).map((k) => parseInt(k, 10) || 0)
        );
        const floorCount = Math.max(profile.floorCount || 0, maxFloorFromSheets, fRows.length);

        const floors = [];
        for (let i = 0; i < floorCount; i++) {
            const fi = i + 1;
            const fr = fRows.find((r) => {
                const n = parseInt(toStr(excelPickRowField(r, ['رقم الطابق', 'Floor #'])).replace(/[^\d]/g, ''), 10);
                return n === fi;
            }) || {};
            const fname = toStr(excelPickRowField(fr, ['اسم الطابق', 'Floor name'])) || (i === 0 ? 'الطابق الأرضي' : `الطابق ${fi}`);
            const typesStr = toStr(excelPickRowField(fr, ['أنواع الوحدات', 'Unit types']));
            const selectedTypes = typesStr
                ? typesStr.split(/[,،]/).map((x) => toStr(x).trim()).filter(Boolean)
                : ['Flat'];
            const unitLines = uMap[String(fi)] || uMap[fi] || [];
            const unitsDetailed = unitLines.map((ur) => ({
                number: toStr(excelPickRowField(ur, ['رقم الوحدة', 'Unit no'])),
                type: toStr(excelPickRowField(ur, ['نوع الوحدة', 'Unit type'])) || selectedTypes[0] || 'Flat',
                electricity: toStr(excelPickRowField(ur, ['كهرباء الوحدة', 'Unit electricity'])),
                water: toStr(excelPickRowField(ur, ['ماء الوحدة', 'Unit water']))
            })).filter((x) => x.number);
            const uc = parseInt(toStr(excelPickRowField(fr, ['عدد الوحدات', 'Unit count'])), 10);
            floors.push(
                normalizeFloorData(
                    {
                        name: fname,
                        selectedTypes: selectedTypes.length ? selectedTypes : ['Flat'],
                        unitCount: !Number.isNaN(uc) && uc ? uc : unitsDetailed.length,
                        units: unitsDetailed.map((x) => x.number),
                        unitsDetailed
                    },
                    i
                )
            );
        }
        profile.floors = floors;
        profile.floorCount = floors.length;
        const tdName = toStr(excelPickRowField(mainRow, ['سند الملكية', 'Title deed']));
        const svName = toStr(excelPickRowField(mainRow, ['الرسم المساحي', 'Survey sketch']));
        if (tdName && (!profile.titleDeedAttachment || !normalizeBuildingAttachment(profile.titleDeedAttachment).dataUrl)) {
            profile.titleDeedAttachment = { name: tdName, type: '', dataUrl: '' };
        }
        if (svName && (!profile.surveySketchAttachment || !normalizeBuildingAttachment(profile.surveySketchAttachment).dataUrl)) {
            profile.surveySketchAttachment = { name: svName, type: '', dataUrl: '' };
        }
        return { profile, recordKey: rk, displayName: makeBuildingLabel(profile) || name };
    }

    function importBuildingStructuresFromJsonSheet(rows) {
        rows.forEach((row) => {
            const json = toStr(row.ProfileJSON || row.profileJson || excelPickRowField(row, ['ProfileJSON', 'Profile JSON']));
            if (!json) return;
            let profile;
            try {
                profile = JSON.parse(json);
            } catch (e) {
                return;
            }
            profile.floors = Array.isArray(profile.floors) ? profile.floors.map((f, i) => normalizeFloorData(f, i)) : [];
            const name = makeBuildingLabel(profile) || toStr(row.BuildingKey || row.buildingKey || excelPickRowField(row, ['مفتاح السجل', 'Record key']));
            if (!name) return;
            profile.name = profile.name || name;
            const oldKey = toStr(row.BuildingKey || row.buildingKey);
            if (oldKey && oldKey !== name && buildingProfiles[oldKey]) delete buildingProfiles[oldKey];
            buildingProfiles[name] = profile;
            if (!buildingsList.includes(name)) buildingsList.push(name);
            const ownersStr = excelPickRowField(row, ['ملاك مرتبطون', 'Linked owners']);
            if (ownersStr) applyExcelLinkedOwnersForBuilding(name, parseExcelOwnerList(ownersStr));
        });
    }

    function exportBuildingStructuresExcel() {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية تصدير البيانات.', 'No permission to export data.')) return;
        if (typeof XLSX === 'undefined') {
            alert('⚠️ مكتبة Excel غير متاحة حالياً.\nExcel library is not available.');
            return;
        }
        loadDashboardAux();
        const wb = XLSX.utils.book_new();
        const instructions = [
            {
                'خطوة / Step': '1',
                'وصف عربي / Arabic': 'استخدم ورقة Buildings_Main لحقول العقار الرئيسية (أسماء الأعمدة ثنائية اللغة).',
                'Description English': 'Use Buildings_Main for main property fields (bilingual headers).'
            },
            {
                'خطوة / Step': '2',
                'وصف عربي / Arabic': 'ورقة Floors: طابق واحد لكل سطر مع رقم الطابق واسمه وأنواع الوحدات.',
                'Description English': 'Floors: one row per floor with floor #, name, unit types.'
            },
            {
                'خطوة / Step': '3',
                'وصف عربي / Arabic': 'ورقة FloorUnits: كل وحدة تفصيلية في سطر (رقم الوحدة، النوع، عدادات).',
                'Description English': 'FloorUnits: one row per unit (no., type, meters).'
            },
            {
                'خطوة / Step': '4',
                'وصف عربي / Arabic': 'المرفقات: يُصدَر اسم الملف فقط؛ أعد رفع الملفات من شاشة تعديل العقار بعد الاستيراد.',
                'Description English': 'Attachments: file names only; re-upload from the property editor after import.'
            },
            {
                'خطوة / Step': '5',
                'وصف عربي / Arabic': 'ورقة BuildingProfiles تحتوي JSON كاملاً للنسخ الاحتياطي المتقدم.',
                'Description English': 'BuildingProfiles sheet holds full JSON for advanced backup.'
            }
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instructions), 'Instructions');

        const keys = Object.keys(buildingProfiles).sort((a, b) => a.localeCompare(b, 'ar'));
        const mainRows = keys.map((k) => buildingProfileToExcelMainRow(k, buildingProfiles[k]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mainRows.length ? mainRows : [buildingProfileToExcelMainRow('', getEmptyBuildingProfile())]), 'Buildings_Main');

        const floorRows = keys.flatMap((k) => flattenFloorsSheetRows(k, buildingProfiles[k]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(floorRows.length ? floorRows : [{ 'مفتاح السجل / Record key': '', 'رقم الطابق / Floor # (1…n)': '', 'اسم الطابق / Floor name': '', 'عدد الوحدات / Unit count': '', 'أنواع الوحدات (مفصولة بفاصلة) / Unit types (comma)': '' }]), 'Floors');

        const unitRows = keys.flatMap((k) => flattenFloorUnitsSheetRows(k, buildingProfiles[k]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unitRows.length ? unitRows : [{ 'مفتاح السجل / Record key': '', 'رقم الطابق / Floor # (1…n)': '', 'رقم الوحدة / Unit no.': '', 'نوع الوحدة / Unit type': '', 'عداد كهرباء الوحدة / Unit electricity ID': '', 'عداد ماء الوحدة / Unit water ID': '' }]), 'FloorUnits');

        const names = [...new Set([...buildingsList, ...Object.keys(buildingProfiles)])].sort((a, b) => a.localeCompare(b, 'ar'));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(names.map((n) => ({ 'اسم المبنى / Building name': n }))), 'BuildingsList');

        const profRows = keys.map((key) => ({
            'مفتاح السجل / Record key': key,
            ProfileJSON: JSON.stringify(sanitizeBuildingProfileForExport(buildingProfiles[key]))
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profRows), 'BuildingProfiles');

        XLSX.writeFile(wb, `SFG_Building_Structures_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    function importBuildingStructuresExcel(file) {
        if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية استيراد البيانات.', 'No permission to import data.')) return;
        if (typeof XLSX === 'undefined') {
            alert('⚠️ مكتبة Excel غير متاحة حالياً.\nExcel library is not available.');
            return;
        }
        readWorkbook(file).then((wb) => {
            loadDashboardAux();
            const mainWs = wb.Sheets['Buildings_Main'];
            const listWs = wb.Sheets['BuildingsList'];
            if (listWs) {
                XLSX.utils.sheet_to_json(listWs, { defval: '' }).forEach((r) => {
                    const n = toStr(r['اسم المبنى / Building name'] || r.BuildingName || r.Name || r.building);
                    if (n && !buildingsList.includes(n)) buildingsList.push(n);
                });
            }

            const floorRowsByKey = {};
            const floWs = wb.Sheets['Floors'];
            if (floWs) {
                XLSX.utils.sheet_to_json(floWs, { defval: '' }).forEach((r) => {
                    const k = toStr(excelPickRowField(r, ['مفتاح السجل', 'Record key']));
                    if (!k) return;
                    if (!floorRowsByKey[k]) floorRowsByKey[k] = [];
                    floorRowsByKey[k].push(r);
                });
            }

            const unitRowsByKeyFloor = {};
            const uWs = wb.Sheets['FloorUnits'];
            if (uWs) {
                XLSX.utils.sheet_to_json(uWs, { defval: '' }).forEach((r) => {
                    const k = toStr(excelPickRowField(r, ['مفتاح السجل', 'Record key']));
                    const fn = parseInt(toStr(excelPickRowField(r, ['رقم الطابق', 'Floor #'])).replace(/[^\d]/g, ''), 10) || 1;
                    if (!k) return;
                    if (!unitRowsByKeyFloor[k]) unitRowsByKeyFloor[k] = {};
                    const key = String(fn);
                    if (!unitRowsByKeyFloor[k][key]) unitRowsByKeyFloor[k][key] = [];
                    unitRowsByKeyFloor[k][key].push(r);
                });
            }

            if (mainWs) {
                const mainRows = XLSX.utils.sheet_to_json(mainWs, { defval: '' });
                const dataRows = mainRows.filter((row) => {
                    const rk = toStr(excelPickRowField(row, ['مفتاح السجل', 'Record key']));
                    const nm = toStr(excelPickRowField(row, ['اسم العقار', 'Property name']));
                    return rk || nm;
                });
                if (dataRows.length) {
                    dataRows.forEach((mainRow) => {
                        const { profile, recordKey, displayName } = buildingProfileFromExcelSheets(mainRow, floorRowsByKey, unitRowsByKeyFloor);
                        const finalName = displayName || recordKey;
                        if (!finalName) return;
                        buildingProfiles[finalName] = profile;
                        if (!buildingsList.includes(finalName)) buildingsList.push(finalName);
                        const ownStr = toStr(excelPickRowField(mainRow, ['ملاك مرتبطون', 'Linked owners']));
                        if (ownStr) applyExcelLinkedOwnersForBuilding(finalName, parseExcelOwnerList(ownStr));
                    });
                    syncManagedUnitsFromProfiles();
                    persistReferenceData(true);
                    alert('✅ تم استيراد العقارات من الأوراق التفصيلية.\nProperties imported from flat sheets.');
                    return;
                }
            }

            const jsonWs = wb.Sheets['BuildingProfiles'];
            if (!jsonWs) {
                alert('❌ يلزم ورقة Buildings_Main أو BuildingProfiles.\nBuildings_Main or BuildingProfiles sheet is required.');
                return;
            }
            const rows = XLSX.utils.sheet_to_json(jsonWs, { defval: '' });
            if (!rows.length) {
                alert('❌ ورقة BuildingProfiles فارغة.\nBuildingProfiles sheet is empty.');
                return;
            }
            importBuildingStructuresFromJsonSheet(rows);
            syncManagedUnitsFromProfiles();
            persistReferenceData(true);
            alert('✅ تم استيراد بنية المباني من JSON.\nBuilding profiles imported from JSON.');
        }).catch((err) => {
            console.error(err);
            alert('❌ فشل قراءة ملف البنية.\nFailed to read structure file.');
        });
    }

    function triggerBuildingStructureImport() {
        const input = document.getElementById('buildingStructureExcelInput');
        if (input) input.click();
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
        XLSX.writeFile(wb, `SFG_Rented_Contracts_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        XLSX.writeFile(wb, `SFG_System_Data_${new Date().toISOString().slice(0,10)}.xlsx`);
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
                updateReservationCalculations();
            }

            localStorage.setItem('sfg_file_registry', JSON.stringify(fileRegistry));
            persistReferenceData(false);
            alert(`✅ تم استيراد ملف النظام بنجاح. الوحدات: ${importedUnitsData.length}`);
        }).catch((err) => {
            console.error('System template import failed:', err);
            alert('❌ فشل استيراد ملف النظام.');
        });
    }
    
    // دوال مساعدة
    function getFormData() {
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
            paymentScheduleJson: JSON.stringify(paymentSchedule)
        };
    }

    /** بيانات العقد للوحدات: النموذج الحي أو آخر عقد محفوظ (للظهور في «مؤجرة» دون الاعتماد على DOM فقط) */
    function getFormDataForUnitsTableMerge() {
        const live = getFormData();
        let saved = null;
        try {
            const raw = localStorage.getItem('sfg_contract_full');
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
                    paymentScheduleJson: live.paymentScheduleJson
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
                    paymentScheduleJson: live.paymentScheduleJson
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
                paymentScheduleJson: live.paymentScheduleJson
            };
        }
        return live;
    }

    /** نفس حمولة saveAllData لحقل sfg_contract_full */
    function collectStorableContractFullFromDom() {
        return {
            agreementNo: document.getElementById('agreementNo').value,
            contractType: document.getElementById('contractTypeSelect').value,
            type: document.getElementById('typeSelect').value,
            municipalFormNo: document.getElementById('municipalFormNo')?.value || '',
            municipalContractNo: document.getElementById('municipalContractNo')?.value || '',
            tenantNameAr: document.getElementById('tenantNameAr').value,
            tenantNameEn: document.getElementById('tenantNameEn').value,
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
            depositAmount: document.getElementById('depositAmount').value,
            graceDays: document.getElementById('graceDays')?.value || '0',
            graceAmount: document.getElementById('graceAmount')?.value || '0.000',
            otherDiscountAmount: document.getElementById('otherDiscountAmount')?.value || '0',
            extraAdjustmentsJson: JSON.stringify(getExtraAdjustmentsFromUi()),
            insuranceDepositItemsJson: JSON.stringify(getInsuranceDepositItemsFromUi()),
            customRentItemsJson: JSON.stringify(getCustomRentItemsFromUi()),
            paymentSchedule: getPaymentScheduleFromUi(),
            paymentScheduleJson: JSON.stringify(getPaymentScheduleFromUi())
        };
    }

    function _tenancyDraftStorageKey(building, unit) {
        return toStr(building) + '\t' + normalizeUnit(unit);
    }

    function loadTenancyContractDraftsMap() {
        try {
            const raw = localStorage.getItem('sfg_tenancy_contract_drafts');
            const o = raw ? JSON.parse(raw) : null;
            return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
        } catch (e) {
            return {};
        }
    }

    function saveTenancyContractDraftsMap(map) {
        try {
            localStorage.setItem('sfg_tenancy_contract_drafts', JSON.stringify(map || {}));
        } catch (e) {}
    }

    function upsertTenancyContractDraftFromPayload(building, unit, payload) {
        const b = toStr(building);
        const u = toStr(unit);
        if (!b || !u || !payload || typeof payload !== 'object') return;
        const map = loadTenancyContractDraftsMap();
        map[_tenancyDraftStorageKey(b, u)] = { payload, updatedAt: new Date().toISOString() };
        saveTenancyContractDraftsMap(map);
    }

    function removeTenancyContractDraftForKeys(buildingNo, flatNo) {
        const b = toStr(buildingNo);
        const f = toStr(flatNo);
        if (!b || !f) return;
        const map = loadTenancyContractDraftsMap();
        const k = _tenancyDraftStorageKey(b, f);
        if (!map[k]) return;
        delete map[k];
        saveTenancyContractDraftsMap(map);
    }

    function isUnitInTenancyContractDraftMap(u) {
        if (!u) return false;
        const b = toStr(u.building);
        const f = toStr(u.unit);
        if (!b || !f) return false;
        const m = loadTenancyContractDraftsMap();
        return !!m[_tenancyDraftStorageKey(b, f)];
    }

    /** @returns {'draft'|'active'|'cancelled'} */
    function getContractLifecycleStateKey(u) {
        const st = toStr(u && u.status).toLowerCase();
        if (st === 'vacant') return 'cancelled';
        if (isUnitInTenancyContractDraftMap(u)) return 'draft';
        return 'active';
    }

    function getContractLifecycleStateRank(k) {
        if (k === 'draft') return 0;
        if (k === 'active') return 1;
        return 2;
    }

    function getContractLifecycleLabelForKey(k) {
        if (k === 'cancelled') return t('ملغي', 'Cancelled');
        if (k === 'draft') return t('مسودة', 'Draft');
        return t('نشط', 'Active');
    }

    function getContractLifecycleSearchBlob(u) {
        const k = getContractLifecycleStateKey(u);
        return (k + ' ' + toStr(getContractLifecycleLabelForKey(k))).toLowerCase();
    }

    function contractStoragePayloadToRentedTableRow(d) {
        if (!d || typeof d !== 'object') return null;
        if (!toStr(d.buildingNo) || !toStr(d.flatNo)) return null;
        return {
            serialNo: '',
            building: d.buildingNo || '',
            unit: d.flatNo || '',
            floor: d.floorDetails || '',
            unitType: d.unitType || '',
            status: 'Rented',
            tenant: d.tenantNameAr || '',
            tenantEn: d.tenantNameEn || '',
            civilCard: d.tenantId || '',
            contactNo: d.tenantMobile || '',
            mobile: d.tenantMobile || '',
            agreementNo: d.agreementNo || '',
            monthlyRent: parseFloat(d.monthlyRent) || 0,
            agreementRent: parseFloat(d.monthlyRent) || 0,
            startDate: d.startDate || '',
            endDate: d.endDate || '',
            remainingDays: daysUntil(d.endDate),
            monthsLeft: d.endDate ? (daysUntil(d.endDate) !== null ? (daysUntil(d.endDate) / 30) : null) : null,
            evacuationDate: '',
            electricity: d.electricityMeter || '',
            electricityReading: '',
            water: d.waterMeter || '',
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
        loadDashboardAux();
        const useEmptyBaseUnits = localStorage.getItem('sfg_use_empty_base_units') === '1';
        if (buildingProfiles && typeof buildingProfiles === 'object') {
            try { syncManagedUnitsFromProfiles(); } catch (e) {}
        }
        const d = getFormDataForUnitsTableMerge();
        const hasContractUnit = toStr(d.buildingNo) && toStr(d.flatNo);
        const dynamicRow = hasContractUnit
            ? {
            serialNo: '',
            building: d.buildingNo || "",
            unit: d.flatNo || "",
            floor: d.floorDetails || "",
            unitType: d.unitType || "",
            status: "Rented",
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

        const source = importedUnitsData.length ? importedUnitsData : (useEmptyBaseUnits ? [] : unitsDataset);
        const managedBuildingSet = new Set((managedUnitsData || []).map((u) => toStr(u.building)).filter(Boolean));
        const combined = source.filter((x) => !managedBuildingSet.has(toStr(x.building)));
        managedUnitsData.forEach((u) => {
            const ownerNames = u.ownerNames || formatOwnerNamesForBuilding(u.building);
            combined.push({ ...u, ownerNames });
        });
        if (dynamicRow) {
            const existingIdx = combined.findIndex(
                (u) => toStr(u.building) === toStr(dynamicRow.building) && normalizeUnit(u.unit) === normalizeUnit(dynamicRow.unit)
            );
            if (existingIdx >= 0) {
                combined[existingIdx] = dynamicRow;
            } else if (dynamicRow.building && dynamicRow.unit) {
                combined.unshift(dynamicRow);
            }
        }
        {
            const dmap = loadTenancyContractDraftsMap();
            const appliedActive =
                dynamicRow &&
                toStr(dynamicRow.building) &&
                toStr(dynamicRow.unit) &&
                _tenancyDraftStorageKey(dynamicRow.building, dynamicRow.unit);
            Object.keys(dmap).forEach((dk) => {
                const e = dmap[dk];
                if (!e || !e.payload) return;
                const dr0 = contractStoragePayloadToRentedTableRow(e.payload);
                if (!dr0) return;
                const dk2 = _tenancyDraftStorageKey(dr0.building, dr0.unit);
                if (appliedActive && dk2 === appliedActive) return;
                const j = combined.findIndex(
                    (u) => toStr(u.building) === toStr(dr0.building) && normalizeUnit(u.unit) === normalizeUnit(dr0.unit)
                );
                if (j >= 0) {
                    combined[j] = dr0;
                } else {
                    combined.unshift(dr0);
                }
            });
        }
        return combined;
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

    function isOmaniNationality(v) {
        const n = toStr(v).toLowerCase();
        return !n || n.includes('oman') || n.includes('عماني');
    }

    function getAddressBookIssues(entry) {
        const issues = [];
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
        if (!isOwner) requireField(t('العقار', 'Property'), entry?.building);

        checkDate(t('البطاقة', 'ID'), entry?.idExpiryDate, { required: true });
        if (!entry?.idAttachment?.dataUrl) issues.push(`${t('مرفق البطاقة', 'ID attachment')}: ${t('ناقص', 'Missing')}`);

        if (requiresPassport) {
            requireField(t('رقم الجواز', 'Passport number'), entry?.passport);
            checkDate(t('الجواز', 'Passport'), entry?.passportExpiryDate, { required: true });
            if (!entry?.passportAttachment?.dataUrl) issues.push(`${t('مرفق الجواز', 'Passport attachment')}: ${t('ناقص', 'Missing')}`);
        }
        return issues;
    }

    function getAddressBookIssuesForReservation(entry) {
        const issues = [];
        const requireField = (label, value) => {
            if (!toStr(value)) issues.push(`${label}: ${t('ناقص', 'Missing')}`);
        };
        requireField(t('الاسم', 'Name'), entry?.name);
        requireField(t('الجوال', 'Mobile'), entry?.mobile);
        requireField(t('الرقم المدني', 'ID'), entry?.idNo);
        return issues;
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
        const sel = document.getElementById('abNationality');
        if (!sel || sel.options.length) return;
        sel.innerHTML = buildCountryOptions().map((c) => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
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

        const unique = new Map();
        rows.forEach((r) => {
            const key = addressBookRowKey(r.type, r.name, r.mobile, r.idNo);
            if (!toStr(r.name)) return;
            const prev = unique.get(key) || {};
            unique.set(key, {
                ...prev,
                ...r,
                nationality: toStr(prev.nationality || r.nationality || 'عماني / Omani'),
                email: toStr(prev.email || r.email),
                passport: toStr(prev.passport || r.passport),
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

    function renderAddressBookTenantSelect() {
        const sel = document.getElementById('tenantAddressBookSelect');
        if (!sel) return;
        const tenantRows = addressBookEntries.filter((x) => x.type === 'tenant' && toStr(x.name));
        sel.innerHTML = [
            '<option value="">اختر مستأجر من دفتر العناوين / Select tenant from address book</option>',
            ...tenantRows.map((r, i) => {
                const idPart = toStr(r.idNo) ? ` | ID: ${toStr(r.idNo)}` : '';
                const mobPart = toStr(r.mobile) ? ` | 📱 ${toStr(r.mobile)}` : '';
                const locPart = toStr(r.building) ? ` | ${toStr(r.building)} ${toStr(r.unit) ? `- ${toStr(r.unit)}` : ''}` : '';
                return `<option value="${i}">${escHtml(`${r.name}${idPart}${mobPart}${locPart}`)}</option>`;
            })
        ].join('');
    }

    function renderAddressBookTable() {
        const tbody = document.getElementById('addressBookTableBody');
        if (!tbody) return;
        const rows = getAddressBookFilteredRows();
        tbody.innerHTML = rows.map((r) => `
            <tr>
                <td style="white-space:normal;line-height:1.5">
                    <div><span class="addressbook-tag">${r.type === 'owner' ? 'مالك / Owner' : 'مستأجر / Tenant'}</span></div>
                    <div style="margin-top:4px;font-weight:700">${escHtml(r.name || '')}</div>
                    <div style="font-size:11px;color:#5c6f7b">${escHtml(r.nationality || '-')}</div>
                    <div style="font-size:11px;color:#5c6f7b">ID: ${escHtml(r.idNo || '-')}</div>
                </td>
                <td style="white-space:normal;line-height:1.5">
                    <div>📱 ${escHtml(r.mobile || '-')}</div>
                    <div>📞 ${escHtml(r.extraMobile || '-')}</div>
                    <div style="font-size:11px;color:#5c6f7b">${escHtml(r.email || '-')}</div>
                </td>
                <td style="white-space:normal;line-height:1.5">
                    <div>${escHtml(r.building || '-')}</div>
                    <div style="font-size:11px;color:#5c6f7b">Unit: ${escHtml(r.unit || '-')}</div>
                </td>
                <td style="font-size:11px;color:${formatDocAlert(r) ? '#9b1c1c' : '#3b4b56'};line-height:1.45">${formatDocAlertLines(r)}</td>
                <td>
                    <div class="inline-actions">
                        <button type="button" class="mini-btn" onclick="openAddressBookEntryModal('view', ${addressBookEntries.indexOf(r)})">${t('فتح', 'Open')}</button>
                        <button type="button" class="mini-btn" onclick="openAddressBookEntryModal('edit', ${addressBookEntries.indexOf(r)})">${t('تعديل', 'Edit')}</button>
                        ${r.type === 'tenant' ? `<button type="button" class="mini-btn" onclick="applyAddressBookTenantToFormByName(${JSON.stringify(r.name).replace(/"/g, '&quot;')})">${t('استيراد للعقد', 'Import')}</button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
        const stats = document.getElementById('addressBookStats');
        if (stats) {
            const ownersCount = rows.filter((x) => x.type === 'owner').length;
            const tenantsCount = rows.filter((x) => x.type === 'tenant').length;
            stats.textContent = appUiLanguage === 'en'
                ? `Records total: ${rows.length} | Owners: ${ownersCount} | Tenants: ${tenantsCount}`
                : `إجمالي السجلات: ${rows.length} | ملاك: ${ownersCount} | مستأجرون: ${tenantsCount}`;
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
            const contactText = `${r.type} ${r.name} ${r.nationality} ${r.idNo}`.toLowerCase();
            const commText = `${r.mobile} ${r.extraMobile} ${r.email}`.toLowerCase();
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
        const tableRows = rows.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${escHtml(r.type === 'owner' ? t('مالك', 'Owner') : t('مستأجر', 'Tenant'))}</td>
                <td>${escHtml(r.name || '')}<br><small>${escHtml(r.nationality || '-')} | ID: ${escHtml(r.idNo || '-')}</small></td>
                <td>${escHtml(r.mobile || '-')}<br><small>${escHtml(r.extraMobile || '-')}</small><br><small>${escHtml(r.email || '-')}</small></td>
                <td>${escHtml(r.building || '-')}<br><small>${escHtml(r.unit || '-')}</small></td>
                <td>${getAddressBookIssues(r).length ? getAddressBookIssues(r).map((x) => `• ${escHtml(x)}`).join('<br>') : t('سليم', 'OK')}</td>
            </tr>
        `).join('');
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
        ['abType', 'abName', 'abNationality', 'abNameEn', 'abMobile', 'abExtraMobile', 'abIdNo', 'abIdExpiryDate', 'abEmail', 'abPassport', 'abPassportExpiryDate', 'abBuilding', 'abUnit', 'abSource', 'abIdAttachmentFile', 'abPassportAttachmentFile'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.disabled = !!disabled;
        });
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
        set('abType', toStr(e.type) === 'owner' ? 'owner' : 'tenant');
        set('abName', toStr(e.name));
        set('abNationality', toStr(e.nationality || 'عماني / Omani'));
        set('abNameEn', toStr(e.nameEn));
        set('abMobile', toStr(e.mobile));
        set('abExtraMobile', toStr(e.extraMobile));
        set('abIdNo', toStr(e.idNo));
        set('abIdExpiryDate', toStr(e.idExpiryDate));
        set('abEmail', toStr(e.email));
        set('abPassport', toStr(e.passport));
        set('abPassportExpiryDate', toStr(e.passportExpiryDate));
        set('abBuilding', toStr(e.building));
        set('abUnit', toStr(e.unit));
        set('abSource', toStr(e.source || 'manual'));
        set('abIdAttachmentFile', '');
        set('abPassportAttachmentFile', '');
        syncAddressBookFormRules();
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
        'محمد':'Mohammed','أحمد':'Ahmed','محمود':'Mahmoud','عبدالله':'Abdullah','عبد':'Abd','الرحمن':'Al Rahman','الرحيم':'Al Rahim',
        'علي':'Ali','حسن':'Hasan','حسين':'Hussein','سعيد':'Saeed','سالم':'Salim','فياض':'Fayyaz','فايز':'Faiz','خميس':'Khamis',
        'خالد':'Khalid','سيد':'Syed','سعيد':'Saeed','ناصر':'Nasser','سلطان':'Sultan','عمر':'Omar','يوسف':'Yousuf','إبراهيم':'Ibrahim',
        'بن':'Bin','بنت':'Bint','ال':'Al'
    };
    const EN_NAME_TO_AR = {
        'mohammed':'محمد','muhammad':'محمد','ahmed':'أحمد','ali':'علي','hasan':'حسن','hassan':'حسن','hussein':'حسين','hussain':'حسين',
        'saeed':'سعيد','salim':'سالم','fayyaz':'فياض','faiz':'فايز','khamis':'خميس','khalid':'خالد','syed':'سيد','nasser':'ناصر',
        'sultan':'سلطان','omar':'عمر','yousuf':'يوسف','yusuf':'يوسف','ibrahim':'إبراهيم','bin':'بن','bint':'بنت','al':'ال'
    };

    function transliterateArToEn(text) {
        const map = {
            'ا':'a','أ':'a','إ':'i','آ':'aa','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z',
            'س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n',
            'ه':'h','ة':'a','و':'w','ي':'y','ى':'a','ئ':'e','ؤ':'o'
        };
        const clean = String(text || '').replace(/[ًٌٍَُِّْـ]/g, '').trim();
        return clean.split(/\s+/).map((word) => {
            if (!word) return '';
            const direct = AR_NAME_TO_EN[word];
            if (direct) return direct;
            const built = word.split('').map((ch) => map[ch] ?? ch).join('')
                .replace(/^al(?=[a-z])/i, 'Al ')
                .replace(/aa/g, 'a')
                .replace(/iy/g, 'i');
            return built ? (built[0].toUpperCase() + built.slice(1)) : '';
        }).filter(Boolean).join(' ');
    }

    function transliterateEnToAr(text) {
        const source = String(text || '').trim().toLowerCase();
        if (!source) return '';
        return source.split(/\s+/).map((word) => {
            const direct = EN_NAME_TO_AR[word];
            if (direct) return direct;
            let out = word
                .replaceAll('sh', 'ش').replaceAll('kh', 'خ').replaceAll('th', 'ث').replaceAll('dh', 'ذ').replaceAll('gh', 'غ')
                .replaceAll('ch', 'تش').replaceAll('ph', 'ف').replaceAll('ou', 'و').replaceAll('oo', 'و').replaceAll('aa', 'ا');
            const map = {
                'a':'ا','b':'ب','c':'ك','d':'د','e':'ي','f':'ف','g':'ج','h':'ه','i':'ي','j':'ج','k':'ك','l':'ل','m':'م','n':'ن',
                'o':'و','p':'ب','q':'ق','r':'ر','s':'س','t':'ت','u':'و','v':'ف','w':'و','x':'كس','y':'ي','z':'ز'
            };
            return out.split('').map((ch) => map[ch] ?? ch).join('');
        }).join(' ').replace(/\s+/g, ' ').trim();
    }

    let _addressBookLiveTranslateLock = false;
    function translateAddressBookName(direction) {
        if (_addressBookLiveTranslateLock) return;
        const ar = document.getElementById('abName');
        const en = document.getElementById('abNameEn');
        if (!ar || !en) return;
        _addressBookLiveTranslateLock = true;
        if (direction === 'ar2en') en.value = transliterateArToEn(ar.value);
        else ar.value = transliterateEnToAr(en.value);
        _addressBookLiveTranslateLock = false;
    }

    function renderAddressBookRelatedInfo(entry) {
        const host = document.getElementById('addressBookRelatedInfo');
        if (!host) return;
        if (!entry) {
            host.textContent = '';
            return;
        }
        if (entry.type === 'owner') {
            const buildings = (ownerBuildingMap[toStr(entry.name)] || []).filter(Boolean);
            const details = buildings.map((b) => {
                const units = getUnitsData().filter((u) => toStr(u.building) === b);
                const rented = units.filter((u) => toStr(u.status).toLowerCase() !== 'vacant').length;
                return appUiLanguage === 'en'
                    ? `${b} (Units: ${units.length} | Rented: ${rented})`
                    : `${b} (وحدات: ${units.length} | مؤجر: ${rented})`;
            });
            host.innerHTML = `<strong>${t('بيانات عقارات المالك:', 'Owner properties:')}</strong><br>${details.map((x) => escHtml(x)).join('<br>') || t('لا توجد عقارات مرتبطة', 'No linked properties')}`;
            return;
        }
        const hist = getUnitsData().filter((u) => toStr(u.tenant) === toStr(entry.name));
        host.innerHTML = `<strong>${t('سجل عقود المستأجر:', 'Tenant contract history:')}</strong><br>${
            hist.map((u) => escHtml(`${u.agreementNo || '-'} | ${u.building || '-'}-${u.unit || '-'} | ${u.startDate || '-'} → ${u.endDate || '-'}`)).join('<br>') || t('لا يوجد سجل', 'No history')
        }`;
    }

    function readAddressBookAttachment(inputId) {
        return new Promise((resolve) => {
            const input = document.getElementById(inputId);
            const file = input?.files?.[0];
            if (!file) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve({
                name: file.name,
                type: file.type || 'application/octet-stream',
                size: file.size || 0,
                dataUrl: String(reader.result || '')
            });
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    }

    function openAddressBookAttachment(kind) {
        const idx = addressBookEditorState.index;
        const entry = idx >= 0 ? addressBookEntries[idx] : null;
        if (!entry) {
            alert('لا يوجد مرفق محفوظ لهذه الجهة حالياً / No saved attachment for this contact yet.');
            return;
        }
        const att = kind === 'passportAttachment' ? entry.passportAttachment : entry.idAttachment;
        openStoredAttachment(att, kind === 'passportAttachment' ? 'Passport Attachment' : 'ID Attachment');
    }

    function openAddressBookEntryModal(mode = 'view', index = -1) {
        const m = mode === 'add' ? 'add' : mode === 'edit' ? 'edit' : 'view';
        const i = Number(index);
        const entry = (i >= 0 && addressBookEntries[i]) ? addressBookEntries[i] : getEmptyAddressBookEntry();
        addressBookEditorState = { mode: m, index: i >= 0 ? i : -1 };
        const title = document.getElementById('addressBookEntryModalTitle');
        if (title) {
            const titleText = m === 'add'
                ? t('إضافة جهة اتصال جديدة', 'Add new contact')
                : m === 'edit'
                    ? t('تعديل جهة اتصال', 'Edit contact')
                    : t('بيانات جهة الاتصال', 'Contact details');
            title.textContent = titleText;
        }
        fillAddressBookForm(entry);
        setAddressBookFormDisabled(m === 'view');
        renderAddressBookRelatedInfo(entry);
        document.getElementById('addressBookEntryModal')?.classList.add('open');
        localizeBilingualUi();
    }

    function closeAddressBookEntryModal() {
        document.getElementById('addressBookEntryModal')?.classList.remove('open');
    }

    async function saveAddressBookEntry() {
        if (addressBookEditorState.mode === 'view') return;
        const read = (id) => toStr(document.getElementById(id)?.value);
        const oldEntry = (addressBookEditorState.mode === 'edit' && addressBookEditorState.index >= 0) ? (addressBookEntries[addressBookEditorState.index] || {}) : {};
        const idAttachment = await readAddressBookAttachment('abIdAttachmentFile');
        const passportAttachment = await readAddressBookAttachment('abPassportAttachmentFile');
        const entry = {
            type: read('abType') === 'owner' ? 'owner' : 'tenant',
            name: read('abName'),
            nationality: read('abNationality') || 'عماني / Omani',
            nameEn: read('abNameEn'),
            mobile: read('abMobile'),
            extraMobile: read('abExtraMobile'),
            idNo: read('abIdNo'),
            idExpiryDate: read('abIdExpiryDate'),
            email: read('abEmail'),
            passport: read('abPassport'),
            passportExpiryDate: read('abPassportExpiryDate'),
            idAttachment: idAttachment || oldEntry.idAttachment || null,
            passportAttachment: passportAttachment || oldEntry.passportAttachment || null,
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
        if (addressBookEditorState.mode === 'edit' && addressBookEditorState.index >= 0 && addressBookEntries[addressBookEditorState.index]) {
            addressBookEntries[addressBookEditorState.index] = entry;
        } else {
            addressBookEntries.unshift(entry);
        }
        localStorage.setItem('sfg_address_book', JSON.stringify(addressBookEntries));
        renderAddressBookTable();
        closeAddressBookEntryModal();
    }

    function refreshAddressBookFromSystem(showAlert = false) {
        const oldRows = Array.isArray(addressBookEntries) ? addressBookEntries : [];
        const oldMap = new Map();
        oldRows.forEach((r) => {
            oldMap.set(addressBookRowKey(r.type, r.name, r.mobile, r.idNo), r);
        });
        const fromSystem = collectAddressBookRowsFromSystem();
        const merged = fromSystem.map((r) => {
            const old = oldMap.get(addressBookRowKey(r.type, r.name, r.mobile, r.idNo)) || {};
            return {
                ...old,
                ...r,
                nationality: toStr(old.nationality || r.nationality || 'عماني / Omani'),
                extraMobile: toStr(old.extraMobile || r.extraMobile),
                idExpiryDate: toStr(old.idExpiryDate || r.idExpiryDate),
                passportExpiryDate: toStr(old.passportExpiryDate || r.passportExpiryDate),
                idAttachment: old.idAttachment || r.idAttachment || null,
                passportAttachment: old.passportAttachment || r.passportAttachment || null
            };
        });
        oldRows.forEach((r) => {
            const key = addressBookRowKey(r.type, r.name, r.mobile, r.idNo);
            if (!fromSystem.some((x) => addressBookRowKey(x.type, x.name, x.mobile, x.idNo) === key) && toStr(r.source) === 'manual') {
                merged.push(r);
            }
        });
        addressBookEntries = merged;
        localStorage.setItem('sfg_address_book', JSON.stringify(addressBookEntries));
        renderAddressBookTable();
        if (showAlert) alert(`✅ تم تحديث دفتر العناوين. إجمالي السجلات: ${addressBookEntries.length}`);
    }

    function applyAddressBookTenantToForm(entry) {
        if (!entry || toStr(entry.type) !== 'tenant') return;
        if (tenancyDraftCompletionLocked) {
            alert(
                t(
                    'بيانات المستأجر مقفلة لأنها مأخوذة من مسودة الحجز.',
                    'Tenant data is locked because it was loaded from the reservation draft.'
                )
            );
            return;
        }
        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.value = v || '';
        };
        set('tenantNameAr', toStr(entry.name));
        set('tenantNameEn', toStr(entry.nameEn || entry.name));
        set('tenantId', toStr(entry.idNo));
        set('tenantMobile', toStr(entry.mobile));
        set('tenantPassport', toStr(entry.passport));
        set('tenantEmail', toStr(entry.email));
        if (contractEntryContext.mode !== 'reservation') {
            if (toStr(entry.building)) set('buildingNo', toStr(entry.building));
            if (toStr(entry.unit)) set('flatNo', toStr(entry.unit));
        }
        updateSummaryPanel();
        renderDocument(currentDoc);
    }

    function applyAddressBookTenantToFormByName(name) {
        const n = toStr(name);
        if (!n) return;
        const row = addressBookEntries.find((x) => x.type === 'tenant' && toStr(x.name) === n);
        if (!row) return;
        applyAddressBookTenantToForm(row);
    }

    function applySelectedAddressBookTenantToForm() {
        const sel = document.getElementById('tenantAddressBookSelect');
        if (!sel || sel.value === '') {
            alert('اختر مستأجر أولاً من دفتر العناوين.\nSelect a tenant from address book first.');
            return;
        }
        const idx = parseInt(sel.value, 10);
        if (Number.isNaN(idx)) return;
        const tenantRows = addressBookEntries.filter((x) => x.type === 'tenant');
        applyAddressBookTenantToForm(tenantRows[idx]);
    }

    function openQuickAddTenantForContract() {
        openAddressBookEntryModal('add', -1);
        const typeSel = document.getElementById('abType');
        if (typeSel) typeSel.value = 'tenant';
        const sourceInp = document.getElementById('abSource');
        if (sourceInp && !toStr(sourceInp.value)) sourceInp.value = 'manual';
        syncAddressBookFormRules();
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

    function setTenancyDraftCompletionFieldLocks(locked) {
        tenancyDraftCompletionLocked = !!locked;
        const lockTitle = t('مقفل — بيانات من مسودة الحجز', 'Locked — from reservation draft');
        const fieldIds = [
            'contractTypeSelect',
            'floorDetails',
            'unitType',
            'electricityMeter',
            'waterMeter',
            'usageType',
            'tenantNameAr',
            'tenantNameEn',
            'tenantId',
            'tenantMobile',
            'tenantPassport',
            'tenantEmail',
            'tenantAddressBookSelect'
        ];
        fieldIds.forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.tagName === 'SELECT') {
                el.disabled = locked;
            } else {
                el.readOnly = locked;
            }
            if (locked) {
                el.title = lockTitle;
                el.classList.add('field-locked-tenancy-draft');
            } else {
                el.removeAttribute('title');
                el.classList.remove('field-locked-tenancy-draft');
            }
        });
        const note = document.getElementById('tenancyDraftFieldsLockNote');
        if (note) {
            const ar = toStr(note.getAttribute('data-ar'));
            const en = toStr(note.getAttribute('data-en'));
            note.textContent = ar && en ? `${ar} / ${en}` : (ar || en);
            if (locked) {
                note.style.display = 'block';
                note.removeAttribute('hidden');
            } else {
                note.style.display = 'none';
                note.setAttribute('hidden', 'hidden');
            }
        }
        updateContractWorkspaceContextUi();
    }

    function nextReservationNumber() {
        const key = 'sfg_reservation_seq';
        const next = (parseInt(localStorage.getItem(key) || '1000', 10) || 1000) + 1;
        localStorage.setItem(key, String(next));
        return `RES-${next}`;
    }

    function nextContractAgreementDraftNumber() {
        const key = 'sfg_tenancy_contract_seq';
        const next = (parseInt(localStorage.getItem(key) || '5000', 10) || 5000) + 1;
        localStorage.setItem(key, String(next));
        return `TC-${next}`;
    }

    function applyObjectToContractFormFields(d) {
        if (!d || typeof d !== 'object') return;
        const skip = new Set(['extraAdjustments', 'extraAdjustmentsJson', 'insuranceDepositItems', 'insuranceDepositItemsJson', 'customRentItems', 'customRentItemsJson', 'paymentSchedule', 'paymentScheduleJson', 'type']);
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
        if (d.paymentScheduleJson) {
            try {
                const arr = JSON.parse(toStr(d.paymentScheduleJson) || '[]');
                renderPaymentScheduleFromRows(Array.isArray(arr) ? arr : []);
            } catch (e) {
                renderPaymentScheduleFromRows([]);
            }
        } else if (Array.isArray(d.paymentSchedule) && d.paymentSchedule.length) {
            renderPaymentScheduleFromRows(d.paymentSchedule);
        }
        ensureTypeSelectAlwaysNew();
    }

    function updateContractWorkspaceContextUi() {
        const isReservation = contractEntryContext.mode === 'reservation';
        const titleEl = document.getElementById('contractsWorkspaceTitle');
        const subEl = document.getElementById('contractsWorkspaceSubtitle');
        const dataSectionTitle = document.getElementById('contractDataSectionTitle');
        const agreementLabel = document.getElementById('agreementNoLabel');
        const typeLabel = document.getElementById('typeSelectLabel');
        const buildingLabel = document.getElementById('buildingSelectLabel');
        const typeSel = document.getElementById('typeSelect');
        const buildingSelect = document.getElementById('buildingSelect');
        const buildingNo = document.getElementById('buildingNo');
        const flatNo = document.getElementById('flatNo');
        const reservationSaveActions = document.getElementById('reservationSaveActions');
        if (titleEl) titleEl.textContent = isReservation ? t('📌 شاشة الحجوزات', '📌 Reservations workspace') : t('📝 شاشة العقود', '📝 Contracts workspace');
        if (subEl) subEl.textContent = isReservation
            ? t('تسجيل بيانات الحجز للوحدة المختارة وربطها بالمستأجر.', 'Capture reservation details for the selected unit and tenant.')
            : t('تحكم كامل في بيانات العقد، المستندات، المعاينة والطباعة', 'Full control of contract data, documents, preview, and printing');
        if (dataSectionTitle) dataSectionTitle.textContent = isReservation
            ? t('بيانات الحجز', 'Reservation data')
            : t('📝 بيانات العقد الرئيسية', '📝 Main contract data');
        if (agreementLabel) agreementLabel.textContent = isReservation ? t('رقم الحجز', 'Reservation no.') : t('رقم العقد', 'Agreement No.');
        if (typeLabel) typeLabel.textContent = isReservation ? t('نوع العملية', 'Entry type') : t('النوع', 'Type');
        if (buildingLabel) buildingLabel.textContent = isReservation ? t('المبنى (تلقائي)', 'Building (auto)') : t('اختيار المبنى', 'Select Building');
        const lockCtx = tenancyDraftCompletionLocked;
        if (typeSel) {
            typeSel.value = 'جديد New';
            typeSel.disabled = true;
        }
        if (buildingSelect) buildingSelect.disabled = isReservation || lockCtx;
        if (buildingNo) buildingNo.readOnly = isReservation || lockCtx;
        if (flatNo) flatNo.readOnly = isReservation || lockCtx;
        if (reservationSaveActions) reservationSaveActions.style.display = isReservation ? 'flex' : 'none';
        updateReservationCalculations();
    }

    function enterReservationModeForUnit(unit) {
        contractEntryContext = { mode: 'reservation', unit: { ...unit } };
        setTenancyDraftCompletionFieldLocks(false);
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };
        set('agreementNo', nextReservationNumber());
        set('typeSelect', 'جديد New');
        set('buildingNo', toStr(unit?.building));
        set('flatNo', toStr(unit?.unit));
        set('floorDetails', toStr(unit?.floor));
        set('unitType', toStr(unit?.unitType || 'Flat'));
        set('electricityMeter', toStr(unit?.electricity));
        set('waterMeter', toStr(unit?.water));
        set('usageType', (toStr(unit?.unitType).toLowerCase() === 'office' || toStr(unit?.unitType).toLowerCase() === 'shop') ? 'تجاري Commercial' : 'سكني Residential');
        set('tenantNameAr', '');
        set('tenantNameEn', '');
        set('tenantId', '');
        set('tenantMobile', '');
        set('tenantPassport', '');
        set('tenantEmail', '');
        set('monthlyRent', '');
        const depositEl = document.getElementById('depositAmount');
        if (depositEl) delete depositEl.dataset.manualDeposit;
        updateContractWorkspaceContextUi();
        updateSummaryPanel();
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
        renderOperationsTable();
    }

    function setOperationsSort(key) {
        if (operationsSortState.key === key) {
            operationsSortState.dir = operationsSortState.dir === 'asc' ? 'desc' : 'asc';
        } else {
            operationsSortState.key = key;
            operationsSortState.dir = key === 'days' ? 'asc' : 'asc';
        }
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
        if (!u.endDate) return 'NoEndDate';
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
        localStorage.setItem('sfg_file_registry', JSON.stringify(fileRegistry));
        document.getElementById('regFileName').value = '';
        document.getElementById('regFilePath').value = '';
        document.getElementById('regNotes').value = '';
    }

    function removeRegistryEntry(id) {
        fileRegistry = fileRegistry.filter((x) => x.id !== id);
        renderRegistryTable();
        localStorage.setItem('sfg_file_registry', JSON.stringify(fileRegistry));
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
                <td>${r.building || ''}</td>
                <td>${r.unit || ''}</td>
                <td>${r.tenant || ''}</td>
                <td>${r.docType || ''}</td>
                <td title="${r.filePath || ''}">${r.fileName || ''}</td>
                <td>${r.source || '-'}</td>
                <td>${(r.updatedAt || '').slice(0, 10)}</td>
                <td><button class="mini-btn" onclick="removeRegistryEntry('${r.id}')">حذف</button></td>
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
            localStorage.removeItem('sfg_auth_session');
        }
    }

    function getLoggedInUser() {
        validateAuthSession();
        if (!authSession || !authSession.userId) return null;
        return getUserById(authSession.userId);
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

    function effectivePermission(permKey) {
        if (!usersRegistryHasRows()) return true;
        const u = getLoggedInUser();
        if (!u) return permKey === 'manage_dashboard';
        return userHasPermission(u, permKey);
    }

    function generateRandomPassword(len = 12) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
        let s = '';
        for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
    }

    function generateUserRecordId() {
        return `sfg_u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function persistAuthOnly() {
        localStorage.setItem('sfg_users_registry', JSON.stringify(usersRegistry));
        localStorage.setItem('sfg_auth_session', JSON.stringify(authSession));
        syncSfgKvToServer();
    }

    function attemptLogin(email, password) {
        const em = toStr(email).toLowerCase();
        const pw = String(password || '');
        const u = usersRegistry.find((x) => x && toStr(x.email).toLowerCase() === em);
        if (!u || u.password !== pw) {
            return { ok: false, msg: 'بيانات الدخول غير صحيحة / Invalid credentials' };
        }
        authSession = { userId: u.id, loggedInAt: new Date().toISOString() };
        persistAuthOnly();
        return { ok: true };
    }

    function logoutAuth() {
        authSession = null;
        localStorage.removeItem('sfg_auth_session');
        persistAuthOnly();
    }

    function updateAuthHeaderBar() {
        const hosts = document.querySelectorAll('[data-auth-bar]');
        if (!hosts.length) return;
        const u = getLoggedInUser();
        const needLogin = usersRegistryHasRows() && !u;
        const label = getCurrentActorLabel();
        const html = `
            <span style="opacity:0.95">${t('المستخدم الحالي', 'Current')}: <strong>${escHtml(label)}</strong></span>
            <span style="display:flex;flex-wrap:wrap;gap:6px">
                ${needLogin ? `<button type="button" class="btn-outline" style="padding:4px 12px;font-size:11px" onclick="openAuthLoginModal()">${t('تسجيل الدخول', 'Sign in')}</button>` : ''}
                ${u ? `<button type="button" class="btn-outline" style="padding:4px 12px;font-size:11px" onclick="logoutAuth(); updateAuthHeaderBar(); if(typeof renderUsersManagementPage==='function') renderUsersManagementPage();">${t('خروج', 'Logout')}</button>` : ''}
            </span>
        `;
        hosts.forEach((host) => { host.innerHTML = html; });
    }

    function openAuthLoginModal() {
        document.getElementById('authLoginModal')?.classList.add('open');
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
        if (typeof renderUsersManagementPage === 'function') renderUsersManagementPage();
        alert('تم تسجيل الدخول / Signed in');
    }

    function canAccessUserManagementPage() {
        if (!usersRegistryHasRows()) return true;
        const u = getLoggedInUser();
        return u && userHasPermission(u, 'manage_users');
    }

    function assertPermissionOrAlert(permKey, msgAr, msgEn) {
        if (effectivePermission(permKey)) return true;
        alert(`${msgAr}\n${msgEn}`);
        return false;
    }

    function renderUsersManagementPage() {
        const host = document.getElementById('usersPanelHost');
        if (!host) return;
        if (!canAccessUserManagementPage()) {
            host.innerHTML = `
                <div class="insight-nested" style="padding:16px;border:1px solid #e8c4c4;background:#fff8f8;border-radius:10px">
                    <p style="margin:0 0 8px;font-weight:700">صلاحية مطلوبة / Permission required</p>
                    <p style="font-size:13px;color:#444;margin:0">يجب تسجيل الدخول بحساب يملك صلاحية «إدارة المستخدمين» للوصول لهذه الصفحة / Sign in with an account that has <strong>User management</strong> permission to access this page.</p>
                    <button type="button" class="btn-primary" style="margin-top:12px" onclick="openAuthLoginModal()">تسجيل الدخول / Sign in</button>
                </div>
            `;
            return;
        }

        const ed = usersEditorState.editingId;
        const editUser = ed ? getUserById(ed) : null;
        const isFirstBootstrap = !usersRegistryHasRows();

        const permChecks = (userObj) => SFG_PERMISSION_DEFS.map((p) => {
            const on = userObj && userObj.permissions ? !!userObj.permissions[p.key] : false;
            return `
                <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                    <input type="checkbox" data-perm-key="${p.key}" ${on ? 'checked' : ''}>
                    <span>${p.labelAr} / ${p.labelEn}</span>
                </label>
            `;
        }).join('');

        const formSection = `
            <div class="insight-nested" style="margin-bottom:16px;padding:14px;border:1px solid #dfe7ee;border-radius:12px;background:#fafcfe">
                <h4 style="margin:0 0 10px;font-size:15px">${editUser ? 'تعديل مستخدم / Edit user' : 'مستخدم جديد / New user'}</h4>
                ${isFirstBootstrap ? '<p style="font-size:12px;color:#7a3e00;margin:0 0 10px;background:#fff6e6;padding:8px;border-radius:8px">أول مستخدم يُنشأ يُنصح بمنحه كل الصلاحيات ثم تسجيل الدخول به. / For the first user, grant all permissions, then sign in.</p>' : ''}
                <input type="hidden" id="userEditId" value="${escHtml(editUser?.id || '')}">
                <div class="users-form-grid">
                    <div style="display:flex;flex-direction:column;gap:4px">
                        <label style="font-size:12px;font-weight:700">الاسم الظاهر / Display name</label>
                        <input id="userDisplayNameInput" value="${escHtml(editUser?.displayName || '')}" placeholder="مثال: أحمد محمد">
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px">
                        <label style="font-size:12px;font-weight:700">البريد الإلكتروني / Email</label>
                        <input type="email" id="userEmailInput" value="${escHtml(editUser?.email || '')}" placeholder="user@example.com">
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px">
                        <label style="font-size:12px;font-weight:700">رقم الهاتف / Phone</label>
                        <input id="userPhoneInput" value="${escHtml(editUser?.phone || '')}" placeholder="+968...">
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px">
                        <label style="font-size:12px;font-weight:700">كلمة المرور / Password</label>
                        <div style="display:flex;gap:6px;flex-wrap:wrap">
                            <input type="text" id="userPasswordInput" value="${escHtml(editUser?.password || '')}" style="flex:1;min-width:140px" placeholder="••••••••">
                            <button type="button" class="btn-outline" onclick="fillGeneratedUserPassword()">توليد / Generate</button>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px;grid-column:1/-1">
                        <label style="font-size:12px;font-weight:700">ملاحظات / Notes</label>
                        <input id="userNotesInput" value="${escHtml(editUser?.notes || '')}" placeholder="اختياري / optional">
                    </div>
                </div>
                <div style="font-size:12px;font-weight:700;margin-bottom:6px">الصلاحيات / Permissions</div>
                <div class="users-perm-grid" id="userPermGrid">${permChecks(editUser || { permissions: defaultPermissionsAllOn() })}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                    <button type="button" class="btn-primary" onclick="saveUserFromForm()">${editUser ? 'حفظ التعديلات / Save' : 'إضافة المستخدم / Add user'}</button>
                    ${editUser ? '<button type="button" class="btn-outline" onclick="cancelUserEdit()">إلغاء التعديل / Cancel</button>' : ''}
                </div>
            </div>
        `;

        const rows = usersRegistry.map((u) => `
            <tr>
                <td>${escHtml(u.displayName || '-')}</td>
                <td dir="ltr" style="text-align:left">${escHtml(u.email || '-')}</td>
                <td>${escHtml(u.phone || '-')}</td>
                <td style="font-size:11px">${SFG_PERMISSION_DEFS.filter((p) => u.permissions && u.permissions[p.key]).map((p) => p.labelAr).join('، ') || '—'}</td>
                <td style="font-size:11px">${escHtml((u.updatedAt || '').slice(0, 19).replace('T', ' '))}</td>
                <td>
                    <button type="button" class="mini-btn" onclick='startEditUser(${JSON.stringify(u.id)})'>تعديل / Edit</button>
                    <button type="button" class="mini-btn" onclick='deleteUserRecord(${JSON.stringify(u.id)})'>حذف / Delete</button>
                </td>
            </tr>
        `).join('');

        host.innerHTML = `
            ${formSection}
            <div class="table-shell">
                <table class="ops-table">
                    <thead>
                        <tr>
                            <th>الاسم / Name</th>
                            <th>البريد / Email</th>
                            <th>الهاتف / Phone</th>
                            <th>الصلاحيات / Perms</th>
                            <th>آخر تحديث / Updated</th>
                            <th>إجراءات / Actions</th>
                        </tr>
                    </thead>
                    <tbody>${rows || '<tr><td colspan="6" style="text-align:center">لا يوجد مستخدمون بعد / No users yet</td></tr>'}</tbody>
                </table>
            </div>
        `;
    }

    function fillGeneratedUserPassword() {
        const el = document.getElementById('userPasswordInput');
        if (el) el.value = generateRandomPassword(14);
    }

    function startEditUser(id) {
        usersEditorState = { editingId: id };
        renderUsersManagementPage();
    }

    function cancelUserEdit() {
        usersEditorState = { editingId: '' };
        renderUsersManagementPage();
    }

    function collectPermissionsFromForm() {
        const grid = document.getElementById('userPermGrid');
        const perms = {};
        SFG_PERMISSION_DEFS.forEach((p) => { perms[p.key] = false; });
        if (!grid) return perms;
        grid.querySelectorAll('input[data-perm-key]').forEach((inp) => {
            const k = inp.getAttribute('data-perm-key');
            if (k) perms[k] = !!inp.checked;
        });
        return perms;
    }

    function saveUserFromForm() {
        if (!canAccessUserManagementPage()) return;
        const editId = toStr(document.getElementById('userEditId')?.value);
        const displayName = toStr(document.getElementById('userDisplayNameInput')?.value);
        const email = toStr(document.getElementById('userEmailInput')?.value);
        const phone = toStr(document.getElementById('userPhoneInput')?.value);
        const password = toStr(document.getElementById('userPasswordInput')?.value);
        const notes = toStr(document.getElementById('userNotesInput')?.value);
        if (!email) {
            alert('البريد الإلكتروني مطلوب / Email is required');
            return;
        }
        if (!password || password.length < 4) {
            alert('كلمة المرور مطلوبة (4 أحرف على الأقل) / Password required (min 4 chars)');
            return;
        }
        const dup = usersRegistry.some((u) => u.email && toStr(u.email).toLowerCase() === email.toLowerCase() && u.id !== editId);
        if (dup) {
            alert('البريد مستخدم مسبقاً / Email already used');
            return;
        }
        const now = new Date().toISOString();
        const actor = getCurrentActorLabel();
        const perms = collectPermissionsFromForm();
        if (editId) {
            const idx = usersRegistry.findIndex((u) => u.id === editId);
            if (idx < 0) return;
            usersRegistry[idx] = {
                ...usersRegistry[idx],
                displayName,
                email,
                phone,
                notes,
                password,
                permissions: perms,
                updatedAt: now,
                updatedBy: actor
            };
        } else {
            const firstBootstrap = !usersRegistryHasRows();
            const newId = generateUserRecordId();
            usersRegistry.push({
                id: newId,
                displayName,
                email,
                phone,
                notes,
                password,
                permissions: perms,
                createdAt: now,
                createdBy: actor,
                updatedAt: now,
                updatedBy: actor
            });
            if (firstBootstrap) {
                authSession = { userId: newId, loggedInAt: now };
            }
        }
        usersEditorState = { editingId: '' };
        persistAuthOnly();
        updateAuthHeaderBar();
        renderUsersManagementPage();
        alert('تم حفظ المستخدم / User saved');
    }

    function deleteUserRecord(id) {
        if (!canAccessUserManagementPage()) return;
        if (!confirm('حذف هذا المستخدم؟ / Delete this user?')) return;
        usersRegistry = usersRegistry.filter((u) => u.id !== id);
        if (authSession && authSession.userId === id) logoutAuth();
        persistAuthOnly();
        updateAuthHeaderBar();
        renderUsersManagementPage();
    }

    function openUsersWorkspace() {
        if (isViewerMode) return;
        setWorkspaceMode('users');
    }

    function loadDashboardAux() {
        try {
            const rawBuildings = localStorage.getItem('sfg_buildings_list');
            const savedBuildings = JSON.parse(rawBuildings || '[]');
            if (Array.isArray(savedBuildings) && rawBuildings !== null) {
                buildingsList.splice(0, buildingsList.length, ...savedBuildings.map((x) => toStr(x)).filter(Boolean));
            }
        } catch (e) {}
        try {
            const rawOwners = localStorage.getItem('sfg_owners_list');
            const savedOwners = JSON.parse(rawOwners || '[]');
            if (Array.isArray(savedOwners) && rawOwners !== null) {
                ownersList.splice(0, ownersList.length, ...savedOwners.map((x) => toStr(x)).filter(Boolean));
            }
        } catch (e) {}
        try {
            unitReservations = JSON.parse(localStorage.getItem('sfg_unit_reservations') || '[]');
            if (!Array.isArray(unitReservations)) unitReservations = [];
        } catch (e) {
            unitReservations = [];
        }
        try {
            evictionRequests = JSON.parse(localStorage.getItem('sfg_eviction_requests') || '[]');
            if (!Array.isArray(evictionRequests)) evictionRequests = [];
        } catch (e) {
            evictionRequests = [];
        }
        try {
            ownerBuildingMap = JSON.parse(localStorage.getItem('sfg_owner_building_map') || '{}');
            if (!ownerBuildingMap || typeof ownerBuildingMap !== 'object') ownerBuildingMap = {};
        } catch (e) {
            ownerBuildingMap = {};
        }
        try {
            buildingProfiles = JSON.parse(localStorage.getItem('sfg_building_profiles') || '{}');
            if (!buildingProfiles || typeof buildingProfiles !== 'object') buildingProfiles = {};
            buildingProfilesShadow = { ...buildingProfilesShadow, ...buildingProfiles };
        } catch (e) {
            buildingProfiles = {};
        }
        try {
            ownerProfiles = JSON.parse(localStorage.getItem('sfg_owner_profiles') || '{}');
            if (!ownerProfiles || typeof ownerProfiles !== 'object') ownerProfiles = {};
        } catch (e) {
            ownerProfiles = {};
        }
        try {
            addressBookEntries = JSON.parse(localStorage.getItem('sfg_address_book') || '[]');
            if (!Array.isArray(addressBookEntries)) addressBookEntries = [];
        } catch (e) {
            addressBookEntries = [];
        }
        try {
            managedUnitsData = JSON.parse(localStorage.getItem('sfg_managed_units') || '[]');
            if (!Array.isArray(managedUnitsData)) managedUnitsData = [];
        } catch (e) {
            managedUnitsData = [];
        }
        if (buildingProfiles && typeof buildingProfiles === 'object') {
            try {
                syncManagedUnitsFromProfiles();
                localStorage.setItem('sfg_managed_units', JSON.stringify(managedUnitsData));
            } catch (e) {}
        }
        try {
            usersRegistry = JSON.parse(localStorage.getItem('sfg_users_registry') || '[]');
            if (!Array.isArray(usersRegistry)) usersRegistry = [];
        } catch (e) {
            usersRegistry = [];
        }
        try {
            authSession = JSON.parse(localStorage.getItem('sfg_auth_session') || 'null');
            if (!authSession || typeof authSession !== 'object') authSession = null;
        } catch (e) {
            authSession = null;
        }
        validateAuthSession();
    }

    function saveDashboardAux() {
        localStorage.setItem('sfg_unit_reservations', JSON.stringify(unitReservations));
        localStorage.setItem('sfg_eviction_requests', JSON.stringify(evictionRequests));
        localStorage.setItem('sfg_owner_building_map', JSON.stringify(ownerBuildingMap));
        localStorage.setItem('sfg_building_profiles', JSON.stringify(buildingProfiles));
        localStorage.setItem('sfg_owner_profiles', JSON.stringify(ownerProfiles));
        localStorage.setItem('sfg_address_book', JSON.stringify(addressBookEntries));
        localStorage.setItem('sfg_managed_units', JSON.stringify(managedUnitsData));
        localStorage.setItem('sfg_users_registry', JSON.stringify(usersRegistry));
        localStorage.setItem('sfg_auth_session', JSON.stringify(authSession));
        syncSfgKvToServer();
    }

    function clearTenantBuildingContractDataKeepOwnersAndAddressBook() {
        // Keep: ownersList, ownerProfiles, addressBookEntries
        // Clear: tenants/contracts/buildings/units reservations and related datasets
        buildingsList.length = 0;
        importedUnitsData = [];
        managedUnitsData = [];
        unitReservations = [];
        evictionRequests = [];
        ownerBuildingMap = {};
        buildingProfiles = {};
        buildingProfilesShadow = {};
        fileRegistry = [];
        contractEntryContext = { mode: 'contract', unit: null };

        localStorage.setItem('sfg_buildings_list', JSON.stringify([]));
        localStorage.setItem('sfg_unit_reservations', JSON.stringify([]));
        localStorage.setItem('sfg_eviction_requests', JSON.stringify([]));
        localStorage.setItem('sfg_owner_building_map', JSON.stringify({}));
        localStorage.setItem('sfg_building_profiles', JSON.stringify({}));
        localStorage.setItem('sfg_managed_units', JSON.stringify([]));
        localStorage.setItem('sfg_file_registry', JSON.stringify([]));
        localStorage.setItem('sfg_use_empty_base_units', '1');
        localStorage.removeItem('sfg_contract_full');
        try { localStorage.removeItem('sfg_tenancy_contract_drafts'); } catch (e) {}
        localStorage.setItem('sfg_cleanup_keep_owner_addressbook_done', '1');
        syncSfgKvToServer();
    }

    function openDataCleanupModal() {
        document.getElementById('dataCleanupModal')?.classList.add('open');
        localizeBilingualUi();
    }

    function closeDataCleanupModal() {
        document.getElementById('dataCleanupModal')?.classList.remove('open');
    }

    function confirmCleanupPassword() {
        const entered = prompt(t('أدخل كلمة المرور للتأكيد:', 'Enter confirmation password:'));
        return toStr(entered) === '1234';
    }

    function runDataCleanup(scope) {
        if (!confirmCleanupPassword()) {
            alert(t('❌ كلمة المرور غير صحيحة.', '❌ Incorrect password.'));
            return;
        }
        if (scope === 'all') {
            buildingsList.length = 0;
            ownersList.length = 0;
            importedUnitsData = [];
            managedUnitsData = [];
            unitReservations = [];
            evictionRequests = [];
            ownerBuildingMap = {};
            buildingProfiles = {};
            buildingProfilesShadow = {};
            ownerProfiles = {};
            addressBookEntries = [];
            fileRegistry = [];
            localStorage.removeItem('sfg_contract_full');
        try { localStorage.removeItem('sfg_tenancy_contract_drafts'); } catch (e) {}
            localStorage.setItem('sfg_buildings_list', JSON.stringify([]));
            localStorage.setItem('sfg_owners_list', JSON.stringify([]));
            localStorage.setItem('sfg_unit_reservations', JSON.stringify([]));
            localStorage.setItem('sfg_eviction_requests', JSON.stringify([]));
            localStorage.setItem('sfg_owner_building_map', JSON.stringify({}));
            localStorage.setItem('sfg_building_profiles', JSON.stringify({}));
            localStorage.setItem('sfg_owner_profiles', JSON.stringify({}));
            localStorage.setItem('sfg_address_book', JSON.stringify([]));
            localStorage.setItem('sfg_managed_units', JSON.stringify([]));
            localStorage.setItem('sfg_file_registry', JSON.stringify([]));
            localStorage.setItem('sfg_use_empty_base_units', '1');
        } else if (scope === 'contracts') {
            localStorage.removeItem('sfg_contract_full');
        try { localStorage.removeItem('sfg_tenancy_contract_drafts'); } catch (e) {}
            fileRegistry = [];
            localStorage.setItem('sfg_file_registry', JSON.stringify([]));
        } else if (scope === 'buildings') {
            buildingsList.length = 0;
            importedUnitsData = [];
            managedUnitsData = [];
            ownerBuildingMap = {};
            buildingProfiles = {};
            buildingProfilesShadow = {};
            localStorage.setItem('sfg_buildings_list', JSON.stringify([]));
            localStorage.setItem('sfg_owner_building_map', JSON.stringify({}));
            localStorage.setItem('sfg_building_profiles', JSON.stringify({}));
            localStorage.setItem('sfg_managed_units', JSON.stringify([]));
            localStorage.setItem('sfg_use_empty_base_units', '1');
        } else if (scope === 'tenants') {
            addressBookEntries = addressBookEntries.filter((x) => toStr(x.type) === 'owner');
            localStorage.setItem('sfg_address_book', JSON.stringify(addressBookEntries));
        } else if (scope === 'reservations') {
            unitReservations = [];
            evictionRequests = [];
            localStorage.setItem('sfg_unit_reservations', JSON.stringify([]));
            localStorage.setItem('sfg_eviction_requests', JSON.stringify([]));
        } else if (scope === 'owners') {
            ownersList.length = 0;
            ownerProfiles = {};
            ownerBuildingMap = {};
            localStorage.setItem('sfg_owners_list', JSON.stringify([]));
            localStorage.setItem('sfg_owner_profiles', JSON.stringify({}));
            localStorage.setItem('sfg_owner_building_map', JSON.stringify({}));
            addressBookEntries = addressBookEntries.filter((x) => toStr(x.type) !== 'owner');
            localStorage.setItem('sfg_address_book', JSON.stringify(addressBookEntries));
        } else if (scope === 'addressbook') {
            addressBookEntries = [];
            localStorage.setItem('sfg_address_book', JSON.stringify([]));
        }
        syncSfgKvToServer();
        closeDataCleanupModal();
        initializeMode();
        alert(t('✅ تمت عملية التصفية بنجاح.', '✅ Cleanup completed successfully.'));
    }

    function escHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatDateTimeDisplay(iso) {
        if (!iso) return '— / —';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return escHtml(String(iso));
        const ar = d.toLocaleString('ar-OM', { dateStyle: 'medium', timeStyle: 'short' });
        const en = d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
        return `${escHtml(ar)} · ${escHtml(en)}`;
    }

    function isReservedUnitRow(u) {
        const st = toStr(u.status).toLowerCase();
        if (st === 'reserved' || st.includes('محجوز') || st.includes('حجز')) return true;
        return unitReservations.some(
            (r) => r.building === u.building && normalizeUnit(r.unit) === normalizeUnit(u.unit)
        );
    }

    function ensureOwnerLinksPlaceholder() {
        if (Object.keys(ownerBuildingMap).length > 0) return;
        const buildings = [...new Set(getUnitsData().map((x) => x.building).filter(Boolean))];
        if (!buildings.length || !ownersList.length) return;
        buildings.forEach((b, i) => {
            const o = ownersList[i % ownersList.length];
            if (!ownerBuildingMap[o]) ownerBuildingMap[o] = [];
            ownerBuildingMap[o].push(b);
        });
        saveDashboardAux();
    }

    function parseBulkNames(text) {
        return [...new Set(String(text || '').split(/[\r\n,;]+/).map((x) => toStr(x)).filter(Boolean))];
    }

    function makeBuildingLabel(profile) {
        if (!profile) return '';
        const explicit = toStr(profile.name);
        if (explicit) return explicit;
        const parts = [];
        if (toStr(profile.area)) parts.push(toStr(profile.area));
        if (toStr(profile.plotNo)) parts.push(`Plot ${toStr(profile.plotNo)}`);
        if (toStr(profile.buildingNo)) parts.push(`Building ${toStr(profile.buildingNo)}`);
        return parts.join(', ');
    }

    function extractPlotBuildingKey(label) {
        const s = toStr(label).toLowerCase();
        const p = (s.match(/plot\s*([\w/-]+)/i) || [])[1] || '';
        const b = (s.match(/building\s*([\w/-]+)/i) || [])[1] || '';
        if (!p && !b) return '';
        return `${p}|${b}`;
    }

    function createEmptyFloor(index = 0) {
        return {
            name: index === 0 ? 'الطابق الأرضي' : `الطابق ${index + 1}`,
            selectedTypes: ['Flat'],
            unitCount: 0,
            units: [],
            unitsDetailed: []
        };
    }

    function getBuildingTypeOptions() {
        return ['فيلا', 'متعدد الطوابق'];
    }

    function getUnitTypeChoices() {
        return [
            { value: 'Flat', label: 'شقة' },
            { value: 'Shop', label: 'محل' },
            { value: 'Office', label: 'مكتب' },
            { value: 'Room', label: 'غرفة' }
        ];
    }

    function normalizeFloorData(floor, index = 0) {
        const base = createEmptyFloor(index);
        const selectedTypes = Array.isArray(floor?.selectedTypes) && floor.selectedTypes.length
            ? floor.selectedTypes.map((x) => toStr(x)).filter(Boolean)
            : (toStr(floor?.unitType) ? [toStr(floor.unitType)] : base.selectedTypes);
        const unitsDetailed = Array.isArray(floor?.unitsDetailed) && floor.unitsDetailed.length
            ? floor.unitsDetailed.map((u) => ({
                number: toStr(u.number),
                type: toStr(u.type) || selectedTypes[0] || 'Flat',
                electricity: toStr(u.electricity),
                water: toStr(u.water)
            }))
            : (Array.isArray(floor?.units) ? floor.units : []).map((u) => ({
                number: toStr(u),
                type: selectedTypes[0] || 'Flat',
                electricity: '',
                water: ''
            }));
        return {
            name: toStr(floor?.name) || base.name,
            selectedTypes,
            unitCount: Number(floor?.unitCount || unitsDetailed.length || 0),
            units: unitsDetailed.map((u) => u.number),
            unitsDetailed
        };
    }

    function createUnitRowsFromProfile(profile) {
        const buildingName = makeBuildingLabel(profile);
        if (!buildingName) return [];
        const rows = [];
        const floors = Array.isArray(profile.floors) ? profile.floors : [];
        floors.forEach((rawFloor, floorIdx) => {
            const floor = normalizeFloorData(rawFloor, floorIdx);
            const floorName = toStr(floor.name);
            const unitsDetailed = Array.isArray(floor.unitsDetailed) ? floor.unitsDetailed : [];
            unitsDetailed.forEach((unitRow) => {
                const unit = toStr(unitRow.number);
                const unitType = toStr(unitRow.type) || 'Flat';
                if (!unit) return;
                rows.push({
                    serialNo: '',
                    building: buildingName,
                    unit,
                    floor: floorName,
                    unitType,
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
                    evacuationDate: '',
                    electricity: toStr(unitRow.electricity),
                    electricityReading: '',
                    water: toStr(unitRow.water),
                    waterReading: '',
                    remarks: '',
                    ownerNames: formatOwnerNamesForBuilding(buildingName)
                });
            });
        });
        if (!rows.length && toStr(profile.buildingType) === 'فيلا') {
            const fallbackUnit = toStr(profile.buildingNo) || 'VILLA-1';
            rows.push({
                serialNo: '',
                building: buildingName,
                unit: fallbackUnit,
                floor: t('فيلا', 'Villa'),
                unitType: 'Flat',
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
                evacuationDate: '',
                electricity: toStr(profile.electricityMeter),
                electricityReading: '',
                water: toStr(profile.waterMeter),
                waterReading: '',
                remarks: '',
                ownerNames: formatOwnerNamesForBuilding(buildingName)
            });
        }
        return rows;
    }

    function syncManagedUnitsFromProfiles() {
        const grouped = {};
        Object.values(buildingProfiles || {}).forEach((raw) => {
            const profile = raw || {};
            const name = makeBuildingLabel(profile);
            if (!name) return;
            const prev = grouped[name];
            if (!prev) {
                grouped[name] = profile;
                return;
            }
            const prevTs = new Date(toStr(prev.updatedAt) || 0).getTime() || 0;
            const curTs = new Date(toStr(profile.updatedAt) || 0).getTime() || 0;
            if (curTs >= prevTs) grouped[name] = profile;
        });
        managedUnitsData = Object.values(grouped).flatMap((profile) => createUnitRowsFromProfile(profile));
    }

    function getAllKnownBuildings() {
        const set = new Set(buildingsList.map((b) => toStr(b)).filter(Boolean));
        Object.values(buildingProfiles).forEach((profile) => {
            const name = makeBuildingLabel(profile);
            if (name) set.add(name);
        });
        getUnitsData().forEach((u) => {
            const b = toStr(u.building);
            if (b) set.add(b);
        });
        return [...set].sort((a, b) => a.localeCompare(b, 'ar'));
    }

    function isBuildingLinkedToOwner(owner, building) {
        return (ownerBuildingMap[owner] || []).includes(building);
    }

    /** أسماء الملاك المرتبطين بمبنى معيّن (من خريطة الربط) / Owner names linked to a building */
    function getOwnerNamesForBuilding(buildingName) {
        const b = toStr(buildingName);
        if (!b) return [];
        return Object.keys(ownerBuildingMap)
            .filter((owner) => (ownerBuildingMap[owner] || []).includes(b))
            .sort((a, c) => a.localeCompare(c, 'ar'));
    }

    function formatOwnerNamesForBuilding(buildingName) {
        const names = getOwnerNamesForBuilding(buildingName);
        return names.length ? names.join('، ') : '';
    }

    function persistReferenceData(refreshInsight = true) {
        localStorage.setItem('sfg_buildings_list', JSON.stringify(buildingsList));
        localStorage.setItem('sfg_owners_list', JSON.stringify(ownersList));
        localStorage.setItem('sfg_owner_building_map', JSON.stringify(ownerBuildingMap));
        localStorage.setItem('sfg_owner_profiles', JSON.stringify(ownerProfiles));
        refreshAddressBookFromSystem(false);
        saveDashboardAux();
        updateAuthHeaderBar();
        updateSummaryPanel();
        if (pageMode === 'dashboard') {
            renderOperationsTable();
            renderRegistryTable();
        } else {
            renderDocument(currentDoc);
        }
        if (refreshInsight && insightNavStack.length) renderInsightContent();
    }

    function getEmptyOwnerProfile() {
        return {
            fullName: '',
            fullNameEn: '',
            firstName: '',
            secondName: '',
            thirdName: '',
            tribe: '',
            civilId: '',
            idExpiryDate: '',
            phone: '',
            email: '',
            idCardAttachment: null
        };
    }

    function getEditableOwnerProfile(name = '') {
        if (name && ownerProfiles[name]) {
            return { ...getEmptyOwnerProfile(), ...ownerProfiles[name], fullName: toStr(ownerProfiles[name].fullName) || name };
        }
        if (name) {
            return { ...getEmptyOwnerProfile(), fullName: name };
        }
        return getEmptyOwnerProfile();
    }

    function buildOwnerFullName(parts) {
        return [parts.firstName, parts.secondName, parts.thirdName, parts.tribe].map((x) => toStr(x)).filter(Boolean).join(' ');
    }

    function normalizeOwnerAttachment(raw) {
        if (!raw) return null;
        if (typeof raw === 'string') {
            return { name: raw, type: '', dataUrl: '' };
        }
        if (typeof raw === 'object') {
            return {
                name: toStr(raw.name),
                type: toStr(raw.type),
                dataUrl: toStr(raw.dataUrl || raw.url || '')
            };
        }
        return null;
    }

    function normalizeBuildingAttachment(raw) {
        if (!raw) return null;
        if (typeof raw === 'string') {
            return { name: raw, type: '', dataUrl: '' };
        }
        if (typeof raw === 'object') {
            return {
                name: toStr(raw.name),
                type: toStr(raw.type),
                dataUrl: toStr(raw.dataUrl || raw.url || '')
            };
        }
        return null;
    }

    function openStoredAttachment(att, fallbackTitle = 'Attachment') {
        const attachment = att && att.dataUrl !== undefined ? att : normalizeOwnerAttachment(att) || normalizeBuildingAttachment(att);
        if (!attachment || !attachment.dataUrl) {
            alert('لا يوجد ملف محفوظ.');
            return;
        }
        const title = escHtml(attachment.name || fallbackTitle);
        const isImage = attachment.type.startsWith('image/') || attachment.dataUrl.startsWith('data:image/');
        const isPdf = attachment.type === 'application/pdf' || attachment.dataUrl.startsWith('data:application/pdf');
        const w = window.open('', '_blank');
        if (!w) {
            alert('تعذر فتح الملف. يرجى السماح بالنوافذ المنبثقة.');
            return;
        }
        const body = isImage
            ? `<div style="padding:16px;text-align:center"><img src="${attachment.dataUrl}" alt="${title}" style="max-width:100%;max-height:90vh;object-fit:contain"></div>`
            : isPdf
                ? `<embed src="${attachment.dataUrl}" type="application/pdf" style="width:100%;height:100vh">`
                : `<div style="padding:16px"><a href="${attachment.dataUrl}" download="${title}">تنزيل الملف / Download File</a></div>`;
        w.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <meta charset="utf-8">
                    <style>
                        body { margin: 0; font-family: Tahoma, Arial, sans-serif; background: #f8f8f8; }
                    </style>
                </head>
                <body>${body}</body>
            </html>
        `);
        w.document.close();
    }

    /** طباعة مرفق (صورة/PDF/غيره) في نافذة منفصلة ثم استدعاء onDone */
    function openStoredAttachmentAndPrint(att, caption, onDone) {
        const attachment = att && att.dataUrl !== undefined ? att : normalizeOwnerAttachment(att) || normalizeBuildingAttachment(att);
        if (!attachment || !attachment.dataUrl) {
            if (onDone) onDone();
            return;
        }
        const title = escHtml(attachment.name || caption || 'Attachment');
        const capHtml = escHtml(caption || attachment.name || 'Attachment');
        const isImage = (attachment.type && attachment.type.startsWith('image/')) || attachment.dataUrl.startsWith('data:image/');
        const isPdf = attachment.type === 'application/pdf' || attachment.dataUrl.startsWith('data:application/pdf');
        const w = window.open('', '_blank');
        if (!w) {
            alert('تعذر فتح الملف للطباعة — اسمح بالنوافذ المنبثقة.\nCould not open file for printing — allow pop-ups.');
            if (onDone) onDone();
            return;
        }
        const body = isImage
            ? `<div style="padding:16px;text-align:center"><p style="font-size:13px;font-weight:700;margin:0 0 12px">${capHtml}</p><img src="${attachment.dataUrl}" alt="${title}" style="max-width:100%;max-height:85vh;object-fit:contain"></div>`
            : isPdf
                ? `<div style="padding:8px"><p style="font-size:13px;font-weight:700;margin:0 0 8px">${capHtml}</p><embed src="${attachment.dataUrl}" type="application/pdf" style="width:100%;min-height:90vh;border:0"></div>`
                : `<div style="padding:16px"><p style="font-size:13px;font-weight:700">${capHtml}</p><p style="font-size:11px;color:#555">معاينة غير متاحة — استخدم التنزيل / Preview not available — use download.</p><a href="${attachment.dataUrl}" download="${title}">تنزيل / Download</a></div>`;
        w.document.write(`<!DOCTYPE html><html lang="ar"><head><meta charset="utf-8"><title>${title}</title><style>body{margin:0;font-family:Tajawal,Tahoma,sans-serif;background:#fff} @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style></head><body>${body}</body></html>`);
        w.document.close();
        const finish = () => {
            try { w.close(); } catch (e) {}
            if (onDone) setTimeout(onDone, 150);
        };
        const doPrint = () => {
            try { w.focus(); w.print(); } catch (e) {}
            w.addEventListener('afterprint', finish, { once: true });
            setTimeout(finish, 3200);
        };
        if (isPdf) setTimeout(doPrint, 800);
        else setTimeout(doPrint, 350);
    }

    function queuePrintAttachments(items, index = 0) {
        if (!items || !items.length || index >= items.length) return;
        const cur = items[index];
        openStoredAttachmentAndPrint(cur.att, cur.caption, () => {
            setTimeout(() => queuePrintAttachments(items, index + 1), 450);
        });
    }

    function collectBuildingProfileAttachments(profile, buildingLabel) {
        if (!profile) return [];
        const prefix = `${buildingLabel} — `;
        const out = [];
        const t = normalizeBuildingAttachment(profile.titleDeedAttachment);
        if (t && t.dataUrl) out.push({ att: t, caption: `${prefix}سند الملكية / Title deed` });
        const s = normalizeBuildingAttachment(profile.surveySketchAttachment);
        if (s && s.dataUrl) out.push({ att: s, caption: `${prefix}الرسم المساحي / Survey sketch` });
        return out;
    }

    function updateOwnerFullNamePreview() {}

    let _ownerLiveTranslateLock = false;
    function translateOwnerName(direction, force = false) {
        if (_ownerLiveTranslateLock) return;
        const ar = document.getElementById('ownerNameArInput');
        const en = document.getElementById('ownerNameEnInput');
        const live = document.getElementById('ownerLiveTranslate');
        if (!ar || !en) return;
        if (!force && live && !live.checked) return;
        _ownerLiveTranslateLock = true;
        if (direction === 'ar2en') en.value = transliterateArToEn(ar.value);
        else ar.value = transliterateEnToAr(en.value);
        _ownerLiveTranslateLock = false;
        updateOwnerFullNamePreview();
    }

    function collectOwnerProfileForm() {
        const fullName = toStr(document.getElementById('ownerNameArInput')?.value);
        const fullNameEn = toStr(document.getElementById('ownerNameEnInput')?.value);
        const existing = normalizeOwnerAttachment(ownerProfiles[ownerEditorState.originalName || fullName]?.idCardAttachment);
        const pending = window._pendingOwnerIdAttachment || null;
        return {
            fullName: fullName || transliterateEnToAr(fullNameEn),
            fullNameEn: fullNameEn || transliterateArToEn(fullName),
            firstName: '',
            secondName: '',
            thirdName: '',
            tribe: '',
            civilId: toStr(document.getElementById('ownerCivilIdInput')?.value),
            idExpiryDate: toStr(document.getElementById('ownerIdExpiryInput')?.value),
            phone: toStr(document.getElementById('ownerPhoneInput')?.value),
            email: toStr(document.getElementById('ownerEmailInput')?.value),
            idCardAttachment: pending || existing
        };
    }

    function onOwnerIdAttachmentSelected(input) {
        const file = input?.files?.[0];
        const label = document.getElementById('ownerIdAttachmentName');
        if (!file) {
            window._pendingOwnerIdAttachment = null;
            if (label) label.textContent = 'لم يتم اختيار ملف';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            window._pendingOwnerIdAttachment = {
                name: file.name,
                type: file.type || '',
                dataUrl: toStr(e.target?.result)
            };
            if (label) label.textContent = file.name;
        };
        reader.readAsDataURL(file);
    }

    function openOwnerIdAttachment() {
        const preview = normalizeOwnerAttachment(window._pendingOwnerIdAttachment || ownerProfiles[ownerEditorState.originalName || '']?.idCardAttachment);
        if (!preview || !preview.dataUrl) {
            alert('لا يوجد ملف بطاقة محفوظ.');
            return;
        }
        openStoredAttachment(preview, 'Owner ID Attachment');
    }

    function isImageAttachment(att) {
        const a = normalizeOwnerAttachment(att);
        return !!a && (a.type.startsWith('image/') || a.dataUrl.startsWith('data:image/'));
    }

    function isImageBuildingAttachment(att) {
        const a = normalizeBuildingAttachment(att);
        return !!a && (a.type.startsWith('image/') || a.dataUrl.startsWith('data:image/'));
    }

    function renderOwnerEditor(profile = null) {
        const p = profile || getEmptyOwnerProfile();
        const attachment = normalizeOwnerAttachment(p.idCardAttachment);
        const field = (label, control) => `
            <div style="display:flex;flex-direction:column;gap:4px">
                <label style="font-size:12px;font-weight:700;color:#444">${label}</label>
                ${control}
            </div>
        `;
        return `
            <div class="insight-nested" style="margin-bottom:12px">
                <h6>${ownerEditorState.originalName ? t('تعديل بيانات المالك', 'Edit owner details') : t('إضافة مالك جديد', 'Add new owner')}</h6>
                <div class="registry-form" style="display:grid;grid-template-columns:repeat(3,minmax(170px,1fr));gap:8px">
                    ${field(t('اسم المالك (عربي)', 'Owner name (Arabic)'), `
                        <input id="ownerNameArInput" value="${escHtml(p.fullName || '')}" oninput="translateOwnerName('ar2en')">
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
                            <button type="button" class="mini-btn" onclick="translateOwnerName('ar2en', true)">${t('↔ تحويل للإنجليزية', '↔ To English')}</button>
                        </div>
                    `)}
                    ${field(t('اسم المالك (English)', 'Owner name (English)'), `
                        <input id="ownerNameEnInput" value="${escHtml(p.fullNameEn || transliterateArToEn(p.fullName || ''))}" oninput="translateOwnerName('en2ar')">
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
                            <button type="button" class="mini-btn" onclick="translateOwnerName('en2ar', true)">${t('↔ تحويل للعربية', '↔ To Arabic')}</button>
                        </div>
                    `)}
                    ${field(t('الترجمة الفورية', 'Live transliteration'), `<label class="ud-print-label"><input type="checkbox" id="ownerLiveTranslate" checked> ${t('تفعيل التحويل أثناء الكتابة', 'Enable live conversion')}</label>`)}
                    ${field(t('الرقم المدني', 'Civil ID'), `<input id="ownerCivilIdInput" value="${escHtml(p.civilId || '')}">`)}
                    ${field(t('تاريخ انتهاء البطاقة', 'ID expiry date'), `<input id="ownerIdExpiryInput" type="date" value="${escHtml(p.idExpiryDate || '')}">`)}
                    ${field(t('رقم الهاتف', 'Phone number'), `<input id="ownerPhoneInput" value="${escHtml(p.phone || '')}">`)}
                    ${field(t('البريد الإلكتروني', 'Email'), `<input id="ownerEmailInput" value="${escHtml(p.email || '')}">`)}
                    ${field(t('إرفاق نسخة من البطاقة', 'Attach ID copy'), `
                        <input id="ownerIdAttachmentInput" type="file" accept=".pdf,image/*" onchange="onOwnerIdAttachmentSelected(this)">
                        <div style="font-size:12px;color:#555" id="ownerIdAttachmentName">${escHtml(attachment?.name || t('لم يتم اختيار ملف', 'No file selected'))}</div>
                        ${attachment?.dataUrl ? `<button type="button" class="mini-btn" onclick="openOwnerIdAttachment()">${t('فتح الملف الحالي', 'Open current file')}</button>` : ''}
                    `)}
                </div>
                <div class="registry-form" style="display:grid;grid-template-columns:auto auto;gap:8px;margin-top:8px">
                    <button type="button" class="btn-primary" onclick="saveOwnerFromDashboard()">${ownerEditorState.originalName ? t('حفظ التعديلات', 'Save changes') : t('حفظ المالك', 'Save owner')}</button>
                    <button type="button" class="btn-outline" onclick="closeOwnerEditor()">${t('إغلاق', 'Close')}</button>
                </div>
            </div>
        `;
    }

    function openOwnerEditor(name = '') {
        if (name && !ownerProfiles[name]) {
            ownerProfiles[name] = { ...getEmptyOwnerProfile(), fullName: name };
        }
        window._pendingOwnerIdAttachment = null;
        ownerEditorState = { open: true, originalName: name || '' };
        renderInsightContent();
    }

    function closeOwnerEditor() {
        window._pendingOwnerIdAttachment = null;
        ownerEditorState = { open: false, originalName: '' };
        renderInsightContent();
    }

    function saveOwnerFromDashboard() {
        if (!assertPermissionOrAlert('manage_owners', 'لا تملك صلاحية إدارة الملاك.', 'No permission to manage owners.')) return;
        const profile = collectOwnerProfileForm();
        const name = toStr(profile.fullName);
        if (!name) {
            alert(t('يرجى تعبئة اسم المالك بالعربية أو الإنجليزية.', 'Please enter owner name in Arabic or English.'));
            return;
        }
        const ov = validateOwnerProfileComplete(profile);
        if (!ov.ok) {
            alert(ov.message);
            return;
        }
        const originalName = ownerEditorState.originalName || '';
        if (originalName && originalName !== name) {
            delete ownerProfiles[originalName];
            const oldIdx = ownersList.indexOf(originalName);
            if (oldIdx >= 0) ownersList.splice(oldIdx, 1);
            if (ownerBuildingMap[originalName]) {
                ownerBuildingMap[name] = ownerBuildingMap[originalName];
                delete ownerBuildingMap[originalName];
            }
        }
        ownerProfiles[name] = profile;
        if (!ownersList.includes(name)) ownersList.push(name);
        if (!ownerBuildingMap[name]) ownerBuildingMap[name] = [];
        ownerEditorState = { open: false, originalName: '' };
        persistReferenceData();
    }

    function renderOwnerProfileSummary(ownerName) {
        const profile = getEditableOwnerProfile(ownerName);
        const attachment = normalizeOwnerAttachment(profile.idCardAttachment);
        const isPdfAttachment = !!attachment && (attachment.type === 'application/pdf' || String(attachment.dataUrl || '').startsWith('data:application/pdf'));
        const attachmentPreview = !attachment
            ? '-'
            : isImageAttachment(attachment)
                ? `
                    <div style="display:flex;flex-direction:column;gap:6px">
                        <div>${escHtml(attachment.name || t('صورة البطاقة', 'ID image'))}</div>
                        <button type="button" onclick="openOwnerIdAttachment()" title="${t('فتح الملف', 'Open file')}" style="border:0;padding:0;background:transparent;cursor:pointer;text-align:start">
                            <img src="${attachment.dataUrl}" alt="${t('نسخة البطاقة', 'ID copy')}" style="max-width:220px;max-height:160px;border:1px solid #ddd;border-radius:8px;object-fit:contain;background:#fff">
                        </button>
                    </div>
                `
                : isPdfAttachment
                    ? `
                        <div style="display:flex;flex-direction:column;gap:6px">
                            <div>${escHtml(attachment.name || t('ملف البطاقة', 'ID file'))}</div>
                            <button type="button" onclick="openOwnerIdAttachment()" title="${t('فتح الملف', 'Open file')}" style="border:0;padding:0;background:transparent;cursor:pointer;text-align:start">
                                <embed src="${attachment.dataUrl}" type="application/pdf" style="width:220px;height:160px;border:1px solid #ddd;border-radius:8px;background:#fff;pointer-events:none">
                            </button>
                        </div>
                    `
                    : `
                        <div style="display:flex;flex-direction:column;gap:6px">
                            <div>${escHtml(attachment.name || t('ملف البطاقة', 'ID file'))}</div>
                            <button type="button" onclick="openOwnerIdAttachment()" title="${t('فتح الملف', 'Open file')}" style="width:220px;min-height:110px;border:1px solid #ddd;border-radius:8px;background:#f7f7f7;cursor:pointer;padding:10px;text-align:start">
                                <div style="font-size:24px;line-height:1">📄</div>
                                <div style="font-size:12px;color:#344">${t('معاينة غير متاحة — اضغط للفتح', 'Preview unavailable — click to open')}</div>
                            </button>
                        </div>
                    `;
        return `
            <div class="insight-nested" style="margin-bottom:12px">
                <h6>${t('بيانات المالك', 'Owner details')}</h6>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;font-size:13px">
                    <div><strong>${t('الاسم الكامل', 'Full name')}:</strong> ${escHtml(profile.fullName || ownerName || '-')}</div>
                    <div><strong>${t('الاسم بالإنجليزية', 'Name in English')}:</strong> ${escHtml(profile.fullNameEn || transliterateArToEn(profile.fullName || ownerName || '') || '-')}</div>
                    <div><strong>${t('الاسم الأول', 'First name')}:</strong> ${escHtml(profile.firstName || '-')}</div>
                    <div><strong>${t('الاسم الثاني', 'Second name')}:</strong> ${escHtml(profile.secondName || '-')}</div>
                    <div><strong>${t('الاسم الثالث', 'Third name')}:</strong> ${escHtml(profile.thirdName || '-')}</div>
                    <div><strong>${t('القبيلة', 'Tribe')}:</strong> ${escHtml(profile.tribe || '-')}</div>
                    <div><strong>${t('الرقم المدني', 'Civil ID')}:</strong> ${escHtml(profile.civilId || '-')}</div>
                    <div><strong>${t('تاريخ انتهاء البطاقة', 'ID expiry date')}:</strong> ${escHtml(profile.idExpiryDate || '-')}</div>
                    <div><strong>${t('رقم الهاتف', 'Phone number')}:</strong> ${escHtml(profile.phone || '-')}</div>
                    <div><strong>${t('البريد الإلكتروني', 'Email')}:</strong> ${escHtml(profile.email || '-')}</div>
                    <div><strong>${t('نسخة البطاقة', 'ID copy')}:</strong> ${attachmentPreview}</div>
                </div>
            </div>
        `;
    }

    function collectBuildingProfileForm() {
        const buildingType = toStr(document.getElementById('buildingTypeInput')?.value) || 'متعدد الطوابق';
        const effectiveFloorCount = buildingType === 'فيلا' ? 1 : Number(document.getElementById('buildingFloorCountInput')?.value || 0);
        const currentKey = buildingEditorState.originalName || toStr(document.getElementById('buildingNameInput')?.value);
        const existing = buildingProfiles[currentKey] || {};
        const profile = {
            name: toStr(document.getElementById('buildingNameInput')?.value),
            buildingType,
            buildingNo: toStr(document.getElementById('buildingNoInput')?.value),
            plotNo: toStr(document.getElementById('buildingPlotNoInput')?.value),
            complexNo: toStr(document.getElementById('buildingComplexNoInput')?.value),
            landUse: toStr(document.getElementById('buildingLandUseInput')?.value),
            titleDeedAttachment: window._pendingBuildingTitleDeedAttachment || normalizeBuildingAttachment(existing.titleDeedAttachment),
            surveySketchAttachment: window._pendingBuildingSurveySketchAttachment || normalizeBuildingAttachment(existing.surveySketchAttachment),
            googleMapsUrl: toStr(document.getElementById('buildingGoogleMapsUrlInput')?.value),
            electricityMeter: toStr(document.getElementById('buildingElectricityMeterInput')?.value),
            waterMeter: toStr(document.getElementById('buildingWaterMeterInput')?.value),
            internetNo: toStr(document.getElementById('buildingInternetNoInput')?.value),
            fireWaterMeter: toStr(document.getElementById('buildingFireWaterMeterInput')?.value),
            fireElectricityMeter: toStr(document.getElementById('buildingFireElectricityMeterInput')?.value),
            wayNo: toStr(document.getElementById('buildingWayNoInput')?.value),
            sketchNo: toStr(document.getElementById('buildingSketchNoInput')?.value),
            governorate: toStr(document.getElementById('buildingGovernorateInput')?.value),
            wilayat: toStr(document.getElementById('buildingWilayatInput')?.value),
            area: toStr(document.getElementById('buildingAreaInput')?.value),
            floorCount: effectiveFloorCount,
            floors: []
        };
        document.querySelectorAll('.floor-editor-row').forEach((row) => {
            const selectedTypes = Array.from(row.querySelectorAll('[data-floor-field="type-check"]:checked')).map((x) => toStr(x.value));
            const unitRows = Array.from(row.querySelectorAll('.unit-detail-row')).map((uRow) => ({
                number: toStr(uRow.querySelector('[data-unit-field="number"]')?.value),
                type: toStr(uRow.querySelector('[data-unit-field="type"]')?.value) || selectedTypes[0] || 'Flat',
                electricity: toStr(uRow.querySelector('[data-unit-field="electricity"]')?.value),
                water: toStr(uRow.querySelector('[data-unit-field="water"]')?.value)
            })).filter((x) => x.number);
            profile.floors.push({
                name: toStr(row.querySelector('[data-floor-field="name"]')?.value),
                selectedTypes: selectedTypes.length ? selectedTypes : ['Flat'],
                unitCount: Number(row.querySelector('[data-floor-field="count"]')?.value || unitRows.length || 0),
                units: unitRows.map((x) => x.number),
                unitsDetailed: unitRows
            });
        });
        return profile;
    }

    function getEmptyBuildingProfile() {
        return {
            name: '',
            buildingType: 'متعدد الطوابق',
            buildingNo: '',
            plotNo: '',
            complexNo: '',
            landUse: '',
            titleDeedAttachment: null,
            surveySketchAttachment: null,
            googleMapsUrl: '',
            electricityMeter: '',
            waterMeter: '',
            internetNo: '',
            fireWaterMeter: '',
            fireElectricityMeter: '',
            wayNo: '',
            sketchNo: '',
            governorate: '',
            wilayat: '',
            area: '',
            floorCount: 0,
            floors: [],
            createdAt: '',
            createdBy: '',
            updatedAt: '',
            updatedBy: ''
        };
    }

    function guessBuildingProfileFromExistingData(name) {
        const profile = getEmptyBuildingProfile();
        profile.name = toStr(name);

        const units = getUnitsData().filter((u) => toStr(u.building) === toStr(name));
        const plotMatch = profile.name.match(/plot\s*([\w/-]+)/i);
        const buildingMatch = profile.name.match(/building\s*([\w/-]+)/i);

        profile.plotNo = plotMatch ? toStr(plotMatch[1]) : '';
        profile.buildingNo = buildingMatch ? toStr(buildingMatch[1]) : '';
        profile.area = profile.name
            .replace(/plot\s*[\w/-]+/i, '')
            .replace(/building\s*[\w/-]+/i, '')
            .replace(/,+/g, ' ')
            .trim();

        profile.buildingType = 'متعدد الطوابق';
        const floorMap = {};
        units.forEach((u) => {
            const floorName = toStr(u.floor) || 'غير محدد';
            if (!floorMap[floorName]) {
                floorMap[floorName] = {
                    name: floorName,
                    selectedTypes: [],
                    unitsDetailed: []
                };
            }
            const type = toStr(u.unitType) || 'Flat';
            if (!floorMap[floorName].selectedTypes.includes(type)) floorMap[floorName].selectedTypes.push(type);
            floorMap[floorName].unitsDetailed.push({ number: toStr(u.unit), type, electricity: toStr(u.electricity), water: toStr(u.water) });
        });

        profile.floors = Object.values(floorMap).map((floor) => ({
            name: floor.name,
            selectedTypes: floor.selectedTypes.length ? floor.selectedTypes : ['Flat'],
            unitCount: floor.unitsDetailed.filter((x) => x.number).length,
            units: [...new Set(floor.unitsDetailed.map((x) => x.number).filter(Boolean))],
            unitsDetailed: floor.unitsDetailed
        }));
        profile.floorCount = profile.floors.length;

        const legacyNow = new Date().toISOString();
        profile.createdAt = legacyNow;
        profile.createdBy = 'استيراد من الجدول القديم / Imported from legacy units';
        profile.updatedAt = legacyNow;
        profile.updatedBy = profile.createdBy;

        return profile;
    }

    function getEditableBuildingProfile(name = '') {
        const resolved = resolveBuildingProfileKey(name) || name;
        if (resolved && buildingProfilesShadow[resolved]) {
            const stored = buildingProfilesShadow[resolved];
            return {
                ...getEmptyBuildingProfile(),
                ...stored,
                buildingType: toStr(stored.buildingType) || 'متعدد الطوابق',
                floors: Array.isArray(stored.floors) ? stored.floors.map((f, idx) => normalizeFloorData(f, idx)) : []
            };
        }
        if (resolved && buildingProfiles[resolved]) {
            const stored = buildingProfiles[resolved];
            return {
                ...getEmptyBuildingProfile(),
                ...stored,
                buildingType: toStr(stored.buildingType) || 'متعدد الطوابق',
                floors: Array.isArray(stored.floors) ? stored.floors.map((f, idx) => normalizeFloorData(f, idx)) : []
            };
        }
        if (resolved) return guessBuildingProfileFromExistingData(resolved);
        return getEmptyBuildingProfile();
    }

    function resolveBuildingProfileKey(buildingName) {
        const target = toStr(buildingName).trim();
        if (!target) return '';
        if (buildingProfiles[target]) return target;
        const targetLc = target.toLowerCase();
        const keys = Object.keys(buildingProfiles);
        const direct = keys.find((k) => toStr(k).trim().toLowerCase() === targetLc);
        if (direct) return direct;
        const byProfileName = keys.find((k) => toStr(buildingProfiles[k]?.name).trim().toLowerCase() === targetLc);
        if (byProfileName) return byProfileName;
        const pbKey = extractPlotBuildingKey(target);
        if (pbKey) {
            const matches = keys.filter((k) => extractPlotBuildingKey(k) === pbKey || extractPlotBuildingKey(buildingProfiles[k]?.name) === pbKey);
            if (matches.length) {
                matches.sort((a, b) => {
                    const ta = new Date(toStr(buildingProfiles[a]?.updatedAt) || 0).getTime() || 0;
                    const tb = new Date(toStr(buildingProfiles[b]?.updatedAt) || 0).getTime() || 0;
                    return tb - ta;
                });
                return matches[0];
            }
        }
        return '';
    }

    function buildOptions(options, selectedValue = '', placeholder = 'اختر') {
        return [`<option value="">${placeholder}</option>`]
            .concat(
                options.map((item) => `<option value="${escHtml(item)}" ${item === selectedValue ? 'selected' : ''}>${escHtml(item)}</option>`)
            )
            .join('');
    }

    function getGovernorateOptions() {
        return Object.keys(OMAN_LOCATION_DATA).sort((a, b) => a.localeCompare(b, 'ar'));
    }

    function getWilayatOptions(governorate) {
        if (!governorate || !OMAN_LOCATION_DATA[governorate]) return [];
        return Object.keys(OMAN_LOCATION_DATA[governorate]).sort((a, b) => a.localeCompare(b, 'ar'));
    }

    function getAreaOptions(governorate, wilayat) {
        if (!governorate || !wilayat || !OMAN_LOCATION_DATA[governorate] || !OMAN_LOCATION_DATA[governorate][wilayat]) return [];
        return OMAN_LOCATION_DATA[governorate][wilayat];
    }

    function onBuildingGovernorateChange() {
        const governorate = toStr(document.getElementById('buildingGovernorateInput')?.value);
        const wilayatSelect = document.getElementById('buildingWilayatInput');
        const areaSelect = document.getElementById('buildingAreaInput');
        if (wilayatSelect) {
            wilayatSelect.innerHTML = buildOptions(getWilayatOptions(governorate), '', t('اختر الولاية', 'Select wilayat'));
        }
        if (areaSelect) {
            areaSelect.innerHTML = buildOptions([], '', t('اختر المنطقة', 'Select area'));
        }
    }

    function onBuildingWilayatChange() {
        const governorate = toStr(document.getElementById('buildingGovernorateInput')?.value);
        const wilayat = toStr(document.getElementById('buildingWilayatInput')?.value);
        const areaSelect = document.getElementById('buildingAreaInput');
        if (areaSelect) {
            areaSelect.innerHTML = buildOptions(getAreaOptions(governorate, wilayat), '', t('اختر المنطقة', 'Select area'));
        }
    }

    function onBuildingTypeChange() {
        const type = toStr(document.getElementById('buildingTypeInput')?.value) || 'متعدد الطوابق';
        const floorWrap = document.getElementById('buildingFloorCountWrap');
        const countInput = document.getElementById('buildingFloorCountInput');
        if (floorWrap) floorWrap.style.display = type === 'فيلا' ? 'none' : 'flex';
        if (countInput && type === 'فيلا' && !countInput.value) countInput.value = '1';
        openBuildingFloorsDesigner();
    }

    function onBuildingAttachmentSelected(input, kind) {
        const file = input?.files?.[0];
        const label = document.getElementById(kind === 'titleDeed' ? 'buildingTitleDeedAttachmentName' : 'buildingSurveySketchAttachmentName');
        if (!file) {
            if (kind === 'titleDeed') window._pendingBuildingTitleDeedAttachment = null;
            if (kind === 'surveySketch') window._pendingBuildingSurveySketchAttachment = null;
            if (label) label.textContent = t('لم يتم اختيار ملف', 'No file selected');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const payload = {
                name: file.name,
                type: file.type || '',
                dataUrl: toStr(e.target?.result)
            };
            if (kind === 'titleDeed') window._pendingBuildingTitleDeedAttachment = payload;
            if (kind === 'surveySketch') window._pendingBuildingSurveySketchAttachment = payload;
            if (label) label.textContent = file.name;
        };
        reader.readAsDataURL(file);
    }

    function openBuildingAttachment(kind) {
        const key = buildingEditorState.originalName || '';
        const existing = buildingProfiles[key] || {};
        const attachment = normalizeBuildingAttachment(
            kind === 'titleDeed'
                ? (window._pendingBuildingTitleDeedAttachment || existing.titleDeedAttachment)
                : (window._pendingBuildingSurveySketchAttachment || existing.surveySketchAttachment)
        );
        if (!attachment || !attachment.dataUrl) {
            alert('لا يوجد ملف محفوظ.');
            return;
        }
        openStoredAttachment(attachment, kind === 'titleDeed' ? 'Title Deed Attachment' : 'Survey Sketch Attachment');
    }

    function renderUnitDetailRow(unit, unitIdx, allowedTypes) {
        const labels = getUnitTypeChoices()
            .filter((x) => !allowedTypes.length || allowedTypes.includes(x.value))
            .map((x) => `<option value="${x.value}" ${x.value === toStr(unit.type) ? 'selected' : ''}>${x.label}</option>`)
            .join('');
        return `
            <div class="unit-detail-row" data-unit-index="${unitIdx}" style="display:grid;grid-template-columns:auto 1fr 1fr 1fr 1fr;gap:8px;align-items:end;margin-top:8px">
                <div style="font-size:12px;color:#555">${t('الوحدة', 'Unit')} ${unitIdx + 1}</div>
                <div style="display:flex;flex-direction:column;gap:4px">
                    <label style="font-size:12px;font-weight:700;color:#444">${t('رقم الوحدة', 'Unit number')}</label>
                    <input data-unit-field="number" value="${escHtml(unit.number || '')}" placeholder="${t('مثال: 100', 'Example: 100')}" oninput="onUnitNumberSeedChange(this)">
                </div>
                <div style="display:flex;flex-direction:column;gap:4px">
                    <label style="font-size:12px;font-weight:700;color:#444">${t('النوع', 'Type')}</label>
                    <select data-unit-field="type">${labels}</select>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px">
                    <label style="font-size:12px;font-weight:700;color:#444">${t('رقم حساب الكهرباء', 'Electricity account no.')}</label>
                    <input data-unit-field="electricity" value="${escHtml(unit.electricity || '')}">
                </div>
                <div style="display:flex;flex-direction:column;gap:4px">
                    <label style="font-size:12px;font-weight:700;color:#444">${t('رقم حساب الماء', 'Water account no.')}</label>
                    <input data-unit-field="water" value="${escHtml(unit.water || '')}">
                </div>
            </div>
        `;
    }

    function getAllowedTypesForFloor(row) {
        return Array.from(row.querySelectorAll('[data-floor-field="type-check"]:checked')).map((x) => toStr(x.value));
    }

    function syncFloorUnitRows(row) {
        if (!row) return;
        const host = row.querySelector('.units-detail-host');
        const count = Math.max(0, Number(row.querySelector('[data-floor-field="count"]')?.value || 0));
        const allowedTypes = getAllowedTypesForFloor(row);
        const existing = Array.from(row.querySelectorAll('.unit-detail-row')).map((uRow) => ({
            number: toStr(uRow.querySelector('[data-unit-field="number"]')?.value),
            type: toStr(uRow.querySelector('[data-unit-field="type"]')?.value) || allowedTypes[0] || 'Flat',
            electricity: toStr(uRow.querySelector('[data-unit-field="electricity"]')?.value),
            water: toStr(uRow.querySelector('[data-unit-field="water"]')?.value)
        }));
        const normalized = [];
        for (let i = 0; i < count; i++) {
            normalized.push(existing[i] || {
                number: '',
                type: allowedTypes[0] || 'Flat',
                electricity: '',
                water: ''
            });
        }
        host.innerHTML = normalized.map((unit, idx) => renderUnitDetailRow(unit, idx, allowedTypes)).join('');
        autoSequenceFloorUnits(row);
    }

    function autoSequenceFloorUnits(row) {
        if (!row) return;
        const numberInputs = Array.from(row.querySelectorAll('[data-unit-field="number"]'));
        if (!numberInputs.length) return;
        const first = toStr(numberInputs[0].value);
        if (!/^\d+$/.test(first)) return;
        const seed = Number(first);
        for (let i = 1; i < numberInputs.length; i++) {
            if (!toStr(numberInputs[i].value) || numberInputs[i].dataset.autoGenerated === '1') {
                numberInputs[i].value = String(seed + i);
                numberInputs[i].dataset.autoGenerated = '1';
            }
        }
        numberInputs[0].dataset.autoGenerated = '0';
    }

    function onUnitNumberSeedChange(input) {
        const row = input.closest('.floor-editor-row');
        if (!row) return;
        const unitRow = input.closest('.unit-detail-row');
        if (unitRow && unitRow.dataset.unitIndex === '0') {
            autoSequenceFloorUnits(row);
        } else if (input.value) {
            input.dataset.autoGenerated = '0';
        }
    }

    function onFloorUnitCountChange(input) {
        syncFloorUnitRows(input.closest('.floor-editor-row'));
    }

    function onFloorTypeChecksChange(input) {
        syncFloorUnitRows(input.closest('.floor-editor-row'));
    }

    function renderBuildingEditor(profile = null) {
        const p = profile || getEmptyBuildingProfile();
        const titleDeedAttachment = normalizeBuildingAttachment(p.titleDeedAttachment);
        const surveySketchAttachment = normalizeBuildingAttachment(p.surveySketchAttachment);
        const buildingType = toStr(p.buildingType) || 'متعدد الطوابق';
        const floorCount = buildingType === 'فيلا' ? 1 : Number(p.floorCount || (p.floors || []).length || 0);
        const currentName = buildingEditorState.originalName || p.name || '';
        const selectedOwner = ownersList.find((o) => isBuildingLinkedToOwner(o, currentName)) || '';
        const governorates = getGovernorateOptions();
        const wilayats = getWilayatOptions(p.governorate);
        const areas = getAreaOptions(p.governorate, p.wilayat);
        const field = (label, control) => `
            <div style="display:flex;flex-direction:column;gap:4px">
                <label style="font-size:12px;font-weight:700;color:#444">${label}</label>
                ${control}
            </div>
        `;
        return `
            <div class="insight-nested" style="margin-bottom:12px">
                <h6>${buildingEditorState.originalName ? t('تعديل بيانات العقار', 'Edit property details') : t('إضافة عقار جديد', 'Add new property')}</h6>
                <div class="registry-form" style="display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:8px">
                    ${field('اسم العقار / المبنى / Property name', `<input id="buildingNameInput" value="${escHtml(p.name || '')}">`)}
                    ${field('نوع المبنى / Building type', `<select id="buildingTypeInput" onchange="onBuildingTypeChange()">${buildOptions(getBuildingTypeOptions(), buildingType, 'اختر نوع المبنى / Select building type')}</select>`)}
                    ${field('رقم المبنى / Building no.', `<input id="buildingNoInput" value="${escHtml(p.buildingNo || '')}">`)}
                    ${field('رقم القطعة / Plot no.', `<input id="buildingPlotNoInput" value="${escHtml(p.plotNo || '')}">`)}
                    ${field('رقم المجمع / Complex no.', `<input id="buildingComplexNoInput" value="${escHtml(p.complexNo || '')}">`)}
                    ${field('نوع استعمال الأرض / Land use type', `<select id="buildingLandUseInput">${buildOptions(LAND_USE_OPTIONS, p.landUse, 'اختر نوع الاستعمال / Select land use')}</select>`)}
                    ${field('إرفاق نسخة من سند الملكية / Title deed attachment', `
                        <input id="buildingTitleDeedAttachmentInput" type="file" accept=".pdf,image/*" onchange="onBuildingAttachmentSelected(this, 'titleDeed')">
                        <div style="font-size:12px;color:#555" id="buildingTitleDeedAttachmentName">${escHtml(titleDeedAttachment?.name || t('لم يتم اختيار ملف', 'No file selected'))}</div>
                        ${titleDeedAttachment?.dataUrl ? `<button type="button" class="mini-btn" onclick="openBuildingAttachment('titleDeed')">${t('فتح الملف الحالي', 'Open current file')}</button>` : ''}
                    `)}
                    ${field('إرفاق نسخة من الرسم المساحي / Survey sketch attachment', `
                        <input id="buildingSurveySketchAttachmentInput" type="file" accept=".pdf,image/*" onchange="onBuildingAttachmentSelected(this, 'surveySketch')">
                        <div style="font-size:12px;color:#555" id="buildingSurveySketchAttachmentName">${escHtml(surveySketchAttachment?.name || t('لم يتم اختيار ملف', 'No file selected'))}</div>
                        ${surveySketchAttachment?.dataUrl ? `<button type="button" class="mini-btn" onclick="openBuildingAttachment('surveySketch')">${t('فتح الملف الحالي', 'Open current file')}</button>` : ''}
                    `)}
                    ${field('رابط موقع المبنى في جوجل / Google Maps URL', `<input id="buildingGoogleMapsUrlInput" value="${escHtml(p.googleMapsUrl || '')}" placeholder="https://maps.google.com/...">`)}
                    ${field('رقم عداد الكهرباء / Electricity meter no.', `<input id="buildingElectricityMeterInput" value="${escHtml(p.electricityMeter || '')}">`)}
                    ${field('رقم عداد الماء / Water meter no.', `<input id="buildingWaterMeterInput" value="${escHtml(p.waterMeter || '')}">`)}
                    ${field('رقم الانترنت / Internet no.', `<input id="buildingInternetNoInput" value="${escHtml(p.internetNo || '')}">`)}
                    ${field('رقم عداد ماء الحريق / Fire water meter no.', `<input id="buildingFireWaterMeterInput" value="${escHtml(p.fireWaterMeter || '')}">`)}
                    ${field('رقم عداد الكهرباء الحريق / Fire electricity meter no.', `<input id="buildingFireElectricityMeterInput" value="${escHtml(p.fireElectricityMeter || '')}">`)}
                    ${field('رقم السكة/الزقاق / Way no.', `<input id="buildingWayNoInput" value="${escHtml(p.wayNo || '')}">`)}
                    ${field('رقم الرسم المساحي (الكروكي) / Sketch no.', `<input id="buildingSketchNoInput" value="${escHtml(p.sketchNo || '')}">`)}
                    ${field('المحافظة / Governorate', `<select id="buildingGovernorateInput" onchange="onBuildingGovernorateChange()">${buildOptions(governorates, p.governorate, 'اختر المحافظة / Select governorate')}</select>`)}
                    ${field('الولاية / Wilayat', `<select id="buildingWilayatInput" onchange="onBuildingWilayatChange()">${buildOptions(wilayats, p.wilayat, 'اختر الولاية / Select wilayat')}</select>`)}
                    ${field('المنطقة / Area', `<select id="buildingAreaInput">${buildOptions(areas, p.area, 'اختر المنطقة / Select area')}</select>`)}
                    <div id="buildingFloorCountWrap" style="display:${buildingType === 'فيلا' ? 'none' : 'flex'};flex-direction:column;gap:4px">
                        <label style="font-size:12px;font-weight:700;color:#444">${t('عدد الطوابق', 'Number of floors')}</label>
                        <input id="buildingFloorCountInput" type="number" min="0" value="${floorCount}" oninput="openBuildingFloorsDesigner()">
                    </div>
                    ${field('ربط بمالك / Link to owner', `<select id="buildingOwnerSelect">
                        <option value="">ربط بمالك بشكل اختياري / Optional owner link</option>
                        ${ownersList.map((o) => `<option value="${escHtml(o)}" ${o === selectedOwner ? 'selected' : ''}>${escHtml(o)}</option>`).join('')}
                    </select>`)}
                </div>
                <div class="registry-form" style="display:grid;grid-template-columns:auto auto;gap:8px;margin-top:8px">
                    <button type="button" class="btn-primary" onclick="addBuildingFromDashboard()">${buildingEditorState.originalName ? t('حفظ التعديلات', 'Save changes') : t('حفظ العقار', 'Save property')}</button>
                    <button type="button" class="btn-outline" onclick="closeBuildingEditor()">${t('إغلاق', 'Close')}</button>
                </div>
                <div id="buildingFloorsDesigner" style="margin-top:10px">${floorCount ? `<div style="font-size:12px;color:#555;margin-bottom:6px">${t('إعداد الطوابق والوحدات يظهر تلقائياً حسب العدد المدخل', 'Floors and units setup appears automatically based on entered count')}</div>${renderFloorDesignerRows(p.floors || [])}` : `<p style="font-size:12px;color:#777">${t('أدخل عدد الطوابق لتظهر لك حقول الطوابق والوحدات تلقائياً.', 'Enter number of floors to show floor and unit fields automatically.')}</p>`}</div>
                <div style="margin-top:10px">
                    <label style="display:block;font-size:12px;font-weight:700;color:#444;margin-bottom:4px">${t('استيراد مبانٍ متعددة', 'Import multiple buildings')}</label>
                    <textarea id="buildingsImportText" placeholder="${t('كل مبنى في سطر مستقل', 'Each building on a separate line')}" style="width:100%;min-height:90px"></textarea>
                    <div class="registry-form" style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:8px">
                        <div style="display:flex;flex-direction:column;gap:4px">
                            <label style="font-size:12px;font-weight:700;color:#444">${t('مالك الربط للمباني المستوردة', 'Owner link for imported buildings')}</label>
                            <select id="buildingsImportOwnerSelect">
                                <option value="">${t('ربط جميع المباني المستوردة بمالك واحد - اختياري', 'Link all imported buildings to one owner - optional')}</option>
                                ${ownersList.map((o) => `<option value="${escHtml(o)}">${escHtml(o)}</option>`).join('')}
                            </select>
                        </div>
                        <button type="button" class="btn-outline" onclick="importBuildingsFromDashboard()">${t('استيراد المباني', 'Import buildings')}</button>
                    </div>
                </div>
            </div>
        `;
    }

    function openBuildingEditor(name = '') {
        window._pendingBuildingTitleDeedAttachment = null;
        window._pendingBuildingSurveySketchAttachment = null;
        const resolved = resolveBuildingProfileKey(name) || name || '';
        buildingEditorState = { open: true, originalName: resolved };
        renderInsightContent();
    }

    function closeBuildingEditor() {
        window._pendingBuildingTitleDeedAttachment = null;
        window._pendingBuildingSurveySketchAttachment = null;
        buildingEditorState = { open: false, originalName: '' };
        renderInsightContent();
    }

    function renderFloorDesignerRows(floors = []) {
        const typeChoices = getUnitTypeChoices();
        return floors.map((rawFloor, idx) => {
            const floor = normalizeFloorData(rawFloor, idx);
            const allowedTypes = floor.selectedTypes || [];
            const sourceRows = (floor.unitsDetailed && floor.unitsDetailed.length)
                ? floor.unitsDetailed
                : Array.from({ length: Number(floor.unitCount || 0) }, () => ({ number: '', type: allowedTypes[0] || 'Flat', electricity: '', water: '' }));
            const detailRows = sourceRows.map((u, unitIdx) => renderUnitDetailRow(u, unitIdx, allowedTypes)).join('');
            return `
                <div class="floor-editor-row insight-nested" data-floor-index="${idx}" style="margin-top:8px;padding:10px;border:1px solid #ddd;border-radius:10px">
                    <div style="font-weight:700;margin-bottom:8px">الطابق ${idx + 1}</div>
                    <div class="registry-form" style="display:grid;grid-template-columns:1.2fr .8fr;gap:8px">
                        <div style="display:flex;flex-direction:column;gap:4px">
                            <label style="font-size:12px;font-weight:700;color:#444">اسم الطابق</label>
                            <input data-floor-field="name" value="${escHtml(floor.name || '')}">
                        </div>
                        <div style="display:flex;flex-direction:column;gap:4px">
                            <label style="font-size:12px;font-weight:700;color:#444">عدد الوحدات</label>
                            <input type="number" min="0" data-floor-field="count" value="${Number(floor.unitCount || (floor.unitsDetailed || []).length || 0)}" oninput="onFloorUnitCountChange(this)">
                        </div>
                    </div>
                    <div style="margin-top:10px">
                        <div style="font-size:12px;font-weight:700;color:#444;margin-bottom:6px">أنواع الوحدات المتاحة في هذا الطابق</div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap">
                            ${typeChoices.map((choice) => `
                                <label style="display:flex;align-items:center;gap:4px;font-size:12px">
                                    <input type="checkbox" data-floor-field="type-check" value="${choice.value}" ${floor.selectedTypes.includes(choice.value) ? 'checked' : ''} onchange="onFloorTypeChecksChange(this)">
                                    <span>${choice.label}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div style="margin-top:10px">
                        <div style="font-size:12px;font-weight:700;color:#444;margin-bottom:6px">الوحدات التفصيلية</div>
                        <div class="units-detail-host">${detailRows}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function openBuildingFloorsDesigner() {
        const type = toStr(document.getElementById('buildingTypeInput')?.value) || 'متعدد الطوابق';
        const countInput = document.getElementById('buildingFloorCountInput');
        const host = document.getElementById('buildingFloorsDesigner');
        if (!host) return;
        if (type === 'فيلا') {
            host.innerHTML = '';
            return;
        }
        const count = type === 'فيلا' ? 1 : Math.max(0, Number(countInput?.value || 0));
        const current = collectBuildingProfileForm().floors;
        const floors = [];
        for (let i = 0; i < count; i++) floors.push(normalizeFloorData(current[i] || createEmptyFloor(i), i));
        host.innerHTML = count
            ? `<div style="font-size:12px;color:#555;margin-bottom:6px">إعداد الطوابق والوحدات</div>${renderFloorDesignerRows(floors)}`
            : '<p style="font-size:12px;color:#777">أدخل عدد الطوابق لتظهر لك الحقول تلقائياً.</p>';
    }

    function validateBuildingProfileComplete(profile) {
        const missing = [];
        const add = (ar, en) => missing.push(`${ar} / ${en}`);
        const t = (v) => toStr(v);
        if (!t(profile.name)) add('اسم العقار', 'Building name');
        if (!t(profile.buildingType)) add('نوع المبنى', 'Building type');
        if (!t(profile.buildingNo)) add('رقم المبنى', 'Building number');
        if (!t(profile.plotNo)) add('رقم القطعة', 'Plot number');
        if (!t(profile.complexNo)) add('رقم المجمع', 'Complex number');
        if (!t(profile.landUse)) add('نوع استعمال الأرض', 'Land use');
        const td = normalizeBuildingAttachment(profile.titleDeedAttachment);
        const ss = normalizeBuildingAttachment(profile.surveySketchAttachment);
        if (!td || !td.dataUrl) add('نسخة سند الملكية', 'Title deed attachment');
        if (!ss || !ss.dataUrl) add('نسخة الرسم المساحي', 'Survey sketch attachment');
        if (!t(profile.googleMapsUrl)) add('رابط الموقع (Google Maps)', 'Google Maps URL');
        if (!t(profile.electricityMeter)) add('رقم عداد الكهرباء العام', 'Main electricity meter');
        if (!t(profile.waterMeter)) add('رقم عداد الماء العام', 'Main water meter');
        if (!t(profile.internetNo)) add('رقم الانترنت', 'Internet number');
        if (!t(profile.fireWaterMeter)) add('رقم عداد ماء الحريق', 'Fire water meter');
        if (!t(profile.fireElectricityMeter)) add('رقم عداد كهرباء الحريق', 'Fire electricity meter');
        if (!t(profile.wayNo)) add('رقم السكة/الزقاق', 'Way/lane number');
        if (!t(profile.sketchNo)) add('رقم الرسم المساحي (الكروكي)', 'Survey sketch number');
        if (!t(profile.governorate)) add('المحافظة', 'Governorate');
        if (!t(profile.wilayat)) add('الولاية', 'Wilayat');
        if (!t(profile.area)) add('المنطقة', 'Area');
        const floors = Array.isArray(profile.floors) ? profile.floors.map((f, i) => normalizeFloorData(f, i)) : [];
        if (toStr(profile.buildingType) !== 'فيلا') {
            if (!floors.length) add('الطوابق والوحدات', 'Floors & units');
            floors.forEach((floor, fi) => {
                if (!t(floor.name)) add(`اسم الطابق ${fi + 1}`, `Floor ${fi + 1} name`);
                if (!floor.selectedTypes || !floor.selectedTypes.length) add(`أنواع الوحدات — طابق ${fi + 1}`, `Unit types — floor ${fi + 1}`);
                const ud = (floor.unitsDetailed || []).filter((x) => toStr(x.number));
                if (!ud.length) add(`وحدات الطابق ${fi + 1}`, `Units on floor ${fi + 1}`);
                ud.forEach((unit) => {
                    if (!t(unit.electricity)) add(`رقم كهرباء الوحدة ${t(unit.number)}`, 'Unit electricity account');
                    if (!t(unit.water)) add(`رقم ماء الوحدة ${t(unit.number)}`, 'Unit water account');
                });
            });
        }
        if (missing.length) {
            const msg = 'يرجى إكمال الحقول الإلزامية التالية قبل حفظ العقار:\nPlease complete the required fields:\n\n• ' + missing.join('\n• ');
            return { ok: false, message: msg };
        }
        return { ok: true, message: '' };
    }

    function validateBuildingProfileForReservation(profile) {
        const missing = [];
        const add = (ar, en) => missing.push(`${ar} / ${en}`);
        const t = (v) => toStr(v);
        if (!t(profile.name)) add('اسم العقار', 'Building name');
        if (!t(profile.buildingNo)) add('رقم المبنى', 'Building number');
        if (!t(profile.plotNo)) add('رقم القطعة', 'Plot number');
        if (!t(profile.landUse)) add('نوع استعمال الأرض', 'Land use');
        const floors = Array.isArray(profile.floors) ? profile.floors.map((f, i) => normalizeFloorData(f, i)) : [];
        if (!floors.length) add('الطوابق والوحدات', 'Floors & units');
        return { ok: missing.length === 0, missing };
    }

    function validateOwnerProfileComplete(profile) {
        const missing = [];
        const add = (ar, en) => missing.push(`${ar} / ${en}`);
        const t = (v) => toStr(v);
        if (!t(profile.fullName) && !t(profile.fullNameEn)) add('اسم المالك (عربي/English)', 'Owner name (Arabic/English)');
        if (!t(profile.civilId)) add('الرقم المدني', 'Civil ID');
        if (!t(profile.phone)) add('رقم الهاتف', 'Phone');
        if (!t(profile.email)) add('البريد الإلكتروني', 'Email');
        if (!t(profile.idExpiryDate)) add('تاريخ انتهاء البطاقة', 'ID expiry date');
        const idc = normalizeOwnerAttachment(profile.idCardAttachment);
        if (!idc || !idc.dataUrl) add('نسخة من البطاقة الشخصية', 'ID card copy');
        if (missing.length) {
            const msg = 'يرجى إكمال الحقول الإلزامية للمالك:\nPlease complete required owner fields:\n\n• ' + missing.join('\n• ');
            return { ok: false, message: msg };
        }
        return { ok: true, message: '' };
    }

    function upsertBuildingProfile(profile) {
        const name = makeBuildingLabel(profile);
        if (!name) {
            alert('يرجى إدخال اسم العقار أو رقم المبنى مع بيانات كافية.');
            return false;
        }
        const originalName = buildingEditorState.originalName || '';
        profile.name = name;
        const now = new Date().toISOString();
        const actor = getCurrentActorLabel();

        let prev = null;
        if (originalName && buildingProfiles[originalName]) {
            prev = buildingProfiles[originalName];
        } else if (!originalName && buildingProfiles[name]) {
            prev = buildingProfiles[name];
        }

        if (originalName && originalName !== name) {
            delete buildingProfiles[originalName];
            const oldIdx = buildingsList.indexOf(originalName);
            if (oldIdx >= 0) buildingsList.splice(oldIdx, 1);
            Object.keys(ownerBuildingMap).forEach((owner) => {
                ownerBuildingMap[owner] = (ownerBuildingMap[owner] || []).map((b) => (b === originalName ? name : b));
            });
            unitReservations = unitReservations.map((r) => {
                if (toStr(r.building) !== originalName) return r;
                const next = { ...r, building: name };
                if (next.formData && typeof next.formData === 'object') {
                    next.formData = { ...next.formData, buildingNo: name };
                }
                return next;
            });
            try {
                const saved = JSON.parse(localStorage.getItem('sfg_contract_full') || '{}');
                if (toStr(saved.buildingNo) === originalName) {
                    saved.buildingNo = name;
                    localStorage.setItem('sfg_contract_full', JSON.stringify(saved));
                }
            } catch (e) {}
            const formBuilding = document.getElementById('buildingNo');
            if (formBuilding && toStr(formBuilding.value) === originalName) formBuilding.value = name;
        }

        if (prev) {
            profile.createdAt = prev.createdAt || prev.updatedAt || now;
            profile.createdBy = prev.createdBy || prev.updatedBy || actor;
        } else {
            profile.createdAt = now;
            profile.createdBy = actor;
        }
        profile.updatedAt = now;
        profile.updatedBy = actor;

        buildingProfiles[name] = profile;
        buildingProfilesShadow[name] = { ...profile };
        if (originalName && originalName !== name) {
            buildingProfiles[originalName] = { ...profile, name };
            buildingProfilesShadow[originalName] = { ...profile, name };
        }
        const pbKey = extractPlotBuildingKey(name) || extractPlotBuildingKey(originalName);
        if (pbKey) {
            const allKeys = [...new Set([...Object.keys(buildingProfiles), ...getAllKnownBuildings()])];
            allKeys.forEach((label) => {
                if (extractPlotBuildingKey(label) === pbKey || extractPlotBuildingKey(buildingProfiles[label]?.name) === pbKey) {
                    buildingProfiles[label] = { ...profile, name };
                    buildingProfilesShadow[label] = { ...profile, name };
                }
            });
        }
        if (!buildingsList.includes(name)) buildingsList.push(name);
        syncManagedUnitsFromProfiles();
        return name;
    }

    function addOwnerFromDashboard() {
        if (!assertPermissionOrAlert('manage_owners', 'لا تملك صلاحية إدارة الملاك.', 'No permission to manage owners.')) return;
        const input = document.getElementById('ownerNameInput');
        const name = toStr(input?.value);
        if (!name) {
            alert('يرجى إدخال اسم المالك.');
            return;
        }
        if (!ownersList.includes(name)) ownersList.push(name);
        if (!ownerBuildingMap[name]) ownerBuildingMap[name] = [];
        if (!ownerProfiles[name]) ownerProfiles[name] = { ...getEmptyOwnerProfile(), fullName: name };
        if (input) input.value = '';
        persistReferenceData();
    }

    function exportOwnersToExcel() {
        if (typeof XLSX === 'undefined') {
            alert('⚠️ مكتبة Excel غير متاحة حالياً.');
            return;
        }
        const rows = ownersList.map((name) => {
            const p = getEditableOwnerProfile(name);
            const attachment = normalizeOwnerAttachment(p.idCardAttachment);
            return {
                FullName: p.fullName || name,
                FirstName: p.firstName || '',
                SecondName: p.secondName || '',
                ThirdName: p.thirdName || '',
                Tribe: p.tribe || '',
                CivilId: p.civilId || '',
                IdExpiryDate: p.idExpiryDate || '',
                Phone: p.phone || '',
                Email: p.email || '',
                IdCardAttachment: attachment?.name || '',
                LinkedBuildings: (ownerBuildingMap[name] || []).join(' | ')
            };
        });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{
            FullName: '',
            FirstName: '',
            SecondName: '',
            ThirdName: '',
            Tribe: '',
            CivilId: '',
            IdExpiryDate: '',
            Phone: '',
            Email: '',
            IdCardAttachment: '',
            LinkedBuildings: ''
        }]);
        XLSX.utils.book_append_sheet(wb, ws, 'Owners');
        XLSX.writeFile(wb, `SFG_Owners_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    function triggerOwnersExcelImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls';
        input.onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) importOwnersFromExcel(file);
        };
        input.click();
    }

    function importOwnersFromExcel(file) {
        if (!assertPermissionOrAlert('manage_owners', 'لا تملك صلاحية إدارة الملاك.', 'No permission to manage owners.')) return;
        if (typeof XLSX === 'undefined') {
            alert('⚠️ مكتبة Excel غير متاحة حالياً.');
            return;
        }
        readWorkbook(file).then((wb) => {
            const ws = wb.Sheets['Owners'] || wb.Sheets[wb.SheetNames[0]];
            if (!ws) {
                alert('❌ لم يتم العثور على ورقة ملاك داخل ملف Excel.');
                return;
            }
            const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
            if (!rows.length) {
                alert('⚠️ ملف الملاك فارغ.');
                return;
            }
            let added = 0;
            rows.forEach((row) => {
                const fullName = toStr(row.FullName || row.OwnerName || row['اسم المالك الكامل'] || row['اسم المالك']);
                if (!fullName) return;
                const original = ownerProfiles[fullName] || getEmptyOwnerProfile();
                ownerProfiles[fullName] = {
                    ...original,
                    fullName,
                    firstName: toStr(row.FirstName || row['الاسم الأول']),
                    secondName: toStr(row.SecondName || row['الاسم الثاني']),
                    thirdName: toStr(row.ThirdName || row['الاسم الثالث']),
                    tribe: toStr(row.Tribe || row['القبيلة']),
                    civilId: toStr(row.CivilId || row['الرقم المدني']),
                    idExpiryDate: normalizeDate(row.IdExpiryDate || row['تاريخ انتهاء البطاقة']),
                    phone: toStr(row.Phone || row['رقم الهاتف']),
                    email: toStr(row.Email || row['البريد الإلكتروني']),
                    idCardAttachment: normalizeOwnerAttachment(row.IdCardAttachment || row['نسخة البطاقة'])
                };
                if (!ownersList.includes(fullName)) {
                    ownersList.push(fullName);
                    added++;
                }
                if (!ownerBuildingMap[fullName]) ownerBuildingMap[fullName] = [];
                const linkedBuildings = parseBulkNames(String(row.LinkedBuildings || row['المباني المرتبطة'] || '').replace(/\|/g, '\n'));
                linkedBuildings.forEach((b) => {
                    if (!ownerBuildingMap[fullName].includes(b)) ownerBuildingMap[fullName].push(b);
                });
            });
            persistReferenceData();
            alert(`✅ تم استيراد بيانات ${added} مالك جديد من Excel.`);
        }).catch(() => {
            alert('❌ تعذر قراءة ملف Excel الخاص بالملاك.');
        });
    }

    function addBuildingFromDashboard() {
        if (!assertPermissionOrAlert('manage_properties', 'لا تملك صلاحية تعديل العقارات.', 'No permission to edit properties.')) return;
        if (!ownersList.length) {
            alert('أضف مالكاً من قسم «أسماء الملاك» أولاً، ثم اربطه بالعقار.\nAdd an owner under Owners first, then link the property.');
            return;
        }
        const select = document.getElementById('buildingOwnerSelect');
        const profile = collectBuildingProfileForm();
        const isEditingExisting = !!buildingEditorState.originalName;
        const ve = validateBuildingProfileComplete(profile);
        if (!ve.ok) {
            const okDraft = confirm(
                t(
                    'لا تزال هناك نواقص في بيانات العقار.\nهل تريد الحفظ كمسودة الآن؟',
                    'Property data is still incomplete.\nDo you want to save as draft now?'
                )
            );
            if (!okDraft) {
                alert(ve.message);
                return;
            }
        }
        const owner = toStr(select?.value);
        const hasExistingOwnerLink = isEditingExisting && ownersList.some((o) => isBuildingLinkedToOwner(o, buildingEditorState.originalName));
        if (!owner && !hasExistingOwnerLink) {
            alert('اختر المالك المرتبط بهذا العقار / Select the owner linked to this building.');
            return;
        }
        const name = upsertBuildingProfile(profile);
        if (!name) {
            return;
        }
        if (owner) {
            if (!ownersList.includes(owner)) ownersList.push(owner);
            if (!ownerBuildingMap[owner]) ownerBuildingMap[owner] = [];
            if (!ownerBuildingMap[owner].includes(name)) ownerBuildingMap[owner].push(name);
        } else if (isEditingExisting && buildingEditorState.originalName && buildingEditorState.originalName !== name) {
            Object.keys(ownerBuildingMap).forEach((o) => {
                ownerBuildingMap[o] = (ownerBuildingMap[o] || []).map((b) => (b === buildingEditorState.originalName ? name : b));
            });
        }
        // Force-persist building state immediately (before any UI rerender path).
        try {
            localStorage.setItem('sfg_building_profiles', JSON.stringify(buildingProfiles));
            localStorage.setItem('sfg_buildings_list', JSON.stringify(buildingsList));
            localStorage.setItem('sfg_owner_building_map', JSON.stringify(ownerBuildingMap));
            mirrorKvFromLocalStorageToIndexedDb();
        } catch (e) {
            alert(t('❌ فشل حفظ بيانات المبنى محلياً. تحقق من مساحة التخزين في المتصفح.', '❌ Failed to save building data locally. Check browser storage space.'));
            console.error('Building force-persist failed:', e);
            return;
        }
        buildingEditorState = { open: true, originalName: name };
        persistReferenceData();
        // Verify saved data can be read back immediately.
        try {
            const verify = JSON.parse(localStorage.getItem('sfg_building_profiles') || '{}');
            if (!verify || typeof verify !== 'object' || !verify[name]) {
                alert(t('⚠️ تم الحفظ لكن تعذّر التحقق من تخزين بيانات المبنى. حاول مرة أخرى.', '⚠️ Saved, but verification failed for building storage. Please try again.'));
            }
        } catch (e) {}
        if (!ve.ok) {
            alert(t('💾 تم حفظ بيانات العقار كمسودة. يمكنك استكمال النواقص لاحقاً.', '💾 Property data saved as draft. You can complete missing fields later.'));
        } else {
            alert(t('✅ تم حفظ بيانات العقار بنجاح.', '✅ Property data saved successfully.'));
        }
        renderInsightContent();
    }

    function importBuildingsFromDashboard() {
        if (!assertPermissionOrAlert('manage_properties', 'لا تملك صلاحية تعديل العقارات.', 'No permission to edit properties.')) return;
        const box = document.getElementById('buildingsImportText');
        const select = document.getElementById('buildingsImportOwnerSelect');
        const owner = toStr(select?.value);
        const names = parseBulkNames(box?.value || '');
        if (!names.length) {
            alert('أدخل أسماء المباني، كل اسم في سطر أو مفصول بفاصلة.');
            return;
        }
        let added = 0;
        names.forEach((name) => {
            if (upsertBuildingProfile(buildingProfiles[name] || { name, floors: [] })) added++;
            if (owner) {
                if (!ownersList.includes(owner)) ownersList.push(owner);
                if (!ownerBuildingMap[owner]) ownerBuildingMap[owner] = [];
                if (!ownerBuildingMap[owner].includes(name)) ownerBuildingMap[owner].push(name);
            }
        });
        if (box) box.value = '';
        persistReferenceData();
        alert(`تم استيراد ${added} مبنى جديد.`);
    }

    function getBuildingProfile(buildingName) {
        return buildingProfiles[buildingName] || null;
    }

    /** هيدر الشركة للطباعة — بدون حقول تحرير */
    /** شعار الطباعة من ملف محلي / Local print logo file */
    function getPrintLogoSrc() {
        try {
            return new URL('SFG_Logo_04.png', window.location.href).href;
        } catch (e) {
            return 'SFG_Logo_04.png';
        }
    }

    function createPrintHeaderStatic() {
        const logoSrc = getPrintLogoSrc();
        return `
            <div class="doc-header" dir="rtl">
                <div class="company-box company-box-ar">
                    <div class="company-name-ar">مجموعة سيد فياض العالمية ش.م.م</div>
                    <div class="company-lines-ar">ص.ب: 154 ، الرمز البريدي : 111 ، سلطنة عمان<br>
                    هاتف: +968 24499484 ، فاكس: +968 24497482<br>
                    ضريبة القيمة المضافة: OM1100300282</div>
                </div>
                <div class="logo-box">
                    <img src="${logoSrc}" alt="شعار المجموعة / SFG Logo" width="110" height="64" style="max-height:64px;max-width:110px;object-fit:contain;display:block;margin:0 auto">
                </div>
                <div class="company-box company-box-en" dir="ltr">
                    <div class="company-name-en">SYED FAYYAZ GROUP INTERNATIONAL L.L.C</div>
                    <div class="company-lines-en">P.O.Box: 154, P.C: 111, Sultanate of Oman<br>
                    Tel: +968 24499484, Fax: +968 24497482<br>
                    VATIN: OM1100300282</div>
                </div>
            </div>
        `;
    }

    function documentShellPrint(bodyHtml) {
        return `
            <table class="doc-print-frame" role="presentation">
                <thead>
                    <tr>
                        <td class="doc-print-thead-cell">${createPrintHeaderStatic()}</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="doc-print-tbody-cell">${bodyHtml}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    /** جدول المباني كما في الشاشة (بدون تفاصيل موسّعة) */
    function buildBuildingsScreenTablePrintHtml() {
        const map = {};
        getAllKnownBuildings().forEach((b) => { map[b] = 0; });
        getUnitsData().forEach((u) => {
            if (!u.building) return;
            if (!map[u.building]) map[u.building] = 0;
            map[u.building]++;
        });
        const keys = Object.keys(map).sort((a, b) => a.localeCompare(b, 'ar'));
        const rows = keys.map((b, idx) => {
            const ownersCount = ownersList.filter((o) => isBuildingLinkedToOwner(o, b)).length;
            return `<tr>
                <td class="print-num">${idx + 1}</td>
                <td>${escHtml(b)}</td>
                <td class="print-num">${map[b]}</td>
                <td class="print-num">${ownersCount}</td>
            </tr>`;
        }).join('');
        return `
            <div class="section-header property-section-h">قائمة المباني (كما في الشاشة) / Buildings list (screen view)</div>
            <table class="info-table property-report-table print-zebra">
                <thead><tr>
                    <th class="print-num">#</th>
                    <th>المبنى / Building</th>
                    <th>عدد الوحدات / Units</th>
                    <th>الملاك المرتبطون / Owners</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    /**
     * scope: 'full' = رئيسي + فرعي + تدقيق | 'main' = رئيسي + تدقيق | 'sub' = طوابق/وحدات فقط
     */
    function buildBuildingProfilePrintSection(buildingName, scope) {
        const profile = getBuildingProfile(buildingName);
        const label = escHtml(buildingName);
        const noProf = `
            <div class="building-report-block">
                <div class="section-header property-section-h">عقار / Property: ${label}</div>
                <p class="property-muted">لا يوجد ملف تفصيلي محفوظ — أضف العقار من لوحة المعلومات.<br>
                <span dir="ltr" style="font-size:10px">No detailed profile — add the property from the dashboard.</span></p>
            </div>`;
        if (!profile) {
            if (scope === 'sub') return '';
            return noProf;
        }
        const displayName = escHtml(makeBuildingLabel(profile) || buildingName);
        const floors = Array.isArray(profile.floors) ? profile.floors : [];
        const titleDeedAttachment = normalizeBuildingAttachment(profile.titleDeedAttachment);
        const surveySketchAttachment = normalizeBuildingAttachment(profile.surveySketchAttachment);
        const mapsUrl = toStr(profile.googleMapsUrl);
        const mapsQrUrl = mapsUrl
            ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(mapsUrl)}`
            : '';
        const row = (ar, en, val) => `<tr><th>${escHtml(ar)} / ${escHtml(en)}</th><td>${val}</td></tr>`;
        const attLine = (att) => (att && att.dataUrl
            ? `${escHtml(att.name || 'مرفق')} <span class="property-muted">(يُطبَق الملف لاحقاً في نافذة منفصلة / File prints in a separate window)</span>`
            : '— / —');
        const mapsCell = mapsUrl
            ? ('<span dir="ltr" style="word-break:break-all">' + escHtml(mapsUrl) + '</span>' +
                (mapsQrUrl ? '<br><img src="' + mapsQrUrl + '" alt="QR" class="property-qr-print">' : ''))
            : '— / —';
        const floorsRows = floors.length
            ? floors.map((raw, idx) => {
                const f = normalizeFloorData(raw, idx);
                const types = (f.selectedTypes || []).map((t) => {
                    const match = getUnitTypeChoices().find((x) => x.value === t);
                    return match ? match.label : t;
                }).join('، ');
                const units = (f.unitsDetailed || []).map((u) => {
                    const typeLabel = (getUnitTypeChoices().find((x) => x.value === u.type) || { label: u.type }).label;
                    const util = [toStr(u.electricity) ? `K:${u.electricity}` : '', toStr(u.water) ? `W:${u.water}` : ''].filter(Boolean).join(' ');
                    return `${escHtml(u.number)} (${escHtml(typeLabel)}${util ? ` — ${escHtml(util)}` : ''})`;
                }).join(' ؛ ');
                return `<tr>
                    <td>${escHtml(f.name || '-')}</td>
                    <td>${escHtml(types || '-')}</td>
                    <td class="print-num">${Number(f.unitCount || (f.unitsDetailed || []).length || 0)}</td>
                    <td style="font-size:9px;text-align:right">${units || '—'}</td>
                </tr>`;
            }).join('')
            : '<tr><td colspan="4">— / —</td></tr>';

        const mainBlock = `
            <div class="section-header property-section-h">بيانات رئيسية / Main — ${displayName}</div>
            <table class="info-table property-report-table print-zebra-cells">
                ${row('نوع المبنى', 'Building type', escHtml(profile.buildingType || '—'))}
                ${row('رقم المبنى', 'Building No.', escHtml(profile.buildingNo || '—'))}
                ${row('رقم القطعة', 'Plot No.', escHtml(profile.plotNo || '—'))}
                ${row('رقم المجمع', 'Complex No.', escHtml(profile.complexNo || '—'))}
                ${row('نوع استعمال الأرض', 'Land use', escHtml(profile.landUse || '—'))}
                ${row('عداد الكهرباء', 'Electricity meter', escHtml(profile.electricityMeter || '—'))}
                ${row('عداد الماء', 'Water meter', escHtml(profile.waterMeter || '—'))}
                ${row('الإنترنت', 'Internet No.', escHtml(profile.internetNo || '—'))}
                ${row('عداد ماء الحريق', 'Fire water meter', escHtml(profile.fireWaterMeter || '—'))}
                ${row('عداد كهرباء الحريق', 'Fire electricity meter', escHtml(profile.fireElectricityMeter || '—'))}
                ${row('السكة / الزقاق', 'Way / lane No.', escHtml(profile.wayNo || '—'))}
                ${row('الرسم المساحي (كروكي)', 'Survey / sketch No.', escHtml(profile.sketchNo || '—'))}
                ${row('المحافظة', 'Governorate', escHtml(profile.governorate || '—'))}
                ${row('الولاية', 'Wilayat', escHtml(profile.wilayat || '—'))}
                ${row('المنطقة', 'Area', escHtml(profile.area || '—'))}
                ${row('سند الملكية', 'Title deed', attLine(titleDeedAttachment))}
                ${row('الرسم المساحي', 'Survey sketch', attLine(surveySketchAttachment))}
                ${row('رابط الموقع (خرائط جوجل)', 'Google Maps link', mapsCell)}
            </table>`;

        const subBlock = `
            <div class="section-header property-section-h" style="margin-top:10px">بيانات فرعية — طوابق ووحدات / Sub — floors & units — ${displayName}</div>
            <table class="info-table property-report-table print-zebra">
                <thead><tr>
                    <th>الطابق / Floor</th>
                    <th>الأنواع / Types</th>
                    <th class="print-num">العدد / Count</th>
                    <th>الوحدات / Units</th>
                </tr></thead>
                <tbody>${floorsRows}</tbody>
            </table>`;

        const auditBlock = `
            <div class="section-header property-section-h" style="margin-top:10px">سجل التدقيق / Audit — ${displayName}</div>
            <table class="info-table property-report-table print-zebra-cells">
                ${row('تاريخ الإضافة', 'Created at', formatDateTimeDisplay(profile.createdAt))}
                ${row('أضيف بواسطة', 'Created by', escHtml(profile.createdBy || '— / —'))}
                ${row('آخر تحديث', 'Last updated', formatDateTimeDisplay(profile.updatedAt))}
                ${row('عُدّل بواسطة', 'Updated by', escHtml(profile.updatedBy || '— / —'))}
            </table>`;

        if (scope === 'main') {
            return `<div class="building-report-block">${mainBlock}${auditBlock}</div>`;
        }
        if (scope === 'sub') {
            return `<div class="building-report-block">${subBlock}</div>`;
        }
        return `<div class="building-report-block">${mainBlock}${subBlock}${auditBlock}</div>`;
    }

    function openA4PropertyReportWindow(documentTitle, bodyHtmlInner, opts) {
        loadDashboardAux();
        const options = opts || {};
        const generatedAt = new Date();
        const arDate = generatedAt.toLocaleString('ar-OM', { dateStyle: 'medium', timeStyle: 'short' });
        const enDate = generatedAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
        const fullBody = `
            <div class="doc-title">
                <h2>${escHtml(documentTitle.ar)}</h2>
                <h3>${escHtml(documentTitle.en)}</h3>
            </div>
            <p class="property-report-meta">تاريخ إصدار التقرير / Report generated: ${escHtml(arDate)} · ${escHtml(enDate)}</p>
            <p class="property-report-meta property-report-by"><strong>منشئ التقرير / Prepared by:</strong> ${getReportPreparedByHtml()}</p>
            ${bodyHtmlInner}
        `;
        const win = window.open('', '_blank');
        if (!win) {
            alert('تعذر فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة.\nCould not open print window — allow pop-ups.');
            return;
        }
        win.document.write(`
            <!DOCTYPE html>
            <html lang="ar"><head><meta charset="utf-8"><title>${escHtml(documentTitle.ar)} — SFG</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&family=Roboto&display=swap" rel="stylesheet">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Tajawal', 'Roboto', sans-serif; direction: rtl; background: white; color: #1a1a1a; font-size: 12pt; line-height: 1.55; }
                .document { --doc-accent: #6b1f35; --doc-accent-dark: #4a1525; --doc-soft-bg: #f8ecef; width: 100%; padding: 0; margin: 0; }
                .doc-print-frame { width: 100%; border-collapse: collapse; table-layout: fixed; border: none; }
                .doc-print-frame thead { display: table-header-group; }
                .doc-print-frame thead td { padding: 0 0 10px; border: none; vertical-align: bottom; }
                .doc-print-frame tbody td { padding: 0; border: none; vertical-align: top; }
                .doc-print-tbody-cell { text-align: center; }
                .doc-header {
                    display: flex; flex-direction: row; align-items: center; justify-content: space-between;
                    gap: 12px; width: 100%; padding: 0 2px 8px; margin: 0;
                    border-bottom: 2px solid var(--doc-accent);
                }
                .company-box { flex: 1; min-width: 0; font-size: 9pt; line-height: 1.45; color: #2a2a2a; }
                .company-box-ar { text-align: right; }
                .company-box-en { text-align: left; direction: ltr; font-family: 'Roboto', sans-serif; }
                .company-name-ar { font-size: 11pt; font-weight: 800; color: var(--doc-accent); margin-bottom: 5px; }
                .company-name-en { font-size: 10pt; font-weight: 800; color: var(--doc-accent); margin-bottom: 5px; }
                .logo-box { flex: 0 0 110px; text-align: center; }
                .logo-box img { max-height: 64px; max-width: 110px; object-fit: contain; }
                .doc-title { text-align: center; margin: 12px 0 10px; border-bottom: 2px double var(--doc-accent); padding-bottom: 8px; }
                .doc-title h2 { font-size: 16pt; color: var(--doc-accent); margin: 0; font-weight: 800; }
                .doc-title h3 { font-size: 12pt; font-weight: normal; color: #444; margin: 5px 0 0; direction: ltr; font-family: 'Roboto', sans-serif; }
                .property-report-meta { font-size: 12pt; color: #555; margin-bottom: 8px; text-align: center; }
                .property-report-by { margin-bottom: 14px; font-weight: 600; color: #333; text-align: center; font-size: 12pt; }
                .property-report-by strong { font-weight: 800; color: var(--doc-accent-dark); }
                .section-header {
                    background: linear-gradient(135deg, var(--doc-accent) 0%, var(--doc-accent-dark) 100%);
                    color: white; padding: 5px 10px; margin: 11px 0 7px; font-size: 12pt; font-weight: bold;
                    -webkit-print-color-adjust: exact; print-color-adjust: exact; text-align: center;
                }
                .property-section-h { font-size: 12pt; }
                .property-muted { color: #555; font-size: 10pt; }
                .property-report-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12pt; }
                .property-report-table th, .property-report-table td { border: 1px solid #2a2a2a; padding: 6px 8px; vertical-align: middle; line-height: 1.45; text-align: center; }
                .property-report-table th { background: var(--doc-soft-bg); color: var(--doc-accent-dark); font-weight: 700; }
                .property-report-table thead th { text-align: center; background: #ebe4e7; }
                .print-zebra tbody tr:nth-child(even) { background: #faf6f8; }
                .print-zebra-cells tbody tr:nth-child(even) td { background: #faf6f8; }
                .print-num { text-align: center; width: 44px; }
                .building-report-block { margin-bottom: 18px; padding-bottom: 10px; border-bottom: 1px solid #ddd; page-break-inside: avoid; text-align: center; }
                .building-report-block:last-child { border-bottom: none; }
                .property-qr-print { width: 90px; height: 90px; margin-top: 6px; border: 1px solid #ddd; padding: 4px; }
                .insight-print-body { color: #1a1a1a; font-size: 12pt; line-height: 1.55; text-align: center; }
                .insight-print-body p { font-size: 12pt; margin: 0 0 8px; color: #444; line-height: 1.55; text-align: center; }
                .insight-print-body h6 { font-size: 12pt; font-weight: 800; color: var(--doc-accent-dark); margin: 14px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e0d4d8; text-align: center; }
                .insight-print-body .insight-nested { margin-bottom: 12px; }
                .insight-print-body table { width: 100%; }
                @page { size: A4 portrait; margin: 10mm 12mm; }
                @media print {
                    body { margin: 0; padding: 0 0 24mm; }
                    .doc-print-frame thead { display: table-header-group; }
                }
            </style></head>
            <body dir="rtl">
                <div class="document">${documentShellPrint(fullBody)}</div>
            </body></html>
        `);
        win.document.close();
        const runAfter = () => {
            if (typeof options.afterPrint === 'function') {
                try { options.afterPrint(); } catch (e) {}
            }
        };
        const doPrint = () => setTimeout(() => {
            try { win.focus(); win.print(); } catch (e) {}
            setTimeout(runAfter, 1600);
        }, 380);
        if (win.document.readyState === 'complete') doPrint();
        else win.onload = doPrint;
    }

    /** طباعة عقار واحد: scope = full | main | sub — printFiles يطبع سند الملكية والرسم بعد التقرير */
    function printOneBuildingReport(buildingName, scope, printFiles) {
        loadDashboardAux();
        const b = toStr(buildingName);
        if (!b) return;
        const sc = scope === 'main' || scope === 'sub' ? scope : 'full';
        const body = buildBuildingProfilePrintSection(b, sc);
        const titles = {
            full: { ar: 'تقرير العقار — كامل (رئيسي + فرعي)', en: 'Property — full (main + sub)' },
            main: { ar: 'تقرير العقار — بيانات رئيسية فقط', en: 'Property — main data only' },
            sub: { ar: 'تقرير العقار — طوابق ووحدات (فرعي)', en: 'Property — floors & units (sub)' }
        };
        const profile = getBuildingProfile(b);
        const label = profile ? (makeBuildingLabel(profile) || b) : b;
        const wantFiles = !!printFiles && profile && (sc === 'full' || sc === 'main');
        const files = wantFiles ? collectBuildingProfileAttachments(profile, label) : [];
        if (wantFiles && files.length) {
            alert('بعد حفظ/إلغاء طباعة التقرير، ستُفتح نوافذ لطباعة المرفقات (سند الملكية / الرسم) إن وُجدت.\nAfter the report print dialog, attachment windows will open for title deed / survey if present.');
        }
        openA4PropertyReportWindow(titles[sc] || titles.full, body, {
            afterPrint: files.length ? () => queuePrintAttachments(files) : null
        });
    }

    function printBuildingPropertyReport(buildingName) {
        printOneBuildingReport(buildingName, 'full', false);
    }

    /*
      معيار الطباعة الموحد / Unified Print Standard
      - جميع الصفحات الحالية والمستقبلية يجب أن تستخدم قالب A4 الرسمي.
      - لأي تقرير جديد، استدعِ هذه الدالة بدل إنشاء نافذة طباعة مخصصة.
    */
    function printWithSiteStandard(documentTitle, bodyHtmlInner, opts = {}) {
        openA4PropertyReportWindow(documentTitle, bodyHtmlInner, opts);
    }

    /**
     * mode: 'screen' = جدول الشاشة فقط | 'full' | 'main' | 'sub'
     * printAttachmentFiles: يطبع ملفات العقارات بعد التقرير (لـ full/main فقط)
     */
    function printBuildingsInventoryReport(mode, printAttachmentFiles) {
        loadDashboardAux();
        const keys = getAllKnownBuildings();
        if (!keys.length) {
            alert('لا توجد عقارات في القائمة / No properties in the list.');
            return;
        }
        const m = mode === 'screen' ? 'screen' : (mode === 'main' || mode === 'sub' ? mode : 'full');
        if (m === 'screen') {
            openA4PropertyReportWindow(
                { ar: 'قائمة المباني', en: 'Buildings list' },
                buildBuildingsScreenTablePrintHtml(),
                {}
            );
            return;
        }
        const inner = keys.map((k) => buildBuildingProfilePrintSection(k, m)).filter(Boolean).join('');
        const titles = {
            full: { ar: 'جرد العقارات — تفاصيل كاملة', en: 'Properties — full details' },
            main: { ar: 'جرد العقارات — بيانات رئيسية فقط', en: 'Properties — main data only' },
            sub: { ar: 'جرد العقارات — طوابق ووحدات فقط', en: 'Properties — floors & units only' }
        };
        const wantFiles = !!printAttachmentFiles && (m === 'full' || m === 'main');
        const allFiles = [];
        if (wantFiles) {
            keys.forEach((k) => {
                const p = getBuildingProfile(k);
                const lbl = p ? (makeBuildingLabel(p) || k) : k;
                collectBuildingProfileAttachments(p, lbl).forEach((x) => allFiles.push(x));
            });
        }
        if (wantFiles && allFiles.length > 8) {
            if (!confirm(`سيتم طباعة ${allFiles.length} مرفقاً بعد التقرير. المتابعة؟\n${allFiles.length} attachments will print after the report. Continue?`)) {
                return;
            }
        } else if (wantFiles && allFiles.length) {
            alert(`تنبيه: ستُفتح ${allFiles.length} نافذة لطباعة المرفقات بعد التقرير.\nNote: ${allFiles.length} attachment print windows will follow the report.`);
        }
        openA4PropertyReportWindow(titles[m] || titles.full, inner, {
            afterPrint: allFiles.length ? () => queuePrintAttachments(allFiles) : null
        });
    }

    function printAllPropertiesInventoryReport() {
        printBuildingsInventoryReport('full', false);
    }

    let propertyPrintMenuContext = { kind: 'list', buildingName: '' };

    function openPropertyPrintMenu(kind, buildingName) {
        const k = toStr(kind);
        propertyPrintMenuContext = {
            kind: k === 'building' ? 'building' : k === 'insight' ? 'insight' : 'list',
            buildingName: k === 'building' ? toStr(buildingName) : ''
        };
        const modal = document.getElementById('propertyPrintMenuModal');
        const listBlock = document.getElementById('propertyPrintMenuListBlock');
        const buildingBlock = document.getElementById('propertyPrintMenuBuildingBlock');
        const insightBlock = document.getElementById('propertyPrintMenuInsightBlock');
        const titleEl = document.getElementById('propertyPrintMenuTitle');
        if (!modal || !listBlock || !buildingBlock || !insightBlock) return;
        insightBlock.style.display = 'none';
        if (propertyPrintMenuContext.kind === 'building') {
            if (titleEl) titleEl.textContent = `طباعة التقرير — ${propertyPrintMenuContext.buildingName} / Print — ${propertyPrintMenuContext.buildingName}`;
            listBlock.style.display = 'none';
            buildingBlock.style.display = 'flex';
        } else if (propertyPrintMenuContext.kind === 'insight') {
            if (titleEl) titleEl.textContent = 'طباعة التقرير / Print report';
            listBlock.style.display = 'none';
            buildingBlock.style.display = 'none';
            insightBlock.style.display = 'flex';
        } else {
            if (titleEl) titleEl.textContent = 'طباعة التقرير / Print report';
            listBlock.style.display = 'flex';
            buildingBlock.style.display = 'none';
        }
        modal.classList.add('open');
    }

    function runInsightTablePrint(withKpi) {
        printInsightCurrentView(!!withKpi);
        closePropertyPrintMenu();
    }

    function buildDashboardKpiPrintSection() {
        const g = (id) => {
            const el = document.getElementById(id);
            return el ? escHtml(String(el.textContent ?? '').trim()) : '—';
        };
        const rows = [
            ['عدد المباني / Buildings', g('statBuildings')],
            ['عدد الملاك / Owners', g('statOwnersCount')],
            ['عدد الوحدات / Units', g('statTotalUnits')],
            ['وحدات مؤجرة / Rented units', g('statRentedUnits')],
            ['وحدات شاغرة / Vacant units', g('statVacantUnits')],
            ['وحدات محجوزة / Reserved units', g('statReservedUnits')],
            ['إجمالي الإيجار الشهري (OMR) / Monthly rent total', g('statMonthlyTotal')],
            ['إجمالي الإيجار السنوي (تقدير) / Yearly estimate', g('statYearlyTotal')],
            ['تنتهي خلال 30 يوماً / Expiring within 30 days', g('statExpiring30')],
            ['تنتهي خلال 60 يوماً / Expiring within 60 days', g('statExpiring60')],
            ['تنتهي خلال 90 يوماً / Expiring within 90 days', g('statExpiring90')],
            ['عقارات بإخلاء أو مغادرة / Evictions queue', g('statEvictionQueue')]
        ];
        const tr = rows.map(([lab, val]) => `<tr><th style="text-align:center;width:58%">${lab}</th><td>${val}</td></tr>`).join('');
        return `<div style="margin-bottom:16px"><h6 style="margin:0 0 8px;color:#7A001F;font-size:12pt;text-align:center">ملخص لوحة التحكم / Dashboard summary</h6>
            <table class="info-table property-report-table print-zebra" style="margin-bottom:0"><tbody>${tr}</tbody></table></div>`;
    }

    function insightSanitizeRootForPrint(root) {
        if (!root) return;
        root.querySelectorAll('button').forEach((n) => n.remove());
        root.querySelectorAll('select').forEach((sel) => {
            const opt = sel.options[sel.selectedIndex];
            const span = document.createElement('span');
            span.textContent = opt ? opt.text : '';
            sel.replaceWith(span);
        });
        root.querySelectorAll('input').forEach((inp) => {
            const span = document.createElement('span');
            span.textContent = inp.value || '';
            inp.replaceWith(span);
        });
        root.querySelectorAll('datalist').forEach((n) => n.remove());
    }

    /** يحوّل جداول ops-table إلى نفس تنسيق تقارير العقارات في الطباعة */
    function upgradeInsightTablesForA4Print(root) {
        if (!root) return;
        root.querySelectorAll('table.ops-table').forEach((t) => {
            t.classList.remove('ops-table');
            t.classList.add('info-table', 'property-report-table', 'print-zebra');
        });
    }

    function printInsightCurrentView(includeDashboardKpi) {
        const dashModal = document.getElementById('dashboardInsightModal');
        if (!dashModal || !dashModal.classList.contains('open')) {
            alert('افتح قسم التحليل أولاً من لوحة العدادات.\nOpen an insight section from the dashboard first.');
            return;
        }
        loadDashboardAux();
        const titleRaw = document.getElementById('insightModalTitle')?.textContent?.trim() || 'تقرير / Report';
        const documentTitle = { ar: titleRaw, en: titleRaw };
        let inner = '';
        if (includeDashboardKpi) {
            inner += buildDashboardKpiPrintSection();
        }
        const bodyEl = document.getElementById('insightBody');
        if (!bodyEl) return;
        const wrap = document.createElement('div');
        wrap.innerHTML = bodyEl.innerHTML;
        insightSanitizeRootForPrint(wrap);
        upgradeInsightTablesForA4Print(wrap);
        inner += `<div class="insight-print-body" dir="rtl">${wrap.innerHTML}</div>`;
        openA4PropertyReportWindow(documentTitle, inner, {});
    }

    function closePropertyPrintMenu() {
        const modal = document.getElementById('propertyPrintMenuModal');
        if (modal) modal.classList.remove('open');
    }

    function runPropertyPrintList(mode, printFiles) {
        printBuildingsInventoryReport(mode, printFiles);
        closePropertyPrintMenu();
    }

    function runPropertyPrintBuilding(scope, printFiles) {
        const b = propertyPrintMenuContext.buildingName;
        if (!b) return;
        printOneBuildingReport(b, scope, printFiles);
        closePropertyPrintMenu();
    }

    function renderBuildingProfileSummary(buildingName) {
        const profile = getBuildingProfile(buildingName);
        if (!profile) {
            return `
                <div class="insight-nested" style="margin-bottom:12px">
                    <button type="button" class="btn-primary mini-btn" onclick='openPropertyPrintMenu("building", ${JSON.stringify(buildingName)})'>🖨️ ${t('طباعة التقرير', 'Print report')}</button>
                    <p style="font-size:12px;color:#777;margin-top:8px">${t('لا توجد بيانات تفصيلية محفوظة لهذا العقار بعد — سيظهر التقرير بملاحظة «لا يوجد ملف تفصيلي».', 'No saved profile yet — the printout will note that no detailed file exists.')}</p>
                </div>`;
        }
        const floors = Array.isArray(profile.floors) ? profile.floors : [];
        const titleDeedAttachment = normalizeBuildingAttachment(profile.titleDeedAttachment);
        const surveySketchAttachment = normalizeBuildingAttachment(profile.surveySketchAttachment);
        const mapsUrl = toStr(profile.googleMapsUrl);
        const mapsQrUrl = mapsUrl
            ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mapsUrl)}`
            : '';
        const auditBlock = `
            <div style="margin-top:14px;padding:12px;border:1px solid #dfe7ee;border-radius:10px;background:#f9fbfd">
                <h6 style="margin:0 0 8px;font-size:13px;color:var(--primary)">${t('سجل التدقيق', 'Audit trail')}</h6>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;font-size:12px">
                    <div><strong>${t('تاريخ ووقت الإضافة', 'Created')}:</strong><br>${formatDateTimeDisplay(profile.createdAt)}</div>
                    <div><strong>${t('أضيف بواسطة', 'Created by')}:</strong><br>${escHtml(profile.createdBy || '— / —')}</div>
                    <div><strong>${t('آخر تعديل (تاريخ ووقت)', 'Last updated')}:</strong><br>${formatDateTimeDisplay(profile.updatedAt)}</div>
                    <div><strong>${t('عُدّل بواسطة', 'Updated by')}:</strong><br>${escHtml(profile.updatedBy || '— / —')}</div>
                </div>
            </div>
        `;
        return `
            <div class="insight-nested" style="margin-bottom:12px">
                <h6>${t('بيانات العقار', 'Property details')}</h6>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;font-size:13px;margin-top:4px">
                    <div><strong>${t('نوع المبنى', 'Building type')}:</strong> ${escHtml(profile.buildingType || '-')}</div>
                    <div><strong>${t('رقم المبنى', 'Building no.')}:</strong> ${escHtml(profile.buildingNo || '-')}</div>
                    <div><strong>${t('رقم القطعة', 'Plot no.')}:</strong> ${escHtml(profile.plotNo || '-')}</div>
                    <div><strong>${t('رقم المجمع', 'Complex no.')}:</strong> ${escHtml(profile.complexNo || '-')}</div>
                    <div><strong>${t('نوع استعمال الأرض', 'Land use type')}:</strong> ${escHtml(profile.landUse || '-')}</div>
                    <div><strong>${t('رقم عداد الكهرباء', 'Electricity meter no.')}:</strong> ${escHtml(profile.electricityMeter || '-')}</div>
                    <div><strong>${t('رقم عداد الماء', 'Water meter no.')}:</strong> ${escHtml(profile.waterMeter || '-')}</div>
                    <div><strong>${t('رقم الانترنت', 'Internet no.')}:</strong> ${escHtml(profile.internetNo || '-')}</div>
                    <div><strong>${t('رقم عداد ماء الحريق', 'Fire water meter no.')}:</strong> ${escHtml(profile.fireWaterMeter || '-')}</div>
                    <div><strong>${t('رقم عداد الكهرباء الحريق', 'Fire electricity meter no.')}:</strong> ${escHtml(profile.fireElectricityMeter || '-')}</div>
                    <div><strong>${t('سند الملكية', 'Title deed')}:</strong> ${titleDeedAttachment?.dataUrl ? `<button type="button" class="mini-btn" onclick='openStoredAttachment(${JSON.stringify(titleDeedAttachment).replace(/'/g, '&apos;')}, "Title Deed Attachment")'>${escHtml(titleDeedAttachment.name || t('فتح الملف', 'Open file'))}</button>` : '-'}</div>
                    <div><strong>${t('الرسم المساحي', 'Survey sketch')}:</strong> ${surveySketchAttachment?.dataUrl ? `<button type="button" class="mini-btn" onclick='openStoredAttachment(${JSON.stringify(surveySketchAttachment).replace(/'/g, '&apos;')}, "Survey Sketch Attachment")'>${escHtml(surveySketchAttachment.name || t('فتح الملف', 'Open file'))}</button>` : '-'}</div>
                    <div><strong>${t('رابط الموقع في Google', 'Google Maps URL')}:</strong> ${mapsUrl ? `
                        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start">
                            <a href="${escHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer" title="افتح الموقع أو امسح الكود">
                                <img src="${mapsQrUrl}" alt="Google Maps QR Code" style="width:140px;height:140px;border:1px solid #ddd;border-radius:8px;background:#fff;padding:6px">
                            </a>
                            <a href="${escHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">${t('فتح الموقع', 'Open Location')}</a>
                        </div>
                    ` : '-'}</div>
                    <div><strong>${t('رقم السكة/الزقاق', 'Way no.')}:</strong> ${escHtml(profile.wayNo || '-')}</div>
                    <div><strong>${t('رقم الرسم المساحي', 'Sketch no.')}:</strong> ${escHtml(profile.sketchNo || '-')}</div>
                    <div><strong>${t('المحافظة', 'Governorate')}:</strong> ${escHtml(profile.governorate || '-')}</div>
                    <div><strong>${t('الولاية', 'Wilayat')}:</strong> ${escHtml(profile.wilayat || '-')}</div>
                    <div><strong>${t('المنطقة', 'Area')}:</strong> ${escHtml(profile.area || '-')}</div>
                    <div><strong>${t('عدد الطوابق', 'Number of floors')}:</strong> ${floors.length}</div>
                </div>
                ${floors.length ? `<table class="ops-table" style="margin-top:10px"><thead><tr><th>${t('الطابق', 'Floor')}</th><th>${t('الأنواع', 'Types')}</th><th>${t('عدد الوحدات', 'Unit count')}</th><th>${t('الوحدات', 'Units')}</th></tr></thead><tbody>${floors.map((raw, idx) => {
                    const f = normalizeFloorData(raw, idx);
                    const types = (f.selectedTypes || []).map((t) => {
                        const match = getUnitTypeChoices().find((x) => x.value === t);
                        return match ? pickLocalizedSegment(match.label) : t;
                    }).join('، ');
                    const units = (f.unitsDetailed || []).map((u) => {
                        const typeLabel = pickLocalizedSegment((getUnitTypeChoices().find((x) => x.value === u.type) || { label: u.type }).label);
                        const util = [
                            toStr(u.electricity) ? `${t('كهرباء', 'Electricity')}: ${u.electricity}` : '',
                            toStr(u.water) ? `${t('ماء', 'Water')}: ${u.water}` : ''
                        ].filter(Boolean).join(' - ');
                        return `${u.number} (${typeLabel}${util ? ` - ${util}` : ''})`;
                    }).join('، ');
                    return `<tr><td>${escHtml(f.name || '-')}</td><td>${escHtml(types || '-')}</td><td>${Number(f.unitCount || (f.unitsDetailed || []).length || 0)}</td><td>${escHtml(units || '-')}</td></tr>`;
                }).join('')}</tbody></table>` : ''}
                ${auditBlock}
            </div>
        `;
    }

    function linkBuildingToOwner(owner, building) {
        owner = toStr(owner);
        building = toStr(building);
        if (!owner || !building) {
            alert('اختر المالك والمبنى أولاً.');
            return;
        }
        if (!ownersList.includes(owner)) ownersList.push(owner);
        if (!buildingsList.includes(building)) buildingsList.push(building);
        if (!ownerBuildingMap[owner]) ownerBuildingMap[owner] = [];
        if (!ownerBuildingMap[owner].includes(building)) ownerBuildingMap[owner].push(building);
        persistReferenceData();
    }

    function unlinkBuildingFromOwner(owner, building) {
        owner = toStr(owner);
        building = toStr(building);
        if (!ownerBuildingMap[owner]) return;
        ownerBuildingMap[owner] = ownerBuildingMap[owner].filter((b) => b !== building);
        persistReferenceData();
    }

    function linkSelectedBuildingToOwner(owner) {
        const select = document.getElementById('ownerBuildingLinkSelect');
        linkBuildingToOwner(owner, select?.value || '');
    }

    function linkSelectedOwnerToBuilding(building) {
        const select = document.getElementById('buildingOwnerLinkSelect');
        linkBuildingToOwner(select?.value || '', building);
    }

    function formatOMR(n) {
        const x = Number(n);
        if (Number.isNaN(x)) return '0.000';
        return x.toFixed(3);
    }

    function openUnitDetailsForUnit(unit) {
        if (!unit) return;
        const all = getUnitsData();
        window._unitsViewRows = all;
        const idx = all.findIndex(
            (u) => u.building === unit.building && normalizeUnit(String(u.unit)) === normalizeUnit(String(unit.unit))
        );
        if (idx < 0) return;
        openUnitDetailsModal(idx);
    }

    function openUnitDetailsByKey(building, unit) {
        const u = getUnitsData().find(
            (x) => x.building === building && normalizeUnit(String(x.unit)) === normalizeUnit(String(unit))
        );
        if (u) {
            closeDashboardInsight();
            openUnitDetailsForUnit(u);
        } else {
            alert('لا توجد بيانات وحدة مطابقة في الجدول الحالي.');
        }
    }

    function openUnitDetailsFromEvictionRow(idx) {
        const e = window._insightEvictRows && window._insightEvictRows[idx];
        if (!e) return;
        openUnitDetailsByKey(e.building, e.unit);
    }

    function closeDashboardInsight() {
        document.getElementById('dashboardInsightModal')?.classList.remove('open');
        insightNavStack = [];
        insightImportExportOpen = {};
    }

    function insightNavigateBack() {
        if (insightNavStack.length <= 1) return;
        insightNavStack.pop();
        renderInsightContent();
    }

    function openDashboardInsight(mode) {
        if (isViewerMode) return;
        loadDashboardAux();
        ensureOwnerLinksPlaceholder();
        insightImportExportOpen = {};
        insightNavStack = [{ mode }];
        document.getElementById('dashboardInsightModal')?.classList.add('open');
        renderInsightContent();
    }

    function insightGoBuilding(name) {
        insightNavStack.push({ mode: 'building', building: name });
        renderInsightContent();
    }

    function insightGoOwner(name) {
        insightNavStack.push({ mode: 'owner', owner: name });
        renderInsightContent();
    }

    function insightGoMonthlyBuilding(name) {
        insightNavStack.push({ mode: 'monthlyBuilding', building: name });
        renderInsightContent();
    }

    function insightGoYearlyBuilding(name) {
        insightNavStack.push({ mode: 'yearlyBuilding', building: name });
        renderInsightContent();
    }

    function insightGoEvictionBuilding(name) {
        insightNavStack.push({ mode: 'evictionBuilding', building: name });
        renderInsightContent();
    }


    /** فلترة وفرز لوحات التحليل / Insight filters & sorting */
    function insightDefaultFilter() {
        return { building: 'all', search: '', sortKey: 'building', sortDir: 'asc' };
    }
    function insightGetFilter(mode) {
        if (!insightFilterState[mode]) insightFilterState[mode] = insightDefaultFilter();
        return insightFilterState[mode];
    }
    function insightOnBuildingChange(mode, val) {
        insightGetFilter(mode).building = val || 'all';
        renderInsightContent();
    }
    function insightOnSearchInput(mode, el) {
        insightGetFilter(mode).search = toStr(el && el.value);
        renderInsightContent();
    }
    function insightToggleFilterPanel(mode) {
        insightFilterPanelOpen[mode] = !insightFilterPanelOpen[mode];
        insightImportExportOpen[mode] = false;
        renderInsightContent();
    }
    function insightImportExportMenuToggle(mode) {
        insightImportExportOpen[mode] = !insightImportExportOpen[mode];
        renderInsightContent();
    }
    function insightImportExportMenuClose(mode) {
        insightImportExportOpen[mode] = false;
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
                ${showB ? `<label style="font-size:12px;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap">${t('المبنى', 'Building')} <select onchange="insightOnBuildingChange('${mode}', this.value)"><option value="all" ${st.building === 'all' ? 'selected' : ''}>${t('كل المباني', 'All')}</option>${buildings.map((b) => `<option value="${escHtml(b)}" ${st.building === b ? 'selected' : ''}>${escHtml(b)}</option>`).join('')}</select></label>` : ''}
                ${showS ? `<label style="font-size:12px;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap">${t('بحث', 'Search')} <input type="search" value="${escHtml(st.search)}" placeholder="${t('نص…', 'Text…')}" onchange="insightOnSearchInput('${mode}', this)" style="min-width:180px"></label>` : ''}
            </div>`
            : '';
        const printBtn = opts.hidePrint ? '' : `<button type="button" class="btn-outline mini-btn" onclick="openPropertyPrintMenu('insight')">🖨️ ${t('طباعة التقرير', 'Print report')}</button>`;
        const lens = opts.showFilterToggle === false
            ? ''
            : `<button type="button" class="btn-outline mini-btn" onclick="insightToggleFilterPanel('${mode}')" title="${t('إظهار أو إخفاء الفلاتر', 'Toggle filters')}">${open ? '▼' : '🔍'} ${t('فلاتر', 'Filters')}</button>`;
        const extra = opts.extraHtml || '';
        const ieType = opts.importExportType;
        const ieOpen = !!(ieType && insightImportExportOpen[mode]);
        let ieBlock = '';
        if (ieType === 'structure') {
            ieBlock = `<div class="insight-ie-wrap${ieOpen ? ' open' : ''}">
                <button type="button" class="btn-outline mini-btn" onclick="insightImportExportMenuToggle('${mode}')" title="${t('استيراد أو تصدير بنية المباني والطوابق', 'Import or export building structure')}">📥📤 ${t('استيراد/تصدير', 'Import/Export')}</button>
                <div class="insight-ie-panel" role="menu" aria-label="${t('استيراد وتصدير العقار', 'Property import export')}">
                    <div class="insight-ie-heading">${t('بيانات العقار والطوابق والوحدات — ملف Excel', 'Property, floors & units — Excel file')}</div>
                    <button type="button" class="btn-outline mini-btn" onclick="exportBuildingStructuresExcel(); insightImportExportMenuClose('${mode}')">⬇️ ${t('تصدير البنية', 'Export structure')}</button>
                    <button type="button" class="btn-outline mini-btn" onclick="triggerBuildingStructureImport(); insightImportExportMenuClose('${mode}')">⬆️ ${t('استيراد البنية', 'Import structure')}</button>
                </div>
            </div>`;
        } else if (ieType === 'contracts') {
            ieBlock = `<div class="insight-ie-wrap${ieOpen ? ' open' : ''}">
                <button type="button" class="btn-outline mini-btn" onclick="insightImportExportMenuToggle('${mode}')" title="${t('استيراد أو تصدير بيانات العقود والمستأجرين', 'Import or export contract data')}">📥📤 ${t('استيراد/تصدير', 'Import/Export')}</button>
                <div class="insight-ie-panel" role="menu" aria-label="${t('استيراد وتصدير العقود', 'Contract import export')}">
                    <div class="insight-ie-heading">${t('عقود الوحدات المؤجرة — ملف Excel', 'Rented units contracts — Excel file')}</div>
                    <button type="button" class="btn-outline mini-btn" onclick="exportRentedContractsExcel(); insightImportExportMenuClose('${mode}')">⬇️ ${t('تصدير عقود', 'Export contracts')}</button>
                    <button type="button" class="btn-outline mini-btn" onclick="triggerRentedContractsImport(); insightImportExportMenuClose('${mode}')">⬆️ ${t('استيراد عقود', 'Import contracts')}</button>
                </div>
            </div>`;
        }
        return `<span style="display:flex;flex-direction:column;width:100%;gap:0;align-items:stretch">
            <span style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
                ${lens}${extra}${ieBlock}${printBtn}
            </span>
            ${panel}
        </span>`;
    }
    function insightFilterUnits(rows, mode, searchFields) {
        const st = insightGetFilter(mode);
        let out = rows || [];
        if (st.building && st.building !== 'all') out = out.filter((u) => toStr(u.building) === st.building);
        const q = toStr(st.search).toLowerCase();
        if (q) {
            const fields = searchFields || ['building', 'unit', 'tenant', 'status', 'tenantEn', 'endDate', 'floor'];
            out = out.filter((u) => fields.some((f) => toStr(u[f]).toLowerCase().includes(q)));
        }
        return out;
    }
    function insightFilterOwnerSummary(rows, mode) {
        const st = insightGetFilter(mode);
        let out = rows || [];
        if (st.building && st.building !== 'all') out = out.filter((r) => (ownerBuildingMap[r.owner] || []).includes(st.building));
        const q = toStr(st.search).toLowerCase();
        if (q) out = out.filter((r) => toStr(r.owner).toLowerCase().includes(q));
        return out;
    }
    function insightFilterAgg(rows, mode) {
        const st = insightGetFilter(mode);
        let out = rows || [];
        if (st.building && st.building !== 'all') out = out.filter((r) => toStr(r.building) === st.building);
        const q = toStr(st.search).toLowerCase();
        if (q) {
            out = out.filter((r) => `${r.building} ${r.n} ${r.sum}`.toLowerCase().includes(q));
        }
        return out;
    }
    function insightFilterEvList(list, mode) {
        const st = insightGetFilter(mode);
        let out = list || [];
        if (st.building && st.building !== 'all') out = out.filter((e) => toStr(e.building) === st.building);
        const q = toStr(st.search).toLowerCase();
        if (q) {
            out = out.filter((e) => [e.building, e.unit, e.tenant, e.requestDate, e.plannedDate].some((x) => toStr(x).toLowerCase().includes(q)));
        }
        return out;
    }
    function insightFilterResList(list, mode) {
        const st = insightGetFilter(mode);
        let out = list || [];
        if (st.building && st.building !== 'all') out = out.filter((r) => toStr(r.building) === st.building);
        const q = toStr(st.search).toLowerCase();
        if (q) {
            out = out.filter((r) => [r.building, r.unit, r.reservedBy, r.phone, r.since].some((x) => toStr(x).toLowerCase().includes(q)));
        }
        return out;
    }
    function insightSortRows(rows, mode, getters) {
        const st = insightGetFilter(mode);
        const dir = st.sortDir === 'asc' ? 1 : -1;
        const key = st.sortKey;
        const get = (getters && getters[key]) || getters.default || ((x) => toStr(x.building));
        return [...rows].sort((a, b) => compareSmart(get(a), get(b)) * dir);
    }

    function renderInsightContent() {
        const top = insightNavStack[insightNavStack.length - 1];
        const backBtn = document.getElementById('insightBackBtn');
        const titleEl = document.getElementById('insightModalTitle');
        const toolbar = document.getElementById('insightToolbar');
        const body = document.getElementById('insightBody');
        if (!top || !body) return;
        if (backBtn) backBtn.style.display = insightNavStack.length > 1 ? 'inline-block' : 'none';
        if (toolbar) toolbar.innerHTML = '';

        if (top.mode === 'building' && top.building) {
            if (titleEl) titleEl.textContent = `${t('مبنى', 'Building')} — ${top.building}`;
            if (toolbar) {
                const bj = JSON.stringify(top.building);
                toolbar.innerHTML = `
                    <button type="button" class="btn-primary mini-btn" onclick='openPropertyPrintMenu("building", ${bj})'>🖨️ ${t('طباعة التقرير', 'Print report')}</button>`;
            }
            const units = getUnitsData().filter((u) => u.building === top.building);
            const linkedOwners = ownersList.filter((o) => isBuildingLinkedToOwner(o, top.building));
            window._insightUnitRows = units;
            body.innerHTML = `
                ${renderBuildingProfileSummary(top.building)}
                <div class="insight-nested" style="margin-bottom:12px">
                    <h6>${t('ربط المالك بالمبنى', 'Link owner to building')}</h6>
                    <div class="registry-form" style="display:grid;grid-template-columns:2fr auto;gap:8px">
                        <select id="buildingOwnerLinkSelect">
                            <option value="">${t('اختر مالكاً لربطه بهذا المبنى', 'Select owner to link to this building')}</option>
                            ${ownersList.map((o) => `<option value="${escHtml(o)}">${escHtml(o)}</option>`).join('')}
                        </select>
                        <button type="button" class="btn-primary" onclick='linkSelectedOwnerToBuilding(${JSON.stringify(top.building)})'>${t('ربط', 'Link')}</button>
                    </div>
                    <div style="margin-top:8px;font-size:12px;color:#555">${t('الملاك المرتبطون', 'Linked owners')}: ${linkedOwners.length ? linkedOwners.map((o) => `<span class="tag">${escHtml(o)} <button type="button" class="mini-btn" onclick='unlinkBuildingFromOwner(${JSON.stringify(o)}, ${JSON.stringify(top.building)})'>${t('فك', 'Unlink')}</button></span>`).join(' ') : t('لا يوجد ربط حالياً.', 'No links yet.')}</div>
                </div>
                <p style="font-size:12px;color:#555;margin:0 0 8px">${t('عدد الوحدات في هذا المبنى', 'Number of units in this building')}: <strong>${units.length}</strong></p>
                <table class="ops-table">
                    <thead><tr><th>${t('الوحدة', 'Unit')}</th><th>${t('الطابق', 'Floor')}</th><th>${t('النوع', 'Type')}</th><th>${t('الحالة', 'Status')}</th><th>${t('المستأجر', 'Tenant')}</th><th>${t('الإيجار', 'Rent')}</th><th></th></tr></thead>
                    <tbody>
                        ${units.map((u, i) => `
                            <tr>
                                <td>${escHtml(u.unit)}</td>
                                <td>${escHtml(u.floor)}</td>
                                <td>${escHtml(u.unitType)}</td>
                                <td>${escHtml(u.status)}</td>
                                <td>${escHtml(u.tenant)}</td>
                                <td>${formatOMR(u.monthlyRent)}</td>
                                <td><button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">${t('تفاصيل الوحدة', 'Unit details')}</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`;
            return;
        }

        if (top.mode === 'owner' && top.owner) {
            if (titleEl) titleEl.textContent = `${t('مالك', 'Owner')} — ${top.owner}`;
            const list = ownerBuildingMap[top.owner] || [];
            const availableBuildings = getAllKnownBuildings().filter((b) => !list.includes(b));
            body.innerHTML =
                `<div style="margin-bottom:12px"><button type="button" class="btn-outline" onclick="openPropertyPrintMenu('insight')">🖨️ ${t('طباعة التقرير', 'Print report')}</button></div>${renderOwnerProfileSummary(top.owner)}
                <div class="insight-nested" style="margin-bottom:12px">
                    <h6>${t('ربط مبنى بهذا المالك', 'Link a building to this owner')}</h6>
                    <div class="registry-form" style="display:grid;grid-template-columns:2fr auto;gap:8px">
                        <select id="ownerBuildingLinkSelect">
                            <option value="">${t('اختر مبنى للربط', 'Select a building to link')}</option>
                            ${availableBuildings.map((b) => `<option value="${escHtml(b)}">${escHtml(b)}</option>`).join('')}
                        </select>
                        <button type="button" class="btn-primary" onclick='linkSelectedBuildingToOwner(${JSON.stringify(top.owner)})'>${t('ربط', 'Link')}</button>
                    </div>
                </div>` +
                (list.length > 0
                    ? `<p style="font-size:12px;color:#555">${t('المباني المرتبطة بهذا المالك.', 'Buildings linked to this owner.')}</p><table class="ops-table"><thead><tr><th>#</th><th>${t('المبنى', 'Building')}</th><th></th></tr></thead><tbody>${list
                        .map(
                            (b, i) =>
                                `<tr><td>${i + 1}</td><td><button type="button" class="mini-btn" onclick='insightGoBuilding(${JSON.stringify(b)})'>${escHtml(b)}</button></td><td><button type="button" class="mini-btn" onclick='unlinkBuildingFromOwner(${JSON.stringify(top.owner)}, ${JSON.stringify(b)})'>${t('فك الربط', 'Unlink')}</button></td></tr>`
                        )
                        .join('')}</tbody></table>`
                    : `<p>${t('لا توجد مباني مربوطة بهذا المالك حالياً.', 'No buildings linked to this owner yet.')}</p>`);
            return;
        }

        if (top.mode === 'monthlyBuilding' && top.building) {
            if (titleEl) titleEl.textContent = `${t('تفصيل إيجار شهري', 'Monthly rent details')} — ${top.building}`;
            const units = getUnitsData().filter((u) => u.building === top.building && u.status === 'Rented');
            window._insightUnitRows = units;
            body.innerHTML = `<div style="margin-bottom:12px"><button type="button" class="btn-outline" onclick="openPropertyPrintMenu('insight')">🖨️ ${t('طباعة التقرير', 'Print report')}</button></div><table class="ops-table"><thead><tr><th>${t('الوحدة', 'Unit')}</th><th>${t('المستأجر', 'Tenant')}</th><th>${t('الإيجار الشهري', 'Monthly rent')}</th><th></th></tr></thead><tbody>
                ${units.map((u, i) => `<tr><td>${escHtml(u.unit)}</td><td>${escHtml(u.tenant)}</td><td>${formatOMR(u.monthlyRent)}</td><td><button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">${t('تفاصيل', 'Details')}</button></td></tr>`).join('')}
            </tbody></table>`;
            return;
        }

        if (top.mode === 'yearlyBuilding' && top.building) {
            if (titleEl) titleEl.textContent = `${t('تقدير إيجار سنوي', 'Yearly rent estimate')} — ${top.building}`;
            const units = getUnitsData().filter((u) => u.building === top.building && u.status === 'Rented');
            window._insightUnitRows = units;
            body.innerHTML = `<div style="margin-bottom:12px"><button type="button" class="btn-outline" onclick="openPropertyPrintMenu('insight')">🖨️ ${t('طباعة التقرير', 'Print report')}</button></div><p style="font-size:12px;color:#666">${t('القيمة = الإيجار الشهري × 12 (تقدير للوحدات المؤجرة).', 'Value = monthly rent × 12 (estimate for rented units).')}</p>
                <table class="ops-table"><thead><tr><th>${t('الوحدة', 'Unit')}</th><th>${t('المستأجر', 'Tenant')}</th><th>${t('شهري', 'Monthly')}</th><th>${t('سنوي (تقدير)', 'Yearly (estimate)')}</th><th></th></tr></thead><tbody>
                ${units.map((u, i) => {
                    const m = parseFloat(u.monthlyRent) || 0;
                    return `<tr><td>${escHtml(u.unit)}</td><td>${escHtml(u.tenant)}</td><td>${formatOMR(m)}</td><td>${formatOMR(m * 12)}</td><td><button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">${t('تفاصيل', 'Details')}</button></td></tr>`;
                }).join('')}
            </tbody></table>`;
            return;
        }

        if (top.mode === 'evictionBuilding' && top.building) {
            if (titleEl) titleEl.textContent = `${t('إخلاء', 'Eviction')} — ${top.building}`;
            const evs = evictionRequests.filter((e) => e.building === top.building);
            window._insightEvictRows = evs;
            body.innerHTML = `<div style="margin-bottom:12px"><button type="button" class="btn-outline" onclick="openPropertyPrintMenu('insight')">🖨️ ${t('طباعة التقرير', 'Print report')}</button></div><table class="ops-table"><thead><tr><th>${t('الوحدة', 'Unit')}</th><th>${t('المستأجر', 'Tenant')}</th><th>${t('تاريخ الطلب', 'Request date')}</th><th>${t('تاريخ الإخلاء المتوقع', 'Planned move-out')}</th><th></th></tr></thead><tbody>
                ${evs.map((e, idx) => {
                    return `<tr>
                        <td>${escHtml(e.unit)}</td>
                        <td>${escHtml(e.tenant)}</td>
                        <td>${escHtml(e.requestDate)}</td>
                        <td>${escHtml(e.plannedDate)}</td>
                        <td><button type="button" class="mini-btn" onclick="openUnitDetailsFromEvictionRow(${idx})">${t('بيانات الوحدة', 'Unit details')}</button></td>
                    </tr>`;
                }).join('')}
            </tbody></table>`;
            return;
        }

        const titles = {
            buildings: t('المباني', 'Buildings'),
            owners: t('الملاك', 'Owners'),
            units: t('جميع الوحدات', 'All units'),
            rented: t('الوحدات المؤجرة وعقود الإيجار', 'Rented units and contracts'),
            vacant: t('الوحدات الشاغرة', 'Vacant units'),
            reserved: t('الحجوزات', 'Reservations'),
            monthly: t('إجمالي الإيجار الشهري حسب المبنى', 'Total monthly rent by building'),
            yearly: t('إجمالي الإيجار السنوي (تقدير) حسب المبنى', 'Total yearly rent (estimate) by building'),
            exp30: t('عقود تنتهي خلال 30 يوماً', 'Contracts expiring within 30 days'),
            exp60: t('عقود تنتهي خلال 60 يوماً', 'Contracts expiring within 60 days'),
            exp90: t('عقود تنتهي خلال 90 يوماً', 'Contracts expiring within 90 days'),
            evictions: t('طلبات الإخلاء / المغادرة', 'Eviction / move-out requests')
        };
        if (titleEl) titleEl.textContent = titles[top.mode] || t('لوحة التحليل', 'Insight dashboard');

        if (top.mode === 'buildings') {
            if (toolbar) {
                toolbar.innerHTML = insightToolbarFiltersAndPrint('buildings', {
                    extraHtml: `<button type="button" class="btn-outline mini-btn" onclick="openPropertyPrintMenu('list')">🖨️ ${t('طباعة قائمة العقارات', 'Print list')}</button>`,
                    hidePrint: true,
                    importExportType: 'structure'
                });
            }
            const map = {};
            getAllKnownBuildings().forEach((b) => {
                map[b] = 0;
            });
            getUnitsData().forEach((u) => {
                if (!u.building) return;
                if (!map[u.building]) map[u.building] = 0;
                map[u.building]++;
            });
            const keys = Object.keys(map).sort((a, b) => a.localeCompare(b, 'ar'));
            const rowsB = keys.map((b) => ({
                building: b,
                unitCount: map[b],
                ownersCount: ownersList.filter((o) => isBuildingLinkedToOwner(o, b)).length
            }));
            const fRows = insightFilterAgg(
                rowsB.map((r) => ({ building: r.building, n: r.unitCount, sum: r.ownersCount })),
                'buildings'
            ).map((x) => ({ building: x.building, unitCount: x.n, ownersCount: x.sum }));
            const sorted = insightSortRows(fRows, 'buildings', {
                building: (r) => r.building,
                units: (r) => r.unitCount,
                owners: (r) => r.ownersCount,
                default: (r) => r.building
            });
            window._insightBuildingsList = sorted.map((r) => r.building);
            const isEditingExisting = !!buildingEditorState.open && !!buildingEditorState.originalName;
            body.innerHTML = `
                <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                    <button type="button" class="btn-primary" onclick="openBuildingEditor()">${buildingEditorState.open ? t('نموذج العقار مفتوح', 'Property form is open') : t('إضافة عقار جديد', 'Add new property')}</button>
                </div>
                ${buildingEditorState.open ? renderBuildingEditor(getEditableBuildingProfile(buildingEditorState.originalName)) : ''}
                ${isEditingExisting ? '' : `<table class="ops-table"><thead><tr>
                ${insightThSort('buildings', 'building', t('المبنى', 'Building'))}
                ${insightThSort('buildings', 'units', t('عدد الوحدات', 'Units'))}
                ${insightThSort('buildings', 'owners', t('عدد الملاك', 'Owners'))}
                <th></th><th></th>
            </tr></thead><tbody>
                ${sorted.map((row) => {
                    const b = row.building;
                    const ownersCount = row.ownersCount;
                    return `<tr><td>${escHtml(b)}</td><td>${row.unitCount}</td><td>${ownersCount}</td><td><button type="button" class="mini-btn" onclick='insightGoBuilding(${JSON.stringify(b)})'>${t('فتح', 'Open')}</button></td><td><button type="button" class="mini-btn" onclick='openBuildingEditor(${JSON.stringify(b)})'>${t('تعديل', 'Edit')}</button></td></tr>`;
                }).join('')}
            </tbody></table>`}`;
            localizeBilingualUi();
            return;
        }

        if (top.mode === 'owners') {
            if (toolbar) {
                toolbar.innerHTML = insightToolbarFiltersAndPrint('owners', { extraHtml: ''
                });
            }
            const isOwnerEditorOpen = !!ownerEditorState.open;
            const ownerRows = ownersList.map((o) => ({ owner: o, links: (ownerBuildingMap[o] || []).length }));
            const fOwn = insightFilterOwnerSummary(ownerRows, 'owners');
            const sortedOwn = insightSortRows(fOwn, 'owners', {
                owner: (r) => r.owner,
                links: (r) => r.links,
                default: (r) => r.owner
            });
            body.innerHTML = `
                <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                    <button type="button" class="btn-primary" onclick="openOwnerEditor()">${ownerEditorState.open ? t('نموذج المالك مفتوح', 'Owner form is open') : t('إضافة مالك جديد', 'Add new owner')}</button>
                    ${isOwnerEditorOpen ? '' : `<button type="button" class="btn-outline" onclick="triggerOwnersExcelImport()">${t('استيراد الملاك من Excel', 'Import owners from Excel')}</button>
                    <button type="button" class="btn-outline" onclick="exportOwnersToExcel()">${t('تصدير الملاك إلى Excel', 'Export owners to Excel')}</button>`}
                </div>
                ${ownerEditorState.open ? renderOwnerEditor(getEditableOwnerProfile(ownerEditorState.originalName)) : ''}
                ${isOwnerEditorOpen ? '' : `<table class="ops-table"><thead><tr><th>#</th>
                ${insightThSort('owners', 'owner', t('اسم المالك', 'Owner name'))}
                ${insightThSort('owners', 'links', t('عدد المباني', 'Linked buildings'))}
                <th></th><th></th>
            </tr></thead><tbody>
                ${sortedOwn.map((row, i) => {
                    const o = row.owner;
                    const n = row.links;
                    const ownerLabel = appUiLanguage === 'en' ? (toStr(ownerProfiles[o]?.fullNameEn) || toStr(ownerProfiles[o]?.nameEn) || o) : o;
                    return `<tr><td>${i + 1}</td><td>${escHtml(ownerLabel)}</td><td>${n}</td><td><button type="button" class="mini-btn" onclick='insightGoOwner(${JSON.stringify(o)})'>${t('تفاصيل', 'Details')}</button></td><td><button type="button" class="mini-btn" onclick='openOwnerEditor(${JSON.stringify(o)})'>${t('تعديل', 'Edit')}</button></td></tr>`;
                }).join('')}
            </tbody></table>`}`;
            return;
        }

        if (top.mode === 'units') {
            if (toolbar) {
                toolbar.innerHTML = insightToolbarFiltersAndPrint('units', {});
            }
            const all = getUnitsData();
            const filtered = insightFilterUnits(all, 'units');
            const sorted = insightSortRows(filtered, 'units', {
                building: (u) => u.building,
                unit: (u) => u.unit,
                status: (u) => u.status,
                tenant: (u) => u.tenant,
                default: (u) => u.building
            });
            window._insightUnitRows = sorted;
            body.innerHTML = `<table class="ops-table"><thead><tr>
                ${insightThSort('units', 'building', t('المبنى', 'Building'))}
                ${insightThSort('units', 'unit', t('الوحدة', 'Unit'))}
                ${insightThSort('units', 'status', t('الحالة', 'Status'))}
                ${insightThSort('units', 'tenant', t('المستأجر', 'Tenant'))}
                <th></th>
            </tr></thead><tbody>
                ${sorted.map((u, i) => `<tr><td>${escHtml(u.building)}</td><td>${escHtml(u.unit)}</td><td>${escHtml(u.status)}</td><td>${escHtml(u.tenant)}</td><td><button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">${t('تفاصيل', 'Details')}</button></td></tr>`).join('')}
            </tbody></table>`;
            return;
        }

        if (top.mode === 'rented') {
            if (toolbar) {
                toolbar.innerHTML = insightToolbarFiltersAndPrint('rented', { importExportType: 'contracts' });
            }
            const rows = getUnitsData()
                .filter((u) => u.status === 'Rented')
                .map((u) => ({ ...u, _contractStateSearch: getContractLifecycleSearchBlob(u) }));
            const filtered = insightFilterUnits(rows, 'rented', ['building', 'unit', 'tenant', 'endDate', 'agreementNo', '_contractStateSearch']);
            const sorted = insightSortRows(filtered, 'rented', {
                building: (u) => u.building,
                unit: (u) => u.unit,
                tenant: (u) => u.tenant,
                endDate: (u) => u.endDate || '',
                contractState: (u) => getContractLifecycleStateRank(getContractLifecycleStateKey(u)),
                default: (u) => u.building
            });
            window._insightUnitRows = sorted;
            body.innerHTML = `<table class="ops-table"><thead><tr>
                ${insightThSort('rented', 'building', t('المبنى', 'Building'))}
                ${insightThSort('rented', 'unit', t('الوحدة', 'Unit'))}
                ${insightThSort('rented', 'tenant', t('المستأجر', 'Tenant'))}
                ${insightThSort('rented', 'endDate', t('نهاية العقد', 'Contract end'))}
                ${insightThSort('rented', 'contractState', t('حالة العقد / Contract state'))}
                <th></th>
            </tr></thead><tbody>
                ${sorted.map((u, i) => { const k = getContractLifecycleStateKey(u); return `<tr><td>${escHtml(u.building)}</td><td>${escHtml(u.unit)}</td><td>${escHtml(u.tenant)}</td><td>${escHtml(u.endDate)}</td><td><span class="chip contract-state-${k}">${getContractLifecycleLabelForKey(k)}</span></td><td><button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">${t('عقد', 'Contract')}</button></td></tr>`; }).join('')}
            </tbody></table>`;
            return;
        }

        if (top.mode === 'vacant') {
            if (toolbar) {
                toolbar.innerHTML = insightToolbarFiltersAndPrint('vacant', {});
            }
            const rows = getUnitsData().filter((u) => u.status === 'Vacant' && !isReservedUnitRow(u));
            const filtered = insightFilterUnits(rows, 'vacant');
            const sorted = insightSortRows(filtered, 'vacant', {
                building: (u) => u.building,
                unit: (u) => u.unit,
                rent: (u) => parseFloat(u.monthlyRent) || 0,
                default: (u) => u.building
            });
            window._insightUnitRows = sorted;
            body.innerHTML = `<p style="font-size:12px;color:#555">${t('وحدات شاغرة — سجّل حجزاً ثم حوّله لعقد إيجار من «وحدات محجوزة» عند الجاهزية.', 'Vacant units — add a reservation, then convert it to a tenancy contract from Reserved units when ready.')}</p>
                <table class="ops-table"><thead><tr>
                ${insightThSort('vacant', 'building', t('المبنى', 'Building'))}
                ${insightThSort('vacant', 'unit', t('الوحدة', 'Unit'))}
                ${insightThSort('vacant', 'rent', t('إيجار مرجعي', 'Ref. rent'))}
                <th></th>
            </tr></thead><tbody>
                ${sorted.map((u, i) => `<tr><td>${escHtml(u.building)}</td><td>${escHtml(u.unit)}</td><td>${formatOMR(u.monthlyRent)}</td><td>
                    <button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">${t('تفاصيل', 'Details')}</button>
                    <button type="button" class="mini-btn" onclick="startReservationForVacant(${i})">${t('حجز', 'Reserve')}</button>
                </td></tr>`).join('')}
            </tbody></table>`;
            return;
        }

        if (top.mode === 'reserved') {
            if (toolbar) {
                toolbar.innerHTML = insightToolbarFiltersAndPrint('reserved', {});
            }
            const rows = getUnitsData().filter((u) => isReservedUnitRow(u));
            const filteredRows = insightFilterUnits(rows, 'reserved');
            const sortedRows = insightSortRows(filteredRows, 'reserved', {
                building: (u) => u.building,
                unit: (u) => u.unit,
                status: (u) => u.status,
                reservedBy: () => '',
                default: (u) => u.building
            });
            window._insightUnitRows = sortedRows;
            let resPairs = unitReservations.map((r, i) => ({ r, i }));
            resPairs = resPairs.filter(({ r }) => {
                const st = insightGetFilter('reserved');
                if (st.building && st.building !== 'all' && toStr(r.building) !== st.building) return false;
                const q = toStr(st.search).toLowerCase();
                if (!q) return true;
                return [r.building, r.unit, r.reservedBy, r.phone, r.since].some((x) => toStr(x).toLowerCase().includes(q));
            });
            const stf = insightGetFilter('reserved');
            const dir = stf.sortDir === 'asc' ? 1 : -1;
            const gk = stf.sortKey;
            resPairs.sort((a, b) => {
                const ra = a.r;
                const rb = b.r;
                let va;
                let vb;
                if (gk === 'unit') {
                    va = ra.unit;
                    vb = rb.unit;
                } else if (gk === 'reservedBy') {
                    va = ra.reservedBy;
                    vb = rb.reservedBy;
                } else if (gk === 'status') {
                    va = '';
                    vb = '';
                } else {
                    va = ra.building;
                    vb = rb.building;
                }
                return compareSmart(va, vb) * dir;
            });
            const resHtml = resPairs
                .map(
                    ({ r, i }) => `
                <tr>
                    <td>${escHtml(r.building)}</td>
                    <td>${escHtml(r.unit)}</td>
                    <td>${escHtml(r.reservedBy)}</td>
                    <td>${escHtml(r.phone)}</td>
                    <td>${escHtml(r.since)}</td>
                    <td>
                    <div style="font-size:11px;margin-bottom:6px;color:${toStr(r.state) === 'draft' ? '#8a5a00' : '#1b5e20'}">${toStr(r.state) === 'draft' ? t('🟡 مسودة', '🟡 Draft') : t('🟢 مكتمل', '🟢 Completed')}</div>
                    <button type="button" class="mini-btn" onclick="resumeReservationDraft(${i})">${t('استكمال الحجز', 'Resume reservation')}</button>
                    <button type="button" class="mini-btn" onclick="removeReservation(${i})">${t('إلغاء حجز', 'Cancel reservation')}</button>
                    ${toStr(r.state) === 'confirmed' ? `<button type="button" class="mini-btn" onclick="printReservationForm(${i})">${t('🖨️ طباعة استمارة الحجز', '🖨️ Print reservation form')}</button>` : ''}
                    <button type="button" class="mini-btn" onclick="convertReservationToTenancyContract(${i})">${t('تحويل عقد الايجار', 'Convert tenancy contract')}</button></td>
                </tr>`
                )
                .join('');
            body.innerHTML = `
                <div class="insight-nested">
                    <h6>${t('تسجيل حجز جديد', 'New reservation')}</h6>
                    <div class="registry-form" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">
                        <input id="resBuilding" placeholder="${t('المبنى', 'Building')}" list="insightBuildingList">
                        <input id="resUnit" placeholder="${t('الوحدة', 'Unit')}">
                        <input id="resName" placeholder="${t('اسم المحجوز', 'Reserved by')}">
                        <input id="resPhone" placeholder="${t('الجوال', 'Phone')}">
                        <button type="button" class="btn-primary" onclick="submitReservation()">➕ ${t('حفظ الحجز', 'Save reservation')}</button>
                    </div>
                </div>
                <datalist id="insightBuildingList">${[...new Set(getUnitsData().map((u) => u.building))].map((b) => `<option value="${escHtml(b)}">`).join('')}</datalist>
                <h6 style="margin:14px 0 6px">${t('الحجوزات المسجلة', 'Registered reservations')}</h6>
                <table class="ops-table"><thead><tr><th>${t('المبنى', 'Building')}</th><th>${t('الوحدة', 'Unit')}</th><th>${t('المحجوز', 'Reserved by')}</th><th>${t('الجوال', 'Phone')}</th><th>${t('التاريخ', 'Date')}</th><th></th></tr></thead><tbody>${resHtml || `<tr><td colspan="6">${t('لا توجد حجوزات مسجلة بعد.', 'No reservations yet.')}</td></tr>`}</tbody></table>
                <h6 style="margin:14px 0 6px">${t('وحدات بحالة «محجوز» في البيانات', 'Units marked reserved')}</h6>
                <table class="ops-table"><thead><tr>
                    ${insightThSort('reserved', 'building', t('المبنى', 'Building'))}
                    ${insightThSort('reserved', 'unit', t('الوحدة', 'Unit'))}
                    ${insightThSort('reserved', 'status', t('الحالة', 'Status'))}
                    <th></th>
                </tr></thead><tbody>
                    ${sortedRows.map((u, i) => `<tr><td>${escHtml(u.building)}</td><td>${escHtml(u.unit)}</td><td>${escHtml(u.status)}</td><td><button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">${t('تفاصيل', 'Details')}</button></td></tr>`).join('')}
                </tbody></table>`;
            return;
        }

        if (top.mode === 'monthly') {
            if (toolbar) {
                toolbar.innerHTML = insightToolbarFiltersAndPrint('monthly', {});
            }
            const map = {};
            getUnitsData()
                .filter((u) => u.status === 'Rented')
                .forEach((u) => {
                    const b = u.building || '-';
                    if (!map[b]) map[b] = { n: 0, sum: 0 };
                    map[b].n++;
                    map[b].sum += parseFloat(u.monthlyRent) || 0;
                });
            const keys = Object.keys(map).sort((a, b) => a.localeCompare(b, 'ar'));
            const agg = keys.map((b) => ({ building: b, n: map[b].n, sum: map[b].sum }));
            const fAgg = insightFilterAgg(agg, 'monthly');
            const sorted = insightSortRows(fAgg, 'monthly', {
                building: (r) => r.building,
                n: (r) => r.n,
                sum: (r) => r.sum,
                default: (r) => r.building
            });
            body.innerHTML = `<table class="ops-table"><thead><tr>
                ${insightThSort('monthly', 'building', t('المبنى', 'Building'))}
                ${insightThSort('monthly', 'n', t('وحدات مؤجرة', 'Rented units'))}
                ${insightThSort('monthly', 'sum', t('مجموع شهري OMR', 'Monthly total OMR'))}
                <th></th>
            </tr></thead><tbody>
                ${sorted.map((row) => {
                    const b = row.building;
                    return `<tr><td>${escHtml(b)}</td><td>${row.n}</td><td>${formatOMR(row.sum)}</td><td><button type="button" class="mini-btn" onclick='insightGoMonthlyBuilding(${JSON.stringify(b)})'>${t('تفصيل وحدات', 'Unit details')}</button></td></tr>`;
                }).join('')}
            </tbody></table>`;
            return;
        }

        if (top.mode === 'yearly') {
            if (toolbar) {
                toolbar.innerHTML = insightToolbarFiltersAndPrint('yearly', {});
            }
            const map = {};
            getUnitsData()
                .filter((u) => u.status === 'Rented')
                .forEach((u) => {
                    const b = u.building || '-';
                    if (!map[b]) map[b] = { n: 0, sum: 0 };
                    map[b].n++;
                    const m = parseFloat(u.monthlyRent) || 0;
                    map[b].sum += m * 12;
                });
            const keys = Object.keys(map).sort((a, b) => a.localeCompare(b, 'ar'));
            const agg = keys.map((b) => ({ building: b, n: map[b].n, sum: map[b].sum }));
            const fAgg = insightFilterAgg(agg, 'yearly');
            const sorted = insightSortRows(fAgg, 'yearly', {
                building: (r) => r.building,
                n: (r) => r.n,
                sum: (r) => r.sum,
                default: (r) => r.building
            });
            body.innerHTML = `<p style="font-size:12px;color:#666">${t('مجموع (إيجار شهري × 12) لكل مبنى — تقدير سنوي.', 'Sum (monthly × 12) per building — yearly estimate.')}</p>
                <table class="ops-table"><thead><tr>
                ${insightThSort('yearly', 'building', t('المبنى', 'Building'))}
                ${insightThSort('yearly', 'n', t('وحدات', 'Units'))}
                ${insightThSort('yearly', 'sum', t('مجموع سنوي تقديري', 'Yearly estimate total'))}
                <th></th>
            </tr></thead><tbody>
                ${sorted.map((row) => {
                    const b = row.building;
                    return `<tr><td>${escHtml(b)}</td><td>${row.n}</td><td>${formatOMR(row.sum)}</td><td><button type="button" class="mini-btn" onclick='insightGoYearlyBuilding(${JSON.stringify(b)})'>${t('تفصيل', 'Detail')}</button></td></tr>`;
                }).join('')}
            </tbody></table>`;
            return;
        }

        if (top.mode === 'exp30' || top.mode === 'exp60' || top.mode === 'exp90') {
            const maxD = top.mode === 'exp30' ? 30 : top.mode === 'exp60' ? 60 : 90;
            const em = top.mode;
            if (toolbar) {
                toolbar.innerHTML = insightToolbarFiltersAndPrint(em, {});
            }
            let list = getUnitsData().filter((u) => {
                const d = daysUntil(u.endDate);
                return d !== null && d >= 0 && d <= maxD && toStr(u.tenant);
            });
            list = insightFilterUnits(list, em, ['building', 'unit', 'tenant', 'endDate']);
            list = insightSortRows(list, em, {
                building: (u) => u.building,
                unit: (u) => u.unit,
                tenant: (u) => u.tenant,
                endDate: (u) => u.endDate || '',
                days: (u) => daysUntil(u.endDate),
                default: (u) => u.building
            });
            window._insightUnitRows = list;
            body.innerHTML = `<table class="ops-table"><thead><tr>
                ${insightThSort(em, 'building', t('المبنى', 'Building'))}
                ${insightThSort(em, 'unit', t('الوحدة', 'Unit'))}
                ${insightThSort(em, 'tenant', t('المستأجر', 'Tenant'))}
                ${insightThSort(em, 'endDate', t('النهاية', 'End'))}
                ${insightThSort(em, 'days', t('متبقي', 'Days left'))}
                <th></th>
            </tr></thead><tbody>
                ${list.map((u, i) => `<tr><td>${escHtml(u.building)}</td><td>${escHtml(u.unit)}</td><td>${escHtml(u.tenant)}</td><td>${escHtml(u.endDate)}</td><td>${daysUntil(u.endDate)}</td><td><button type="button" class="mini-btn" onclick="openInsightUnitAt(${i})">${t('تفاصيل', 'Details')}</button></td></tr>`).join('')}
            </tbody></table>`;
            return;
        }

        if (top.mode === 'evictions') {
            if (toolbar) {
                toolbar.innerHTML = insightToolbarFiltersAndPrint('evictions', {
                    extraHtml: `<button type="button" class="btn-outline mini-btn" onclick="insightAddEvictionPrompt()">➕ ${t('تسجيل طلب إخلاء', 'Add request')}</button>`
                });
            }
            if (!evictionRequests.length) {
                body.innerHTML = `<p>${t('لا توجد طلبات إخلاء مسجلة. استخدم «تسجيل طلب إخلاء».', 'No eviction requests yet. Use "Add request".')}</p>`;
                return;
            }
            const byB = {};
            evictionRequests.forEach((e) => {
                if (!byB[e.building]) byB[e.building] = [];
                byB[e.building].push(e);
            });
            const keys = Object.keys(byB).sort((a, b) => a.localeCompare(b, 'ar'));
            let sumRows = keys.map((b) => ({ building: b, count: byB[b].length }));
            const st0 = insightGetFilter('evictions');
            if (st0.building && st0.building !== 'all') sumRows = sumRows.filter((r) => r.building === st0.building);
            const qs = toStr(st0.search).toLowerCase();
            if (qs) sumRows = sumRows.filter((r) => toStr(r.building).toLowerCase().includes(qs) || String(r.count).includes(qs));
            sumRows = insightSortRows(sumRows, 'evictions', {
                building: (r) => r.building,
                count: (r) => r.count,
                unit: (r) => r.building,
                tenant: (r) => r.building,
                default: (r) => r.building
            });

            let evPairs = evictionRequests.map((e, idx) => ({ e, idx }));
            evPairs = evPairs.filter(({ e }) => {
                const st = insightGetFilter('evictions');
                if (st.building && st.building !== 'all' && e.building !== st.building) return false;
                const q = toStr(st.search).toLowerCase();
                if (!q) return true;
                return [e.building, e.unit, e.tenant, e.requestDate, e.plannedDate].some((x) => toStr(x).toLowerCase().includes(q));
            });
            const st1 = insightGetFilter('evictions');
            const dir = st1.sortDir === 'asc' ? 1 : -1;
            const gk = st1.sortKey;
            evPairs.sort((a, b) => {
                const ea = a.e;
                const eb = b.e;
                let va;
                let vb;
                if (gk === 'unit') {
                    va = ea.unit;
                    vb = eb.unit;
                } else if (gk === 'tenant') {
                    va = ea.tenant;
                    vb = eb.tenant;
                } else if (gk === 'count') {
                    va = byB[ea.building]?.length || 0;
                    vb = byB[eb.building]?.length || 0;
                } else {
                    va = ea.building;
                    vb = eb.building;
                }
                return compareSmart(va, vb) * dir;
            });

            body.innerHTML = `${sumRows.length ? `<table class="ops-table"><thead><tr>
                        ${insightThSort('evictions', 'building', t('المبنى', 'Building'))}
                        ${insightThSort('evictions', 'count', t('عدد الطلبات', 'Count'))}
                        <th></th>
                    </tr></thead><tbody>
                        ${sumRows.map((r) => `<tr><td>${escHtml(r.building)}</td><td>${r.count}</td><td><button type="button" class="mini-btn" onclick='insightGoEvictionBuilding(${JSON.stringify(r.building)})'>${t('عرض الوحدات', 'View units')}</button></td></tr>`).join('')}
                    </tbody></table>` : ''}
                    <h6 style="margin-top:14px">${t('كل الطلبات', 'All requests')}</h6>
                    <table class="ops-table"><thead><tr>
                        ${insightThSort('evictions', 'building', t('المبنى', 'Building'))}
                        ${insightThSort('evictions', 'unit', t('الوحدة', 'Unit'))}
                        ${insightThSort('evictions', 'tenant', t('المستأجر', 'Tenant'))}
                        <th>${t('الطلب', 'Request')}</th><th>${t('الإخلاء المتوقع', 'Planned')}</th><th></th>
                    </tr></thead><tbody>
                        ${evPairs.map(({ e, idx }) => {
                            return `<tr>
                                <td>${escHtml(e.building)}</td>
                                <td>${escHtml(e.unit)}</td>
                                <td>${escHtml(e.tenant)}</td>
                                <td>${escHtml(e.requestDate)}</td>
                                <td>${escHtml(e.plannedDate)}</td>
                                <td>
                                    <button type="button" class="mini-btn" onclick='openUnitDetailsByKey(${JSON.stringify(e.building)}, ${JSON.stringify(e.unit)})'>${t('الوحدة', 'Unit')}</button>
                                    <button type="button" class="mini-btn" onclick="removeEviction(${idx})">${t('حذف', 'Delete')}</button>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody></table>`;
            return;
        }

        body.innerHTML = '<p>لا يوجد عرض لهذا النوع.</p>';
    }

    function openInsightUnitAt(i) {
        const u = window._insightUnitRows[i];
        if (!u) return;
        closeDashboardInsight();
        openUnitDetailsForUnit(u);
    }

    function startReservationForVacant(index) {
        const u = window._insightUnitRows[index];
        if (!u) return;
        closeDashboardInsight();
        enterReservationModeForUnit(u);
        setWorkspaceMode('reservations');
    }

    function submitReservation() {
        const building = toStr(document.getElementById('resBuilding')?.value);
        const unit = toStr(document.getElementById('resUnit')?.value);
        const reservedBy = toStr(document.getElementById('resName')?.value);
        const phone = toStr(document.getElementById('resPhone')?.value);
        if (!building || !unit || !reservedBy) {
            alert('أكمل المبنى والوحدة واسم المحجوز.');
            return;
        }
        unitReservations.push({
            building,
            unit,
            reservedBy,
            phone,
            since: new Date().toISOString().slice(0, 10)
        });
        saveDashboardAux();
        renderInsightContent();
    }

    function upsertReservationFromCurrentForm(options = {}) {
        const d = getFormData();
        const asDraft = options.asDraft === true;
        const allowIncomplete = options.allowIncomplete === true;
        const building = toStr(d.buildingNo);
        const unit = toStr(d.flatNo);
        const reservedBy = toStr(d.tenantNameAr) || toStr(d.tenantNameEn);
        if (!building || !unit) return false;
        if (!reservedBy && !allowIncomplete) return false;
        const phone = toStr(d.tenantMobile);
        const idx = unitReservations.findIndex((r) => toStr(r.building) === building && normalizeUnit(r.unit) === normalizeUnit(unit));
        const row = {
            building,
            unit,
            reservedBy: reservedBy || t('مسودة بدون اسم مستأجر', 'Draft without tenant name'),
            phone,
            agreementNo: toStr(d.agreementNo),
            since: idx >= 0 ? (toStr(unitReservations[idx].since) || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10),
            state: asDraft ? 'draft' : 'confirmed',
            formData: { ...d, _savedAt: new Date().toISOString() }
        };
        if (idx >= 0) unitReservations[idx] = row;
        else unitReservations.push(row);
        return true;
    }

    function removeReservation(i) {
        unitReservations.splice(i, 1);
        saveDashboardAux();
        renderInsightContent();
    }

    function convertReservationToTenancyContract(i) {
        const r = unitReservations[i];
        if (!r) return;
        const b = toStr(r.building);
        const uN = normalizeUnit(r.unit);
        loadDashboardAux();
        if (buildingProfiles && typeof buildingProfiles === 'object') {
            try { syncManagedUnitsFromProfiles(); } catch (e) {}
        }
        const u =
            (managedUnitsData || []).find((x) => toStr(x.building) === b && normalizeUnit(x.unit) === uN) ||
            (() => {
                const src = importedUnitsData.length ? importedUnitsData : unitsDataset;
                return (src || []).find((x) => toStr(x.building) === b && normalizeUnit(x.unit) === uN);
            })();
        if (!u) {
            alert(t('لم يُعثر على بيانات الوحدة في الجدول.', 'The unit was not found in the units table.'));
            return;
        }
        if (
            !confirm(
                t(
                    'تحويل الحجز إلى عقد إيجار (مسودة)؟\n\nسُتزال الوحدة من «المحجوز» وتُفتح في شاشة العقود.\nاضغط «إلغاء» للإبقاء على الحجز دون تغيير.',
                    'Convert this reservation to a tenancy contract (draft)?\n\nThe unit will leave Reserved and open in the contracts workspace.\nPress Cancel to keep the reservation unchanged.'
                )
            )
        ) {
            return;
        }
        unitReservations.splice(i, 1);
        saveDashboardAux();
        closeDashboardInsight();
        prefillContractFromUnit(u, false);
        const d =
            r.formData && typeof r.formData === 'object'
                ? { ...r.formData }
                : {
                    type: 'جديد New',
                    buildingNo: toStr(r.building),
                    flatNo: toStr(r.unit),
                    tenantNameAr: toStr(r.reservedBy),
                    tenantMobile: toStr(r.phone)
                };
        applyObjectToContractFormFields(d);
        if (!toStr(document.getElementById('buildingNo')?.value)) {
            const bel = document.getElementById('buildingNo');
            if (bel) bel.value = toStr(r.building);
        }
        if (!toStr(document.getElementById('flatNo')?.value)) {
            const fel = document.getElementById('flatNo');
            if (fel) fel.value = toStr(r.unit);
        }
        if (!toStr(document.getElementById('tenantNameAr')?.value) && toStr(r.reservedBy)) {
            const tName = document.getElementById('tenantNameAr');
            if (tName) tName.value = toStr(r.reservedBy);
        }
        if (!toStr(document.getElementById('tenantMobile')?.value) && toStr(r.phone)) {
            const tPhone = document.getElementById('tenantMobile');
            if (tPhone) tPhone.value = toStr(r.phone);
        }
        const ag = document.getElementById('agreementNo');
        if (ag) ag.value = nextContractAgreementDraftNumber();
        ensureTypeSelectAlwaysNew();
        contractEntryContext = { mode: 'contract', unit: null };
        updateContractWorkspaceContextUi();
        setWorkspaceMode('contracts');
        syncUnitDerivedFieldsFromSelection();
        updateSummaryPanel();
        renderDocument(0);
        renderOperationsTable();
        let __convPayload = null;
        try {
            __convPayload = collectStorableContractFullFromDom();
            localStorage.setItem('sfg_contract_full', JSON.stringify(__convPayload));
        } catch (e) {}
        if (__convPayload) {
            upsertTenancyContractDraftFromPayload(__convPayload.buildingNo, __convPayload.flatNo, __convPayload);
        }
        syncSfgKvToServer();
        alert(
            t(
                'تم ربط الحجز بعقد إيجار: تظهر الوحدة كمؤجرة (مسودة). أكمل التفاصيل ثم «حفظ جميع البيانات».',
                'Reservation is now a tenancy contract draft: the unit shows as rented. Complete the details, then use Save all data.'
            )
        );
    }

    function findTenantAddressBookEntryForReservation(reservation, formData) {
        const fd = formData || {};
        const tenantId = toStr(fd.tenantId).trim();
        const tenantNameAr = toStr(fd.tenantNameAr).trim();
        const tenantNameEn = toStr(fd.tenantNameEn).trim().toLowerCase();
        const tenantMobile = toStr(fd.tenantMobile || reservation?.phone).trim();
        return addressBookEntries.find((x) => {
            if (toStr(x.type) !== 'tenant') return false;
            if (tenantId && toStr(x.idNo).trim() === tenantId) return true;
            if (tenantNameAr && toStr(x.name).trim() === tenantNameAr) return true;
            if (tenantNameEn && toStr(x.nameEn).trim().toLowerCase() === tenantNameEn) return true;
            if (tenantMobile && toStr(x.mobile).trim() === tenantMobile) return true;
            return false;
        }) || null;
    }

    function buildReservationDocumentHtml(r) {
        if (!r) return '';
        const fd = (r.formData && typeof r.formData === 'object') ? r.formData : {};
        const d = { ...fd };
        d.agreementNo = toStr(d.agreementNo) || toStr(r.agreementNo);
        d.tenantNameAr = toStr(d.tenantNameAr) || toStr(r.reservedBy);
        d.tenantMobile = toStr(d.tenantMobile) || toStr(r.phone);
        d.buildingNo = toStr(d.buildingNo) || toStr(r.building);
        d.flatNo = toStr(d.flatNo) || toStr(r.unit);

        const buildingName = toStr(d.buildingNo);
        const unitNo = toStr(d.flatNo);
        const resolvedBuildingKey = resolveBuildingProfileKey(buildingName) || buildingName;
        const buildingProfile = getEditableBuildingProfile(resolvedBuildingKey);
        const unitRow = getUnitsData().find((x) => toStr(x.building) === buildingName && normalizeUnit(x.unit) === normalizeUnit(unitNo)) || {};
        const ownerNames = getOwnerNamesForBuilding(resolvedBuildingKey);
        const ownerName = ownerNames[0] || '';
        const ownerProfile = ownerName ? getEditableOwnerProfile(ownerName) : getEmptyOwnerProfile();
        const tenantEntry = findTenantAddressBookEntryForReservation(r, d) || getEmptyAddressBookEntry();
        const logoSrc = getPrintLogoSrc();
        const reservationNo = escHtml(toStr(d.agreementNo) || '-');
        const infoRow = (ar, en, val) => `
            <tr>
                <th class="ar-h">${escHtml(ar)}</th>
                <td class="mid-v">${escHtml(toStr(val) || '-')}</td>
                <th class="en-h">${escHtml(en)}</th>
            </tr>
        `;
        const pageShell = (bodyHtml, isLast) => `
            <section class="print-page ${isLast ? '' : 'page-break'}">
                <div class="sheet page-content">
                    <div class="doc-header">
                        <div class="company-box company-box-ar">
                            <div class="company-name-ar">مجموعة سيد فياض العالمية ش.م.م</div>
                            <div>ص.ب: 154 ، الرمز البريدي : 111 ، سلطنة عمان<br>هاتف: +968 24499484 ، فاكس: +968 24497482<br>ضريبة القيمة المضافة: OM1100300282</div>
                        </div>
                        <div class="logo-box"><img src="${logoSrc}" alt="SFG Logo"></div>
                        <div class="company-box company-box-en" dir="ltr">
                            <div class="company-name-en">SYED FAYYAZ GROUP INTERNATIONAL L.L.C</div>
                            <div>P.O.Box: 154, P.C: 111, Sultanate of Oman<br>Tel: +968 24499484, Fax: +968 24497482<br>VAT No.: OM1100300282</div>
                        </div>
                    </div>
                    <div class="doc-title">
                        <h2>استمارة الحجز</h2>
                        <h3>Reservation Form</h3>
                    </div>
                    <div class="doc-box">${bodyHtml}</div>
                </div>
            </section>
        `;
        const pages = [];
        pages.push(`
            <div class="section-header">بيانات الحجز / Reservation Details</div>
            <table class="info-table">
                ${infoRow('رقم الحجز','Reservation No.',toStr(d.agreementNo))}
                ${infoRow('تاريخ الحجز','Reservation Date',toStr(r.since))}
                ${infoRow('حالة الحجز','Reservation Status',toStr(r.state) === 'confirmed' ? t('مكتمل','Completed') : t('مسودة','Draft'))}
                ${infoRow('نوع العملية','Operation type',toStr(d.type) || 'جديد New')}
            </table>
            <div class="section-header">بيانات المالك / Owner Details</div>
            <table class="info-table">
                ${infoRow('اسم المالك','Owner Name',toStr(ownerProfile.fullName) || ownerName)}
                ${infoRow('اسم المالك بالإنجليزية','Owner Name (EN)',toStr(ownerProfile.fullNameEn))}
                ${infoRow('الرقم المدني','Civil ID',toStr(ownerProfile.civilId))}
                ${infoRow('تاريخ انتهاء البطاقة','ID expiry date',toStr(ownerProfile.idExpiryDate))}
                ${infoRow('الهاتف','Phone',toStr(ownerProfile.phone))}
                ${infoRow('البريد الإلكتروني','Email',toStr(ownerProfile.email))}
            </table>
            <div class="section-header">بيانات المستأجر / Tenant Details</div>
            <table class="info-table">
                ${infoRow('اسم المستأجر','Tenant Name',toStr(tenantEntry.name) || toStr(d.tenantNameAr))}
                ${infoRow('اسم المستأجر بالإنجليزية','Tenant Name (EN)',toStr(tenantEntry.nameEn) || toStr(d.tenantNameEn))}
                ${infoRow('الرقم المدني','Civil ID',toStr(tenantEntry.idNo) || toStr(d.tenantId))}
                ${infoRow('رقم الجوال','Mobile',toStr(tenantEntry.mobile) || toStr(d.tenantMobile))}
                ${infoRow('رقم إضافي','Extra number',toStr(tenantEntry.extraMobile))}
                ${infoRow('الجنسية','Nationality',toStr(tenantEntry.nationality))}
                ${infoRow('تاريخ انتهاء البطاقة','ID expiry date',toStr(tenantEntry.idExpiryDate))}
                ${infoRow('رقم الجواز','Passport number',toStr(tenantEntry.passport) || toStr(d.tenantPassport))}
                ${infoRow('تاريخ انتهاء الجواز','Passport expiry date',toStr(tenantEntry.passportExpiryDate))}
                ${infoRow('البريد الإلكتروني','Email',toStr(tenantEntry.email) || toStr(d.tenantEmail))}
            </table>
        `);
        pages.push(`
            <div class="section-header">بيانات العقار والوحدة / Property & Unit Details</div>
            <table class="info-table">
                ${infoRow('المبنى','Building',buildingName)}
                ${infoRow('الوحدة','Unit',unitNo)}
                ${infoRow('رقم المبنى','Building number',toStr(buildingProfile.buildingNo))}
                ${infoRow('رقم القطعة','Plot number',toStr(buildingProfile.plotNo))}
                ${infoRow('رقم المجمع','Complex number',toStr(buildingProfile.complexNo))}
                ${infoRow('نوع استعمال الأرض','Land use',toStr(buildingProfile.landUse))}
                ${infoRow('المحافظة','Governorate',toStr(buildingProfile.governorate))}
                ${infoRow('الولاية','Wilayat',toStr(buildingProfile.wilayat))}
                ${infoRow('المنطقة','Area',toStr(buildingProfile.area))}
                ${infoRow('الطابق','Floor',toStr(d.floorDetails || unitRow.floor))}
                ${infoRow('نوع الوحدة','Unit Type',toStr(d.unitType || unitRow.unitType))}
                ${infoRow('نوع الاستعمال','Usage type',toStr(d.usageType))}
                ${infoRow('عداد الكهرباء','Electricity meter',toStr(d.electricityMeter || unitRow.electricity || buildingProfile.electricityMeter))}
                ${infoRow('عداد الماء','Water meter',toStr(d.waterMeter || unitRow.water || buildingProfile.waterMeter))}
                ${infoRow('تاريخ البداية','Start Date',toStr(d.startDate))}
                ${infoRow('تاريخ النهاية','End Date',toStr(d.endDate))}
                ${infoRow('مدة العقد (أشهر)','Contract months',toStr(d.contractMonths))}
                ${infoRow('طريقة الدفع','Payment method',toStr(d.paymentMethod))}
                ${infoRow('الإيجار الشهري (ر.ع)','Monthly Rent (OMR)',toStr(d.monthlyRent))}
                ${infoRow('مبلغ التأمين (ر.ع)','Deposit (OMR)',toStr(d.depositAmount))}
                ${infoRow('فترة السماح (أيام)','Grace period (days)',toStr(d.graceDays))}
                ${infoRow('مبلغ السماح (ر.ع)','Grace amount (OMR)',toStr(d.graceAmount))}
            </table>
        `);
        pages.push(renderFullTermsFromData(d, { includeSignature: false, showTitle: true }));
        return `
            <html><head><title>${t('استمارة الحجز', 'Reservation form')}</title>
            <style>
                body{font-family:'Tajawal','Roboto',sans-serif;direction:rtl;background:#fff;color:#111;margin:0;padding:0 0 14mm}
                .sheet{padding:10px 12px}
                .print-page{position:relative}
                .page-content{min-height:auto}
                .page-break{page-break-after:always;break-after:page}
                .doc-header{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:2px solid #6b1f35;padding-bottom:8px}
                .company-box{flex:1;min-width:0;font-size:9pt;line-height:1.45;color:#2a2a2a}
                .company-box-ar{text-align:right}
                .company-box-en{text-align:left;direction:ltr;font-family:'Roboto',sans-serif}
                .company-name-ar,.company-name-en{font-weight:800;color:#6b1f35}
                .logo-box{flex:0 0 110px;text-align:center}
                .logo-box img{max-height:64px;max-width:110px;object-fit:contain}
                .doc-title{text-align:center;margin:12px 0 14px;border-bottom:2px double #6b1f35;padding-bottom:7px}
                .doc-title h2{font-size:16pt;color:#6b1f35;margin:0}
                .doc-title h3{font-size:12pt;margin:5px 0 0;color:#444;direction:ltr;font-family:'Roboto',sans-serif}
                .section-header{background:linear-gradient(135deg,#7A001F 0%,#4D0014 100%);color:#fff;padding:6px 10px;margin:12px 0 7px;font-weight:700;border:1px solid #2a2a2a}
                .info-table{
                    width:100%;
                    border-collapse:collapse;
                    margin-bottom:10px;
                    font-size:12px;
                    table-layout:fixed;
                    border:2px solid #2a2a2a !important;
                }
                .info-table th,.info-table td{
                    border:1.5px solid #2a2a2a !important;
                    padding:7px 9px;
                    vertical-align:top;
                }
                .info-table th{background:#f8ecef;color:#4D0014}
                .ar-h{direction:rtl;text-align:right;width:30%}
                .mid-v{
                    direction:rtl;
                    text-align:center;
                    width:40%;
                    font-weight:700;
                    border-left:2px solid #7A001F !important;
                    border-right:2px solid #7A001F !important;
                    background:#fcf7f8;
                }
                .en-h{direction:ltr;text-align:left;width:30%;font-family:'Roboto',sans-serif}
                .terms-clause{margin-bottom:2px}
                .terms-dual{display:grid;grid-template-columns:1fr 1fr;gap:14px}
                .terms-ar{direction:rtl;text-align:right}
                .terms-en{direction:ltr;text-align:left;font-family:'Roboto',sans-serif}
                .terms-table{width:100%;border-collapse:collapse;font-size:12px}
                .terms-table td{border:1px solid #2a2a2a}
                .doc-box{border:2px solid #2a2a2a;border-radius:10px;padding:10px}
                .print-footer{
                    position:fixed;
                    left:0;
                    right:0;
                    bottom:0;
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    gap:10px;
                    padding:2mm 12mm 1mm;
                    font-size:10pt;
                    color:#4a1525;
                    border-top:1px solid #bda8ae;
                    background:#fff;
                }
                .pf-right{ text-align:right; direction:rtl; font-weight:700; }
                .pf-left{ text-align:left; direction:ltr; font-family:'Roboto',sans-serif; font-weight:700; }
                .pf-center{ text-align:center; direction:rtl; font-weight:700; }
                .pf-page-no::after{ content: counter(page); }
                @page{size:A4 portrait;margin:10mm 12mm 16mm 12mm}
                @media print{body{margin:0;padding:0 0 14mm}}
            </style></head><body>
                ${pages.map((bodyHtml, idx) => pageShell(bodyHtml, idx === pages.length - 1)).join('')}
                <div class="print-footer">
                    <div class="pf-right">توقيع المؤجر / <span style="direction:ltr;font-family:'Roboto',sans-serif">Landlord Signature</span></div>
                    <div class="pf-center">الصفحة <span class="pf-page-no"></span> | رقم الحجز: <span dir="ltr">${reservationNo}</span></div>
                    <div class="pf-left"><span style="direction:rtl;font-family:'Tajawal',sans-serif">توقيع المستأجر</span> / Tenant Signature</div>
                </div>
                <script>window.onload=function(){window.print();}<\/script>
            </body></html>
        `;
    }

    function printReservationForm(i) {
        const r = unitReservations[i];
        if (!r) return;
        const template = DOCUMENT_SYSTEM_TEMPLATES.reservation_form;
        const html = template && typeof template.buildHtml === 'function' ? template.buildHtml(r) : '';
        if (!html) return;
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(html);
        win.document.close();
    }

    function resumeReservationDraft(i) {
        const r = unitReservations[i];
        if (!r) return;
        const d = r.formData && typeof r.formData === 'object'
            ? r.formData
            : {
                agreementNo: toStr(r.agreementNo) || nextReservationNumber(),
                type: 'جديد New',
                buildingNo: toStr(r.building),
                flatNo: toStr(r.unit),
                tenantNameAr: toStr(r.reservedBy),
                tenantMobile: toStr(r.phone)
            };
        applyObjectToContractFormFields(d);
        if (!toStr(document.getElementById('buildingNo')?.value)) {
            const b = document.getElementById('buildingNo');
            if (b) b.value = toStr(r.building);
        }
        if (!toStr(document.getElementById('flatNo')?.value)) {
            const u = document.getElementById('flatNo');
            if (u) u.value = toStr(r.unit);
        }
        if (!toStr(document.getElementById('tenantNameAr')?.value) && toStr(r.reservedBy)) {
            const tName = document.getElementById('tenantNameAr');
            if (tName) tName.value = toStr(r.reservedBy);
        }
        if (!toStr(document.getElementById('tenantMobile')?.value) && toStr(r.phone)) {
            const tPhone = document.getElementById('tenantMobile');
            if (tPhone) tPhone.value = toStr(r.phone);
        }
        contractEntryContext = { mode: 'reservation', unit: { building: r.building, unit: r.unit } };
        closeDashboardInsight();
        setWorkspaceMode('reservations');
        updateContractWorkspaceContextUi();
        syncUnitDerivedFieldsFromSelection();
        updateReservationCalculations();
        alert(t('✅ تم فتح مسودة الحجز لاستكمالها.', '✅ Reservation draft opened for completion.'));
    }

    function insightAddEvictionPrompt() {
        const building = prompt('المبنى:');
        if (!building) return;
        const unit = prompt('رقم الوحدة:');
        if (!unit) return;
        const tenant = prompt('اسم المستأجر:') || '';
        const requestDate = prompt('تاريخ الطلب (YYYY-MM-DD):') || new Date().toISOString().slice(0, 10);
        const plannedDate = prompt('تاريخ الإخلاء المتوقع (YYYY-MM-DD):') || '';
        evictionRequests.push({ building, unit, tenant, requestDate, plannedDate, notes: '' });
        saveDashboardAux();
        insightNavStack = [{ mode: 'evictions' }];
        renderInsightContent();
    }

    function removeEviction(i) {
        evictionRequests.splice(i, 1);
        saveDashboardAux();
        renderInsightContent();
    }

    function updateOperationsStats(data) {
        loadDashboardAux();
        const total = data.length;
        const rented = data.filter((x) => x.status === 'Rented').length;
        const vacant = data.filter((x) => x.status === 'Vacant' && !isReservedUnitRow(x)).length;
        const reserved = data.filter((u) => isReservedUnitRow(u)).length;
        const buildingsSet = new Set(getAllKnownBuildings());
        const buildingsCount = buildingsSet.size;
        const ownersCount = ownersList.length;

        const exp30 = data.filter((x) => {
            const days = daysUntil(x.endDate);
            return days !== null && days >= 0 && days <= 30;
        }).length;
        const exp60 = data.filter((x) => {
            const days = daysUntil(x.endDate);
            return days !== null && days >= 0 && days <= 60;
        }).length;
        const exp90 = data.filter((x) => {
            const days = daysUntil(x.endDate);
            return days !== null && days >= 0 && days <= 90;
        }).length;

        const monthlyTotal = data
            .filter((x) => x.status === 'Rented')
            .reduce((s, u) => s + (parseFloat(u.monthlyRent) || 0), 0);
        const yearlyEstimate = monthlyTotal * 12;

        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(value);
        };
        set('statBuildings', buildingsCount);
        set('statOwnersCount', ownersCount);
        set('statTotalUnits', total);
        set('statRentedUnits', rented);
        set('statVacantUnits', vacant);
        set('statReservedUnits', reserved);
        set('statMonthlyTotal', formatOMR(monthlyTotal));
        set('statYearlyTotal', formatOMR(yearlyEstimate));
        set('statExpiring30', exp30);
        set('statExpiring60', exp60);
        set('statExpiring90', exp90);
        set('statEvictionQueue', evictionRequests.length);
    }

    function updateBuildingsFilter(data) {
        const select = document.getElementById('unitsBuildingFilter');
        if (!select) return;
        const current = select.value || "all";
        const opts = ["all", ...new Set(data.map((x) => x.building).filter(Boolean))];
        select.innerHTML = opts.map((b) => `<option value="${b}">${b === "all" ? t('كل المباني', 'All buildings') : b}</option>`).join('');
        if (opts.includes(current)) select.value = current;
    }

    function updateBatchBuildingFilter(data) {
        const select = document.getElementById('batchBuildingFilter');
        if (!select) return;
        const current = select.value || "all";
        const opts = ["all", ...new Set(data.map((x) => x.building).filter(Boolean))];
        select.innerHTML = opts.map((b) => `<option value="${b}">${b === "all" ? t('كل المباني (للطباعة المرنة)', 'All buildings (flex print)') : b}</option>`).join('');
        if (opts.includes(current)) select.value = current;
    }

    function prefillContractFromUnit(unit, isRenewal = false) {
        setTenancyDraftCompletionFieldLocks(false);
        const fallback = new Date();
        const startDate = isRenewal
            ? new Date(new Date(unit.endDate || fallback).getTime() + 86400000).toISOString().slice(0, 10)
            : (unit.startDate || '');
        const endDate = isRenewal
            ? (() => {
                const s = new Date(startDate);
                s.setFullYear(s.getFullYear() + 1);
                s.setDate(s.getDate() - 1);
                return s.toISOString().slice(0, 10);
            })()
            : (unit.endDate || '');

        document.getElementById('agreementNo').value = isRenewal
            ? `${unit.agreementNo || `${unit.building}-${unit.unit}`}-R`
            : (unit.agreementNo || '');
        document.getElementById('contractTypeSelect').value = (unit.unitType === 'Shop' || unit.unitType === 'Office')
            ? 'تجاري Commercial'
            : 'سكني Residential';
        ensureTypeSelectAlwaysNew();
        document.getElementById('tenantNameAr').value = unit.tenant || '';
        document.getElementById('tenantNameEn').value = unit.tenant || '';
        document.getElementById('tenantMobile').value = unit.mobile || '';
        document.getElementById('buildingNo').value = unit.building || '';
        document.getElementById('flatNo').value = unit.unit || '';
        document.getElementById('floorDetails').value = unit.floor || '';
        document.getElementById('unitType').value = unit.unitType || 'Flat';
        document.getElementById('electricityMeter').value = unit.electricity || '';
        document.getElementById('waterMeter').value = unit.water || '';
        document.getElementById('monthlyRent').value = unit.monthlyRent || '';
        document.getElementById('startDate').value = startDate;
        document.getElementById('endDate').value = endDate;
        document.getElementById('contractMonths').value = 12;
        document.getElementById('depositAmount').value = unit.monthlyRent || '';
        try { renderInsuranceDepositItemsRows([]); } catch (e) {}
        try { renderCustomRentItemsRows([]); } catch (e) {}
        try {
            rebuildPaymentScheduleFromContractDefaults();
        } catch (e) {}
        updateSummaryPanel();
    }

    function openUnitContract(unit, isRenewal = false) {
        prefillContractFromUnit(unit, isRenewal);
        openDocumentsWindow();
    }

    function buildPayloadFromUnit(unit, isRenewal = false) {
        const fallback = new Date();
        const startDate = isRenewal
            ? new Date(new Date(unit.endDate || fallback).getTime() + 86400000).toISOString().slice(0, 10)
            : (unit.startDate || '');
        const endDate = isRenewal
            ? (() => {
                const s = new Date(startDate);
                s.setFullYear(s.getFullYear() + 1);
                s.setDate(s.getDate() - 1);
                return s.toISOString().slice(0, 10);
            })()
            : (unit.endDate || '');

        const contract = {
            agreementNo: isRenewal ? `${unit.agreementNo || `${unit.building}-${unit.unit}`}-R` : (unit.agreementNo || ''),
            contractType: (unit.unitType === 'Shop' || unit.unitType === 'Office') ? 'تجاري Commercial' : 'سكني Residential',
            type: 'جديد New',
            municipalFormNo: '',
            municipalContractNo: '',
            tenantNameAr: unit.tenant || '',
            tenantNameEn: unit.tenant || '',
            tenantId: '',
            tenantMobile: unit.mobile || '',
            tenantPassport: '',
            tenantEmail: '',
            buildingNo: unit.building || '',
            flatNo: unit.unit || '',
            floorDetails: unit.floor || '',
            unitType: unit.unitType || 'Flat',
            electricityMeter: unit.electricity || '',
            waterMeter: unit.water || '',
            monthlyRent: String(unit.monthlyRent || ''),
            contractMonths: '12',
            startDate,
            endDate,
            unitHandoverDate: '',
            agreedRentPaymentDay: '5',
            paymentMethod: 'شيك CHQ',
            depositAmount: String(unit.monthlyRent || ''),
            insuranceDepositItemsJson: '[]',
            customRentItemsJson: '[]',
            paymentSchedule: [],
            paymentScheduleJson: '[]'
        };
        return {
            contract,
            buildings: [...buildingsList],
            owners: [...ownersList],
            buildingProfiles,
            ownerProfiles,
            managedUnitsData,
            currentDoc: isRenewal ? 1 : 0
        };
    }

    function renderOperationsTable() {
        if (isViewerMode) return;
        const allData = getUnitsData();
        updateOperationsStats(allData);
        updateBuildingsFilter(allData);
        updateBatchBuildingFilter(allData);
        const filters = getFiltersState();

        const rows = allData.filter((u) => {
            const days = daysUntil(u.endDate);
            const normalizedStatus = getStatusToken(u, days);
            const hasUtilities = !!toStr(u.electricity) && !!toStr(u.water);

            const fullText = `${u.tenant || ''} ${u.unit || ''} ${u.building || ''} ${u.ownerNames || ''} ${u.electricity || ''} ${u.water || ''}`.toLowerCase();
            const matchSearch = !filters.search || fullText.includes(filters.search);
            const matchBuilding = filters.building === 'all' || u.building === filters.building;
            const matchStatus = filters.status === 'all' || normalizedStatus === filters.status;
            const matchExpire = filters.expire === 'all' || (days !== null && days >= 0 && days <= Number(filters.expire));
            const matchUtilities = filters.utilities === 'all'
                || (filters.utilities === 'complete' && hasUtilities)
                || (filters.utilities === 'missing' && !hasUtilities);
            return matchSearch && matchBuilding && matchStatus && matchExpire && matchUtilities;
        });

        rows.sort((a, b) => {
            const dir = operationsSortState.dir === 'asc' ? 1 : -1;
            const da = daysUntil(a.endDate);
            const db = daysUntil(b.endDate);
            let va = '';
            let vb = '';
            switch (operationsSortState.key) {
                case 'building': va = a.building; vb = b.building; break;
                case 'owner': va = a.ownerNames || formatOwnerNamesForBuilding(a.building); vb = b.ownerNames || formatOwnerNamesForBuilding(b.building); break;
                case 'unit': va = a.unit; vb = b.unit; break;
                case 'tenant': va = a.tenant; vb = b.tenant; break;
                case 'status': va = getStatusToken(a, da); vb = getStatusToken(b, db); break;
                case 'contractState': va = getContractLifecycleStateRank(getContractLifecycleStateKey(a)); vb = getContractLifecycleStateRank(getContractLifecycleStateKey(b)); break;
                case 'endDate': va = a.endDate || '9999-12-31'; vb = b.endDate || '9999-12-31'; break;
                case 'days': va = da === null ? 99999 : da; vb = db === null ? 99999 : db; break;
                case 'electricity': va = a.electricity; vb = b.electricity; break;
                case 'water': va = a.water; vb = b.water; break;
                default: va = da === null ? 99999 : da; vb = db === null ? 99999 : db;
            }
            return compareSmart(va, vb) * dir;
        });

        const tbody = document.getElementById('unitsTableBody');
        if (!tbody) return;
        window._unitsViewRows = rows;
        updateSortIndicators();
        tbody.innerHTML = rows.map((u) => {
            const days = daysUntil(u.endDate);
            const token = getStatusToken(u, days);
            const statusText = token === 'Expiring' ? t('قريب الانتهاء', 'Expiring soon')
                : token === 'Overdue' ? t('منتهي', 'Overdue')
                : token === 'NoEndDate' ? t('بدون تاريخ', 'No end date')
                : (u.status === 'Vacant' ? t('شاغر', 'Vacant') : t('مؤجر', 'Rented'));
            const statusClass = token === 'Expiring' || token === 'Overdue' ? 'expiring' : (u.status === 'Vacant' ? 'vacant' : 'rented');
            const rowIndex = rows.indexOf(u);
            const ownerRaw = u.ownerNames || formatOwnerNamesForBuilding(u.building) || '—';
            const ownerCell = appUiLanguage === 'en'
                ? toStr(ownerRaw).split(/\s*-\s*/).slice(-1)[0] || ownerRaw
                : ownerRaw;
            const lifeKey = getContractLifecycleStateKey(u);
            return `
                <tr>
                    <td>${u.building || ''}</td>
                    <td>${escHtml(ownerCell)}</td>
                    <td>${u.unit || ''}</td>
                    <td>${u.tenant || '-'}</td>
                    <td><span class="chip ${statusClass}">${statusText}</span></td>
                    <td><span class="chip contract-state-${lifeKey}">${getContractLifecycleLabelForKey(lifeKey)}</span></td>
                    <td>${u.endDate || '-'}</td>
                    <td>${days === null ? '-' : days}</td>
                    <td>${u.electricity || '-'}</td>
                    <td>${u.water || '-'}</td>
                    <td>
                        <div class="inline-actions">
                            <button class="mini-btn" onclick="openUnitDetailsModal(${rowIndex})">${t('تفاصيل', 'Details')}</button>
                            <button class="mini-btn" onclick="selectUnitFromTable(${rowIndex}, false, false)">${t('تعبئة', 'Fill')}</button>
                            <button class="mini-btn" onclick="selectUnitFromTable(${rowIndex}, true, true)">${t('تجديد', 'Renew')}</button>
                            <button class="mini-btn primary" onclick="selectUnitFromTable(${rowIndex}, false, true)">${t('طباعة', 'Print')}</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        renderRegistryTable();
    }

    function selectUnitFromTable(index, isRenewal, openViewer) {
        const unit = (window._unitsViewRows || [])[index];
        if (!unit) return;
        if (isRenewal && !ensureUnitActionAllowed(unit, 'renew')) return;
        if (openViewer) {
            openUnitContract(unit, isRenewal);
        } else {
            prefillContractFromUnit(unit, isRenewal);
            renderOperationsTable();
        }
    }


    function unitDetailsIsIncompleteTenancyDraft(unit) {
        if (!unit) return false;
        if (toStr(unit.status).toLowerCase() === 'vacant') return false;
        return isUnitInTenancyContractDraftMap(unit);
    }

    function updateUnitDetailsToolbarForDraft() {
        const std = document.getElementById('unitDetailsToolbarStandard');
        const draft = document.getElementById('unitDetailsToolbarDraftMode');
        if (!std || !draft) return;
        const unit = selectedUnitDetailsRecord;
        const isDraft = !isViewerMode && unit && unitDetailsIsIncompleteTenancyDraft(unit);
        if (isDraft) {
            std.style.display = 'none';
            draft.style.display = 'flex';
        } else {
            std.style.display = '';
            draft.style.display = 'none';
        }
    }

    function getTenancyDraftPayloadForUnit(unit) {
        if (!unit) return null;
        const m = loadTenancyContractDraftsMap();
        const e = m[_tenancyDraftStorageKey(toStr(unit.building), toStr(unit.unit))];
        return e && e.payload && typeof e.payload === 'object' ? e.payload : null;
    }

    function clearSfgContractFullIfMatchesUnit(buildingNo, flatNo) {
        const b = toStr(buildingNo);
        const f = toStr(flatNo);
        if (!b || !f) return;
        try {
            const raw = localStorage.getItem('sfg_contract_full');
            if (!raw) return;
            const o = JSON.parse(raw);
            if (!o || typeof o !== 'object') return;
            if (toStr(o.buildingNo) === b && normalizeUnit(o.flatNo) === normalizeUnit(f)) {
                localStorage.removeItem('sfg_contract_full');
            }
        } catch (e) {}
    }

    function logTenancyDraftCancellation(building, unit, dateStr, reason) {
        const key = 'sfg_tenancy_draft_cancellations';
        let list = [];
        try {
            list = JSON.parse(localStorage.getItem(key) || '[]');
            if (!Array.isArray(list)) list = [];
        } catch (e) {
            list = [];
        }
        list.push({
            building: toStr(building),
            unit: toStr(unit),
            date: toStr(dateStr),
            reason: toStr(reason),
            at: new Date().toISOString()
        });
        try {
            localStorage.setItem(key, JSON.stringify(list));
        } catch (e) {}
    }

    function openUnitDetailsCancelDraftModal() {
        const el = document.getElementById('unitDetailsCancelDraftModal');
        if (!el) return;
        const d = new Date();
        const iso = d.toISOString().slice(0, 10);
        const de = document.getElementById('unitDetailsCancelDraftDate');
        const re = document.getElementById('unitDetailsCancelDraftReason');
        if (de) de.value = iso;
        if (re) re.value = '';
        el.classList.add('open');
    }

    function closeUnitDetailsCancelDraftModal() {
        document.getElementById('unitDetailsCancelDraftModal')?.classList.remove('open');
    }

    function confirmUnitDetailsCancelDraft() {
        if (!assertPermissionOrAlert('manage_contracts', 'لا تملك صلاحية إلغاء المسودة.', 'No permission to cancel the draft contract.')) return;
        const unit = selectedUnitDetailsRecord;
        if (!unit) return;
        if (!unitDetailsIsIncompleteTenancyDraft(unit)) {
            closeUnitDetailsCancelDraftModal();
            return;
        }
        const dateStr = toStr(document.getElementById('unitDetailsCancelDraftDate')?.value);
        const reason = toStr(document.getElementById('unitDetailsCancelDraftReason')?.value).trim();
        if (!dateStr) {
            alert(t('يرجى اختيار تاريخ الإلغاء.', 'Please select a cancellation date.'));
            return;
        }
        if (!reason) {
            alert(t('يرجى كتابة أسباب إلغاء المسودة.', 'Please enter the reasons for cancelling the draft.'));
            return;
        }
        const b = toStr(unit.building);
        const uN = toStr(unit.unit);
        removeTenancyContractDraftForKeys(b, uN);
        clearSfgContractFullIfMatchesUnit(b, uN);
        logTenancyDraftCancellation(b, uN, dateStr, reason);
        try {
            loadDashboardAux();
        } catch (e) {}
        if (buildingProfiles && typeof buildingProfiles === 'object') {
            try {
                syncManagedUnitsFromProfiles();
            } catch (e) {}
        }
        syncSfgKvToServer();
        closeUnitDetailsCancelDraftModal();
        closeUnitDetailsModal();
        try {
            renderOperationsTable();
        } catch (e) {}
        if (insightNavStack && insightNavStack.length) {
            try {
                renderInsightContent();
            } catch (e) {}
        }
        alert(
            t(
                'تم إلغاء مسودة العقد وتسجيل أسباب الإلغاء.',
                'The draft contract was cancelled and the reasons were recorded.'
            )
        );
    }

    function completeTenancyDraftFromUnitDetails() {
        try {
            const unit = selectedUnitDetailsRecord;
            if (!unit) return;
            const payload = getTenancyDraftPayloadForUnit(unit);
            if (!payload) {
                alert(
                    t('لم تُعثر على مسودة عقد مسجلة لهذه الوحدة.', 'No saved tenancy draft was found for this unit.')
                );
                return;
            }
            contractEntryContext = { mode: 'contract', unit: null };
            setTenancyDraftCompletionFieldLocks(false);
            applyObjectToContractFormFields(payload);
            try {
                onPaymentMethodOrDriversChanged();
            } catch (e) {
                console.warn('completeTenancyDraftFromUnitDetails schedule refresh:', e);
            }
            setWorkspaceMode('contracts');
            try {
                updateSummaryPanel();
            } catch (e) {}
            try {
                const full = collectStorableContractFullFromDom();
                localStorage.setItem('sfg_contract_full', JSON.stringify(full));
            } catch (e) {}
            try {
                renderDocument(0);
            } catch (e) {}
            setTenancyDraftCompletionFieldLocks(true);
            closeUnitDetailsModal();
        } catch (err) {
            console.error('completeTenancyDraftFromUnitDetails failed:', err);
            alert(
                t(
                    'تعذر استكمال بيانات التعاقد. راجع وحدة تحكم المتصفح (F12).',
                    'Could not complete the contract workflow. Please check the browser console (F12).'
                ) + '\n\n' + (err && err.message ? String(err.message) : '')
            );
        }
    }

    function openUnitDetailsModal(index) {
        const unit = (window._unitsViewRows || [])[index];
        if (!unit) return;
        selectedUnitDetailsRecord = unit;
        const days = daysUntil(unit.endDate);
        const title = document.getElementById('unitDetailsTitle');
        if (title) {
            title.textContent = `${t('تفاصيل الوحدة', 'Unit details')} ${unit.unit || '-'} | ${unit.building || '-'}`;
        }

        const section = (titleText, fields) => `
            <div class="details-section">
                <h5>${titleText}</h5>
                <div class="details-grid">
                    ${fields.map(([k, v]) => `
                        <div class="detail-item">
                            <small>${k}</small>
                            <strong>${toStr(v) || '-'}</strong>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        const sectionsEl = document.getElementById('unitDetailsSections');
        if (sectionsEl) {
            sectionsEl.innerHTML = `
                ${section(t('بيانات الوحدة', 'Unit data'), [[t('المبنى', 'Building'), unit.building], [t('المالك', 'Owner'), unit.ownerNames || formatOwnerNamesForBuilding(unit.building)], [t('الوحدة', 'Unit'), unit.unit], [t('تفاصيل الطابق', 'Floor details'), unit.floor], [t('نوع الوحدة', 'Unit type'), unit.unitType], [t('الحالة', 'Status'), unit.status]])}
                ${section(t('بيانات المستأجر', 'Tenant data'), [[t('اسم المستأجر', 'Tenant name'), unit.tenant], [t('اسم المستأجر (EN)', 'Tenant name (EN)'), unit.tenantEn], [t('الرقم المدني', 'Civil ID'), unit.civilCard], [t('رقم التواصل', 'Contact no.'), unit.contactNo || unit.mobile]])}
                ${section(t('العقد والتواريخ', 'Contract and dates'), [[t('نوع العقد', 'Contract type'), (unit.unitType === 'Shop' || unit.unitType === 'Office') ? t('تجاري', 'Commercial') : t('سكني', 'Residential')], [t('حالة العقد', 'Contract status'), !unit.endDate ? t('غير محدد', 'Not set') : (days !== null && days < 0 ? t('منتهي', 'Expired') : (toStr(unit.status).toLowerCase() === 'vacant' ? t('ملغي/شاغر', 'Cancelled/Vacant') : t('ساري', 'Active')))], [t('رقم العقد', 'Contract no.'), unit.agreementNo], [t('تاريخ البداية', 'Start date'), unit.startDate], [t('تاريخ النهاية', 'End date'), unit.endDate], [t('متبقي يوم', 'Days left'), days === null ? '-' : days], [t('الأشهر المتبقية', 'Months left'), unit.monthsLeft || (days === null ? '-' : (days / 30).toFixed(2))], [t('تاريخ الإخلاء', 'Evacuation date'), unit.evacuationDate]])}
                ${section(t('المبالغ والعدادات', 'Amounts and meters'), [[t('الإيجار الشهري', 'Monthly rent'), unit.monthlyRent], [t('إيجار الاتفاقية', 'Agreement rent'), unit.agreementRent], [t('عداد الكهرباء', 'Electricity meter'), unit.electricity], [t('قراءة الكهرباء', 'Electricity reading'), unit.electricityReading], [t('عداد الماء', 'Water meter'), unit.water], [t('قراءة الماء', 'Water reading'), unit.waterReading]])}
                ${section(t('ملاحظات', 'Notes'), [[t('ملاحظات', 'Notes'), unit.remarks]])}
            `;
        }
        renderUnitHistory(unit);
        closeUnitDetailsIeMenus();
        updateUnitDetailsToolbarForDraft();
        document.getElementById('unitDetailsModal')?.classList.add('open');
    }

    function closeUnitDetailsModal() {
        closeUnitDetailsIeMenus();
        closeUnitDetailsCancelDraftModal();
        document.getElementById('unitDetailsModal')?.classList.remove('open');
    }

    function renderUnitHistory(unit) {
        const body = document.getElementById('unitHistoryTableBody');
        if (!body || !unit) return;
        const all = getUnitsData().filter((u) => u.building === unit.building && u.unit === unit.unit);
        const sorted = all.sort((a, b) => (b.endDate || '').localeCompare(a.endDate || ''));
        const rows = sorted.map((u) => {
            const d = daysUntil(u.endDate);
            const state = !u.endDate ? t('غير محدد', 'Not set')
                : (d !== null && d < 0) ? t('منتهي', 'Expired')
                : (toStr(u.status).toLowerCase() === 'vacant') ? t('ملغي/شاغر', 'Cancelled/Vacant')
                : t('ساري', 'Active');
            const cType = (u.unitType === 'Shop' || u.unitType === 'Office') ? t('تجاري', 'Commercial') : t('سكني', 'Residential');
            return `
                <tr>
                    <td>${u.tenant || '-'}</td>
                    <td>${cType}</td>
                    <td>${u.agreementNo || '-'}</td>
                    <td>${u.startDate || '-'}</td>
                    <td>${u.endDate || '-'}</td>
                    <td>${state}</td>
                    <td>${u.monthlyRent || '-'}</td>
                </tr>
            `;
        }).join('');
        body.innerHTML = rows || '<tr><td colspan="7">لا يوجد سجل متاح لهذه الوحدة.</td></tr>';
    }


    function closeUnitDetailsIeMenus() {
        const p1 = document.getElementById('unitDetailsContractPanel');
        const p2 = document.getElementById('unitDetailsPrintPanel');
        if (p1) p1.hidden = true;
        if (p2) p2.hidden = true;
    }
    function toggleUnitDetailsContractMenu(ev) {
        if (ev) ev.stopPropagation();
        const p = document.getElementById('unitDetailsContractPanel');
        const o = document.getElementById('unitDetailsPrintPanel');
        if (!p) return;
        const open = p.hidden;
        if (o) o.hidden = true;
        p.hidden = !open;
    }
    function toggleUnitDetailsPrintMenu(ev) {
        if (ev) ev.stopPropagation();
        const p = document.getElementById('unitDetailsPrintPanel');
        const o = document.getElementById('unitDetailsContractPanel');
        if (!p) return;
        const open = p.hidden;
        if (o) o.hidden = true;
        p.hidden = !open;
    }
    function prefillUnitDetailsForPrint() {
        if (!selectedUnitDetailsRecord) return;
        const asRenew = document.getElementById('unitDetailsPrintAsRenewal')?.checked;
        prefillContractFromUnit(selectedUnitDetailsRecord, !!asRenew);
    }
    function collectUnitDetailsPrintIndices() {
        const boxes = document.querySelectorAll('.ud-print-chk:checked');
        const idx = [...boxes].map((x) => parseInt(x.value, 10)).filter((n) => !Number.isNaN(n));
        return [...new Set(idx)].sort((a, b) => a - b);
    }
    function printPrefilledContractDocuments(indices) {
        if (!selectedUnitDetailsRecord) return;
        if (!indices || !indices.length) {
            alert('⚠️ لم يُحدد أي مستند للطباعة.\nNo form selected for printing.');
            return;
        }
        if (!validateCoreData()) return;
        const chunks = indices.map((i) => {
            const wrap = document.createElement('div');
            wrap.className = 'document doc-theme-royal-maroon';
            wrap.innerHTML = documentShell(renderers[i]());
            return wrap.outerHTML;
        });
        const sep = '<div class="sfg-doc-print-sep" style="page-break-after:always;break-after:page;height:0;clear:both"></div>';
        const bodyHtml = chunks.join(sep);
        const win = window.open('', '_blank');
        if (!win) {
            alert('تعذر فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة.\nAllow pop-ups to print.');
            return;
        }
        const titleAr = 'طباعة مجموعة مستندات';
        win.document.write(`
            <html><head><title>${titleAr} - SFG</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&family=Roboto&display=swap" rel="stylesheet">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Tajawal', 'Roboto', sans-serif; direction: rtl; background: white; font-size: 12pt; line-height: 1.55; }
                .document {
                    --doc-accent: #6b1f35; --doc-accent-dark: #4a1525; --doc-accent-light: #8b3050;
                    --doc-soft-bg: #f8ecef; width: 100%; padding: 0; margin: 0; text-align: center;
                }
                .document.doc-theme-royal-blue {
                    --doc-accent: #0d3b66; --doc-accent-dark: #082948; --doc-accent-light: #1e5a8a;
                    --doc-soft-bg: #e8f1fb;
                }
                .doc-print-frame { width: 100%; border-collapse: collapse; table-layout: fixed; border: none; }
                .doc-print-frame thead { display: table-header-group; }
                .doc-print-frame thead td { padding: 0 0 10px; border: none; vertical-align: bottom; }
                .doc-print-frame tbody td { padding: 0; border: none; vertical-align: top; }
                .doc-print-tbody-cell { text-align: center; }
                .doc-header {
                    display: flex; flex-direction: row; align-items: center; justify-content: space-between;
                    gap: 12px; width: 100%; padding: 0 2px 8px; margin: 0;
                    border-bottom: 2px solid var(--doc-accent);
                }
                .company-box { flex: 1; min-width: 0; font-size: 9pt; line-height: 1.45; color: #2a2a2a; }
                .company-box-ar { text-align: right; }
                .company-box-en { text-align: left; direction: ltr; font-family: 'Roboto', sans-serif; }
                .company-name-ar { font-size: 11pt; font-weight: 800; color: var(--doc-accent); margin-bottom: 5px; }
                .company-name-en { font-size: 10pt; font-weight: 800; color: var(--doc-accent); margin-bottom: 5px; }
                .logo-box { flex: 0 0 110px; text-align: center; }
                .logo-box img { max-height: 64px; max-width: 110px; object-fit: contain; }
                .doc-title { text-align: center; margin: 12px 0 16px; border-bottom: 2px double var(--doc-accent); padding-bottom: 8px; }
                .doc-title h2 { font-size: 16pt; color: var(--doc-accent); margin: 0; font-weight: 800; }
                .doc-title h3 { font-size: 12pt; font-weight: normal; color: #444; margin: 5px 0 0; direction: ltr; font-family: 'Roboto', sans-serif; }
                .document .info-table { width: 100%; border-collapse: collapse; margin-bottom: 11px; font-size: 12pt; color: #141414; }
                .document .info-table th, .document .info-table td { border: 1px solid #2a2a2a; padding: 9px 11px; vertical-align: middle; line-height: 1.45; text-align: center; }
                .document .info-table th { background: var(--doc-soft-bg); color: var(--doc-accent-dark); width: 30%; font-weight: 700; }
                .document .info-table td[contenteditable="true"], .document .info-table th[contenteditable="true"] {
                    border: 1px solid #2a2a2a !important; background: #fafafa; color: #111; font-size: 12pt; font-weight: 600;
                    padding: 9px 11px; display: table-cell; vertical-align: middle; text-align: center;
                }
                .document .info-table th[contenteditable="true"] { background: var(--doc-soft-bg); color: var(--doc-accent-dark); font-weight: 700; }
                .document .text-ar, .document .text-en { font-size: 12pt; font-weight: 600; color: #1a1a1a; line-height: 1.55; text-align: center; }
                .document .clause-title { font-weight: 800; font-size: 12pt; }
                .section-header {
                    background: linear-gradient(135deg, var(--doc-accent) 0%, var(--doc-accent-dark) 100%);
                    color: white; padding: 5px 10px; margin: 11px 0 7px; font-size: 12pt; font-weight: bold;
                    -webkit-print-color-adjust: exact; print-color-adjust: exact; text-align: center;
                }
                .clause-block { margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
                .dual-text { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
                .text-ar, .text-en { flex: 1; font-size: 12pt; line-height: 1.55; text-align: center; }
                .text-en { direction: ltr; font-family: 'Roboto', sans-serif; }
                .signature-row { display: flex; justify-content: space-between; margin-top: 22px; padding-top: 14px; border-top: 1px dashed #ccc; }
                .signature-item { width: 45%; text-align: center; font-size: 12pt; }
                .sfg-doc-print-sep { page-break-after: always; break-after: page; }
                @page { size: A4 portrait; margin: 10mm 12mm; }
                @media print {
                    body { margin: 0; padding: 0; }
                    .doc-print-frame thead { display: table-header-group; }
                }
            </style></head>
            <body dir="rtl">${bodyHtml}</body></html>`);
        win.document.close();
        win.print();
    }
    function runUnitDetailsSelectedPrint() {
        prefillUnitDetailsForPrint();
        printPrefilledContractDocuments(collectUnitDetailsPrintIndices());
        closeUnitDetailsIeMenus();
    }
    function runUnitDetailsCommonPrint() {
        const boxes = document.querySelectorAll('.ud-print-chk');
        boxes.forEach((b) => {
            const v = parseInt(b.value, 10);
            b.checked = [0, 4, 5, 7].includes(v);
        });
        prefillUnitDetailsForPrint();
        printPrefilledContractDocuments([0, 4, 5, 7]);
        closeUnitDetailsIeMenus();
    }

    function getUnitOccupancyMode(unit) {
        return toStr(unit?.status).toLowerCase() === 'vacant' ? 'vacant' : 'rented';
    }

    function ensureUnitActionAllowed(unit, kind) {
        const mode = getUnitOccupancyMode(unit);
        if (kind === 'new' && mode !== 'vacant') {
            alert('لا يمكن تسجيل عقد جديد لوحدة مؤجرة. اختر تجديد أو إلغاء العقد.\nNew contract is allowed only for vacant units. Use renew/cancel for rented units.');
            return false;
        }
        if ((kind === 'renew' || kind === 'cancel') && mode !== 'rented') {
            alert('التجديد أو الإلغاء متاح فقط للعقود المؤجرة.\nRenewal/cancellation is available only for rented units.');
            return false;
        }
        return true;
    }

    function openDetailsContract(kind) {
        if (!selectedUnitDetailsRecord) return;
        if (!ensureUnitActionAllowed(selectedUnitDetailsRecord, kind)) return;
        closeUnitDetailsIeMenus();
        const map = { new: 0, renew: 1, cancel: 6, checkin: 4, checkout: 5, invoice: 7 };
        const isRenew = kind === 'renew';
        prefillContractFromUnit(selectedUnitDetailsRecord, isRenew);
        if (kind === 'all') {
            openDocumentsWindow(buildPayloadFromUnit(selectedUnitDetailsRecord, isRenew), { autoPrint: false });
        } else {
            currentDoc = map[kind] ?? 0;
            contractEntryContext = { mode: 'contract', unit: null };
            updateContractWorkspaceContextUi();
            setWorkspaceMode('contracts');
            renderDocument(currentDoc);
            closeUnitDetailsModal();
        }
    }

    function editFromDetails() {
        if (!selectedUnitDetailsRecord) return;
        prefillContractFromUnit(selectedUnitDetailsRecord, false);
        contractEntryContext = { mode: 'contract', unit: null };
        updateContractWorkspaceContextUi();
        setWorkspaceMode('contracts');
        renderDocument(0);
        closeUnitDetailsModal();
    }

    function saveFromDetails() {
        if (!selectedUnitDetailsRecord) return;
        prefillContractFromUnit(selectedUnitDetailsRecord, false);
        saveAllData();
    }

    function openExpiryReportWindow(maxDays) {
        const rows = getExpiringUnits(maxDays).sort((a, b) => (daysUntil(a.endDate) || 9999) - (daysUntil(b.endDate) || 9999));
        const win = window.open('', '_blank');
        if (!win) return;
        const tableRows = rows.map((u, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${u.building || ''}</td>
                <td>${u.unit || ''}</td>
                <td>${u.tenant || ''}</td>
                <td>${u.endDate || ''}</td>
                <td>${daysUntil(u.endDate)}</td>
                <td>${u.mobile || ''}</td>
            </tr>
        `).join('');
        win.document.write(`
            <html><head><title>تقرير العقود خلال ${maxDays} يوم</title>
            <style>
                body{font-family:Tahoma,Arial,sans-serif;direction:rtl;padding:20px}
                h2{margin:0 0 10px;color:#7A001F}
                table{width:100%;border-collapse:collapse;font-size:12px}
                th,td{border:1px solid #333;padding:6px 8px;text-align:right}
                th{background:#f3e6eb}
                .meta{margin:8px 0 14px;color:#444}
            </style></head>
            <body>
                <h2>تقرير العقود التي تنتهي خلال ${maxDays} يوم</h2>
                <div class="meta">إجمالي العقود: ${rows.length} | التاريخ: ${new Date().toLocaleDateString('ar-OM')}</div>
                <table>
                    <thead><tr><th>#</th><th>المبنى</th><th>الوحدة</th><th>المستأجر</th><th>تاريخ الانتهاء</th><th>متبقي يوم</th><th>التواصل</th></tr></thead>
                    <tbody>${tableRows || '<tr><td colspan="7">لا توجد نتائج</td></tr>'}</tbody>
                </table>
                <script>window.onload=function(){window.print();}<\/script>
            </body></html>
        `);
        win.document.close();
    }

    function batchRenewPrint(maxDays = 30) {
        const rows = getExpiringUnits(maxDays);
        if (!rows.length) {
            alert('لا توجد عقود ضمن المدة المحددة للطباعة الجماعية.');
            return;
        }
        const baseUrl = window.location.href.split('?')[0];
        rows.forEach((u, idx) => {
            const payload = buildPayloadFromUnit(u, true);
            const key = `sfg_runtime_payload_${Date.now()}_${idx}`;
            localStorage.setItem(key, JSON.stringify(payload));
            window.open(`${baseUrl}?viewer=1&payloadKey=${encodeURIComponent(key)}&autoprint=1`, '_blank');
        });
        alert(`✅ تم فتح ${rows.length} نافذة تجديد للطباعة الجماعية. إذا منع المتصفح النوافذ، اسمح بالنوافذ المنبثقة.`);
    }

    function runFlexibleBatchPrint() {
        const days = Number(document.getElementById('batchDaysFilter')?.value || 30);
        const building = document.getElementById('batchBuildingFilter')?.value || 'all';
        const rows = getExpiringUnitsByBuilding(days, building);
        if (!rows.length) {
            alert('لا توجد عقود مطابقة للفلاتر المحددة.');
            return;
        }
        const baseUrl = window.location.href.split('?')[0];
        rows.forEach((u, idx) => {
            const payload = buildPayloadFromUnit(u, true);
            const key = `sfg_runtime_payload_${Date.now()}_${idx}`;
            localStorage.setItem(key, JSON.stringify(payload));
            window.open(`${baseUrl}?viewer=1&payloadKey=${encodeURIComponent(key)}&autoprint=1`, '_blank');
        });
        alert(`✅ تم فتح ${rows.length} نافذة تجديد (${days} يوم)${building !== 'all' ? ` للمبنى: ${building}` : ''}.`);
    }

    function toggleTheme() {
        const current = localStorage.getItem('sfg_theme_mode') || 'maroon';
        const next = current === 'maroon' ? 'turquoise' : 'maroon';
        applyTheme(next);
    }

    function applyTheme(mode) {
        const palette = themePalettes[mode] || themePalettes.maroon;
        document.documentElement.style.setProperty('--primary', palette.primary);
        document.documentElement.style.setProperty('--primary-dark', palette.dark);
        document.documentElement.style.setProperty('--primary-light', palette.light);
        localStorage.setItem('sfg_theme_mode', mode);
        syncSfgKvToServer();
    }

    function getSmartTotals() {
        const d = getFormData();
        const monthly = parseFloat(d.monthlyRent) || 0;
        const months = parseInt(d.contractMonths) || 0;
        const municipal = parseFloat(calcMunicipalFees()) || 0;
        const baseRows = getBaseContractPaymentRows();
        const effRows = getDefaultPaymentRowsFromForm();
        const baseRentTotal = sumScheduleAmounts(baseRows);
        const rentTotal = sumScheduleAmounts(effRows);
        const customRentNet = rentTotal - baseRentTotal;
        const insRows = Array.isArray(d.insuranceDepositItems) ? d.insuranceDepositItems : [];
        const insuranceLinesTotal = insRows.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
        const depositRefAmount = parseFloat(toStr(d.depositAmount)) || 0;
        const graceDiscount = parseFloat(d.graceAmount) || 0;
        const legacyOtherDiscount = parseFloat(d.otherDiscountAmount) || 0;
        const extraRows = Array.isArray(d.extraAdjustments) ? d.extraAdjustments : [];
        const extraAdditions = extraRows
            .filter((x) => toStr(x.kind) === 'add')
            .reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
        const extraDiscounts = extraRows
            .filter((x) => toStr(x.kind) === 'discount')
            .reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
        const otherDiscount = legacyOtherDiscount + extraDiscounts;
        const totalDiscounts = graceDiscount + otherDiscount;
        const contractBeforeDiscount = rentTotal + municipal;
        const contractBeforeFinalDiscount = contractBeforeDiscount + extraAdditions;
        return {
            months,
            monthly,
            municipal,
            baseRentTotal,
            customRentNet,
            insuranceLinesTotal,
            depositRefAmount,
            insuranceRows: insRows,
            rentTotal,
            graceDiscount,
            otherDiscount,
            extraRows,
            extraAdditions,
            extraDiscounts,
            totalDiscounts,
            contractBeforeDiscount,
            contractTotal: Math.max(0, contractBeforeFinalDiscount - totalDiscounts)
        };
    }

    function updateSummaryPanel() {
        let s;
        try {
            s = getSmartTotals();
        } catch (e) {
            console.error('updateSummaryPanel / getSmartTotals failed:', e);
            return;
        }
        const panel = document.getElementById('smartSummary');
        if (!panel) return;
        const extraRowsHtml = (s.extraRows || []).map((x) => {
            const amount = (parseFloat(x.amount) || 0).toFixed(3);
            const title = escHtml(toStr(x.title) || t('بدون عنوان', 'Untitled'));
            const isAdd = toStr(x.kind) === 'add';
            return `<div><b>${isAdd ? t('إضافة', 'Addition') : t('خصم', 'Discount')} — ${title}:</b> ${isAdd ? '+' : '-'}${amount} OMR</div>`;
        }).join('');
        const csign = (s.customRentNet || 0) >= 0 ? '+' : '';
        const customRulesHtml = '';
        const brt = s.baseRentTotal !== undefined ? s.baseRentTotal : s.rentTotal - (s.customRentNet || 0);
        panel.innerHTML = `
            <div><b>${t('الإيجار الشهري:', 'Monthly rent:')}</b> ${s.monthly.toFixed(3)} OMR</div>
            <div><b>${t('مدة العقد:', 'Contract period:')}</b> ${s.months} ${t('شهر', 'months')}</div>
            <div><b>${t('إجمالي الإيجار (أساسي):', 'Base rent total:')}</b> ${brt.toFixed(3)} OMR</div>
            <div><b>${t('تعديل إيجار مخصص (صافي):', 'Custom rent adjustment (net):')}</b> ${csign}${(s.customRentNet || 0).toFixed(3)} OMR</div>
            ${customRulesHtml}
            <div><b>${t('إجمالي الإيجار (بعد المخصص):', 'Rent total (after custom):')}</b> ${s.rentTotal.toFixed(3)} OMR</div>
            <div><b>${t('مبلغ التأمين (مرجعي) / Deposit (reference):', 'Deposit (reference) / مبلغ التأمين:')}</b> ${(s.depositRefAmount || 0).toFixed(3)} OMR</div>
            <div><b>${t('بنود التأمين (مجموع) / Insurance lines (sum):', 'Insurance lines (sum) / بنود التأمين:')}</b> ${(s.insuranceLinesTotal || 0).toFixed(3)} OMR</div>
            <div><b>${t('رسوم البلدية (3%):', 'Municipal fees (3%):')}</b> ${s.municipal.toFixed(3)} OMR</div>
            ${extraRowsHtml}
            <div><b>${t('إجمالي الإضافات:', 'Total additions:')}</b> ${s.extraAdditions.toFixed(3)} OMR</div>
            <div><b>${t('خصم فترة السماح:', 'Grace period discount:')}</b> ${s.graceDiscount.toFixed(3)} OMR</div>
            <div><b>${t('خصومات أخرى:', 'Other discounts:')}</b> ${s.otherDiscount.toFixed(3)} OMR</div>
            <div><b>${t('إجمالي الخصومات:', 'Total discounts:')}</b> ${s.totalDiscounts.toFixed(3)} OMR</div>
            <div><b>${t('الإجمالي قبل الخصم:', 'Total before discount:')}</b> ${(s.contractBeforeDiscount + s.extraAdditions).toFixed(3)} OMR</div>
            <div><b>${t('إجمالي العقد التقديري (بعد الخصم):', 'Estimated contract total (after discount):')}</b> ${s.contractTotal.toFixed(3)} OMR</div>
        `;
    }

    function getExtraAdjustmentsFromUi() {
        const list = document.getElementById('extraAdjustmentsList');
        if (!list) return [];
        const rows = [...list.querySelectorAll('[data-extra-row]')];
        return rows.map((row) => ({
            id: toStr(row.getAttribute('data-extra-row')),
            kind: toStr(row.querySelector('[data-extra-kind]')?.value) === 'add' ? 'add' : 'discount',
            title: toStr(row.querySelector('[data-extra-title]')?.value),
            amount: toStr(row.querySelector('[data-extra-amount]')?.value || '0')
        })).filter((x) => x.title || (parseFloat(x.amount) || 0) > 0);
    }

    function renderExtraAdjustmentsRows(rows = []) {
        const list = document.getElementById('extraAdjustmentsList');
        if (!list) return;
        const normalized = Array.isArray(rows) ? rows : [];
        list.innerHTML = normalized.map((x, idx) => {
            const id = escHtml(toStr(x.id) || `extra_${Date.now()}_${idx}`);
            const kind = toStr(x.kind) === 'add' ? 'add' : 'discount';
            const title = escHtml(toStr(x.title));
            const amount = escHtml(toStr(x.amount || '0'));
            return `
                <div data-extra-row="${id}" style="display:grid;grid-template-columns:170px 1fr 180px auto;gap:8px;align-items:center">
                    <select data-extra-kind>
                        <option value="discount" ${kind === 'discount' ? 'selected' : ''}>${t('خصم / Discount', 'Discount / خصم')}</option>
                        <option value="add" ${kind === 'add' ? 'selected' : ''}>${t('إضافة / Addition', 'Addition / إضافة')}</option>
                    </select>
                    <input type="text" data-extra-title value="${title}" placeholder="${escHtml(t('عنوان البند / Item title', 'Item title / عنوان البند'))}">
                    <input type="number" data-extra-amount min="0" step="0.001" value="${amount}" placeholder="0.000">
                    <button type="button" class="mini-btn" onclick="removeExtraAdjustmentRow('${id}')">✖</button>
                </div>
            `;
        }).join('');
        localizeBilingualUi();
        updateSummaryPanel();
    }

    function addExtraAdjustmentRow() {
        const rows = getExtraAdjustmentsFromUi();
        rows.push({ id: `extra_${Date.now()}`, kind: 'discount', title: '', amount: '0' });
        renderExtraAdjustmentsRows(rows);
    }

    function removeExtraAdjustmentRow(id) {
        const rows = getExtraAdjustmentsFromUi().filter((x) => toStr(x.id) !== toStr(id));
        renderExtraAdjustmentsRows(rows);
    }


    function getInsuranceDepositItemsFromUi() {
        const list = document.getElementById('insuranceDepositItemsList');
        if (!list) return [];
        return [...list.querySelectorAll('[data-insurance-row]')].map((row) => ({
            id: toStr(row.getAttribute('data-insurance-row')),
            payType: toStr(row.querySelector('[data-insurance-paytype]')?.value) || 'other',
            amount: toStr(row.querySelector('[data-insurance-amount]')?.value || '0'),
            reference: toStr(row.querySelector('[data-insurance-ref]')?.value)
        }));
    }

    function renderInsuranceDepositItemsRows(rows = []) {
        const list = document.getElementById('insuranceDepositItemsList');
        if (!list) return;
        const normalized = Array.isArray(rows) ? rows : [];
        list.innerHTML = normalized
            .map((x, idx) => {
                const id = escHtml(toStr(x.id) || `ins_${Date.now()}_${idx}`);
                const payType = ['cheque', 'cheque_group', 'other'].includes(toStr(x.payType)) ? toStr(x.payType) : 'other';
                const amount = escHtml(toStr(x.amount || '0'));
                const reference = escHtml(toStr(x.reference));
                return `
                <div data-insurance-row="${id}" style="display:grid;grid-template-columns:minmax(140px,190px) 120px 1fr auto;gap:8px;align-items:center">
                    <select data-insurance-paytype>
                        <option value="cheque" ${payType === 'cheque' ? 'selected' : ''}>${t('شيك / Cheque', 'Cheque / شيك')}</option>
                        <option value="cheque_group" ${payType === 'cheque_group' ? 'selected' : ''}>${t('مجموعة شيكات / Cheque batch', 'Cheque batch / مجموعة شيكات')}</option>
                        <option value="other" ${payType === 'other' ? 'selected' : ''}>${t('أخرى / Other', 'Other / أخرى')}</option>
                    </select>
                    <input type="number" data-insurance-amount min="0" step="0.001" value="${amount}" placeholder="0.000">
                    <input type="text" data-insurance-ref value="${reference}" placeholder="${escHtml(t('رقم الشيك أو الإيصال / Cheque or receipt no.', 'Cheque or receipt no. / رقم'))}">
                    <button type="button" class="mini-btn" onclick="removeInsuranceDepositItemRow('${id}')">✖</button>
                </div>
            `;
            })
            .join('');
        localizeBilingualUi();
        updateSummaryPanel();
    }

    function addInsuranceDepositItemRow() {
        const rows = getInsuranceDepositItemsFromUi();
        rows.push({ id: `ins_${Date.now()}`, payType: 'cheque', amount: '0', reference: '' });
        renderInsuranceDepositItemsRows(rows);
    }

    function removeInsuranceDepositItemRow(id) {
        const rows = getInsuranceDepositItemsFromUi().filter((x) => toStr(x.id) !== toStr(id));
        renderInsuranceDepositItemsRows(rows);
    }

    function getCustomRentScheduleFromUi() {
        const wrap = document.getElementById('customRentScheduleTableWrap');
        if (!wrap) return [];
        return [...wrap.querySelectorAll('tbody tr[data-custom-rent-month]')].map((tr) => ({
            monthIndex: parseInt(tr.getAttribute('data-custom-rent-month'), 10) || 0,
            dueDate: toStr(tr.querySelector('[data-custom-rent-date]')?.value),
            amount: toStr(tr.querySelector('[data-custom-rent-amount]')?.value)
        }));
    }

    function getCustomRentItemsFromUi() {
        return getCustomRentScheduleFromUi();
    }

    function renderCustomRentScheduleFromRows(rows = []) {
        const wrap = document.getElementById('customRentScheduleTableWrap');
        if (!wrap) return;
        let list = Array.isArray(rows) ? rows : [];
        if (list.length && (list[0].deltaPerMonth !== undefined || list[0].fromMonth !== undefined)) {
            list = [];
        }
        if (!list.length) {
            wrap.innerHTML = `<p style="color:#666;font-size:12px;margin:0">${t('اضبط المدة وتاريخ البداية والإيجار ثم اضغط «إعادة بناء» في جدول الدفع لعرض الأشهر.', 'Set period, start date, and rent, then press Rebuild in the payment section to list months.')}</p>`;
            return;
        }
        const body = list
            .sort((a, b) => (a.monthIndex || 0) - (b.monthIndex || 0))
            .map((r) => {
                const m = r.monthIndex || 0;
                const dVal = escHtml(toStr(r.dueDate));
                const amt = escHtml(toStr(r.amount));
                return `<tr data-custom-rent-month="${m}">
                    <td>${m}</td>
                    <td><input type="date" data-custom-rent-date value="${dVal}"></td>
                    <td><input type="number" data-custom-rent-amount min="0" step="0.001" value="${amt}"></td>
                </tr>`;
            })
            .join('');
        wrap.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>${t('الشهر / Month', 'Month / الشهر')}</th>
                        <th>${t('تاريخ الدفع / Due date', 'Due date / تاريخ الدفع')}</th>
                        <th>${t('مقدار الدفع (ر.ع) / Amount (OMR)', 'Amount (OMR) / مقدار')}</th>
                    </tr>
                </thead>
                <tbody>${body}</tbody>
            </table>`;
        try {
            localizeBilingualUi();
        } catch (e) {}
    }

    function renderCustomRentItemsRows(rows) {
        return renderCustomRentScheduleFromRows(rows);
    }

    function syncCustomRentToMainPaymentSchedule() {
        const base = getBaseContractPaymentRows();
        if (!base.length) return;
        const merged = mergeBaseWithCustomRentSchedule(base, getCustomRentScheduleFromUi());
        const prev = getPaymentScheduleFromUi();
        const mapP = new Map(prev.map((r) => [r.monthIndex, r]));
        const out = merged.map((row) => {
            const ex = mapP.get(row.monthIndex) || {};
            return {
                ...row,
                checkNo: toStr(ex.checkNo),
                checkAttachmentName: toStr(ex.checkAttachmentName),
                checkAttachmentDataUrl: toStr(ex.checkAttachmentDataUrl)
            };
        });
        renderPaymentScheduleFromRows(out);
        try {
            updateSummaryPanel();
        } catch (e) {}
        try {
            renderDocument(currentDoc);
        } catch (e) {}
    }

    function copyMainScheduleRowToCustomRentTable(monthIndex) {
        const main = document.querySelector(`#paymentScheduleTableWrap tr[data-schedule-month="${monthIndex}"]`);
        const cst = document.querySelector(`#customRentScheduleTableWrap tr[data-custom-rent-month="${monthIndex}"]`);
        if (!main || !cst) return;
        const d = main.querySelector('[data-schedule-date]');
        const a = main.querySelector('[data-schedule-amount]');
        const d2 = cst.querySelector('[data-custom-rent-date]');
        const a2 = cst.querySelector('[data-custom-rent-amount]');
        if (d && d2) d2.value = d.value;
        if (a && a2) a2.value = a.value;
    }

    function sumScheduleAmounts(rows) {
        return (Array.isArray(rows) ? rows : []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    }
    function ensureTypeSelectAlwaysNew() {
        const el = document.getElementById('typeSelect');
        if (!el) return;
        el.value = 'جديد New';
        el.disabled = true;
    }

    function isContractPaymentByCheque() {
        const p = toStr(document.getElementById('paymentMethod')?.value).toLowerCase();
        return p.includes('شيك') || p.includes('chq') || p.includes('cheq');
    }

    /** YYYY-MM-DD حسب التقويم المحلي — لا تستخدم toISOString() لحقول التاريخ لأنها تزحف يومًا في التوقيتات + */
    function formatDateYmdLocal(d) {
        if (!d || Number.isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function getAgreedRentPaymentDayOfMonth() {
        const raw = parseInt(toStr(document.getElementById('agreedRentPaymentDay')?.value), 10);
        if (!Number.isNaN(raw) && raw >= 1 && raw <= 31) return raw;
        return 1;
    }



    function getBaseContractPaymentRows() {
        const n = Math.max(1, parseInt(toStr(document.getElementById('contractMonths')?.value), 10) || 12);
        const rentRaw = parseFloat(toStr(document.getElementById('monthlyRent')?.value)) || 0;
        const dayOfMonth = getAgreedRentPaymentDayOfMonth();
        const startStr = toStr(document.getElementById('startDate')?.value);
        if (!startStr) return [];
        const p = startStr.split('-').map((x) => parseInt(x, 10));
        const start = p.length === 3 && !p.some((x) => Number.isNaN(x)) ? new Date(p[0], p[1] - 1, p[2]) : new Date(startStr);
        if (Number.isNaN(start.getTime())) return [];
        const y0 = start.getFullYear();
        const m0 = start.getMonth();
        const rent = rentRaw > 0 ? rentRaw.toFixed(3) : '0.000';
        const rows = [];
        for (let i = 0; i < n; i++) {
            const t = new Date(y0, m0 + i, 1);
            const lastInMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
            t.setDate(Math.min(dayOfMonth, lastInMonth));
            rows.push({
                monthIndex: i + 1,
                dueDate: formatDateYmdLocal(t),
                amount: rent,
                checkNo: '',
                checkAttachmentName: '',
                checkAttachmentDataUrl: ''
            });
        }
        return rows;
    }

    function mergeBaseWithCustomRentSchedule(base, overlay) {
        if (!Array.isArray(overlay) || !overlay.length) return base;
        const cmap = new Map(overlay.map((r) => [r.monthIndex, r]));
        return base.map((row) => {
            const c = cmap.get(row.monthIndex);
            if (!c) return row;
            const a = toStr(c.amount);
            const d = toStr(c.dueDate);
            const amt = a === '' || a === null ? row.amount : Math.max(0, parseFloat(a) || 0).toFixed(3);
            return { ...row, amount: amt, dueDate: d || row.dueDate };
        });
    }

    function getDefaultPaymentRowsFromForm() {
        const base = getBaseContractPaymentRows();
        return mergeBaseWithCustomRentSchedule(base, getCustomRentScheduleFromUi());
    }

    function getPaymentScheduleFromUi() {
        const wrap = document.getElementById('paymentScheduleTableWrap');
        if (!wrap) return [];
        return [...wrap.querySelectorAll('tbody tr[data-schedule-month]')].map((tr) => ({
            monthIndex: parseInt(tr.getAttribute('data-schedule-month'), 10) || 0,
            dueDate: toStr(tr.querySelector('[data-schedule-date]')?.value),
            amount: toStr(tr.querySelector('[data-schedule-amount]')?.value),
            checkNo: toStr(tr.querySelector('[data-schedule-check]')?.value),
            checkAttachmentName: toStr(tr.dataset.attachmentName),
            checkAttachmentDataUrl: toStr(tr.dataset.attachmentDataUrl)
        }));
    }

    function renderPaymentScheduleFromRows(rows = []) {
        const wrap = document.getElementById('paymentScheduleTableWrap');
        if (!wrap) return;
        const list = Array.isArray(rows) ? rows : [];
        const byChq = isContractPaymentByCheque();
        const hasPm = !!toStr(document.getElementById('paymentMethod')?.value);
        if (!hasPm) {
            wrap.innerHTML = `<p style="color:#666;font-size:12px;margin:0">${t('اختر طريقة الدفع لعرض جدول الأقساط.', 'Select a payment method to show the payment schedule table.')}</p>`;
            return;
        }
        if (!list.length) {
            wrap.innerHTML = `<p style="color:#666;font-size:12px;margin:0">${t('لا توجد بيانات جدول. اضبط المدة والإيجار ثم اضغط «إعادة بناء».', 'No schedule rows. Set term and rent, then press Rebuild.')}</p>`;
            return;
        }
        const headExtra = byChq
            ? `<th>${t('رقم الشيك / Cheque no.', 'Cheque no. / رقم الشيك')}</th><th>${t('مرفق نسخة الشيك / Cheque copy', 'Cheque copy / مرفق')}</th>`
            : '';
        const body = list
            .sort((a, b) => (a.monthIndex || 0) - (b.monthIndex || 0))
            .map((r) => {
                const m = r.monthIndex || 0;
                const dVal = escHtml(toStr(r.dueDate));
                const amt = escHtml(toStr(r.amount));
                const chk = escHtml(toStr(r.checkNo));
                const attN = toStr(r.checkAttachmentName);
                const chRow = byChq
                    ? `<td><input type="text" data-schedule-check value="${chk}" placeholder="${escHtml(t('رقم الشيك / No.', 'No. / رقم'))}"></td>
                       <td class="sched-check-col">
                         <div style="font-size:11px;margin-bottom:4px;word-break:break-all" data-attach-name>${attN ? escHtml(attN) : '—'}</div>
                         <input type="file" accept="image/*,.pdf" data-schedule-file onchange="onPaymentScheduleFileChange(this,${m})" style="max-width:100%">
                       </td>`
                    : '';
                return `<tr data-schedule-month="${m}">
                    <td>${m}</td>
                    <td><input type="date" data-schedule-date value="${dVal}"></td>
                    <td><input type="number" data-schedule-amount min="0" step="0.001" value="${amt}"></td>
                    ${chRow}
                </tr>`;
            })
            .join('');
        wrap.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>${t('الشهر / Month', 'Month / الشهر')}</th>
                        <th>${t('تاريخ الدفع / Due date', 'Due date / تاريخ الدفع')}</th>
                        <th>${t('مقدار الدفع (ر.ع) / Amount (OMR)', 'Amount (OMR) / مقدار')}</th>
                        ${headExtra}
                    </tr>
                </thead>
                <tbody>${body}</tbody>
            </table>`;
        list.forEach((r) => {
            const m = r.monthIndex || 0;
            const tr = wrap.querySelector(`tr[data-schedule-month="${m}"]`);
            if (tr) {
                if (toStr(r.checkAttachmentName)) tr.dataset.attachmentName = toStr(r.checkAttachmentName);
                if (toStr(r.checkAttachmentDataUrl)) tr.dataset.attachmentDataUrl = toStr(r.checkAttachmentDataUrl);
            }
        });
        try {
            localizeBilingualUi();
        } catch (e) {}
    }

    function onPaymentScheduleFileChange(inp, monthIndex) {
        const f = inp.files && inp.files[0];
        const tr = document.querySelector(`#paymentScheduleTableWrap tr[data-schedule-month="${monthIndex}"]`);
        if (!f) {
            if (tr) {
                tr.dataset.attachmentName = '';
                tr.dataset.attachmentDataUrl = '';
                const nEl = tr.querySelector('[data-attach-name]');
                if (nEl) nEl.textContent = '—';
            }
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            if (!tr) return;
            tr.dataset.attachmentName = f.name;
            tr.dataset.attachmentDataUrl = reader.result;
            const nEl = tr.querySelector('[data-attach-name]');
            if (nEl) nEl.textContent = f.name;
            try {
                updateSummaryPanel();
            } catch (e) {}
            try {
                renderDocument(currentDoc);
            } catch (e) {}
        };
        reader.onerror = () => {
            alert(t('تعذر قراءة الملف.', 'Could not read the file.'));
        };
        reader.readAsDataURL(f);
    }

    function rebuildPaymentScheduleFromContractDefaults() {
        const base = getBaseContractPaymentRows();
        renderCustomRentScheduleFromRows(base);
        renderPaymentScheduleFromRows(base);
        try {
            updateSummaryPanel();
        } catch (e) {}
        try {
            renderDocument(currentDoc);
        } catch (e) {}
    }

    function onPaymentMethodOrDriversChanged() {
        const base = getBaseContractPaymentRows();
        const merged = mergeBaseWithCustomRentSchedule(base, getCustomRentScheduleFromUi());
        renderCustomRentScheduleFromRows(merged);
        const prev = getPaymentScheduleFromUi();
        const mapP = new Map(prev.map((r) => [r.monthIndex, r]));
        const out = merged.map((row) => {
            const ex = mapP.get(row.monthIndex) || {};
            return {
                ...row,
                checkNo: toStr(ex.checkNo),
                checkAttachmentName: toStr(ex.checkAttachmentName),
                checkAttachmentDataUrl: toStr(ex.checkAttachmentDataUrl)
            };
        });
        renderPaymentScheduleFromRows(out);
        try {
            updateSummaryPanel();
        } catch (e) {}
        try {
            renderDocument(currentDoc);
        } catch (e) {}
    }

    function autoCalculateEndDate() {
        const startInput = document.getElementById('startDate');
        const monthsInput = document.getElementById('contractMonths');
        const endInput = document.getElementById('endDate');
        if (!startInput || !monthsInput || !endInput || !startInput.value) return;

        const parts = toStr(startInput.value).split('-').map((x) => parseInt(x, 10));
        const start =
            parts.length === 3 && !parts.some((x) => Number.isNaN(x))
                ? new Date(parts[0], parts[1] - 1, parts[2])
                : new Date(startInput.value);
        const months = parseInt(monthsInput.value, 10);
        if (Number.isNaN(start.getTime()) || !months || months < 1) return;

        const end = new Date(start);
        end.setMonth(end.getMonth() + months);
        end.setDate(end.getDate() - 1);
        endInput.value = formatDateYmdLocal(end);
    }

    function updateReservationCalculations() {
        const rentMode = document.getElementById('rentCalcMode');
        const areaGroup = document.getElementById('rentAreaGroup');
        const rateGroup = document.getElementById('rentPerSqmGroup');
        const areaEl = document.getElementById('rentAreaSqm');
        const rateEl = document.getElementById('rentPerSqm');
        const monthlyEl = document.getElementById('monthlyRent');
        const graceDaysEl = document.getElementById('graceDays');
        const graceAmountEl = document.getElementById('graceAmount');
        if (!monthlyEl) return;
        const mode = toStr(rentMode?.value) || 'full';
        const isPerMeter = mode === 'per_meter';
        if (areaGroup) areaGroup.style.display = isPerMeter ? '' : 'none';
        if (rateGroup) rateGroup.style.display = isPerMeter ? '' : 'none';
        if (areaEl) areaEl.disabled = !isPerMeter;
        if (rateEl) rateEl.disabled = !isPerMeter;
        monthlyEl.readOnly = isPerMeter;
        if (isPerMeter) {
            const area = parseFloat(toStr(areaEl?.value)) || 0;
            const rate = parseFloat(toStr(rateEl?.value)) || 0;
            monthlyEl.value = (area * rate).toFixed(3);
        }
        const depositEl = document.getElementById('depositAmount');
        if (depositEl && depositEl.dataset.manualDeposit !== '1') {
            depositEl.value = (parseFloat(toStr(monthlyEl.value)) || 0).toFixed(3);
        }
        const monthly = parseFloat(toStr(monthlyEl.value)) || 0;
        const graceDays = Math.max(0, parseInt(toStr(graceDaysEl?.value), 10) || 0);
        const graceAmount = (monthly / 30) * graceDays;
        if (graceAmountEl) graceAmountEl.value = graceAmount.toFixed(3);
        updateSummaryPanel();
    }

    function closeDataGapsModal() {
        document.getElementById('dataGapsModal')?.classList.remove('open');
    }

    function findTenantAddressBookIndexByFormName() {
        const d = getFormData();
        const nameAr = toStr(d.tenantNameAr);
        const nameEn = toStr(d.tenantNameEn).toLowerCase();
        return addressBookEntries.findIndex((x) => {
            if (toStr(x.type) !== 'tenant') return false;
            if (nameAr && toStr(x.name) === nameAr) return true;
            if (nameEn && toStr(x.nameEn).toLowerCase() === nameEn) return true;
            return false;
        });
    }

    function extractValidationBullets(msg) {
        return String(msg || '')
            .split('\n')
            .map((x) => x.replace(/^•\s*/, '').trim())
            .filter((x) => x && !x.includes('يرجى') && !x.includes('Please complete'));
    }

    function collectContractRelatedDataGaps() {
        const gaps = [];
        const d = getFormData();
        const building = toStr(d.buildingNo);
        const unit = toStr(d.flatNo);
        const isReservationMode = contractEntryContext.mode === 'reservation';

        if (building) {
            const resolvedBuildingKey = resolveBuildingProfileKey(building) || building;
            if (isReservationMode) {
                const bp = buildingProfiles[resolvedBuildingKey] || getEmptyBuildingProfile();
                const buildingCheck = validateBuildingProfileForReservation({ ...bp, name: bp.name || resolvedBuildingKey });
                if (!buildingCheck.ok) {
                    buildingCheck.missing.forEach((line) => {
                        gaps.push({
                            text: `${t('العقار', 'Property')}: ${line}`,
                            fixText: t('استكمال بيانات العقار', 'Complete property data'),
                            action: { type: 'building', key: resolvedBuildingKey }
                        });
                    });
                }
            } else {
                const bp = buildingProfiles[resolvedBuildingKey] || getEmptyBuildingProfile();
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

        const tenantIdx = findTenantAddressBookIndexByFormName();
        if (tenantIdx < 0) {
            gaps.push({
                text: t('المستأجر غير موجود في دفتر العناوين.', 'Tenant not found in address book.'),
                fixText: t('إضافة مستأجر جديد', 'Add new tenant'),
                action: { type: 'newTenant' }
            });
        } else {
            const tenantEntry = addressBookEntries[tenantIdx];
            const tenantIssues = isReservationMode ? getAddressBookIssuesForReservation(tenantEntry) : getAddressBookIssues(tenantEntry);
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
        if (contractEntryContext.mode === 'reservation') {
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
            syncAddressBookFormRules();
        }
    }

    function ensureRelatedDataCompleteness() {
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

    function validateCoreData() {
        const d = getFormData();
        const isReservationMode = contractEntryContext.mode === 'reservation';
        const tenantNameOk = !!toStr(d.tenantNameAr) || !!toStr(d.tenantNameEn);
        if (!d.agreementNo || !tenantNameOk || !d.buildingNo || !d.flatNo) {
            alert('⚠️ يرجى تعبئة الحقول الأساسية: رقم العقد، اسم المستأجر، المبنى، ورقم الوحدة.');
            return false;
        }
        if (isReservationMode) {
            if (!toStr(d.tenantId) || !toStr(d.tenantMobile)) {
                alert(t('⚠️ لا يمكن إكمال الحجز بدون الرقم المدني ورقم الجوال للمستأجر.', '⚠️ Reservation cannot be completed without tenant Civil ID and mobile number.'));
                return false;
            }
        }
        if (!ensureRelatedDataCompleteness()) return false;
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
        return true;
    }
    
    function createHeader() {
        const logoSrc = getPrintLogoSrc();
        return `
            <div class="doc-header" dir="rtl">
                <div class="company-box company-box-ar" contenteditable="true">
                    <div class="company-name-ar">مجموعة سيد فياض العالمية ش.م.م</div>
                    <div class="company-lines-ar">ص.ب: 154 ، الرمز البريدي : 111 ، سلطنة عمان<br>
                    هاتف: +968 24499484 ، فاكس: +968 24497482<br>
                    ضريبة القيمة المضافة: OM1100300282</div>
                </div>
                <div class="logo-box">
                    <img src="${logoSrc}" alt="شعار المجموعة / SFG Logo" width="110" height="64" style="max-height:64px;max-width:110px;object-fit:contain;display:block;margin:0 auto">
                </div>
                <div class="company-box company-box-en" contenteditable="true" dir="ltr">
                    <div class="company-name-en">SYED FAYYAZ GROUP INTERNATIONAL L.L.C</div>
                    <div class="company-lines-en">P.O.Box: 154, P.C: 111, Sultanate of Oman<br>
                    Tel: +968 24499484, Fax: +968 24497482<br>
                    VATIN: OM1100300282</div>
                </div>
            </div>
        `;
    }

    /** يلف المحتوى في جدول ليتكرر الهيدر في كل صفحة عند الطباعة متعددة الصفحات */
    function documentShell(bodyHtml) {
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
            </table>
        `;
    }
    
    // المستند 01 - Residential (كامل)
    function renderResidential() {
        let d = getFormData();
        let municipal = calcMunicipalFees();
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
                <tr><th>القيمة الإيجارية الشهرية / Monthly Rental Amount :</th><td colspan="3" contenteditable="true">${d.monthlyRent}</td><th>يسري هذا العقد لمدة بالأشهر / This agreement is valid for a period of (months) :</th><td colspan="3" contenteditable="true">${d.contractMonths}</td></tr>
                <tr><th>رسوم البلدية / Municipal fees</th><td colspan="3" contenteditable="true">${municipal}</td><th>طريقة الدفع / Payment Method</th><td colspan="3" contenteditable="true">${d.paymentMethod}</td></tr>
                <tr><th>الضمان / Security</th><td colspan="3" contenteditable="true">تحويل بنكي Bank transfer</td><th>رقم الشيك أو الإيصال / check or receipt number</th><td colspan="3" contenteditable="true">4355</td></tr>
                <tr><th>مبلغ المودع / Deposit amount:</th><td colspan="3" contenteditable="true">${d.depositAmount}</td><th>يبدأ من / From :</th><td colspan="3" contenteditable="true">${formatDate(d.startDate, 'ar')}</td></tr>
                <tr><th>ينتهي في / To :</th><td colspan="7" contenteditable="true">${formatDate(d.endDate, 'ar')}</td></tr>
            </table>
            <div class="section-header">شروط وأحكام أخرى / Other terms and conditions</div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">1. هذا النموذج هو جزء لا يتجزأ من اتفاقية الإيجار ، وعقد البلدية ، وشروط الإيجار ، وبتوقيعه ، أوافق على تسجيل عقد الإيجار بالشروط المعمول بهاء أو ما سيتم تحديثه من قبل إدارة العقار. ( للإطلاع على الشروط والقوانين أمسح الباركود او اطلب نسخة رقمية عبر الواتساب 93555643 )</div><div class="text-en" contenteditable="true">1. This form is an integral part of the lease agreement, the municipal contract, and the terms of the lease, and by signing it, I agree to register the lease with the applicable terms or what will be updated by the property management.(To view the terms and conditions, scan the barcode or request a digital copy via WhatsApp 93555643)</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">2. توقيع المستأجر على هذا النموذج موافقة على توثيق العقد من قبل السلطات المختصة.</div><div class="text-en" contenteditable="true">2. The tenant's signature on this form constitutes approval of the contract documentation by the competent authorities.</div></div></div>
            <div class="signature-row"><div class="signature-item">توقيع المستأجر / Tenant Signature<br><br><br>_________________________</div><div class="signature-item">توقيع المؤجر / Landlord Signature<br><br><br>_________________________</div></div>
        `;
    }
    
    // المستند 02 - Renewal
    function renderRenewal() {
        let d = getFormData();
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
            <table class="info-table"><tr><th>القيمة الإيجارية الشهرية / Monthly Rent :</th><td colspan="3" contenteditable="true">${d.monthlyRent}</td><th>المدة بالأشهر / Period :</th><td colspan="3" contenteditable="true">${d.contractMonths}</td></tr>
            <tr><th>رسوم البلدية / Municipal fees</th><td colspan="3" contenteditable="true">${calcMunicipalFees()}</td><th>من / From :</th><td colspan="3" contenteditable="true">${formatDate(d.startDate, 'ar')}</td></tr>
            <tr><th>إلى / To :</th><td colspan="7" contenteditable="true">${formatDate(d.endDate, 'ar')}</td></tr></table>
            <div class="section-header">شروط وأحكام أخرى / Other terms and conditions</div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">1. هذا النموذج هو جزء لا يتجزأ من اتفاقية الإيجار ، وعقد البلدية ، وشروط الإيجار المعمول بها ، وبتوقيعه ، أوافق على تجديد عقد الإيجار بنفس الشروط السابقة أو ما سيتم تحديثه من قبل إدارة العقار.</div><div class="text-en" contenteditable="true">1. This form is an integral part of the rental agreement, the municipal contract, and the applicable rental conditions, and by signing it, I agree to renew the rental contract with the same previous conditions or what will be updated by the property management.</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">2. أقر على نفسي أنا الموقع على هذا العقد بأنني قد قرأت وأطلعت ووافقت على كافة الشروط و القوانين المعمول بها في مجموعة سيد فياض العالمية و الخاصة بالتأجير.</div><div class="text-en" contenteditable="true">2. I declare to myself that I am the signatory of this contract that I have read, viewed and agreed to all the terms and laws in force in the Sayed Fayyaz Group International and related to leasing.</div></div></div>
            <div class="signature-row">
                <div class="signature-item" style="text-align:right;direction:rtl">
                    <strong>توقيع المؤجر</strong><br>
                    <span style="direction:ltr;font-family:'Roboto',sans-serif">Landlord Signature</span>
                    <br><br>_________________________
                </div>
                <div class="signature-item" style="text-align:left;direction:ltr;font-family:'Roboto',sans-serif">
                    <strong style="direction:rtl;font-family:'Tajawal',sans-serif">توقيع المستأجر</strong><br>
                    Tenant Signature
                    <br><br>_________________________
                </div>
            </div>
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
            <div class="signature-row">
                <div class="signature-item" style="text-align:right;direction:rtl">
                    توقيع المؤجر / <span style="direction:ltr;font-family:'Roboto',sans-serif">Landlord Signature</span>
                    <br><br>_________________________
                </div>
                <div class="signature-item" style="text-align:left;direction:ltr;font-family:'Roboto',sans-serif">
                    <span style="direction:rtl;font-family:'Tajawal',sans-serif">توقيع المستأجر</span> / Tenant Signature
                    <br><br>_________________________
                </div>
            </div>
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
            <div class="signature-row"><div class="signature-item">التوقيع / Signature<br><br>_________________________</div><div class="signature-item">التاريخ / Date<br><br>_________________________</div></div>
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
            <div class="signature-row"><div class="signature-item">توقيع المستأجر<br><br>_________________________</div><div class="signature-item">توقيع المالك<br><br>_________________________</div></div>
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
            <div class="signature-row"><div class="signature-item">توقيع المستأجر<br><br>_________________________</div><div class="signature-item">توقيع المالك<br><br>_________________________</div></div>
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
            <div class="signature-row"><div class="signature-item">توقيع المستأجر<br><br>_________________________</div><div class="signature-item">التاريخ<br><br>_________________________</div></div>
        `;
    }
    
    // المستند 08 - Invoice
    function renderInvoice() {
        let d = getFormData();
        let rows = '';
        let start = new Date(d.startDate);
        let months = parseInt(d.contractMonths, 10) || 12;
        for(let i=0; i<months; i++) {
            let chqDate = new Date(start);
            chqDate.setMonth(start.getMonth() + i);
            let dateStr = chqDate.toISOString().slice(0,10);
            rows += `<tr><td contenteditable="true">${i+1}</td><td contenteditable="true">${dateStr}</td><td contenteditable="true">${d.monthlyRent}</td><td contenteditable="true">0</td><td contenteditable="true">${d.monthlyRent}</td></tr>`;
        }
        return `
            <div class="doc-title"><h2>المتطلبات والفاتورة</h2><h3>Requirement & Invoice</h3></div>
            <table class="info-table"><tr><th>رقم العقد / Agreement No.:</th><td colspan="3" contenteditable="true">${d.agreementNo}</td><th>أسم المستأجر / Tenant Name:</th><td colspan="3" contenteditable="true">${d.tenantNameAr}</td></tr></table>
            <div class="section-header">جدول الشيكات / Cheques Schedule</div>
            <table class="info-table"><thead><tr><th>#</th><th>تاريخ الشيك / Check date</th><th>مبلغ الإيجار / Rental Amount</th><th>الضريبة / VAT</th><th>مبلغ الشيك / Check amount</th></tr></thead><tbody>${rows}</tbody></table>
            <div class="section-header">المتطلبات / Requirements</div>
            <table class="info-table"><tr><td contenteditable="true">1. شيكات الإيجار / Rent Cheques</td><td contenteditable="true">2. البطاقة المدنية / ID Card</td><td contenteditable="true">3. شيكات الضمان / Security Cheques</td></tr></table>
            <div class="section-header">تفاصيل الشيكات والمبالغ الإضافية / Details of checks and additional amounts</div>
            <table class="info-table"><thead><tr><th>#</th><th>التاريخ / date</th><th>المبلغ / Amount</th><th>الضريبة / VAT</th><th>الإجمالي / Total</th><th>طريقة الدفع / Payment method</th></tr></thead>
            <tbody><tr><td contenteditable="true">1</td><td contenteditable="true">Security deposit</td><td contenteditable="true">${d.depositAmount}</td><td contenteditable="true">0</td><td contenteditable="true">${d.depositAmount}</td><td contenteditable="true">نقدا Cash / شيك Check</td></tr></tbody></table>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">ملاحظة: شيكات الإيجار يجب أن تكون بإسم محمد سيد فياض علي<br>The Rent cheques should be under Mohammad Syed Fayyaz Ali name</div><div class="text-en" contenteditable="true">Note: Rent cheques should be under Mohammad Syed Fayyaz Ali name</div></div></div>
            <div class="clause-block"><div class="dual-text"><div class="text-ar" contenteditable="true">يعتبر هذا المستند جزء من العقد ، ويقرأ معه .</div><div class="text-en" contenteditable="true">This document is considered part of the contract, and it must be read with it.</div></div></div>
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
        const signatureHtml = includeSignature ? `
            <div class="signature-row">
                <div class="signature-item" style="text-align:right;direction:rtl">
                    توقيع المؤجر / <span style="direction:ltr;font-family:'Roboto',sans-serif">Landlord Signature</span>
                    <br><br>_________________________
                </div>
                <div class="signature-item" style="text-align:left;direction:ltr;font-family:'Roboto',sans-serif">
                    <span style="direction:rtl;font-family:'Tajawal',sans-serif">توقيع المستأجر</span> / Tenant Signature
                    <br><br>_________________________
                </div>
            </div>
        ` : '';
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
    
    function renderDocument(index) {
        activeDocumentCategory = 'contract_forms';
        const max = Math.max(0, (Array.isArray(renderers) ? renderers.length : 1) - 1);
        const safeIndex = Math.max(0, Math.min(typeof index === 'number' && !Number.isNaN(index) ? index : 0, max));
        currentDoc = safeIndex;
        if (!isViewerMode) {
            try {
                sessionStorage.setItem('sfg_ui_current_doc', String(safeIndex));
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
            const buildingOptions = getAllKnownBuildings();
            buildingSelect.innerHTML = buildingOptions.map(b => `<option value="${b}">${b}</option>`).join('');
            const currentBuilding = document.getElementById('buildingNo')?.value;
            if (currentBuilding && buildingOptions.includes(currentBuilding)) {
                buildingSelect.value = currentBuilding;
            }
        }
        updateSummaryPanel();
        renderOperationsTable();
    }
    
    function printDocument() {
        if (!validateCoreData()) return;
        const d = getFormData();
        const reservationNo = toStr(d.agreementNo) || '-';
        const baseDoc = document.querySelector('.document');
        if(!baseDoc) return;
        const printContent = baseDoc.cloneNode(true);
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>${docNames[currentDoc]} - مجموعة سيد فياض العالمية</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&family=Roboto&display=swap" rel="stylesheet">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Tajawal', 'Roboto', sans-serif; direction: rtl; background: white; font-size: 12pt; line-height: 1.55; padding-bottom: 18mm; }
                .document {
                    --doc-accent: #6b1f35; --doc-accent-dark: #4a1525; --doc-accent-light: #8b3050;
                    --doc-soft-bg: #f8ecef; width: 100%; padding: 0; margin: 0; text-align: center;
                }
                .document.doc-theme-royal-blue {
                    --doc-accent: #0d3b66; --doc-accent-dark: #082948; --doc-accent-light: #1e5a8a;
                    --doc-soft-bg: #e8f1fb;
                }
                .doc-print-frame { width: 100%; border-collapse: collapse; table-layout: fixed; border: none; }
                .doc-print-frame thead { display: table-header-group; }
                .doc-print-frame thead td { padding: 0 0 10px; border: none; vertical-align: bottom; }
                .doc-print-frame tbody td { padding: 0; border: none; vertical-align: top; }
                .doc-print-tbody-cell { text-align: center; }
                .doc-header {
                    display: flex; flex-direction: row; align-items: center; justify-content: space-between;
                    gap: 12px; width: 100%; padding: 0 2px 8px; margin: 0;
                    border-bottom: 2px solid var(--doc-accent);
                }
                .company-box { flex: 1; min-width: 0; font-size: 9pt; line-height: 1.45; color: #2a2a2a; }
                .company-box-ar { text-align: right; }
                .company-box-en { text-align: left; direction: ltr; font-family: 'Roboto', sans-serif; }
                .company-name-ar { font-size: 11pt; font-weight: 800; color: var(--doc-accent); margin-bottom: 5px; }
                .company-name-en { font-size: 10pt; font-weight: 800; color: var(--doc-accent); margin-bottom: 5px; }
                .logo-box { flex: 0 0 110px; text-align: center; }
                .logo-box img { max-height: 64px; max-width: 110px; object-fit: contain; }
                .doc-title { text-align: center; margin: 12px 0 16px; border-bottom: 2px double var(--doc-accent); padding-bottom: 8px; }
                .doc-title h2 { font-size: 16pt; color: var(--doc-accent); margin: 0; font-weight: 800; }
                .doc-title h3 { font-size: 12pt; font-weight: normal; color: #444; margin: 5px 0 0; direction: ltr; font-family: 'Roboto', sans-serif; }
                .document .info-table { width: 100%; border-collapse: collapse; margin-bottom: 11px; font-size: 12pt; color: #141414; }
                .document .info-table th, .document .info-table td { border: 1px solid #2a2a2a; padding: 9px 11px; vertical-align: middle; line-height: 1.45; text-align: center; }
                .document .info-table th { background: var(--doc-soft-bg); color: var(--doc-accent-dark); width: 30%; font-weight: 700; }
                .document .info-table td[contenteditable="true"], .document .info-table th[contenteditable="true"] {
                    border: 1px solid #2a2a2a !important; background: #fafafa; color: #111; font-size: 12pt; font-weight: 600;
                    padding: 9px 11px; display: table-cell; vertical-align: middle; text-align: center;
                }
                .document .info-table th[contenteditable="true"] { background: var(--doc-soft-bg); color: var(--doc-accent-dark); font-weight: 700; }
                .document .text-ar, .document .text-en { font-size: 9.2pt; font-weight: 600; color: #1a1a1a; line-height: 1.24; text-align: center; }
                .document .clause-title { font-weight: 800; font-size: 12pt; }
                .section-header {
                    background: linear-gradient(135deg, var(--doc-accent) 0%, var(--doc-accent-dark) 100%);
                    color: white; padding: 5px 10px; margin: 11px 0 7px; font-size: 12pt; font-weight: bold;
                    -webkit-print-color-adjust: exact; print-color-adjust: exact; text-align: center;
                }
                .clause-block { margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
                .dual-text { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
                .text-ar, .text-en { font-size: 9.2pt; line-height: 1.24; text-align: justify; }
                .text-ar { direction: rtl; }
                .text-en { direction: ltr; font-family: 'Roboto', sans-serif; }
                .signature-row { display: flex; justify-content: space-between; margin-top: 22px; padding-top: 14px; border-top: 1px dashed #ccc; }
                .signature-item { width: 45%; text-align: center; font-size: 12pt; }
                .print-footer{
                    position:fixed;
                    left:0;
                    right:0;
                    bottom:0;
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    gap:10px;
                    padding:0 12mm;
                    font-size:10pt;
                    color:#4a1525;
                    border-top:1px solid #bda8ae;
                }
                .pf-right{ text-align:right; direction:rtl; font-weight:700; }
                .pf-left{ text-align:left; direction:ltr; font-family:'Roboto',sans-serif; font-weight:700; }
                .pf-center{ text-align:center; direction:rtl; font-weight:700; }
                .pf-page-no::after{ content: counter(page); }
                @page { size: A4 portrait; margin: 10mm 12mm 18mm 12mm; }
                @media print {
                    body { margin: 0; padding: 0 0 18mm; }
                    .doc-print-frame thead { display: table-header-group; }
                }
            </style></head>
            <body dir="rtl">
                ${printContent.outerHTML}
                <div class="print-footer">
                    <div class="pf-right">توقيع المؤجر / <span style="direction:ltr;font-family:'Roboto',sans-serif">Landlord Signature</span></div>
                    <div class="pf-center">الصفحة <span class="pf-page-no"></span> | رقم الحجز: <span dir="ltr">${escHtml(reservationNo)}</span></div>
                    <div class="pf-left"><span style="direction:rtl;font-family:'Tajawal',sans-serif">توقيع المستأجر</span> / Tenant Signature</div>
                </div>
            </body></html>
        `);
        win.document.close();
        win.print();
    }
    
    function saveAllData() {
        if (!assertPermissionOrAlert('manage_contracts', 'لا تملك صلاحية حفظ بيانات العقود.', 'No permission to save contracts.')) return;
        loadDashboardAux();
        refreshAddressBookFromSystem(false);
        const isReservationMode = contractEntryContext.mode === 'reservation';
        if (isReservationMode) {
            upsertReservationFromCurrentForm({ asDraft: true, allowIncomplete: true });
            localStorage.setItem('sfg_unit_reservations', JSON.stringify(unitReservations));
        }
        if (!validateCoreData()) {
            if (isReservationMode) {
                syncSfgKvToServer();
                alert(t('💾 تم حفظ الحجز كمسودة بسبب وجود بيانات ناقصة. ستجده في «وحدات محجوزة» لاستكماله أو إلغائه.', '💾 Reservation saved as draft due to missing data. You can find it under Reserved units to complete or cancel.'));
                openDashboardInsight('reserved');
            }
            return;
        }
        const savedAsReservation = isReservationMode && upsertReservationFromCurrentForm({ asDraft: false, allowIncomplete: false });
        const data = collectStorableContractFullFromDom();
        localStorage.setItem('sfg_contract_full', JSON.stringify(data));
        localStorage.setItem('sfg_buildings_list', JSON.stringify(buildingsList));
        localStorage.setItem('sfg_owners_list', JSON.stringify(ownersList));
        localStorage.setItem('sfg_address_book', JSON.stringify(addressBookEntries));
        localStorage.setItem('sfg_file_registry', JSON.stringify(fileRegistry));
        localStorage.setItem('sfg_unit_reservations', JSON.stringify(unitReservations));
        localStorage.setItem('sfg_eviction_requests', JSON.stringify(evictionRequests));
        localStorage.setItem('sfg_owner_building_map', JSON.stringify(ownerBuildingMap));
        localStorage.setItem('sfg_building_profiles', JSON.stringify(buildingProfiles));
        localStorage.setItem('sfg_owner_profiles', JSON.stringify(ownerProfiles));
        localStorage.setItem('sfg_managed_units', JSON.stringify(managedUnitsData));
        localStorage.setItem('sfg_users_registry', JSON.stringify(usersRegistry));
        localStorage.setItem('sfg_auth_session', JSON.stringify(authSession));
        syncSfgKvToServer();
        if (!isReservationMode && !savedAsReservation) {
            removeTenancyContractDraftForKeys(data.buildingNo, data.flatNo);
            setTenancyDraftCompletionFieldLocks(false);
        }
        if (savedAsReservation) {
            contractEntryContext = { mode: 'contract', unit: null };
            updateContractWorkspaceContextUi();
            renderOperationsTable();
            alert('✅ تم حفظ الحجز بنجاح. تم نقل الوحدة إلى «وحدات محجوزة».');
            openDashboardInsight('reserved');
            return;
        }
        alert('✅ تم حفظ جميع البيانات بنجاح!' + (sfgApiAvailable ? ' (وتم حفظها في قاعدة البيانات المحلية)' : ''));
    }

    function exportDataFile() {
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
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `contract-data-${data.contract.agreementNo || 'draft'}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
    }

    function triggerImport() {
        const input = document.getElementById('importFileInput');
        if (input) input.click();
    }

    function importDataFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (!assertPermissionOrAlert('import_export', 'لا تملك صلاحية استيراد البيانات.', 'No permission to import data.')) return;
            try {
                const parsed = JSON.parse(e.target.result);
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
                    addressBookEntries = parsed.addressBookEntries.map((x) => ({
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
                    })).filter((x) => x.name);
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
                    SFG_PERMISSION_DEFS.forEach((p) => { basePerm[p.key] = false; });
                    usersRegistry = parsed.usersRegistry.map((u) => {
                        const mergedPerm = { ...basePerm, ...(typeof u.permissions === 'object' ? u.permissions : {}) };
                        return {
                            id: toStr(u.id) || generateUserRecordId(),
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
                        };
                    }).filter((u) => u.email);
                    validateAuthSession();
                }

                localStorage.setItem('sfg_unit_reservations', JSON.stringify(unitReservations));
                localStorage.setItem('sfg_eviction_requests', JSON.stringify(evictionRequests));
                localStorage.setItem('sfg_owner_building_map', JSON.stringify(ownerBuildingMap));
                localStorage.setItem('sfg_building_profiles', JSON.stringify(buildingProfiles));
                localStorage.setItem('sfg_owner_profiles', JSON.stringify(ownerProfiles));
                localStorage.setItem('sfg_address_book', JSON.stringify(addressBookEntries));
                localStorage.setItem('sfg_managed_units', JSON.stringify(managedUnitsData));
                localStorage.setItem('sfg_users_registry', JSON.stringify(usersRegistry));
                localStorage.setItem('sfg_auth_session', JSON.stringify(authSession));

                renderDocument(currentDoc);
                updateAuthHeaderBar();
                renderAddressBookTable();
                syncSfgKvToServer();
                alert('✅ تم استيراد البيانات بنجاح.');
            } catch (err) {
                alert('❌ ملف البيانات غير صالح. يرجى اختيار ملف JSON صحيح.');
            }
        };
        reader.readAsText(file, 'utf-8');
    }
    
    async function loadAllDataFromDisk() {
        if (sfgApiAvailable) await pullSfgKvFromServer();
        loadAllData(true);
    }

    function loadAllData(showAlert = true) {
        const saved = localStorage.getItem('sfg_contract_full');
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
            document.getElementById('depositAmount').value = data.depositAmount;
            if (document.getElementById('graceDays')) document.getElementById('graceDays').value = data.graceDays || '0';
            if (document.getElementById('graceAmount')) document.getElementById('graceAmount').value = data.graceAmount || '0.000';
            if (document.getElementById('otherDiscountAmount')) document.getElementById('otherDiscountAmount').value = data.otherDiscountAmount || '0';
            try { renderExtraAdjustmentsRows(JSON.parse(toStr(data.extraAdjustmentsJson) || '[]')); } catch (e) { renderExtraAdjustmentsRows([]); }
            try { renderInsuranceDepositItemsRows(JSON.parse(toStr(data.insuranceDepositItemsJson) || '[]')); } catch (e) { renderInsuranceDepositItemsRows([]); }
            try { renderCustomRentItemsRows(JSON.parse(toStr(data.customRentItemsJson) || '[]')); } catch (e) { renderCustomRentItemsRows([]); }
            try {
                if (data.paymentScheduleJson) {
                    const arr = JSON.parse(toStr(data.paymentScheduleJson) || '[]');
                    renderPaymentScheduleFromRows(Array.isArray(arr) ? arr : []);
                } else if (Array.isArray(data.paymentSchedule) && data.paymentSchedule.length) {
                    renderPaymentScheduleFromRows(data.paymentSchedule);
                } else {
                    onPaymentMethodOrDriversChanged();
                }
            } catch (e) {
                try {
                    onPaymentMethodOrDriversChanged();
                } catch (e2) {}
            }
            ensureTypeSelectAlwaysNew();
            updateReservationCalculations();
        }
        const savedBuildings = localStorage.getItem('sfg_buildings_list');
        if(savedBuildings) {
            buildingsList.length = 0;
            JSON.parse(savedBuildings).forEach(b => buildingsList.push(b));
        }
        const savedOwners = localStorage.getItem('sfg_owners_list');
        if(savedOwners) {
            ownersList.length = 0;
            JSON.parse(savedOwners).forEach(o => ownersList.push(o));
        }
        const savedOwnerProfiles = localStorage.getItem('sfg_owner_profiles');
        if (savedOwnerProfiles) {
            try {
                ownerProfiles = JSON.parse(savedOwnerProfiles) || {};
            } catch (e) {
                ownerProfiles = {};
            }
        }
        const savedAddressBook = localStorage.getItem('sfg_address_book');
        if (savedAddressBook) {
            try {
                addressBookEntries = JSON.parse(savedAddressBook) || [];
                if (!Array.isArray(addressBookEntries)) addressBookEntries = [];
            } catch (e) {
                addressBookEntries = [];
            }
        }
        const savedProfiles = localStorage.getItem('sfg_building_profiles');
        if (savedProfiles) {
            try {
                buildingProfiles = JSON.parse(savedProfiles) || {};
            } catch (e) {
                buildingProfiles = {};
            }
        }
        const savedManagedUnits = localStorage.getItem('sfg_managed_units');
        if (savedManagedUnits) {
            try {
                managedUnitsData = JSON.parse(savedManagedUnits) || [];
            } catch (e) {
                managedUnitsData = [];
            }
        } else {
            syncManagedUnitsFromProfiles();
        }
        const savedRegistry = localStorage.getItem('sfg_file_registry');
        if (savedRegistry) {
            try {
                const parsed = JSON.parse(savedRegistry);
                if (Array.isArray(parsed)) fileRegistry = parsed;
            } catch (e) {
                fileRegistry = [];
            }
        }
        const savedUsersReg = localStorage.getItem('sfg_users_registry');
        if (savedUsersReg) {
            try {
                usersRegistry = JSON.parse(savedUsersReg) || [];
                if (!Array.isArray(usersRegistry)) usersRegistry = [];
            } catch (e) {
                usersRegistry = [];
            }
        }
        try {
            authSession = JSON.parse(localStorage.getItem('sfg_auth_session') || 'null');
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
        }
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

    function openDocumentsWindow(payloadOverride = null, options = {}) {
        if (!validateCoreData()) return;
        const payload = payloadOverride || buildRuntimePayload();
        const payloadKey = options.payloadKey || 'sfg_runtime_payload';
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

    function localizeBilingualUi() {
        if (isViewerMode) return;
        const roots = ['.dashboard', '.contracts-workspace', '.users-workspace', '.addressbook-workspace', '#addressBookEntryModal', '#dashboardInsightModal', '#unitDetailsModal', '#unitDetailsCancelDraftModal', '#authLoginModal', '#propertyPrintMenuModal', '#dataGapsModal', '#dataCleanupModal'];
        const selector = 'h1,h2,h3,h4,h5,h6,p,small,strong,span,label,button,th,td,option,input,textarea,select';
        roots.forEach((rootSel) => {
            const root = document.querySelector(rootSel);
            if (!root) return;
            root.querySelectorAll(selector).forEach((el) => {
                if (el.hasAttribute('data-ar') && el.hasAttribute('data-en')) return;
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

    function applyAppLanguage() {
        document.documentElement.lang = appUiLanguage === 'en' ? 'en' : 'ar';
        document.documentElement.dir = appUiLanguage === 'en' ? 'ltr' : 'rtl';
        document.body.style.direction = appUiLanguage === 'en' ? 'ltr' : 'rtl';
        document.body.classList.remove('lang-ar', 'lang-en');
        document.body.classList.add(appUiLanguage === 'en' ? 'lang-en' : 'lang-ar');
        const langButtons = document.querySelectorAll('[data-ar][data-en]');
        langButtons.forEach((btn) => {
            btn.textContent = appUiLanguage === 'en' ? btn.dataset.en : btn.dataset.ar;
        });
        const langToggleBtn = document.getElementById('langToggleTopBtn');
        if (langToggleBtn) {
            langToggleBtn.textContent = appUiLanguage === 'en' ? '🌐 English' : '🌐 العربية';
            langToggleBtn.title = appUiLanguage === 'en'
                ? 'Change language to Arabic'
                : 'تغيير اللغة إلى الإنجليزية';
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
        localStorage.setItem('sfg_ui_language', appUiLanguage);
        applyAppLanguage();
    }

    function updateSideNavActive(mode) {
        const targets = document.querySelectorAll('[data-nav-target]');
        targets.forEach((btn) => {
            const isActive = btn.dataset.navTarget === mode;
            btn.classList.toggle('btn-primary', isActive);
            btn.classList.toggle('btn-outline', !isActive);
        });
    }

    function setWorkspaceMode(mode) {
        if (isViewerMode) return;
        document.body.classList.remove('mode-dashboard', 'mode-contracts', 'mode-reservations', 'mode-forms', 'mode-users', 'mode-addressbook');
        if (mode === 'contracts') document.body.classList.add('mode-contracts');
        else if (mode === 'reservations') document.body.classList.add('mode-reservations');
        else if (mode === 'forms') document.body.classList.add('mode-forms');
        else if (mode === 'users') document.body.classList.add('mode-users');
        else if (mode === 'addressbook') document.body.classList.add('mode-addressbook');
        else document.body.classList.add('mode-dashboard');
        const badge = document.getElementById('screenBadge');
        if (badge) {
            if (mode === 'users') badge.textContent = t('إدارة المستخدمين', 'Users');
            else if (mode === 'addressbook') badge.textContent = t('دفتر العناوين', 'Address book');
            else if (mode === 'reservations') badge.textContent = t('صفحة الحجوزات', 'Reservations');
            else if (mode === 'forms') badge.textContent = t('نظام المستندات', 'Documents system');
            else badge.textContent = t('لوحة البيانات والمعلومات', 'Dashboard overview');
        }
        const contractsBadge = document.getElementById('contractsScreenBadge');
        if (contractsBadge) {
            contractsBadge.textContent = mode === 'contracts'
                ? t('وضع العمل: بيانات العقد والمستندات', 'Work mode: contract data and documents')
                : mode === 'reservations'
                    ? t('وضع العمل: بيانات الحجز المنفصلة', 'Work mode: standalone reservation data')
                    : mode === 'forms'
                        ? t('وضع العمل: نظام المستندات والطباعة', 'Work mode: documents system and printing')
                        : '';
        }
        const baseUrl = window.location.href.split('?')[0];
        const modeParam = mode === 'contracts'
            ? 'contracts'
            : mode === 'reservations'
                ? 'reservations'
            : mode === 'forms'
                ? 'forms'
            : mode === 'users'
                ? 'users'
                : mode === 'addressbook'
                    ? 'addressbook'
                    : 'dashboard';
        try {
            sessionStorage.setItem('sfg_ui_last_mode', modeParam);
        } catch (e) {}
        window.history.replaceState({}, '', `${baseUrl}?mode=${modeParam}`);
        if (mode === 'contracts' || mode === 'reservations') {
            updateContractWorkspaceContextUi();
            updateSummaryPanel();
        } else if (mode === 'forms') {
            renderDocument(currentDoc);
        } else if (mode === 'dashboard') {
            renderOperationsTable();
            renderRegistryTable();
        } else if (mode === 'users') {
            loadDashboardAux();
            renderUsersManagementPage();
            updateAuthHeaderBar();
        } else if (mode === 'addressbook') {
            renderAddressBookTable();
            updateAuthHeaderBar();
        }
        localizeBilingualUi();
        syncTopNavOffset();
        updateSideNavActive(mode);
    }

    function openDashboardWorkspace() { setWorkspaceMode('dashboard'); }
    function openContractsWorkspace() {
        contractEntryContext = { mode: 'contract', unit: null };
        updateContractWorkspaceContextUi();
        setWorkspaceMode('contracts');
    }
    function openReservationsWorkspace() {
        contractEntryContext = { mode: 'reservation', unit: contractEntryContext.unit || null };
        updateContractWorkspaceContextUi();
        setWorkspaceMode('reservations');
    }
    function openFormsWorkspace() { setWorkspaceMode('forms'); }
    function openAddressBookWorkspace() { setWorkspaceMode('addressbook'); }

    function applyRuntimePayload() {
        const params = new URLSearchParams(window.location.search);
        const payloadKey = params.get('payloadKey') || 'sfg_runtime_payload';
        const raw = localStorage.getItem(payloadKey);
        if(!raw) return false;
        try {
            const payload = JSON.parse(raw);
            const data = payload.contract || {};
            const skipRuntimeKeys = new Set([
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
                if (skipRuntimeKeys.has(key)) return;
                const mappedId = key === 'contractType' ? 'contractTypeSelect' : key === 'type' ? 'typeSelect' : key;
                const el = document.getElementById(mappedId);
                if (el && data[key] !== undefined && data[key] !== null && typeof data[key] !== 'object') {
                    el.value = data[key];
                }
            });
            if (!toStr(data.agreedRentPaymentDay) && data.agreedRentPaymentDate) {
                try {
                    const dtR = new Date(data.agreedRentPaymentDate);
                    if (!Number.isNaN(dtR.getTime())) {
                        const elR = document.getElementById('agreedRentPaymentDay');
                        if (elR) elR.value = String(dtR.getDate());
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
            } catch (e) {}
            try {
                if (data.extraAdjustmentsJson) {
                    renderExtraAdjustmentsRows(JSON.parse(toStr(data.extraAdjustmentsJson) || '[]'));
                }
            } catch (e) {}
            try {
                if (data.insuranceDepositItemsJson) {
                    renderInsuranceDepositItemsRows(JSON.parse(toStr(data.insuranceDepositItemsJson) || '[]'));
                }
            } catch (e) {}
            try {
                if (data.customRentItemsJson) {
                    renderCustomRentItemsRows(JSON.parse(toStr(data.customRentItemsJson) || '[]'));
                }
            } catch (e) {}
            ensureTypeSelectAlwaysNew();
            if (Array.isArray(payload.buildings) && payload.buildings.length) {
                buildingsList.length = 0;
                payload.buildings.forEach((b) => buildingsList.push(String(b)));
            }
            if (payload.buildingProfiles && typeof payload.buildingProfiles === 'object') {
                buildingProfiles = payload.buildingProfiles;
            }
            if (Array.isArray(payload.managedUnitsData)) {
                managedUnitsData = payload.managedUnitsData;
            } else {
                syncManagedUnitsFromProfiles();
            }
            if (Array.isArray(payload.owners) && payload.owners.length) {
                ownersList.length = 0;
                payload.owners.forEach((o) => ownersList.push(String(o)));
            }
            if (payload.ownerProfiles && typeof payload.ownerProfiles === 'object') {
                ownerProfiles = payload.ownerProfiles;
            }
            if (Array.isArray(payload.fileRegistry)) {
                fileRegistry = payload.fileRegistry;
            }
            if (typeof payload.currentDoc === 'number' && !Number.isNaN(payload.currentDoc)) {
                const dm = Math.max(0, docNames.length - 1);
                currentDoc = Math.max(0, Math.min(payload.currentDoc, dm));
            }
            if (payloadKey !== 'sfg_runtime_payload') {
                localStorage.removeItem(payloadKey);
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    function initializeMode() {
        try {
            applyTheme(localStorage.getItem('sfg_theme_mode') || 'maroon');
            document.body.classList.add(isViewerMode ? 'viewer-mode' : 'entry-mode');
            applyAppLanguage();
            syncTopNavOffset();
        } catch (e) {
            console.error('initializeMode (theme/language/nav) failed:', e);
        }
        if (!isViewerMode) {
        try {
            if (localStorage.getItem('sfg_contract_full')) {
                loadAllData(false);
            }
        } catch (e) {}
        }
        if (!isViewerMode) {
            document.body.classList.add(
                pageMode === 'contracts'
                    ? 'mode-contracts'
                    : pageMode === 'reservations'
                        ? 'mode-reservations'
                    : pageMode === 'forms'
                        ? 'mode-forms'
                    : pageMode === 'users'
                        ? 'mode-users'
                        : pageMode === 'addressbook'
                            ? 'mode-addressbook'
                            : 'mode-dashboard'
            );
            updateSideNavActive(pageMode);
        }
        const screenBadge = document.getElementById('screenBadge');
        if (screenBadge && !isViewerMode) {
            screenBadge.textContent = pageMode === 'users'
                ? t('إدارة المستخدمين', 'Users')
                : pageMode === 'reservations'
                    ? t('صفحة الحجوزات', 'Reservations')
                : pageMode === 'forms'
                    ? t('نظام المستندات', 'Documents system')
                : pageMode === 'addressbook'
                    ? t('دفتر العناوين', 'Address book')
                    : t('لوحة البيانات والمعلومات', 'Dashboard overview');
        }
        const contractsBadge = document.getElementById('contractsScreenBadge');
        if (contractsBadge && !isViewerMode) {
            contractsBadge.textContent = pageMode === 'contracts'
                ? t('وضع العمل: بيانات العقد والمستندات', 'Work mode: contract data and documents')
                : pageMode === 'reservations'
                    ? t('وضع العمل: بيانات الحجز المنفصلة', 'Work mode: standalone reservation data')
                : pageMode === 'forms'
                    ? t('وضع العمل: نظام المستندات والطباعة', 'Work mode: documents system and printing')
                    : '';
        }
        try {
            updateContractWorkspaceContextUi();
        } catch (e) {
            console.error('updateContractWorkspaceContextUi failed:', e);
        }
        try {
            renderExtraAdjustmentsRows(getExtraAdjustmentsFromUi());
        } catch (e) {
            console.error('renderExtraAdjustmentsRows failed:', e);
        }
        if (!isViewerMode) {
            try {
                if (!localStorage.getItem('sfg_contract_full')) {
                    onPaymentMethodOrDriversChanged();
                }
            } catch (e) {}
        }
        if (isViewerMode) {
            const loadedFromRuntime = applyRuntimePayload();
            if (!loadedFromRuntime) {
                const hasSaved = localStorage.getItem('sfg_contract_full');
                if (hasSaved) {
                    loadAllData(false);
                }
            }
            try {
                renderDocument(currentDoc);
            } catch (e) {
                console.error('renderDocument (viewer init) failed:', e);
            }
            const params = new URLSearchParams(window.location.search);
            if (params.get('autoprint') === '1') {
                setTimeout(() => printDocument(), 700);
            }
        } else {
            try {
                updateSummaryPanel();
            } catch (e) {
                console.error('updateSummaryPanel (init) failed:', e);
            }
            try {
                updateAuthHeaderBar();
            } catch (e) {
                console.error('updateAuthHeaderBar failed:', e);
            }
            if (pageMode === 'dashboard') {
                try {
                    renderOperationsTable();
                } catch (e) {
                    console.error('renderOperationsTable failed:', e);
                }
                try {
                    renderRegistryTable();
                } catch (e) {
                    console.error('renderRegistryTable failed:', e);
                }
            } else if (pageMode === 'contracts') {
                try {
                    const s = sessionStorage.getItem('sfg_ui_current_doc');
                    if (s != null && s !== '') {
                        const n = parseInt(s, 10);
                        if (!Number.isNaN(n) && n >= 0 && n < docNames.length) {
                            currentDoc = n;
                        }
                    }
                } catch (e) {}
                try {
                    renderDocument(currentDoc);
                } catch (e) {
                    console.error('renderDocument (contracts init) failed:', e);
                }
            } else if (pageMode === 'reservations') {
                try {
                    updateSummaryPanel();
                } catch (e) {
                    console.error('updateSummaryPanel (reservations) failed:', e);
                }
            } else if (pageMode === 'forms') {
                try {
                    const s = sessionStorage.getItem('sfg_ui_current_doc');
                    if (s != null && s !== '') {
                        const n = parseInt(s, 10);
                        if (!Number.isNaN(n) && n >= 0 && n < docNames.length) {
                            currentDoc = n;
                        }
                    }
                } catch (e) {}
                try {
                    renderDocument(currentDoc);
                } catch (e) {
                    console.error('renderDocument (forms init) failed:', e);
                }
            } else if (pageMode === 'users') {
                try {
                    loadDashboardAux();
                } catch (e) {
                    console.error('loadDashboardAux failed:', e);
                }
                try {
                    renderUsersManagementPage();
                } catch (e) {
                    console.error('renderUsersManagementPage failed:', e);
                }
            } else if (pageMode === 'addressbook') {
                try {
                    renderAddressBookTable();
                } catch (e) {
                    console.error('renderAddressBookTable (init) failed:', e);
                }
            }
        }
        if (!isViewerMode) {
            const modeParam = pageMode === 'contracts'
                ? 'contracts'
                : pageMode === 'reservations'
                    ? 'reservations'
                : pageMode === 'forms'
                    ? 'forms'
                : pageMode === 'users'
                    ? 'users'
                    : pageMode === 'addressbook'
                        ? 'addressbook'
                        : 'dashboard';
            try {
                const sp = new URLSearchParams(window.location.search);
                if (sp.get('mode') !== modeParam) {
                    const baseUrl = window.location.href.split('?')[0];
                    window.history.replaceState({}, '', `${baseUrl}?mode=${modeParam}`);
                }
            } catch (e) {}
        }
    }

    window.addEventListener('resize', syncTopNavOffset);
    window.addEventListener('load', () => {
        syncTopNavOffset();
        setTimeout(syncTopNavOffset, 120);
    });
    
    function addBuilding() {
        const newBuilding = prompt('أدخل اسم المبنى الجديد / Enter new building name:');
        if(newBuilding) {
            if (!buildingsList.includes(newBuilding)) buildingsList.push(newBuilding);
            persistReferenceData(false);
            renderDocument(11);
        }
    }
    
    function addOwner() {
        const newOwner = prompt('أدخل اسم المالك الجديد / Enter new owner name:');
        if(newOwner) {
            if (!ownersList.includes(newOwner)) ownersList.push(newOwner);
            if (!ownerBuildingMap[newOwner]) ownerBuildingMap[newOwner] = [];
            persistReferenceData(false);
            renderDocument(11);
        }
    }
    
    // ربط أحداث التغيير لتحديث المستند تلقائياً
    const paymentScheduleDriverIds = ['contractMonths', 'startDate', 'endDate', 'agreedRentPaymentDay', 'monthlyRent', 'paymentMethod'];
    const inputs = ['agreementNo', 'contractTypeSelect', 'tenantNameAr', 'tenantNameEn', 'tenantId', 'tenantMobile', 'tenantPassport', 'tenantEmail', 'buildingNo', 'flatNo', 'floorDetails', 'unitType', 'electricityMeter', 'waterMeter', 'monthlyRent', 'rentCalcMode', 'rentAreaSqm', 'rentPerSqm', 'contractMonths', 'graceDays', 'unitHandoverDate', 'startDate', 'endDate', 'agreedRentPaymentDay', 'paymentMethod', 'depositAmount', 'graceAmount', 'otherDiscountAmount', 'municipalFormNo', 'municipalContractNo'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', () => {
            if (id === 'startDate' || id === 'contractMonths') autoCalculateEndDate();
            if (id === 'monthlyRent' || id === 'rentCalcMode' || id === 'rentAreaSqm' || id === 'rentPerSqm' || id === 'graceDays' || id === 'otherDiscountAmount') updateReservationCalculations();
            if (paymentScheduleDriverIds.includes(id)) {
                try { onPaymentMethodOrDriversChanged(); } catch (e) {}
            } else {
                try { renderDocument(currentDoc); } catch (e) {}
            }
        });
        if(el && el.tagName === 'SELECT') el.addEventListener('change', () => {
            if (id === 'rentCalcMode') updateReservationCalculations();
            if (paymentScheduleDriverIds.includes(id)) {
                try { onPaymentMethodOrDriversChanged(); } catch (e) {}
            } else {
                try { renderDocument(currentDoc); } catch (e) {}
            }
        });
        if (el && (id === 'startDate' || id === 'contractMonths')) {
            el.addEventListener('change', () => {
                autoCalculateEndDate();
                if (paymentScheduleDriverIds.includes(id)) {
                    try { onPaymentMethodOrDriversChanged(); } catch (e) {}
                } else {
                    try { renderDocument(currentDoc); } catch (e) {}
                }
            });
        }
    });
    const extraAdjustmentsList = document.getElementById('extraAdjustmentsList');
    if (extraAdjustmentsList) {
        const onExtraChange = () => {
            updateReservationCalculations();
            updateSummaryPanel();
        };
        extraAdjustmentsList.addEventListener('input', onExtraChange);
        extraAdjustmentsList.addEventListener('change', onExtraChange);
    }
    const insuranceDepositItemsList = document.getElementById('insuranceDepositItemsList');
    if (insuranceDepositItemsList) {
        const onInsChange = () => {
            try { updateSummaryPanel(); } catch (e) {}
            try { renderDocument(currentDoc); } catch (e) {}
        };
        insuranceDepositItemsList.addEventListener('input', onInsChange);
        insuranceDepositItemsList.addEventListener('change', onInsChange);
    }
    const customRentScheduleTableWrap = document.getElementById('customRentScheduleTableWrap');
    if (customRentScheduleTableWrap) {
        const onCustomRentChange = () => {
            try {
                syncCustomRentToMainPaymentSchedule();
            } catch (e) {}
        };
        customRentScheduleTableWrap.addEventListener('input', onCustomRentChange);
        customRentScheduleTableWrap.addEventListener('change', onCustomRentChange);
    }
    const paySchedWrap = document.getElementById('paymentScheduleTableWrap');
    if (paySchedWrap) {
        const onSched = (e) => {
            const t = e && e.target;
            if (t && t.nodeType === 1) {
                const el = t;
                if (el.hasAttribute('data-schedule-date') || el.hasAttribute('data-schedule-amount')) {
                    const tr = el.closest('tr');
                    if (tr) {
                        const m = tr.getAttribute('data-schedule-month');
                        if (m) {
                            try {
                                copyMainScheduleRowToCustomRentTable(m);
                            } catch (err) {}
                        }
                    }
                }
            }
            try {
                updateSummaryPanel();
            } catch (e) {}
            try {
                renderDocument(currentDoc);
            } catch (e) {}
        };
        paySchedWrap.addEventListener('input', onSched);
        paySchedWrap.addEventListener('change', onSched);
    }
    const depositInput = document.getElementById('depositAmount');
    if (depositInput) {
        depositInput.addEventListener('input', () => {
            depositInput.dataset.manualDeposit = '1';
        });
    }
    ['buildingNo', 'flatNo', 'buildingSelect'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const ev = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(ev, syncUnitDerivedFieldsFromSelection);
    });

    const importInput = document.getElementById('importFileInput');
    if (importInput) {
        importInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) importDataFile(file);
            e.target.value = '';
        });
    }

    ['unitsSearchInput', 'unitsBuildingFilter', 'unitsStatusFilter', 'unitsExpireFilter', 'unitsUtilitiesFilter'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            const eventName = el.tagName === 'SELECT' ? 'change' : 'input';
            el.addEventListener(eventName, renderOperationsTable);
        }
    });

    const registrySearch = document.getElementById('registrySearch');
    if (registrySearch) registrySearch.addEventListener('input', renderRegistryTable);
    const addressBookSearch = document.getElementById('addressBookSearch');
    if (addressBookSearch) addressBookSearch.addEventListener('input', renderAddressBookTable);
    ['abFilterContact', 'abFilterComm', 'abFilterLocation', 'abFilterDocs'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', renderAddressBookTable);
    });
    const abNationality = document.getElementById('abNationality');
    if (abNationality) abNationality.addEventListener('change', syncAddressBookFormRules);
    ['abIdExpiryDate', 'abPassportExpiryDate'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const openPicker = () => {
            if (typeof el.showPicker === 'function') {
                try { el.showPicker(); } catch (e) {}
            }
        };
        el.addEventListener('focus', openPicker);
        el.addEventListener('click', openPicker);
    });
    const abName = document.getElementById('abName');
    const abNameEn = document.getElementById('abNameEn');
    const abLiveTranslate = document.getElementById('abLiveTranslate');
    if (abName) {
        abName.addEventListener('input', () => {
            if (abLiveTranslate?.checked) translateAddressBookName('ar2en');
        });
    }
    if (abNameEn) {
        abNameEn.addEventListener('input', () => {
            if (abLiveTranslate?.checked) translateAddressBookName('en2ar');
        });
    }
    const tenantAddressBookSelect = document.getElementById('tenantAddressBookSelect');
    if (tenantAddressBookSelect) {
        tenantAddressBookSelect.addEventListener('change', () => {
            if (tenantAddressBookSelect.value !== '') applySelectedAddressBookTenantToForm();
        });
    }

    const tenantExcelInput = document.getElementById('tenantExcelInput');
    if (tenantExcelInput) {
        tenantExcelInput.addEventListener('change', (e) => {
            selectedTenantExcelFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
            if (selectedTenantExcelFile) {
                // استيراد مباشر بعد الاختيار لتجنب فقدان حالة input في بعض المتصفحات
                setTimeout(() => importExcelData(), 0);
            }
        });
    }

    const ewtExcelInput = document.getElementById('ewtExcelInput');
    if (ewtExcelInput) {
        ewtExcelInput.addEventListener('change', (e) => {
            selectedEwtExcelFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        });
    }

    const buildingStructureExcelInput = document.getElementById('buildingStructureExcelInput');
    if (buildingStructureExcelInput) {
        buildingStructureExcelInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) importBuildingStructuresExcel(file);
            e.target.value = '';
        });
    }

    const rentedContractsExcelInput = document.getElementById('rentedContractsExcelInput');
    if (rentedContractsExcelInput) {
        rentedContractsExcelInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) importRentedContractsExcel(file);
            e.target.value = '';
        });
    }

    const unitDetailsModalEl = document.getElementById('unitDetailsModal');
    if (unitDetailsModalEl) {
        unitDetailsModalEl.addEventListener('click', (e) => {
            const t = e.target;
            if (t && (t.closest('#unitDetailsContractWrap') || t.closest('#unitDetailsPrintWrap'))) return;
            closeUnitDetailsIeMenus();
        });
    }

    const unitDetailsModal = document.getElementById('unitDetailsModal');
    if (unitDetailsModal) {
        unitDetailsModal.addEventListener('click', (e) => {
            if (e.target === unitDetailsModal) closeUnitDetailsModal();
        });
    }
    document.addEventListener('click', (e) => {
        const t = e.target;
        if (t && t.closest && t.closest('#addressBookPrintWrap')) return;
        closeAddressBookPrintMenu();
    });
    
    // بدء التشغيل (وضع آمن عند حدوث أعطال جزئية) + جلب البيانات من الخادم إن وُجد
    (async function startup() {
        await probeSfgApi();
        await hydrateLocalStorageFromIndexedDb();
        const params = new URLSearchParams(window.location.search);
        const viewer = params.get('viewer') === '1';
        // IMPORTANT: Do not auto-pull from server on startup.
        // Auto-restore could overwrite the latest local edits after page refresh.
        // Server restore stays manual via "📂 Restore data".
        try {
            initializeMode();
        } catch (err) {
            console.error('Initialization failed:', err);
            if (err && err.stack) console.error(err.stack);
            try {
                renderDocument(0);
            } catch (innerErr) {
                console.error('Fallback render failed:', innerErr);
            }
            // Avoid blocking alert on recoverable errors; see console for details
            if (localStorage.getItem('sfg_show_init_error_alert') === '1') {
                alert('⚠️ حدث خطأ أثناء تهيئة بعض أجزاء الواجهة. تم تشغيل وضع آمن مؤقتاً، يرجى تحديث الصفحة.\n\n' + (err && err.message ? err.message : String(err)));
            }
        }
        try {
            if (!Array.isArray(addressBookEntries) || !addressBookEntries.length) {
                refreshAddressBookFromSystem(false);
            } else {
                renderAddressBookTable();
            }
        } catch (abErr) {
            console.error('Address book init failed:', abErr);
        }
    })();
