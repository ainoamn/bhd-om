/**
 * قوالب الرسائل والتنبيهات والإشعارات — تُخزّن على الخادم
 */

export type CommunicationTemplateCategory = 'messages' | 'alerts' | 'notifications';

export interface CommunicationTemplate {
  id: string;
  nameAr: string;
  nameEn: string;
  subjectAr: string;
  subjectEn: string;
  bodyAr: string;
  bodyEn: string;
  isDefault: boolean;
  updatedAt: string;
}

export type CommunicationTemplatesStore = Record<CommunicationTemplateCategory, CommunicationTemplate[]>;

const STORAGE_KEY = 'bhd_communication_templates';
const API_URL = '/api/settings/communication-templates';
const EVENT = 'bhd_communication_templates_updated';

let didHydrateFromServer = false;
let hydratingFromServer = false;

function baseTemplate(
  id: string,
  nameAr: string,
  nameEn: string,
  subjectAr: string,
  subjectEn: string,
  bodyAr: string,
  bodyEn: string,
  isDefault = false
): CommunicationTemplate {
  return {
    id,
    nameAr,
    nameEn,
    subjectAr,
    subjectEn,
    bodyAr,
    bodyEn,
    isDefault,
    updatedAt: new Date().toISOString(),
  };
}

export const DEFAULT_COMMUNICATION_TEMPLATES: CommunicationTemplatesStore = {
  messages: [
    baseTemplate(
      'msg-welcome',
      'ترحيب بالعميل',
      'Client welcome',
      'مرحباً بكم في بن حمود للتطوير',
      'Welcome to Bin Hamood Development',
      'نشكركم على تواصلكم معنا. سنتابع طلبكم في أقرب وقت.',
      'Thank you for contacting us. We will follow up on your request shortly.',
      true
    ),
    baseTemplate(
      'msg-booking-received',
      'تأكيد استلام الحجز',
      'Booking received',
      'تم استلام طلب الحجز',
      'Booking request received',
      'تم استلام طلب الحجز الخاص بكم وهو قيد المراجعة.',
      'Your booking request has been received and is under review.'
    ),
  ],
  alerts: [
    baseTemplate(
      'alert-payment-due',
      'تذكير بالدفع',
      'Payment reminder',
      'تذكير: إتمام الدفع',
      'Reminder: complete payment',
      'حجزكم بانتظار إتمام الدفع. يرجى المتابعة من لوحة التحكم.',
      'Your booking awaits payment. Please continue from your dashboard.',
      true
    ),
    baseTemplate(
      'alert-contract-ready',
      'العقد جاهز',
      'Contract ready',
      'العقد جاهز للمراجعة',
      'Contract ready for review',
      'العقد جاهز للمراجعة والتوقيع من لوحة التحكم.',
      'Your contract is ready for review and signing in your dashboard.'
    ),
  ],
  notifications: [
    baseTemplate(
      'notif-maintenance-update',
      'تحديث صيانة',
      'Maintenance update',
      'تحديث طلب الصيانة',
      'Maintenance request update',
      'تم تحديث حالة طلب الصيانة. راجع التفاصيل من لوحة التحكم.',
      'Your maintenance request status has been updated. See details in your dashboard.',
      true
    ),
    baseTemplate(
      'notif-system',
      'إشعار نظام',
      'System notice',
      'إشعار من النظام',
      'System notification',
      'لديك إشعار جديد في لوحة التحكم.',
      'You have a new notification in your dashboard.'
    ),
  ],
};

function readLocal(): CommunicationTemplatesStore {
  if (typeof window === 'undefined') return DEFAULT_COMMUNICATION_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COMMUNICATION_TEMPLATES;
    const parsed = JSON.parse(raw) as Partial<CommunicationTemplatesStore>;
    return {
      messages: parsed.messages?.length ? parsed.messages : DEFAULT_COMMUNICATION_TEMPLATES.messages,
      alerts: parsed.alerts?.length ? parsed.alerts : DEFAULT_COMMUNICATION_TEMPLATES.alerts,
      notifications: parsed.notifications?.length ? parsed.notifications : DEFAULT_COMMUNICATION_TEMPLATES.notifications,
    };
  } catch {
    return DEFAULT_COMMUNICATION_TEMPLATES;
  }
}

function saveLocal(data: CommunicationTemplatesStore, emit = true): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if (emit) window.dispatchEvent(new Event(EVENT));
}

function syncToServer(data: CommunicationTemplatesStore): void {
  if (typeof window === 'undefined') return;
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  }).catch(() => {});
}

export async function hydrateCommunicationTemplatesFromServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (didHydrateFromServer || hydratingFromServer) return;
  hydratingFromServer = true;
  try {
    const res = await fetch(API_URL, { cache: 'no-store', credentials: 'include' });
    if (!res.ok) return;
    const payload = (await res.json()) as Partial<CommunicationTemplatesStore> | null;
    if (!payload || typeof payload !== 'object') return;
    saveLocal(
      {
        messages: payload.messages?.length ? payload.messages : DEFAULT_COMMUNICATION_TEMPLATES.messages,
        alerts: payload.alerts?.length ? payload.alerts : DEFAULT_COMMUNICATION_TEMPLATES.alerts,
        notifications: payload.notifications?.length ? payload.notifications : DEFAULT_COMMUNICATION_TEMPLATES.notifications,
      },
      false
    );
    didHydrateFromServer = true;
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* keep local */
  } finally {
    hydratingFromServer = false;
  }
}

export function getCommunicationTemplates(category: CommunicationTemplateCategory): CommunicationTemplate[] {
  void hydrateCommunicationTemplatesFromServer();
  return readLocal()[category] ?? [];
}

export function getDefaultCommunicationTemplate(category: CommunicationTemplateCategory): CommunicationTemplate | undefined {
  const list = getCommunicationTemplates(category);
  return list.find((t) => t.isDefault) ?? list[0];
}

export function updateCommunicationTemplate(
  category: CommunicationTemplateCategory,
  template: CommunicationTemplate
): void {
  const store = readLocal();
  const list = store[category].map((t) => ({ ...t }));
  const idx = list.findIndex((t) => t.id === template.id);
  const next = { ...template, updatedAt: new Date().toISOString() };
  if (template.isDefault) {
    for (const t of list) t.isDefault = t.id === template.id;
  }
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  const merged = { ...store, [category]: list };
  saveLocal(merged);
  syncToServer(merged);
}

export { EVENT as COMMUNICATION_TEMPLATES_EVENT };
