/**
 * Accounting Welcome Component
 * مكون الترحيب للمحاسبة - واجهة بسيطة وواضحة
 */

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/icons/Icon';

export default function AccountingWelcome() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  const quickActions = [
    {
      href: 'journal',
      icon: 'plus',
      title: ar ? 'إضافة قيد محاسبي' : 'Add Journal Entry',
      description: ar ? 'إنشاء قيود يومية جديدة' : 'Create new journal entries',
      color: 'from-blue-500 to-blue-600'
    },
    {
      href: 'accounts',
      icon: 'folder',
      title: ar ? 'إدارة الحسابات' : 'Manage Accounts',
      description: ar ? 'إنشاء وتعديل الحسابات' : 'Create and edit accounts',
      color: 'from-green-500 to-green-600'
    },
    {
      href: 'reports',
      icon: 'chartBar',
      title: ar ? 'عرض التقارير' : 'View Reports',
      description: ar ? 'الميزانية وقائمة الدخل' : 'Balance sheet & P&L',
      color: 'from-purple-500 to-purple-600'
    },
    {
      href: 'trial-balance',
      icon: 'check',
      title: ar ? 'ميزان المراجعة' : 'Trial Balance',
      description: ar ? 'التحقق من التوازن' : 'Verify balances',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  const features = [
    {
      icon: 'check',
      title: ar ? 'قيد مزدوج' : 'Double Entry',
      description: ar ? 'ضمان توازن جميع القيود' : 'Ensures all entries are balanced'
    },
    {
      icon: 'shield',
      title: ar ? 'متوافق مع IFRS' : 'IFRS Compliant',
      description: ar ? 'معايير محاسبية عالمية' : 'International accounting standards'
    },
    {
      icon: 'lock',
      title: ar ? 'قفل الفترات' : 'Period Locking',
      description: ar ? 'حماية البيانات من التعديل' : 'Protects data from modification'
    },
    {
      icon: 'documentText',
      title: ar ? 'سجل تدقيق' : 'Audit Trail',
      description: ar ? 'تتبع جميع التغييرات' : 'Tracks all changes'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gradient-to-br from-[#8B6F47] to-[#A68B5B] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Icon name="chartBar" className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {ar ? 'مرحباً بك في نظام المحاسبة' : 'Welcome to Accounting System'}
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {ar 
            ? 'نظام محاسبي احترافي متوافق مع المعايير العالمية. ابدأ بإضافة القيود المحاسبية أو استكشف التقارير المالية.'
            : 'Professional accounting system compliant with international standards. Start by adding journal entries or explore financial reports.'
          }
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xl p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
          {ar ? 'إجراءات سريعة' : 'Quick Actions'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className={`group relative overflow-hidden rounded-xl border border-gray-200/60 hover:shadow-lg transition-all duration-300`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
              <div className="relative p-6">
                <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon name={action.icon as any} className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-[#8B6F47] transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200/60 shadow-xl p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
          {ar ? 'مميزات النظام' : 'System Features'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md border border-gray-200/60">
                <Icon name={feature.icon as any} className="h-8 w-8 text-[#8B6F47]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-gradient-to-r from-[#8B6F47]/5 to-[#A68B5B]/5 rounded-2xl border border-[#8B6F47]/20 p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {ar ? 'كيفية البدء؟' : 'How to Get Started?'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold text-lg">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {ar ? 'إنشاء الحسابات' : 'Create Accounts'}
              </h3>
              <p className="text-sm text-gray-600">
                {ar ? 'قم بإعداد دليل الحسابات الأساسي' : 'Set up your chart of accounts'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold text-lg">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {ar ? 'إضافة القيود' : 'Add Entries'}
              </h3>
              <p className="text-sm text-gray-600">
                {ar ? 'سجل المعاملات المالية اليومية' : 'Record daily financial transactions'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold text-lg">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {ar ? 'عرض التقارير' : 'View Reports'}
              </h3>
              <p className="text-sm text-gray-600">
                {ar ? 'احصل على رؤى مالية فورية' : 'Get instant financial insights'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
