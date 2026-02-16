/**
 * بيانات المستخدمين المشتركة - تتضمن الرقم المتسلسل
 */

export const users = [
  { id: 1, serialNumber: 'USR-A-2025-0001', name: 'مدير النظام', email: 'admin@bhd-om.com', role: 'ADMIN' as const, status: 'active' },
  { id: 2, serialNumber: 'USR-C-2025-0001', name: 'أحمد العميل', email: 'client1@example.com', role: 'CLIENT' as const, status: 'active' },
  { id: 3, serialNumber: 'USR-C-2025-0002', name: 'سارة علي', email: 'client2@example.com', role: 'CLIENT' as const, status: 'active' },
];
