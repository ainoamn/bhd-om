/**
 * ============================================
 * إدارة بوابات الدفع — Payment Gateways Module
 * تفاعلي: تعديل، تفعيل، اختبار، حفظ
 * ============================================
 */
(function() {
  'use strict';

  // ======== تعريفات البوابات ========
  var GATEWAYS_DEF = [
    { key:'thawani',       nameAr:'ثواني',                  nameEn:'Thawani',                  icon:'🇴🇲', color:'#C8102E', fields:['apiKey','apiSecret','sandbox'] },
    { key:'stripe',        nameAr:'سترايب',                 nameEn:'Stripe',                   icon:'💳', color:'#635BFF', fields:['apiSecret','publicKey','sandbox'] },
    { key:'paypal',        nameAr:'باي بال',                nameEn:'PayPal',                   icon:'🅿️', color:'#003087', fields:['apiKey','apiSecret','sandbox'] },
    { key:'telr',          nameAr:'تلر',                    nameEn:'Telr',                     icon:'🔒', color:'#10b981', fields:['merchantId','apiSecret','sandbox'] },
    { key:'cmi',           nameAr:'بوابة الدفع الوطنية',    nameEn:'CMI / Oman Payment Gateway',icon:'🏦', color:'#f59e0b', fields:['merchantId','storeKey','sandbox'] },
    { key:'network-intl',  nameAr:'نتورك إنترناشيونال',     nameEn:'Network International',     icon:'🌐', color:'#14b8a6', fields:['apiSecret','outletRef','sandbox'] },
    { key:'hyperpay',      nameAr:'هايبر باي',              nameEn:'HyperPay',                 icon:'⚡', color:'#8b5cf6', fields:['entityId','accessToken','sandbox'] },
    { key:'payfort',       nameAr:'أمازون للمدفوعات',        nameEn:'Amazon Payment Services',   icon:'📱', color:'#f97316', fields:['merchantId','accessToken','sandbox'] },
    { key:'myfatoorah',    nameAr:'فاتورتي',               nameEn:'MyFatoorah',               icon:'🧾', color:'#0ea5e9', fields:['apiSecret','sandbox'] },
    { key:'paytabs',       nameAr:'بيتابس',                nameEn:'PayTabs',                  icon:'💠', color:'#6366f1', fields:['profileId','apiSecret','sandbox'] },
    { key:'tap',           nameAr:'تاب للمدفوعات',          nameEn:'Tap Payments',             icon:'🔵', color:'#06b6d4', fields:['apiSecret','publicKey','sandbox'] },
  ];

  var FIELD_LABELS = {
    apiKey:      { ar:'المفتاح العام (API Key)',    en:'API Key / Client ID' },
    apiSecret:   { ar:'المفتاح السري (Secret)',     en:'API Secret / Auth Key' },
    publicKey:   { ar:'المفتاح العام (Publishable)',en:'Public Key / Publishable' },
    merchantId:  { ar:'معرف التاجر (Merchant ID)',  en:'Merchant ID / Store ID' },
    storeKey:    { ar:'مفتاح المتجر (Store Key)',   en:'Store Key' },
    outletRef:   { ar:'Outlet Reference',            en:'Outlet Ref' },
    profileId:   { ar:'Profile ID',                  en:'Profile ID' },
    entityId:    { ar:'Entity ID',                   en:'Entity ID' },
    accessToken: { ar:'رمز الوصول (Access Token)',   en:'Access Token / Auth Code' },
    sandbox:     { ar:'وضع الاختبار (Sandbox)',      en:'Sandbox Mode' },
  };

  // ======== الحالة ========
  var state = {
    configs: {},        // provider → config
    editingProvider: null,
    currentTab: 'gateways',
    loading: false,
  };

  // ======== التهيئة ========
  function init() {
    loadAll();
    setupWebhooksTab();
  }

  // ======== تحميل الكل ========
  function loadAll() {
    showStatus('⏳ جاري التحميل...', 'info');
    fetch('/api/payment/config', { credentials: 'include' })
      .then(function(r){ return r.json(); })
      .then(function(data){
        state.configs = {};
        (data.configs || []).forEach(function(c){ state.configs[c.provider] = c; });
        renderGatewaysTable();
        updateStats();
        showStatus('✅ تم التحميل — ' + countEnabled() + ' بوابات مفعلة', 'success');
      })
      .catch(function(e){
        console.error('Load error:', e);
        showStatus('⚠️ فشل التحميل — استخدام الإعدادات الافتراضية', 'error');
        renderGatewaysTable();
      });
  }

  // ======== عرض جدول البوابات ========
  function renderGatewaysTable() {
    var tbody = document.getElementById('pg-gateways-tbody');
    if (!tbody) return;

    var enabledCount = countEnabled();
    var elCount = document.getElementById('pg-enabled-count');
    if (elCount) elCount.textContent = enabledCount + '/11 مفعلة';
    var elStat = document.getElementById('pg-stat-gateways');
    if (elStat) elStat.textContent = enabledCount;

    tbody.innerHTML = GATEWAYS_DEF.map(function(g, i){
      var cfg = state.configs[g.key] || {};
      var isOn = cfg.isEnabled;
      var lastTest = cfg.lastTestResult;
      var hasCreds = hasCredentials(g.key, cfg);

      var statusClass = isOn ? 'bhd-status-active' : 'bhd-status-inactive';
      var statusText = isOn ? '✅ مفعلة' : '⏸️ معطلة';

      var healthClass, healthText;
      if (lastTest === 'ok') { healthClass='bhd-status-active'; healthText='🟢 متصل'; }
      else if (lastTest && lastTest !== 'ok') { healthClass='bhd-status-error'; healthText='🔴 ' + lastTest; }
      else if (isOn && !hasCreds) { healthClass='bhd-status-error'; healthText='⚠️ ناقصة'; }
      else { healthClass='bhd-status-pending'; healthText='⚪ لم يُختبر'; }

      return '<tr>' +
        '<td>' + (i+1) + '</td>' +
        '<td><div style="display:flex;align-items:center;gap:0.5rem">' +
          '<span style="width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:1.1rem;background:' + g.color + '15;color:' + g.color + '">' + g.icon + '</span>' +
          '<div><div style="font-weight:600;font-size:0.85rem">' + g.nameAr + '</div><div style="font-size:0.72rem;color:#9ca3af">' + g.nameEn + '</div></div>' +
        '</div></td>' +
        '<td>' +
          '<label class="pg-toggle" title="تفعيل/إيقاف">' +
            '<input type="checkbox" ' + (isOn?'checked':'') + ' onchange="PG.toggleProvider(\'' + g.key + '\',this.checked)">' +
            '<span class="pg-toggle-slider"></span>' +
          '</label>' +
        '</td>' +
        '<td><span class="bhd-status ' + healthClass + '">' + healthText + '</span></td>' +
        '<td>' +
          '<div style="display:flex;gap:0.3rem;flex-wrap:wrap">' +
            '<button class="bhd-btn bhd-btn-primary bhd-btn-sm" onclick="PG.openEdit(\'' + g.key + '\')">⚙️ إعدادات</button>' +
            '<button class="bhd-btn bhd-btn-warning bhd-btn-sm" onclick="PG.testProvider(\'' + g.key + '\',this)" ' + (!hasCreds?'disabled':'') + '>🧪 اختبار</button>' +
          '</div>' +
          '<div class="pg-test-result" id="pg-test-' + g.key + '"></div>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  // ======== تفعيل/إيقاف ========
  function toggleProvider(provider, isEnabled) {
    showStatus('⏳ ' + (isEnabled?'تفعيل':'إيقاف') + ' ' + provider + '...', 'info');
    fetch('/api/payment/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ provider: provider, isEnabled: isEnabled }),
    })
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (data.success) {
        // تحديث الحالة المحلية
        if (!state.configs[provider]) state.configs[provider] = {};
        state.configs[provider].isEnabled = isEnabled;
        renderGatewaysTable();
        showStatus('✅ ' + data.message, 'success');
      } else {
        showStatus('❌ ' + (data.error || 'فشل'), 'error');
        renderGatewaysTable(); // revert
      }
    })
    .catch(function(e){
      showStatus('❌ خطأ في الاتصال', 'error');
      renderGatewaysTable();
    });
  }

  // ======== فتح نموذج التعديل ========
  function openEdit(provider) {
    var def = GATEWAYS_DEF.find(function(g){ return g.key === provider; });
    var cfg = state.configs[provider] || {};
    state.editingProvider = provider;

    document.getElementById('pg-edit-title').innerHTML = def.icon + ' إعدادات — ' + def.nameAr + ' <span style="opacity:0.7;font-size:0.85rem">' + def.nameEn + '</span>';

    var html = '<div class="pg-sandbox-row">' +
      '<label class="pg-toggle"><input type="checkbox" id="pg-edit-sandbox" ' + (cfg.sandbox !== false ? 'checked' : '') + '><span class="pg-toggle-slider"></span></label>' +
      '<label for="pg-edit-sandbox">وضع الاختبار (Sandbox)</label>' +
    '</div>';

    def.fields.forEach(function(fieldKey){
      if (fieldKey === 'sandbox') return;
      var lbl = FIELD_LABELS[fieldKey] || { ar: fieldKey, en: fieldKey };
      var val = cfg[fieldKey] || '';
      html += '<div class="pg-field">' +
        '<label>' + lbl.ar + ' <span class="pg-opt">/ ' + lbl.en + '</span></label>' +
        '<input type="password" id="pg-edit-' + fieldKey + '" value="' + escapeHtml(val) + '" placeholder="****" onfocus="this.type=\'text\'" onblur="this.type=\'password\'">' +
        '<div class="pg-field-hint">اضغط للكشف — سيُخفى بعد التعديل</div>' +
      '</div>';
    });

    // نتيجة الاختبار الأخير
    if (cfg.lastTestedAt) {
      var d = new Date(cfg.lastTestedAt).toLocaleString('ar-OM');
      var resultClass = cfg.lastTestResult === 'ok' ? 'pg-test-ok' : 'pg-test-fail';
      html += '<div class="pg-test-result show ' + resultClass + '">آخر اختبار: ' + d + ' — ' + (cfg.lastTestResult || 'لم يُختبر') + '</div>';
    }

    document.getElementById('pg-edit-body').innerHTML = html;
    document.getElementById('pg-edit-modal').style.display = 'flex';
  }

  // ======== حفظ التعديلات ========
  function saveEdit() {
    var provider = state.editingProvider;
    var def = GATEWAYS_DEF.find(function(g){ return g.key === provider; });
    if (!def) return;

    var payload = { provider: provider, isEnabled: true };

    def.fields.forEach(function(fieldKey){
      var el = document.getElementById('pg-edit-' + fieldKey);
      if (el) {
        if (fieldKey === 'sandbox') {
          payload[fieldKey] = el.checked;
        } else {
          var val = el.value.trim();
          if (val && val.indexOf('****') === -1) {
            payload[fieldKey] = val;
          }
        }
      }
    });

    // إذا كانت معطلة، نحتفظ بالحالة
    var existing = state.configs[provider];
    if (existing) payload.isEnabled = existing.isEnabled;
    var sandboxEl = document.getElementById('pg-edit-sandbox');
    if (sandboxEl) payload.sandbox = sandboxEl.checked;

    showStatus('⏳ حفظ إعدادات ' + provider + '...', 'info');

    fetch('/api/payment/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (data.success) {
        state.configs[provider] = data.config;
        closeEdit();
        renderGatewaysTable();
        showStatus('✅ تم حفظ إعدادات ' + provider, 'success');
      } else {
        showStatus('❌ ' + (data.error || 'فشل الحفظ'), 'error');
      }
    })
    .catch(function(e){
      showStatus('❌ خطأ في الاتصال', 'error');
    });
  }

  // ======== إغلاق نموذج التعديل ========
  function closeEdit() {
    document.getElementById('pg-edit-modal').style.display = 'none';
    state.editingProvider = null;
  }

  // ======== اختبار اتصال البوابة ========
  function testProvider(provider, btn) {
    var resultEl = document.getElementById('pg-test-' + provider);
    if (resultEl) { resultEl.className = 'pg-test-result show pg-test-warn'; resultEl.textContent = '⏳ جاري الاختبار...'; }
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

    fetch('/api/payment/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ provider: provider }),
    })
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (resultEl) {
        resultEl.className = 'pg-test-result show ' + (data.ok ? 'pg-test-ok' : 'pg-test-fail');
        resultEl.textContent = (data.ok ? '✅' : '❌') + ' ' + data.message;
      }
      // تحديث الحالة المحلية
      if (!state.configs[provider]) state.configs[provider] = {};
      state.configs[provider].lastTestResult = data.ok ? 'ok' : data.message;
      state.configs[provider].lastTestedAt = new Date().toISOString();
      renderGatewaysTable();
    })
    .catch(function(e){
      if (resultEl) { resultEl.className = 'pg-test-result show pg-test-fail'; resultEl.textContent = '❌ فشل الاتصال'; }
    })
    .finally(function(){
      if (btn) { btn.disabled = false; btn.textContent = '🧪 اختبار'; }
    });
  }

  // ======== تحميل المعاملات من الحسابات ========
  function loadTransactions() {
    var tbody = document.getElementById('pg-transactions-tbody');
    var statusEl = document.getElementById('pg-tx-status');
    if (!tbody) return;

    var days = parseInt(document.getElementById('pg-filter-days')?.value || 30);
    if (statusEl) { statusEl.style.display = 'block'; statusEl.className = 'pg-test-warn'; statusEl.textContent = '⏳ جاري التحميل...'; }

    // جلب القيود المحاسبية من API
    fetch('/api/payment/config?accounting=true&days=' + days, { credentials: 'include' })
      .then(function(r){
        if (!r.ok) throw new Error('API error');
        return r.json();
      })
      .then(function(data){
        var entries = data.entries || [];
        if (entries.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;padding:2rem">لا توجد قيود محاسبية لهذه الفترة</td></tr>';
          if (statusEl) { statusEl.style.display = 'none'; }
          return;
        }

        tbody.innerHTML = entries.map(function(e){
          var dateStr = e.date ? new Date(e.date).toLocaleDateString('ar-OM') : '—';
          var debitLines = (e.lines || []).filter(function(l){ return l.debit > 0; });
          var creditLines = (e.lines || []).filter(function(l){ return l.credit > 0; });
          var debitStr = debitLines.map(function(l){ return l.account?.nameAr + ': ' + l.debit; }).join('<br>');
          var creditStr = creditLines.map(function(l){ return l.account?.nameAr + ': ' + l.credit; }).join('<br>');

          return '<tr>' +
            '<td style="font-family:monospace;font-size:0.78rem">' + (e.serialNumber || e.id) + '</td>' +
            '<td>' + dateStr + '</td>' +
            '<td>' + (e.descriptionAr || '—') + '</td>' +
            '<td style="color:#166534;font-size:0.78rem">' + debitStr + '</td>' +
            '<td style="color:#991b1b;font-size:0.78rem">' + creditStr + '</td>' +
            '<td><span class="bhd-status bhd-status-active">✅ ' + (e.status || 'POSTED') + '</span></td>' +
          '</tr>';
        }).join('');

        if (statusEl) { statusEl.style.display = 'none'; }

        // تحديث الإحصائيات
        var total = entries.reduce(function(s, e){ return s + (e.totalDebit || 0); }, 0);
        document.getElementById('pg-stat-total').textContent = total.toLocaleString() + ' ر.ع';
        document.getElementById('pg-stat-count').textContent = entries.length;
        document.getElementById('pg-stat-net').textContent = total.toLocaleString() + ' ر.ع';
      })
      .catch(function(e){
        console.error('Tx load error:', e);
        // محاولة ثانية — جلب من config API
        fetch('/api/payment/config', { credentials: 'include' })
          .then(function(r){ return r.json(); })
          .then(function(data){
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;padding:2rem">📋 المعاملات تُعرض من قاعدة البيانات — شغّل Prisma migration أولاً</td></tr>';
          })
          .catch(function(){
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;padding:2rem">⚠️ تأكد من تشغيل: npx prisma migrate dev</td></tr>';
          });
        if (statusEl) { statusEl.style.display = 'none'; }
      });
  }

  // ======== تبويب Webhooks ========
  function setupWebhooksTab() {
    var baseUrl = window.location.origin;
    var webhookUrl = baseUrl + '/api/webhooks/payment?provider=PROVIDER_NAME';
    var urlEl = document.getElementById('pg-webhook-url');
    if (urlEl) urlEl.textContent = webhookUrl;

    var tbody = document.getElementById('pg-webhook-tbody');
    if (tbody) {
      tbody.innerHTML = GATEWAYS_DEF.map(function(g){
        var url = baseUrl + '/api/webhooks/payment?provider=' + g.key;
        return '<tr>' +
          '<td><span style="margin-left:0.4rem">' + g.icon + '</span>' + g.nameAr + '</td>' +
          '<td><code style="font-size:0.78rem;color:#C8102E;word-break:break-all">' + url + '</code></td>' +
          '<td><button class="pg-copy-btn" onclick="PG.copyToClipboard(\'' + url + '\')">📋 نسخ</button></td>' +
        '</tr>';
      }).join('');
    }
  }

  // ======== تبديل التبويبات ========
  function switchTab(tabName) {
    state.currentTab = tabName;
    document.querySelectorAll('#pg-tabs .bhd-tab').forEach(function(t){ t.classList.toggle('active', t.dataset.tab === tabName); });
    document.querySelectorAll('#payment-gateways-section .bhd-tab-panel').forEach(function(p){ p.classList.toggle('active', p.id === 'pg-panel-' + tabName); });
    if (tabName === 'transactions') loadTransactions();
  }

  // ======== مساعدات ========
  function hasCredentials(provider, cfg) {
    var def = GATEWAYS_DEF.find(function(g){ return g.key === provider; });
    if (!def) return false;
    return def.fields.some(function(f){
      if (f === 'sandbox') return false;
      var v = (cfg && cfg[f]) || '';
      return v.length > 0;
    });
  }

  function countEnabled() {
    return Object.values(state.configs).filter(function(c){ return c.isEnabled; }).length;
  }

  function updateStats() {
    document.getElementById('pg-stat-gateways').textContent = countEnabled();
  }

  function showStatus(msg, type) {
    var el = document.getElementById('pg-status-msg');
    if (!el) return;
    el.style.display = 'block';
    el.textContent = msg;
    el.className = type === 'success' ? 'pg-msg-success' : (type === 'error' ? 'pg-msg-error' : '');
    setTimeout(function(){ el.style.display = 'none'; }, 5000);
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function(){ alert('✅ تم النسخ'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert('✅ تم النسخ');
    }
  }

  // ======== التصدير ========
  window.PG = {
    init: init,
    loadAll: loadAll,
    switchTab: switchTab,
    toggleProvider: toggleProvider,
    openEdit: openEdit,
    closeEdit: closeEdit,
    saveEdit: saveEdit,
    testProvider: testProvider,
    loadTransactions: loadTransactions,
    copyToClipboard: copyToClipboard,
  };

  // تشغيل
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
