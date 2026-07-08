'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Icon from '@/components/icons/Icon';

type SetupResponse = {
  secret: string;
  otpauthUrl: string;
  message?: string;
};

export default function AdminTotpSetup() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/security/totp', { cache: 'no-store' });
      if (!res.ok) throw new Error('status');
      const data = await res.json();
      setEnabled(Boolean(data.enabled));
    } catch {
      setError(ar ? 'تعذّر تحميل حالة 2FA' : 'Failed to load 2FA status');
    } finally {
      setLoading(false);
    }
  }, [ar]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const startSetup = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/security/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'setup failed');
      setSetup(data as SetupResponse);
    } catch {
      setError(ar ? 'فشل بدء الإعداد' : 'Setup failed');
    } finally {
      setBusy(false);
    }
  };

  const enableTotp = async () => {
    if (!setup?.secret || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/security/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enable', secret: setup.secret, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'invalid');
      setEnabled(true);
      setSetup(null);
      setCode('');
      setSuccess(ar ? 'تم تفعيل المصادقة الثنائية بنجاح' : '2FA enabled successfully');
    } catch {
      setError(ar ? 'رمز غير صحيح — حاول مرة أخرى' : 'Invalid code — try again');
    } finally {
      setBusy(false);
    }
  };

  const disableTotp = async () => {
    if (disableCode.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/security/totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable', code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'invalid');
      setEnabled(false);
      setDisableCode('');
      setSuccess(ar ? 'تم إيقاف المصادقة الثنائية' : '2FA disabled');
    } catch {
      setError(ar ? 'رمز غير صحيح' : 'Invalid code');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-card p-6 text-gray-500 text-sm">
        {ar ? 'جاري التحميل...' : 'Loading...'}
      </div>
    );
  }

  return (
    <div className="admin-card p-6 space-y-4">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <span className="w-10 h-10 rounded-xl admin-accent-bg-soft flex items-center justify-center">
          <Icon name="shieldCheck" className="w-5 h-5 admin-accent-text" />
        </span>
        {ar ? 'المصادقة الثنائية (2FA)' : 'Two-factor authentication (2FA)'}
      </h3>

      <p className="text-sm text-gray-600">
        {ar
          ? 'استخدم Google Authenticator أو Microsoft Authenticator. مطلوب عند تسجيل دخول المدير.'
          : 'Use Google Authenticator or Microsoft Authenticator. Required for admin login when enabled.'}
      </p>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">{success}</div>
      )}

      <div className="flex items-center gap-3">
        <span
          className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
            enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {enabled ? (ar ? 'مفعّلة' : 'Enabled') : ar ? 'غير مفعّلة' : 'Disabled'}
        </span>
      </div>

      {!enabled && !setup && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void startSetup()}
          className="px-5 py-3 rounded-xl font-semibold text-white admin-accent-bg hover:opacity-90 disabled:opacity-50"
        >
          {ar ? 'بدء الإعداد' : 'Start setup'}
        </button>
      )}

      {setup && !enabled && (
        <div className="space-y-4 border border-gray-200 rounded-xl p-4 bg-gray-50/80">
          <p className="text-sm font-medium text-gray-800">
            {ar ? '1. امسح الرابط في تطبيق المصادقة:' : '1. Add this account in your authenticator app:'}
          </p>
          <a
            href={setup.otpauthUrl}
            className="block text-xs break-all text-primary underline"
            target="_blank"
            rel="noreferrer"
          >
            {setup.otpauthUrl}
          </a>
          <p className="text-xs text-gray-500 font-mono break-all">{setup.secret}</p>
          <p className="text-sm font-medium text-gray-800">
            {ar ? '2. أدخل الرمز المكوّن من 6 أرقام:' : '2. Enter the 6-digit code:'}
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full max-w-xs px-4 py-3 rounded-xl border border-gray-300 text-center tracking-widest text-lg font-mono"
            placeholder="000000"
          />
          <button
            type="button"
            disabled={busy || code.length !== 6}
            onClick={() => void enableTotp()}
            className="px-5 py-3 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            {ar ? 'تفعيل 2FA' : 'Enable 2FA'}
          </button>
        </div>
      )}

      {enabled && (
        <div className="space-y-3 border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-700">{ar ? 'لإيقاف 2FA أدخل الرمز الحالي:' : 'To disable 2FA, enter current code:'}</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full max-w-xs px-4 py-3 rounded-xl border border-gray-300 text-center tracking-widest font-mono"
            placeholder="000000"
          />
          <button
            type="button"
            disabled={busy || disableCode.length !== 6}
            onClick={() => void disableTotp()}
            className="px-5 py-3 rounded-xl font-semibold border-2 border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {ar ? 'إيقاف 2FA' : 'Disable 2FA'}
          </button>
        </div>
      )}
    </div>
  );
}
