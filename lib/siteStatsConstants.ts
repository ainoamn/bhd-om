/** أرقام تسويقية للإحصائيات عند غياب بيانات DB — مشتركة بين العميل والخادم */
export const MARKETING_STATS = {
  properties: 500,
  users: 1200,
  bookings: 15,
  contracts: 50,
} as const;

export type MarketingStats = typeof MARKETING_STATS;
