'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type PostureCheck = { ok: boolean; label: string; hint?: string };

type PostureResponse = {
  environment: string;
  score: number;
  total: number;
  ready: boolean;
  checks: PostureCheck[];
  encryptionBackfill: string;
  npmAudit: string;
  paymentProductionReady: boolean;
};

export default function SecurityPosturePanel() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const [data, setData] = useState<PostureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/security/posture', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        setData(await res.json());
      } catch {
        setError(ar ? 'تعذّر تحميل وضع الأمان' : 'Failed to load security posture');
      } finally {
        setLoading(false);
      }
    })();
  }, [ar]);

  if (loading) {
    return (
      <div className="admin-card p-6">
        <p className="text-gray-500 text-sm">{ar ? 'جاري فحص وضع الأمان…' : 'Checking security posture…'}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-card p-6 border border-amber-200 bg-amber-50">
        <p className="text-amber-800 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="admin-card p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {ar ? 'وضع الأمان — الإنتاج' : 'Production security posture'}
          </h2>
          <p className="text-sm text-gray-500">
            {ar ? 'البيئة:' : 'Environment:'} {data.environment}
          </p>
        </div>
        <div
          className={`px-4 py-2 rounded-xl text-sm font-bold ${
            data.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {data.score}/{data.total} {ar ? 'جاهز' : 'ready'}
        </div>
      </div>

      <ul className="space-y-2">
        {data.checks.map((c) => (
          <li
            key={c.label}
            className={`flex flex-wrap items-start gap-2 text-sm rounded-lg px-3 py-2 ${
              c.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'
            }`}
          >
            <span>{c.ok ? '✓' : '✗'}</span>
            <span className="font-medium">{c.label}</span>
            {!c.ok && c.hint && <span className="text-xs opacity-80">— {c.hint}</span>}
          </li>
        ))}
      </ul>

      {!data.ready && (
        <p className="text-xs text-gray-600">
          {ar
            ? 'أضف المتغيرات الناقصة في Vercel → Settings → Environment Variables ثم أعد النشر.'
            : 'Add missing variables in Vercel → Settings → Environment Variables, then redeploy.'}
        </p>
      )}

      <div className="text-xs text-gray-500 border-t pt-3 space-y-1">
        <p>
          {ar ? 'بعد النشر:' : 'After deploy:'}{' '}
          <code className="bg-gray-100 px-1 rounded">{data.encryptionBackfill}</code>
        </p>
        <p>
          {ar ? 'فحص محلي:' : 'Local audit:'}{' '}
          <code className="bg-gray-100 px-1 rounded">{data.npmAudit}</code>
        </p>
      </div>
    </div>
  );
}
