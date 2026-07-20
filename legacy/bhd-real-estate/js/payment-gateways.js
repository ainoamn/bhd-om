/**
 * ============================================
 * إدارة بوابات الدفع — Payment Gateways Module
 * ============================================
 */

(function() {
  'use strict';

  // حالة الوحدة
  const state = {
    gateways: [],
    transactions: [],
    stats: { totalCollected: 0, totalRefunded: 0, netRevenue: 0, count: 0 },
    currentTab: 'gateways',
    currentPage: 1,
    pageSize: 20,
  };

  // تعريف البوابات الافتراضية
  const DEFAULT_GATEWAYS = [
    { key: 'thawani', nameAr: 'ثواني', nameEn: 'Thawani', icon: '🇴🇲', countries: ['OM'], currencies: ['OMR'], enabled: false, healthy: false, envVars: ['THAWANI_SECRET_KEY', 'THAWANI_PUBLISHABLE_KEY'] },
    { key: 'stripe', nameAr: 'سترايب', nameEn: 'Stripe', icon: '💳', countries: ['*'], currencies: ['OMR','USD','EUR','GBP'], enabled: false, healthy: false, envVars: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'] },
    { key: 'paypal', nameAr: 'باي بال', nameEn: 'PayPal', icon: '🅿️', countries: ['*'], currencies: ['OMR','USD','EUR','GBP'], enabled: false, healthy: false, envVars: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] },
    { key: 'telr', nameAr: 'تلر', nameEn: 'Telr', icon: '🔒', countries: ['AE','SA','OM','BH','KW','QA'], currencies: ['OMR','AED','SAR','USD'], enabled: false, healthy: false, envVars: ['TELR_STORE_ID', 'TELR_AUTH_KEY'] },
    { key: 'cmi', nameAr: 'بوابة الدفع الوطنية', nameEn: 'CMI', icon: '🏦', countries: ['OM'], currencies: ['OMR'], enabled: false, healthy: false, envVars: ['CMI_MERCHANT_ID', 'CMI_API_KEY', 'CMI_STORE_KEY'] },
    { key: 'network-intl', nameAr: 'نتورك إنترناشيونال', nameEn: 'Network International', icon: '🌐', countries: ['OM','AE'], currencies: ['OMR','AED','USD'], enabled: false, healthy: false, envVars: ['NI_API_KEY', 'NI_OUTLET_REF'] },
    { key: 'hyperpay', nameAr: 'هايبر باي', nameEn: 'HyperPay', icon: '⚡', countries: ['SA','AE','OM','BH','KW','QA'], currencies: ['OMR','SAR','AED','USD'], enabled: false, healthy: false, envVars: ['HYPERPAY_ENTITY_ID', 'HYPERPAY_ACCESS_TOKEN'] },
    { key: 'payfort', nameAr: 'أمازون للمدفوعات', nameEn: 'Amazon Payment Services', icon: '📱', countries: ['AE','SA','EG','OM','BH','KW','QA'], currencies: ['OMR','AED','SAR','USD','EGP'], enabled: false, healthy: false, envVars: ['PAYFORT_MERCHANT_IDENTIFIER', 'PAYFORT_ACCESS_CODE'] },
    { key: 'myfatoorah', nameAr: 'فاتورتي', nameEn: 'MyFatoorah', icon: '🧾', countries: ['KW','OM','SA','AE','BH','QA'], currencies: ['OMR','KWD','AED','SAR','USD'], enabled: false, healthy: false, envVars: ['MF_API_KEY'] },
    { key: 'paytabs', nameAr: 'بيتابس', nameEn: 'PayTabs', icon: '💠', countries: ['SA','AE','OM','BH','KW','QA','EG'], currencies: ['OMR','SAR','AED','USD'], enabled: false, healthy: false, envVars: ['PAYTABS_PROFILE_ID', 'PAYTABS_SERVER_KEY'] },
    { key: 'tap', nameAr: 'تاب للمدفوعات', nameEn: 'Tap Payments', icon: '🔵', countries: ['KW','OM','SA','AE','BH','QA'], currencies: ['OMR','KWD','AED','SAR','USD','BHD','QAR'], enabled: false, healthy: false, envVars: ['TAP_SECRET_KEY', 'TAP_PUBLIC_KEY'] },
  ];

  // ألوان البوابات
  const COLORS = {
    thawani: '#C8102E', stripe: '#635BFF', paypal: '#003087', telr: '#10b981',
    'cmi': '#f59e0b', 'network-intl': '#14b8a6', 'hyperpay': '#8b5cf6',
    'payfort': '#f97316', 'myfatoorah': '#0ea5e9', 'paytabs': '#6366f1', 'tap': '#06b6d4',
  };

  // ============================================================
  // التهيئة
  // ============================================================

  function init() {
    // تبويبات
    document.querySelectorAll('#pg-tabs .bhd-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        const panelId = this.dataset.tab;
        switchTab(panelId);
      });
    });

    // تحديث webhook URL
    var baseUrl = window.location.origin;
    document.getElementById('pg-webhook-url').textContent = baseUrl + '/api/webhooks/payment?provider=PROVIDER_NAME';

    // تحميل البيانات
    loadGateways();
    loadTransactions();
    loadStats();
  }

  // ============================================================
  // التبويبات
  // ============================================================

  function switchTab(tabName) {
    state.currentTab = tabName;

    document.querySelectorAll('#pg-tabs .bhd-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
    document.querySelectorAll('#payment-gateways-section .bhd-tab-panel').forEach(function(p) {
      p.classList.toggle('active', p.id === 'pg-panel-' + tabName);
    });
  }

  // ============================================================
  // تحميل البوابات
  // ============================================================

  async function loadGateways() {
    try {
      var res = await fetch('/api/admin/payment-gateway', { credentials: 'include' });
      if (res.ok) {
        var data = await res.json();
        state.gateways = mergeGatewayDefaults(data.providers || []);
      } else {
        var pubRes = await fetch('/api/payment/providers');
        if (pubRes.ok) {
          var pubData = await pubRes.json();
          state.gateways = mergeGatewayDefaults(pubData.providers || DEFAULT_GATEWAYS);
        } else {
          state.gateways = DEFAULT_GATEWAYS;
        }
      }
    } catch (e) {
      state.gateways = DEFAULT_GATEWAYS;
    }
    renderGateways();
    renderSettings();
  }

  function mergeGatewayDefaults(providers) {
    return (providers || []).map(function(g) {
      var fallback = DEFAULT_GATEWAYS.find(function(d) { return d.key === g.key; }) || {};
      return Object.assign({}, fallback, g, {
        envVars: g.envVars || fallback.envVars || [],
      });
    });
  }

  function renderGateways() {
    const tbody = document.querySelector('#pg-gateways-table tbody');
    if (!tbody) return;

    const enabledCount = state.gateways.filter(function(g) { return g.enabled; }).length;
    document.getElementById('pg-enabled-count').textContent = enabledCount + '/11 مفعلة';
    document.getElementById('pg-stat-gateways').textContent = enabledCount;

    tbody.innerHTML = state.gateways.map(function(g) {
      const color = COLORS[g.key] || '#6b7280';
      const statusClass = g.enabled ? 'bhd-status-active' : 'bhd-status-inactive';
      const statusText = g.enabled ? '✅ مفعلة' : '⏸️ غير مفعلة';
      const healthClass = g.healthy ? 'bhd-status-active' : (g.enabled ? 'bhd-status-error' : 'bhd-status-inactive');
      const healthText = g.healthy ? '🟢 متصل' : (g.enabled ? '🔴 غير متصل' : '—');

      return '<tr>' +
        '<td><div style="display:flex;align-items:center">' +
          '<span class="bhd-provider-icon" style="background:' + color + '15;color:' + color + '">' + g.icon + '</span>' +
          '<div><div style="font-weight:600">' + g.nameAr + '</div><div style="font-size:0.75rem;color:#6b7280">' + g.nameEn + '</div></div>' +
        '</div></td>' +
        '<td>' + (g.countries || []).map(function(c) { return c === '*' ? '🌍' : c; }).join(' ') + '</td>' +
        '<td>' + (g.currencies || []).join(', ') + '</td>' +
        '<td><span class="bhd-status ' + statusClass + '">' + statusText + '</span></td>' +
        '<td><span class="bhd-status ' + healthClass + '">' + healthText + '</span></td>' +
        '<td>' +
          '<button class="bhd-btn bhd-btn-sm" onclick="PG.testGateway(\'' + g.key + '\')" title="اختبار الاتصال">🧪</button>' +
          ' <button class="bhd-btn bhd-btn-sm" onclick="PG.viewGatewayDetails(\'' + g.key + '\')" title="التفاصيل">ℹ️</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  // ============================================================
  // المعاملات
  // ============================================================

  async function loadTransactions() {
    try {
      var res = await fetch('/api/admin/payment-gateway', { credentials: 'include' });
      if (res.ok) {
        var data = await res.json();
        state.transactions = data.transactions || [];
        if (data.stats) {
          state.stats = data.stats;
        }
      } else {
        state.transactions = generateMockTransactions();
      }
    } catch (e) {
      state.transactions = generateMockTransactions();
    }
    renderTransactions();
    loadStats();
  }

  function generateMockTransactions() {
    // بيانات تجريبية لعرض الواجهة
    const providers = [
      { key: 'thawani', name: 'ثواني', icon: '🇴🇲' },
      { key: 'stripe', name: 'Stripe', icon: '💳' },
      { key: 'paypal', name: 'PayPal', icon: '🅿️' },
    ];
    const tenants = ['أحمد محمد', 'خالد العامري', 'فاطمة الزهراء', 'عبدالله البلوشي'];
    var txs = [];
    for (var i = 1; i <= 15; i++) {
      var p = providers[i % providers.length];
      txs.push({
        id: 'PAY-2026-' + String(i).padStart(5, '0'),
        date: new Date(Date.now() - i * 86400000 * (i % 3 + 1)),
        provider: p.key,
        providerName: p.name,
        providerIcon: p.icon,
        amount: [150, 200, 250, 300, 180][i % 5],
        tenant: tenants[i % tenants.length],
        description: 'دفع إيجار الوحدة ' + (100 + i),
        status: 'PAID',
      });
    }
    return txs;
  }

  function renderTransactions() {
    const providerFilter = document.getElementById('pg-filter-provider')?.value || '';
    const daysFilter = parseInt(document.getElementById('pg-filter-days')?.value || 30);
    const since = Date.now() - daysFilter * 86400000;

    var filtered = state.transactions.filter(function(t) {
      if (providerFilter && t.provider !== providerFilter) return false;
      if (t.date && new Date(t.date).getTime() < since) return false;
      return true;
    });

    const tbody = document.querySelector('#pg-transactions-table tbody');
    if (!tbody) return;

    tbody.innerHTML = filtered.map(function(t) {
      var dateStr = t.date ? new Date(t.date).toLocaleDateString('ar-OM') : '—';
      var pColor = COLORS[t.provider] || '#6b7280';
      return '<tr>' +
        '<td style="font-family:monospace;font-size:0.8rem">' + t.id + '</td>' +
        '<td>' + dateStr + '</td>' +
        '<td><span style="display:flex;align-items:center;gap:0.35rem"><span style="color:' + pColor + '">' + (t.providerIcon || '') + '</span>' + (t.providerName || t.provider) + '</span></td>' +
        '<td style="font-weight:700;color:#C8102E">' + t.amount + ' ر.ع</td>' +
        '<td>' + (t.tenant || '—') + '</td>' +
        '<td>' + (t.description || '—') + '</td>' +
        '<td><span class="bhd-status bhd-status-active">✅ مسجل</span></td>' +
      '</tr>';
    }).join('');

    // pagination
    var totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    var pagHTML = '';
    for (var p = 1; p <= totalPages; p++) {
      pagHTML += '<button class="bhd-page-btn ' + (p === state.currentPage ? 'active' : '') + '" onclick="PG.goToPage(' + p + ')">' + p + '</button>';
    }
    document.getElementById('pg-transactions-pagination').innerHTML = pagHTML;
  }

  function filterTransactions() {
    state.currentPage = 1;
    renderTransactions();
  }

  function goToPage(p) {
    state.currentPage = p;
    renderTransactions();
  }

  // ============================================================
  // الإحصائيات
  // ============================================================

  async function loadStats() {
    try {
      var total = state.stats.totalCollected || state.transactions.reduce(function(s, t) { return s + (t.amount || 0); }, 0);
      var count = state.stats.count || state.transactions.length;
      var net = state.stats.netRevenue != null ? state.stats.netRevenue : total - (state.stats.totalRefunded || 0);

      document.getElementById('pg-stat-total').textContent = total.toLocaleString() + ' ر.ع';
      document.getElementById('pg-stat-count').textContent = count;
      document.getElementById('pg-stat-net').textContent = net.toLocaleString() + ' ر.ع';
    } catch (e) {
      console.error('Stats error:', e);
    }
  }

  // ============================================================
  // الإعدادات
  // ============================================================

  function renderSettings() {
    var container = document.getElementById('pg-settings-list');
    if (!container) return;

    container.innerHTML = state.gateways.map(function(g) {
      var color = COLORS[g.key] || '#6b7280';
      return '<div class="bhd-setting-item">' +
        '<div class="bhd-setting-header">' +
          '<div class="bhd-setting-name">' +
            '<span class="bhd-provider-icon" style="background:' + color + '15;color:' + color + '">' + g.icon + '</span>' +
            g.nameAr + ' <span style="color:#6b7280;font-weight:400">(' + g.nameEn + ')</span>' +
          '</div>' +
          '<span class="bhd-status ' + (g.enabled ? 'bhd-status-active' : 'bhd-status-inactive') + '">' +
            (g.enabled ? '✅ مفعلة' : '⏸️ غير مفعلة') +
          '</span>' +
        '</div>' +
        '<div class="bhd-setting-fields">' +
          (g.envVars || []).map(function(v) {
            return '<div>' +
              '<label>' + v + '</label>' +
              '<input type="password" value="' + (window.__ENV?.[v] || '') + '" placeholder="****" disabled />' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ============================================================
  // إجراءات
  // ============================================================

  function refreshGateways() {
    loadGateways();
  }

  async function testGateway(key) {
    try {
      var btn = event.target;
      btn.textContent = '⏳';
      btn.disabled = true;

      var res = await fetch('/api/payment/providers');
      var data = await res.json();
      var provider = (data.providers || []).find(function(p) { return p.key === key; });

      btn.textContent = '🧪';
      btn.disabled = false;

      if (provider && provider.enabled) {
        alert('✅ بوابة ' + provider.nameAr + ' مفعلة وجاهزة');
      } else {
        alert('⏸️ بوابة ' + key + ' غير مفعلة — أضف مفاتيح API في .env.local');
      }
    } catch (e) {
      btn.textContent = '🧪';
      btn.disabled = false;
      alert('❌ فشل الاتصال: ' + e.message);
    }
  }

  function viewGatewayDetails(key) {
    var g = state.gateways.find(function(x) { return x.key === key; });
    if (!g) return;

    var details =
      '🏦 ' + g.nameAr + ' (' + g.nameEn + ')\n\n' +
      '🌍 الدول: ' + (g.countries || []).join(', ') + '\n' +
      '💱 العملات: ' + (g.currencies || []).join(', ') + '\n' +
      '📊 الحالة: ' + (g.enabled ? '✅ مفعلة' : '⏸️ غير مفعلة') + '\n' +
      '🔗 متغيرات البيئة:\n' + (g.envVars || []).map(function(v) { return '   • ' + v; }).join('\n') + '\n\n' +
      '📡 Webhook: /api/webhooks/payment?provider=' + g.key;

    alert(details);
  }

  // ============================================================
  // التصدير
  // ============================================================

  window.PG = {
    init: init,
    refreshGateways: refreshGateways,
    testGateway: testGateway,
    viewGatewayDetails: viewGatewayDetails,
    filterTransactions: filterTransactions,
    goToPage: goToPage,
  };

  // التهيئة عند تحميل الصفحة
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
