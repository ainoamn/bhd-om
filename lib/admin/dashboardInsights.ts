export type InsightPriority = 'critical' | 'high' | 'medium' | 'low' | 'positive';

export type DashboardInsight = {
  id: string;
  priority: InsightPriority;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  actionHref?: string;
  actionLabelAr?: string;
  actionLabelEn?: string;
  metric?: string;
};

export type PriorityItem = {
  id: string;
  kind: 'booking' | 'documents' | 'contact' | 'maintenance' | 'subscription';
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  href: string;
  createdAt: string;
  badgeAr: string;
  badgeEn: string;
};

export type ActivityItem = {
  id: string;
  titleAr: string;
  titleEn: string;
  time: string;
  href: string;
  tone: 'neutral' | 'warning' | 'success';
};

export type AdminDashboardSnapshot = {
  counts: {
    properties: number;
    projects: number;
    users: number;
    bookingsTotal: number;
    bookingsPending: number;
    bookingsConfirmed: number;
    subscriptionsTotal: number;
    subscriptionsActive: number;
    subscriptionsExpiringSoon: number;
    contactUnread: number;
    maintenanceOpen: number;
  };
  healthScore: number;
  recentBookings: Array<{
    id: string;
    type: string;
    status: string;
    guestName: string;
    propertyTitleAr: string;
    propertyTitleEn: string;
    createdAt: string;
  }>;
  priorityItems: PriorityItem[];
};

export type PortalDashboardSnapshot = {
  role: 'CLIENT' | 'OWNER';
  pendingTasks: number;
  unreadNotifications: number;
  openMaintenance: number;
  activeBookings: number;
  subscriptionExpiringDays: number | null;
};

function priorityRank(p: InsightPriority): number {
  return { critical: 0, high: 1, medium: 2, low: 3, positive: 4 }[p];
}

export function buildAiBrief(insights: DashboardInsight[], locale: 'ar' | 'en'): string {
  const sorted = [...insights].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  const top = sorted.slice(0, 2);
  if (top.length === 0) {
    return locale === 'ar'
      ? 'العمليات مستقرة اليوم. راجع المؤشرات أدناه للاطلاع على آخر النشاط.'
      : 'Operations look stable today. Review the metrics below for the latest activity.';
  }
  return top.map((i) => (locale === 'ar' ? i.bodyAr : i.bodyEn)).join(locale === 'ar' ? ' ' : ' ');
}

export function generateAdminInsights(snapshot: AdminDashboardSnapshot): {
  insights: DashboardInsight[];
  briefAr: string;
  briefEn: string;
  activity: ActivityItem[];
} {
  const { counts, recentBookings, priorityItems, healthScore } = snapshot;
  const insights: DashboardInsight[] = [];

  if (counts.bookingsPending > 0) {
    insights.push({
      id: 'pending-bookings',
      priority: counts.bookingsPending >= 5 ? 'critical' : 'high',
      titleAr: 'حجوزات بانتظار المراجعة',
      titleEn: 'Bookings awaiting review',
      bodyAr: `لديك ${counts.bookingsPending} حجز/معاينة تحتاج قراراً سريعاً لتجنب فقدان الفرص.`,
      bodyEn: `You have ${counts.bookingsPending} booking(s)/viewing(s) that need a quick decision to avoid losing leads.`,
      actionHref: '/admin/bookings',
      actionLabelAr: 'مراجعة الحجوزات',
      actionLabelEn: 'Review bookings',
      metric: String(counts.bookingsPending),
    });
  }

  if (counts.contactUnread > 0) {
    insights.push({
      id: 'contact-unread',
      priority: 'high',
      titleAr: 'رسائل زوار غير مقروءة',
      titleEn: 'Unread visitor messages',
      bodyAr: `${counts.contactUnread} رسالة جديدة من صفحة التواصل — الرد السريع يحسّن معدل التحويل.`,
      bodyEn: `${counts.contactUnread} new message(s) from the contact page — fast replies improve conversion.`,
      actionHref: '/admin/submissions',
      actionLabelAr: 'فتح الرسائل',
      actionLabelEn: 'Open messages',
      metric: String(counts.contactUnread),
    });
  }

  if (counts.subscriptionsExpiringSoon > 0) {
    insights.push({
      id: 'subs-expiring',
      priority: 'medium',
      titleAr: 'اشتراكات تنتهي قريباً',
      titleEn: 'Subscriptions expiring soon',
      bodyAr: `${counts.subscriptionsExpiringSoon} اشتراك ينتهي خلال 7 أيام — تواصل مع العملاء للتجديد.`,
      bodyEn: `${counts.subscriptionsExpiringSoon} subscription(s) expire within 7 days — reach out for renewal.`,
      actionHref: '/admin/subscriptions',
      actionLabelAr: 'إدارة الاشتراكات',
      actionLabelEn: 'Manage subscriptions',
      metric: String(counts.subscriptionsExpiringSoon),
    });
  }

  if (counts.maintenanceOpen > 0) {
    insights.push({
      id: 'maintenance-open',
      priority: 'medium',
      titleAr: 'طلبات صيانة مفتوحة',
      titleEn: 'Open maintenance requests',
      bodyAr: `${counts.maintenanceOpen} طلب صيانة نشط — رتّب الأولويات حسب العقار والعميل.`,
      bodyEn: `${counts.maintenanceOpen} active maintenance request(s) — prioritize by property and client.`,
      actionHref: '/admin/maintenance',
      actionLabelAr: 'متابعة الصيانة',
      actionLabelEn: 'Track maintenance',
      metric: String(counts.maintenanceOpen),
    });
  }

  if (healthScore < 80) {
    insights.push({
      id: 'health-warning',
      priority: healthScore < 50 ? 'critical' : 'high',
      titleAr: 'جاهزية النظام تحتاج انتباه',
      titleEn: 'System readiness needs attention',
      bodyAr: `مؤشر الصحة ${healthScore}% — راجع إعدادات الدفع وقاعدة البيانات.`,
      bodyEn: `Health score is ${healthScore}% — review payment setup and database connectivity.`,
      actionHref: '/admin/data',
      actionLabelAr: 'فحص الجاهزية',
      actionLabelEn: 'Check readiness',
      metric: `${healthScore}%`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'all-clear',
      priority: 'positive',
      titleAr: 'كل شيء يسير بسلاسة',
      titleEn: 'Everything running smoothly',
      bodyAr: 'لا مهام حرجة الآن. استغل الوقت لتحسين المحتوى أو إضافة عقارات جديدة.',
      bodyEn: 'No critical tasks right now. Use the time to improve content or add new properties.',
      actionHref: '/admin/properties/new',
      actionLabelAr: 'إضافة عقار',
      actionLabelEn: 'Add property',
    });
  }

  insights.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  const activity: ActivityItem[] = recentBookings.slice(0, 8).map((b) => {
    const isPending = b.status === 'PENDING';
    return {
      id: b.id,
      titleAr: `${b.type === 'BOOKING' ? 'حجز' : 'معاينة'} — ${b.guestName} · ${b.propertyTitleAr || b.propertyTitleEn}`,
      titleEn: `${b.type === 'BOOKING' ? 'Booking' : 'Viewing'} — ${b.guestName} · ${b.propertyTitleEn || b.propertyTitleAr}`,
      time: b.createdAt,
      href: `/admin/bookings?highlight=${encodeURIComponent(b.id)}`,
      tone: isPending ? 'warning' : 'neutral',
    };
  });

  if (priorityItems.length === 0 && activity.length === 0) {
    /* keep activity from insights context */
  }

  return {
    insights,
    briefAr: buildAiBrief(insights, 'ar'),
    briefEn: buildAiBrief(insights, 'en'),
    activity,
  };
}

export function generatePortalInsights(snapshot: PortalDashboardSnapshot): {
  insights: DashboardInsight[];
  briefAr: string;
  briefEn: string;
} {
  const insights: DashboardInsight[] = [];
  const { pendingTasks, unreadNotifications, openMaintenance, subscriptionExpiringDays, role } = snapshot;

  if (pendingTasks > 0) {
    insights.push({
      id: 'portal-tasks',
      priority: 'high',
      titleAr: 'مهام تحتاج إجراءك',
      titleEn: 'Tasks need your action',
      bodyAr: `لديك ${pendingTasks} مهمة مفتوحة — أكملها للانتقال للمرحلة التالية.`,
      bodyEn: `You have ${pendingTasks} open task(s) — complete them to move forward.`,
      actionHref: role === 'OWNER' ? '/admin/my-properties' : '/admin/my-bookings',
      actionLabelAr: 'عرض المهام',
      actionLabelEn: 'View tasks',
      metric: String(pendingTasks),
    });
  }

  if (unreadNotifications > 0) {
    insights.push({
      id: 'portal-notifications',
      priority: 'medium',
      titleAr: 'إشعارات جديدة',
      titleEn: 'New notifications',
      bodyAr: `${unreadNotifications} إشعار غير مقروء.`,
      bodyEn: `${unreadNotifications} unread notification(s).`,
      actionHref: '/admin/notifications',
      actionLabelAr: 'قراءة الإشعارات',
      actionLabelEn: 'Read notifications',
      metric: String(unreadNotifications),
    });
  }

  if (openMaintenance > 0) {
    insights.push({
      id: 'portal-maintenance',
      priority: 'medium',
      titleAr: 'طلبات صيانة',
      titleEn: 'Maintenance requests',
      bodyAr: `${openMaintenance} طلب صيانة قيد المتابعة.`,
      bodyEn: `${openMaintenance} maintenance request(s) in progress.`,
      actionHref: '/admin/my-maintenance',
      actionLabelAr: 'متابعة الصيانة',
      actionLabelEn: 'Track maintenance',
      metric: String(openMaintenance),
    });
  }

  if (subscriptionExpiringDays != null && subscriptionExpiringDays <= 7) {
    insights.push({
      id: 'portal-subscription',
      priority: subscriptionExpiringDays <= 3 ? 'high' : 'medium',
      titleAr: 'اشتراكك ينتهي قريباً',
      titleEn: 'Your plan expires soon',
      bodyAr: `يتبقى ${subscriptionExpiringDays} يوم على انتهاء باقتك.`,
      bodyEn: `${subscriptionExpiringDays} day(s) left on your plan.`,
      actionHref: '/admin/my-account',
      actionLabelAr: 'إدارة الباقة',
      actionLabelEn: 'Manage plan',
      metric: String(subscriptionExpiringDays),
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'portal-clear',
      priority: 'positive',
      titleAr: 'لوحتك هادئة اليوم',
      titleEn: 'Your dashboard is calm today',
      bodyAr: 'لا مهام عاجلة — يمكنك استكشاف العقارات أو تحديث بياناتك.',
      bodyEn: 'No urgent tasks — explore properties or update your profile.',
      actionHref: role === 'OWNER' ? '/admin/my-properties' : '/admin/my-bookings',
      actionLabelAr: 'استكشاف',
      actionLabelEn: 'Explore',
    });
  }

  insights.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  return {
    insights,
    briefAr: buildAiBrief(insights, 'ar'),
    briefEn: buildAiBrief(insights, 'en'),
  };
}

export function computeHealthScore(input: {
  dbOk: boolean;
  paymentReady: boolean;
  legacyMigrated: boolean;
  envConfigured: boolean;
}): number {
  let score = 0;
  if (input.dbOk) score += 35;
  if (input.paymentReady) score += 25;
  if (input.legacyMigrated) score += 20;
  if (input.envConfigured) score += 20;
  return score;
}
