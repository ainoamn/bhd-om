'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add NextAuth or API authentication
    // For now, redirect to admin (development mode)
    router.push(`/${locale}/admin`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
        </h1>
        <p className="text-gray-600 mb-6 text-center text-sm">
          {locale === 'ar' ? 'لوحة تحكم الموقع' : 'Website Admin Panel'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="admin@bhd-om.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {locale === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            {locale === 'ar' ? 'دخول' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          {locale === 'ar' ? 'سيتم ربط نظام المصادقة لاحقاً' : 'Authentication will be connected later'}
        </p>

        <Link
          href={`/${locale}`}
          className="block text-center mt-4 text-primary hover:underline text-sm"
        >
          {locale === 'ar' ? 'العودة للموقع' : 'Back to website'}
        </Link>
      </div>
    </div>
  );
}
