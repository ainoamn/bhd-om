'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Icon from '@/components/icons/Icon';
import ClientDashboard from '@/components/admin/ClientDashboard';
import OwnerDashboard from '@/components/admin/OwnerDashboard';
import { properties } from '@/lib/data/properties';
import { projects } from '@/lib/data/projects';
import { users } from '@/lib/data/users';

// Mock data for admin dashboard
const mockNotifications = [
  { id: 1, textAr: 'طلب عرض عقار جديد', textEn: 'New property viewing request', time: 'منذ 5 دقائق', timeEn: '5 min ago', type: 'request' },
  { id: 2, textAr: 'رسالة تواصل جديدة', textEn: 'New contact message', time: 'منذ 15 دقيقة', timeEn: '15 min ago', type: 'message' },
];
const mockTasks = [
  { id: 1, textAr: 'مراجعة عقار PRP-R-2025-0001', textEn: 'Review property PRP-R-2025-0001', done: false },
  { id: 2, textAr: 'استكمال بيانات مشروع جديد', textEn: 'Complete new project data', done: false },
];
const mockRequests = [
  { id: 1, textAr: 'طلب حجز معاينة - فيلا الخوض', textEn: 'Viewing request - Al Khoudh Villa', status: 'pending' },
  { id: 2, textAr: 'استفسار عن مشروع النهضة', textEn: 'Inquiry about Al Nahda project', status: 'pending' },
];

export default function AdminDashboardPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const locale = (params?.locale as string) || 'ar';
  const t = useTranslations('dashboard');
  const userRole = (session?.user as { role?: string })?.role;

  if (status === 'loading') {
    return (
      <div className="admin-page-header">
        <div className="animate-pulse text-gray-500 py-12">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    );
  }
  if (userRole === 'CLIENT') return <ClientDashboard />;
  if (userRole === 'OWNER') return <OwnerDashboard />;

  const stats = [
    { label: t('stats.properties'), value: properties.length, href: '/admin/properties', icon: 'building' as const, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50' },
    { label: t('stats.projects'), value: projects.length, href: '/admin/projects', icon: 'projects' as const, color: 'from-emerald-500 to-emerald-600', bgColor: 'bg-emerald-50' },
    { label: t('stats.submissions'), value: '--', href: '/admin/submissions', icon: 'inbox' as const, color: 'from-violet-500 to-violet-600', bgColor: 'bg-violet-50' },
    { label: t('stats.users'), value: users.length, href: '/admin/users', icon: 'users' as const, color: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-50' },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t('title')}</h1>
        <p className="admin-page-subtitle">{t('subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.href}
            href={`/${locale}${stat.href}`}
            className="admin-card group hover:shadow-lg hover:border-gray-200/100 transition-all duration-300"
          >
            <div className="admin-card-body flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform`}>
                <Icon name={stat.icon} className="w-7 h-7" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-0.5">{stat.value}</div>
                <div className="text-sm font-medium text-gray-500">{stat.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Analytics & Technical Tools Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="admin-card lg:col-span-2">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="admin-card-title">{t('analytics')}</h2>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{t('techTools')}</span>
          </div>
          <div className="admin-card-body">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100">
                <div className="text-2xl font-bold text-blue-600">245</div>
                <div className="text-sm text-gray-600">{locale === 'ar' ? 'عقار مُدار' : 'Managed Properties'}</div>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100">
                <div className="text-2xl font-bold text-emerald-600">128</div>
                <div className="text-sm text-gray-600">{locale === 'ar' ? 'عقار مبيع' : 'Sold Properties'}</div>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/50 border border-violet-100">
                <div className="text-2xl font-bold text-violet-600">15,420</div>
                <div className="text-sm text-gray-600">{locale === 'ar' ? 'زائر للموقع' : 'Website Visitors'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="admin-card-title">{t('notifications')}</h2>
            <Link href={`/${locale}/admin/submissions`} className="text-sm font-medium text-primary hover:underline">{t('viewAll')}</Link>
          </div>
          <div className="admin-card-body">
            {mockNotifications.length > 0 ? (
              <ul className="space-y-3">
                {mockNotifications.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{locale === 'ar' ? n.textAr : n.textEn}</p>
                      <p className="text-xs text-gray-500">{locale === 'ar' ? n.time : n.timeEn}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 py-4">{t('noNotifications')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tasks & Requests Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="admin-card">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="admin-card-title">{t('tasks')}</h2>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">{mockTasks.filter(x => !x.done).length} {locale === 'ar' ? 'معلقة' : 'pending'}</span>
          </div>
          <div className="admin-card-body">
            {mockTasks.length > 0 ? (
              <ul className="space-y-3">
                {mockTasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <input type="checkbox" className="rounded border-gray-300" defaultChecked={task.done} />
                    <span className={`text-sm font-medium ${task.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {locale === 'ar' ? task.textAr : task.textEn}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 py-4">{t('noTasks')}</p>
            )}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="admin-card-title">{t('requests')}</h2>
            <Link href={`/${locale}/admin/submissions`} className="text-sm font-medium text-primary hover:underline">{t('viewAll')}</Link>
          </div>
          <div className="admin-card-body">
            {mockRequests.length > 0 ? (
              <ul className="space-y-3">
                {mockRequests.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{locale === 'ar' ? r.textAr : r.textEn}</p>
                      <span className="inline-block mt-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        {r.status === 'pending' ? (locale === 'ar' ? 'قيد المراجعة' : 'Pending') : r.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 py-4">{t('noRequests')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="admin-card mb-8">
        <div className="admin-card-header">
          <h2 className="admin-card-title">{t('quickActions')}</h2>
        </div>
        <div className="admin-card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href={`/${locale}/admin/properties/new`}
              className="flex items-center gap-4 p-5 rounded-xl border border-gray-200/80 hover:border-[#8B6F47]/20 hover:bg-[#8B6F47]/5 transition-all duration-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#8B6F47]/10 flex items-center justify-center group-hover:bg-[#8B6F47]/20 transition-colors">
                <Icon name="plus" className="w-6 h-6 text-[#8B6F47]" />
              </div>
              <div>
                <span className="font-semibold text-gray-900 block">{t('addProperty')}</span>
                <span className="text-sm text-gray-500">{t('addPropertyDesc')}</span>
              </div>
            </Link>
            <Link
              href={`/${locale}/admin/projects/new`}
              className="flex items-center gap-4 p-5 rounded-xl border border-gray-200/80 hover:border-[#8B6F47]/20 hover:bg-[#8B6F47]/5 transition-all duration-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#8B6F47]/10 flex items-center justify-center group-hover:bg-[#8B6F47]/20 transition-colors">
                <Icon name="projects" className="w-6 h-6 text-[#8B6F47]" />
              </div>
              <div>
                <span className="font-semibold text-gray-900 block">{t('addProject')}</span>
                <span className="text-sm text-gray-500">{t('addProjectDesc')}</span>
              </div>
            </Link>
            <Link
              href={`/${locale}/admin/site`}
              className="flex items-center gap-4 p-5 rounded-xl border border-gray-200/80 hover:border-[#8B6F47]/20 hover:bg-[#8B6F47]/5 transition-all duration-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#8B6F47]/10 flex items-center justify-center group-hover:bg-[#8B6F47]/20 transition-colors">
                <Icon name="pencil" className="w-6 h-6 text-[#8B6F47]" />
              </div>
              <div>
                <span className="font-semibold text-gray-900 block">{t('editSite')}</span>
                <span className="text-sm text-gray-500">{t('editSiteDesc')}</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Site Sections + System Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">{t('siteSections')}</h2>
          </div>
          <div className="admin-card-body">
            <ul className="space-y-2">
              {[
                { nameKey: 'homePage', href: '/admin/site?page=home' },
                { nameKey: 'propertiesPage', href: '/admin/site?page=properties' },
                { nameKey: 'projectsPage', href: '/admin/site?page=projects' },
                { nameKey: 'servicesPage', href: '/admin/services' },
                { nameKey: 'contactPage', href: '/admin/contact' },
                { nameKey: 'aboutPage', href: '/admin/site?page=about' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={`/${locale}${item.href}`}
                    className="flex items-center justify-between py-3 px-4 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-[#8B6F47] transition-colors font-medium"
                  >
                    {t(item.nameKey)}
                    <Icon name="chevronLeft" className="w-5 h-5 text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">{t('systemInfo')}</h2>
          </div>
          <div className="admin-card-body">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50/80">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Icon name="check" className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-sm text-gray-600 font-medium">{t('statsNote')}</p>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50/80">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Icon name="information" className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600 font-medium">{t('dashboardNote')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
